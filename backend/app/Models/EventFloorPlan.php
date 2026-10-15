<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventFloorPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'name',
        'description',
        'floor_plan_url',
        'floor_number',
        'areas',
        'width',
        'height',
        'capacity',
        'facilities',
        'accessibility_features',
        'emergency_exits',
        'is_active',
    ];

    protected $casts = [
        'areas' => 'array',
        'facilities' => 'array',
        'accessibility_features' => 'array',
        'emergency_exits' => 'array',
        'is_active' => 'boolean',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
