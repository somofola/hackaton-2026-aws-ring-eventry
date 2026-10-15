<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Session extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'start_time',
        'end_time',
        'speaker_ids',
        'location',
        'capacity',
        'event_id',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'speaker_ids' => 'array',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function speakers()
    {
        return $this->belongsToMany(Speaker::class, 'session_speakers');
    }
}
