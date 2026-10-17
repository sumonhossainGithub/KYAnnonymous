<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     * Never share internal numeric database IDs or unneeded sensitive properties (§11).
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return array_merge(parent::share($request), [
            'site' => fn () => \App\Support\SiteSettings::all(),
            'auth' => [
                'user' => $user ? [
                    'public_id' => $user->public_id,
                    'display_name' => $user->display_name,
                    'username' => $user->username,
                    'role' => $user->role,
                    'gender' => $user->show_gender ? $user->gender : null,
                    'avatar_url' => $user->avatar_url,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'recovery_code' => fn () => $request->session()->get('recovery_code'),
            ],
        ]);
    }
}
