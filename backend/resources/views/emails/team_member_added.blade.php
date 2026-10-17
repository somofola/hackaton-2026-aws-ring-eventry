@extends('emails.layouts.base')

@section('title', "You've been added to the event team")

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">You're on the team!</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi <strong>{{ $memberName }}</strong>,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    You have been added as a team member for the following event on Eventry:
  </p>

  <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#1e40af;text-transform:uppercase;letter-spacing:.05em;">Event</p>
    <p style="margin:0 0 12px 0;font-size:17px;font-weight:700;color:#111827;">{{ $eventTitle }}</p>
    <hr style="border:none;border-top:1px solid #bfdbfe;margin:14px 0;" />
    <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#1e40af;text-transform:uppercase;letter-spacing:.05em;">Date</p>
    <p style="margin:0 0 12px 0;font-size:14px;color:#374151;">{{ $eventDate }}</p>
    <hr style="border:none;border-top:1px solid #bfdbfe;margin:14px 0;" />
    <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#1e40af;text-transform:uppercase;letter-spacing:.05em;">Your Role</p>
    <p style="margin:0;font-size:14px;color:#374151;">{{ $role }}</p>
  </div>

  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    Log in to your Eventry account to view the event details and manage your responsibilities.
  </p>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    If you did not expect this email or believe it was sent in error, please contact
    <a href="mailto:{{ config('app.support_email') }}" style="color:#6b7280;">{{ config('app.support_email') }}</a>.
  </p>
@endsection
