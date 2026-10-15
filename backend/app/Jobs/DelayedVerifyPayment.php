<?php
namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Http\Controllers\PaymentController;
use Illuminate\Http\Request;

class DelayedVerifyPayment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $reference;

    public function __construct($reference)
    {
        $this->reference = $reference;
    }

    public function handle()
    {
        $controller = new PaymentController();
        $request = new Request([
            'reference' => $this->reference,
            'type' => 'recheckViaHook'
        ]);
        $controller->verifyPayment($request);
    }
}
