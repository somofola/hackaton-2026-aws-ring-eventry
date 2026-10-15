<?php
namespace Database\Seeders;

use App\Models\Event;
use Illuminate\Database\Seeder;

class EventSeeder extends Seeder
{
    public function run()
    {
        $events = [
            [
                'title' => 'Tech Conference 2024',
                'description' => 'Join us for the biggest technology conference of the year featuring industry leaders and cutting-edge innovations.',
                'start_date' => '2024-06-15',
                'start_time' => '09:00 AM',
                'location' => 'San Francisco Convention Center',
                'max_attendees' => 500,
                'current_attendees' => 247,
                'price' => 199.00,
                'image_url' => 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
                'organizer_id' => 1,
                'organizer_name' => 'John Doe',
                'status' => 'live',
                'tags' => ['technology', 'conference', 'networking'],
            ],
            [
                'title' => 'Design Workshop 2024',
                'description' => 'A hands-on workshop focused on modern design principles and user experience best practices.',
                'date' => '2024-07-20',
                'time' => '10:00 AM',
                'location' => 'Design Studio Downtown',
                'max_attendees' => 50,
                'current_attendees' => 23,
                'price' => 99.00,
                'image_url' => 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64',
                'organizer_id' => 2,
                'organizer_name' => 'Jane Smith',
                'status' => 'live',
                'tags' => ['design', 'workshop', 'ux'],
            ],
            [
                'title' => 'Startup Pitch Day',
                'description' => 'Watch innovative startups pitch their ideas to a panel of investors and industry experts.',
                'date' => '2024-08-10',
                'time' => '02:00 PM',
                'location' => 'Innovation Hub',
                'max_attendees' => 200,
                'current_attendees' => 0,
                'price' => 0.00,
                'image_url' => 'https://images.unsplash.com/photo-1559136555-9303baea8ebd',
                'organizer_id' => 1,
                'organizer_name' => 'John Doe',
                'status' => 'draft',
                'tags' => ['startup', 'pitch', 'investment'],
            ],
        ];

        foreach ($events as $event) {
            Event::create($event);
        }
    }
}
