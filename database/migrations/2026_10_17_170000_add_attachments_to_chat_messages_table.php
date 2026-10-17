<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->string('file_url')->nullable()->after('butterfly_count');
            $table->string('file_name')->nullable()->after('file_url');
            $table->string('file_type')->nullable()->after('file_name');
            $table->unsignedBigInteger('file_size')->nullable()->after('file_type');
        });
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn(['file_url', 'file_name', 'file_type', 'file_size']);
        });
    }
};
