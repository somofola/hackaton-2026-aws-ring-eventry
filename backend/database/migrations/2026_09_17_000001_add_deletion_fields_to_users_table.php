<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('deletion_requested_at')->nullable();
            $table->timestamp('scheduled_purge_at')->nullable();
            $table->boolean('legal_hold')->default(false)->after('scheduled_purge_at');
            $table->text('legal_hold_reason')->nullable()->after('legal_hold');
            $table->index('scheduled_purge_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['scheduled_purge_at']);
            $table->dropColumn(['deletion_requested_at', 'scheduled_purge_at', 'legal_hold', 'legal_hold_reason']);
        });
    }
};
