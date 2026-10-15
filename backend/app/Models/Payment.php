<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'archived_user_email',
        'type', // e.g. 'event_ticket_category'
        'item_id', // The ticket_category_id (or order_id for product_order) based on the type
        'payment_reference',
        'amount',
        'currency',
        'billing_cycle',
        'status',
        'description',
        'payment_gateway_response',
        'paid_at',
    ];

    protected $casts = [
        'paid_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** For type = 'product_order', item_id is the order ID */
    public function order()
    {
        return $this->belongsTo(Order::class, 'item_id', 'id');
    }
}
