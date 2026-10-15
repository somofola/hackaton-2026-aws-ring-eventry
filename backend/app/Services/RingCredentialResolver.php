<?php

namespace App\Services;

use App\Models\RingDevice;
use App\Models\RingOwnerCredential;
use App\Models\RingPlatformCredential;

/**
 * Resolves which Ring Developer app's credentials (client_id/secret,
 * hmac_secret) apply — Eventry's shared one (config/services.php, the
 * RING_CLIENT_ID/SECRET/HMAC_SECRET env values) or a corporate user's own
 * (RingOwnerCredential), for when they've onboarded their own devices under
 * their own Ring developer account instead of Eventry's.
 *
 * Used by RingOAuthController (owner_id comes from the Token Exchange /
 * Account Link URL path, since Ring doesn't otherwise tell us which app a
 * given OAuth callback belongs to) and RingWebhookController (owner_id comes
 * from looking up the device_id embedded in the webhook payload).
 */
class RingCredentialResolver
{
    /** @return array{client_id: ?string, client_secret: ?string, hmac_secret: ?string, partner_account_identifier: ?string} */
    public function forOwner(?int $ownerId): array
    {
        if ($ownerId) {
            $cred = RingOwnerCredential::where('owner_id', $ownerId)->first();

            if ($cred) {
                return [
                    'client_id' => $cred->client_id,
                    'client_secret' => $cred->client_secret,
                    'hmac_secret' => $cred->hmac_secret,
                    'partner_account_identifier' => $cred->partner_account_identifier,
                ];
            }
        }

        $platform = RingPlatformCredential::first();

        return [
            'client_id' => $platform?->client_id ?? config('services.ring.client_id'),
            'client_secret' => $platform?->client_secret ?? config('services.ring.client_secret'),
            'hmac_secret' => $platform?->hmac_secret ?? config('services.ring.hmac_secret'),
            'partner_account_identifier' => $platform?->partner_account_identifier ?? config('services.ring.partner_account_identifier'),
        ];
    }

    /**
     * For inbound webhooks, where we only have the device_id (parsed from
     * the payload) to identify which Ring app's hmac_secret applies.
     * Platform-pool devices (and any unrecognized device_id) use the shared
     * credentials.
     */
    public function forDeviceId(string $deviceId): array
    {
        $device = RingDevice::where('device_id', $deviceId)->first();
        $ownerId = ($device && $device->owner_type === 'corporate') ? $device->owner_id : null;

        return $this->forOwner($ownerId);
    }
}
