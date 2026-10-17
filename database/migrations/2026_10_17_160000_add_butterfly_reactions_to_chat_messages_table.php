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
        if (!Schema::hasColumn('chat_messages', 'butterfly_count')) {
            Schema::table('chat_messages', function (Blueprint $table) {
                $table->unsignedInteger('butterfly_count')->default(0);
            });
        }

        if (!Schema::hasTable('chat_message_reactions')) {
            Schema::create('chat_message_reactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('chat_message_id')->constrained('chat_messages')->cascadeOnDelete();
                $table->string('user_id');
                $table->timestamp('created_at')->nullable();
                $table->index(['chat_message_id', 'user_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_message_reactions');
        if (Schema::hasColumn('chat_messages', 'butterfly_count')) {
            Schema::table('chat_messages', function (Blueprint $table) {
                $table->dropColumn('butterfly_count');
            });
        }
    }
};
