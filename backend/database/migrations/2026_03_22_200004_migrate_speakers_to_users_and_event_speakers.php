<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $speakerIdToUserId = [];

        $speakers = DB::table('speakers')->get();

        foreach ($speakers as $speaker) {
            // Generate a placeholder email for speakers without one
            $email = 'speaker_' . Str::uuid() . '@eventry.internal';

            $userId = DB::table('users')->insertGetId([
                'name'              => $speaker->name,
                'email'             => $email,
                'password'          => Hash::make(Str::random(24)),
                'role'              => 'speaker',
                'description'       => $speaker->bio ?? null,
                'profile_image_url' => $speaker->image_url ?? null,
                'email_verified_at' => now(),
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);

            $speakerIdToUserId[$speaker->id] = $userId;

            DB::table('event_speakers')->insert([
                'event_id'   => $speaker->event_id,
                'user_id'    => $userId,
                'title'      => $speaker->title ?? null,
                'company'    => $speaker->company ?? null,
                'social'     => $speaker->social,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Update event_session_speakers to use user_id
        $pivots = DB::table('event_session_speakers')->get();
        foreach ($pivots as $pivot) {
            if (isset($speakerIdToUserId[$pivot->speaker_id])) {
                DB::table('event_session_speakers')
                    ->where('id', $pivot->id)
                    ->update(['user_id' => $speakerIdToUserId[$pivot->speaker_id]]);
            }
        }

        // Update speaker_ids JSON in event_sessions to use user_ids
        $sessions = DB::table('event_sessions')->whereNotNull('speaker_ids')->get();
        foreach ($sessions as $session) {
            $oldIds = json_decode($session->speaker_ids, true) ?? [];
            $newIds = array_values(array_filter(array_map(
                fn($id) => $speakerIdToUserId[$id] ?? null,
                $oldIds
            )));
            DB::table('event_sessions')
                ->where('id', $session->id)
                ->update(['speaker_ids' => json_encode($newIds)]);
        }
    }

    public function down(): void
    {
        // Irreversible data migration — clear event_speakers and migrated users
        DB::table('event_speakers')->delete();
        DB::table('users')->where('role', 'speaker')
            ->where('email', 'like', 'speaker_%@eventry.internal')
            ->delete();
    }
};
