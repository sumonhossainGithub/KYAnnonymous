<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PollVote extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'poll_id',
        'option_index',
        'voter_key',
        'created_at',
    ];

    protected $casts = [
        'option_index' => 'integer',
        'created_at' => 'datetime',
    ];

    public function poll()
    {
        return $this->belongsTo(Poll::class);
    }
}
