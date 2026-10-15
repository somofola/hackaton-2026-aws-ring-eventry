@extends('emails.layouts.base')

@section('title', 'Your Weekly Event Digest â€” Eventry')

@section('header-right')
  <div style="text-align:right;">
    <div style="background:#8b5cf6;color:#fff;font-size:10px;font-weight:700;letter-spacing:1.2px;
                text-transform:uppercase;padding:4px 12px;border-radius:20px;display:inline-block;">
      Weekly Digest
    </div>
  </div>
@endsection

@section('body')
  <h2 style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#111827;">Events You Might Like</h2>
  <p style="margin:0 0 28px 0;font-size:14px;color:#6b7280;line-height:1.6;">
    Hi <strong>{{ $user->name }}</strong>, here are upcoming events handpicked for you this week.
    @if($user->location)
      Based on your location: <strong>{{ $user->location }}</strong>.
    @endif
  </p>

  {{-- Nearby / Relevant Events --}}
  @if($nearbyEvents->isNotEmpty())
  <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;color:#7c3aed;letter-spacing:1px;text-transform:uppercase;">
    ðŸ“ Near You
  </p>

  @foreach($nearbyEvents as $event)
  <table width="100%" cellpadding="0" cellspacing="0"
    style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:16px;overflow:hidden;">
    <tr>
      <td style="padding:18px 20px;">
        <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#111827;">{{ $event->title }}</p>
        <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">
          ðŸ“… {{ \Carbon\Carbon::parse($event->start_date)->format('D, d M Y') }}
          @if($event->start_time) Â· {{ \Carbon\Carbon::parse($event->start_time)->format('g:i A') }} @endif
          @if($event->location) &nbsp;Â·&nbsp; ðŸ“ {{ $event->location }} @endif
        </p>
        @if($event->description)
        <p style="margin:0 0 14px 0;font-size:13px;color:#6b7280;line-height:1.5;">
          {{ \Illuminate\Support\Str::limit($event->description, 120) }}
        </p>
        @endif
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-radius:6px;background:#7c3aed;">
              <a href="{{ config('app.url') }}/events/{{ $event->slug ?? $event->uuid }}"
                 style="display:inline-block;padding:9px 20px;color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;border-radius:6px;">
                View Event â†’
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  @endforeach
  @endif

  {{-- Other Upcoming Events --}}
  @if($otherEvents->isNotEmpty())
  <p style="margin:{{ $nearbyEvents->isNotEmpty() ? '28px' : '0' }} 0 12px 0;font-size:11px;font-weight:700;color:#0060D4;letter-spacing:1px;text-transform:uppercase;">
    ðŸŒ More Upcoming Events
  </p>

  @foreach($otherEvents as $event)
  <table width="100%" cellpadding="0" cellspacing="0"
    style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:16px;overflow:hidden;">
    <tr>
      <td style="padding:18px 20px;">
        <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#111827;">{{ $event->title }}</p>
        <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">
          ðŸ“… {{ \Carbon\Carbon::parse($event->start_date)->format('D, d M Y') }}
          @if($event->start_time) Â· {{ \Carbon\Carbon::parse($event->start_time)->format('g:i A') }} @endif
          @if($event->location) &nbsp;Â·&nbsp; ðŸ“ {{ $event->location }} @endif
        </p>
        @if($event->description)
        <p style="margin:0 0 14px 0;font-size:13px;color:#6b7280;line-height:1.5;">
          {{ \Illuminate\Support\Str::limit($event->description, 120) }}
        </p>
        @endif
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="border-radius:6px;background:#0060D4;">
              <a href="{{ config('app.url') }}/events/{{ $event->slug ?? $event->uuid }}"
                 style="display:inline-block;padding:9px 20px;color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;border-radius:6px;">
                View Event â†’
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  @endforeach
  @endif

  @if($nearbyEvents->isEmpty() && $otherEvents->isEmpty())
  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
    <tr>
      <td style="padding:24px;text-align:center;">
        <p style="margin:0;font-size:14px;color:#9ca3af;">No upcoming events this week. Check back soon!</p>
      </td>
    </tr>
  </table>
  @endif

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 20px 0;" />

  <table cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
    <tr>
      <td style="border-radius:8px;background:#0060D4;">
        <a href="{{ config('app.url') }}/events"
           style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
          Browse All Events
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:0;font-size:12px;color:#9ca3af;">
    You receive this digest weekly. Manage your notification preferences in
    <a href="{{ config('app.url') }}/user/settings" style="color:#0060D4;text-decoration:none;">account settings</a>.
  </p>
@endsection
