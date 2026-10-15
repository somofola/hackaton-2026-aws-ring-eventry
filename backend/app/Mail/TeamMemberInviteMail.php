<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TeamMemberInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $eventTitle,
        public string $eventDate,
        public string $role,
        public string $acceptUrl,
    ) {}

    public function build(): static
    {
        return $this->subject("You're invited to join the event team – {$this->eventTitle}")
            ->view('emails.team_member_invite');
    }
}
