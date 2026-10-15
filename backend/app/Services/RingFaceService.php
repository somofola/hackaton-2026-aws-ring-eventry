<?php

namespace App\Services;

use Aws\Rekognition\Exception\RekognitionException;
use Aws\Rekognition\RekognitionClient;
use Illuminate\Support\Facades\Log;

/**
 * One Rekognition Face Collection per event ("event-{event_id}"). Faces are
 * indexed only from an attendee's own opt-in registration photo
 * (externalImageId = enrollment id, so a match tells us exactly which
 * enrollment, not identity beyond that). Collection is deleted wholesale by
 * PurgeEventFaceData once the event ends — that's the "ephemeral" guarantee:
 * Rekognition stores the face vector, not the photo, and the vector is gone
 * the moment the collection is deleted.
 */
class RingFaceService
{
    private RekognitionClient $client;

    public function __construct()
    {
        $this->client = new RekognitionClient([
            'region' => config('services.rekognition.region'),
            'version' => 'latest',
            'credentials' => [
                'key' => config('services.rekognition.key'),
                'secret' => config('services.rekognition.secret'),
            ],
        ]);
    }

    public function collectionId(int $eventId): string
    {
        return "event-{$eventId}";
    }

    public function ensureCollection(int $eventId): void
    {
        try {
            $this->client->createCollection(['CollectionId' => $this->collectionId($eventId)]);
        } catch (RekognitionException $e) {
            if ($e->getAwsErrorCode() !== 'ResourceAlreadyExistsException') {
                throw $e;
            }
        }
    }

    /** Index an attendee's opt-in registration photo. Returns false if no usable face found. */
    public function indexFace(int $eventId, int $enrollmentId, string $imageBytes): bool
    {
        $this->ensureCollection($eventId);

        $result = $this->client->indexFaces([
            'CollectionId' => $this->collectionId($eventId),
            'ExternalImageId' => (string) $enrollmentId,
            'Image' => ['Bytes' => $imageBytes],
            'MaxFaces' => 1,
            'QualityFilter' => 'AUTO',
            'DetectionAttributes' => [],
        ]);

        return count($result['FaceRecords'] ?? []) > 0;
    }

    /**
     * Match a captured frame against an event's collection.
     * Returns the matched enrollment_id, or null if no confident match.
     */
    public function searchByImage(int $eventId, string $imageBytes): ?int
    {
        try {
            $result = $this->client->searchFacesByImage([
                'CollectionId' => $this->collectionId($eventId),
                'Image' => ['Bytes' => $imageBytes],
                'FaceMatchThreshold' => (float) config('services.rekognition.match_threshold'),
                'MaxFaces' => 1,
            ]);
        } catch (RekognitionException $e) {
            // InvalidParameterException is thrown when no face is detected in the
            // frame at all (normal — most polled frames won't have one centered).
            if ($e->getAwsErrorCode() === 'InvalidParameterException') {
                return null;
            }
            Log::warning('Rekognition searchFacesByImage failed', ['event_id' => $eventId, 'error' => $e->getMessage()]);
            return null;
        }

        $match = $result['FaceMatches'][0] ?? null;

        if (!$match) {
            return null;
        }

        return (int) $match['Face']['ExternalImageId'];
    }

    public function deleteCollection(int $eventId): void
    {
        try {
            $this->client->deleteCollection(['CollectionId' => $this->collectionId($eventId)]);
        } catch (RekognitionException $e) {
            if ($e->getAwsErrorCode() !== 'ResourceNotFoundException') {
                throw $e;
            }
        }
    }
}
