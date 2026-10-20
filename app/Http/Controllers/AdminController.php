<?php

namespace App\Http\Controllers;

use App\Models\AdminAuditLog;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\Comment;
use App\Models\Notice;
use App\Models\Organization;
use App\Models\Post;
use App\Models\Report;
use App\Models\SecurityEvent;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function dashboard(Request $request)
    {
        // Real active sessions in last 3 minutes
        $activeThreshold = time() - 180;
        $activeSessionsCount = DB::table('sessions')
            ->where('last_activity', '>=', $activeThreshold)
            ->count();

        if ($activeSessionsCount === 0) {
            $activeSessionsCount = 1;
        }

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'users_count' => User::count(),
                'posts_count' => Post::count(),
                'comments_count' => Comment::count(),
                'reports_pending' => Report::where('status', 'PENDING')->count(),
                'organizations_count' => Organization::count(),
                'notices_count' => Notice::count(),
                'chat_rooms_count' => ChatRoom::count(),
                'chat_messages_count' => ChatMessage::count(),
                'active_sessions_count' => $activeSessionsCount,
                'emergency_lockdown' => \App\Models\AppSetting::isTrue('emergency_lockdown'),
                'admin_stealth_mode' => \App\Models\AppSetting::isTrue('admin_stealth_mode'),
            ],
            'recentLogs' => AdminAuditLog::with('admin')->orderBy('created_at', 'desc')->take(6)->get(),
        ]);
    }

    public function users(Request $request)
    {
        $q = $request->input('q');
        $query = User::orderBy('created_at', 'desc');

        if ($q) {
            $query->where(function ($sub) use ($q) {
                $sub->where('username', 'like', "%{$q}%")
                    ->orWhere('display_name', 'like', "%{$q}%");
            });
        }

        $activeThreshold = time() - 180;
        $activeUserIds = DB::table('sessions')
            ->where('last_activity', '>=', $activeThreshold)
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->map(fn($id) => (int) $id)
            ->toArray();

        if ($request->user()) {
            $activeUserIds[] = $request->user()->id;
        }
        $activeUserIds = array_unique($activeUserIds);

        $users = $query->paginate(20)->withQueryString()->through(fn($u) => [
            'public_id' => $u->public_id,
            'display_name' => $u->display_name,
            'username' => $u->username,
            'gender' => $u->gender,
            'role' => $u->role,
            'status' => $u->status,
            'is_online' => in_array($u->id, $activeUserIds),
            'created_at' => $u->created_at ? $u->created_at->format('Y-m-d H:i') : 'Recently',
        ]);

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'query' => $q,
        ]);
    }

    public function toggleBanUser(Request $request, string $publicId)
    {
        $user = User::where('public_id', $publicId)->firstOrFail();
        if ($user->isSuperAdmin()) {
            return back()->withErrors(['error' => 'Cannot ban Super Admin.']);
        }

        $newStatus = $user->status === 'BANNED' ? 'ACTIVE' : 'BANNED';
        $user->status = $newStatus;
        $user->save();

        if ($newStatus === 'BANNED') {
            // Invalidate all sessions immediately (§20, §37)
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => $newStatus === 'BANNED' ? 'USER_BANNED' : 'USER_UNBANNED',
            'target_type' => 'user',
            'target_public_id' => $user->public_id,
            'safe_metadata' => ['username' => $user->username],
        ]);

        return back()->with('success', "User status updated to {$newStatus}.");
    }

    public function reports()
    {
        $reports = Report::with('reporter')
            ->orderBy('status', 'asc')
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->through(fn($r) => [
                'public_id' => $r->public_id,
                'target_type' => $r->target_type,
                'target_public_id' => $r->target_public_id,
                'reason' => $r->reason,
                'notes' => $r->notes,
                'status' => $r->status,
                'reporter' => $r->reporter ? $r->reporter->username : 'Unknown',
                'created_at' => $r->created_at->diffForHumans(),
            ]);

        return Inertia::render('Admin/Reports', [
            'reports' => $reports,
        ]);
    }

    public function resolveReport(Request $request, string $publicId)
    {
        $report = Report::where('public_id', $publicId)->firstOrFail();
        $report->status = 'RESOLVED';
        $report->resolved_by = $request->user()->id;
        $report->resolved_at = now();
        $report->save();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'REPORT_RESOLVED',
            'target_type' => 'report',
            'target_public_id' => $report->public_id,
        ]);

        return back()->with('success', 'Report marked as resolved.');
    }

    public function organizations()
    {
        $orgs = Organization::orderBy('sort_order')->get();
        return Inertia::render('Admin/Organizations', [
            'organizations' => $orgs,
        ]);
    }

    public function createOrganization(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:100', 'unique:organizations,slug'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $org = Organization::create([
            'name' => trim(strip_tags($request->name)),
            'slug' => trim(strip_tags($request->slug)),
            'description' => trim(strip_tags((string)$request->description)),
            'status' => 'ACTIVE',
        ]);

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'ORGANIZATION_CREATED',
            'target_type' => 'organization',
            'target_public_id' => $org->public_id,
            'safe_metadata' => ['name' => $org->name],
        ]);

        return back()->with('success', 'Organization created.');
    }

    public function notices()
    {
        $notices = Notice::with('organization')->orderBy('created_at', 'desc')->get();
        $organizations = Organization::where('status', 'ACTIVE')->get(['public_id', 'name']);

        return Inertia::render('Admin/Notices', [
            'notices' => $notices,
            'organizations' => $organizations,
        ]);
    }

    public function createNotice(Request $request)
    {
        $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:5000'],
            'pinned' => ['boolean'],
            'organization_public_id' => ['nullable', 'exists:organizations,public_id'],
        ]);

        $orgId = null;
        if ($request->organization_public_id) {
            $org = Organization::where('public_id', $request->organization_public_id)->first();
            $orgId = $org?->id;
        }

        $notice = Notice::create([
            'organization_id' => $orgId,
            'title' => trim(strip_tags($request->title)),
            'body' => trim(strip_tags($request->body)),
            'pinned' => $request->boolean('pinned', false),
            'status' => 'PUBLISHED',
            'published_at' => now(),
        ]);

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'NOTICE_CREATED',
            'target_type' => 'notice',
            'target_public_id' => $notice->public_id,
            'safe_metadata' => ['title' => $notice->title],
        ]);

        return back()->with('success', 'Notice published.');
    }

    public function posts(Request $request)
    {
        $q = $request->input('q');
        $query = Post::with(['author', 'organization'])->orderBy('created_at', 'desc');

        if ($q) {
            $query->where('title', 'like', "%{$q}%")
                  ->orWhere('body', 'like', "%{$q}%");
        }

        $posts = $query->paginate(20)->withQueryString()->through(fn($p) => [
            'public_id' => $p->public_id,
            'title' => $p->title,
            'body' => $p->body,
            'author' => $p->is_ghost ? ($p->alias_name ?: 'Ghost Node') : ($p->author->display_name ?? 'Unknown'),
            'author_username' => $p->is_ghost ? 'anon_ghost' : ($p->author->username ?? 'unknown'),
            'score' => $p->score,
            'comments_count' => $p->comments_count,
            'comments_locked' => $p->comments_locked,
            'status' => $p->status,
            'is_ghost' => (bool) $p->is_ghost,
            'created_at' => $p->created_at->format('Y-m-d H:i'),
        ]);

        return Inertia::render('Admin/Posts', [
            'posts' => $posts,
            'query' => $q,
        ]);
    }

    public function togglePostStatus(Request $request, string $publicId)
    {
        $post = Post::where('public_id', $publicId)->firstOrFail();
        $newStatus = $post->status === 'ACTIVE' ? 'REMOVED_BY_ADMIN' : 'ACTIVE';
        $post->status = $newStatus;
        $post->save();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => $newStatus === 'ACTIVE' ? 'POST_RESTORED' : 'POST_REMOVED',
            'target_type' => 'post',
            'target_public_id' => $post->public_id,
        ]);

        return back()->with('success', "Post status updated to {$newStatus}.");
    }

    public function togglePostLock(Request $request, string $publicId)
    {
        $post = Post::where('public_id', $publicId)->firstOrFail();
        $post->comments_locked = !$post->comments_locked;
        $post->save();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => $post->comments_locked ? 'COMMENTS_LOCKED' : 'COMMENTS_UNLOCKED',
            'target_type' => 'post',
            'target_public_id' => $post->public_id,
        ]);

        return back()->with('success', $post->comments_locked ? 'Comments locked for post.' : 'Comments unlocked.');
    }

    public function chatRooms()
    {
        $rooms = ChatRoom::withCount('messages')->orderBy('created_at', 'desc')->get()->map(fn($r) => [
            'public_id' => $r->public_id,
            'name' => $r->name,
            'slug' => $r->slug,
            'description' => $r->description,
            'is_active' => (bool) $r->is_active,
            'messages_count' => $r->messages_count,
            'created_at' => $r->created_at->format('Y-m-d H:i'),
        ]);

        return Inertia::render('Admin/ChatRooms', [
            'rooms' => $rooms,
        ]);
    }

    public function toggleChatRoomStatus(Request $request, string $publicId)
    {
        $room = ChatRoom::where('public_id', $publicId)->firstOrFail();
        if ($room->is_active && $room->slug === \App\Support\SiteSettings::get('default_room_slug')) {
            return back()->with('error', 'Choose another default room in Website customization before closing this one.');
        }
        $room->is_active = !$room->is_active;
        $room->save();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => $room->is_active ? 'CHAT_ROOM_ACTIVATED' : 'CHAT_ROOM_FROZEN',
            'target_type' => 'chat_room',
            'target_public_id' => $room->public_id,
        ]);

        return back()->with('success', $room->is_active ? 'Chat room unlocked.' : 'Chat room frozen.');
    }

    public function purgeChatRoomMessages(Request $request, string $publicId)
    {
        $room = ChatRoom::where('public_id', $publicId)->firstOrFail();
        $count = ChatMessage::where('chat_room_id', $room->id)->count();
        ChatMessage::where('chat_room_id', $room->id)->delete();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'CHAT_MESSAGES_PURGED',
            'target_type' => 'chat_room',
            'target_public_id' => $room->public_id,
            'safe_metadata' => ['deleted_count' => $count],
        ]);

        return back()->with('success', "Purged {$count} messages from room {$room->name}.");
    }

    public function stealthConsole()
    {
        $activeThreshold = time() - 180;
        $activeCount = DB::table('sessions')->where('last_activity', '>=', $activeThreshold)->count();
        if ($activeCount === 0) {
            $activeCount = 1;
        }

        return Inertia::render('Admin/Stealth', [
            'status' => [
                'admin_stealth_mode' => \App\Models\AppSetting::isTrue('admin_stealth_mode'),
                'emergency_lockdown' => \App\Models\AppSetting::isTrue('emergency_lockdown'),
                'active_sessions' => $activeCount,
                'audit_logs_count' => AdminAuditLog::count(),
                'security_events_count' => SecurityEvent::count(),
                'ip_retention_policy' => 'ZERO RAW IP / HMAC-SHA256 DIGEST ONLY',
                'referrer_policy' => 'NO-REFERRER STRICT',
                'anti_fingerprint_status' => 'PERMISSIONS-POLICY ACTIVE (14 SENSORS LOCKED)',
                'crypto_salts' => 'BCRYPT + ROTATING HMAC DIVERSIFICATION',
            ],
        ]);
    }

    public function toggleStealthMode(Request $request)
    {
        $current = \App\Models\AppSetting::isTrue('admin_stealth_mode');
        \App\Models\AppSetting::set('admin_stealth_mode', !$current);

        return back()->with('success', !$current ? 'Admin Cloak & Stealth Mode ENABLED.' : 'Admin Stealth Mode disabled.');
    }

    public function toggleEmergencyLockdown(Request $request)
    {
        $current = \App\Models\AppSetting::isTrue('emergency_lockdown');
        \App\Models\AppSetting::set('emergency_lockdown', !$current);

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => !$current ? 'EMERGENCY_LOCKDOWN_ENABLED' : 'EMERGENCY_LOCKDOWN_DISABLED',
            'target_type' => 'system',
        ]);

        return back()->with('success', !$current ? 'Platform Emergency Lockdown ACTIVATED. Non-admin operations paused.' : 'Emergency Lockdown lifted.');
    }

    public function purgeLogs(Request $request)
    {
        $auditCount = AdminAuditLog::count();
        $eventCount = SecurityEvent::count();

        AdminAuditLog::truncate();
        SecurityEvent::truncate();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'FORENSIC_LOGS_PURGED',
            'target_type' => 'system',
            'safe_metadata' => ['purged_audit' => $auditCount, 'purged_events' => $eventCount],
        ]);

        return back()->with('success', "Forensic purge complete. Removed {$auditCount} audit records and {$eventCount} security events.");
    }

    public function terminateAllSessions(Request $request)
    {
        $deleted = DB::table('sessions')->where('user_id', '!=', $request->user()->id)->delete();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'ALL_NON_ADMIN_SESSIONS_TERMINATED',
            'target_type' => 'sessions',
            'safe_metadata' => ['terminated_count' => $deleted],
        ]);

        return back()->with('success', "Terminated {$deleted} active sessions. All users must re-authenticate.");
    }

    public function terminateUserSessions(Request $request, string $publicId)
    {
        $user = User::where('public_id', $publicId)->firstOrFail();
        $deleted = DB::table('sessions')->where('user_id', $user->id)->delete();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'USER_SESSIONS_TERMINATED',
            'target_type' => 'user',
            'target_public_id' => $user->public_id,
        ]);

        return back()->with('success', "Terminated {$deleted} active sessions for user @{$user->username}.");
    }

    public function deleteUser(Request $request, string $publicId)
    {
        $user = User::where('public_id', $publicId)->firstOrFail();
        if ($user->isSuperAdmin()) {
            return back()->withErrors(['error' => 'Cannot delete Super Admin account.']);
        }
        if ($user->id === $request->user()->id) {
            return back()->withErrors(['error' => 'You cannot delete your own account from here.']);
        }

        $username = $user->username;

        // Invalidate all sessions immediately
        DB::table('sessions')->where('user_id', $user->id)->delete();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'USER_DELETED',
            'target_type' => 'user',
            'target_public_id' => $user->public_id,
            'safe_metadata' => ['username' => $username],
        ]);

        $user->delete();

        return back()->with('success', "User @{$username} has been permanently deleted from the database.");
    }

    public function auditLogs()
    {
        $adminStealth = \App\Models\AppSetting::isTrue('admin_stealth_mode');
        $logs = AdminAuditLog::with('admin')->orderBy('created_at', 'desc')->paginate(30);

        return Inertia::render('Admin/AuditLogs', [
            'logs' => $logs->through(fn($l) => [
                'id' => $l->id,
                'action' => $l->action,
                'target_type' => $l->target_type,
                'target_public_id' => $l->target_public_id,
                'safe_metadata' => $l->safe_metadata,
                'admin' => $adminStealth ? '[CORE_OPERATOR]' : ($l->admin ? $l->admin->username : 'system'),
                'created_at' => $l->created_at->format('Y-m-d H:i:s'),
            ]),
        ]);
    }

    public function securityEvents()
    {
        $events = SecurityEvent::orderBy('created_at', 'desc')->paginate(30);

        return Inertia::render('Admin/SecurityEvents', [
            'events' => $events,
        ]);
    }

    public function systemHealth()
    {
        $dbStatus = 'OK';
        try {
            DB::connection()->getPdo();
        } catch (\Throwable $e) {
            $dbStatus = 'FAILED';
        }

        return Inertia::render('Admin/SystemHealth', [
            'health' => [
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'database_status' => $dbStatus,
                'environment' => app()->environment(),
                'server_time' => now()->toIso8601String(),
                'active_sessions' => DB::table('sessions')->count(),
                'emergency_lockdown' => \App\Models\AppSetting::isTrue('emergency_lockdown'),
                'admin_stealth_mode' => \App\Models\AppSetting::isTrue('admin_stealth_mode'),
            ],
        ]);
    }

    public function ghostAi(Request $request)
    {
        $presenceTracker = app(\App\Services\Ghost\PresenceTracker::class);
        $aiService = app(\App\Services\Ghost\GhostAIService::class);

        $health = $aiService->checkHealth();
        $presence = $presenceTracker->getPresenceBreakdown();

        $pendingCommands = 0;
        $pendingAuto = 0;
        $failedGhostJobs = 0;

        try {
            $pendingCommands = DB::table('jobs')->where('queue', 'ghost-commands')->count();
            $pendingAuto = DB::table('jobs')->where('queue', 'ghost-auto')->count();
            $failedGhostJobs = DB::table('failed_jobs')->where('queue', 'like', 'ghost%')->count();
        } catch (\Throwable) {}

        return Inertia::render('Admin/GhostAI', [
            'env_master_enabled' => filter_var(env('GHOST_AI_ENABLED', false), FILTER_VALIDATE_BOOLEAN),
            'effective_enabled' => \App\Services\Ghost\GhostAIService::isGloballyEnabled(),
            'settings' => [
                'ghost_ai_enabled' => \App\Models\AppSetting::isTrue('ghost_ai_enabled'),
                'ghost_ai_endpoint' => \App\Models\AppSetting::get('ghost_ai_endpoint', 'http://127.0.0.1:8081/v1/chat/completions'),
                'ghost_auto_reply_enabled' => \App\Models\AppSetting::isTrue('ghost_auto_reply_enabled'),
                'ghost_command_reply_enabled' => \App\Models\AppSetting::isTrue('ghost_command_reply_enabled'),
                'ghost_auto_reply_max_active_users' => (int) \App\Models\AppSetting::get('ghost_auto_reply_max_active_users', 3),
                'ghost_auto_reply_cooldown_seconds' => (int) \App\Models\AppSetting::get('ghost_auto_reply_cooldown_seconds', 300),
                'ghost_max_output_tokens' => (int) \App\Models\AppSetting::get('ghost_max_output_tokens', 32),
                'ghost_request_timeout' => (int) \App\Models\AppSetting::get('ghost_request_timeout', 120),
            ],
            'presence' => $presence,
            'health' => $health,
            'queue' => [
                'connection' => config('queue.default'),
                'pending_commands' => $pendingCommands,
                'pending_auto' => $pendingAuto,
                'total_pending' => $pendingCommands + $pendingAuto,
                'failed_count' => $failedGhostJobs,
                'is_locked' => \Illuminate\Support\Facades\Cache::has('ghost_ai_inference_lock'),
            ],
            'last_success' => \Illuminate\Support\Facades\Cache::get('ghost_ai:last_success'),
            'last_error' => \Illuminate\Support\Facades\Cache::get('ghost_ai:last_error'),
            'recentLogs' => AdminAuditLog::with('admin')
                ->where('target_type', 'ghost_ai')
                ->orWhere('action', 'like', 'GHOST_%')
                ->orderBy('created_at', 'desc')
                ->take(8)
                ->get(),
        ]);
    }

    public function updateGhostSettings(Request $request)
    {
        $data = $request->validate([
            'ghost_ai_enabled' => ['required', 'boolean'],
            'ghost_ai_endpoint' => ['required', 'string', 'url'],
            'ghost_auto_reply_enabled' => ['required', 'boolean'],
            'ghost_command_reply_enabled' => ['required', 'boolean'],
            'ghost_auto_reply_max_active_users' => ['required', 'integer', 'min:0', 'max:50'],
            'ghost_auto_reply_cooldown_seconds' => ['required', 'integer', 'min:10', 'max:3600'],
            'ghost_max_output_tokens' => ['required', 'integer', 'min:8', 'max:256'],
            'ghost_request_timeout' => ['required', 'integer', 'min:10', 'max:600'],
        ]);

        foreach ($data as $key => $value) {
            \App\Models\AppSetting::set($key, is_bool($value) ? ($value ? 'true' : 'false') : (string) $value);
        }

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'GHOST_SETTINGS_UPDATED',
            'target_type' => 'ghost_ai',
            'safe_metadata' => $data,
        ]);

        return back()->with('success', 'Ghost AI settings saved successfully.');
    }

    public function cancelGhostQueue(Request $request)
    {
        $deleted = 0;
        try {
            $deleted = DB::table('jobs')->whereIn('queue', ['ghost-commands', 'ghost-auto'])->delete();
        } catch (\Throwable) {}

        \Illuminate\Support\Facades\Cache::forget('ghost_ai_inference_lock');

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'GHOST_QUEUE_CANCELLED',
            'target_type' => 'ghost_ai',
            'safe_metadata' => ['cancelled_jobs' => $deleted],
        ]);

        return back()->with('success', "Cancelled {$deleted} pending Ghost AI jobs and released inference lock.");
    }

    public function testGhostConnection(Request $request)
    {
        $aiService = app(\App\Services\Ghost\GhostAIService::class);
        $health = $aiService->checkHealth();

        AdminAuditLog::create([
            'admin_id' => $request->user()->id,
            'action' => 'GHOST_HEALTH_CHECK_TESTED',
            'target_type' => 'ghost_ai',
            'safe_metadata' => $health,
        ]);

        if ($health['status'] === 'ONLINE') {
            return back()->with('success', "AI Server is reachable! Response latency: {$health['latency_ms']}ms.");
        }

        return back()->withErrors(['endpoint' => "AI Server ping failed: " . ($health['error'] ?? 'Unreachable')]);
    }
}
