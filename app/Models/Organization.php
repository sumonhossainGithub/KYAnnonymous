<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Organization extends Model
{
    protected $fillable = [
        'public_id',
        'name',
        'slug',
        'description',
        'status',
        'sort_order',
    ];

    protected $hidden = ['id'];

    protected static function booted(): void
    {
        static::creating(function ($org) {
            if (empty($org->public_id)) {
                $org->public_id = (string) Str::ulid();
            }
        });
    }

    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    public function notices()
    {
        return $this->hasMany(Notice::class);
    }

    public function chatRooms()
    {
        return $this->hasMany(ChatRoom::class);
    }
}
