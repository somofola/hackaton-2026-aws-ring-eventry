<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('sessions', 'event_sessions');
    }

    public function down(): void
    {
        Schema::rename('event_sessions', 'sessions');
    }
};
