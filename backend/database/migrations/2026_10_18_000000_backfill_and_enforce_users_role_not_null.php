<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Backfill legacy/migrated rows (e.g. pre-speaker-migration data) that
        // ended up with a null role — SSO login crashed on these (TokenCookie
        // required a non-null role). Default to the least-privileged role.
        DB::table('users')->whereNull('role')->update(['role' => 'user']);

        DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('user','team','admin','corporate','super-admin','speaker') NOT NULL DEFAULT 'user'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('user','team','admin','corporate','super-admin','speaker') NULL");
    }
};
