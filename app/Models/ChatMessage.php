<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class ChatMessage extends Model
{
    protected $fillable = [
        'public_id',
        'chat_room_id',
        'parent_id',
        'user_id',
        'message',
        'is_ghost',
        'is_guest',
        'is_ephemeral',
        'alias_name',
    ];

    protected $casts = [
        'is_ghost' => 'boolean',
        'is_guest' => 'boolean',
        'is_ephemeral' => 'boolean',
    ];

    protected $hidden = ['id', 'chat_room_id', 'user_id', 'parent_id'];

    protected static function booted(): void
    {
        static::creating(function ($message) {
            if (empty($message->public_id)) {
                $message->public_id = (string) Str::ulid();
            }
        });
    }

    public function chatRoom()
    {
        return $this->belongsTo(ChatRoom::class);
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function parent()
    {
        return $this->belongsTo(ChatMessage::class, 'parent_id');
    }

    public function subChats()
    {
        return $this->hasMany(ChatMessage::class, 'parent_id')->orderBy('id', 'asc');
    }
}
