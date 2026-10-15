
<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up()
    {
        Schema::table('events', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
            $table->unsignedBigInteger('company_id')->nullable()->after('organizer_name');
            $table->string('event_type')->nullable()->after('status');
            $table->datetime('registration_deadline')->nullable()->after('event_type');
            $table->text('cancellation_policy')->nullable()->after('registration_deadline');
            $table->text('refund_policy')->nullable()->after('cancellation_policy');
            $table->text('special_instructions')->nullable()->after('refund_policy');
            $table->text('venue_details')->nullable()->after('special_instructions');
            $table->text('parking_info')->nullable()->after('venue_details');
            $table->text('accessibility_info')->nullable()->after('parking_info');
            $table->string('contact_email')->nullable()->after('accessibility_info');
            $table->string('contact_phone')->nullable()->after('contact_email');
            $table->string('website_url')->nullable()->after('contact_phone');
            $table->json('social_links')->nullable()->after('website_url');
            $table->json('custom_fields')->nullable()->after('social_links');
            $table->json('branding_settings')->nullable()->after('custom_fields');
            
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('set null');
            $table->index('uuid');
        });

        // Add UUIDs to existing events
        $isPgsql = DB::connection()->getDriverName() === 'pgsql';
        if ($isPgsql) {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pgcrypto');
        }
        $uuidExpr = $isPgsql ? 'gen_random_uuid()' : 'UUID()';
        DB::table('events')->whereNull('uuid')->update([
            'uuid' => DB::raw($uuidExpr)
        ]);

        // Make UUID unique after populating
        Schema::table('events', function (Blueprint $table) {
            $table->unique('uuid');
        });
    }

    public function down()
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropIndex(['uuid']);
            $table->dropUnique(['uuid']);
        });

        $cols = array_values(array_filter([
            'uuid', 'company_id', 'event_type', 'registration_deadline',
            'cancellation_policy', 'refund_policy', 'special_instructions',
            'venue_details', 'parking_info', 'accessibility_info',
            'contact_email', 'contact_phone', 'website_url',
            'social_links', 'custom_fields', 'branding_settings',
        ], fn($col) => Schema::hasColumn('events', $col)));

        if (!empty($cols)) {
            Schema::table('events', function (Blueprint $table) use ($cols) {
                $table->dropColumn($cols);
            });
        }
    }
};
