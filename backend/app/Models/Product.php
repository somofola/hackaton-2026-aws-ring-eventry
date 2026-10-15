<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name',
        'type',
        'description',
        'price',
        'status',
        'image_url',
        'min_quantity',
        'max_quantity',
    ];

    protected $casts = [
        'price'        => 'array',
        'min_quantity' => 'integer',
        'max_quantity' => 'integer',
    ];

    public function orders()
    {
        return $this->hasMany(Order::class);
    }
}
