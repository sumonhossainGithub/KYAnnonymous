<?php

return [
    'driver' => env('HASH_DRIVER', 'bcrypt'),

    'argon' => [
        'memory' => 65536,
        'threads' => 2,
        'time' => 3,
    ],
];
