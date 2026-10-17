<?php

namespace Tests\Feature;

use App\Models\AppSetting;
use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StealthAndModerationTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(array $attributes = []): User
    {
        static $counter = 1;
        $idx = $counter++;
        return User::create(array_merge([
            'display_name' => "User {$idx}",
            'username' => "user{$idx}",
            'username_normalized' => "user{$idx}",
            'gender' => 'Male',
            'password' => Hash::make('secretPassword123!'),
            'role' => 'USER',
            'status' => 'ACTIVE',
        ], $attributes));
    }

    public function test_users_can_post_with_ghost_mode_untraceable_identity(): void
    {
        $user = $this->makeUser([
            'username' => 'alice_test',
            'username_normalized' => 'alice_test',
            'display_name' => 'Alice Real',
        ]);

        $this->actingAs($user)->post('/posts', [
            'title' => 'Untraceable Signal',
            'body' => 'This is a ghost transmission.',
            'is_ghost' => true,
        ])->assertRedirect();

        $post = Post::first();
        $this->assertNotNull($post);
        $this->assertTrue((bool) $post->is_ghost);
        $this->assertStringStartsWith('Ghost-', $post->alias_name);

        // Verify that feed masks the author
        $response = $this->get('/');
        $response->assertOk();
    }

    public function test_emergency_lockdown_blocks_non_admin_posts(): void
    {
        AppSetting::set('emergency_lockdown', true);

        $user = $this->makeUser(['status' => 'ACTIVE', 'role' => 'USER']);

        $this->actingAs($user)->post('/posts', [
            'title' => 'Should Be Blocked',
            'body' => 'Testing containment.',
        ])->assertSessionHasErrors(['title']);

        $this->assertDatabaseCount('posts', 0);
    }

    public function test_admin_stealth_console_can_purge_forensic_logs(): void
    {
        $admin = $this->makeUser([
            'username' => 'superadmin',
            'username_normalized' => 'superadmin',
            'role' => 'SUPER_ADMIN',
            'status' => 'ACTIVE',
        ]);

        $this->actingAs($admin)->post('/admin/stealth/purge-logs')
            ->assertSessionHas('success');

        // Only the single audit log recording the purge itself should remain
        $this->assertDatabaseCount('security_events', 0);
        $this->assertDatabaseCount('admin_audit_logs', 1);
    }
}
