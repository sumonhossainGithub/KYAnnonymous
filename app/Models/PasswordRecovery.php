<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordRecovery extends Model
{
    protected $table = 'password_recovery';

    protected $fillable = [
        'user_id',
        'recovery_code_hash',
        'attempts',
        'used_at',
    ];

    protected $hidden = [
        'recovery_code_hash',
    ];

    protected $casts = [
        'used_at' => 'datetime',
        'attempts' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
