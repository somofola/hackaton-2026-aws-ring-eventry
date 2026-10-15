<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $isPgsql = Schema::getConnection()->getDriverName() === 'pgsql';

        // 1. Drop event_type if it already exists
        if (Schema::hasColumn('events', 'event_type')) {
            DB::statement($isPgsql
                ? "ALTER TABLE events DROP COLUMN event_type"
                : "ALTER TABLE `events` DROP COLUMN `event_type`");
        }

        // 2. Rename location_type -> event_type
        if (Schema::hasColumn('events', 'location_type')) {
            if ($isPgsql) {
                DB::statement("ALTER TABLE events RENAME COLUMN location_type TO event_type");
                DB::statement("ALTER TABLE events RENAME CONSTRAINT events_location_type_check TO events_event_type_check");
            } else {
                DB::statement("
                    ALTER TABLE `events`
                    CHANGE `location_type` `event_type`
                    ENUM('virtual','physical','hybrid')
                    NOT NULL DEFAULT 'physical'
                ");
            }
        }
    }

    public function down(): void
    {
        $isPgsql = Schema::getConnection()->getDriverName() === 'pgsql';

        // 1. Drop location_type if it somehow exists already
        if (Schema::hasColumn('events', 'location_type')) {
            DB::statement($isPgsql
                ? "ALTER TABLE events DROP COLUMN location_type"
                : "ALTER TABLE `events` DROP COLUMN `location_type`");
        }

        // 2. Rename event_type -> location_type
        if (Schema::hasColumn('events', 'event_type')) {
            if ($isPgsql) {
                DB::statement("ALTER TABLE events RENAME COLUMN event_type TO location_type");
                DB::statement("ALTER TABLE events RENAME CONSTRAINT events_event_type_check TO events_location_type_check");
            } else {
                DB::statement("
                    ALTER TABLE `events`
                    CHANGE `event_type` `location_type`
                    ENUM('virtual','physical','hybrid')
                    NOT NULL DEFAULT 'physical'
                ");
            }
        }
    }
};
