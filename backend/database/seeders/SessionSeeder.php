<?php
namespace Database\Seeders;

use App\Models\EventSession;
use App\Models\User;
use Illuminate\Database\Seeder;

class SessionSeeder extends Seeder
{
    public function run()
    {
        $speakerId = fn(string $name) => User::where('name', $name)->where('role', 'speaker')->value('id');

        $sessions = [
            [
                'title' => 'The Future of AI in Business',
                'description' => 'Exploring how artificial intelligence is transforming business operations and creating new opportunities.',
                'start_time' => '2024-06-15 09:00:00',
                'end_time' => '2024-06-15 10:30:00',
                'speaker_ids' => [$speakerId('Dr. Sarah Johnson')],
                'location' => 'Main Auditorium',
                'capacity' => 500,
                'event_id' => 1,
            ],
            [
                'title' => 'Building Scalable Cloud Applications',
                'description' => 'Best practices for designing and implementing cloud-native applications that can handle massive scale.',
                'start_time' => '2024-06-15 11:00:00',
                'end_time' => '2024-06-15 12:30:00',
                'speaker_ids' => [$speakerId('Michael Chen')],
                'location' => 'Tech Hall',
                'capacity' => 300,
                'event_id' => 1,
            ],
            [
                'title' => 'User-Centered Design Workshop',
                'description' => 'Hands-on workshop covering design thinking principles and user research methodologies.',
                'start_time' => '2024-07-20 10:00:00',
                'end_time' => '2024-07-20 12:00:00',
                'speaker_ids' => [$speakerId('Emily Rodriguez')],
                'location' => 'Workshop Room A',
                'capacity' => 50,
                'event_id' => 2,
            ],
        ];

        foreach ($sessions as $session) {
            EventSession::create($session);
        }
    }
}
