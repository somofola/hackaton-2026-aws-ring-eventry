<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_ticket_categories', function (Blueprint $table) {
            $table->json('floor_plan_areas')->nullable()->after('sort_order');
        });
    }

    public function down(): void
    {
        Schema::table('event_ticket_categories', function (Blueprint $table) {
            $table->dropColumn('floor_plan_areas');
        });
    }
};
