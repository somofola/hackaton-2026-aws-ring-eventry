<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\EventExhibitor;
use Illuminate\Http\Request;

class EventExhibitorController extends Controller
{
    public function index(Request $request)
    {
        $query = EventExhibitor::with('event');

        if ($request->has('event_id')) {
            $query->where('event_id', $request->event_id);
        }

        $exhibitors = $query->orderBy('created_at', 'desc')
                           ->paginate($request->per_page ?? 15);

        return response()->json($exhibitors);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|exists:events,id',
            'company_name' => 'required|string|max:255',
            'contact_name' => 'required|string|max:255',
            'contact_email' => 'required|email',
            'contact_phone' => 'nullable|string',
            'website' => 'nullable|url',
            'booth_number' => 'nullable|string',
            'booth_size' => 'nullable|string',
            'description' => 'nullable|string',
            'logo_url' => 'nullable|url',
            'products_services' => 'nullable|array',
            'booth_requirements' => 'nullable|array',
            'special_requests' => 'nullable|string',
            'status' => 'sometimes|in:pending,approved,rejected',
            'payment_status' => 'sometimes|in:pending,paid,refunded',
        ]);

        $exhibitor = EventExhibitor::create($validated);

        return response()->json($exhibitor->load('event'), 201);
    }

    public function show(EventExhibitor $exhibitor)
    {
        return response()->json($exhibitor->load('event'));
    }

    public function update(Request $request, EventExhibitor $exhibitor)
    {
        $validated = $request->validate([
            'company_name' => 'sometimes|string|max:255',
            'contact_name' => 'sometimes|string|max:255',
            'contact_email' => 'sometimes|email',
            'contact_phone' => 'nullable|string',
            'website' => 'nullable|url',
            'booth_number' => 'nullable|string',
            'booth_size' => 'nullable|string',
            'description' => 'nullable|string',
            'logo_url' => 'nullable|url',
            'products_services' => 'nullable|array',
            'booth_requirements' => 'nullable|array',
            'special_requests' => 'nullable|string',
            'status' => 'sometimes|in:pending,approved,rejected',
            'payment_status' => 'sometimes|in:pending,paid,refunded',
        ]);

        $exhibitor->update($validated);

        return response()->json($exhibitor->load('event'));
    }

    public function destroy(EventExhibitor $exhibitor)
    {
        $exhibitor->delete();
        return response()->json(['message' => 'Exhibitor deleted successfully']);
    }
}
