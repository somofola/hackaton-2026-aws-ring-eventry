<?php

namespace App\Http\Controllers;

use App\Models\PushToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PushTokenController extends Controller
{
    /** Register or update an FCM push token for the authenticated user */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type'      => 'required|in:fcm',
            'token'     => 'required|string',
            'device_id' => 'nullable|string|max:255',
        ]);

        PushToken::updateOrCreate(
            [
                'user_id'   => Auth::id(),
                'type'      => $validated['type'],
                'device_id' => $validated['device_id'] ?? null,
            ],
            ['token' => $validated['token']]
        );

        return response()->json(['message' => 'Push token registered.']);
    }

    /** Unregister a push token (e.g. on logout or permission revoke) */
    public function destroy(Request $request)
    {
        $validated = $request->validate([
            'type'      => 'required|in:fcm',
            'device_id' => 'nullable|string|max:255',
        ]);

        PushToken::where('user_id', Auth::id())
            ->where('type', $validated['type'])
            ->when($validated['device_id'] ?? null, fn($q, $id) => $q->where('device_id', $id))
            ->delete();

        return response()->json(['message' => 'Push token removed.']);
    }
}
