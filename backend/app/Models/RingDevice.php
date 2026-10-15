<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RingDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'device_id',
        'name',
        'location',
        'owner_type',
        'owner_id',
        'status',
        'assigned_event_id',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function assignedEvent(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'assigned_event_id');
    }
}
