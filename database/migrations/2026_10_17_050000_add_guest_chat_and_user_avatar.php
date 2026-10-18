<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'avatar_url')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('avatar_url', 500)->nullable();
            });
        }

        Schema::table('chat_messages', function (Blueprint $table) {
            if (config('database.default') !== 'sqlite') {
                $table->foreignId('user_id')->nullable()->change();
            }
            if (!Schema::hasColumn('chat_messages', 'is_guest')) {
                $table->boolean('is_guest')->default(false);
            }
            if (!Schema::hasColumn('chat_messages', 'is_ephemeral')) {
                $table->boolean('is_ephemeral')->default(false);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn(['is_guest', 'is_ephemeral']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('avatar_url');
        });
    }
};
