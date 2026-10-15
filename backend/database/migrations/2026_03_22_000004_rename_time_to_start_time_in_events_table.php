<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->renameColumn('time', 'start_time');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->string('end_time')->nullable()->after('start_time');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn('end_time');
        });

        Schema::table('events', function (Blueprint $table) {
            $table->renameColumn('start_time', 'time');
        });
    }
};
