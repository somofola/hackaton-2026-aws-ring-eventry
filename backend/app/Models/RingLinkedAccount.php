<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per Eventry user who has completed Ring's one-way account linking
 * flow (RingOAuthController::confirm()). Replaces the old cache-only
 * "ring:linked_account:{user_id}" entry so a corporate user's own Ring
 * device keeps working across cache flushes/restarts without re-linking.
 */
class RingLinkedAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'ring_account_id',
        'access_token',
        'refresh_token',
        'expires_at',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'refresh_token' => 'encrypted',
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
