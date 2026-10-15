@extends('emails.layouts.base')

@section('title', 'Welcome to Eventry')

@section('body')
  <h2 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;">Welcome to Eventry! ðŸŽ‰</h2>
  <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Hi <strong>{{ $staffName }}</strong>,</p>
  <p style="margin:0 0 24px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    <strong>{{ $companyName }}</strong> has created a Eventry account and digital business card for you.
    Use the credentials below to sign in and access your profile.
  </p>

  {{-- Credentials box --}}
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
    <p style="margin:0 0 10px 0;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.05em;">Your Login Details</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;">
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6b7280;width:90px;">Email</td>
        <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:500;">{{ $staffEmail }}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6b7280;">Password</td>
        <td style="padding:4px 0;font-size:15px;color:#111827;font-weight:700;font-family:monospace;letter-spacing:.08em;">{{ $temporaryPassword }}</td>
      </tr>
    </table>
  </div>

  <table cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
    <tr>
      <td style="border-radius:8px;background:#0060D4;">
        <a href="{{ $loginUrl }}"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          Sign In to Eventry
        </a>
      </td>
    </tr>
  </table>

  <div style="background:#fff8f0;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#92400e;">
      âš ï¸ For your security, please change your password after your first login.
      Never share your credentials with anyone.
    </p>
  </div>

  <p style="margin:0;font-size:13px;color:#9ca3af;">
    If you did not expect this email, please contact your company administrator or reach out to Eventry support.
  </p>
@endsection
