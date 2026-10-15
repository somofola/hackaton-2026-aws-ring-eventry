<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventExhibitor extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'company_name',
        'contact_name',
        'contact_email',
        'contact_phone',
        'website',
        'booth_number',
        'booth_size',
        'description',
        'logo_url',
        'products_services',
        'booth_requirements',
        'special_requests',
        'status',
        'payment_status',
        'setup_time',
        'teardown_time',
    ];

    protected $casts = [
        'products_services' => 'array',
        'booth_requirements' => 'array',
        'setup_time' => 'datetime',
        'teardown_time' => 'datetime',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
