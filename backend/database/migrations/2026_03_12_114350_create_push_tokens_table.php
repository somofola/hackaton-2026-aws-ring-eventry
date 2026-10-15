<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            // 'web' = browser Web Push, 'fcm' = Firebase (Android/iOS)
            $table->enum('type', ['web', 'fcm'])->default('web');
            // For web: JSON {endpoint, keys: {p256dh, auth}}
            // For fcm: the FCM registration token string
            $table->text('token');
            $table->string('device_id')->nullable(); // browser fingerprint or device UUID
            $table->timestamps();

            $table->index(['user_id', 'type']);
            $table->unique(['user_id', 'device_id', 'type'], 'push_tokens_user_device_type_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_tokens');
    }
};
