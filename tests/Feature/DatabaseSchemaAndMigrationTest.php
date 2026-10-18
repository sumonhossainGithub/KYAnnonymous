<?php

namespace Tests\Feature;

use App\Models\ChatRoom;
use App\Models\Poll;
use App\Models\PollVote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseSchemaAndMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_expected_database_tables_exist(): void
    {
        $expectedTables = [
            'users',
            'sessions',
            'password_recovery',
            'organizations',
            'posts',
            'post_votes',
            'comments',
            'notices',
            'chat_rooms',
            'chat_messages',
            'reports',
            'admin_audit_logs',
            'security_events',
            'app_settings',
            'cache',
            'cache_locks',
            'chat_message_reactions',
            'polls',
            'poll_votes',
        ];

        foreach ($expectedTables as $table) {
            $this->assertTrue(
                Schema::hasTable($table),
                "Missing expected database table: {$table}"
            );
        }
    }

    public function test_poll_and_chat_schema_columns_exist(): void
    {
        // Polls table columns
        $pollColumns = ['id', 'public_id', 'chat_room_id', 'user_id', 'question', 'options', 'expires_at', 'is_active', 'created_at', 'updated_at'];
        foreach ($pollColumns as $col) {
            $this->assertTrue(Schema::hasColumn('polls', $col), "Polls table missing column: {$col}");
        }

        // Poll votes columns
        $pollVoteColumns = ['id', 'poll_id', 'option_index', 'voter_key', 'created_at'];
        foreach ($pollVoteColumns as $col) {
            $this->assertTrue(Schema::hasColumn('poll_votes', $col), "Poll votes table missing column: {$col}");
        }

        // Chat message columns
        $chatMessageColumns = ['butterfly_count', 'file_url', 'file_name', 'file_type', 'file_size', 'parent_id', 'is_ghost', 'is_guest', 'is_ephemeral', 'alias_name'];
        foreach ($chatMessageColumns as $col) {
            $this->assertTrue(Schema::hasColumn('chat_messages', $col), "Chat messages table missing column: {$col}");
        }

        // Chat room columns
        $this->assertTrue(Schema::hasColumn('chat_rooms', 'password'), "Chat rooms table missing password column");
        $this->assertTrue(Schema::hasColumn('chat_rooms', 'created_by'), "Chat rooms table missing created_by column");

        // Posts columns
        $this->assertTrue(Schema::hasColumn('posts', 'image_url'), "Posts table missing image_url column");

        // Users columns
        $this->assertTrue(Schema::hasColumn('users', 'avatar_url'), "Users table missing avatar_url column");
    }

    public function test_password_hashing_defaults_to_bcrypt(): void
    {
        $hashDriver = config('hashing.driver');
        $this->assertEquals('bcrypt', $hashDriver);

        $hashed = Hash::make('testpassword123');
        $info = Hash::info($hashed);
        $this->assertEquals('bcrypt', $info['algoName']);
        $this->assertTrue(Hash::check('testpassword123', $hashed));
    }

    public function test_poll_creation_voting_and_results_in_database(): void
    {
        $user = User::create([
            'username' => 'schematestuser',
            'username_normalized' => 'schematestuser',
            'display_name' => 'Schema User',
            'gender' => 'Male',
            'password' => bcrypt('password123!'),
            'status' => 'ACTIVE',
            'role' => 'USER',
        ]);

        $room = ChatRoom::create([
            'name' => 'Schema Test Room',
            'slug' => 'schema-test-room',
            'created_by' => $user->id,
            'is_active' => true,
        ]);

        $poll = Poll::create([
            'chat_room_id' => $room->id,
            'user_id' => $user->id,
            'question' => 'Does SQLite migration work?',
            'options' => ['Yes', 'Definitely', 'Absolutely'],
            'expires_at' => now()->addHours(24),
            'is_active' => true,
        ]);

        $this->assertNotNull($poll->public_id);
        $this->assertFalse($poll->isExpired());

        // Cast votes
        PollVote::create([
            'poll_id' => $poll->id,
            'option_index' => 0,
            'voter_key' => "u_{$user->id}",
            'created_at' => now(),
        ]);

        PollVote::create([
            'poll_id' => $poll->id,
            'option_index' => 1,
            'voter_key' => 'g_guestsession1',
            'created_at' => now(),
        ]);

        $results = $poll->tallyResults();
        $this->assertEquals(1, $results[0]);
        $this->assertEquals(1, $results[1]);
        $this->assertEquals(0, $results[2]);
        $this->assertEquals(2, $poll->votes()->count());
    }
}
