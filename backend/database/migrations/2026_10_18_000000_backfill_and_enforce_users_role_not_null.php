<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Backfill legacy/migrated rows (e.g. pre-speaker-migration data) that
        // ended up with a null role — SSO login crashed on these (TokenCookie
        // required a non-null role). Default to the least-privileged role.
        DB::table('users')->whereNull('role')->update(['role' => 'user']);

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users ALTER COLUMN role SET NOT NULL");
            DB::statement("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'");
        } else {
            DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('user','team','admin','corporate','super-admin','speaker') NOT NULL DEFAULT 'user'");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users ALTER COLUMN role DROP NOT NULL");
            DB::statement("ALTER TABLE users ALTER COLUMN role DROP DEFAULT");
        } else {
            DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('user','team','admin','corporate','super-admin','speaker') NULL");
        }
    }
};
