<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->renameColumn('date', 'start_date');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->date('end_date')->nullable()->after('start_date');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('end_date');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->renameColumn('start_date', 'date');
        });
    }
};
