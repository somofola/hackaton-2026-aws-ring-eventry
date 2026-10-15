<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventSponsor extends Model
{
    protected $fillable = [
        'event_id',
        'name',
        'tier',
        'logo_url',
        'website',
        'description',
        'contact_name',
        'contact_email',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
