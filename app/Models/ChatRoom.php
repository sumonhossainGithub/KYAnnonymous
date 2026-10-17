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
        'organization_id',
        'is_active',
        'created_by',
    ];

    protected $hidden = ['id', 'organization_id', 'created_by'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

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
