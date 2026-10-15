<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Speaker;
use Illuminate\Http\Request;

class SpeakerController extends Controller
{
    public function index(Request $request)
    {
        $speakers = Speaker::query()
            ->with('event')
            ->when($request->event_id, fn($query) => $query->where('event_id', $request->event_id))
            ->when($request->search, fn($query) => $query->where('name', 'like', "%{$request->search}%"))
            ->paginate($request->per_page ?? 15);

        return response()->json($speakers);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'company' => 'required|string|max:255',
            'bio' => 'required|string',
            'image_url' => 'nullable|url',
            'social' => 'nullable|array',
            'event_id' => 'required|exists:events,id',
        ]);

        $speaker = Speaker::create($validated);

        return response()->json($speaker->load('event'), 201);
    }

    public function show(Speaker $speaker)
    {
        return response()->json($speaker->load('event', 'sessions'));
    }

    public function update(Request $request, Speaker $speaker)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'title' => 'sometimes|string|max:255',
            'company' => 'sometimes|string|max:255',
            'bio' => 'sometimes|string',
            'image_url' => 'nullable|url',
            'social' => 'nullable|array',
        ]);

        $speaker->update($validated);

        return response()->json($speaker->load('event'));
    }

    public function destroy(Speaker $speaker)
    {
        $speaker->delete();

        return response()->json(['message' => 'Speaker deleted successfully']);
    }
}
