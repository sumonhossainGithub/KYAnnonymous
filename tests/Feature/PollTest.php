<?php

namespace Tests\Feature;

use App\Models\ChatRoom;
use App\Models\Poll;
use App\Models\PollVote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PollTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'username' => 'pollmaster',
            'username_normalized' => 'pollmaster',
            'display_name' => 'Poll Master',
            'gender' => 'Male',
            'password' => bcrypt('password123!'),
            'status' => 'ACTIVE',
            'role' => 'USER',
        ]);

        $this->room = ChatRoom::create([
            'name' => 'Discussion Hub',
            'slug' => 'discussion-hub',
            'created_by' => $this->user->id,
            'is_active' => true,
        ]);
    }

    public function test_registered_user_can_create_poll(): void
    {
        $response = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/polls", [
            'question' => 'What is your favorite color?',
            'options' => ['Emerald', 'Cyan', 'Purple'],
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('polls', [
            'chat_room_id' => $this->room->id,
            'question' => 'What is your favorite color?',
        ]);

        $poll = Poll::first();
        $this->assertCount(3, $poll->options);
        $this->assertEquals(['Emerald', 'Cyan', 'Purple'], $poll->options);
    }

    public function test_guest_cannot_create_poll(): void
    {
        $response = $this->postJson("/chat/{$this->room->slug}/polls", [
            'question' => 'Can guest create?',
            'options' => ['Yes', 'No'],
        ]);

        $response->assertStatus(401);
    }

    public function test_both_registered_user_and_guest_can_vote(): void
    {
        $poll = Poll::create([
            'chat_room_id' => $this->room->id,
            'user_id' => $this->user->id,
            'question' => 'Do you like night mode?',
            'options' => ['Yes', 'No'],
        ]);

        // Registered user votes
        $userVoteRes = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/polls/{$poll->public_id}/vote", [
            'option_index' => 0,
        ]);
        $userVoteRes->assertStatus(200);

        // Guest user votes (unauthenticated)
        auth()->logout();
        session()->regenerate();
        $guestVoteRes = $this->postJson("/chat/{$this->room->slug}/polls/{$poll->public_id}/vote", [
            'option_index' => 1,
        ]);
        $guestVoteRes->assertStatus(200);

        $this->assertEquals(2, $poll->votes()->count());
        $results = $poll->tallyResults();
        $this->assertEquals(1, $results[0]);
        $this->assertEquals(1, $results[1]);
    }

    public function test_user_cannot_vote_twice(): void
    {
        $poll = Poll::create([
            'chat_room_id' => $this->room->id,
            'user_id' => $this->user->id,
            'question' => 'One vote only?',
            'options' => ['Yes', 'No'],
        ]);

        $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/polls/{$poll->public_id}/vote", [
            'option_index' => 0,
        ])->assertStatus(200);

        $secondVote = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/polls/{$poll->public_id}/vote", [
            'option_index' => 1,
        ]);
        $secondVote->assertStatus(422);
    }

    public function test_butterfly_reaction_broadcasts_events(): void
    {
        $message = \App\Models\ChatMessage::create([
            'chat_room_id' => $this->room->id,
            'user_id' => $this->user->id,
            'message' => 'Hello Butterfly!',
        ]);

        $res = $this->actingAs($this->user)->postJson("/chat/{$this->room->slug}/messages/{$message->public_id}/butterfly");
        $res->assertStatus(200);

        $json = $res->json();
        $this->assertArrayHasKey('butterfly_events', $json);
        $this->assertNotEmpty($json['butterfly_events']);
        $this->assertEquals($message->public_id, $json['butterfly_events'][0]['message_public_id']);
    }

    public function test_super_admin_can_create_poll(): void
    {
        $admin = User::create([
            'username' => 'superadmin',
            'username_normalized' => 'superadmin',
            'display_name' => 'Super Admin',
            'gender' => 'Male',
            'password' => bcrypt('password123!'),
            'status' => 'ACTIVE',
            'role' => 'SUPER_ADMIN',
        ]);

        $response = $this->actingAs($admin)->postJson("/chat/{$this->room->slug}/polls", [
            'question' => 'Super Admin official poll?',
            'options' => ['Option A', 'Option B'],
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('polls', [
            'chat_room_id' => $this->room->id,
            'question' => 'Super Admin official poll?',
            'user_id' => $admin->id,
        ]);

        $payload = $response->json();
        $this->assertNotEmpty($payload['polls']);
        $this->assertTrue($payload['polls'][0]['creator']['is_admin']);
    }

    public function test_admin_and_creator_can_delete_poll(): void
    {
        $admin = User::create([
            'username' => 'superadmin2',
            'username_normalized' => 'superadmin2',
            'display_name' => 'Super Admin 2',
            'gender' => 'Female',
            'password' => bcrypt('password123!'),
            'status' => 'ACTIVE',
            'role' => 'SUPER_ADMIN',
        ]);

        $poll = Poll::create([
            'chat_room_id' => $this->room->id,
            'user_id' => $this->user->id,
            'question' => 'To be deleted?',
            'options' => ['Yes', 'No'],
        ]);

        // Admin can delete any poll
        $res = $this->actingAs($admin)->deleteJson("/chat/{$this->room->slug}/polls/{$poll->public_id}");
        $res->assertStatus(200);
        $this->assertDatabaseMissing('polls', ['public_id' => $poll->public_id]);
    }
}
