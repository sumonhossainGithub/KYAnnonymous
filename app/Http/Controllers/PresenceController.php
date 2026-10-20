<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PresenceController extends Controller
{
    /**
     * Handle lightweight presence heartbeat across the entire website.
     * Throttles SQLite session writes to at most once per 40 seconds per session.
     */
    public function heartbeat(Request $request)
    {
        $sessionId = session()->getId();
        $now = time();
        $lastHeartbeat = (int) session()->get('last_presence_heartbeat', 0);

        // Throttle database session writes to prevent SQLite lock contention
        if ($now - $lastHeartbeat >= 40) {
            session()->put('last_presence_heartbeat', $now);

            DB::table('sessions')->updateOrInsert(
                ['id' => $sessionId],
                [
                    'last_activity' => $now,
                    'user_id' => $request->user()?->id,
                    'payload' => base64_encode(serialize([])),
                ]
            );
        }

        return response()->json([
            'status' => 'ok',
            'server_time' => $now,
        ])->header('Cache-Control', 'no-store');
    }
}
