<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Enforce strict security headers & Content-Security-Policy (§43).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), bluetooth=(), interest-cohort=(), browsing-topics=(), idle-detection=(), screen-wake-lock=(), serial=(), web-share=(), gyroscope=(), accelerometer=(), magnetometer=()');
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');

        if (app()->environment('production')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        // Strict CSP: Same origin assets, allow WebSockets to self/wss, no tracking scripts (§28, §43)
        // Vite serves development assets from a different origin than Laravel.
        // Read its actual URL so the policy also follows custom dev server ports.
        $devOrigin = '';
        if (app()->environment('local') && Vite::isRunningHot()) {
            $devOrigin = ' '.rtrim(trim(file_get_contents(Vite::hotFile())), '/');
        }

        $csp = "default-src 'self'; script-src 'self' 'unsafe-inline'{$devOrigin}; style-src 'self' 'unsafe-inline'{$devOrigin}; img-src 'self' data:{$devOrigin}; connect-src 'self' ws: wss:{$devOrigin}; font-src 'self'{$devOrigin}; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';";
        $response->headers->set('Content-Security-Policy', $csp);

        return $response;
    }
}
