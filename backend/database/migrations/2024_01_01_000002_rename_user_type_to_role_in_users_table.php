<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'user_type') || Schema::hasColumn('users', 'role')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('user_type', 'role');
        });

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users RENAME CONSTRAINT users_user_type_check TO users_role_check');
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('users', 'role') || Schema::hasColumn('users', 'user_type')) {
            return;
        }

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users RENAME CONSTRAINT users_role_check TO users_user_type_check');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('role', 'user_type');
        });
    }
};
