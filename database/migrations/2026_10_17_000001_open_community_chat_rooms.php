<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
        });

        foreach ([
            ['The common orbit', 'common-orbit', 'A little hello can become a meaningful connection. Everyone is welcome here.'],
            ['Quiet thoughts', 'quiet-thoughts', 'For the thoughts you have been holding onto. Share at your own pace.'],
            ['After hours', 'after-hours', 'Late-night ideas, small wonders, and conversations under the same sky.'],
        ] as [$name, $slug, $description]) {
            if (!DB::table('chat_rooms')->where('slug', $slug)->exists()) {
                DB::table('chat_rooms')->insert([
                    'public_id' => (string) Str::ulid(), 'name' => $name, 'slug' => $slug,
                    'description' => $description, 'is_active' => true,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Preserve rooms and conversations when rolling back ownership metadata.
        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
        });
    }
};
