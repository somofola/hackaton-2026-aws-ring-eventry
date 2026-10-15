@extends('emails.layouts.base')

@section('title', 'New Contact Form Submission')

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">New Contact Form Submission</h2>

  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:0;margin-bottom:24px;">
    <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Name</div>
      <div style="font-size:15px;color:#111827;margin-top:4px;">{{ $contact->name }}</div>
    </td></tr>
    <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Email</div>
      <div style="font-size:15px;color:#111827;margin-top:4px;">
        <a href="mailto:{{ $contact->email }}" style="color:#0060D4;text-decoration:none;">{{ $contact->email }}</a>
      </div>
    </td></tr>
    @if($contact->subject)
    <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Subject</div>
      <div style="font-size:15px;color:#111827;margin-top:4px;">{{ $contact->subject }}</div>
    </td></tr>
    @endif
    <tr><td style="padding:16px 20px;">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Message</div>
      <div style="font-size:14px;color:#374151;line-height:1.6;white-space:pre-wrap;margin-top:8px;">{{ $contact->message }}</div>
    </td></tr>
  </table>

  <p style="margin:0;font-size:12px;color:#9ca3af;">
    Submitted {{ $contact->created_at->format('F j, Y \a\t g:i A') }} from IP {{ $contact->ip ?? 'unknown' }}.
  </p>
@endsection
