<?php
namespace Database\Seeders;

use App\Models\Payment;
use Illuminate\Database\Seeder;

class PaymentSeeder extends Seeder
{
    public function run()
    {
        $payments = [
            [
                'user_id' => 1,
                'amount' => 19.99,
                'currency' => 'usd',
                'status' => 'completed',
                'stripe_payment_id' => 'pi_1234567890',
                'subscription_plan_id' => 1,
                'description' => 'Premium Plan - Monthly',
                'paid_at' => '2024-01-15 10:30:00',
            ],
            [
                'user_id' => 2,
                'amount' => 49.99,
                'currency' => 'usd',
                'status' => 'completed',
                'stripe_payment_id' => 'pi_0987654321',
                'subscription_plan_id' => 2,
                'description' => 'Professional Plan - Monthly',
                'paid_at' => '2024-01-20 14:15:00',
            ],
            [
                'user_id' => 3,
                'amount' => 99.99,
                'currency' => 'usd',
                'status' => 'pending',
                'stripe_payment_id' => 'pi_5555555555',
                'subscription_plan_id' => 3,
                'description' => 'Enterprise Plan - Monthly',
                'paid_at' => null,
            ],
        ];

        foreach ($payments as $payment) {
            Payment::create($payment);
        }
    }
}
