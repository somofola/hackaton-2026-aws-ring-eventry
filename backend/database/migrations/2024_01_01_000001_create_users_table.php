
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('user_type', ['user', 'admin', 'corporate', 'team'])->default('user');
            $table->string('company')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->string('website')->nullable();
            $table->text('description')->nullable();
            $table->integer('employee_count')->nullable();
            $table->string('industry')->nullable();
            $table->date('founded_date')->nullable();
            $table->json('contact_info')->nullable();
            $table->json('billing_info')->nullable();
            $table->string('company_status')->nullable();
            $table->decimal('subscription_amount', 8, 2)->nullable();
            $table->string('subscription_status')->nullable();
            $table->date('subscription_start_date')->nullable();
            $table->date('subscription_end_date')->nullable();
            $table->text('profile_image_url')->nullable();
            $table->string('linkedin_profile')->nullable();
            $table->string('twitter_profile')->nullable();
            $table->string('instagram_profile')->nullable();
            $table->boolean('is_active')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('users');
    }
};
