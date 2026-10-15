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
        Schema::create('ring_linked_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('ring_account_id');
            // Encrypted at rest via the model's 'encrypted' cast (Laravel's
            // APP_KEY-backed encrypter) — this replaces the old cache-only
            // storage (ring:linked_account:{user_id}), which silently
            // evaporated on any cache flush/restart with no re-link warning.
            $table->text('access_token');
            $table->text('refresh_token');
            $table->timestamp('expires_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ring_linked_accounts');
    }
};
