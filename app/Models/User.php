<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'public_id',
        'display_name',
        'username',
        'username_normalized',
        'gender',
        'show_gender',
        'avatar_url',
        'password',
        'role',
        'status',
        'force_password_reset',
    ];

    protected $hidden = [
        'password',
        'id', // Keep numeric primary key hidden (§11)
    ];

    protected function casts(): array
    {
        return [
            'show_gender' => 'boolean',
            'force_password_reset' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($user) {
            if (empty($user->public_id)) {
                $user->public_id = (string) Str::ulid();
            }
        });
    }

    public function posts()
    {
        return $this->hasMany(Post::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function postVotes()
    {
        return $this->hasMany(PostVote::class);
    }

    public function recoveryRecord()
    {
        return $this->hasOne(PasswordRecovery::class);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'SUPER_ADMIN';
    }

    public function isBanned(): bool
    {
        return $this->status === 'BANNED';
    }
}
