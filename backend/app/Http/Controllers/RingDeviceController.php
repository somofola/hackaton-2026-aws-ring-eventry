<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\RingDevice;
use App\Models\RingDeviceRequest;
use App\Models\RingOwnerCredential;
use App\Models\RingPlatformCredential;
use Illuminate\Http\Request;

/**
 * Device registry for Ring check-in hardware — separate from the runtime
 * cache mapping in RingWebhookController::arm()/disarm() (which this
 * controller also writes to, so both stay in sync). Two ownership paths:
 *
 *   - Admin onboards devices into a shared pool (owner_type=platform) and
 *     assigns them to whichever event is using the counter.
 *   - A corporate user onboards their own device (owner_type=corporate,
 *     owner_id=their user id) — those use the corporate's own linked Ring
 *     OAuth token (see RingOAuthController) instead of the shared
 *     RING_ACCESS_TOKEN, resolved in RingService::resolveAccessToken().
 *
 * Corporate users without their own hardware can instead file a
 * RingDeviceRequest for admin to fulfill from the pool.
 */
class RingDeviceController extends Controller
{
    // --- Admin: manage the shared device pool ---

    public function adminIndex()
    {
        return RingDevice::with(['owner:id,name,email,company', 'assignedEvent:id,uuid,title'])
            ->orderByDesc('id')
            ->get();
    }

    public function adminStore(Request $request)
    {
        $validated = $request->validate([
            'device_id' => 'required|string|max:255|unique:ring_devices,device_id',
            'name' => 'required|string|max:120',
            'location' => 'nullable|string|max:255',
        ]);

        $device = RingDevice::create([
            ...$validated,
            'owner_type' => 'platform',
            'status' => 'available',
        ]);

        return response()->json($device, 201);
    }

