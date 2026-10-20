<?php

namespace App\Services\Ghost;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GhostAIService
{
    /**
     * System prompt establishing Ghost's personality and safety guidelines.
     */
    public const SYSTEM_PROMPT = <<<EOT
You are Ghost (👻), a friendly and slightly witty AI chat companion on the KYAnonymous community website.
Guidelines:
- Language: Reply naturally in conversational Bangla, Banglish, or English, matching whatever language or mix the user spoke.
- Tone: Friendly, casual, respectful, warm, and concise.
- Length: Keep responses short and punchy (1 to 2 sentences maximum).
- Authenticity: You are an AI companion. Never invent personal human experiences, never claim to be human, and never pretend to have physical senses or real-world locations.
- Style: Use light emoticons occasionally (like 👻) if fitting. Never output internal thought tags or <think> tags.
EOT;

    /**
     * Check if Ghost AI is globally enabled across both environment and database settings.
     *
     * Precedence Rule:
     * 1. GHOST_AI_ENABLED in config/ghost.php is the Master Infrastructure Kill Switch.
     * 2. ghost_ai_enabled in AppSetting is the Runtime Super Admin Toggle.
     * Ghost only runs if BOTH are TRUE. If either is OFF, all AI operations are suppressed.
     * Read through config() so that 'php artisan config:cache' works seamlessly.
     */
    public static function isGloballyEnabled(): bool
    {
        if (!config('ghost.enabled', false)) {
            return false;
        }

        return AppSetting::isTrue('ghost_ai_enabled');
    }

    /**
     * Get the configured API endpoint.
     */
    public function getEndpoint(): string
    {
        return AppSetting::get('ghost_ai_endpoint', config('ghost.endpoint', 'http://127.0.0.1:8081/v1/chat/completions'));
    }

    /**
     * Check if the AI HTTP server is reachable.
     */
    public function checkHealth(): array
    {
        $endpoint = $this->getEndpoint();
        $base = preg_replace('/\/v1\/.*$/', '', $endpoint);
        $startTime = microtime(true);

        try {
            // Try /health or fallback to /v1/models
            $response = Http::timeout(4)->get($base . '/health');
            if (!$response->successful()) {
                $response = Http::timeout(4)->get($base . '/v1/models');
            }

            $latencyMs = round((microtime(true) - $startTime) * 1000);
            $isHealthy = $response->successful();

            $status = [
                'status' => $isHealthy ? 'ONLINE' : 'ERROR',
                'status_code' => $response->status(),
                'latency_ms' => $latencyMs,
                'endpoint' => $endpoint,
                'checked_at' => now()->toIso8601String(),
                'error' => $isHealthy ? null : 'HTTP ' . $response->status() . ': ' . substr($response->body(), 0, 100),
            ];

            Cache::put('ghost_ai:health_status', $status, 60);
            return $status;
        } catch (\Throwable $e) {
            $status = [
                'status' => 'OFFLINE',
                'status_code' => 0,
                'latency_ms' => null,
                'endpoint' => $endpoint,
                'checked_at' => now()->toIso8601String(),
                'error' => $e->getMessage(),
            ];

            Cache::put('ghost_ai:health_status', $status, 60);
            return $status;
        }
    }

    /**
     * Generate an AI reply from message history and prompt.
     *
     * @param array $conversationContext Array of ['role' => 'user'|'assistant', 'content' => string]
     * @param int|null $maxTokens
     * @param int|null $timeout
     * @return string|null
     */
    public function generateReply(array $conversationContext, ?int $maxTokens = null, ?int $timeout = null): ?string
    {
        $endpoint = $this->getEndpoint();
        $apiKey = config('ghost.api_key', null);
        $tokens = $maxTokens ?? (int) AppSetting::get('ghost_max_output_tokens', config('ghost.max_output_tokens', 32));
        $timeoutSeconds = $timeout ?? (int) AppSetting::get('ghost_request_timeout', config('ghost.request_timeout', 360));

        // Build messages payload with strict system prompt
        $messages = [
            ['role' => 'system', 'content' => self::SYSTEM_PROMPT],
        ];

        $charLimit = (int) config('ghost.context_max_chars_per_message', 200);
        foreach ($conversationContext as $item) {
            if (!empty($item['content']) && in_array($item['role'], ['user', 'assistant'])) {
                $messages[] = [
                    'role' => $item['role'],
                    'content' => mb_substr(trim($item['content']), 0, $charLimit),
                ];
            }
        }

        $payload = [
            'messages' => $messages,
            'max_tokens' => $tokens,
            'temperature' => 0.7,
            'stream' => false,
            'chat_template_kwargs' => [
                'enable_thinking' => false,
            ],
        ];

        try {
            $client = Http::timeout($timeoutSeconds);
            if ($apiKey) {
                $client = $client->withToken($apiKey);
            }

            $response = $client->post($endpoint, $payload);

            if (!$response->successful()) {
                $err = "AI endpoint returned HTTP {$response->status()}: " . substr($response->body(), 0, 150);
                $this->recordError($err);
                return null;
            }

            $data = $response->json();
            $rawContent = $data['choices'][0]['message']['content'] ?? null;

            if (!$rawContent) {
                $this->recordError('AI endpoint returned empty message content');
                return null;
            }

            $cleaned = $this->sanitizeOutput($rawContent);

            if (empty($cleaned)) {
                return null;
            }

            // Record success for Super Admin dashboard
            $this->recordSuccess($cleaned);

            return $cleaned;
        } catch (\Throwable $e) {
            $this->recordError($e->getMessage());
            return null;
        }
    }

    /**
     * Sanitize and clean raw LLM output.
     */
    public function sanitizeOutput(string $raw): string
    {
        // 1. Strip <think>...</think> reasoning blocks
        $text = preg_replace('/<think>.*?<\/think>/is', '', $raw);
        $text = preg_replace('/<think>.*$/is', '', $text); // If unclosed

        // 2. Strip system / role leakage
        $text = preg_replace('/^(Ghost|System|Assistant):\s*/i', '', trim($text));

        // 3. Strip HTML tags
        $text = strip_tags($text);

        // 4. Normalize whitespace
        $text = preg_replace('/\s+/', ' ', $text);

        return trim($text);
    }

    /**
     * Record last successful AI generation in cache.
     */
    protected function recordSuccess(string $content): void
    {
        Cache::put('ghost_ai:last_success', [
            'snippet' => mb_substr($content, 0, 120),
            'timestamp' => now()->toIso8601String(),
        ], 86400);

        Cache::increment('ghost_ai:total_success_count');
    }

    /**
     * Record last AI error in cache and log.
     */
    protected function recordError(string $error): void
    {
        Log::warning('Ghost AI Error: ' . $error);

        Cache::put('ghost_ai:last_error', [
            'message' => mb_substr($error, 0, 200),
            'timestamp' => now()->toIso8601String(),
        ], 86400);

        Cache::increment('ghost_ai:total_error_count');
    }
}
