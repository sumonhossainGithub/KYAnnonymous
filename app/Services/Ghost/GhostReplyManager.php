<?php

namespace App\Services\Ghost;

use App\Jobs\ProcessGhostChatReply;
use App\Models\AppSetting;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class GhostReplyManager
{
    public function __construct(
        protected PresenceTracker $presenceTracker,
        protected GhostAIService $aiService
    ) {}

    /**
     * Inspect a newly saved chat message and dispatch an AI reply if eligible.
     *
     * @param ChatMessage $message
     * @param ChatRoom $room
     * @param User|null $user
     * @return bool Whether a reply job was queued
     */
    public function handleNewMessage(ChatMessage $message, ChatRoom $room, ?User $user): bool
    {
        // 1. Check if Ghost AI is enabled globally (both .env master switch and database toggle)
        if (!GhostAIService::isGloballyEnabled()) {
            return false;
        }

        // 2. Prevent Ghost from responding to its own messages
        $ghostUserId = User::where('username_normalized', 'ghost_ai')->value('id');
        if ($ghostUserId && $message->user_id === $ghostUserId) {
            return false;
        }

        // 3. Skip empty messages or messages without text
        $messageText = trim((string) $message->message);
        if ($messageText === '') {
            return false;
        }

        // 4. Parse for /ai slash command
        $commandInfo = CommandParser::parse($messageText);

        if ($commandInfo !== null) {
            // EXPLICIT /ai COMMAND
            return $this->handleExplicitCommand($message, $room, $user, $commandInfo['prompt']);
        } else {
            // NORMAL CHAT MESSAGE
            return $this->handleNormalMessage($message, $room, $user);
        }
    }

    /**
     * Handle explicit /ai commands.
     * Mode A and Mode B: Valid /ai commands are ALWAYS eligible, regardless of active user count.
     */
    protected function handleExplicitCommand(ChatMessage $message, ChatRoom $room, ?User $user, string $prompt): bool
    {
        if (!AppSetting::isTrue('ghost_command_reply_enabled')) {
            return false;
        }

        // Rate limiting for /ai command: max 10 requests per 5 minutes per user/session
        $callerKey = $user ? "u_{$user->id}" : 'g_' . substr((string) session()->getId(), 0, 16);
        $limiterKey = 'ghost_ai_cmd:' . $callerKey;

        if (RateLimiter::tooManyAttempts($limiterKey, 10)) {
            Log::info("Ghost AI /ai command rate limit tripped by {$callerKey}.");
            return false;
        }
        RateLimiter::hit($limiterKey, 300);

        // Check if pending command jobs are overloaded (max bounded commands in queue)
        $maxPending = (int) config('ghost.max_pending_commands', 5);
        $pendingCommands = DB::table('jobs')->where('queue', 'ghost-commands')->count();
        if ($pendingCommands >= $maxPending) {
            Log::warning('Ghost AI command queue is full; dropping request to protect device.');
            return false;
        }

        // Dispatch High-Priority command job
        ProcessGhostChatReply::dispatch(
            chatRoomId: $room->id,
            parentMessageId: $message->parent_id ?: $message->id,
            prompt: $prompt,
            isExplicitCommand: true,
            triggerMessageId: $message->id
        );

        Log::info("Ghost AI /ai command queued for room {$room->slug} by {$callerKey}.");
        return true;
    }

    /**
     * Handle normal chat messages for automatic replies.
     * Mode A (0 to 3 active users): Automatic reply eligible.
     * Mode B (4 or more active users): STRICTLY NO automatic reply.
     */
    protected function handleNormalMessage(ChatMessage $message, ChatRoom $room, ?User $user): bool
    {
        if (!AppSetting::isTrue('ghost_auto_reply_enabled')) {
            return false;
        }

        // Stage 1 Presence Check: Active user count
        $maxUsers = (int) AppSetting::get('ghost_auto_reply_max_active_users', config('ghost.max_active_users', 3));
        $activeUserCount = $this->presenceTracker->getActiveUserCount();

        // MODE B RULE: When active users >= 4, Ghost MUST completely stop unsolicited auto-replies
        if ($activeUserCount > $maxUsers) {
            Log::debug("Ghost AI auto-reply skipped: Active users ({$activeUserCount}) exceeds threshold ({$maxUsers}).");
            return false;
        }

        // Check Room Cooldown (default 300 seconds)
        $cooldownKey = "ghost_ai:last_auto_reply:{$room->id}";
        if (Cache::has($cooldownKey)) {
            Log::debug("Ghost AI auto-reply skipped: Room {$room->slug} is in cooldown.");
            return false;
        }

        // Concurrency protection: if inference lock is currently held, skip auto-replies
        if (Cache::has('ghost_ai_inference_lock')) {
            Log::debug('Ghost AI auto-reply skipped: inference engine currently busy.');
            return false;
        }

        // Prevent queue pileup: if any ghost-auto job is already pending, don't queue another
        $maxPendingAuto = (int) config('ghost.max_pending_auto', 1);
        $pendingAutoJobs = DB::table('jobs')->where('queue', 'ghost-auto')->count();
        if ($pendingAutoJobs >= $maxPendingAuto) {
            Log::debug('Ghost AI auto-reply skipped: auto queue capacity reached.');
            return false;
        }

        // Dispatch Low-Priority auto-reply job
        ProcessGhostChatReply::dispatch(
            chatRoomId: $room->id,
            parentMessageId: $message->parent_id,
            prompt: trim((string) $message->message),
            isExplicitCommand: false,
            triggerMessageId: $message->id
        );

        Log::info("Ghost AI auto-reply queued for room {$room->slug} (Active users: {$activeUserCount}).");
        return true;
    }
}
