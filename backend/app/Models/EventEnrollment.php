<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'user_id',
        'user_name',
        'user_email',
        'enrolled_at',
        'status',
        'checked_in',
        'checked_in_at',
        'checked_in_by',
        'qr_code',
        'confirmation_number',
        'face_checkin_opt_in',
        'face_indexed_at',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
        'checked_in_at' => 'datetime',
        'checked_in' => 'boolean',
        'face_checkin_opt_in' => 'boolean',
        'face_indexed_at' => 'datetime',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
