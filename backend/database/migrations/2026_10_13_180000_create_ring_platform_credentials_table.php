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
        Schema::create('ring_platform_credentials', function (Blueprint $table) {
            $table->id();
            // Singleton settings row — Eventry's own shared Ring Developer
            // app + Playground access token, previously the RING_ACCESS_TOKEN
            // / RING_CLIENT_ID / RING_CLIENT_SECRET / RING_HMAC_SECRET /
            // RING_PARTNER_ACCOUNT_IDENTIFIER env values. Moved to the DB so
            // admins can rotate them from /admin/ring-devices without a
            // redeploy. Env values remain as a fallback when this row/fields
            // are empty (see RingService::resolveAccessToken(),
            // RingCredentialResolver::forOwner()).
            $table->text('access_token')->nullable();
            $table->string('client_id')->nullable();
            $table->text('client_secret')->nullable();
            $table->text('hmac_secret')->nullable();
            $table->string('partner_account_identifier')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ring_platform_credentials');
    }
};
