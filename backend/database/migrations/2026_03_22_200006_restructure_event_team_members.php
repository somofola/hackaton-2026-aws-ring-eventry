<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $isPgsql = Schema::getConnection()->getDriverName() === 'pgsql';

        /**
         * 1. Drop FK on team_member_id FIRST (this fixes your error)
         */
        if ($isPgsql) {
            DB::statement('ALTER TABLE event_team_members DROP CONSTRAINT IF EXISTS event_team_members_team_member_id_foreign');
            DB::statement('ALTER TABLE event_team_members DROP CONSTRAINT IF EXISTS event_team_members_event_id_team_member_id_unique');
        } else {
            $fks = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'event_team_members'
            AND COLUMN_NAME = 'team_member_id'
            AND REFERENCED_TABLE_NAME IS NOT NULL
            ");

            foreach ($fks as $fk) {
                DB::statement("ALTER TABLE `event_team_members` DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
            }

            // Drop backing index if still present
            $indexes = DB::select("SHOW INDEX FROM event_team_members WHERE Key_name = 'event_team_members_team_member_id_foreign'");
            if (count($indexes) > 0) {
                DB::statement('ALTER TABLE `event_team_members` DROP INDEX `event_team_members_team_member_id_foreign`');
            }

            // Drop unique index if still present
            $indexes = DB::select("SHOW INDEX FROM event_team_members WHERE Key_name = 'event_team_members_event_id_team_member_id_unique'");
            if (count($indexes) > 0) {
                DB::statement('ALTER TABLE `event_team_members` DROP INDEX `event_team_members_event_id_team_member_id_unique`');
            }
        }

        // Drop old columns if they still exist
        $toDrop = array_values(array_filter(
            ['team_member_id', 'responsibilities', 'is_active'],
            fn($col) => Schema::hasColumn('event_team_members', $col)
        ));
        if (!empty($toDrop)) {
            Schema::table('event_team_members', function (Blueprint $table) use ($toDrop) {
                $table->dropColumn($toDrop);
            });
        }

        // Add user_id if missing
        if (!Schema::hasColumn('event_team_members', 'user_id')) {
            Schema::table('event_team_members', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->after('event_id');
            });
        }

        // Add FK on user_id if not already present
        $hasFk = $isPgsql
            ? !empty(DB::select("SELECT 1 FROM information_schema.table_constraints WHERE table_schema = current_schema() AND table_name = 'event_team_members' AND constraint_name = 'event_team_members_user_id_foreign'"))
            : !empty(DB::select("SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'event_team_members' AND CONSTRAINT_NAME = 'event_team_members_user_id_foreign'"));
        if (!$hasFk) {
            Schema::table('event_team_members', function (Blueprint $table) {
                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            });
        }

        // Add remaining columns if missing
        $addCols = [
            'name'      => fn(Blueprint $t) => $t->string('name')->nullable()->after('user_id'),
            'email'     => fn(Blueprint $t) => $t->string('email')->nullable()->after('name'),
            'phone'     => fn(Blueprint $t) => $t->string('phone')->nullable()->after('email'),
            'image_url' => fn(Blueprint $t) => $t->text('image_url')->nullable()->after('phone'),
        ];

        foreach ($addCols as $col => $defn) {
            if (!Schema::hasColumn('event_team_members', $col)) {
                Schema::table('event_team_members', $defn);
            }
        }
    }

    public function down(): void
    {
        Schema::table('event_team_members', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'name', 'email', 'phone', 'image_url']);
            $table->unsignedBigInteger('team_member_id')->after('event_id');
            $table->text('responsibilities')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unique(['event_id', 'team_member_id']);
        });
    }
};
