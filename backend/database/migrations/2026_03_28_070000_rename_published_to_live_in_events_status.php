<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            // Step 1: add 'live' alongside 'published' so no data is truncated during the transition
            DB::statement("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check");
            DB::statement("ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'published', 'live', 'cancelled', 'completed'))");

            // Step 2: migrate existing rows
            DB::statement("UPDATE events SET status = 'live' WHERE status = 'published'");

            // Step 3: drop 'published' from the allowed set
            DB::statement("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check");
            DB::statement("ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'live', 'cancelled', 'completed'))");
        } else {
            // Step 1: add 'live' alongside 'published' so no data is truncated during the transition
            DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'published', 'live', 'cancelled', 'completed') NOT NULL DEFAULT 'draft'");

            // Step 2: migrate existing rows
            DB::statement("UPDATE events SET status = 'live' WHERE status = 'published'");

            // Step 3: drop 'published' from the enum
            DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'live', 'cancelled', 'completed') NOT NULL DEFAULT 'draft'");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            // Step 1: add 'published' back
            DB::statement("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check");
            DB::statement("ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'published', 'live', 'cancelled', 'completed'))");

            // Step 2: revert rows
            DB::statement("UPDATE events SET status = 'published' WHERE status = 'live'");

            // Step 3: drop 'live'
            DB::statement("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check");
            DB::statement("ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'published', 'cancelled', 'completed'))");
        } else {
            // Step 1: add 'published' back
            DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'published', 'live', 'cancelled', 'completed') NOT NULL DEFAULT 'draft'");

            // Step 2: revert rows
            DB::statement("UPDATE events SET status = 'published' WHERE status = 'live'");

            // Step 3: drop 'live'
            DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'published', 'cancelled', 'completed') NOT NULL DEFAULT 'draft'");
        }
    }
};
