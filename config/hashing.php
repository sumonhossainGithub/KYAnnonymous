<?php

return [
    'driver' => 'argon2id',

    'argon' => [
        'memory' => 65536,
        'threads' => 2,
        'time' => 3,
    ],
];
