<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Remove any stale web-push subscriptions (no longer valid after FCM migration)
        DB::table('push_tokens')->where('type', 'web')->delete();

        // Update the enum to only allow 'fcm'
        DB::statement("ALTER TABLE push_tokens MODIFY COLUMN type ENUM('fcm') NOT NULL DEFAULT 'fcm'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE push_tokens MODIFY COLUMN type ENUM('web','fcm') NOT NULL DEFAULT 'web'");
    }
};
