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
        Schema::create('ring_devices', function (Blueprint $table) {
            $table->id();
            $table->string('device_id')->unique();
            $table->string('name');
            $table->string('location')->nullable();
            // 'platform' = admin-onboarded shared pool device. 'corporate' = a
            // corporate user onboarded their own device, which uses their own
            // linked Ring OAuth token (RingOAuthController) instead of the
            // shared RING_ACCESS_TOKEN — see RingService::resolveAccessToken().
            $table->enum('owner_type', ['platform', 'corporate'])->default('platform');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['available', 'assigned'])->default('available');
            $table->foreignId('assigned_event_id')->nullable()->constrained('events')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ring_devices');
    }
};
