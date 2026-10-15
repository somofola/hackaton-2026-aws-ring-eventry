<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RingDeviceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'requested_by_user_id',
        'location',
        'note',
        'event_id',
        'status',
        'ring_device_id',
    ];

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id');
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(RingDevice::class, 'ring_device_id');
    }
}
