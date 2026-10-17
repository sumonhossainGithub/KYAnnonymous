<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Report extends Model
{
    protected $fillable = [
        'public_id',
        'reporter_id',
        'target_type',
        'target_public_id',
        'reason',
        'notes',
        'status',
        'resolved_by',
        'resolved_at',
    ];

    protected $hidden = ['id', 'reporter_id', 'resolved_by'];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($report) {
            if (empty($report->public_id)) {
                $report->public_id = (string) Str::ulid();
            }
        });
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
