<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNotBanned
{
    /**
     * Terminate requests from banned users immediately.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->status === 'BANNED') {
            auth()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->wantsJson()) {
                return response()->json(['message' => 'Account has been banned.'], 403);
            }

            return redirect()->route('login')->withErrors(['username' => 'Your account has been suspended or banned.']);
        }

        return $next($request);
    }
}
