<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommunityController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

// Public Home Chat, Feed & Info
Route::get('/', [CommunityController::class, 'homeChat'])->name('home');
Route::get('/feed', [PostController::class, 'feed'])->name('feed');
Route::get('/search', [CommunityController::class, 'search'])->name('community.search');
Route::get('/notices', [CommunityController::class, 'notices'])->name('community.notices');
Route::get('/privacy', [CommunityController::class, 'privacy'])->name('info.privacy');
Route::get('/rules', [CommunityController::class, 'rules'])->name('info.rules');
Route::get('/chat', [CommunityController::class, 'chatIndex'])->name('chat.index');
Route::get('/chat/{slug}/messages', [CommunityController::class, 'chatMessages'])->middleware('not_banned');
Route::get('/chat/{slug}', [CommunityController::class, 'chatRoom'])->name('chat.room')->middleware('not_banned');
Route::post('/chat/{slug}/message', [CommunityController::class, 'sendChatMessage'])->name('chat.message.send')->middleware('not_banned');
Route::post('/chat/{slug}/unlock', [CommunityController::class, 'unlockChatRoom'])->name('chat.room.unlock')->middleware('not_banned');

// Guest Authentication Routes
Route::middleware('guest')->group(function () {
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register']);
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/recovery', [AuthController::class, 'showRecovery'])->name('recovery');
    Route::post('/recovery', [AuthController::class, 'recoverPassword']);
});

// Authenticated Routes
Route::middleware(['auth', 'not_banned'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/recovery-code', [AuthController::class, 'showRecoveryDisplay'])->name('recovery.display');

    // User Profile & Avatar Customization
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::post('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar.update');
    Route::delete('/profile/avatar', [ProfileController::class, 'removeAvatar'])->name('profile.avatar.remove');

    // Posts & Votes
    Route::get('/posts/create', [PostController::class, 'showCreate'])->name('posts.create');
    Route::post('/posts', [PostController::class, 'store'])->name('posts.store');
    Route::get('/posts/{public_id}', [PostController::class, 'show'])->name('posts.show');
    Route::post('/posts/{public_id}/vote', [PostController::class, 'vote'])->name('posts.vote');
    Route::post('/posts/{public_id}/comments', [PostController::class, 'addComment'])->name('posts.comments.store');

    // Room Creation (requires active account)
    Route::post('/chat', [CommunityController::class, 'createChatRoom'])->name('chat.store');

    // Reporting
    Route::post('/reports', [CommunityController::class, 'submitReport'])->name('reports.store');

    // Admin Group
    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/settings', [\App\Http\Controllers\SiteSettingsController::class, 'index'])->name('admin.settings');
        Route::post('/settings', [\App\Http\Controllers\SiteSettingsController::class, 'update']);
        Route::post('/settings/rooms', [\App\Http\Controllers\SiteSettingsController::class, 'saveRoom']);
        Route::post('/settings/rooms/{publicId}', [\App\Http\Controllers\SiteSettingsController::class, 'saveRoom']);
        Route::delete('/chat/{slug}/messages/{publicId}', [CommunityController::class, 'deleteChatMessage']);
        Route::get('/dashboard', [AdminController::class, 'dashboard'])->name('admin.dashboard');
        Route::get('/users', [AdminController::class, 'users'])->name('admin.users');
        Route::post('/users/{public_id}/toggle-ban', [AdminController::class, 'toggleBanUser'])->name('admin.users.toggle_ban');
        Route::post('/users/{public_id}/terminate-sessions', [AdminController::class, 'terminateUserSessions'])->name('admin.users.terminate_sessions');
        Route::delete('/users/{public_id}', [AdminController::class, 'deleteUser'])->name('admin.users.delete');
        
        // Posts Moderation
        Route::get('/posts', [AdminController::class, 'posts'])->name('admin.posts');
        Route::post('/posts/{public_id}/toggle-status', [AdminController::class, 'togglePostStatus'])->name('admin.posts.toggle_status');
        Route::post('/posts/{public_id}/toggle-lock', [AdminController::class, 'togglePostLock'])->name('admin.posts.toggle_lock');

        // Chat Rooms Moderation
        Route::get('/chat-rooms', [AdminController::class, 'chatRooms'])->name('admin.chat_rooms');
        Route::post('/chat-rooms/{public_id}/toggle-status', [AdminController::class, 'toggleChatRoomStatus'])->name('admin.chat_rooms.toggle_status');
        Route::post('/chat-rooms/{public_id}/purge', [AdminController::class, 'purgeChatRoomMessages'])->name('admin.chat_rooms.purge');

        // Stealth & Anti-Trace Console
        Route::get('/stealth', [AdminController::class, 'stealthConsole'])->name('admin.stealth');
        Route::post('/stealth/toggle-stealth-mode', [AdminController::class, 'toggleStealthMode'])->name('admin.stealth.toggle_mode');
        Route::post('/stealth/toggle-lockdown', [AdminController::class, 'toggleEmergencyLockdown'])->name('admin.stealth.toggle_lockdown');
        Route::post('/stealth/purge-logs', [AdminController::class, 'purgeLogs'])->name('admin.stealth.purge_logs');
        Route::post('/stealth/terminate-sessions', [AdminController::class, 'terminateAllSessions'])->name('admin.stealth.terminate_sessions');

        Route::get('/reports', [AdminController::class, 'reports'])->name('admin.reports');
        Route::post('/reports/{public_id}/resolve', [AdminController::class, 'resolveReport'])->name('admin.reports.resolve');
        Route::get('/organizations', [AdminController::class, 'organizations'])->name('admin.organizations');
        Route::post('/organizations', [AdminController::class, 'createOrganization'])->name('admin.organizations.store');
        Route::get('/notices', [AdminController::class, 'notices'])->name('admin.notices');
        Route::post('/notices', [AdminController::class, 'createNotice'])->name('admin.notices.store');
        Route::get('/audit-logs', [AdminController::class, 'auditLogs'])->name('admin.audit_logs');
        Route::get('/security-events', [AdminController::class, 'securityEvents'])->name('admin.security_events');
        Route::get('/system-health', [AdminController::class, 'systemHealth'])->name('admin.system_health');
    });
});
