<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type')->default('card'); // card, shirt, etc.
            $table->text('description')->nullable();
            $table->json('price'); // {"USD":{"unit":9.99},"NGN":{"unit":4999}}
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->string('image_url')->nullable();
            $table->unsignedSmallInteger('min_quantity')->default(1);
            $table->unsignedSmallInteger('max_quantity')->default(500);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
