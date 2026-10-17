<?php

namespace App\Support;

use Illuminate\Contracts\Auth\Guard;
use Illuminate\Session\DatabaseSessionHandler;

class AnonymousDatabaseSessionHandler extends DatabaseSessionHandler
{
    /**
     * Add the request information to the session payload.
     * Completely overridden to strictly NEVER write ip_address or user_agent (§29, §37).
     *
     * @param  array  $payload
     * @return $this
     */
    protected function addRequestInformation(&$payload)
    {
        // Strictly omit IP address and User Agent (§29, §37)
        return $this;
    }
}
