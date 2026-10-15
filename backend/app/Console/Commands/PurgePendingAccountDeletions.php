<?php

namespace App\Console\Commands;

use App\Models\AccountDeletionArchive;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PurgePendingAccountDeletions extends Command
{
    protected $signature   = 'users:purge-pending-deletions';
    protected $description = 'Archive then hard-delete user accounts whose self-service deletion grace period has elapsed. Skips accounts under legal_hold.';

    public function handle(): int
    {
        $due = User::whereNotNull('scheduled_purge_at')
            ->where('scheduled_purge_at', '<=', now())
            ->where('legal_hold', false)
            ->get();

        $held = User::whereNotNull('scheduled_purge_at')
            ->where('scheduled_purge_at', '<=', now())
            ->where('legal_hold', true)
            ->count();

        $archiveDays = (int) env('ACCOUNT_ARCHIVE_RETENTION_DAYS', 365);

        foreach ($due as $user) {
            $id = $user->id;

            // Snapshot core account data before hard-delete, for fraud/legal
            // lookups that surface after the fact. Cascaded child data (cards,
            // events, payments, etc.) is NOT archived here — only the account
            // record itself.
            AccountDeletionArchive::create([
                'original_user_id' => $id,
                'email'            => $user->email,
                'payload'          => $user->toArray(),
                'purge_at'         => now()->addDays($archiveDays),
            ]);

            // Payments are financial records — retained (not cascaded), FK set
            // null on delete. Snapshot the email first since user_id won't
            // resolve to anything after the delete below.
            Payment::where('user_id', $id)->update(['archived_user_email' => $user->email]);

            // Cascades via FK ON DELETE CASCADE: Cards, QRCodes, ShortLinks,
            // EventEnrollments, Subscriptions, payout settings, affiliate
            // commissions/payouts. Payments are exempt (see above).
            $user->delete();
            Log::info("Purged account #{$id} after deletion grace period (archived {$archiveDays}d).");
        }

        $this->info("Purged " . $due->count() . " account(s). {$held} held for legal review.");

        return self::SUCCESS;
    }
}
