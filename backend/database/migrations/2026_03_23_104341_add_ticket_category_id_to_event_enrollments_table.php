<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('event_enrollments', function (Blueprint $table) {
            $table->unsignedBigInteger('ticket_category_id')->nullable()->after('user_email');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('event_enrollments', function (Blueprint $table) {
            $table->dropColumn('ticket_category_id');
        });
    }
};
