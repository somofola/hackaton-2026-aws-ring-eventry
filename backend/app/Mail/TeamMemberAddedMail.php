<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TeamMemberAddedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $memberName,
        public string $eventTitle,
        public string $eventDate,
        public string $role,
    ) {}

    public function build(): static
    {
        return $this->subject("You've been added to the event team – {$this->eventTitle}")
            ->view('emails.team_member_added');
    }
}
