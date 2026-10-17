<?php

namespace App\Support;

use Illuminate\Support\Str;

class Anonymity
{
    /**
     * Compute a pseudonymous HMAC digest from an IP address using APP_KEY or HMAC_SECRET.
     * Never stores or returns the raw IP (§29).
     */
    public static function hashIp(?string $ip): string
    {
        if (empty($ip)) {
            return 'unknown-client';
        }

        $secret = config('app.rate_limit_secret') ?? config('app.key') ?? 'fallback-kyanonymous-secret';
        
        return hash_hmac('sha256', $ip, $secret);
    }

    /**
     * Normalize username according to NFKC policy (§6).
     */
    public static function normalizeUsername(string $username): string
    {
        $cleaned = trim($username);
        if (str_starts_with($cleaned, '@')) {
            $cleaned = substr($cleaned, 1);
        }

        if (class_exists('Normalizer')) {
            $cleaned = \Normalizer::normalize($cleaned, \Normalizer::FORM_KC) ?: $cleaned;
        }

        return mb_strtolower($cleaned, 'UTF-8');
    }

    /**
     * Generate secure single-use recovery code formatted as XXXX-XXXX-XXXX (§10).
     */
    public static function generateRecoveryCode(): string
    {
        $bytes = random_bytes(6);
        $hex = strtoupper(bin2hex($bytes));
        return substr($hex, 0, 4) . '-' . substr($hex, 4, 4) . '-' . substr($hex, 8, 4);
    }
}
