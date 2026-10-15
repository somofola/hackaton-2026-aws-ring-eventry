<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\NotificationType;
use Carbon\Carbon;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::all();
        $types = NotificationType::all()->keyBy('name');

        if ($users->isEmpty() || $types->isEmpty()) {
            $this->command->warn('No users or notification types found. Skipping.');
            return;
        }

        // Template messages per type [message, channel, status]
        $templates = [
            'alerts' => [
                ['New login detected from Chrome on Windows. If this wasn\'t you, please secure your account.', 'app',  'read'],
                ['Your password was changed successfully.',                                                      'web',  'sent'],
                ['Two new devices accessed your account in the last 24 hours.',                                 'app',  'pending'],
                ['Unrecognised login attempt blocked from IP 192.168.x.x.',                                     'web',  'read'],
                ['Your account email address was updated.',                                                     'app',  'sent'],
            ],
            'billing' => [
                ['Your subscription payment of NGN 5,000 was successful. Receipt available in Billing.',        'app',  'read'],
                ['Invoice #INV-00123 is ready for download.',                                                   'web',  'sent'],
                ['Your Pro Plan renews in 3 days. Ensure your payment method is up to date.',                   'app',  'pending'],
                ['Payment failed for your subscription. Please update your payment method.',                    'web',  'read'],
                ['You have successfully upgraded to the Business Plan.',                                        'app',  'sent'],
                ['Free trial ends in 2 days. Upgrade to keep all your cards and data.',                         'web',  'pending'],
            ],
            'card_activity' => [
                ['Someone viewed your "Software Engineer" business card.',                                      'app',  'read'],
                ['You received 5 new card views today.',                                                        'web',  'sent'],
                ['John Doe connected with your card.',                                                          'app',  'pending'],
                ['Your card has been shared 10 times this week.',                                               'web',  'read'],
                ['3 people scanned your QR code in the last hour.',                                             'app',  'sent'],
                ['Your card reached 100 total views!',                                                         'web',  'read'],
            ],
            'events' => [
                ['Reminder: "Tech Connect Lagos" starts in 24 hours. Check your ticket in My Events.',          'app',  'read'],
                ['You have been successfully checked in to "Startup Mixer 2026".',                              'web',  'sent'],
                ['A new session has been added to "Annual Business Summit". View the updated agenda.',          'app',  'pending'],
                ['Congratulations! Your event "Fintech Forum" is now live and accepting registrations.',        'web',  'read'],
                ['Your event ticket for "Web Dev Conf" has been confirmed. See you there!',                     'app',  'sent'],
                ['"Networking Night" has been rescheduled to March 20, 2026.',                                  'web',  'pending'],
            ],
            'reminders' => [
                ['You haven\'t updated your business card in 30 days. Keep it fresh!',                          'app',  'read'],
                ['You have 2 pending connections. Visit My Network to connect.',                                 'web',  'sent'],
                ['Reminder: Your subscription renewal is in 7 days.',                                           'app',  'pending'],
                ['Don\'t forget to share your card at today\'s event.',                                         'web',  'read'],
                ['Complete your profile to get 3× more card views.',                                            'app',  'sent'],
            ],
            'informational' => [
                ['New feature: You can now add video links to your business card. Try it now!',                 'app',  'read'],
                ['Eventry v3.2 is here — faster QR scanning and improved card templates.',                      'web',  'sent'],
                ['We\'ve updated our privacy policy. Please review the changes.',                               'app',  'pending'],
                ['Analytics dashboard now shows weekly trends. Check your card performance.',                   'web',  'read'],
                ['LinkedIn import is now available! Import your profile to create a card in seconds.',          'app',  'sent'],
            ],
            'promotions' => [
                ['🎉 50% off the Business Plan this weekend only. Use code EVENTRY50.',                         'app',  'read'],
                ['Refer a friend and get 1 month free on your subscription.',                                   'web',  'sent'],
                ['Exclusive offer: Upgrade to Pro and get unlimited cards for 6 months.',                      'app',  'pending'],
                ['Flash sale: All plans 30% off for the next 48 hours.',                                       'web',  'read'],
            ],
            'marketing' => [
                ['5 tips to make your digital business card stand out at networking events.',                   'app',  'read'],
                ['How top professionals use Eventry to grow their network — read the guide.',                   'web',  'sent'],
                ['This month\'s newsletter: QR code best practices and success stories.',                       'app',  'pending'],
                ['Webinar: "Digital Networking in 2026" — register for free.',                                  'web',  'read'],
                ['Case study: How a freelancer gained 200 connections with one business card.',                 'app',  'sent'],
            ],
        ];

        $rows = [];
        $now  = Carbon::now();

        foreach ($users as $user) {
            $offsetDays = 0;

            foreach ($templates as $typeName => $messages) {
                $type = $types->get($typeName);
                if (!$type) continue;

                foreach ($messages as [$message, $channel, $status]) {
                    $createdAt = $now->copy()->subDays($offsetDays)->subHours(rand(0, 23));
                    $readAt    = $status === 'read' ? $createdAt->copy()->addMinutes(rand(5, 120)) : null;

                    $rows[] = [
                        'user_id'              => $user->id,
                        'notification_type_id' => $type->id,
                        'message'              => $message,
                        'channel'              => $channel,
                        'status'               => $status,
                        'read_at'              => $readAt,
                        'created_at'           => $createdAt,
                        'updated_at'           => $createdAt,
                    ];

                    $offsetDays++;
                    if ($offsetDays > 60) $offsetDays = 0; // cycle back so dates stay within 60 days
                }
            }
        }

        // Insert in chunks to avoid memory issues
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('notifications')->insert($chunk);
        }

        $this->command->info('Seeded ' . count($rows) . ' notifications for ' . $users->count() . ' users.');
    }
}
