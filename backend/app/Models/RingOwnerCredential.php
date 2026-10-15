<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A corporate user's own Ring Developer app credentials — client_id/secret
 * for the OAuth token exchange, and hmac_secret for verifying that app's
 * webhook signatures. Used instead of the shared RING_CLIENT_ID/SECRET/
 * HMAC_SECRET env values when a corporate onboards their own device under
 * their own Ring developer account rather than Eventry's.
 */
class RingOwnerCredential extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'client_id',
        'client_secret',
        'hmac_secret',
        'partner_account_identifier',
    ];

    protected $casts = [
        'client_secret' => 'encrypted',
        'hmac_secret' => 'encrypted',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }
}
