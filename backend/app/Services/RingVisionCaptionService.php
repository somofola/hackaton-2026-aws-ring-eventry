<?php

namespace App\Services;

use Aws\BedrockRuntime\BedrockRuntimeClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * AWS Builder mini-challenge (Devpost): captions the Ring doorbell's
 * thumbnail via Bedrock vision, so the check-in kiosk shows more than a
 * raw "motion detected" trigger — e.g. "Person at the door holding a phone,
 * appears to be an event attendee."
 *
 * Runs after the webhook has already responded to Ring (see
 * RingWebhookController::handle() — dispatched ->afterResponse()), since
 * Ring requires a 200 within 5 seconds and a Bedrock round-trip isn't
 * guaranteed to fit in that window.
 */
class RingVisionCaptionService
{
    private const CAPTION_CACHE_TTL_SECONDS = 45;

    public function captionAndCache(string $deviceId, string $thumbnailUrl): void
    {
        try {
            $imageResponse = Http::get($thumbnailUrl);

            if (!$imageResponse->successful()) {
                Log::warning('Ring vision caption: thumbnail download failed', ['status' => $imageResponse->status()]);
                return;
            }

            $caption = $this->caption($imageResponse->body());

            $status = cache()->get("ring:device:{$deviceId}:status", []);
            $status['caption'] = $caption;
            cache()->put("ring:device:{$deviceId}:status", $status, now()->addSeconds(self::CAPTION_CACHE_TTL_SECONDS));
        } catch (\Throwable $e) {
            Log::warning('Ring vision caption failed', ['device_id' => $deviceId, 'error' => $e->getMessage()]);
        }
    }

    private function caption(string $imageBytes): ?string
    {
        $client = new BedrockRuntimeClient([
            'region' => config('services.bedrock.region'),
            'version' => 'latest',
            'credentials' => [
                'key' => config('services.bedrock.key'),
                'secret' => config('services.bedrock.secret'),
            ],
        ]);

        $result = $client->converse([
            'modelId' => config('services.bedrock.model_id'),
            'messages' => [[
                'role' => 'user',
                'content' => [
                    ['image' => ['format' => 'jpeg', 'source' => ['bytes' => $imageBytes]]],
                    ['text' => 'One short sentence: who or what is approaching this event check-in kiosk doorbell? Be factual, no speculation about identity.'],
                ],
            ]],
            'inferenceConfig' => ['maxTokens' => 60],
        ]);

        return $result['output']['message']['content'][0]['text'] ?? null;
    }
}
