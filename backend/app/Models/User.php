<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Notifications\CustomVerifyEmail;
use Illuminate\Support\Str;

/**
 * @method \Laravel\Sanctum\NewAccessToken createToken(string $name, array $abilities = ['*'])
 */



class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, HasFactory, Notifiable;

    // SECURITY: `role`, `email_verified_at`, `corporate_id`, `email_pending`,
    // `email_change_token`, `secondary_email_*_token`, `secondary_email_verified_at`,
    // `force_password_change`, `status`, `referred_by`, `referred_at`, `affiliate_code`
    // are intentionally NOT fillable — they must be set via explicit assignment
    // by trusted controller code only, never from request payloads.
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'company',
        'address',
        'gender',
        'description',
        'employee_count',
        'industry',
        'founded_date',
        'profile_image_url',
        'bio',
        'location',
        'website',
        'linkedin_profile',
        'twitter_profile',
        'instagram_profile',
        'facebook_profile',
        'github_profile',
        'preferences',
        'timezone',
        'language',
        'last_activity_at',
        'app_id',
        'pin',
        'secondary_email',
        'secondary_email_pending',
    ];

    public function sendEmailVerificationNotification()
    {
        $this->notify(new CustomVerifyEmail);
    }

    protected static function booted()
    {
        static::creating(function (User $user) {
            if (empty($user->uuid)) {
                $user->uuid = (string) Str::uuid();
            }
        });
    }

    protected $hidden = [
        'password',
        'remember_token',
        'secondary_email_token',
        'secondary_email_pending',
        'email_change_token',
    ];

    protected $casts = [
        'email_verified_at'          => 'datetime',
        'secondary_email_verified_at' => 'datetime',
        'last_activity_at'           => 'datetime',
        'referred_at'                => 'datetime',
        'preferences' => 'array',
        'contact_info' => 'array',
        'billing_info' => 'array',
        'password' => 'hashed',
    ];

    public function corporate()
    {
        return $this->belongsTo(User::class, 'corporate_id');
    }

    public function events()
    {
        return $this->hasMany(Event::class, 'organizer_id');
    }

    public function enrollments()
    {
        return $this->hasMany(EventEnrollment::class);
    }

    public function qrCodes()
    {
        return $this->hasMany(QRCode::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function shortLinks()
    {
        return $this->hasMany(ShortLink::class);
    }

    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    public function isTeamMember()
    {
        return $this->role === 'team';
    }

    public function isActive()
    {
        return $this->status === 'active';
    }

}
