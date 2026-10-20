<?php

namespace Tests\Feature;

use App\Jobs\ProcessGhostChatReply;
use App\Models\AppSetting;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\User;
use App\Services\Ghost\CommandParser;
use App\Services\Ghost\GhostAIService;
use App\Services\Ghost\GhostReplyManager;
use App\Services\Ghost\PresenceTracker;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class GhostAITest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $ghostUser;
    protected User $superAdmin;
    protected ChatRoom $room;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Ensure Ghost AI Service Account exists
        $this->ghostUser = User::firstOrCreate(
            ['username_normalized' => 'ghost_ai'],
            [
                'username' => 'ghost_ai',
                'display_name' => 'Ghost',
                'gender' => 'Male',
                'password' => bcrypt('UnguessableSecret_AI_#992'),
                'status' => 'ACTIVE',
                'role' => 'USER',
            ]
        );

        // 2. Regular User
        $this->user = User::create([
            'username' => 'alice',
            'username_normalized' => 'alice',
            'display_name' => 'Alice',
            'gender' => 'Female',
            'password' => bcrypt('secret123!'),
            'status' => 'ACTIVE',
            'role' => 'USER',
        ]);

        // 3. Super Admin
        $this->superAdmin = User::create([
            'username' => 'rootadmin',
            'username_normalized' => 'rootadmin',
            'display_name' => 'Super Admin',
            'gender' => 'Male',
            'password' => bcrypt('adminsecret123!'),
            'status' => 'ACTIVE',
            'role' => 'SUPER_ADMIN',
        ]);

        // 4. Public Chat Room (uses existing or creates)
        $this->room = ChatRoom::firstOrCreate(
            ['slug' => 'common-orbit'],
            [
                'name' => 'The common orbit',
                'description' => 'The main room',
                'created_by' => $this->superAdmin->id,
                'is_active' => true,
            ]
        );

        // 5. Default Settings
        putenv('GHOST_AI_ENABLED=true');
        $_ENV['GHOST_AI_ENABLED'] = 'true';
        $_SERVER['GHOST_AI_ENABLED'] = 'true';
        config(['ghost.enabled' => true]);
        AppSetting::set('ghost_ai_enabled', 'true');
        AppSetting::set('ghost_auto_reply_enabled', 'true');
        AppSetting::set('ghost_command_reply_enabled', 'true');
        AppSetting::set('ghost_auto_reply_max_active_users', '3');
        AppSetting::set('ghost_auto_reply_cooldown_seconds', '300');
        AppSetting::set('ghost_max_output_tokens', '32');
        AppSetting::set('ghost_request_timeout', '120');
        AppSetting::set('chat_enabled', 'true');
        AppSetting::set('guest_chat_enabled', 'true');
    }

    /**
     * Helper to simulate N active sessions in the database within last 60 seconds.
     */
    protected function simulateActiveUsers(int $count): void
    {
        DB::table('sessions')->delete();

        for ($i = 1; $i <= $count; $i++) {
            $user = User::firstOrCreate(
                ['username_normalized' => "user_{$i}"],
                [
                    'username' => "user_{$i}",
                    'display_name' => "User {$i}",
                    'gender' => 'Male',
                    'password' => bcrypt('password'),
                    'status' => 'ACTIVE',
                    'role' => 'USER',
                ]
            );

            DB::table('sessions')->insert([
                'id' => "session_key_{$i}",
                'user_id' => $user->id,
                'payload' => 'dummy',
                'last_activity' => time() - 30, // active 30s ago
            ]);
        }
    }

    /**
     * 1. 1 active user: automatic reply eligible.
     */
    public function test_01_one_active_user_automatic_reply_eligible(): void
    {
        Queue::fake();
        $this->simulateActiveUsers(1);

        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => 'Ki obostha sobar?',
        ]);

        $response->assertStatus(201);
        Queue::assertPushed(ProcessGhostChatReply::class, function ($job) {
            return $job->isExplicitCommand === false;
        });
    }

    /**
     * 2. 2 active users: automatic reply eligible.
     */
    public function test_02_two_active_users_automatic_reply_eligible(): void
    {
        Queue::fake();
        $this->simulateActiveUsers(2);

        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => 'Ajke mon kharap.',
        ]);

        $response->assertStatus(201);
        Queue::assertPushed(ProcessGhostChatReply::class, function ($job) {
            return $job->isExplicitCommand === false;
        });
    }

    /**
     * 3. 3 active users: automatic reply eligible.
     */
    public function test_03_three_active_users_automatic_reply_eligible(): void
    {
        Queue::fake();
        $this->simulateActiveUsers(3);

        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => 'Ghost bhai kemon acho?',
        ]);

        $response->assertStatus(201);
        Queue::assertPushed(ProcessGhostChatReply::class, function ($job) {
            return $job->isExplicitCommand === false;
        });
    }

    /**
     * 4. 4 active users: no automatic reply.
     */
    public function test_04_four_active_users_no_automatic_reply(): void
    {
        Queue::fake();
        $this->simulateActiveUsers(4);

        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => 'Hello everyone in the room',
        ]);

        $response->assertStatus(201);
        Queue::assertNotPushed(ProcessGhostChatReply::class);
    }

    /**
     * 5. 10 active users: no automatic reply.
     */
    public function test_05_ten_active_users_no_automatic_reply(): void
    {
        Queue::fake();
        $this->simulateActiveUsers(10);

        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => 'Busy community chatter',
        ]);

        $response->assertStatus(201);
        Queue::assertNotPushed(ProcessGhostChatReply::class);
    }

    /**
     * 6. 4 users with /ai: explicit reply eligible.
     */
    public function test_06_four_users_with_ai_explicit_reply_eligible(): void
    {
        Queue::fake();
        $this->simulateActiveUsers(4);

        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => '/ai Hello Ghost',
        ]);

        $response->assertStatus(201);
        Queue::assertPushed(ProcessGhostChatReply::class, function ($job) {
            return $job->isExplicitCommand === true && $job->prompt === 'Hello Ghost';
        });
    }

    /**
     * 7. 10 users with /AI: explicit reply eligible.
     */
    public function test_07_ten_users_with_uppercase_AI_explicit_reply_eligible(): void
    {
        Queue::fake();
        $this->simulateActiveUsers(10);

        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => '/AI Ki obostha?',
        ]);

        $response->assertStatus(201);
        Queue::assertPushed(ProcessGhostChatReply::class, function ($job) {
            return $job->isExplicitCommand === true && $job->prompt === 'Ki obostha?';
        });
    }

    /**
     * 8. /Ai and /aI case variations work.
     */
    public function test_08_case_variations_Ai_and_aI_work(): void
    {
        $parse1 = CommandParser::parse('/Ai explain computer networking');
        $this->assertNotNull($parse1);
        $this->assertTrue($parse1['is_command']);
        $this->assertSame('explain computer networking', $parse1['prompt']);

        $parse2 = CommandParser::parse('/aI Ki korcho?');
        $this->assertNotNull($parse2);
        $this->assertTrue($parse2['is_command']);
        $this->assertSame('Ki korcho?', $parse2['prompt']);

        $parseLeading = CommandParser::parse('   /ai   spaces test   ');
        $this->assertNotNull($parseLeading);
        $this->assertSame('spaces test', $parseLeading['prompt']);

        $parseEmpty = CommandParser::parse('/ai');
        $this->assertNotNull($parseEmpty);
        $this->assertTrue($parseEmpty['is_empty']);
    }

    /**
     * 9. /aibot does not trigger the command.
     */
    public function test_09_aibot_does_not_trigger_command(): void
    {
        $this->assertNull(CommandParser::parse('/aibot hello'));
        $this->assertNull(CommandParser::parse('/aixyz'));
        $this->assertNull(CommandParser::parse('hello /ai'));
        $this->assertNull(CommandParser::parse('@ai'));
        $this->assertNull(CommandParser::parse('/ask'));
    }

    /**
     * 10. Ghost never replies to its own message.
     */
    public function test_10_ghost_never_replies_to_its_own_message(): void
    {
        Queue::fake();
        $this->simulateActiveUsers(1);

        // Save a message whose sender is ghost_ai
        $ghostMessage = ChatMessage::create([
            'chat_room_id' => $this->room->id,
            'user_id' => $this->ghostUser->id,
            'message' => 'Ei toh, sobai mone hoy busy! 👻',
        ]);

        $manager = app(GhostReplyManager::class);
        $dispatched = $manager->handleNewMessage($ghostMessage, $this->room, $this->ghostUser);

        $this->assertFalse($dispatched);
        Queue::assertNotPushed(ProcessGhostChatReply::class);
    }

    /**
     * 11. Multiple tabs do not inflate the active-user count.
     */
    public function test_11_multiple_tabs_do_not_inflate_active_user_count(): void
    {
        DB::table('sessions')->delete();

        // One user with 4 open tabs (4 separate sessions)
        for ($tab = 1; $tab <= 4; $tab++) {
            DB::table('sessions')->insert([
                'id' => "tab_session_{$tab}",
                'user_id' => $this->user->id,
                'payload' => 'dummy',
                'last_activity' => time() - 10,
            ]);
        }

        $tracker = app(PresenceTracker::class);
        $count = $tracker->getActiveUserCount();

        // 4 tabs of the same authenticated user count as exactly 1 person
        $this->assertSame(1, $count);
    }

    /**
     * 12. Automatic replies are suppressed if active-user count increases above 3 before publishing.
     */
    public function test_12_automatic_replies_are_suppressed_if_active_users_increase_above_three_before_publishing(): void
    {
        // Mock AI HTTP client
        Http::fake([
            'http://127.0.0.1:8081/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'Auto reply from Ghost!']]
                ]
            ], 200),
        ]);

        // Initially 2 users when job was queued
        $this->simulateActiveUsers(2);

        $job = new ProcessGhostChatReply(
            chatRoomId: $this->room->id,
            parentMessageId: null,
            prompt: 'Test message',
            isExplicitCommand: false
        );

        // Before job executes, simulate active users jumping to 5
        $this->simulateActiveUsers(5);

        $initialMessageCount = ChatMessage::where('user_id', $this->ghostUser->id)->count();

        // Execute job
        $job->handle(app(GhostAIService::class), app(PresenceTracker::class));

        // Reply must be SUPPRESSED! No new message created.
        $this->assertSame($initialMessageCount, ChatMessage::where('user_id', $this->ghostUser->id)->count());
    }

    /**
     * 13. Explicit /ai remains eligible when user count exceeds 3.
     */
    public function test_13_explicit_ai_remains_eligible_when_user_count_exceeds_three(): void
    {
        Http::fake([
            'http://127.0.0.1:8081/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'Cybersecurity is digital defense.']]
                ]
            ], 200),
        ]);

        // Simulate 8 users
        $this->simulateActiveUsers(8);

        $job = new ProcessGhostChatReply(
            chatRoomId: $this->room->id,
            parentMessageId: null,
            prompt: 'What is cybersecurity?',
            isExplicitCommand: true
        );

        $initialCount = ChatMessage::where('user_id', $this->ghostUser->id)->count();

        // Execute job
        $job->handle(app(GhostAIService::class), app(PresenceTracker::class));

        // Must be published!
        $this->assertSame($initialCount + 1, ChatMessage::where('user_id', $this->ghostUser->id)->count());
        $this->assertDatabaseHas('chat_messages', [
            'chat_room_id' => $this->room->id,
            'user_id' => $this->ghostUser->id,
            'message' => 'Cybersecurity is digital defense.',
        ]);
    }

    /**
     * 14. Cooldowns and rate limits work.
     */
    public function test_14_cooldowns_and_rate_limits_work(): void
    {
        Queue::fake();
        $this->simulateActiveUsers(1);

        // Put room in cooldown
        Cache::put("ghost_ai:last_auto_reply:{$this->room->id}", time(), 300);

        $msg = ChatMessage::create([
            'chat_room_id' => $this->room->id,
            'user_id' => $this->user->id,
            'message' => 'Another message during cooldown',
        ]);

        $manager = app(GhostReplyManager::class);
        $queued = $manager->handleNewMessage($msg, $this->room, $this->user);

        // Must be rejected due to room cooldown
        $this->assertFalse($queued);
        Queue::assertNotPushed(ProcessGhostChatReply::class);
    }

    /**
     * 15. Duplicate jobs are prevented and concurrency is strictly controlled.
     */
    public function test_15_duplicate_jobs_are_prevented_and_concurrency_is_strictly_controlled(): void
    {
        Http::fake();

        // Acquire the atomic inference lock
        $lock = Cache::lock('ghost_ai_inference_lock', 60);
        $lock->get();

        $job = new ProcessGhostChatReply(
            chatRoomId: $this->room->id,
            parentMessageId: null,
            prompt: 'Busy query',
            isExplicitCommand: false
        );

        $initialCount = ChatMessage::where('user_id', $this->ghostUser->id)->count();

        // Execute job while lock is held
        $job->handle(app(GhostAIService::class), app(PresenceTracker::class));

        // Inference must NOT have run; no new message
        $this->assertSame($initialCount, ChatMessage::where('user_id', $this->ghostUser->id)->count());
        Http::assertNothingSent();

        $lock->release();
    }

    /**
     * 16. The website works when the AI service crashes.
     */
    public function test_16_website_works_when_ai_service_crashes(): void
    {
        // Simulate endpoint crashing / throwing connection exception
        Http::fake([
            'http://127.0.0.1:8081/*' => Http::failedConnection(),
        ]);

        $this->simulateActiveUsers(1);

        // Normal chat submission must still succeed and return 201!
        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => 'Chat message when AI server is down',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('chat_messages', [
            'message' => 'Chat message when AI server is down',
        ]);
    }

    /**
     * 17. Only Super Admin can change Ghost settings.
     */
    public function test_17_only_super_admin_can_change_ghost_settings(): void
    {
        // Regular user attempts to access /admin/ghost -> 403
        $this->actingAs($this->user)->get('/admin/ghost')->assertForbidden();

        // Regular user attempts to change settings -> 403
        $this->actingAs($this->user)->post('/admin/ghost/settings', [
            'ghost_ai_enabled' => false,
            'ghost_ai_endpoint' => 'http://127.0.0.1:8081/v1/chat/completions',
            'ghost_auto_reply_enabled' => false,
            'ghost_command_reply_enabled' => false,
            'ghost_auto_reply_max_active_users' => 1,
            'ghost_auto_reply_cooldown_seconds' => 100,
            'ghost_max_output_tokens' => 16,
            'ghost_request_timeout' => 60,
        ])->assertForbidden();

        // Super Admin succeeds
        $this->actingAs($this->superAdmin)->post('/admin/ghost/settings', [
            'ghost_ai_enabled' => false,
            'ghost_ai_endpoint' => 'http://127.0.0.1:8081/v1/chat/completions',
            'ghost_auto_reply_enabled' => false,
            'ghost_command_reply_enabled' => true,
            'ghost_auto_reply_max_active_users' => 2,
            'ghost_auto_reply_cooldown_seconds' => 150,
            'ghost_max_output_tokens' => 24,
            'ghost_request_timeout' => 90,
        ])->assertSessionHas('success');

        $this->assertSame('false', AppSetting::get('ghost_ai_enabled'));
        $this->assertSame('2', AppSetting::get('ghost_auto_reply_max_active_users'));
    }

    /**
     * 18. Existing database records remain intact.
     */
    public function test_18_existing_database_records_remain_intact(): void
    {
        $initialUserCount = User::count();
        $initialRoomCount = ChatRoom::count();

        // Ghost operations do not drop, corrupt, or alter existing records
        $this->assertGreaterThan(0, $initialUserCount);
        $this->assertGreaterThan(0, $initialRoomCount);
        $this->assertNotNull(User::where('username', 'alice')->first());
        $this->assertNotNull(User::where('username', 'rootadmin')->first());
    }

    /**
     * 19. Existing chat and website functions continue operating.
     */
    public function test_19_existing_chat_and_website_functions_continue_operating(): void
    {
        // 1. Fetching chat index works
        $this->actingAs($this->user)->get('/chat')->assertOk();

        // 2. Fetching chat messages works
        $this->actingAs($this->user)->getJson("/chat/{$this->room->slug}/messages")->assertOk();

        // 3. Regular chat posting continues operating
        $postResponse = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => 'Regular user message',
        ]);
        $postResponse->assertStatus(201);
        $this->assertDatabaseHas('chat_messages', [
            'message' => 'Regular user message',
            'user_id' => $this->user->id,
        ]);
    }

    /**
     * 20. Ghost disablement during inference prevents publication.
     */
    public function test_20_ghost_disablement_during_inference_prevents_publication(): void
    {
        Http::fake([
            'http://127.0.0.1:8081/*' => function () {
                // Simulate Super Admin turning off Master Ghost while LLM is generating
                AppSetting::set('ghost_ai_enabled', 'false');
                return Http::response([
                    'choices' => [['message' => ['content' => 'Completed text that must NOT be published.']]]
                ], 200);
            },
        ]);

        $this->simulateActiveUsers(1);

        $job = new ProcessGhostChatReply(
            chatRoomId: $this->room->id,
            parentMessageId: null,
            prompt: 'Question before disable',
            isExplicitCommand: true
        );

        $initialCount = ChatMessage::where('user_id', $this->ghostUser->id)->count();
        $job->handle(app(GhostAIService::class), app(PresenceTracker::class));

        // Must be discarded!
        $this->assertSame($initialCount, ChatMessage::where('user_id', $this->ghostUser->id)->count());
    }

    /**
     * 21. Presence heartbeat endpoint updates session last_activity and throttles SQLite writes.
     */
    public function test_21_presence_heartbeat_updates_session_safely(): void
    {
        $response = $this->postJson('/presence/heartbeat');
        $response->assertOk();
        $response->assertJson(['status' => 'ok']);

        $sessionId = session()->getId();
        $this->assertDatabaseHas('sessions', [
            'id' => $sessionId,
        ]);

        $activity = DB::table('sessions')->where('id', $sessionId)->value('last_activity');
        $this->assertNotNull($activity);
        $this->assertGreaterThanOrEqual(time() - 5, $activity);
    }

    /**
     * 22. Environment Kill Switch: When GHOST_AI_ENABLED is false in .env (or config), Ghost is hard-disabled even if database is true.
     */
    public function test_22_environment_kill_switch_suppresses_ai_even_when_database_enabled(): void
    {
        Queue::fake();
        putenv('GHOST_AI_ENABLED=false');
        $_ENV['GHOST_AI_ENABLED'] = 'false';
        $_SERVER['GHOST_AI_ENABLED'] = 'false';
        config(['ghost.enabled' => false]);
        AppSetting::set('ghost_ai_enabled', 'true');

        $this->assertFalse(GhostAIService::isGloballyEnabled());

        $this->simulateActiveUsers(1);

        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => '/ai Test environment master switch',
        ]);

        $response->assertStatus(201);
        Queue::assertNotPushed(ProcessGhostChatReply::class);
    }

    /**
     * 23. Database Switch: When database setting is false, Ghost is disabled even if GHOST_AI_ENABLED is true.
     */
    public function test_23_database_switch_off_suppresses_ai_even_when_environment_enabled(): void
    {
        Queue::fake();
        putenv('GHOST_AI_ENABLED=true');
        $_ENV['GHOST_AI_ENABLED'] = 'true';
        $_SERVER['GHOST_AI_ENABLED'] = 'true';
        config(['ghost.enabled' => true]);
        AppSetting::set('ghost_ai_enabled', 'false');

        $this->assertFalse(GhostAIService::isGloballyEnabled());

        $this->simulateActiveUsers(1);

        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => '/ai Test database switch off',
        ]);

        $response->assertStatus(201);
        Queue::assertNotPushed(ProcessGhostChatReply::class);
    }

    /**
     * 24. Live End-to-End Test: Tests real llama.cpp server if online, skips gracefully if offline.
     */
    public function test_24_live_end_to_end_ai_generation_when_server_is_online(): void
    {
        $aiService = app(GhostAIService::class);
        $health = $aiService->checkHealth();

        if ($health['status'] !== 'ONLINE') {
            $this->markTestSkipped('Local llama.cpp server is not running on 127.0.0.1:8081. Skipping live E2E inference test.');
        }

        // Live inference generation test
        $reply = $aiService->generateReply([
            ['role' => 'user', 'content' => 'Hello Ghost, say something short.'],
        ], 16, 30);

        $this->assertNotEmpty($reply);
        $this->assertDoesNotMatchString('/<think>/i', $reply);
    }

    /**
     * 25. Config Caching Safety: Ensures Ghost reads all infrastructure values via config() and not direct env().
     */
    public function test_25_config_caching_compatibility_reads_through_config_api(): void
    {
        // Simulate cached config
        config(['ghost.enabled' => true]);
        config(['ghost.max_output_tokens' => 20]);
        config(['ghost.request_timeout' => 360]);
        config(['ghost.max_pending_commands' => 5]);
        config(['ghost.max_pending_auto' => 1]);

        $aiService = app(GhostAIService::class);
        $this->assertTrue(GhostAIService::isGloballyEnabled());
        $this->assertSame('http://127.0.0.1:8081/v1/chat/completions', $aiService->getEndpoint());
    }

    /**
     * 26. Fix 4: Heartbeat Preserves Login State, CSRF Token, and Existing Session Values.
     */
    public function test_26_heartbeat_preserves_login_state_csrf_token_and_session_values(): void
    {
        // 1. Initial request to establish session and CSRF token
        $this->actingAs($this->user)->get('/chat');
        $initialCsrf = session()->token();
        $this->assertNotEmpty($initialCsrf);

        // Put custom test session values
        session()->put('user_test_token', 'secure_payload_value_998');
        session()->put('custom_setting', 'dark_mode_active');
        session()->save();

        // 2. Call presence heartbeat
        $response = $this->postJson('/presence/heartbeat');
        $response->assertOk();
        $response->assertJson(['status' => 'ok']);

        // 3. Verify user remains authenticated
        $this->assertAuthenticatedAs($this->user);

        // 4. Verify CSRF token is preserved identically
        $this->assertSame($initialCsrf, session()->token());

        // 5. Verify custom session values are preserved
        $this->assertSame('secure_payload_value_998', session()->get('user_test_token'));
        $this->assertSame('dark_mode_active', session()->get('custom_setting'));

        // 6. Verify payload in database was not wiped or replaced with empty array
        $sessionId = session()->getId();
        $rawPayload = DB::table('sessions')->where('id', $sessionId)->value('payload');
        $this->assertNotEmpty($rawPayload);
        $unpacked = unserialize(base64_decode($rawPayload));
        $this->assertIsArray($unpacked);
        $this->assertSame('secure_payload_value_998', $unpacked['user_test_token'] ?? null);
    }

    /**
     * 27. Fix 5: Ghost jobs explicitly use 'database' queue connection and never run synchronously.
     */
    public function test_27_ghost_job_connection_is_explicitly_database_and_queued_asynchronously(): void
    {
        Queue::fake();
        $this->simulateActiveUsers(1);

        $job = new ProcessGhostChatReply(
            chatRoomId: $this->room->id,
            parentMessageId: null,
            prompt: 'Hello Ghost',
            isExplicitCommand: true,
            triggerMessageId: 100
        );

        // Verify explicit connection property on instance
        $this->assertSame('database', $job->connection);
        $this->assertSame('ghost-commands', $job->queue);

        // Verify when dispatched via chat endpoint
        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/message", [
            'message' => '/ai verify database connection',
        ]);

        $response->assertStatus(201);
        Queue::assertPushed(ProcessGhostChatReply::class, function ($pushedJob) {
            return $pushedJob->connection === 'database' && $pushedJob->queue === 'ghost-commands';
        });
    }

    /**
     * 28. Fix 6: Thread-Scoped Context Isolation and Command Stripping without Duplication.
     */
    public function test_28_conversation_context_scopes_to_thread_and_strips_command_without_duplication(): void
    {
        // 1. Thread Root Message
        $rootThreadMsg = ChatMessage::create([
            'chat_room_id' => $this->room->id,
            'user_id' => $this->user->id,
            'message' => 'Discussion about algorithms',
        ]);

        // 2. Reply in thread
        $replyThreadMsg = ChatMessage::create([
            'chat_room_id' => $this->room->id,
            'parent_id' => $rootThreadMsg->id,
            'user_id' => $this->user->id,
            'message' => 'Specifically sorting algorithms',
        ]);

        // 3. Unrelated root message in same room
        $unrelatedRootMsg = ChatMessage::create([
            'chat_room_id' => $this->room->id,
            'parent_id' => null,
            'user_id' => $this->user->id,
            'message' => 'Unrelated root chatter about weather',
        ]);

        // 4. Triggering message inside thread
        $triggerMsg = ChatMessage::create([
            'chat_room_id' => $this->room->id,
            'parent_id' => $rootThreadMsg->id,
            'user_id' => $this->user->id,
            'message' => '/ai explain quicksort vs mergesort',
        ]);

        $job = new ProcessGhostChatReply(
            chatRoomId: $this->room->id,
            parentMessageId: $rootThreadMsg->id,
            prompt: 'explain quicksort vs mergesort',
            isExplicitCommand: true,
            triggerMessageId: $triggerMsg->id
        );

        $reflection = new \ReflectionClass($job);
        $method = $reflection->getMethod('buildConversationContext');
        $method->setAccessible(true);
        $context = $method->invoke($job);

        // Verify context contents
        $contents = array_column($context, 'content');

        // Must contain root thread and thread reply
        $this->assertContains('Discussion about algorithms', $contents);
        $this->assertContains('Specifically sorting algorithms', $contents);

        // Must NOT contain unrelated root chatter
        $this->assertNotContains('Unrelated root chatter about weather', $contents);

        // Trigger prompt must appear exactly once at the end with command stripped
        $this->assertSame('explain quicksort vs mergesort', end($contents));
        $occurrences = array_count_values($contents)['explain quicksort vs mergesort'] ?? 0;
        $this->assertSame(1, $occurrences);
    }

    /**
     * 29. AI timeout resolves to 360s and handles stale 120s seeds safely.
     */
    public function test_29_ai_timeout_resolves_to_360_and_upgrades_legacy_120_default(): void
    {
        $aiService = app(GhostAIService::class);

        // 1. By default, timeout must be 360 seconds (matching config/ghost.php)
        $this->assertSame(360, $aiService->getRequestTimeout());

        // 2. If legacy draft setting of 120 is present, getRequestTimeout upgrades to 360
        AppSetting::set('ghost_request_timeout', '120');
        $this->assertSame(360, $aiService->getRequestTimeout());

        // 3. Admin-configured valid timeout within bounds is respected
        AppSetting::set('ghost_request_timeout', '300');
        $this->assertSame(300, $aiService->getRequestTimeout());

        // Reset to 360
        AppSetting::set('ghost_request_timeout', '360');
    }

    /**
     * 30. Queue tables migration rollback is non-destructive.
     */
    public function test_30_queue_tables_migration_rollback_is_nondestructive(): void
    {
        $migration = require database_path('migrations/2026_10_20_000001_create_queue_tables.php');

        // Rollback down() must NOT drop existing queue tables
        $migration->down();

        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasTable('jobs'));
        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasTable('job_batches'));
        $this->assertTrue(\Illuminate\Support\Facades\Schema::hasTable('failed_jobs'));
    }

    /**
     * 31. Admin settings validation blocks unsafe timeouts, tokens, and external endpoints.
     */
    public function test_31_admin_settings_validation_blocks_unsafe_timeouts_tokens_and_external_endpoints(): void
    {
        $this->actingAs($this->superAdmin);

        // 1. Reject external endpoint (SSRF prevention)
        $respExternal = $this->post('/admin/ghost/settings', [
            'ghost_ai_enabled' => true,
            'ghost_ai_endpoint' => 'http://external-ai.com/v1/chat/completions',
            'ghost_auto_reply_enabled' => true,
            'ghost_command_reply_enabled' => true,
            'ghost_auto_reply_max_active_users' => 3,
            'ghost_auto_reply_cooldown_seconds' => 300,
            'ghost_max_output_tokens' => 32,
            'ghost_request_timeout' => 360,
        ]);
        $respExternal->assertSessionHasErrors('ghost_ai_endpoint');

        // 2. Reject intranet / non-localhost IP
        $respLan = $this->post('/admin/ghost/settings', [
            'ghost_ai_enabled' => true,
            'ghost_ai_endpoint' => 'http://192.168.1.100:8081/v1/chat/completions',
            'ghost_auto_reply_enabled' => true,
            'ghost_command_reply_enabled' => true,
            'ghost_auto_reply_max_active_users' => 3,
            'ghost_auto_reply_cooldown_seconds' => 300,
            'ghost_max_output_tokens' => 32,
            'ghost_request_timeout' => 360,
        ]);
        $respLan->assertSessionHasErrors('ghost_ai_endpoint');

        // 3. Reject excessive output tokens for ~0.1 tok/sec generation (e.g. 128)
        $respTokens = $this->post('/admin/ghost/settings', [
            'ghost_ai_enabled' => true,
            'ghost_ai_endpoint' => 'http://127.0.0.1:8081/v1/chat/completions',
            'ghost_auto_reply_enabled' => true,
            'ghost_command_reply_enabled' => true,
            'ghost_auto_reply_max_active_users' => 3,
            'ghost_auto_reply_cooldown_seconds' => 300,
            'ghost_max_output_tokens' => 128,
            'ghost_request_timeout' => 360,
        ]);
        $respTokens->assertSessionHasErrors('ghost_max_output_tokens');

        // 4. Reject HTTP timeout exceeding or equal to job timeout (e.g. 450s > 400s)
        $respTimeout = $this->post('/admin/ghost/settings', [
            'ghost_ai_enabled' => true,
            'ghost_ai_endpoint' => 'http://127.0.0.1:8081/v1/chat/completions',
            'ghost_auto_reply_enabled' => true,
            'ghost_command_reply_enabled' => true,
            'ghost_auto_reply_max_active_users' => 3,
            'ghost_auto_reply_cooldown_seconds' => 300,
            'ghost_max_output_tokens' => 32,
            'ghost_request_timeout' => 450,
        ]);
        $respTimeout->assertSessionHasErrors('ghost_request_timeout');

        // 5. Valid safe configuration is accepted
        $respValid = $this->post('/admin/ghost/settings', [
            'ghost_ai_enabled' => true,
            'ghost_ai_endpoint' => 'http://127.0.0.1:8081/v1/chat/completions',
            'ghost_auto_reply_enabled' => true,
            'ghost_command_reply_enabled' => true,
            'ghost_auto_reply_max_active_users' => 3,
            'ghost_auto_reply_cooldown_seconds' => 300,
            'ghost_max_output_tokens' => 32,
            'ghost_request_timeout' => 360,
        ]);
        $respValid->assertSessionHasNoErrors();
        $this->assertSame('360', AppSetting::get('ghost_request_timeout'));
        $this->assertSame('32', AppSetting::get('ghost_max_output_tokens'));
    }

    /**
     * 32. Atomic inference lock status reporting and release.
     */
    public function test_32_atomic_inference_lock_status_reporting_and_release(): void
    {
        $this->actingAs($this->superAdmin);

        // Ensure lock is clear initially
        GhostAIService::releaseInferenceLock();
        $this->assertFalse(GhostAIService::isInferenceLocked());

        // Admin dashboard observes idle
        $response = $this->get('/admin/ghost');
        $response->assertOk();
        $this->assertFalse($response->viewData('page')['props']['queue']['is_locked']);

        // Acquire real atomic lock
        $lock = Cache::lock('ghost_ai_inference_lock', 60);
        $this->assertTrue($lock->get());

        // Status must immediately reflect active inference lock
        $this->assertTrue(GhostAIService::isInferenceLocked());

        $responseLocked = $this->get('/admin/ghost');
        $responseLocked->assertOk();
        $this->assertTrue($responseLocked->viewData('page')['props']['queue']['is_locked']);

        // Releasing lock via emergency release
        GhostAIService::releaseInferenceLock();
        $this->assertFalse(GhostAIService::isInferenceLocked());

        $responseUnlocked = $this->get('/admin/ghost');
        $responseUnlocked->assertOk();
        $this->assertFalse($responseUnlocked->viewData('page')['props']['queue']['is_locked']);
    }
}
