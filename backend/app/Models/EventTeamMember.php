<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventTeamMember extends Model
{
    use HasFactory;

    protected $table = 'event_team_members';

    protected $fillable = [
        'event_id',
        'user_id',
        'name',
        'email',
        'phone',
        'image_url',
        'role',
        'invite_token',
    ];

    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
