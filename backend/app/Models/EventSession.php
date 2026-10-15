<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventSession extends Model
{
    use HasFactory;

    protected $table = 'event_sessions';

    protected $fillable = [
        'event_id',
        'title',
        'description',
        'start_time',
        'end_time',
        'speaker_ids',
        'location',
        'capacity',
    ];

    protected $casts = [
        'speaker_ids' => 'array',
        'capacity'    => 'integer',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function speakers()
    {
        return $this->belongsToMany(User::class, 'event_session_speakers', 'session_id', 'user_id');
    }
}
