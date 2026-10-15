<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop FK from users table that references team_members (if any)
        if (Schema::hasColumn('users', 'team_member_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['team_member_id']);
                $table->dropColumn('team_member_id');
            });
        }

        Schema::dropIfExists('team_members');
    }

    public function down(): void
    {
        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('corporate_id');
            $table->string('user_id')->nullable();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('department')->nullable();
            $table->string('role')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->text('bio')->nullable();
            $table->boolean('has_card')->default(false);
            $table->unsignedInteger('card_views')->default(0);
            $table->foreign('corporate_id')->references('id')->on('users')->onDelete('cascade');
            $table->timestamps();
        });
    }
};
