@extends('emails.layouts.base')

@section('title', "You've been added as a speaker")

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">You're speaking at an event!</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi <strong>{{ $speakerName }}</strong>,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    You have been added as a speaker for the following event on Eventry:
  </p>

  {{-- Event info box --}}
  <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
    <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#1e40af;text-transform:uppercase;letter-spacing:.05em;">Event</p>
    <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">{{ $eventTitle }}</p>

    @if($sessionTitle)
      <hr style="border:none;border-top:1px solid #bfdbfe;margin:14px 0;" />
      <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#1e40af;text-transform:uppercase;letter-spacing:.05em;">Your Session</p>
      <p style="margin:0;font-size:15px;color:#111827;">{{ $sessionTitle }}</p>
    @endif
  </div>

  @if($isNewAccount)
  <div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#92400e;">
      A Eventry speaker account has been created for you. The event organiser will share your login details separately.
    </p>
  </div>
  @endif

  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    If you have any questions about the event, please reach out to the event organiser directly.
  </p>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    If you did not expect this email or believe it was sent in error, please contact
    <a href="mailto:support@eventry.app" style="color:#6b7280;">support@eventry.app</a>.
  </p>
@endsection
