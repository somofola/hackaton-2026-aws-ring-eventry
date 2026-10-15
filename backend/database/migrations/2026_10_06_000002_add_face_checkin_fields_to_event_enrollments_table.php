<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Face check-in is opt-in and scoped per-enrollment (per event, per user) —
 * never a global user profile field. Rekognition itself stores the face
 * vector inside a per-event Collection (see RingFaceService), not here;
 * this table only tracks consent + whether indexing happened, so the
 * purge job (PurgeEventFaceData) knows what to clean up.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_enrollments', function (Blueprint $table) {
            $table->boolean('face_checkin_opt_in')->default(false)->after('qr_code');
            $table->timestamp('face_indexed_at')->nullable()->after('face_checkin_opt_in');
        });
    }

    public function down(): void
    {
        Schema::table('event_enrollments', function (Blueprint $table) {
            $table->dropColumn(['face_checkin_opt_in', 'face_indexed_at']);
        });
    }
};
