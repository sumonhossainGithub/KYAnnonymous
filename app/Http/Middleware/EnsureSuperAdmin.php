<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * Enforce strict Super Admin access control (§22, §26).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || $user->role !== 'SUPER_ADMIN' || $user->status !== 'ACTIVE') {
            abort(403, 'Unauthorized. Super Admin access required.');
        }

        return $next($request);
    }
}
