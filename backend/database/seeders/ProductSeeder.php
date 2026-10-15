<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('products')->delete();

        $products = [
            // ── NFC & QR Cards ──────────────────────────────────────────────────
            [
                'name'         => 'PVC NFC & QR Card',
                'type'         => 'card',
                'description'  => 'Classic PVC business card with embedded NFC chip and QR code. Durable, lightweight, and wallet-friendly.',
                'price'        => json_encode([
                    'USD' => ['unit' => 9.99],
                    'NGN' => ['unit' => 9990],
                    'EUR' => ['unit' => 8.99],
                    'GBP' => ['unit' => 7.99],
                ]),
                'status'       => 'active',
                'image_url'    => null,
                'min_quantity' => 1,
                'max_quantity' => 500,
            ],
            [
                'name'         => 'Wood NFC & QR Card',
                'type'         => 'card',
                'description'  => 'Eco-friendly wooden business card with NFC chip and QR code. Natural texture with a premium feel.',
                'price'        => json_encode([
                    'USD' => ['unit' => 11.99],
                    'NGN' => ['unit' => 11990],
                    'EUR' => ['unit' => 10.99],
                    'GBP' => ['unit' => 9.99],
                ]),
                'status'       => 'active',
                'image_url'    => null,
                'min_quantity' => 1,
                'max_quantity' => 500,
            ],
            [
                'name'         => 'Bamboo NFC & QR Card',
                'type'         => 'card',
                'description'  => 'Sustainable bamboo business card with NFC chip and QR code. Smooth finish with a unique organic aesthetic.',
                'price'        => json_encode([
                    'USD' => ['unit' => 12.99],
                    'NGN' => ['unit' => 12990],
                    'EUR' => ['unit' => 11.99],
                    'GBP' => ['unit' => 10.99],
                ]),
                'status'       => 'active',
                'image_url'    => null,
                'min_quantity' => 1,
                'max_quantity' => 500,
            ],
            [
                'name'         => 'Metal NFC & QR Card',
                'type'         => 'card',
                'description'  => 'Premium stainless-steel business card with NFC chip and QR code. Heavyweight, engraved finish — built to impress.',
                'price'        => json_encode([
                    'USD' => ['unit' => 14.99],
                    'NGN' => ['unit' => 14990],
                    'EUR' => ['unit' => 13.99],
                    'GBP' => ['unit' => 12.99],
                ]),
                'status'       => 'active',
                'image_url'    => null,
                'min_quantity' => 1,
                'max_quantity' => 200,
            ],

            // ── Apparel ─────────────────────────────────────────────────────────
            [
                'name'         => 'NFC Polo Shirt',
                'type'         => 'shirt',
                'description'  => 'Branded polo shirt with embroidered QR code and sewn-in NFC tag. Share your card with a tap.',
                'price'        => json_encode([
                    'USD' => ['unit' => 29.99],
                    'NGN' => ['unit' => 29990],
                    'EUR' => ['unit' => 27.99],
                    'GBP' => ['unit' => 24.99],
                ]),
                'status'       => 'active',
                'image_url'    => null,
                'min_quantity' => 1,
                'max_quantity' => 100,
            ],
            [
                'name'         => 'NFC T-Shirt',
                'type'         => 'shirt',
                'description'  => 'Casual T-shirt with printed QR code and sewn-in NFC tag. Great for events and networking.',
                'price'        => json_encode([
                    'USD' => ['unit' => 19.99],
                    'NGN' => ['unit' => 19990],
                    'EUR' => ['unit' => 17.99],
                    'GBP' => ['unit' => 15.99],
                ]),
                'status'       => 'active',
                'image_url'    => null,
                'min_quantity' => 1,
                'max_quantity' => 100,
            ],
        ];

        $now = now();
        foreach ($products as $product) {
            DB::table('products')->insert(array_merge($product, [
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }

        $this->command->info('Seeded ' . count($products) . ' products.');
    }
}
