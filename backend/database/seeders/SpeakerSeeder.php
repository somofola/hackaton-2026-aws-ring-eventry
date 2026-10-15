<?php
namespace Database\Seeders;

use App\Models\Speaker;
use Illuminate\Database\Seeder;

class SpeakerSeeder extends Seeder
{
    public function run()
    {
        $speakers = [
            [
                'name' => 'Dr. Sarah Johnson',
                'title' => 'Chief Technology Officer',
                'company' => 'TechCorp Inc.',
                'bio' => 'Dr. Johnson is a leading expert in artificial intelligence and machine learning with over 15 years of experience in the tech industry.',
                'image_url' => 'https://images.unsplash.com/photo-1494790108755-2616b612b77c?w=300',
                'social' => [
                    'linkedin' => 'https://linkedin.com/in/sarahjohnson',
                    'twitter' => 'https://twitter.com/sarahjohnson'
                ],
                'event_id' => 1,
            ],
            [
                'name' => 'Michael Chen',
                'title' => 'Senior Software Architect',
                'company' => 'CloudSoft Solutions',
                'bio' => 'Michael specializes in cloud architecture and distributed systems, helping companies scale their applications to millions of users.',
                'image_url' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300',
                'social' => [
                    'linkedin' => 'https://linkedin.com/in/michaelchen',
                    'twitter' => 'https://twitter.com/michaelchen'
                ],
                'event_id' => 1,
            ],
            [
                'name' => 'Emily Rodriguez',
                'title' => 'UX Design Lead',
                'company' => 'Design Studio Pro',
                'bio' => 'Emily is passionate about creating user-centered designs that solve real-world problems and improve user experiences.',
                'image_url' => 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300',
                'social' => [
                    'linkedin' => 'https://linkedin.com/in/emilyrodriguez',
                    'twitter' => 'https://twitter.com/emilyrodriguez'
                ],
                'event_id' => 2,
            ],
        ];

        foreach ($speakers as $speaker) {
            Speaker::create($speaker);
        }
    }
}