    public function adminUpdate(Request $request, RingDevice $ringDevice)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:120',
            'location' => 'sometimes|nullable|string|max:255',
        ]);

        $ringDevice->update($validated);

        return response()->json($ringDevice);
    }

    public function adminDestroy(RingDevice $ringDevice)
    {
        cache()->forget("ring:device:{$ringDevice->device_id}:armed_event_id");
        $ringDevice->delete();

        return response()->json(['status' => 'deleted']);
    }

    /** Assign (or unassign, with event_id omitted) a device to an event — mirrors RingWebhookController::arm()/disarm(). */
    public function adminAssignEvent(Request $request, RingDevice $ringDevice)
    {
        $validated = $request->validate(['event_id' => 'nullable|integer|exists:events,id']);
        $eventId = $validated['event_id'] ?? null;

        $ringDevice->update([
            'assigned_event_id' => $eventId,
            'status' => $eventId ? 'assigned' : 'available',
        ]);

        if ($eventId) {
            cache()->put("ring:device:{$ringDevice->device_id}:armed_event_id", $eventId, now()->addHours(24));
        } else {
            cache()->forget("ring:device:{$ringDevice->device_id}:armed_event_id");
        }

        return response()->json($ringDevice);
    }

    /** Lightweight event picker for the assign-to-event dropdown — avoids the heavy relations EventController::index() eager-loads. */
    public function adminEventOptions()
    {
        return Event::select('id', 'uuid', 'title', 'start_date')
            ->orderByDesc('start_date')
            ->limit(500)
            ->get();
    }

    public function adminRequests()
    {
        return RingDeviceRequest::with(['requestedBy:id,name,email,company', 'event:id,uuid,title', 'device'])
            ->orderByDesc('id')
            ->get();
    }

    public function adminFulfillRequest(Request $request, RingDeviceRequest $ringDeviceRequest)
    {
        $validated = $request->validate([
            'ring_device_id' => 'required|integer|exists:ring_devices,id',
        ]);

        $device = RingDevice::findOrFail($validated['ring_device_id']);

        $device->update([
            'assigned_event_id' => $ringDeviceRequest->event_id,
            'status' => 'assigned',
        ]);

        if ($ringDeviceRequest->event_id) {
            cache()->put("ring:device:{$device->device_id}:armed_event_id", $ringDeviceRequest->event_id, now()->addHours(24));
        }

        $ringDeviceRequest->update([
            'status' => 'fulfilled',
            'ring_device_id' => $device->id,
        ]);

        return response()->json($ringDeviceRequest->load(['device', 'requestedBy:id,name,email']));
    }

    public function adminRejectRequest(RingDeviceRequest $ringDeviceRequest)
    {
        $ringDeviceRequest->update(['status' => 'rejected']);

        return response()->json($ringDeviceRequest);
    }

    // --- Corporate / team: self-service, scoped to the caller's own corporate account ---

    private function ownerIds(Request $request): array
    {
        $user = $request->user();

        return array_values(array_filter([$user->id, $user->corporate_id]));
    }

    /**
     * Devices usable for check-in by the caller: their own onboarded
     * devices, plus (if ?event_id is passed) any platform-pool device
     * admin has assigned to that specific event.
     */
    public function myDevices(Request $request)
    {
        $eventId = $request->query('event_id');

        return RingDevice::where(function ($query) use ($request, $eventId) {
            $query->where(function ($q) use ($request) {
                $q->where('owner_type', 'corporate')->whereIn('owner_id', $this->ownerIds($request));
            });

            if ($eventId) {
                $query->orWhere('assigned_event_id', $eventId);
            }
        })
            ->with('assignedEvent:id,uuid,title')
            ->orderByDesc('id')
            ->get();
    }

    public function onboardOwnDevice(Request $request)
    {
        $validated = $request->validate([
            'device_id' => 'required|string|max:255|unique:ring_devices,device_id',
            'name' => 'required|string|max:120',
            'location' => 'nullable|string|max:255',
        ]);

        $device = RingDevice::create([
            ...$validated,
            'owner_type' => 'corporate',
            'owner_id' => $request->user()->id,
            'status' => 'available',
        ]);

        return response()->json($device, 201);
    }

    public function myRequests(Request $request)
    {
        return RingDeviceRequest::where('requested_by_user_id', $request->user()->id)
            ->with(['device', 'event:id,uuid,title'])
            ->orderByDesc('id')
            ->get();
    }

    public function requestDevice(Request $request)
    {
        $validated = $request->validate([
            'location' => 'nullable|string|max:255',
            'note' => 'nullable|string|max:1000',
            'event_id' => 'nullable|integer|exists:events,id',
        ]);

        $deviceRequest = RingDeviceRequest::create([
            ...$validated,
            'requested_by_user_id' => $request->user()->id,
            'status' => 'pending',
        ]);

        return response()->json($deviceRequest, 201);
    }

    // --- Corporate: their own Ring Developer app credentials (see RingCredentialResolver) ---

    /** Never returns the secrets themselves — just whether they're configured, plus the URLs to register in their own Ring console. */
    public function myCredentials(Request $request)
    {
        $cred = RingOwnerCredential::where('owner_id', $request->user()->id)->first();

        return response()->json([
            'configured' => (bool) $cred,
            'client_id' => $cred->client_id ?? null,
            'partner_account_identifier' => $cred->partner_account_identifier ?? null,
            'token_exchange_url' => url("/api/ring/token-exchange/{$request->user()->id}"),
            'account_link_url' => url("/api/ring/connect/{$request->user()->id}"),
        ]);
    }

    /**
     * client_secret/hmac_secret are optional on update — since GET
     * myCredentials() never echoes them back, the frontend can't pre-fill
     * them, so blank means "keep the existing value" rather than "clear it".
     * Required on first-time creation, since the row can't exist without them.
     */
    public function saveMyCredentials(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|string|max:255',
            'client_secret' => 'nullable|string|max:1000',
            'hmac_secret' => 'nullable|string|max:1000',
            'partner_account_identifier' => 'nullable|string|max:255',
        ]);

        $existing = RingOwnerCredential::where('owner_id', $request->user()->id)->first();

        if (!$existing && (empty($validated['client_secret']) || empty($validated['hmac_secret']))) {
            return response()->json(['message' => 'client_secret and hmac_secret are required the first time'], 422);
        }

        $payload = [
            'client_id' => $validated['client_id'],
            'partner_account_identifier' => $validated['partner_account_identifier'] ?? null,
        ];

        if (!empty($validated['client_secret'])) {
            $payload['client_secret'] = $validated['client_secret'];
        }

        if (!empty($validated['hmac_secret'])) {
            $payload['hmac_secret'] = $validated['hmac_secret'];
        }

        RingOwnerCredential::updateOrCreate(['owner_id' => $request->user()->id], $payload);

        return response()->json(['status' => 'saved']);
    }

    // --- Admin: Eventry's own shared Ring Developer app + Playground access token ---
    // Moved out of .env (RING_ACCESS_TOKEN / RING_CLIENT_ID / RING_CLIENT_SECRET /
    // RING_HMAC_SECRET / RING_PARTNER_ACCOUNT_IDENTIFIER) into a DB singleton row
    // so admins can rotate these without a redeploy. See RingPlatformCredential,
    // RingService::resolveAccessToken(), RingCredentialResolver::forOwner().

    /** Never returns the secrets themselves — just whether each is set. */
    public function adminPlatformCredentials()
    {
        $cred = RingPlatformCredential::first();

        return response()->json([
            'configured' => (bool) $cred,
            'access_token_set' => (bool) ($cred->access_token ?? null),
            'client_id' => $cred->client_id ?? null,
            'partner_account_identifier' => $cred->partner_account_identifier ?? null,
            'client_secret_set' => (bool) ($cred->client_secret ?? null),
            'hmac_secret_set' => (bool) ($cred->hmac_secret ?? null),
        ]);
    }

    /**
     * Every field is optional on save — blank means "leave the existing
     * value alone" (since GET never echoes secrets back, there's nothing to
     * pre-fill, and the admin may only be rotating one field at a time).
     */
    public function adminSavePlatformCredentials(Request $request)
    {
        $validated = $request->validate([
            'access_token' => 'nullable|string|max:2000',
            'client_id' => 'nullable|string|max:255',
            'client_secret' => 'nullable|string|max:1000',
            'hmac_secret' => 'nullable|string|max:1000',
            'partner_account_identifier' => 'nullable|string|max:255',
        ]);

        $cred = RingPlatformCredential::first() ?? new RingPlatformCredential();

        foreach (['access_token', 'client_id', 'client_secret', 'hmac_secret', 'partner_account_identifier'] as $field) {
            if (!empty($validated[$field])) {
                $cred->$field = $validated[$field];
            }
        }

        $cred->save();

        return response()->json(['status' => 'saved']);
    }
}
