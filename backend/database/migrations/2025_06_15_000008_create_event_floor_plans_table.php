
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('event_floor_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('event_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->text('floor_plan_url')->nullable();
            $table->integer('floor_number')->default(1);
            $table->json('areas')->nullable();
            $table->integer('capacity')->nullable();
            $table->json('facilities')->nullable();
            $table->json('accessibility_features')->nullable();
            $table->json('emergency_exits')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('event_id')->references('id')->on('events')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('event_floor_plans');
    }
};
