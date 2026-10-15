
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description');
            $table->date('date');
            $table->string('time');
            $table->string('location');
            $table->integer('max_attendees');
            $table->integer('current_attendees')->default(0);
            $table->decimal('price', 10, 2)->default(0);
            $table->text('image_url')->nullable();
            $table->foreignId('organizer_id')->constrained('users')->onDelete('cascade');
            $table->string('organizer_name');
            $table->enum('status', ['draft', 'published', 'cancelled'])->default('draft');
            $table->json('tags')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('events');
    }
};
