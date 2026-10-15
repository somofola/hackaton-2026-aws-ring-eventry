<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class NotificationType extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'label', 'description', 'available_channels', 'is_active'];

    protected $casts = [
        'available_channels' => 'array',
        'is_active'          => 'boolean',
    ];

    public function subscriptions()
    {
        return $this->hasMany(NotificationSubscription::class);
    }

    public function notifications()
    {
        return $this->hasMany(AppNotification::class);
    }
}
