<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventTicketCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'name',
        'description',
        'price',
        'max_quantity',
        'sold_quantity',
        'sale_start_date',
        'sale_end_date',
        'is_active',
        'is_featured',
        'perks',
        'restrictions',
        'color',
        'sort_order',
        'floor_plan_areas',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'max_quantity' => 'integer',
        'sold_quantity' => 'integer',
        'sale_start_date' => 'datetime',
        'sale_end_date' => 'datetime',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'perks' => 'array',
        'restrictions' => 'array',
        'floor_plan_areas' => 'array',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
