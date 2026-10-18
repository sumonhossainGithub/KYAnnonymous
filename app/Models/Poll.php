<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Poll extends Model
{
    protected $fillable = [
        'public_id',
        'chat_room_id',
        'user_id',
        'question',
        'options',
        'expires_at',
        'is_active',
    ];

    protected $hidden = ['id', 'chat_room_id', 'user_id'];

    protected $casts = [
        'options' => 'array',
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($poll) {
            if (empty($poll->public_id)) {
                $poll->public_id = (string) Str::ulid();
            }
        });
    }

    public function chatRoom()
    {
        return $this->belongsTo(ChatRoom::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function votes()
    {
        return $this->hasMany(PollVote::class);
    }

    /**
     * Check if this poll has expired.
     */
    public function isExpired(): bool
    {
        if (!$this->expires_at) {
            return false;
        }

        return $this->expires_at->isPast();
    }

    /**
     * Tally the vote counts per option index.
     *
     * @return array<int, int> Keyed by option index, value is the count.
     */
    public function tallyResults(): array
    {
        $options = $this->options ?? [];
        $counts = array_fill(0, count($options), 0);

        $voteCounts = $this->votes()
            ->selectRaw('option_index, COUNT(*) as total')
            ->groupBy('option_index')
            ->pluck('total', 'option_index')
            ->toArray();

        foreach ($voteCounts as $index => $total) {
            if (isset($counts[$index])) {
                $counts[$index] = (int) $total;
            }
        }

        return $counts;
    }
}
