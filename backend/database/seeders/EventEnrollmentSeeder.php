<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EventEnrollment;
use App\Models\Event;
use App\Models\User;
use Illuminate\Support\Str;

class EventEnrollmentSeeder extends Seeder
{
    public function run()
    {
        $events = Event::all();
        $users = User::where('role', 'user')->get();

        foreach ($events as $event) {
            // Create some enrollments for each event
            $enrollmentCount = rand(3, 8);
            
            for ($i = 0; $i < $enrollmentCount; $i++) {
                $user = $users->random();
                $status = rand(1, 10) > 7 ? 'attended' : 'enrolled'; // 30% chance of being attended
                
                EventEnrollment::create([
                    'event_id' => $event->id,
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'user_email' => $user->email,
                    'enrolled_at' => now()->subDays(rand(1, 30)),
                    'status' => $status,
                    'checked_in' => $status === 'attended',
                    'checked_in_at' => $status === 'attended' ? now()->subDays(rand(0, 5)) : null,
                    'checked_in_by' => $status === 'attended' ? 'Event Staff' : null,
                    'qr_code' => "event:{$event->id}:user:{$user->id}:" . time() . rand(1000, 9999),
                    'confirmation_number' => strtoupper(Str::random(8)),
                ]);
            }
        }
    }
}
