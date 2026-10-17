<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>@yield('title', 'Eventry')</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          {{-- â”€â”€ Header â”€â”€ --}}
          <tr>
            <td style="background:linear-gradient(135deg,#0060D4 0%,#1a3a8f 100%);padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    {{-- Logo + brand --}}
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <img
                            src="{{ config('app.frontend_url') }}/logo.png"
                            alt="Eventry"
                            width="50" height="50"
                            style="display:block;border-radius:8px;object-fit:contain;border-radius:10%"
                          />
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;line-height:1;">Eventry</div>
                          <div style="color:#cfcfcf;font-size:11px;margin-top:3px;">Identity, Digital Business Cards & Event Management</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    @yield('header-right')
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          {{-- â”€â”€ Body â”€â”€ --}}
          <tr>
            <td style="padding:36px 40px;">
              @yield('body')
            </td>
          </tr>

          {{-- â”€â”€ Footer â”€â”€ --}}
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;color:#9ca3af;">
                    &copy; {{ date('Y') }} Eventry. All rights reserved.
                  </td>
                  <td align="right" style="font-size:11px;color:#9ca3af;">
                    <a href="mailto:support@eventry.app" style="color:#9ca3af;text-decoration:none;">support@eventry.app</a>
                    &nbsp;&middot;&nbsp;
                    <a href="https://eventry.app" style="color:#9ca3af;text-decoration:none;">https://eventry.app</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
