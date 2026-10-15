<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TextRemovalService
{
    private ?string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
        $this->model = config('services.openai.dalle_model', 'dall-e-2');
    }

    /**
     * Check if the service is configured and available.
     */
    public function isConfigured(): bool
    {
        return !empty($this->apiKey);
    }

    /**
     * Remove text from an image using OpenAI DALL-E image editing.
     *
     * @param string $imageBase64 Base64 encoded image data (without data URL prefix)
     * @param string $mimeType Image mime type (e.g., 'image/png')
     * @param array $textRegions Array of bounding boxes [{x_percent, y_percent, width_percent, height_percent}, ...]
     * @return string|null Base64 encoded cleaned image, or null on failure
     */
    public function removeText(string $imageBase64, string $mimeType, array $textRegions): ?string
    {
        if (!$this->isConfigured()) {
            Log::warning('OpenAI API key not configured for text removal');
            return null;
        }

        if (empty($textRegions)) {
            Log::info('No text regions to remove');
            return null;
        }

        try {
            // Decode the image
            $imageData = base64_decode($imageBase64);
            if ($imageData === false) {
                Log::error('Failed to decode base64 image');
                return null;
            }

            // Convert image to PNG and make it square (DALL-E requirement)
            $preparedImage = $this->prepareImageForDalle($imageData);
            if (!$preparedImage) {
                Log::error('Failed to prepare image for DALL-E');
                return null;
            }

            // Create a mask image from text regions (transparent where text should be removed)
            $mask = $this->createMaskFromRegions($preparedImage['image'], $textRegions, $preparedImage['original_width'], $preparedImage['original_height']);
            if (!$mask) {
                Log::error('Failed to create mask from text regions');
                return null;
            }

            // Call OpenAI DALL-E edit API
            $cleanedImage = $this->callDalleEdit($preparedImage['png_data'], $mask, $preparedImage['size']);

            if (!$cleanedImage) {
                return null;
            }

            // If we resized the image, resize it back to original dimensions
            if ($preparedImage['was_resized']) {
                $cleanedImage = $this->resizeImage($cleanedImage, $preparedImage['original_width'], $preparedImage['original_height']);
            }

            return $cleanedImage;
        } catch (\Exception $e) {
            Log::error('Text removal failed', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            return null;
        }
    }

    /**
     * Prepare image for DALL-E: convert to PNG, make square, ensure under 4MB.
     */
    private function prepareImageForDalle(string $imageData): ?array
    {
        $sourceImage = @imagecreatefromstring($imageData);
        if (!$sourceImage) {
            return null;
        }

        $originalWidth = imagesx($sourceImage);
        $originalHeight = imagesy($sourceImage);

        // DALL-E requires square images, max 1024x1024
        $maxSize = 1024;
        $size = min($maxSize, max($originalWidth, $originalHeight));

        // Create square canvas
        $squareImage = imagecreatetruecolor($size, $size);

        // Fill with white background
        $white = imagecolorallocate($squareImage, 255, 255, 255);
        imagefill($squareImage, 0, 0, $white);

        // Calculate position to center the original image
        $scale = min($size / $originalWidth, $size / $originalHeight);
        $newWidth = (int)($originalWidth * $scale);
        $newHeight = (int)($originalHeight * $scale);
        $x = (int)(($size - $newWidth) / 2);
        $y = (int)(($size - $newHeight) / 2);

        // Copy and resize original image onto square canvas
        imagecopyresampled($squareImage, $sourceImage, $x, $y, 0, 0, $newWidth, $newHeight, $originalWidth, $originalHeight);

        // Convert to PNG
        ob_start();
        imagepng($squareImage, null, 9);
        $pngData = ob_get_clean();

        $wasResized = ($originalWidth !== $size || $originalHeight !== $size);

        imagedestroy($sourceImage);

        return [
            'image' => $squareImage,
            'png_data' => $pngData,
            'size' => $size,
            'original_width' => $originalWidth,
            'original_height' => $originalHeight,
            'was_resized' => $wasResized,
            'scale' => $scale,
            'offset_x' => $x,
            'offset_y' => $y,
        ];
    }

    /**
     * Create a mask image from text region bounding boxes.
     * Transparent areas indicate regions to be edited (text to remove).
     */
    private function createMaskFromRegions($squareImage, array $regions, int $originalWidth, int $originalHeight): ?string
    {
        try {
            $size = imagesx($squareImage);

            // Calculate scale and offset (same as prepareImageForDalle)
            $scale = min($size / $originalWidth, $size / $originalHeight);
            $newWidth = (int)($originalWidth * $scale);
            $newHeight = (int)($originalHeight * $scale);
            $offsetX = (int)(($size - $newWidth) / 2);
            $offsetY = (int)(($size - $newHeight) / 2);

            // Create mask with alpha channel
            $mask = imagecreatetruecolor($size, $size);

            // Enable alpha blending
            imagesavealpha($mask, true);
            imagealphablending($mask, false);

            // Fill with opaque white (areas to keep)
            $white = imagecolorallocatealpha($mask, 255, 255, 255, 0);
            imagefill($mask, 0, 0, $white);

            // Transparent color for areas to edit
            $transparent = imagecolorallocatealpha($mask, 0, 0, 0, 127);

            // Draw transparent rectangles for each text region
            foreach ($regions as $region) {
                // Convert percentage coordinates to pixels in original image space
                $x = (int)(($region['x_percent'] ?? 0) * $originalWidth / 100);
                $y = (int)(($region['y_percent'] ?? 0) * $originalHeight / 100);
                $w = (int)(($region['width_percent'] ?? 0) * $originalWidth / 100);
                $h = (int)(($region['height_percent'] ?? 0) * $originalHeight / 100);

                // Transform to square canvas coordinates
                $x1 = $offsetX + (int)($x * $scale);
                $y1 = $offsetY + (int)($y * $scale);
                $x2 = $offsetX + (int)(($x + $w) * $scale);
                $y2 = $offsetY + (int)(($y + $h) * $scale);

                // Add padding
                $padding = (int)(5 * $scale);
                $x1 = max(0, $x1 - $padding);
                $y1 = max(0, $y1 - $padding);
                $x2 = min($size - 1, $x2 + $padding);
                $y2 = min($size - 1, $y2 + $padding);

                imagefilledrectangle($mask, $x1, $y1, $x2, $y2, $transparent);
            }

            // Convert mask to PNG
            ob_start();
            imagepng($mask, null, 9);
            $maskData = ob_get_clean();

            imagedestroy($mask);

            return $maskData;
        } catch (\Exception $e) {
            Log::error('Failed to create mask', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Call OpenAI DALL-E image edit API.
     */
    private function callDalleEdit(string $imagePng, string $maskPng, int $size): ?string
    {
        // Create temporary files (OpenAI API requires file uploads)
        $imageTempPath = tempnam(sys_get_temp_dir(), 'dalle_image_') . '.png';
        $maskTempPath = tempnam(sys_get_temp_dir(), 'dalle_mask_') . '.png';

        try {
            file_put_contents($imageTempPath, $imagePng);
            file_put_contents($maskTempPath, $maskPng);

            // Determine size parameter. gpt-image-1 only supports 1024x1024 / 1024x1536 / 1536x1024 / auto.
            // dall-e-2 supports 256/512/1024. Default to 1024 to satisfy both.
            if (str_starts_with($this->model, 'gpt-image')) {
                $sizeParam = '1024x1024';
            } else {
                $sizeParam = $size <= 256 ? '256x256' : ($size <= 512 ? '512x512' : '1024x1024');
            }

            $editParams = [
                'model'  => $this->model,
                'prompt' => 'Fill the transparent masked regions with the surrounding background color and texture. '
                          . 'Keep every pixel outside the mask identical. '
                          . 'Do not change the overall background color. '
                          . 'Do not add, redraw, or invent any shapes, symbols, letters, or graphics. '
                          . 'Output a clean, abstract background card with no text and no figurative content.',
                'n'      => 1,
                'size'   => $sizeParam,
            ];

            // gpt-image-1 specific params to maximize input preservation
            if (str_starts_with($this->model, 'gpt-image')) {
                $editParams['input_fidelity'] = 'high';
                $editParams['quality']        = 'high';
                $editParams['background']     = 'opaque';
            }

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
            ])->timeout(120)
                ->attach('image', file_get_contents($imageTempPath), 'image.png')
                ->attach('mask', file_get_contents($maskTempPath), 'mask.png')
                ->post('https://api.openai.com/v1/images/edits', $editParams);

            // Clean up temp files
            @unlink($imageTempPath);
            @unlink($maskTempPath);

            if (!$response->successful()) {
                Log::error('OpenAI DALL-E API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return null;
            }

            $result = $response->json();
            $b64Image = $result['data'][0]['b64_json'] ?? null;

            if (!$b64Image) {
                Log::error('No image returned from DALL-E');
                return null;
            }

            return $b64Image;
        } catch (\Exception $e) {
            // Clean up temp files on error
            @unlink($imageTempPath);
            @unlink($maskTempPath);

            Log::error('DALL-E API call failed', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Resize image back to original dimensions.
     */
    private function resizeImage(string $base64Image, int $targetWidth, int $targetHeight): ?string
    {
        try {
            $imageData = base64_decode($base64Image);
            $source = @imagecreatefromstring($imageData);

            if (!$source) {
                return $base64Image; // Return original if resize fails
            }

            $sourceSize = imagesx($source);

            // Calculate the region of the square image that contains our original aspect ratio
            $scale = min($sourceSize / $targetWidth, $sourceSize / $targetHeight);
            $cropWidth = (int)($targetWidth * $scale);
            $cropHeight = (int)($targetHeight * $scale);
            $cropX = (int)(($sourceSize - $cropWidth) / 2);
            $cropY = (int)(($sourceSize - $cropHeight) / 2);

            // Create target image
            $target = imagecreatetruecolor($targetWidth, $targetHeight);

            // Copy and resize
            imagecopyresampled($target, $source, 0, 0, $cropX, $cropY, $targetWidth, $targetHeight, $cropWidth, $cropHeight);

            // Convert to PNG base64
            ob_start();
            imagepng($target, null, 9);
            $pngData = ob_get_clean();

            imagedestroy($source);
            imagedestroy($target);

            return base64_encode($pngData);
        } catch (\Exception $e) {
            Log::error('Failed to resize image', ['error' => $e->getMessage()]);
            return $base64Image;
        }
    }
}
