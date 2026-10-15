<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('scraper_source_id')
                ->nullable()
                ->after('corporate_id')
                ->constrained('event_scraper_sources')
                ->nullOnDelete();
            $table->string('external_event_id')->nullable()->after('scraper_source_id');
            $table->string('external_url', 1024)->nullable()->after('external_event_id');
            $table->string('external_origin')->nullable()->after('external_url');
            $table->boolean('is_external')->default(false)->after('external_origin');

            $table->index('external_url');
            $table->unique(['scraper_source_id', 'external_event_id'], 'events_source_external_unique');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropUnique('events_source_external_unique');
            $table->dropIndex(['external_url']);
            $table->dropForeign(['scraper_source_id']);
            $table->dropColumn([
                'scraper_source_id',
                'external_event_id',
                'external_url',
                'external_origin',
                'is_external',
            ]);
        });
    }
};
