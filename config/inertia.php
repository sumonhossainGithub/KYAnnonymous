<?php

return [
    // This application mounts React in the browser and has no SSR entry point.
    // Inertia 3 otherwise POSTs to Vite's SSR endpoint on initial page loads.
    'ssr' => [
        'enabled' => (bool) env('INERTIA_SSR_ENABLED', false),
        'timeout' => 2,
        'ensure_bundle_exists' => true,
    ],
];
