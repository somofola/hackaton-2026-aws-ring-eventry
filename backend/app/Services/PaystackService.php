<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class PaystackService
{
    protected $secret;
    protected $baseUrl = 'https://api.paystack.co';

    public function __construct()
    {
        $this->secret = config('services.paystack.secret_key') ?: env('PAYSTACK_SECRET_KEY');
    }

    /**
     * Initialize a Paystack transaction.
     */
    public function initializeTransaction($email, $amount, $reference, $currency = 'NGN')
    {
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->post($this->baseUrl . '/transaction/initialize', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secret,
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'email' => $email,
                    'amount' => (int) $amount, // in kobo
                    'currency' => $currency,
                    'reference' => $reference,
                    'callback_url' => url(env('PAYSTACK_CALLBACK_URL', config('app.url') . '/api/payments/verify')),
                ]
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if ($result['status']) {
                return [
                    'success' => true,
                    'data' => $result['data']
                ];
            } else {
                Log::error('Paystack initialization failed', [
                    'reference' => $reference,
                    'response' => $result
                ]);

                return [
                    'success' => false,
                    'message' => 'Payment initialization failed: ' . ($result['message'] ?? 'Unknown error')
                ];
            }
        } catch (\Exception $e) {
            Log::error('Paystack initialization exception', [
                'reference' => $reference,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Exception occurred while initializing payment: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Verify a Paystack transaction.
     */
    public function verifyTransaction($reference)
    {
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->get("{$this->baseUrl}/transaction/verify/{$reference}", [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secret
                ]
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if ($result['status'] && $result['data']['status'] === 'success') {
                return [
                    'success' => true,
                    'data' => $result['data']
                ];
            } else {
                Log::error('Paystack verification failed', [
                    'reference' => $reference,
                    'response' => $result
                ]);

                return [
                    'success' => false,
                    'message' => 'Payment verification failed: ' . ($result['message'] ?? 'Unknown error')
                ];
            }
        } catch (\Exception $e) {
            Log::error('Paystack verification exception', [
                'reference' => $reference,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Exception occurred while verifying payment: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get Paystack public key.
     */
    public function getPublicKey(): string
    {
        return config('services.paystack.public_key') ?: env('PAYSTACK_PUBLIC_KEY');
    }

    // ─── Transfer API Methods (for affiliate payouts) ────────────────────────────

    /**
     * List all Nigerian banks supported by Paystack.
     */
    public function listBanks(string $country = 'nigeria', string $currency = 'NGN'): array
    {
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->get($this->baseUrl . '/bank', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secret,
                ],
                'query' => [
                    'country' => $country,
                    'currency' => $currency,
                ]
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if ($result['status']) {
                return [
                    'success' => true,
                    'data' => $result['data']
                ];
            }

            return [
                'success' => false,
                'message' => $result['message'] ?? 'Failed to fetch banks'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack list banks exception', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'Exception occurred: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Resolve/verify a bank account number.
     * Returns account name if valid.
     */
    public function resolveAccountNumber(string $accountNumber, string $bankCode): array
    {
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->get($this->baseUrl . '/bank/resolve', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secret,
                ],
                'query' => [
                    'account_number' => $accountNumber,
                    'bank_code' => $bankCode,
                ]
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if ($result['status']) {
                return [
                    'success' => true,
                    'data' => $result['data'] // Contains account_number, account_name, bank_id
                ];
            }

            return [
                'success' => false,
                'message' => $result['message'] ?? 'Account verification failed'
            ];
        } catch (\GuzzleHttp\Exception\ClientException $e) {
            $response = $e->getResponse();
            $body = json_decode($response->getBody()->getContents(), true);
            Log::error('Paystack resolve account failed', ['error' => $body]);
            return [
                'success' => false,
                'message' => $body['message'] ?? 'Account verification failed'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack resolve account exception', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'Exception occurred: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Create a transfer recipient.
     * This is required before making transfers.
     */
    public function createTransferRecipient(
        string $name,
        string $accountNumber,
        string $bankCode,
        string $currency = 'NGN',
        string $type = 'nuban'
    ): array {
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->post($this->baseUrl . '/transferrecipient', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secret,
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'type' => $type,
                    'name' => $name,
                    'account_number' => $accountNumber,
                    'bank_code' => $bankCode,
                    'currency' => $currency,
                ]
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if ($result['status']) {
                Log::info('Paystack transfer recipient created', [
                    'recipient_code' => $result['data']['recipient_code'],
                    'name' => $name,
                ]);
                return [
                    'success' => true,
                    'data' => $result['data'] // Contains recipient_code, etc.
                ];
            }

            return [
                'success' => false,
                'message' => $result['message'] ?? 'Failed to create transfer recipient'
            ];
        } catch (\GuzzleHttp\Exception\ClientException $e) {
            $response = $e->getResponse();
            $body = json_decode($response->getBody()->getContents(), true);
            Log::error('Paystack create recipient failed', ['error' => $body]);
            return [
                'success' => false,
                'message' => $body['message'] ?? 'Failed to create transfer recipient'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack create recipient exception', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'Exception occurred: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Initiate a transfer to a recipient.
     *
     * @param string $recipientCode The recipient code from createTransferRecipient
     * @param int $amountInKobo Amount in kobo (100 kobo = 1 NGN)
     * @param string $reason Description for the transfer
     * @param string|null $reference Unique reference (auto-generated if null)
     * @return array
     */
    public function initiateTransfer(
        string $recipientCode,
        int $amountInKobo,
        string $reason,
        ?string $reference = null
    ): array {
        try {
            $reference = $reference ?? 'TRF_' . uniqid() . '_' . time();

            $client = new \GuzzleHttp\Client();
            $response = $client->post($this->baseUrl . '/transfer', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secret,
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    'source' => 'balance',
                    'amount' => $amountInKobo,
                    'recipient' => $recipientCode,
                    'reason' => $reason,
                    'reference' => $reference,
                ]
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if ($result['status']) {
                Log::info('Paystack transfer initiated', [
                    'reference' => $reference,
                    'amount' => $amountInKobo,
                    'recipient' => $recipientCode,
                    'transfer_code' => $result['data']['transfer_code'] ?? null,
                    'status' => $result['data']['status'] ?? null,
                ]);
                return [
                    'success' => true,
                    'data' => $result['data'] // Contains transfer_code, status, etc.
                ];
            }

            Log::error('Paystack transfer failed', [
                'reference' => $reference,
                'response' => $result,
            ]);

            return [
                'success' => false,
                'message' => $result['message'] ?? 'Transfer failed'
            ];
        } catch (\GuzzleHttp\Exception\ClientException $e) {
            $response = $e->getResponse();
            $body = json_decode($response->getBody()->getContents(), true);
            Log::error('Paystack transfer exception', ['error' => $body, 'reference' => $reference]);
            return [
                'success' => false,
                'message' => $body['message'] ?? 'Transfer failed'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack transfer exception', ['error' => $e->getMessage(), 'reference' => $reference]);
            return [
                'success' => false,
                'message' => 'Exception occurred: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Verify/check the status of a transfer.
     */
    public function verifyTransfer(string $reference): array
    {
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->get($this->baseUrl . '/transfer/verify/' . $reference, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secret,
                ]
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if ($result['status']) {
                return [
                    'success' => true,
                    'data' => $result['data'] // Contains status, amount, recipient, etc.
                ];
            }

            return [
                'success' => false,
                'message' => $result['message'] ?? 'Transfer verification failed'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack verify transfer exception', ['error' => $e->getMessage(), 'reference' => $reference]);
            return [
                'success' => false,
                'message' => 'Exception occurred: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Get transfer balance.
     */
    public function getBalance(): array
    {
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->get($this->baseUrl . '/balance', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->secret,
                ]
            ]);

            $result = json_decode($response->getBody()->getContents(), true);

            if ($result['status']) {
                return [
                    'success' => true,
                    'data' => $result['data']
                ];
            }

            return [
                'success' => false,
                'message' => $result['message'] ?? 'Failed to fetch balance'
            ];
        } catch (\Exception $e) {
            Log::error('Paystack get balance exception', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'Exception occurred: ' . $e->getMessage()
            ];
        }
    }
}
