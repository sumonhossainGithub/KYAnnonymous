<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\Notice;
use App\Models\Organization;
use App\Models\Post;
use App\Models\Report;
use App\Models\User;
use App\Support\Anonymity;
use App\Support\SiteSettings;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CommunityController extends Controller
{
    public function search(Request $request)
    {
        $q = trim((string) $request->input('q', ''));
        $posts = [];
        $notices = [];

        if (strlen($q) >= 2) {
            $posts = Post::with('author')
                ->where('status', 'ACTIVE')
                ->where(function ($query) use ($q) {
                    $query->where('title', 'like', "%{$q}%")
                          ->orWhere('body', 'like', "%{$q}%");
                })
                ->take(20)
                ->get()
                ->map(fn($p) => [
                    'public_id' => $p->public_id,
                    'title' => $p->title,
                    'created_at' => $p->created_at->diffForHumans(),
                    'author' => $p->author->display_name,
                ]);

            $notices = Notice::where('status', 'PUBLISHED')
                ->where(function ($query) use ($q) {
                    $query->where('title', 'like', "%{$q}%")
                          ->orWhere('body', 'like', "%{$q}%");
                })
                ->take(10)
                ->get(['public_id', 'title', 'created_at']);
        }

        return Inertia::render('Community/Search', [
            'query' => $q,
            'posts' => $posts,
            'notices' => $notices,
        ]);
    }

    public function notices()
    {
        $notices = Notice::where('status', 'PUBLISHED')
            ->orderBy('pinned', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return Inertia::render('Community/Notices', [
            'notices' => $notices->through(fn($n) => [
                'public_id' => $n->public_id,
                'title' => $n->title,
                'body' => $n->body,
                'pinned' => $n->pinned,
                'created_at' => $n->created_at->diffForHumans(),
            ]),
        ]);
    }

    public function chatIndex()
    {
        $rooms = ChatRoom::where('is_active', true)->withCount('messages')->orderBy('created_at')->get(['id', 'public_id', 'name', 'slug', 'description']);

        return Inertia::render('Chat/Index', [
            'rooms' => $rooms,
        ]);
    }

    public function createChatRoom(Request $request)
    {
        abort_unless($request->user()->status === 'ACTIVE', 403);
        abort_unless($request->user()->isSuperAdmin() || SiteSettings::get('member_rooms_enabled'), 403, 'Room creation is currently limited to administrators.');
        $request->validate([
            'name' => ['required', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:240'],
        ]);
        $request->merge([
            'name' => trim(strip_tags((string) $request->input('name', ''))),
            'description' => trim(strip_tags((string) $request->input('description', ''))),
        ]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:60'],
            'description' => ['nullable', 'string', 'max:240'],
        ]);
        $key = 'create-room:'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($key, 3)) {
            return back()->withErrors(['name' => 'You have created 3 rooms this hour. Give them a little time to grow.']);
        }
        RateLimiter::hit($key, 3600);
        $room = ChatRoom::create([
            ...$data,
            'slug' => (Str::slug($data['name']) ?: 'room').'-'.strtolower((string) Str::ulid()),
            'created_by' => $request->user()->id,
            'is_active' => true,
        ]);

        return redirect()->route('chat.room', $room->slug)->with('success', 'Your room is open. Make someone feel welcome.');
    }

    public function homeChat(Request $request)
    {
        if (SiteSettings::get('homepage_layout') === 'feed') return app(PostController::class)->feed($request);
        $room = ChatRoom::where('slug', SiteSettings::get('default_room_slug'))->where('is_active', true)->first();
        if (!$room) {
            $room = ChatRoom::where('is_active', true)->first();
        }
        if (!$room) {
            $firstUser = User::first();
            $room = ChatRoom::create([
                'name' => 'The common orbit',
                'slug' => 'common-orbit',
                'description' => 'The main public anonymous chat room for everyone.',
                'created_by' => $firstUser ? $firstUser->id : 1,
                'is_active' => true,
            ]);
        }

        $adminStealth = \App\Models\AppSetting::isTrue('admin_stealth_mode');
        $messages = $this->loadMessagesForRoom($room->id, $adminStealth);

        return Inertia::render('Chat/HomeChat', [
            'room' => [
                'public_id' => $room->public_id,
                'name' => $room->name,
                'slug' => $room->slug,
                'description' => $room->description,
            ],
            'initialMessages' => $messages,
            'emergencyLockdown' => \App\Models\AppSetting::isTrue('emergency_lockdown'),
            'rooms' => fn () => ChatRoom::where('is_active', true)->withCount('messages')->orderBy('created_at')->get(['public_id', 'name', 'slug', 'description']),
        ]);
    }

    public function chatRoom(Request $request, string $slug)
    {
        if ($request->user() && $request->user()->status !== 'ACTIVE') {
            abort(403, 'Account is suspended.');
        }

        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $adminStealth = \App\Models\AppSetting::isTrue('admin_stealth_mode');
        $messages = $this->loadMessagesForRoom($room->id, $adminStealth);

        return Inertia::render('Chat/Room', [
            'room' => [
                'public_id' => $room->public_id,
                'name' => $room->name,
                'slug' => $room->slug,
                'description' => $room->description,
            ],
            'initialMessages' => $messages,
            'emergencyLockdown' => \App\Models\AppSetting::isTrue('emergency_lockdown'),
            'rooms' => fn () => ChatRoom::where('is_active', true)->orderBy('created_at')->get(['public_id', 'name', 'slug', 'description']),
        ]);
    }

    protected function formatSender(ChatMessage $m, bool $adminStealth): array
    {
        $isGhost = (bool) ($m->is_ghost ?? false);
        $isGuest = (bool) ($m->is_guest ?? false);
        $isSuper = $m->sender && $m->sender->isSuperAdmin();

        if ($isGuest || (!$m->sender && !$isGhost)) {
            return [
                'public_id' => 'ghost-' . substr(md5($m->public_id), 0, 6),
                'display_name' => $m->alias_name ?: 'Ghost Node',
                'username' => 'ghost_' . substr(md5($m->public_id), 0, 4),
                'is_ghost' => true,
                'is_guest' => true,
                'avatar_url' => null,
            ];
        } elseif ($isGhost) {
            return [
                'public_id' => 'ghost-' . substr(md5($m->public_id), 0, 6),
                'display_name' => $m->alias_name ?: 'Ghost Node',
                'username' => 'ghost_' . substr(md5($m->public_id), 0, 4),
                'is_ghost' => true,
                'is_guest' => false,
                'avatar_url' => null,
            ];
        } elseif ($isSuper && $adminStealth) {
            return [
                'public_id' => 'system-node',
                'display_name' => '[CORE_OPERATOR]',
                'username' => 'system_core',
                'is_ghost' => true,
                'is_guest' => false,
                'avatar_url' => null,
            ];
        } else {
            return [
                'public_id' => $m->sender ? $m->sender->public_id : 'unknown',
                'display_name' => $m->sender ? $m->sender->display_name : 'Anonymous',
                'username' => $m->sender ? $m->sender->username : 'user',
                'is_ghost' => false,
                'is_guest' => false,
                'avatar_url' => $m->sender ? $m->sender->avatar_url : null,
            ];
        }
    }

    protected function loadMessagesForRoom(int $roomId, bool $adminStealth)
    {
        // Ephemeral chat cleanup: guest messages older than 15 minutes are purged so chat history will not remain for guests
        ChatMessage::where('is_guest', true)
            ->where('created_at', '<', now()->subMinutes(SiteSettings::get('guest_retention_minutes')))
            ->delete();

        return ChatMessage::with(['sender', 'subChats' => fn ($query) => $query->orderBy('id'), 'subChats.sender'])
            ->where('chat_room_id', $roomId)
            ->whereNull('parent_id')
            ->orderBy('id', 'desc')
            ->take(SiteSettings::get('history_limit'))
            ->get()
            ->reverse()
            ->values()
            ->map(function ($m) use ($adminStealth) {
                $sender = $this->formatSender($m, $adminStealth);
                $subChats = $m->subChats->map(function ($sub) use ($adminStealth, $m) {
                    return [
                        'public_id' => $sub->public_id,
                        'parent_public_id' => $m->public_id,
                        'message' => $sub->message,
                        'created_at' => $sub->created_at->format('H:i'),
                        'is_ghost' => (bool) ($sub->is_ghost ?? false),
                        'is_guest' => (bool) ($sub->is_guest ?? false),
                        'sender' => $this->formatSender($sub, $adminStealth),
                    ];
                })->values();

                return [
                    'public_id' => $m->public_id,
                    'message' => $m->message,
                    'created_at' => $m->created_at->format('H:i'),
                    'is_ghost' => (bool) ($m->is_ghost ?? false),
                    'is_guest' => (bool) ($m->is_guest ?? false),
                    'sender' => $sender,
                    'sub_chats' => $subChats,
                    'sub_chats_count' => $subChats->count(),
                ];
            });
    }

    public function sendChatMessage(Request $request, string $slug)
    {
        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();
        $user = $request->user();
        if (!SiteSettings::get('chat_enabled')) throw ValidationException::withMessages(['message' => 'Chat is paused by an administrator.']);
        if (!$user && !SiteSettings::get('guest_chat_enabled')) throw ValidationException::withMessages(['message' => 'Please sign in to send messages.']);
        if ($request->filled('parent_public_id') && !SiteSettings::get('replies_enabled')) throw ValidationException::withMessages(['message' => 'Reply threads are currently disabled.']);
        if ($request->boolean('is_ghost') && !SiteSettings::get('anonymous_enabled')) throw ValidationException::withMessages(['message' => 'Anonymous aliases are currently disabled.']);

        if ($user) {
            // Ban check on HTTP POST message path (§20)
            if ($user->status !== 'ACTIVE') {
                abort(403, 'Account is suspended.');
            }

            if (\App\Models\AppSetting::isTrue('emergency_lockdown') && !$user->isSuperAdmin()) {
                throw ValidationException::withMessages(['message' => 'Chat is temporarily paused by admin.']);
            }

            $ipHash = Anonymity::hashIp($request->ip());
            $limiterKey = 'chat:' . $user->id . ':' . $ipHash;
            if (RateLimiter::tooManyAttempts($limiterKey, SiteSettings::get('message_rate_limit'))) {
                throw ValidationException::withMessages(['message' => 'Message limit reached. Please wait a minute and retry.']);
            }
            RateLimiter::hit($limiterKey, 60);
        } else {
            // Ghost chatting without login
            if (\App\Models\AppSetting::isTrue('emergency_lockdown')) {
                throw ValidationException::withMessages(['message' => 'Chat is temporarily paused by admin.']);
            }

            $ipHash = Anonymity::hashIp($request->ip());
            $limiterKey = 'chat:ghost:' . $ipHash;
            if (RateLimiter::tooManyAttempts($limiterKey, SiteSettings::get('guest_rate_limit'))) {
                throw ValidationException::withMessages(['message' => 'Guest message limit reached. Please wait a minute and retry.']);
            }
            RateLimiter::hit($limiterKey, 60);
        }

        $request->validate([
            'message' => ['required', 'string', 'max:'.SiteSettings::get('message_max_length')],
            'is_ghost' => ['nullable', 'boolean'],
            'guest_name' => ['nullable', 'string', 'max:30'],
            'parent_public_id' => ['nullable', 'string', 'max:50'],
        ]);
        $request->merge(['message' => trim(strip_tags($request->input('message')))]);
        $request->validate([
            'message' => ['required', 'string', 'min:1', 'max:'.SiteSettings::get('message_max_length')],
        ]);

        $isGuest = $user === null;
        $isGhost = $user ? $request->boolean('is_ghost', false) : false;
        $aliasName = null;

        if ($isGhost) {
            $aliasName = 'Ghost-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
        } elseif ($isGuest) {
            $customName = trim(strip_tags((string) $request->input('guest_name', '')));
            if ($customName !== '' && strlen($customName) <= 25) {
                $aliasName = $customName;
            } else {
                $aliasName = 'Ghost-' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
            }
        }

        $parentId = null;
        if ($parentPubId = $request->input('parent_public_id')) {
            $parentMsg = ChatMessage::where('public_id', $parentPubId)
                ->where('chat_room_id', $room->id)
                ->first();
            if (!$parentMsg) throw ValidationException::withMessages(['message' => 'This reply thread is no longer available.']);
            $parentId = $parentMsg->parent_id ?: $parentMsg->id;
        }

        ChatMessage::create([
            'chat_room_id' => $room->id,
            'parent_id' => $parentId,
            'user_id' => $user ? $user->id : null,
            'message' => trim(strip_tags($request->message)),
            'is_ghost' => $isGhost,
            'is_guest' => $isGuest,
            'is_ephemeral' => $isGuest,
            'alias_name' => $aliasName,
        ]);

        return $request->expectsJson() ? response()->json($this->chatPayload($request, $room), 201)->header('Cache-Control', 'no-store') : back();
    }

    protected function chatPayload(Request $request, ChatRoom $room): array
    {
        $site = SiteSettings::all();
        $locked = \App\Models\AppSetting::isTrue('emergency_lockdown') && !$request->user()?->isSuperAdmin();
        return [
            'messages' => $this->loadMessagesForRoom($room->id, \App\Models\AppSetting::isTrue('admin_stealth_mode')),
            'policy' => [
                'can_send' => $site['chat_enabled'] && !$locked && ($request->user() !== null || $site['guest_chat_enabled']),
                'reason' => !$site['chat_enabled'] || $locked ? 'Chat is temporarily paused by admin.' : (!$request->user() && !$site['guest_chat_enabled'] ? 'Sign in to send messages.' : ''),
                'replies_enabled' => $site['replies_enabled'], 'anonymous_enabled' => $site['anonymous_enabled'],
                'message_max_length' => $site['message_max_length'], 'poll_interval' => $site['poll_interval'],
            ],
        ];
    }

    public function chatMessages(Request $request, string $slug)
    {
        abort_if($request->user() && $request->user()->status !== 'ACTIVE', 403, 'Account is suspended.');
        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();
        return response()->json($this->chatPayload($request, $room))->header('Cache-Control', 'no-store');
    }

    public function deleteChatMessage(Request $request, string $slug, string $publicId)
    {
        $room = ChatRoom::where('slug', $slug)->firstOrFail();
        $message = ChatMessage::where('chat_room_id', $room->id)->where('public_id', $publicId)->firstOrFail();
        \Illuminate\Support\Facades\DB::transaction(function () use ($message, $request) {
            ChatMessage::where('parent_id', $message->id)->delete();
            $message->delete();
            \App\Models\AdminAuditLog::create(['admin_id' => $request->user()->id, 'action' => 'CHAT_MESSAGE_REMOVED', 'target_type' => 'chat_message', 'target_public_id' => $message->public_id, 'created_at' => now()]);
        });
        return response()->json($this->chatPayload($request, $room))->header('Cache-Control', 'no-store');
    }

    public function submitReport(Request $request)
    {
        $request->validate([
            'target_type' => ['required', 'in:post,comment,chat_message,user'],
            'target_public_id' => ['required', 'string'],
            'reason' => ['required', 'in:Spam,Harassment,Threat,Personal Information,Abuse,Impersonation,Other'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        Report::firstOrCreate([
            'reporter_id' => $request->user()->id,
            'target_type' => $request->target_type,
            'target_public_id' => $request->target_public_id,
        ], [
            'reason' => $request->reason,
            'notes' => trim(strip_tags((string) $request->notes)),
            'status' => 'PENDING',
        ]);

        return back()->with('success', 'Report received. Our moderation team will inspect this content.');
    }

    public function privacy()
    {
        return Inertia::render('Info/Privacy');
    }

    public function rules()
    {
        return Inertia::render('Info/Rules');
    }
}
