@extends('emails.layouts.base')

@section('title', 'Welcome to Eventry')

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">Welcome to Eventry! ðŸŽ‰</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi <strong>{{ $user->name }}</strong>,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    Your account has been successfully created. You're now part of the Eventry community â€”
    the smarter way to share your professional identity with digital business cards.
  </p>

  {{-- Feature highlights --}}
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f8faff;border:1px solid #dbeafe;border-radius:8px;margin-bottom:28px;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 14px 0;font-size:13px;font-weight:700;color:#3b82f6;letter-spacing:0.5px;text-transform:uppercase;">
          Get started
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#374151;">
          <tr>
            <td style="padding:5px 0;">âœ… &nbsp; Create your first digital business card</td>
          </tr>
          <tr>
            <td style="padding:5px 0;">âœ… &nbsp; Generate a QR code and share it instantly</td>
          </tr>
          <tr>
            <td style="padding:5px 0;">âœ… &nbsp; Build your professional network</td>
          </tr>
          <tr>
            <td style="padding:5px 0;">âœ… &nbsp; Explore upcoming events near you</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
    <tr>
      <td style="border-radius:8px;background:#0060D4;">
        <a href="{{ config('app.url') }}/user/dashboard"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          Go to Dashboard
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    If you have any questions, reply to this email or visit
    <a href="https://eventry.app" style="color:#0060D4;text-decoration:none;">eventry.app</a>.
  </p>
@endsection
