<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\Notice;
use App\Models\Organization;
use App\Models\Poll;
use App\Models\PollVote;
use App\Models\Post;
use App\Models\Report;
use App\Models\User;
use App\Support\Anonymity;
use App\Support\SiteSettings;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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
        ChatRoom::purgeInactiveRooms();

        $rooms = ChatRoom::where('is_active', true)
            ->withCount('messages')
            ->orderBy('created_at')
            ->get(['id', 'public_id', 'name', 'slug', 'description', 'password'])
            ->map(function ($r) {
                return [
                    'id' => $r->id,
                    'public_id' => $r->public_id,
                    'name' => $r->name,
                    'slug' => $r->slug,
                    'description' => $r->description,
                    'messages_count' => $r->messages_count,
                    'has_password' => !empty($r->password),
                ];
            });

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
            'password' => ['required', 'string', 'min:3', 'max:100'],
            'description' => ['nullable', 'string', 'max:240'],
        ]);
        $request->merge([
            'name' => trim(strip_tags((string) $request->input('name', ''))),
            'description' => trim(strip_tags((string) $request->input('description', ''))),
        ]);
        $data = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:60'],
            'password' => ['required', 'string', 'min:3', 'max:100'],
            'description' => ['nullable', 'string', 'max:240'],
        ]);

        $key = 'create-room:'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($key, 3)) {
            return back()->withErrors(['name' => 'You have created 3 rooms this hour. Give them a little time to grow.']);
        }
        RateLimiter::hit($key, 3600);

        $room = ChatRoom::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'password' => Hash::make($data['password']),
            'slug' => (Str::slug($data['name']) ?: 'room').'-'.strtolower((string) Str::ulid()),
            'created_by' => $request->user()->id,
            'is_active' => true,
        ]);

        session()->put('room_unlocked_' . $room->id, true);

        return redirect()->route('chat.room', $room->slug)->with('success', 'Your room is open. Make someone feel welcome.');
    }

    public function unlockChatRoom(Request $request, string $slug)
    {
        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (empty($room->password) || Hash::check($request->password, $room->password)) {
            session()->put('room_unlocked_' . $room->id, true);
            return back()->with('success', 'Room unlocked.');
        }

        return back()->withErrors(['password' => 'Incorrect password for this room.']);
    }

    public function homeChat(Request $request)
    {
        ChatRoom::purgeInactiveRooms();

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
        $messages = $this->loadMessagesForRoom($room->id, $adminStealth, $request->user()?->id);

        return Inertia::render('Chat/HomeChat', [
            'room' => [
                'public_id' => $room->public_id,
                'name' => $room->name,
                'slug' => $room->slug,
                'description' => $room->description,
                'has_password' => !empty($room->password),
            ],
            'initialMessages' => $messages,
            'emergencyLockdown' => \App\Models\AppSetting::isTrue('emergency_lockdown'),
            'rooms' => fn () => ChatRoom::where('is_active', true)->withCount('messages')->orderBy('created_at')->get(['public_id', 'name', 'slug', 'description']),
        ]);
    }

    public function chatRoom(Request $request, string $slug)
    {
        ChatRoom::purgeInactiveRooms();

        if ($request->user() && $request->user()->status !== 'ACTIVE') {
            abort(403, 'Account is suspended.');
        }

        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $isLocked = false;
        if (!empty($room->password)) {
            $isUnlocked = $request->user()?->isSuperAdmin() || (bool) session('room_unlocked_' . $room->id);
            if (!$isUnlocked) {
                $isLocked = true;
            }
        }

        $adminStealth = \App\Models\AppSetting::isTrue('admin_stealth_mode');
        $messages = $isLocked ? [] : $this->loadMessagesForRoom($room->id, $adminStealth, $request->user()?->id);

        return Inertia::render('Chat/Room', [
            'room' => [
                'public_id' => $room->public_id,
                'name' => $room->name,
                'slug' => $room->slug,
                'description' => $room->description,
                'has_password' => !empty($room->password),
            ],
            'isLocked' => $isLocked,
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

    protected function loadMessagesForRoom(int $roomId, bool $adminStealth, ?int $userId = null)
    {
        // Public chat retention: all messages (logged in or guest) remain available for 30 days
        ChatMessage::where('created_at', '<', now()->subDays(30))->delete();

        $mySent = (array) session('my_message_ids', []);
        $userReactKey = $userId ? "u_{$userId}" : 'g_' . substr((string) session()->getId(), 0, 8);
        $reactedMessageIds = \Illuminate\Support\Facades\DB::table('chat_message_reactions')
            ->where('user_id', $userReactKey)
            ->pluck('chat_message_id')
            ->toArray();

        return ChatMessage::with(['sender', 'subChats' => fn ($query) => $query->orderBy('id'), 'subChats.sender'])
            ->where('chat_room_id', $roomId)
            ->whereNull('parent_id')
            ->where('created_at', '>=', now()->subDays(30))
            ->orderBy('id', 'desc')
            ->take(SiteSettings::get('history_limit', 500))
            ->get()
            ->reverse()
            ->values()
            ->map(function ($m) use ($adminStealth, $userId, $mySent, $reactedMessageIds) {
                $sender = $this->formatSender($m, $adminStealth);
                $isOwn = ($userId && $m->user_id === $userId) || in_array($m->public_id, $mySent);
                $subChats = $m->subChats->map(function ($sub) use ($adminStealth, $m, $userId, $mySent) {
                    $isSubOwn = ($userId && $sub->user_id === $userId) || in_array($sub->public_id, $mySent);
                    return [
                        'public_id' => $sub->public_id,
                        'parent_public_id' => $m->public_id,
                        'message' => $sub->message,
                        'created_at' => $sub->created_at->isToday() ? $sub->created_at->format('H:i') : $sub->created_at->format('M j, H:i'),
                        'is_ghost' => (bool) ($sub->is_ghost ?? false),
                        'is_guest' => (bool) ($sub->is_guest ?? false),
                        'is_own' => $isSubOwn,
                        'file_url' => $sub->file_url,
                        'file_name' => $sub->file_name,
                        'file_type' => $sub->file_type,
                        'file_size' => $sub->file_size ? (int) $sub->file_size : null,
                        'sender' => $this->formatSender($sub, $adminStealth),
                    ];
                })->values();

                return [
                    'public_id' => $m->public_id,
                    'message' => $m->message,
                    'created_at' => $m->created_at->isToday() ? $m->created_at->format('H:i') : $m->created_at->format('M j, H:i'),
                    'raw_created_at' => $m->created_at->getTimestamp(),
                    'is_ghost' => (bool) ($m->is_ghost ?? false),
                    'is_guest' => (bool) ($m->is_guest ?? false),
                    'is_own' => $isOwn,
                    'file_url' => $m->file_url,
                    'file_name' => $m->file_name,
                    'file_type' => $m->file_type,
                    'file_size' => $m->file_size ? (int) $m->file_size : null,
                    'sender' => $sender,
                    'sub_chats' => $subChats,
                    'sub_chats_count' => $subChats->count(),
                    'butterfly_count' => (int) ($m->butterfly_count ?? 0),
                    'has_reacted_butterfly' => in_array($m->id, $reactedMessageIds),
                ];
            });
    }

    public function sendChatMessage(Request $request, string $slug)
    {
        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();
        if (!empty($room->password) && !$request->user()?->isSuperAdmin() && !session('room_unlocked_' . $room->id)) {
            throw ValidationException::withMessages(['message' => 'Room password required. Please unlock the room first.']);
        }
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

        $hasFile = $request->hasFile('file');
        if ($hasFile && !$user) {
            throw ValidationException::withMessages(['file' => 'Only registered users can attach files and images.']);
        }

        $request->validate([
            'message' => ['nullable', 'string', 'max:'.SiteSettings::get('message_max_length')],
            'file' => ['nullable', 'file', 'max:10240'], // 10 MB limit (10240 KB)
            'is_ghost' => ['nullable', 'boolean'],
            'guest_name' => ['nullable', 'string', 'max:30'],
            'parent_public_id' => ['nullable', 'string', 'max:50'],
        ]);

        $messageText = trim(strip_tags((string) $request->input('message', '')));
        if (!$hasFile && $messageText === '') {
            throw ValidationException::withMessages(['message' => 'Please enter a message or attach a file.']);
        }

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

        $fileUrl = null;
        $fileName = null;
        $fileType = null;
        $fileSize = null;

        if ($hasFile && $user) {
            $uploadedFile = $request->file('file');
            $origName = $uploadedFile->getClientOriginalName();
            $mimeType = $uploadedFile->getMimeType() ?: 'application/octet-stream';
            $fileSize = $uploadedFile->getSize();
            $extension = strtolower($uploadedFile->getClientOriginalExtension() ?: 'bin');

            $isImage = str_starts_with($mimeType, 'image/') || in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif']);
            $fileType = $isImage ? 'image' : 'file';

            $uploadDir = public_path('uploads/chat');
            if (!\Illuminate\Support\Facades\File::isDirectory($uploadDir)) {
                \Illuminate\Support\Facades\File::makeDirectory($uploadDir, 0755, true);
            }

            $savedName = 'chat_' . time() . '_' . Str::random(10) . '.' . $extension;
            $uploadedFile->move($uploadDir, $savedName);

            $fileUrl = '/uploads/chat/' . $savedName;
            $fileName = $origName;
        }

        $parentId = null;
        if ($parentPubId = $request->input('parent_public_id')) {
            $parentMsg = ChatMessage::where('public_id', $parentPubId)
                ->where('chat_room_id', $room->id)
                ->first();
            if (!$parentMsg) throw ValidationException::withMessages(['message' => 'This reply thread is no longer available.']);
            $parentId = $parentMsg->parent_id ?: $parentMsg->id;
        }

        $chatMsg = ChatMessage::create([
            'chat_room_id' => $room->id,
            'parent_id' => $parentId,
            'user_id' => $user ? $user->id : null,
            'message' => $messageText,
            'is_ghost' => $isGhost,
            'is_guest' => $isGuest,
            'is_ephemeral' => false,
            'alias_name' => $aliasName,
            'file_url' => $fileUrl,
            'file_name' => $fileName,
            'file_type' => $fileType,
            'file_size' => $fileSize,
        ]);

        $request->session()->push('my_message_ids', $chatMsg->public_id);

        return $request->expectsJson() ? response()->json($this->chatPayload($request, $room), 201)->header('Cache-Control', 'no-store') : back();
    }

    protected function chatPayload(Request $request, ChatRoom $room): array
    {
        $site = SiteSettings::all();
        $locked = \App\Models\AppSetting::isTrue('emergency_lockdown') && !$request->user()?->isSuperAdmin();

        $typingKey = "chat_typing_{$room->id}";
        $now = time();
        $myId = $request->user() ? "u_{$request->user()->id}" : 'g_' . substr((string) session()->getId(), 0, 8);
        $rawTyping = \Illuminate\Support\Facades\Cache::get($typingKey, []);
        $typingList = [];
        if (is_array($rawTyping)) {
            foreach ($rawTyping as $item) {
                if (is_array($item) && ($now - ($item['time'] ?? 0)) < 4 && ($item['id'] ?? '') !== $myId) {
                    $typingList[] = $item['name'] ?? 'Someone';
                }
            }
        }
        $typingList = array_values(array_unique($typingList));

        $voterKey = $request->user() ? "u_{$request->user()->id}" : 'g_' . substr((string) session()->getId(), 0, 8);

        $polls = [];
        try {
            $this->ensurePollTablesExist();
            $polls = Poll::with(['votes', 'creator'])
                ->where('chat_room_id', $room->id)
                ->where('is_active', true)
                ->orderBy('updated_at', 'desc')
                ->get()
                ->map(function (Poll $poll) use ($voterKey) {
                    $results = $poll->tallyResults();
                    $userVote = $poll->votes->firstWhere('voter_key', $voterKey);

                    return [
                        'public_id' => $poll->public_id,
                        'question' => $poll->question,
                        'options' => $poll->options,
                        'created_at' => $poll->created_at->diffForHumans(),
                        'updated_at' => $poll->updated_at?->diffForHumans(),
                        'raw_created_at' => $poll->created_at->getTimestamp(),
                        'raw_updated_at' => $poll->updated_at?->getTimestamp() ?? $poll->created_at->getTimestamp(),
                        'expires_at' => $poll->expires_at?->toIso8601String(),
                        'is_expired' => $poll->isExpired(),
                        'results' => $results,
                        'total_votes' => array_sum($results),
                        'user_vote' => $userVote ? $userVote->option_index : null,
                        'creator' => [
                            'public_id' => $poll->creator ? $poll->creator->public_id : null,
                            'display_name' => $poll->creator ? $poll->creator->display_name : 'Anonymous',
                            'is_admin' => $poll->creator ? $poll->creator->isSuperAdmin() : false,
                        ],
                    ];
                });
        } catch (\Throwable) {
            $polls = [];
        }

        // Butterfly broadcast events for all active users
        $butterflyEventsKey = "chat_butterfly_events_{$room->id}";
        $rawButterflyEvents = \Illuminate\Support\Facades\Cache::get($butterflyEventsKey, []);
        $butterflyEvents = [];
        if (is_array($rawButterflyEvents)) {
            $nowTime = microtime(true);
            foreach ($rawButterflyEvents as $evt) {
                if (is_array($evt) && ($nowTime - ($evt['timestamp'] ?? 0)) < 15) {
                    $butterflyEvents[] = $evt;
                }
            }
        }

        return [
            'messages' => $this->loadMessagesForRoom($room->id, \App\Models\AppSetting::isTrue('admin_stealth_mode'), $request->user()?->id),
            'typing' => $typingList,
            'polls' => $polls,
            'butterfly_events' => $butterflyEvents,
            'policy' => [
                'can_send' => $site['chat_enabled'] && !$locked && ($request->user() !== null || $site['guest_chat_enabled']),
                'reason' => !$site['chat_enabled'] || $locked ? 'Chat is temporarily paused by admin.' : (!$request->user() && !$site['guest_chat_enabled'] ? 'Sign in to send messages.' : ''),
                'replies_enabled' => $site['replies_enabled'], 'anonymous_enabled' => $site['anonymous_enabled'],
                'message_max_length' => $site['message_max_length'], 'poll_interval' => $site['poll_interval'],
            ],
        ];
    }

    public function recordTyping(Request $request, string $slug)
    {
        $room = ChatRoom::where('slug', $slug)->first();
        if (!$room) return response()->json(['status' => 'ok']);

        $user = $request->user();
        $isGhost = $request->boolean('is_ghost', false);
        $name = (!$user || $isGhost) ? 'Someone' : $user->username;
        $key = "chat_typing_{$room->id}";

        $current = \Illuminate\Support\Facades\Cache::get($key, []);
        $id = $user ? "u_{$user->id}" : 'g_' . substr((string) session()->getId(), 0, 8);

        $now = time();
        $active = [];
        if (is_array($current)) {
            foreach ($current as $item) {
                if (is_array($item) && ($now - ($item['time'] ?? 0)) < 4 && ($item['id'] ?? '') !== $id) {
                    $active[] = $item;
                }
            }
        }
        $active[] = ['id' => $id, 'name' => $name, 'time' => $now];

        \Illuminate\Support\Facades\Cache::put($key, $active, 8);
        return response()->json(['status' => 'ok']);
    }

    public function reactButterfly(Request $request, string $slug, string $public_id)
    {
        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();
        $message = ChatMessage::where('chat_room_id', $room->id)->where('public_id', $public_id)->firstOrFail();
        $user = $request->user();
        $userReactKey = $user ? "u_{$user->id}" : 'g_' . substr((string) session()->getId(), 0, 8);

        $this->ensurePollTablesExist();

        \Illuminate\Support\Facades\DB::transaction(function () use ($message, $userReactKey) {
            $existing = \Illuminate\Support\Facades\DB::table('chat_message_reactions')
                ->where('chat_message_id', $message->id)
                ->where('user_id', $userReactKey)
                ->first();

            if ($existing) {
                \Illuminate\Support\Facades\DB::table('chat_message_reactions')
                    ->where('id', $existing->id)
                    ->delete();
                if ($message->butterfly_count > 0) {
                    $message->decrement('butterfly_count');
                }
            } else {
                \Illuminate\Support\Facades\DB::table('chat_message_reactions')->insert([
                    'chat_message_id' => $message->id,
                    'user_id' => $userReactKey,
                    'created_at' => now(),
                ]);
                $message->increment('butterfly_count');
            }
        });

        // Broadcast butterfly flight event to all active users in room
        $butterflyEventsKey = "chat_butterfly_events_{$room->id}";
        $rawEvents = \Illuminate\Support\Facades\Cache::get($butterflyEventsKey, []);
        $activeEvents = [];
        $nowTime = microtime(true);
        if (is_array($rawEvents)) {
            foreach ($rawEvents as $evt) {
                if (is_array($evt) && ($nowTime - ($evt['timestamp'] ?? 0)) < 15) {
                    $activeEvents[] = $evt;
                }
            }
        }
        $activeEvents[] = [
            'message_public_id' => $message->public_id,
            'timestamp' => $nowTime,
        ];
        \Illuminate\Support\Facades\Cache::put($butterflyEventsKey, $activeEvents, 30);

        return response()->json($this->chatPayload($request, $room))->header('Cache-Control', 'no-store');
    }

    public function chatMessages(Request $request, string $slug)
    {
        abort_if($request->user() && $request->user()->status !== 'ACTIVE', 403, 'Account is suspended.');
        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();
        if (!empty($room->password) && !$request->user()?->isSuperAdmin() && !session('room_unlocked_' . $room->id)) {
            return response()->json(['messages' => [], 'policy' => ['can_send' => false, 'reason' => 'Room password required.']], 403);
        }
        return response()->json($this->chatPayload($request, $room))->header('Cache-Control', 'no-store');
    }

    public function deleteChatMessage(Request $request, string $slug, string $publicId)
    {
        $room = ChatRoom::where('slug', $slug)->firstOrFail();
        $message = ChatMessage::where('chat_room_id', $room->id)->where('public_id', $publicId)->firstOrFail();
        \Illuminate\Support\Facades\DB::transaction(function () use ($message, $request) {
            $subMessages = ChatMessage::where('parent_id', $message->id)->get();
            foreach ($subMessages as $sub) {
                if ($sub->file_url && \Illuminate\Support\Str::startsWith($sub->file_url, '/uploads/chat/')) {
                    $path = public_path(ltrim($sub->file_url, '/'));
                    if (\Illuminate\Support\Facades\File::exists($path)) {
                        \Illuminate\Support\Facades\File::delete($path);
                    }
                }
            }
            ChatMessage::where('parent_id', $message->id)->delete();

            if ($message->file_url && \Illuminate\Support\Str::startsWith($message->file_url, '/uploads/chat/')) {
                $path = public_path(ltrim($message->file_url, '/'));
                if (\Illuminate\Support\Facades\File::exists($path)) {
                    \Illuminate\Support\Facades\File::delete($path);
                }
            }
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

    protected function ensurePollTablesExist(): void
    {
        if (!\Illuminate\Support\Facades\Schema::hasTable('polls')) {
            \Illuminate\Support\Facades\Schema::create('polls', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->string('public_id', 26)->unique();
                $table->foreignId('chat_room_id')->constrained('chat_rooms')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('question', 255);
                $table->json('options');
                $table->timestamp('expires_at')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['chat_room_id', 'is_active']);
            });
        }

        if (!\Illuminate\Support\Facades\Schema::hasTable('poll_votes')) {
            \Illuminate\Support\Facades\Schema::create('poll_votes', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->foreignId('poll_id')->constrained('polls')->cascadeOnDelete();
                $table->tinyInteger('option_index')->unsigned();
                $table->string('voter_key', 64);
                $table->timestamp('created_at')->nullable();

                $table->unique(['poll_id', 'voter_key']);
            });
        }

        if (!\Illuminate\Support\Facades\Schema::hasTable('chat_message_reactions')) {
            \Illuminate\Support\Facades\Schema::create('chat_message_reactions', function (\Illuminate\Database\Schema\Blueprint $table) {
                $table->id();
                $table->foreignId('chat_message_id')->constrained('chat_messages')->cascadeOnDelete();
                $table->string('user_id');
                $table->timestamp('created_at')->nullable();
                $table->index(['chat_message_id', 'user_id']);
            });
        }

        if (\Illuminate\Support\Facades\Schema::hasTable('chat_messages')) {
            \Illuminate\Support\Facades\Schema::table('chat_messages', function (\Illuminate\Database\Schema\Blueprint $table) {
                if (!\Illuminate\Support\Facades\Schema::hasColumn('chat_messages', 'butterfly_count')) {
                    $table->unsignedInteger('butterfly_count')->default(0);
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('chat_messages', 'file_url')) {
                    $table->string('file_url')->nullable();
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('chat_messages', 'file_name')) {
                    $table->string('file_name')->nullable();
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('chat_messages', 'file_type')) {
                    $table->string('file_type')->nullable();
                }
                if (!\Illuminate\Support\Facades\Schema::hasColumn('chat_messages', 'file_size')) {
                    $table->unsignedBigInteger('file_size')->nullable();
                }
            });
        }
    }

    public function createPoll(Request $request, string $slug)
    {
        $user = $request->user();
        abort_unless($user && ($user->isSuperAdmin() || $user->status === 'ACTIVE'), 403, 'Account is suspended.');

        $this->ensurePollTablesExist();

        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $data = $request->validate([
            'question' => ['required', 'string', 'max:200'],
            'options' => ['required', 'array', 'min:2', 'max:10'],
            'options.*' => ['required', 'string', 'max:100'],
        ]);

        // Each poll runs for exactly 24 hours like Telegram
        $expiresAt = now()->addHours(24);

        $poll = Poll::create([
            'chat_room_id' => $room->id,
            'user_id' => $user->id,
            'question' => trim(strip_tags($data['question'])),
            'options' => array_values(array_filter(array_map(fn ($opt) => trim(strip_tags($opt)), $data['options']))),
            'expires_at' => $expiresAt,
        ]);
        $poll->touch();

        return response()->json($this->chatPayload($request, $room), 201)->header('Cache-Control', 'no-store');
    }

    public function votePoll(Request $request, string $slug, string $pollPublicId)
    {
        $this->ensurePollTablesExist();

        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();

        $poll = Poll::where('public_id', $pollPublicId)
            ->where('chat_room_id', $room->id)
            ->where('is_active', true)
            ->firstOrFail();

        if ($poll->isExpired()) {
            throw ValidationException::withMessages(['poll' => 'This 24-hour poll has closed.']);
        }

        $data = $request->validate([
            'option_index' => ['required', 'integer', 'min:0', 'max:' . (count($poll->options) - 1)],
        ]);

        $user = $request->user();
        $voterKey = $user ? "u_{$user->id}" : 'g_' . substr((string) session()->getId(), 0, 8);

        $existing = PollVote::where('poll_id', $poll->id)->where('voter_key', $voterKey)->first();
        if ($existing) {
            throw ValidationException::withMessages(['poll' => 'You have already voted on this poll.']);
        }

        PollVote::create([
            'poll_id' => $poll->id,
            'option_index' => $data['option_index'],
            'voter_key' => $voterKey,
            'created_at' => now(),
        ]);

        $poll->touch();

        return response()->json($this->chatPayload($request, $room))->header('Cache-Control', 'no-store');
    }

    public function retractVote(Request $request, string $slug, string $pollPublicId)
    {
        $this->ensurePollTablesExist();

        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();
        $poll = Poll::where('public_id', $pollPublicId)
            ->where('chat_room_id', $room->id)
            ->where('is_active', true)
            ->firstOrFail();

        if ($poll->isExpired()) {
            throw ValidationException::withMessages(['poll' => 'This 24-hour poll has closed.']);
        }

        $user = $request->user();
        $voterKey = $user ? "u_{$user->id}" : 'g_' . substr((string) session()->getId(), 0, 8);

        PollVote::where('poll_id', $poll->id)->where('voter_key', $voterKey)->delete();

        $poll->touch();

        return response()->json($this->chatPayload($request, $room))->header('Cache-Control', 'no-store');
    }

    public function deletePoll(Request $request, string $slug, string $pollPublicId)
    {
        $this->ensurePollTablesExist();

        $room = ChatRoom::where('slug', $slug)->where('is_active', true)->firstOrFail();
        $poll = Poll::where('public_id', $pollPublicId)->where('chat_room_id', $room->id)->firstOrFail();

        $user = $request->user();
        abort_unless($user && ($user->isSuperAdmin() || $user->id === $poll->user_id), 403, 'Unauthorized.');

        \Illuminate\Support\Facades\DB::transaction(function () use ($poll, $user) {
            PollVote::where('poll_id', $poll->id)->delete();
            $poll->delete();

            if ($user->isSuperAdmin()) {
                \App\Models\AdminAuditLog::create([
                    'admin_id' => $user->id,
                    'action' => 'POLL_REMOVED',
                    'target_type' => 'poll',
                    'target_public_id' => $poll->public_id,
                    'created_at' => now(),
                ]);
            }
        });

        return response()->json($this->chatPayload($request, $room))->header('Cache-Control', 'no-store');
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
