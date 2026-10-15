<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Singleton settings row — Eventry's own shared Ring Developer app +
 * Playground access token. Replaces the RING_ACCESS_TOKEN / RING_CLIENT_ID /
 * RING_CLIENT_SECRET / RING_HMAC_SECRET / RING_PARTNER_ACCOUNT_IDENTIFIER env
 * values as the primary source; those envs remain a fallback (see
 * RingService::resolveAccessToken(), RingCredentialResolver::forOwner()).
 */
class RingPlatformCredential extends Model
{
    use HasFactory;

    protected $fillable = [
        'access_token',
        'client_id',
        'client_secret',
        'hmac_secret',
        'partner_account_identifier',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'client_secret' => 'encrypted',
        'hmac_secret' => 'encrypted',
    ];
}
