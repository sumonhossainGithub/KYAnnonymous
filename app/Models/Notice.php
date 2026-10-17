<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Notice extends Model
{
    protected $fillable = [
        'public_id',
        'organization_id',
        'title',
        'body',
        'pinned',
        'status',
        'published_at',
        'expires_at',
    ];

    protected $hidden = ['id', 'organization_id'];

    protected $casts = [
        'pinned' => 'boolean',
        'published_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($notice) {
            if (empty($notice->public_id)) {
                $notice->public_id = (string) Str::ulid();
            }
        });
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }
}
