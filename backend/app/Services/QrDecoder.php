<?php

namespace App\Services;

/**
 * Decodes a QR code from raw image bytes via the `zbarimg` CLI tool
 * (zbar-tools package). No solid pure-PHP QR decoder exists for arbitrary
 * camera-captured images, so this shells out — requires `zbarimg` installed
 * on the server (`apt-get install zbar-tools` / `brew install zbar`).
 */
class QrDecoder
{
    public function decode(string $imageBytes): ?string
    {
        $tmpPath = tempnam(sys_get_temp_dir(), 'ring_frame_') . '.jpg';
        file_put_contents($tmpPath, $imageBytes);

        try {
            $output = shell_exec('zbarimg --quiet --raw ' . escapeshellarg($tmpPath) . ' 2>/dev/null');
            $decoded = $output ? trim($output) : null;

            return $decoded !== '' ? $decoded : null;
        } finally {
            @unlink($tmpPath);
        }
    }
}
