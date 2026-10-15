<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('secondary_email')->nullable()->unique()->after('email');
            $table->timestamp('secondary_email_verified_at')->nullable()->after('secondary_email');
            $table->string('secondary_email_pending')->nullable()->after('secondary_email_verified_at');
            $table->string('secondary_email_token', 64)->nullable()->after('secondary_email_pending');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'secondary_email',
                'secondary_email_verified_at',
                'secondary_email_pending',
                'secondary_email_token',
            ]);
        });
    }
};
