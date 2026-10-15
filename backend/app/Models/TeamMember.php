<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeamMember extends Model
{
    use HasFactory;

    protected $fillable = [
        'corporate_id',
        'user_id',
        'name',
        'email',
        'department',
        'role',
        'phone',
        'address',
        'bio',
        'profile_image_url',
        'has_card',
        'card_views',
        'permissions',
        'status',
        'hire_date',
        'emergency_contact',
        'skills',
        'certifications',
    ];

    protected $casts = [
        'has_card' => 'boolean',
        'card_views' => 'integer',
        'permissions' => 'array',
        'hire_date' => 'date',
        'emergency_contact' => 'array',
        'skills' => 'array',
        'certifications' => 'array',
    ];

    public function corporate()
    {
        return $this->belongsTo(User::class, 'corporate_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function card()
    {
        return $this->hasOne(Card::class, 'user_id', 'user_id');
    }

    public function events()
    {
        return $this->belongsToMany(Event::class, 'event_team_members');
    }

    public function isActive()
    {
        return $this->status === 'active';
    }

    public function canManageEvents()
    {
        return in_array('manage_events', $this->permissions ?? []);
    }

    public function canCheckIn()
    {
        return in_array('check_in', $this->permissions ?? []);
    }
}
