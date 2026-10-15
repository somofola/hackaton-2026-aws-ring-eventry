@extends('emails.layouts.base')

@section('title', 'Email Change Requested â€” Eventry')

@section('header-right')
  <div style="text-align:right;">
    <div style="background:#f59e0b;color:#fff;font-size:10px;font-weight:700;letter-spacing:1.2px;
                text-transform:uppercase;padding:4px 12px;border-radius:20px;display:inline-block;">
      Security Notice
    </div>
  </div>
@endsection

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">Email Change Requested</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi <strong>{{ $user->name }}</strong>,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    A request was made on <strong>{{ now()->format('D, d M Y \a\t H:i') }} UTC</strong> to change
    your Eventry account email to <strong>{{ $newEmail }}</strong>.
    Your current email (<strong>{{ $user->email }}</strong>) remains active until the new address is verified.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-bottom:28px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
          <strong>Didn't request this change?</strong><br>
          Your account may be compromised. Reset your password immediately and contact our support team.
        </p>
      </td>
    </tr>
  </table>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
    <tr>
      <td style="border-radius:8px;background:#dc2626;">
        <a href="{{ config('app.url') }}/forgot-password"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          Secure My Account
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    Need help? Contact us at
    <a href="mailto:support@eventry.app" style="color:#0060D4;text-decoration:none;">support@eventry.app</a>
  </p>
@endsection
