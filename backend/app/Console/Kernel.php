<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */
    protected function schedule(Schedule $schedule)
    {
        // Send batched notification summaries every 6 hours (views/trending)
        $schedule->command('notifications:send-summary')->everySixHours();

        // Weekly event digest for users — every Monday at 09:00
        $schedule->command('events:send-weekly-summary')->weeklyOn(1, '09:00');

        // Mark events as completed once their end date/time has passed — every 15 minutes
        $schedule->command('events:mark-completed')->everyFifteenMinutes();

        // Delete Rekognition face data for events that have ended — daily at 03:00
        $schedule->command('ring:purge-face-data')->dailyAt('03:00');

        // Prune notifications older than 60 days — daily at 02:00
        $schedule->command('notifications:prune')->dailyAt('02:00');

        // Hard-delete accounts past their self-service deletion grace period
        // (App Store §5.1.1(v) / Play account-deletion policy). Skips legal_hold.
        $schedule->command('users:purge-pending-deletions')->dailyAt('03:00');

        // Delete account-deletion archive snapshots past ACCOUNT_ARCHIVE_RETENTION_DAYS.
        $schedule->command('users:purge-expired-archives')->dailyAt('03:30');
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
