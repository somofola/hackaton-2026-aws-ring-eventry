<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE payments ALTER COLUMN user_id DROP NOT NULL');
        } else {
            DB::statement('ALTER TABLE payments MODIFY user_id BIGINT UNSIGNED NULL');
        }

        Schema::table('payments', function (Blueprint $table) {
            $table->string('archived_user_email')->nullable()->after('user_id');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('archived_user_email');
        });

        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL');
        } else {
            DB::statement('ALTER TABLE payments MODIFY user_id BIGINT UNSIGNED NOT NULL');
        }

        Schema::table('payments', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
