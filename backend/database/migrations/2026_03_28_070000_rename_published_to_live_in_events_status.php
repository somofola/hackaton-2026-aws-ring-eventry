<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: add 'live' alongside 'published' so no data is truncated during the transition
        DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'published', 'live', 'cancelled', 'completed') NOT NULL DEFAULT 'draft'");

        // Step 2: migrate existing rows
        DB::statement("UPDATE events SET status = 'live' WHERE status = 'published'");

        // Step 3: drop 'published' from the enum
        DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'live', 'cancelled', 'completed') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        // Step 1: add 'published' back
        DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'published', 'live', 'cancelled', 'completed') NOT NULL DEFAULT 'draft'");

        // Step 2: revert rows
        DB::statement("UPDATE events SET status = 'published' WHERE status = 'live'");

        // Step 3: drop 'live'
        DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'published', 'cancelled', 'completed') NOT NULL DEFAULT 'draft'");
    }
};
