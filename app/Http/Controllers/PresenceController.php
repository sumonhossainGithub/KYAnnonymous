<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PresenceController extends Controller
{
    /**
     * Handle lightweight presence heartbeat across the entire website.
     * Throttles SQLite session writes to at most once per 40 seconds per session.
     *
     * Framework-safe: Never overwrites or corrupts session payload, CSRF token,
     * or authentication data. When the session exists, touches only last_activity
     * and user_id. When inserting, stores authentic framework session data.
     */
    public function heartbeat(Request $request)
    {
        $session = $request->session();
        $sessionId = $session->getId();
        $now = time();
        $lastHeartbeat = (int) $session->get('last_presence_heartbeat', 0);

        // Throttle updates: client polls every 50s; don't write more often than 40s
        if ($now - $lastHeartbeat >= 40) {
            $session->put('last_presence_heartbeat', $now);
            $userId = $request->user()?->id;

            try {
                $existing = DB::table('sessions')->where('id', $sessionId)->first();

                if ($existing) {
                    // Update ONLY last_activity and user_id. Never alter existing payload!
                    DB::table('sessions')->where('id', $sessionId)->update([
                        'last_activity' => $now,
                        'user_id' => $userId,
                    ]);
                } else {
                    // If session record not yet in database, insert with authentic current session payload
                    DB::table('sessions')->insert([
                        'id' => $sessionId,
                        'user_id' => $userId,
                        'payload' => base64_encode(serialize($session->all())),
                        'last_activity' => $now,
                    ]);
                }
            } catch (\Throwable) {
                $session->save();
            }
        }

        return response()->json([
            'status' => 'ok',
            'server_time' => $now,
        ])->header('Cache-Control', 'no-store');
    }
}
