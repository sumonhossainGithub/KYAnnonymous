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
        // 1. Users table (§4, §5, §6, §7, §22)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->string('display_name', 50);
            $table->string('username', 30);
            $table->string('username_normalized', 30)->unique();
            $table->enum('gender', ['Male', 'Female']);
            $table->boolean('show_gender')->default(false);
            $table->string('password');
            $table->enum('role', ['USER', 'SUPER_ADMIN'])->default('USER');
            $table->enum('status', ['ACTIVE', 'SUSPENDED', 'BANNED'])->default('ACTIVE');
            $table->boolean('force_password_reset')->default(false);
            $table->timestamps();

            $table->index('status');
        });

        // PostgreSQL partial unique index ensuring only ONE SUPER_ADMIN exists in the entire database (§22)
        // Note: Raw DB statement handled safely for PostgreSQL
        if (config('database.default') === 'pgsql') {
            \Illuminate\Support\Facades\DB::statement('CREATE UNIQUE INDEX users_single_super_admin_idx ON users (role) WHERE role = \'SUPER_ADMIN\';');
        }

        // 2. Sessions table (§29, §37)
        // [v2 FIX]: NO ip_address or user_agent columns exist here!
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->text('payload');
            $table->integer('last_activity')->index();
        });

        // 3. Password recovery table (§10)
        Schema::create('password_recovery', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('recovery_code_hash');
            $table->integer('attempts')->default(0);
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index('user_id');
        });

        // 4. Organizations table (§12, §63)
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->string('name', 100);
            $table->string('slug', 100)->unique();
            $table->text('description')->nullable();
            $table->enum('status', ['ACTIVE', 'HIDDEN', 'ARCHIVED'])->default('ACTIVE');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 5. Posts table (§13, §14, §16)
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title', 200);
            $table->text('body');
            $table->integer('upvotes_count')->default(0);
            $table->integer('downvotes_count')->default(0);
            $table->integer('score')->default(0);
            $table->integer('comments_count')->default(0);
            $table->boolean('comments_locked')->default(false);
            $table->enum('status', ['ACTIVE', 'REMOVED_BY_AUTHOR', 'REMOVED_BY_ADMIN'])->default('ACTIVE');
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();

            $table->index('created_at');
            $table->index('score');
            $table->index('comments_count');
            $table->index(['organization_id', 'created_at']);
        });

        // 6. Post votes table (§14)
        Schema::create('post_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('vote'); // +1 or -1
            $table->timestamps();

            $table->unique(['post_id', 'user_id']);
        });

        // 7. Comments table (§15)
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('comments')->nullOnDelete();
            $table->integer('depth')->default(0); // Max 3
            $table->text('body');
            $table->enum('status', ['ACTIVE', 'DELETED', 'REMOVED_BY_ADMIN'])->default('ACTIVE');
            $table->timestamp('edited_at')->nullable();
            $table->timestamps();

            $table->index('post_id');
            $table->index('parent_id');
            $table->index('created_at');
        });

        // 8. Notices table (§18)
        Schema::create('notices', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title', 200);
            $table->text('body');
            $table->boolean('pinned')->default(false);
            $table->enum('status', ['PUBLISHED', 'DRAFT', 'EXPIRED'])->default('PUBLISHED');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'published_at']);
            $table->index('pinned');
        });

        // 9. Chat rooms and messages (§19, §20)
        Schema::create('chat_rooms', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->string('name', 100);
            $table->string('slug', 100)->unique();
            $table->text('description')->nullable();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('chat_room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('message');
            $table->timestamps();

            $table->index(['chat_room_id', 'created_at']);
        });

        // 10. Reports table (§21)
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->string('target_type', 30); // post, comment, chat_message, user
            $table->string('target_public_id', 26);
            $table->enum('reason', ['Spam', 'Harassment', 'Threat', 'Personal Information', 'Abuse', 'Impersonation', 'Other']);
            $table->text('notes')->nullable();
            $table->enum('status', ['PENDING', 'RESOLVED', 'DISMISSED'])->default('PENDING');
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->unique(['reporter_id', 'target_type', 'target_public_id']);
            $table->index('status');
        });

        // 11. Moderation & Audit Logs (§27)
        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 50); // e.g. USER_BANNED, POST_REMOVED
            $table->string('target_type', 30)->nullable();
            $table->string('target_public_id', 26)->nullable();
            $table->json('safe_metadata')->nullable(); // No secrets (§27)
            $table->timestamp('created_at')->useCurrent();

            $table->index('action');
            $table->index('created_at');
        });

        // 12. Security Events (§27, §33)
        Schema::create('security_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_type', 50); // LOGIN_FAIL_HASHED, RATE_LIMIT_TRIPPED
            $table->string('pseudonymous_digest', 64)->nullable(); // HMAC only, no raw IP (§29)
            $table->json('details')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('event_type');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('security_events');
        Schema::dropIfExists('admin_audit_logs');
        Schema::dropIfExists('reports');
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_rooms');
        Schema::dropIfExists('notices');
        Schema::dropIfExists('comments');
        Schema::dropIfExists('post_votes');
        Schema::dropIfExists('posts');
        Schema::dropIfExists('organizations');
        Schema::dropIfExists('password_recovery');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('users');
    }
};
