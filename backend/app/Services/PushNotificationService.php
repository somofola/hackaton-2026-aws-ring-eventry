<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\NotificationType;
use App\Models\PushToken;
use App\Models\User;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    private const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    /** Send a notification to a single user (creates DB record + pushes to all devices) */
    public function sendToUser(
        User   $user,
        string $message,
        string $typeName,
        string $channel = 'app'
    ): void {
        $type = NotificationType::where('name', $typeName)->first();

        AppNotification::create([
            'user_id'              => $user->id,
            'notification_type_id' => $type?->id,
            'message'              => $message,
            'channel'              => $channel,
            'status'               => 'sent',
        ]);

        $this->pushToDevices($user, $message, $typeName);
    }

    /** Push to all registered FCM devices for a user */
    public function pushToDevices(User $user, string $message, string $title = 'Pass Mobile Extreme'): void
    {
        $tokens = PushToken::where('user_id', $user->id)->where('type', 'fcm')->get();

        if ($tokens->isNotEmpty()) {
            $this->sendFcmPush($tokens, $message, $title);
        }
    }

    /** Get an OAuth2 access token for FCM v1, cached for 55 minutes */
    private function getAccessToken(): ?string
    {
        return Cache::remember('fcm_v1_access_token', 3300, function () {
            $credentialsConfig = config('services.firebase.credentials');
            if (!$credentialsConfig) {
                Log::error('FCM: FIREBASE_CREDENTIALS not set.');
                return null;
            }

            // Support file path (relative to base_path) or raw/base64 JSON
            if (file_exists(base_path($credentialsConfig))) {
                $json = json_decode(file_get_contents(base_path($credentialsConfig)), true);
            } else {
                // Try base64-encoded JSON (useful for env-only deployments)
                $decoded = base64_decode($credentialsConfig, true);
                $json    = $decoded ? json_decode($decoded, true) : null;
            }

            if (!$json) {
                Log::error('FCM: Could not load Firebase service account credentials.');
                return null;
            }

            try {
                $credentials = new ServiceAccountCredentials(self::FCM_SCOPE, $json);
                $token       = $credentials->fetchAuthToken();
                return $token['access_token'] ?? null;
            } catch (\Throwable $e) {
                Log::error('FCM: Failed to fetch OAuth token: ' . $e->getMessage());
                return null;
            }
        });
    }

    /** Send via Firebase Cloud Messaging HTTP v1 API (one request per token) */
    private function sendFcmPush($tokens, string $message, string $title): void
    {
        $projectId   = config('services.firebase.project_id');
        $accessToken = $this->getAccessToken();
        $appUrl      = rtrim(config('app.url'), '/');
        $frontendUrl = rtrim(config('app.frontend_url'), '/');

        if (!$projectId || !$accessToken) {
            Log::error('FCM: Missing project ID or access token — push aborted.');
            return;
        }

        $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        foreach ($tokens as $pushToken) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type'  => 'application/json',
                ])->post($url, [
                    'message' => [
                        'token'        => $pushToken->token,
                        'notification' => [
                            'title' => 'Pass Mobile Extreme',
                            'body'  => $message,
                        ],
                        'data' => [
                            'url'   => '/user/notifications',
                            'title' => $title,
                            'body'  => $message,
                        ],
                        'webpush' => [
                            'notification' => [
                                'icon'  => $frontendUrl . '/logo-mobile.png',
                                'badge' => $frontendUrl . '/logo-mobile.png',
                            ],
                            'fcm_options' => [
                                'link' => $frontendUrl . '/user/notifications',
                            ],
                        ],
                        'android' => [
                            'notification' => [
                                'sound' => 'default',
                            ],
                        ],
                        'apns' => [
                            'headers' => [
                                'apns-priority' => '10',
                            ],
                            'payload' => [
                                'aps' => [
                                    'alert' => [
                                        'title' => 'Pass Mobile Extreme',
                                        'body'  => $message,
                                    ],
                                    'sound' => 'default',
                                    'badge' => 1,
                                ],
                            ],
                        ],
                    ],
                ]);

                if ($response->successful()) {
                    Log::info('FCM v1: delivered', ['token_id' => $pushToken->id]);
                } else {
                    $errorCode = $response->json('error.details.0.errorCode')
                        ?? $response->json('error.status')
                        ?? $response->json('error.message');

                    Log::warning('FCM v1: delivery failed', [
                        'token_id' => $pushToken->id,
                        'error'    => $errorCode,
                        'body'     => $response->json(), // full response for debugging
                    ]);

                    if (in_array($errorCode, ['UNREGISTERED', 'INVALID_ARGUMENT', 'SENDER_ID_MISMATCH'])) {
                        $pushToken->delete();
                    }
                }
            } catch (\Throwable $e) {
                Log::error('FCM v1: exception for token ' . $pushToken->id . ': ' . $e->getMessage());
            }
        }
    }

    /** Broadcast to all users subscribed to a type */
    public function broadcastInstant(string $message, string $typeName): void
    {
        $type = NotificationType::where('name', $typeName)->first();
        if (!$type) return;

        $userIds = \App\Models\NotificationSubscription::where('notification_type_id', $type->id)
            ->where('enabled', true)
            ->pluck('user_id')
            ->unique();

        foreach ($userIds as $userId) {
            $user = User::find($userId);
            if ($user) $this->sendToUser($user, $message, $typeName);
        }
    }

    /** Broadcast to ALL users (every role) regardless of subscription preferences */
    public function broadcastToAll(string $message, string $typeName): void
    {
        User::query()->each(function (User $user) use ($message, $typeName) {
            $this->sendToUser($user, $message, $typeName);
        });
    }
}
