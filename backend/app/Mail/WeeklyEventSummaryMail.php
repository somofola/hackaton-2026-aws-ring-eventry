<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class WeeklyEventSummaryMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User       $user,
        public Collection $nearbyEvents,
        public Collection $otherEvents,
    ) {}

    public function build()
    {
        return $this->subject('Your weekly event digest — Eventry')
            ->view('emails.weekly_event_summary');
    }
}
