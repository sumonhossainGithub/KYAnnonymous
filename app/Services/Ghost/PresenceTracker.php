<?php

namespace App\Services\Ghost;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class PresenceTracker
{
    /**
     * Activity expiration window in seconds.
     */
    public const DEFAULT_EXPIRATION_SECONDS = 120;

    /**
     * Get the count of distinct active users across the entire website.
     *
     * @param int|null $customWindowSeconds
     * @return int
     */
    public function getActiveUserCount(?int $customWindowSeconds = null): int
    {
        $window = $customWindowSeconds ?? self::DEFAULT_EXPIRATION_SECONDS;
        $threshold = time() - $window;

        // 1. Find Ghost AI service account ID to exclude
        $ghostUserId = User::where('username_normalized', 'ghost_ai')->value('id');

        // 2. Count distinct authenticated users
        $authQuery = DB::table('sessions')
            ->where('last_activity', '>=', $threshold)
            ->whereNotNull('user_id');

        if ($ghostUserId) {
            $authQuery->where('user_id', '!=', $ghostUserId);
        }

        $authenticatedCount = $authQuery->distinct()->count('user_id');

        // 3. Count distinct guest sessions (where user_id is null)
        $guestCount = DB::table('sessions')
            ->where('last_activity', '>=', $threshold)
            ->whereNull('user_id')
            ->distinct()
            ->count('id');

        return $authenticatedCount + $guestCount;
    }

    /**
     * Get a detailed breakdown of presence for the Super Admin dashboard.
     *
     * @param int|null $customWindowSeconds
     * @return array
     */
    public function getPresenceBreakdown(?int $customWindowSeconds = null): array
    {
        $window = $customWindowSeconds ?? self::DEFAULT_EXPIRATION_SECONDS;
        $threshold = time() - $window;

        $ghostUserId = User::where('username_normalized', 'ghost_ai')->value('id');

        $authQuery = DB::table('sessions')
            ->where('last_activity', '>=', $threshold)
            ->whereNotNull('user_id');

        if ($ghostUserId) {
            $authQuery->where('user_id', '!=', $ghostUserId);
        }

        $authenticatedCount = $authQuery->distinct()->count('user_id');

        $guestCount = DB::table('sessions')
            ->where('last_activity', '>=', $threshold)
            ->whereNull('user_id')
            ->distinct()
            ->count('id');

        return [
            'total_active' => $authenticatedCount + $guestCount,
            'authenticated' => $authenticatedCount,
            'guests' => $guestCount,
            'window_seconds' => $window,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}
