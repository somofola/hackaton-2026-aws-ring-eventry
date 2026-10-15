<?php

namespace App\Console\Commands;

use App\Models\AppNotification;
use Illuminate\Console\Command;

class PruneOldNotifications extends Command
{
    protected $signature   = 'notifications:prune {--days=60 : Delete notifications older than this many days}';
    protected $description = 'Delete notifications older than the specified number of days (default: 60)';

    public function handle(): int
    {
        $days    = (int) $this->option('days');
        $cutoff  = now()->subDays($days);
        $deleted = AppNotification::where('created_at', '<', $cutoff)->delete();

        $this->info("Pruned {$deleted} notification(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
