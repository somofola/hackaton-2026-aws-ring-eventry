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
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE push_tokens ALTER COLUMN type SET DEFAULT 'fcm'");
            DB::statement("ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_type_check");
            DB::statement("ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_type_check CHECK (type IN ('fcm'))");
        } else {
            DB::statement("ALTER TABLE push_tokens MODIFY COLUMN type ENUM('fcm') NOT NULL DEFAULT 'fcm'");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE push_tokens ALTER COLUMN type SET DEFAULT 'web'");
            DB::statement("ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_type_check");
            DB::statement("ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_type_check CHECK (type IN ('web','fcm'))");
        } else {
            DB::statement("ALTER TABLE push_tokens MODIFY COLUMN type ENUM('web','fcm') NOT NULL DEFAULT 'web'");
        }
    }
};
