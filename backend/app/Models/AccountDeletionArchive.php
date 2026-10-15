<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountDeletionArchive extends Model
{
    protected $fillable = ['original_user_id', 'email', 'payload', 'purge_at'];

    protected $casts = [
        'payload'  => 'array',
        'purge_at' => 'datetime',
    ];
}
