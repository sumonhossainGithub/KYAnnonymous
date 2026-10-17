<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
        <meta name="referrer" content="no-referrer">
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
        <!-- Zero external fonts or CDN trackers (§28). Anti-trace hardened. -->
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👻</text></svg>">
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="bg-gray-950 text-gray-100 antialiased min-h-screen">
        @inertia
    </body>
</html>
