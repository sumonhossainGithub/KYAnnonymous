<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Post extends Model
{
    protected $fillable = [
        'public_id',
        'user_id',
        'organization_id',
        'title',
        'body',
        'upvotes_count',
        'downvotes_count',
        'score',
        'comments_count',
        'comments_locked',
        'status',
        'is_ghost',
        'alias_name',
        'edited_at',
        'image_url',
    ];

    protected $hidden = ['id', 'user_id', 'organization_id'];

    protected $casts = [
        'comments_locked' => 'boolean',
        'is_ghost' => 'boolean',
        'edited_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($post) {
            if (empty($post->public_id)) {
                $post->public_id = (string) Str::ulid();
            }
        });
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function votes()
    {
        return $this->hasMany(PostVote::class);
    }
}
