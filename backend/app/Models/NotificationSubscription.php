<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class NotificationSubscription extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'notification_type_id', 'channel', 'enabled'];

    protected $casts = [
        'enabled' => 'boolean',
    ];

    public function notificationType()
    {
        return $this->belongsTo(NotificationType::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
