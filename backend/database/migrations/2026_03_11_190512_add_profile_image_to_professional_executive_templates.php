<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Professional — add profile image avatar alongside the name/title/company block
        $professionalHtml = '<div style="width:100%;height:224px;background:linear-gradient(160deg,#1e293b 0%,#0f172a 100%);color:#fff;padding:24px;border-radius:12px;box-shadow:0 6px 24px rgba(15,23,42,0.5);font-family:\'Helvetica Neue\',Arial,sans-serif;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;">
    <div style="flex:1;min-width:0;">
      <h2 style="margin:0 0 6px 0;font-size:24px;font-weight:700;">{name}</h2>
      <p style="margin:0 0 3px 0;color:#94a3b8;font-size:14px;">{title}</p>
      <p style="margin:0;color:#64748b;font-size:13px;">{company}</p>
    </div>
    <div style="width:60px;height:60px;border-radius:50%;overflow:hidden;border:2px solid #334155;background:#1e293b;flex-shrink:0;margin-left:12px;">
      <img src="{profile_image_url}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'" />
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
    <div><p style="margin:0;color:#64748b;">Email</p><p style="margin:2px 0;color:#e2e8f0;">{email}</p></div>
    <div><p style="margin:0;color:#64748b;">Phone</p><p style="margin:2px 0;color:#e2e8f0;">{phone}</p></div>
    <div><p style="margin:0;color:#64748b;">Website</p><p style="margin:2px 0;color:#38bdf8;">{website}</p></div>
  </div>
</div>';

        // Executive — add gold-bordered profile image avatar alongside the name/title block
        $executiveHtml = '<div style="width:100%;height:224px;background:#111827;padding:24px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.4);font-family:\'Helvetica Neue\',Arial,sans-serif;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;border-left:4px solid #f59e0b;">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;">
    <div style="flex:1;min-width:0;">
      <h2 style="margin:0 0 6px 0;color:#f9fafb;font-size:22px;font-weight:700;letter-spacing:-0.3px;">{name}</h2>
      <p style="margin:0 0 3px 0;color:#f59e0b;font-size:14px;font-weight:500;">{title}</p>
      <p style="margin:0;color:#6b7280;font-size:13px;">{company}</p>
    </div>
    <div style="width:60px;height:60px;border-radius:50%;overflow:hidden;border:2px solid #f59e0b;background:#1f2937;flex-shrink:0;margin-left:12px;">
      <img src="{profile_image_url}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\'" />
    </div>
  </div>
  <div style="font-size:12px;color:#9ca3af;line-height:1.9;border-top:1px solid #1f2937;padding-top:12px;">
    <p style="margin:0;">{email}</p>
    <p style="margin:0;">{phone}</p>
    <p style="margin:0;color:#f59e0b;">{website}</p>
  </div>
</div>';

        DB::table('card_templates')
            ->whereNull('created_by')
            ->where('name', 'Professional')
            ->update(['html' => $professionalHtml, 'updated_at' => now()]);

        DB::table('card_templates')
            ->whereNull('created_by')
            ->where('name', 'Executive')
            ->update(['html' => $executiveHtml, 'updated_at' => now()]);
    }

    public function down(): void
    {
        // Restore originals without profile image
        $professionalHtml = '<div style="width:100%;height:224px;background:linear-gradient(160deg,#1e293b 0%,#0f172a 100%);color:#fff;padding:24px;border-radius:12px;box-shadow:0 6px 24px rgba(15,23,42,0.5);font-family:\'Helvetica Neue\',Arial,sans-serif;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;">
  <div>
    <h2 style="margin:0 0 6px 0;font-size:24px;font-weight:700;">{name}</h2>
    <p style="margin:0 0 3px 0;color:#94a3b8;font-size:14px;">{title}</p>
    <p style="margin:0;color:#64748b;font-size:13px;">{company}</p>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
    <div><p style="margin:0;color:#64748b;">Email</p><p style="margin:2px 0;color:#e2e8f0;">{email}</p></div>
    <div><p style="margin:0;color:#64748b;">Phone</p><p style="margin:2px 0;color:#e2e8f0;">{phone}</p></div>
    <div><p style="margin:0;color:#64748b;">Website</p><p style="margin:2px 0;color:#38bdf8;">{website}</p></div>
  </div>
</div>';

        $executiveHtml = '<div style="width:100%;height:224px;background:#111827;padding:24px;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,0.4);font-family:\'Helvetica Neue\',Arial,sans-serif;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;border-left:4px solid #f59e0b;">
  <div>
    <h2 style="margin:0 0 6px 0;color:#f9fafb;font-size:22px;font-weight:700;letter-spacing:-0.3px;">{name}</h2>
    <p style="margin:0 0 3px 0;color:#f59e0b;font-size:14px;font-weight:500;">{title}</p>
    <p style="margin:0;color:#6b7280;font-size:13px;">{company}</p>
  </div>
  <div style="font-size:12px;color:#9ca3af;line-height:1.9;border-top:1px solid #1f2937;padding-top:12px;">
    <p style="margin:0;">{email}</p>
    <p style="margin:0;">{phone}</p>
    <p style="margin:0;color:#f59e0b;">{website}</p>
  </div>
</div>';

        DB::table('card_templates')
            ->whereNull('created_by')
            ->where('name', 'Professional')
            ->update(['html' => $professionalHtml, 'updated_at' => now()]);

        DB::table('card_templates')
            ->whereNull('created_by')
            ->where('name', 'Executive')
            ->update(['html' => $executiveHtml, 'updated_at' => now()]);
    }
};
