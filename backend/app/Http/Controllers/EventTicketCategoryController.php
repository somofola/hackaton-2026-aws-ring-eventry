<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\EventTicketCategory;


class EventTicketCategoryController extends Controller
{
    //
    public function index()
    {
        $categories = EventTicketCategory::all();
        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|exists:events,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'max_quantity' => 'required|integer|min:1',
            'sale_start_date' => 'nullable|date',
            'sale_end_date' => 'nullable|date|after_or_equal:sale_start_date',
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'perks' => 'nullable|array',
            'restrictions' => 'nullable|array',
            'color' => 'nullable|string|max:7', // Assuming hex color code
            'sort_order' => 'integer|min:0',
        ]);

        $category = EventTicketCategory::create($validated);

        return response()->json($category, 201);
    }

    public function getTicketsCategoryByEventId($eventId)
    {
        $categories = EventTicketCategory::where('event_id', $eventId)->get();
        return response()->json($categories);
    }   
}
