<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Step 1: Add slug column (nullable, no unique yet)
        Schema::table('events', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('title');
            $table->decimal('latitude', 10, 7)->nullable()->after('location');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
        });

        // Step 2: Generate unique slugs for all existing events
        $events = DB::table('events')->get();

        foreach ($events as $event) {
            $baseSlug = Str::slug($event->title);
            $slug = $baseSlug;
            $suffix = 1;

            // Ensure uniqueness
            while (
                DB::table('events')->where('slug', $slug)->where('id', '!=', $event->id)->exists()
            ) {
                $slug = $baseSlug . '-' . $suffix++;
            }

            DB::table('events')->where('id', $event->id)->update(['slug' => $slug]);
        }

        // Step 3: Now make slug NOT NULL and UNIQUE
        Schema::table('events', function (Blueprint $table) {
            $table->string('slug')->nullable(false)->change();
            $table->unique('slug');
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'latitude', 'longitude']);
        });
    }
};
