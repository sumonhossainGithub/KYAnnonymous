<?php

namespace Tests\Feature;

use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Vite;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CommunityChatTest extends TestCase
{
    use RefreshDatabase;

    private function member(string $name = 'stargazer', string $status = 'ACTIVE'): User
    {
        return User::create([
            'display_name' => $name, 'username' => $name, 'username_normalized' => $name,
            'gender' => 'Male', 'password' => 'unused-test-password', 'status' => $status, 'role' => 'USER',
        ]);
    }

    public function test_guests_can_chat_without_login_with_ephemeral_history_and_need_account_to_create_rooms(): void
    {
        $this->get('/chat')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Chat/Index')->has('rooms', 3));
        $this->get('/chat/common-orbit')->assertOk()->assertInertia(fn (Assert $page) => $page->component('Chat/Room'));
        $this->post('/chat', ['name' => 'Guest room'])->assertRedirect('/login');

        // Guests CAN chat without login
        $this->post('/chat/common-orbit/message', ['message' => 'hello from guest'])->assertSessionHasNoErrors();
        $guestMsg = ChatMessage::where('message', 'hello from guest')->firstOrFail();
        $this->assertNull($guestMsg->user_id);
        $this->assertTrue((bool) $guestMsg->is_guest);
        $this->assertTrue((bool) $guestMsg->is_ephemeral);

        // Ephemeral check: guest messages older than 15 minutes are purged so history does not remain
        \Illuminate\Support\Facades\DB::table('chat_messages')->where('id', $guestMsg->id)->update(['created_at' => now()->subMinutes(20)]);
        $this->get('/');
        $this->assertDatabaseMissing('chat_messages', ['id' => $guestMsg->id]);
    }

    public function test_logged_in_users_can_customize_profile_and_add_avatar_image(): void
    {
        $user = $this->member('spaceman');

        // 1. View profile
        $this->actingAs($user)->get('/profile')->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('Profile/Edit')
            ->has('user')
            ->where('user.username', 'spaceman')
        );

        // 2. Select avatar preset
        $this->actingAs($user)->post('/profile/avatar', [
            'avatar_preset' => 'data:image/svg+xml;utf8,<svg></svg>',
        ])->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertSame('data:image/svg+xml;utf8,<svg></svg>', $user->avatar_url);

        // 3. User messages reflect avatar_url
        $this->actingAs($user)->post('/chat/common-orbit/message', ['message' => 'Testing with avatar'])->assertSessionHasNoErrors();
        $response = $this->get('/');
        $response->assertInertia(fn (Assert $page) => $page
            ->where('initialMessages.0.sender.avatar_url', 'data:image/svg+xml;utf8,<svg></svg>')
        );

        // 4. Remove avatar
        $this->actingAs($user)->delete('/profile/avatar')->assertSessionHasNoErrors();
        $user->refresh();
        $this->assertNull($user->avatar_url);
    }

    public function test_client_rendered_pages_do_not_call_a_missing_ssr_service(): void
    {
        Http::preventStrayRequests();
        $hotFile = tempnam(sys_get_temp_dir(), 'ky-vite-');
        file_put_contents($hotFile, 'http://localhost:5173');
        Vite::useHotFile($hotFile);
        try {
            $this->get('/')->assertOk();
            Http::assertNothingSent();
        } finally {
            unlink($hotFile);
        }
    }

    public function test_any_active_member_can_create_a_room_and_other_members_can_join(): void
    {
        $creator = $this->member();
        $response = $this->actingAs($creator)->post('/chat', ['name' => 'Small joys', 'description' => 'Share a good moment.']);
        $room = ChatRoom::where('name', 'Small joys')->firstOrFail();
        $response->assertRedirect('/chat/'.$room->slug);
        $this->assertSame($creator->id, $room->created_by);
        $this->actingAs($this->member('moonwalker'))->get('/chat/'.$room->slug)->assertOk();
    }

    public function test_room_names_can_repeat_without_slug_collisions_and_support_unicode(): void
    {
        $this->actingAs($this->member());
        foreach (['Small joys', 'Small joys', 'শান্তি'] as $name) {
            $this->post('/chat', ['name' => $name])->assertSessionHasNoErrors();
        }
        $this->assertSame(2, ChatRoom::where('name', 'Small joys')->distinct()->count('slug'));
        $this->assertNotNull(ChatRoom::where('name', 'শান্তি')->first());
        $this->post('/chat', ['name' => 'Too many rooms'])->assertSessionHasErrors('name');
    }

    public function test_invalid_rooms_and_empty_sanitized_messages_are_rejected(): void
    {
        $this->actingAs($this->member());
        $this->post('/chat', ['name' => '<b></b>'])->assertSessionHasErrors('name');
        $this->post('/chat', ['name' => str_repeat('a', 61)])->assertSessionHasErrors('name');
        $this->post('/chat', ['name' => 'Valid name', 'description' => str_repeat('a', 241)])->assertSessionHasErrors('description');
        $this->post('/chat/common-orbit/message', ['message' => '<b> </b>'])->assertSessionHasErrors('message');
        $this->assertDatabaseCount('chat_messages', 0);
    }

    public function test_messages_are_shared_between_members_in_chronological_order(): void
    {
        $first = $this->member();
        $second = $this->member('moonwalker');
        $this->actingAs($first)->from('/chat/common-orbit')->post('/chat/common-orbit/message', ['message' => 'Hello, universe.'])->assertRedirect('/chat/common-orbit');
        $this->actingAs($second)->from('/chat/common-orbit')->post('/chat/common-orbit/message', ['message' => 'Hello back.'])->assertRedirect('/chat/common-orbit');
        $this->get('/chat/common-orbit')->assertInertia(fn (Assert $page) => $page
            ->component('Chat/Room')->has('initialMessages', 2)
            ->where('initialMessages.0.message', 'Hello, universe.')
            ->where('initialMessages.1.message', 'Hello back.')
            ->missing('initialMessages.0.sender.id')
            ->missing('room.created_by'));
        $this->get('/chat/quiet-thoughts')->assertInertia(fn (Assert $page) => $page->has('initialMessages', 0));
    }

    public function test_chat_keeps_the_latest_fifty_messages_and_hides_closed_rooms(): void
    {
        $member = $this->member();
        $room = ChatRoom::where('slug', 'common-orbit')->firstOrFail();
        for ($i = 1; $i <= 55; $i++) {
            ChatMessage::create(['user_id' => $member->id, 'chat_room_id' => $room->id, 'message' => "Message $i"]);
        }
        $this->actingAs($member)->get('/chat/common-orbit')->assertInertia(fn (Assert $page) => $page
            ->has('initialMessages', 50)->where('initialMessages.0.message', 'Message 6')->where('initialMessages.49.message', 'Message 55'));
        $room->update(['is_active' => false]);
        $this->get('/chat/common-orbit')->assertNotFound();
        $this->post('/chat/common-orbit/message', ['message' => 'No entry'])->assertNotFound();
        $this->get('/chat')->assertInertia(fn (Assert $page) => $page->has('rooms', 2));
    }

    public function test_suspended_and_banned_members_cannot_create_rooms_or_send_messages(): void
    {
        $this->actingAs($this->member('suspended', 'SUSPENDED'));
        $this->post('/chat', ['name' => 'Not allowed'])->assertForbidden();
        $this->post('/chat/common-orbit/message', ['message' => 'Not allowed'])->assertForbidden();
        $banned = $this->member('banned', 'BANNED');
        $this->actingAs($banned)->post('/chat', ['name' => 'Not allowed'])->assertRedirect('/login');
        $this->actingAs($banned)->post('/chat/common-orbit/message', ['message' => 'Not allowed'])->assertRedirect('/login');
        $this->assertDatabaseCount('chat_messages', 0);
        $this->assertDatabaseCount('chat_rooms', 3);
    }

    public function test_homepage_is_the_public_chatbox_and_guests_can_view_it(): void
    {
        $response = $this->get('/');
        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Chat/HomeChat')
                ->has('room')
                ->has('initialMessages')
                ->has('rooms')
            );
    }

    public function test_chat_messages_support_nested_sub_chats(): void
    {
        $alice = $this->member('alice');
        $bob = $this->member('bob');

        // 1. Post parent chat message
        $this->actingAs($alice)->post('/chat/common-orbit/message', [
            'message' => 'Parent conversation starting point',
        ])->assertSessionHasNoErrors();

        $parent = ChatMessage::whereNull('parent_id')->firstOrFail();
        $this->assertSame('Parent conversation starting point', $parent->message);

        // 2. Post sub-chat reply referencing parent
        $this->actingAs($bob)->post('/chat/common-orbit/message', [
            'message' => 'This is a sub-chat reply to parent',
            'parent_public_id' => $parent->public_id,
            'is_ghost' => true,
        ])->assertSessionHasNoErrors();

        $subChat = ChatMessage::where('parent_id', $parent->id)->firstOrFail();
        $this->assertSame('This is a sub-chat reply to parent', $subChat->message);
        $this->assertTrue((bool) $subChat->is_ghost);

        // 3. Verify public chat loader includes sub-chats in the parent message
        $response = $this->actingAs($alice)->get('/chat/common-orbit');
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Chat/Room')
            ->has('initialMessages', 1)
            ->where('initialMessages.0.sub_chats_count', 1)
            ->where('initialMessages.0.sub_chats.0.message', 'This is a sub-chat reply to parent')
            ->where('initialMessages.0.sub_chats.0.is_ghost', true)
        );
    }
}
