<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_team_members', function (Blueprint $table) {
            $table->string('invite_token', 64)->nullable()->unique()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('event_team_members', function (Blueprint $table) {
            $table->dropColumn('invite_token');
        });
    }
};
