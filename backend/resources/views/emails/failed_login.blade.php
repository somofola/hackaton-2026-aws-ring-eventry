@extends('emails.layouts.base')

@section('title', 'Failed Login Attempt â€” Eventry')

@section('header-right')
  <div style="text-align:right;">
    <div style="background:#f59e0b;color:#fff;font-size:10px;font-weight:700;letter-spacing:1.2px;
                text-transform:uppercase;padding:4px 12px;border-radius:20px;display:inline-block;">
      âš  Security Alert
    </div>
  </div>
@endsection

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">Failed Login Attempt</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi <strong>{{ $user->name }}</strong>,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    We detected a failed login attempt on your Eventry account. If this was you, you can safely ignore this email.
  </p>

  {{-- Details box --}}
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f8faff;border:1px solid #dbeafe;border-radius:8px;margin-bottom:28px;">
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 12px 0;font-size:10px;font-weight:700;color:#3b82f6;letter-spacing:1px;text-transform:uppercase;">
          Attempt Details
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Time</td>
            <td align="right" style="color:#111827;font-weight:600;">{{ $attemptedAt }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">IP Address</td>
            <td align="right" style="color:#111827;font-weight:600;">{{ $ipAddress }}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;padding:5px 0;">Account</td>
            <td align="right" style="color:#111827;">{{ $user->email }}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  {{-- Warning --}}
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin-bottom:28px;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0;font-size:13px;color:#9a3412;line-height:1.6;">
          <strong>Wasn't you?</strong> Someone may be trying to access your account.
          We recommend resetting your password immediately.
        </p>
      </td>
    </tr>
  </table>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
    <tr>
      <td style="border-radius:8px;background:#0060D4;">
        <a href="{{ config('app.url') }}/forgot-password"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          Secure My Account
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    For security questions, contact
    <a href="mailto:{{ config('app.support_email') }}" style="color:#0060D4;text-decoration:none;">{{ config('app.support_email') }}</a>
  </p>
@endsection
