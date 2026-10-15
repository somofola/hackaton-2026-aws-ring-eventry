<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventSpeaker extends Model
{
    use HasFactory;

    protected $table = 'event_speakers';

    protected $fillable = [
        'event_id',
        'user_id',
        'title',
        'company',
        'social',
    ];

    protected $casts = [
        'social' => 'array',
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
