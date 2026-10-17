@extends('emails.layouts.base')

@section('title', "You're invited to join the event team")

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">You're invited!</h2>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    You have been invited to join the team for the following event on Eventry:
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
    To accept this invitation and create your Eventry account, click the button below. You'll be asked to set your name, phone number, and a password.
  </p>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
    <tr>
      <td style="background:#0060D4;border-radius:8px;padding:0;">
        <a href="{{ $acceptUrl }}"
           style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:.01em;">
          Accept Invitation
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;">
    Or copy this link into your browser:
  </p>
  <p style="margin:0 0 24px 0;font-size:12px;color:#6b7280;word-break:break-all;">
    <a href="{{ $acceptUrl }}" style="color:#0060D4;">{{ $acceptUrl }}</a>
  </p>

  <div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#92400e;">
      This invitation link expires in 7 days. If you did not expect this email, you can safely ignore it.
    </p>
  </div>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    Questions? Contact <a href="mailto:{{ config('app.support_email') }}" style="color:#6b7280;">{{ config('app.support_email') }}</a>.
  </p>
@endsection
