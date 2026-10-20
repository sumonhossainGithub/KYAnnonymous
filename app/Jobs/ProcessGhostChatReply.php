<?php

namespace App\Jobs;

use App\Models\AppSetting;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\User;
use App\Services\Ghost\GhostAIService;
use App\Services\Ghost\PresenceTracker;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ProcessGhostChatReply implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 2;

    /**
     * The number of seconds the job can run before timing out.
     * Hierarchy: HTTP timeout (360s) < Worker timeout (400s) < Queue retry_after (450s) < Lock TTL (500s).
     */
    public int $timeout = 400;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $chatRoomId,
        public ?int $parentMessageId,
        public string $prompt,
        public bool $isExplicitCommand,
        public ?int $triggerMessageId = null
    ) {
        // Set queue based on priority: explicit commands take precedence over automatic replies
        $this->onQueue($isExplicitCommand ? 'ghost-commands' : 'ghost-auto');
    }

    /**
     * Execute the job.
     */
    public function handle(GhostAIService $aiService, PresenceTracker $presenceTracker): void
    {
        // 1. Master Enable Check (both .env master switch and database toggle)
        if (!GhostAIService::isGloballyEnabled()) {
            Log::info('Ghost AI Job skipped: Ghost AI is disabled globally (master switch or database).');
            return;
        }

        if ($this->isExplicitCommand && !AppSetting::isTrue('ghost_command_reply_enabled')) {
            Log::info('Ghost AI Job skipped: Command replies disabled.');
            return;
        }

        if (!$this->isExplicitCommand && !AppSetting::isTrue('ghost_auto_reply_enabled')) {
            Log::info('Ghost AI Job skipped: Auto replies disabled.');
            return;
        }

        $room = ChatRoom::where('id', $this->chatRoomId)->where('is_active', true)->first();
        if (!$room) {
            return;
        }

        // 2. Strict Concurrency Lock: physical concurrency MUST be <= 1
        // We acquire a 500-second lock (> 400s worker timeout) while the slow local model runs inference
        $lock = Cache::lock('ghost_ai_inference_lock', 500);

        if (!$lock->get()) {
            if ($this->isExplicitCommand && $this->attempts() < 2) {
                // For explicit commands, release to retry once after other inference finishes
                $this->release(15);
                return;
            }

            // For automatic chatter, drop to avoid queue pileup on mobile CPU
            Log::info('Ghost AI Job dropped: inference engine is currently busy with another request.');
            return;
        }

        try {
            // 3. Stage 2 Presence Check (Immediately before inference begins)
            if (!$this->isExplicitCommand) {
                $maxUsers = (int) AppSetting::get('ghost_auto_reply_max_active_users', 3);
                $activeCount = $presenceTracker->getActiveUserCount();

                if ($activeCount > $maxUsers) {
                    Log::info("Ghost AI Auto-Reply cancelled before inference: active users ({$activeCount}) exceeds limit ({$maxUsers}).");
                    return;
                }
            }

            // 4. Build Conversation Context
            $context = $this->buildConversationContext();

            // 5. Run Local AI Inference
            $maxTokens = (int) AppSetting::get('ghost_max_output_tokens', 32);
            $reply = $aiService->generateReply($context, $maxTokens);

            if (!$reply || trim($reply) === '') {
                Log::info('Ghost AI generated empty response; skipping message creation.');
                return;
            }

            // 6. Emergency Stop Verification (Immediately before publishing)
            if (!GhostAIService::isGloballyEnabled()) {
                Log::info('Ghost AI Reply discarded: Ghost AI was disabled while inference was in flight.');
                return;
            }

            if ($this->isExplicitCommand && !AppSetting::isTrue('ghost_command_reply_enabled')) {
                Log::info('Ghost AI Command Reply discarded: Command replies were disabled while inference was in flight.');
                return;
            }

            if (!$this->isExplicitCommand && !AppSetting::isTrue('ghost_auto_reply_enabled')) {
                Log::info('Ghost AI Auto Reply discarded: Auto replies were disabled while inference was in flight.');
                return;
            }

            // 7. Stage 3 Presence Check (Immediately before publishing)
            if (!$this->isExplicitCommand) {
                $maxUsers = (int) AppSetting::get('ghost_auto_reply_max_active_users', 3);
                $activeCount = $presenceTracker->getActiveUserCount();

                if ($activeCount > $maxUsers) {
                    Log::info("Ghost AI Auto-Reply suppressed before publishing: active users ({$activeCount}) rose above limit ({$maxUsers}).");
                    return;
                }
            }

            // 7. Find or Ensure Ghost User Account
            $ghostUser = User::where('username_normalized', 'ghost_ai')->first();
            if (!$ghostUser) {
                Log::error('Ghost AI user account not found in database.');
                return;
            }

            // 8. Publish Ghost Chat Message
            $savedMessage = ChatMessage::create([
                'chat_room_id' => $room->id,
                'parent_id' => $this->parentMessageId,
                'user_id' => $ghostUser->id,
                'message' => $reply,
                'is_ghost' => false,
                'is_guest' => false,
                'is_ephemeral' => false,
                'alias_name' => null,
            ]);

            // 9. Update Room Auto-Reply Cooldown if auto-reply
            if (!$this->isExplicitCommand) {
                $cooldown = (int) AppSetting::get('ghost_auto_reply_cooldown_seconds', 300);
                Cache::put("ghost_ai:last_auto_reply:{$room->id}", time(), $cooldown);
            }

            Log::info("Ghost AI published reply (ID: {$savedMessage->public_id}) in room {$room->slug}.");
        } finally {
            $lock->release();
        }
    }

    /**
     * Build recent conversational context for the model.
     */
    protected function buildConversationContext(): array
    {
        $context = [];

        // Fetch last 4 messages in this room to provide immediate conversational continuity
        $recentMessages = ChatMessage::where('chat_room_id', $this->chatRoomId)
            ->whereNull('parent_id')
            ->orderBy('id', 'desc')
            ->take(4)
            ->get()
            ->reverse();

        $ghostUserId = User::where('username_normalized', 'ghost_ai')->value('id');

        foreach ($recentMessages as $msg) {
            if (!empty($msg->message)) {
                $role = ($msg->user_id === $ghostUserId) ? 'assistant' : 'user';
                $context[] = [
                    'role' => $role,
                    'content' => $msg->message,
                ];
            }
        }

        // If context is empty or trigger prompt was explicitly supplied, append prompt
        if (empty($context) || $this->isExplicitCommand) {
            $context[] = [
                'role' => 'user',
                'content' => $this->prompt,
            ];
        }

        return $context;
    }
}
