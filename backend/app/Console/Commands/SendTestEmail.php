<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendTestEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mail:test {to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a test email using Resend SMTP';

    /**
     * Execute the console command.
     */

    public function handle()
    {
        $to = $this->argument('to');

        Mail::raw('This is a test email from Laravel using Resend SMTP.', function ($message) use ($to) {
            $message->to($to)
                    ->subject('Test Email from Laravel');
        });

        $this->info("Test email sent to {$to}");
    }
}
