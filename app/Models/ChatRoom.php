<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ChatRoom extends Model
{
    protected $fillable = [
        'public_id',
        'name',
        'slug',
        'description',
        'password',
        'organization_id',
        'is_active',
        'created_by',
    ];

    protected $hidden = ['id', 'password', 'organization_id', 'created_by'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public static function purgeInactiveRooms(): int
    {
        $cutoff = now()->subDays(7);
        $defaultSlug = \App\Support\SiteSettings::get('default_room_slug') ?: 'common-orbit';

        $candidateRooms = self::where('slug', '!=', $defaultSlug)
            ->where('created_at', '<', $cutoff)
            ->get();

        $deletedCount = 0;

        foreach ($candidateRooms as $room) {
            $latestMessage = $room->messages()->latest('created_at')->first();

            // If no messages and created > 7 days ago, or latest message is older than 7 days
            if (!$latestMessage || $latestMessage->created_at < $cutoff) {
                $room->messages()->delete();
                $room->delete();
                $deletedCount++;
            }
        }

        return $deletedCount;
    }

    protected static function booted(): void
    {
        static::creating(function ($room) {
            if (empty($room->public_id)) {
                $room->public_id = (string) Str::ulid();
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function messages()
    {
        return $this->hasMany(ChatMessage::class);
    }
}
