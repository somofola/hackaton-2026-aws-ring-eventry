<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();          // slug: marketing, alerts, etc.
            $table->string('label');                   // display name
            $table->string('description')->nullable();
            $table->json('available_channels');        // ["app","web"]
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Seed default types
        DB::table('notification_types')->insert([
            ['name' => 'alerts',        'label' => 'Security Alerts',          'description' => 'Login attempts, password changes, and account security events.',  'available_channels' => '["app","web"]', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'billing',       'label' => 'Billing & Payments',       'description' => 'Payment confirmations, invoices, and subscription updates.',       'available_channels' => '["app","web"]', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'card_activity', 'label' => 'Card Activity',            'description' => 'When someone views or connects with your business card.',          'available_channels' => '["app","web"]', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'events',        'label' => 'Event Updates',            'description' => 'Reminders, check-in confirmations, and event announcements.',      'available_channels' => '["app","web"]', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'reminders',     'label' => 'Reminders',               'description' => 'Follow-up prompts and scheduled reminders.',                        'available_channels' => '["app","web"]', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'informational', 'label' => 'Product Updates',         'description' => 'New features, improvements, and platform announcements.',           'available_channels' => '["app","web"]', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'promotions',    'label' => 'Promotions & Offers',     'description' => 'Exclusive deals, discounts, and limited-time offers.',              'available_channels' => '["app","web"]', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'marketing',     'label' => 'Marketing & Newsletters', 'description' => 'Tips, best practices, and Eventry news.',                          'available_channels' => '["app","web"]', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_types');
    }
};
