<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop the now-unused speaker_id column from event_session_speakers
        Schema::table('event_session_speakers', function (Blueprint $table) {
            $table->dropColumn('speaker_id');
        });

        // Drop the speakers table
        Schema::dropIfExists('speakers');
    }

    public function down(): void
    {
        Schema::table('event_session_speakers', function (Blueprint $table) {
            $table->unsignedBigInteger('speaker_id')->nullable()->after('session_id');
        });

        Schema::create('speakers', function (\Illuminate\Database\Schema\Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('title');
            $table->string('company');
            $table->text('bio');
            $table->text('image_url')->nullable();
            $table->json('social')->nullable();
            $table->foreignId('event_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }
};
