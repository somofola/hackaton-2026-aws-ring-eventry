<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // events table
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->renameColumn('company_id', 'corporate_id');
        });
        Schema::table('events', function (Blueprint $table) {
            $table->foreign('corporate_id')->references('id')->on('users')->onDelete('set null');
        });

        // team_members table
        Schema::table('team_members', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->renameColumn('company_id', 'corporate_id');
        });
        Schema::table('team_members', function (Blueprint $table) {
            $table->foreign('corporate_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['corporate_id']);
            $table->renameColumn('corporate_id', 'company_id');
        });
        Schema::table('events', function (Blueprint $table) {
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('set null');
        });

        Schema::table('team_members', function (Blueprint $table) {
            $table->dropForeign(['corporate_id']);
            $table->renameColumn('corporate_id', 'company_id');
        });
        Schema::table('team_members', function (Blueprint $table) {
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
        });
    }
};
