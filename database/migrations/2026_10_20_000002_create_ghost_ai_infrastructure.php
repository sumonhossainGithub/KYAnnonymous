<?php

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Optimize SQLite for concurrency if using SQLite
        if (config('database.default') === 'sqlite') {
            try {
                DB::statement('PRAGMA journal_mode = WAL;');
                DB::statement('PRAGMA busy_timeout = 5000;');
            } catch (\Throwable) {
                // Ignore if pragma is unsupported in current environment
            }
        }

        // 2. Ensure Ghost AI Service Account exists
        $ghostUser = User::where('username_normalized', 'ghost_ai')->first();
        if (!$ghostUser) {
            User::create([
                'public_id' => (string) Str::ulid(),
                'display_name' => 'Ghost',
                'username' => 'ghost_ai',
                'username_normalized' => 'ghost_ai',
                'gender' => 'Male',
                'show_gender' => false,
                'avatar_url' => '/images/ghost-avatar.svg',
                'password' => Hash::make(Str::random(64)), // Unguessable: cannot login
                'role' => 'USER',
                'status' => 'ACTIVE',
                'force_password_reset' => false,
            ]);
        }

        // 3. Populate default Ghost AI settings in app_settings (disabled by default until tested)
        $defaultSettings = [
            'ghost_ai_enabled' => 'false',
            'ghost_ai_endpoint' => config('ghost.endpoint', 'http://127.0.0.1:8081/v1/chat/completions'),
            'ghost_auto_reply_enabled' => 'true',
            'ghost_command_reply_enabled' => 'true',
            'ghost_auto_reply_max_active_users' => '3',
            'ghost_auto_reply_cooldown_seconds' => '300',
            'ghost_max_output_tokens' => '32',
            'ghost_request_timeout' => (string) config('ghost.request_timeout', 360),
            'ghost_max_concurrent_requests' => '1',
        ];

        foreach ($defaultSettings as $key => $value) {
            if (!AppSetting::where('key', $key)->exists()) {
                AppSetting::create([
                    'key' => $key,
                    'value' => (string) $value,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Additive migration: preserve data on rollback
    }
};
