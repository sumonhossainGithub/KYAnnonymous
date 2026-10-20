<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Ghost AI Infrastructure Master Switch
    |--------------------------------------------------------------------------
    | When false, Ghost AI is completely disabled across the application.
    | This acts as the emergency infrastructure kill switch in .env.
    | To run, BOTH this flag and the database setting 'ghost_ai_enabled' must be true.
    */
    'enabled' => filter_var(env('GHOST_AI_ENABLED', false), FILTER_VALIDATE_BOOLEAN),

    /*
    |--------------------------------------------------------------------------
    | Inference Endpoint & Authentication
    |--------------------------------------------------------------------------
    | Points to the local ARM64 llama.cpp instance on Android Termux.
    */
    'endpoint' => env('GHOST_AI_ENDPOINT', 'http://127.0.0.1:8081/v1/chat/completions'),
    'api_key' => env('GHOST_AI_API_KEY', null),

    /*
    |--------------------------------------------------------------------------
    | Operating Limits & Gating
    |--------------------------------------------------------------------------
    | - max_active_users: Mode A (0 to 3) allows automatic chat; Mode B (4+) stops auto chat.
    | - auto_reply_enabled: Default toggle for unsolicited chatter.
    | - command_reply_enabled: Default toggle for explicit /ai commands.
    */
    'max_active_users' => (int) env('GHOST_AUTO_REPLY_MAX_ACTIVE_USERS', 3),
    'auto_reply_enabled' => filter_var(env('GHOST_AUTO_REPLY_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
    'command_reply_enabled' => filter_var(env('GHOST_COMMAND_REPLY_ENABLED', true), FILTER_VALIDATE_BOOLEAN),

    /*
    |--------------------------------------------------------------------------
    | Realistic Timing for ~0.1 tokens/sec Generation
    |--------------------------------------------------------------------------
    | On Android ARM64 generating at ~0.1 tok/sec:
    |   - 24 to 32 tokens takes ~240 to 320 seconds (4 to 5.3 minutes).
    |
    | Strict Timeout Hierarchy to prevent overlapping execution:
    |   request_timeout (360s) < job_timeout (400s) < worker_timeout (420s)
    |     < queue_retry_after (480s) < lock_ttl (550s)
    */
    'max_output_tokens' => (int) env('GHOST_MAX_OUTPUT_TOKENS', 32),
    'cooldown_seconds' => (int) env('GHOST_AUTO_REPLY_COOLDOWN_SECONDS', 300),
    'request_timeout' => (int) env('GHOST_REQUEST_TIMEOUT', 360), // HTTP timeout (seconds)
    'job_timeout' => 400,                                         // Max Job runtime (seconds)
    'worker_timeout' => 420,                                      // Worker process timeout (seconds)
    'retry_after' => 480,                                         // Queue retry_after (seconds)
    'lock_ttl' => 550,                                            // Cache lock TTL (seconds)

    /*
    |--------------------------------------------------------------------------
    | Queue Capacity Protection
    |--------------------------------------------------------------------------
    | Strictly bounds queue sizes to prevent pileup on limited phone CPU/RAM.
    */
    'max_pending_commands' => 5,
    'max_pending_auto' => 1,
    'context_message_limit' => 4,
    'context_max_chars_per_message' => 200,
];
