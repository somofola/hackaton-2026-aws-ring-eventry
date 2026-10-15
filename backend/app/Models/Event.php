<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'slug',
        'title',
        'description',
        'start_date',
        'end_date',
        'start_time',
        'end_time',
        'location',
        'event_type',
        'virtual_link',
        'max_attendees',
        'current_attendees',
        'currency',
        'image_url',
        'organizer_id',
        'organizer_name',
        'status',
        'tags',
        'corporate_id',
        'registration_deadline',
        'cancellation_policy',
        'refund_policy',
        'special_instructions',
        'venue_details',
        'parking_info',
        'accessibility_info',
        'contact_email',
        'contact_phone',
        'latitude',
        'longitude',
        'website_url',
        'social_links',
        'custom_fields',
        'branding_settings',
        'issues_certificate',
        'scraper_source_id',
        'external_event_id',
        'external_url',
        'external_origin',
        'is_external',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'registration_deadline' => 'datetime',
        'tags' => 'array',
        'social_links' => 'array',
        'custom_fields' => 'array',
        'branding_settings' => 'array',
        'current_attendees' => 'integer',
        'max_attendees' => 'integer',
        'issues_certificate' => 'boolean',
        'is_external' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($event) {
            if (!$event->uuid) {
                $event->uuid = (string) Str::uuid();
            }
            if (!$event->slug) {
                $base = preg_replace('/[^a-z0-9]+/', '-', strtolower($event->title));
                $base = trim($base, '-');
                $slug = $base;
                $i = 1;
                while (static::where('slug', $slug)->exists()) {
                    $slug = "{$base}-{$i}";
                    $i++;
                }
                $event->slug = $slug;
            }
        });
    }

    public function getRouteKeyName()
    {
        return 'uuid';
    }

    public function organizer()
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function corporate()
    {
        return $this->belongsTo(User::class, 'corporate_id');
    }

    public function enrollments()
    {
        return $this->hasMany(EventEnrollment::class);
    }

    public function speakers()
    {
        return $this->hasMany(EventSpeaker::class);
    }

    public function sessions()
    {
        return $this->hasMany(EventSession::class);
    }

    public function exhibitors()
    {
        return $this->hasMany(EventExhibitor::class);
    }

    public function sponsors()
    {
        return $this->hasMany(EventSponsor::class);
    }

    public function teamMembers()
    {
        return $this->hasMany(EventTeamMember::class);
    }

    public function ticketCategories()
    {
        return $this->hasMany(EventTicketCategory::class);
    }

    public function reviews()
    {
        return $this->hasMany(EventReview::class);
    }

    public function floorPlans()
    {
        return $this->hasMany(EventFloorPlan::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class, 'item_id')->where('type', 'event');
    }

    public function attendedEnrollments()
    {
        return $this->hasMany(EventEnrollment::class)->where('status', 'attended');
    }

    public function activeEnrollments()
    {
        return $this->hasMany(EventEnrollment::class)->where('status', 'enrolled');
    }

    public function checkInStats()
    {
        return [
            'total_registered' => $this->current_attendees,
            'checked_in' => $this->attendedEnrollments()->count(),
            'check_in_rate' => $this->current_attendees > 0 
                ? round(($this->attendedEnrollments()->count() / $this->current_attendees) * 100, 2)
                : 0
        ];
    }
}
