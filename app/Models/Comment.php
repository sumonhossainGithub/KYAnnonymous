<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Comment extends Model
{
    protected $fillable = [
        'public_id',
        'post_id',
        'user_id',
        'parent_id',
        'depth',
        'body',
        'status',
        'edited_at',
    ];

    protected $hidden = ['id', 'post_id', 'user_id', 'parent_id'];

    protected $casts = [
        'depth' => 'integer',
        'edited_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($comment) {
            if (empty($comment->public_id)) {
                $comment->public_id = (string) Str::ulid();
            }
        });
    }

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function parent()
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    public function replies()
    {
        return $this->hasMany(Comment::class, 'parent_id');
    }
}
