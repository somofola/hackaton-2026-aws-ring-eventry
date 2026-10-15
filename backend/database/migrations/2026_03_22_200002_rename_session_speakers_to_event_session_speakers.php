<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('session_speakers') && !Schema::hasTable('event_session_speakers')) {
            Schema::rename('session_speakers', 'event_session_speakers');
        }

        // Drop speaker_id FK if it still exists (check by name)
        $fks = DB::select(
            "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
             WHERE TABLE_NAME = 'event_session_speakers'
               AND TABLE_SCHEMA = DATABASE()
               AND COLUMN_NAME = 'speaker_id'
               AND REFERENCED_TABLE_NAME IS NOT NULL"
        );
        foreach ($fks as $fk) {
            DB::statement("ALTER TABLE `event_session_speakers` DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
        }

        // Add user_id if not already added
        if (!Schema::hasColumn('event_session_speakers', 'user_id')) {
            Schema::table('event_session_speakers', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->after('session_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    }

    public function down(): void
    {
        Schema::table('event_session_speakers', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });

        Schema::rename('event_session_speakers', 'session_speakers');
    }
};
