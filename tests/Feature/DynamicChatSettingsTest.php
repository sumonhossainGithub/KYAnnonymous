<?php

namespace Tests\Feature;

use App\Models\{AppSetting, ChatMessage, ChatRoom, Post, User};
use App\Support\SiteSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DynamicChatSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role = 'USER'): User
    {
        $name = 'tester'.User::count();
        return User::create(['display_name' => $name, 'username' => $name, 'username_normalized' => $name, 'gender' => 'Male', 'password' => 'testPassword!2026', 'status' => 'ACTIVE', 'role' => $role]);
    }

    private function settings(array $values): void
    {
        AppSetting::set('site_customization', json_encode(array_replace(SiteSettings::defaults(), $values)));
    }

    public function test_sending_and_polling_return_json_without_redirects_and_keep_threads_in_their_room(): void
    {
        $user = $this->user();
        $response = $this->actingAs($user)->postJson('/chat/common-orbit/message', ['message' => 'Hello dynamically']);
        $response->assertCreated()->assertJsonPath('messages.0.message', 'Hello dynamically')->assertHeaderMissing('Location');
        $id = $response->json('messages.0.public_id');
        $this->postJson('/chat/common-orbit/message', ['message' => 'A thread reply', 'parent_public_id' => $id])
            ->assertCreated()->assertJsonPath('messages.0.sub_chats.0.message', 'A thread reply');
        $this->getJson('/chat/common-orbit/messages')->assertOk()->assertJsonCount(1, 'messages')->assertJsonCount(1, 'messages.0.sub_chats');
        $this->getJson('/chat/quiet-thoughts/messages')->assertOk()->assertJsonCount(0, 'messages');
        $this->postJson('/chat/quiet-thoughts/message', ['message' => 'wrong room', 'parent_public_id' => $id])->assertUnprocessable()->assertJsonValidationErrors('message');
    }

    public function test_json_validation_preserves_existing_messages_and_masks_anonymous_identity(): void
    {
        $user = $this->user();
        $this->actingAs($user)->postJson('/chat/common-orbit/message', ['message' => '   '])->assertUnprocessable()->assertJsonValidationErrors('message');
        $response = $this->postJson('/chat/common-orbit/message', ['message' => 'Alias message', 'is_ghost' => true])->assertCreated();
        $this->assertNotSame($user->public_id, $response->json('messages.0.sender.public_id'));
        $this->assertNotSame($user->username, $response->json('messages.0.sender.username'));
        $this->assertArrayNotHasKey('user_id', $response->json('messages.0'));
    }

    public function test_only_admin_can_edit_settings_and_valid_updates_are_shared_and_audited(): void
    {
        $this->get('/admin/settings')->assertRedirect('/login');
        $member = $this->user();
        $this->actingAs($member)->postJson('/admin/settings', SiteSettings::defaults())->assertForbidden();
        $admin = $this->user('SUPER_ADMIN');
        $settings = array_replace(SiteSettings::defaults(), ['site_name' => 'New Community', 'primary_color' => '#aa33ee', 'corner_radius' => 4, 'homepage_layout' => 'feed']);
        $this->actingAs($admin)->from('/admin/settings')->post('/admin/settings', $settings)->assertRedirect('/admin/settings')->assertSessionHasNoErrors();
        $this->get('/admin/settings')->assertInertia(fn (Assert $page) => $page->component('Admin/Settings')->where('settings.site_name', 'New Community'));
        $this->get('/')->assertInertia(fn (Assert $page) => $page->component('Feed/Index')->where('site.primary_color', '#aa33ee'));
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'SITE_SETTINGS_UPDATED']);
    }

    public function test_invalid_settings_do_not_overwrite_saved_values(): void
    {
        $this->actingAs($this->user('SUPER_ADMIN'))->postJson('/admin/settings', array_replace(SiteSettings::defaults(), ['primary_color' => 'url(https://example.test)', 'poll_interval' => 10, 'font_family' => 'javascript']))
            ->assertUnprocessable()->assertJsonValidationErrors(['primary_color', 'poll_interval', 'font_family']);
        $this->assertSame('#38bdf8', SiteSettings::get('primary_color'));
    }

    public function test_admin_policies_are_enforced_on_json_endpoints_and_update_live(): void
    {
        $this->settings(['guest_chat_enabled' => false]);
        $this->postJson('/chat/common-orbit/message', ['message' => 'guest'])->assertUnprocessable();
        $this->getJson('/chat/common-orbit/messages')->assertJsonPath('policy.can_send', false);
        $user = $this->user();
        $this->actingAs($user);
        $this->settings(['anonymous_enabled' => false, 'replies_enabled' => false, 'message_max_length' => 50]);
        $this->postJson('/chat/common-orbit/message', ['message' => 'alias', 'is_ghost' => true])->assertUnprocessable();
        $this->postJson('/chat/common-orbit/message', ['message' => str_repeat('a', 51)])->assertUnprocessable();
        $this->postJson('/chat/common-orbit/message', ['message' => 'reply', 'parent_public_id' => 'nonexistent'])->assertUnprocessable();
        $this->settings(['chat_enabled' => false]);
        $this->getJson('/chat/common-orbit/messages')->assertJsonPath('policy.can_send', false);
        $this->postJson('/chat/common-orbit/message', ['message' => 'paused'])->assertUnprocessable();
        $this->settings(['message_rate_limit' => 1]);
        \Illuminate\Support\Facades\RateLimiter::clear('chat:'.$user->id.':'.\App\Support\Anonymity::hashIp('127.0.0.1'));
        $this->postJson('/chat/common-orbit/message', ['message' => 'first'])->assertCreated();
        $this->postJson('/chat/common-orbit/message', ['message' => 'second'])->assertUnprocessable();
    }

    public function test_community_switches_are_enforced_server_side(): void
    {
        $this->settings(['registration_enabled' => false, 'member_rooms_enabled' => false, 'posts_enabled' => false, 'comments_enabled' => false]);
        $this->post('/register', [])->assertSessionHasErrors('username');
        $user = $this->user();
        $this->actingAs($user)->post('/chat', ['name' => 'New room'])->assertForbidden();
        $this->post('/posts', ['title' => 'A title', 'body' => 'A post body'])->assertSessionHasErrors('title');
        $post = Post::create(['user_id' => $user->id, 'title' => 'Existing post', 'body' => 'Existing body', 'status' => 'ACTIVE']);
        $this->post('/posts/'.$post->public_id.'/comments', ['body' => 'New comment'])->assertSessionHasErrors('body');
    }

    public function test_admin_can_manage_rooms_without_changing_urls_and_cannot_close_default_room(): void
    {
        $this->actingAs($this->user('SUPER_ADMIN'))->post('/admin/settings/rooms', ['name' => 'New room', 'description' => 'New purpose', 'is_active' => true])->assertSessionHasNoErrors();
        $room = ChatRoom::where('name', 'New room')->firstOrFail();
        $slug = $room->slug;
        $this->post('/admin/settings/rooms/'.$room->public_id, ['name' => 'Renamed room', 'description' => 'Updated', 'is_active' => false])->assertSessionHasNoErrors();
        $this->assertSame($slug, $room->fresh()->slug);
        $default = ChatRoom::where('slug', 'common-orbit')->firstOrFail();
        $this->post('/admin/settings/rooms/'.$default->public_id, ['name' => $default->name, 'description' => '', 'is_active' => false])->assertSessionHasErrors('is_active');
    }

    public function test_admin_message_removal_is_authorized_and_room_scoped(): void
    {
        $user = $this->user();
        $id = $this->actingAs($user)->postJson('/chat/common-orbit/message', ['message' => 'moderate me'])->json('messages.0.public_id');
        $this->deleteJson('/admin/chat/common-orbit/messages/'.$id)->assertForbidden();
        $this->actingAs($this->user('SUPER_ADMIN'))->deleteJson('/admin/chat/quiet-thoughts/messages/'.$id)->assertNotFound();
        $this->deleteJson('/admin/chat/common-orbit/messages/'.$id)->assertOk()->assertJsonCount(0, 'messages');
        $this->assertDatabaseMissing('chat_messages', ['public_id' => $id]);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'CHAT_MESSAGE_REMOVED']);
    }
}
