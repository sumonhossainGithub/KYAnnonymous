<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            if (!Schema::hasColumn('chat_messages', 'file_url')) {
                $table->string('file_url')->nullable();
            }
            if (!Schema::hasColumn('chat_messages', 'file_name')) {
                $table->string('file_name')->nullable();
            }
            if (!Schema::hasColumn('chat_messages', 'file_type')) {
                $table->string('file_type')->nullable();
            }
            if (!Schema::hasColumn('chat_messages', 'file_size')) {
                $table->unsignedBigInteger('file_size')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn(['file_url', 'file_name', 'file_type', 'file_size']);
        });
    }
};
