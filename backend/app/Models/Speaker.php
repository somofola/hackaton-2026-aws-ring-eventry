<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Speaker extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'title',
        'company',
        'bio',
        'image_url',
        'social',
        'event_id',
    ];

    protected $casts = [
        'social' => 'array',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function sessions()
    {
        return $this->belongsToMany(Session::class, 'session_speakers');
    }
}
