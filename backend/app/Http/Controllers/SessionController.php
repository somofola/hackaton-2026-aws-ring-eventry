<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Session;
use Illuminate\Http\Request;

class SessionController extends Controller
{
    public function index(Request $request)
    {
        $sessions = Session::query()
            ->with(['event', 'speakers'])
            ->when($request->event_id, fn($query) => $query->where('event_id', $request->event_id))
            ->when($request->search, fn($query) => $query->where('title', 'like', "%{$request->search}%"))
            ->orderBy('start_time', 'asc')
            ->paginate($request->per_page ?? 15);

        return response()->json($sessions);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'speaker_ids' => 'nullable|array',
            'location' => 'required|string',
            'capacity' => 'nullable|integer|min:1',
            'event_id' => 'required|exists:events,id',
        ]);

        $session = Session::create($validated);

        if (isset($validated['speaker_ids'])) {
            $session->speakers()->sync($validated['speaker_ids']);
        }

        return response()->json($session->load(['event', 'speakers']), 201);
    }

    public function show(Session $session)
    {
        return response()->json($session->load(['event', 'speakers']));
    }

    public function update(Request $request, Session $session)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after:start_time',
            'speaker_ids' => 'nullable|array',
            'location' => 'sometimes|string',
            'capacity' => 'nullable|integer|min:1',
        ]);

        $session->update($validated);

        if (isset($validated['speaker_ids'])) {
            $session->speakers()->sync($validated['speaker_ids']);
        }

        return response()->json($session->load(['event', 'speakers']));
    }

    public function destroy(Session $session)
    {
        $session->delete();

        return response()->json(['message' => 'Session deleted successfully']);
    }
}
