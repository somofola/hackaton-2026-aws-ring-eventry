<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','team','admin','corporate','super-admin','speaker') OR role IS NULL)");
        } else {
            DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('user','team','admin','corporate','super-admin','speaker') NULL");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user','team','admin','corporate') OR role IS NULL)");
        } else {
            DB::statement("ALTER TABLE `users` MODIFY `role` ENUM('user','team','admin','corporate') NULL");
        }
    }
};
