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
        if (!Schema::hasColumn('posts', 'is_ghost')) {
            Schema::table('posts', function (Blueprint $table) {
                $table->boolean('is_ghost')->default(false);
                $table->string('alias_name', 50)->nullable();
            });
        }

        if (!Schema::hasColumn('chat_messages', 'is_ghost')) {
            Schema::table('chat_messages', function (Blueprint $table) {
                $table->boolean('is_ghost')->default(false);
                $table->string('alias_name', 50)->nullable();
            });
        }

        if (!Schema::hasTable('app_settings')) {
            Schema::create('app_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key', 100)->unique();
                $table->text('value')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('app_settings');

        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn(['is_ghost', 'alias_name']);
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['is_ghost', 'alias_name']);
        });
    }
};
