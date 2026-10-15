<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\Transfer;
use Stripe\Payout;
use Stripe\Account;
use Stripe\AccountLink;

class StripePayoutService
{
    public function __construct()
    {
        Stripe::setApiKey(config('services.stripe.secret') ?: env('STRIPE_SECRET'));
    }

    /**
     * Create a Stripe Connect Express account for the user.
     * This is required for transferring funds to users.
     */
    public function createConnectedAccount(string $email, string $country = 'US'): array
    {
        try {
            $account = Account::create([
                'type' => 'express',
                'country' => $country,
                'email' => $email,
                'capabilities' => [
                    'transfers' => ['requested' => true],
                ],
            ]);

            Log::info('Stripe connected account created', [
                'account_id' => $account->id,
                'email' => $email,
            ]);

            return [
                'success' => true,
                'data' => [
                    'account_id' => $account->id,
                    'details_submitted' => $account->details_submitted,
                    'charges_enabled' => $account->charges_enabled,
                    'payouts_enabled' => $account->payouts_enabled,
                ]
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe create account failed', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Create an account link for onboarding (redirect user to Stripe).
     */
    public function createAccountLink(string $accountId, string $refreshUrl, string $returnUrl): array
    {
        try {
            $accountLink = AccountLink::create([
                'account' => $accountId,
                'refresh_url' => $refreshUrl,
                'return_url' => $returnUrl,
                'type' => 'account_onboarding',
            ]);

            return [
                'success' => true,
                'data' => [
                    'url' => $accountLink->url,
                    'expires_at' => $accountLink->expires_at,
                ]
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe create account link failed', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Retrieve a connected account to check status.
     */
    public function getAccount(string $accountId): array
    {
        try {
            $account = Account::retrieve($accountId);

            return [
                'success' => true,
                'data' => [
                    'account_id' => $account->id,
                    'details_submitted' => $account->details_submitted,
                    'charges_enabled' => $account->charges_enabled,
                    'payouts_enabled' => $account->payouts_enabled,
                    'country' => $account->country,
                    'default_currency' => $account->default_currency,
                ]
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe get account failed', ['error' => $e->getMessage(), 'account_id' => $accountId]);
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Create a transfer to a connected account.
     * Use this to move funds from your platform balance to a connected account.
     *
     * @param string $connectedAccountId The connected account ID
     * @param int $amountInCents Amount in cents
     * @param string $currency Currency code (usd, eur, etc.)
     * @param string|null $transferGroup Optional transfer group for tracking
     * @return array
     */
    public function createTransfer(
        string $connectedAccountId,
        int $amountInCents,
        string $currency = 'usd',
        ?string $description = null,
        ?string $transferGroup = null
    ): array {
        try {
            $params = [
                'amount' => $amountInCents,
                'currency' => strtolower($currency),
                'destination' => $connectedAccountId,
            ];

            if ($description) {
                $params['description'] = $description;
            }

            if ($transferGroup) {
                $params['transfer_group'] = $transferGroup;
            }

            $transfer = Transfer::create($params);

            Log::info('Stripe transfer created', [
                'transfer_id' => $transfer->id,
                'amount' => $amountInCents,
                'currency' => $currency,
                'destination' => $connectedAccountId,
            ]);

            return [
                'success' => true,
                'data' => [
                    'transfer_id' => $transfer->id,
                    'amount' => $transfer->amount,
                    'currency' => $transfer->currency,
                    'destination' => $transfer->destination,
                    'created' => $transfer->created,
                ]
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe transfer failed', [
                'error' => $e->getMessage(),
                'destination' => $connectedAccountId,
                'amount' => $amountInCents,
            ]);
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get transfer status.
     */
    public function getTransfer(string $transferId): array
    {
        try {
            $transfer = Transfer::retrieve($transferId);

            return [
                'success' => true,
                'data' => [
                    'transfer_id' => $transfer->id,
                    'amount' => $transfer->amount,
                    'currency' => $transfer->currency,
                    'destination' => $transfer->destination,
                    'reversed' => $transfer->reversed,
                    'created' => $transfer->created,
                ]
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe get transfer failed', ['error' => $e->getMessage(), 'transfer_id' => $transferId]);
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Create a payout from a connected account's balance to their bank account.
     * This is used after transferring funds to the connected account.
     *
     * @param string $connectedAccountId The connected account ID
     * @param int $amountInCents Amount in cents
     * @param string $currency Currency code
     * @return array
     */
    public function createPayout(
        string $connectedAccountId,
        int $amountInCents,
        string $currency = 'usd',
        ?string $description = null
    ): array {
        try {
            $params = [
                'amount' => $amountInCents,
                'currency' => strtolower($currency),
            ];

            if ($description) {
                $params['description'] = $description;
            }

            // Create payout on behalf of the connected account
            $payout = Payout::create($params, [
                'stripe_account' => $connectedAccountId,
            ]);

            Log::info('Stripe payout created', [
                'payout_id' => $payout->id,
                'amount' => $amountInCents,
                'currency' => $currency,
                'account' => $connectedAccountId,
                'status' => $payout->status,
            ]);

            return [
                'success' => true,
                'data' => [
                    'payout_id' => $payout->id,
                    'amount' => $payout->amount,
                    'currency' => $payout->currency,
                    'status' => $payout->status,
                    'arrival_date' => $payout->arrival_date,
                ]
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe payout failed', [
                'error' => $e->getMessage(),
                'account' => $connectedAccountId,
                'amount' => $amountInCents,
            ]);
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }

    /**
     * Get payout status.
     */
    public function getPayout(string $payoutId, string $connectedAccountId): array
    {
        try {
            $payout = Payout::retrieve($payoutId, [
                'stripe_account' => $connectedAccountId,
            ]);

            return [
                'success' => true,
                'data' => [
                    'payout_id' => $payout->id,
                    'amount' => $payout->amount,
                    'currency' => $payout->currency,
                    'status' => $payout->status,
                    'arrival_date' => $payout->arrival_date,
                    'failure_code' => $payout->failure_code,
                    'failure_message' => $payout->failure_message,
                ]
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            Log::error('Stripe get payout failed', ['error' => $e->getMessage(), 'payout_id' => $payoutId]);
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
}
