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
        Schema::create('ring_owner_credentials', function (Blueprint $table) {
            $table->id();
            // One row per corporate user who registered their own Ring
            // Developer app (instead of using Eventry's shared one) because
            // they're onboarding their own devices under their own Ring
            // account. Ring's Token Exchange / Account Link URLs are
            // per-app, so those routes carry this owner_id in the path to
            // know which credentials to use (see RingOAuthController).
            $table->foreignId('owner_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('client_id');
            $table->text('client_secret');
            $table->text('hmac_secret');
            $table->string('partner_account_identifier')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ring_owner_credentials');
    }
};
