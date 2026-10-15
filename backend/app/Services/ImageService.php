<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Encoders\WebpEncoder;

class ImageService
{
    private const WEBP_QUALITY = 80;
    private const SCALE_FACTOR = 0.75; // shrink to 75 % of current dimensions each iteration
    private const MIN_WIDTH_PX = 100;

    /**
     * Convert an uploaded image to a metadata-free WebP.
     * If the encoded size exceeds IMAGE_MAX_SIZE_KB (from .env), the image
     * dimensions are scaled down iteratively until it fits or the minimum
     * width is reached.
     *
     * Returns raw binary content ready for Storage::put().
     */
    public function processCardImage(UploadedFile $file, int $maxKb = 0): string
    {
        $maxBytes = ($maxKb > 0 ? $maxKb : (int) env('IMAGE_MAX_SIZE_KB', 25)) * 1024;

        $manager = new ImageManager(new GdDriver());
        $image = $manager->read($file->getPathname());

        // Auto-orient from EXIF rotation; Intervention v3 strips all metadata
        // when encoding to WebP, so no explicit strip step is needed.
        $image->orient();

        $encoded = $image->encode(new WebpEncoder(quality: self::WEBP_QUALITY));

        // Iteratively shrink dimensions until the output fits within the limit
        while (strlen((string) $encoded) > $maxBytes && $image->width() > self::MIN_WIDTH_PX) {
            $newWidth = (int) ($image->width() * self::SCALE_FACTOR);
            $image->scale(width: max($newWidth, self::MIN_WIDTH_PX));
            $encoded = $image->encode(new WebpEncoder(quality: self::WEBP_QUALITY));
        }

        return (string) $encoded;
    }
}
