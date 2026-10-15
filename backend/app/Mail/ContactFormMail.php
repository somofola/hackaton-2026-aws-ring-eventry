<?php

namespace App\Mail;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactFormMail extends Mailable
{
    use Queueable, SerializesModels;

    public ContactMessage $contact;

    public function __construct(ContactMessage $contact)
    {
        $this->contact = $contact;
    }

    public function build(): static
    {
        return $this->subject('Contact form: ' . ($this->contact->subject ?: 'New message'))
            ->replyTo($this->contact->email, $this->contact->name)
            ->view('emails.contact_form');
    }
}
