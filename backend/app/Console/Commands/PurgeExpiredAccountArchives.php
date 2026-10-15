<?php

namespace App\Console\Commands;

use App\Models\AccountDeletionArchive;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PurgeExpiredAccountArchives extends Command
{
    protected $signature   = 'users:purge-expired-archives';
    protected $description = 'Delete account-deletion archive snapshots past their ACCOUNT_ARCHIVE_RETENTION_DAYS retention window.';

    public function handle(): int
    {
        $count = AccountDeletionArchive::where('purge_at', '<=', now())->count();
        AccountDeletionArchive::where('purge_at', '<=', now())->delete();

        Log::info("Purged {$count} expired account-deletion archive(s).");
        $this->info("Purged {$count} expired archive(s).");

        return self::SUCCESS;
    }
}
