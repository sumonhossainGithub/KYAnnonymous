<?php

use App\Models\PasswordRecovery;
use App\Models\User;
use App\Support\Anonymity;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

test('users can register with only display name, username, gender, and password', function () {
    $response = $this->post('/register', [
        'display_name' => 'Night Owl',
        'username' => 'nightowl27',
        'gender' => 'Male',
        'show_gender' => true,
        'password' => 'secretPassword123!',
    ]);

    $response->assertRedirect('/recovery-code');

    $this->assertDatabaseHas('users', [
        'username' => 'nightowl27',
        'username_normalized' => 'nightowl27',
        'display_name' => 'Night Owl',
        'gender' => 'Male',
        'show_gender' => true,
    ]);

    $user = User::where('username_normalized', 'nightowl27')->first();
    expect($user)->not->toBeNull();
    expect(Hash::check('secretPassword123!', $user->password))->toBeTrue();

    // Verify recovery code hash was generated (§10)
    $recovery = PasswordRecovery::where('user_id', $user->id)->first();
    expect($recovery)->not->toBeNull();
    expect($recovery->recovery_code_hash)->not->toBeEmpty();
});

test('username uniqueness is case-insensitive (§6)', function () {
    User::create([
        'display_name' => 'User One',
        'username' => 'NightOwl',
        'username_normalized' => 'nightowl',
        'gender' => 'Male',
        'password' => Hash::make('password123'),
        'role' => 'USER',
        'status' => 'ACTIVE',
    ]);

    $response = $this->post('/register', [
        'display_name' => 'User Two',
        'username' => 'nightowl',
        'gender' => 'Female',
        'password' => 'password123',
    ]);

    $response->assertSessionHasErrors('username');
});

test('sessions table does NOT store client IP or user agent (§29, §37)', function () {
    $columns = \Illuminate\Support\Facades\Schema::getColumnListing('sessions');
    
    expect($columns)->not->toContain('ip_address');
    expect($columns)->not->toContain('user_agent');
    expect($columns)->toContain('id');
    expect($columns)->toContain('user_id');
    expect($columns)->toContain('payload');
    expect($columns)->toContain('last_activity');
});

test('banning a user invalidates all their active sessions (§20, §37)', function () {
    $admin = User::create([
        'display_name' => 'Super Admin',
        'username' => 'admin',
        'username_normalized' => 'admin',
        'gender' => 'Male',
        'password' => Hash::make('adminPassword123!'),
        'role' => 'SUPER_ADMIN',
        'status' => 'ACTIVE',
    ]);

    $victim = User::create([
        'display_name' => 'Spammer',
        'username' => 'spammer99',
        'username_normalized' => 'spammer99',
        'gender' => 'Male',
        'password' => Hash::make('spammerPassword123!'),
        'role' => 'USER',
        'status' => 'ACTIVE',
    ]);

    // Insert fake active sessions
    DB::table('sessions')->insert([
        ['id' => 'sess_1', 'user_id' => $victim->id, 'payload' => 'dummy', 'last_activity' => time()],
        ['id' => 'sess_2', 'user_id' => $victim->id, 'payload' => 'dummy', 'last_activity' => time()],
    ]);

    expect(DB::table('sessions')->where('user_id', $victim->id)->count())->toBe(2);

    $this->actingAs($admin)->post("/admin/users/{$victim->public_id}/toggle-ban");

    $victim->refresh();
    expect($victim->status)->toBe('BANNED');
    expect(DB::table('sessions')->where('user_id', $victim->id)->count())->toBe(0);
});

test('voting is atomic and maintains correct scores (§14)', function () {
    $user = User::create([
        'display_name' => 'Voter',
        'username' => 'voter1',
        'username_normalized' => 'voter1',
        'gender' => 'Male',
        'password' => Hash::make('password123'),
        'role' => 'USER',
        'status' => 'ACTIVE',
    ]);

    $post = \App\Models\Post::create([
        'user_id' => $user->id,
        'title' => 'Sample discussion',
        'body' => 'Checking vote counter integrity',
        'status' => 'ACTIVE',
    ]);

    // 1. Upvote
    $this->actingAs($user)->post("/posts/{$post->public_id}/vote", ['vote' => 1]);
    $post->refresh();
    expect($post->upvotes_count)->toBe(1);
    expect($post->score)->toBe(1);

    // 2. Switch Upvote -> Downvote
    $this->actingAs($user)->post("/posts/{$post->public_id}/vote", ['vote' => -1]);
    $post->refresh();
    expect($post->upvotes_count)->toBe(0);
    expect($post->downvotes_count)->toBe(1);
    expect($post->score)->toBe(-1);

    // 3. Remove vote (click downvote again)
    $this->actingAs($user)->post("/posts/{$post->public_id}/vote", ['vote' => -1]);
    $post->refresh();
    expect($post->upvotes_count)->toBe(0);
    expect($post->downvotes_count)->toBe(0);
    expect($post->score)->toBe(0);
});
