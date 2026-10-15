<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Add new columns
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'type')) {
                $table->enum('type', ['event_ticket_category', 'subscription_plan'])->after('user_id');
            }

            if (!Schema::hasColumn('payments', 'item_id')) {
                $table->unsignedBigInteger('item_id')->after('type')->comment('ticket_category_id for events, subscription_plan_id for business cards`/event plan subscription`'); 
            }
        });

        // Rename stripe_payment_id to payment_gateway_response if it exists
        if (Schema::hasColumn('payments', 'stripe_payment_id')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->renameColumn('stripe_payment_id', 'payment_gateway_response');
            });
        }

        // Ensure payment_gateway_response exists and is of type JSON
        if (!Schema::hasColumn('payments', 'payment_gateway_response')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->json('payment_gateway_response')->nullable()->after('description');
            });
        } elseif (Schema::getConnection()->getDriverName() === 'pgsql') {
            // Postgres can't auto-cast varchar -> json; drop and recreate instead of ->change().
            // Raw SQL (not Schema::table) to avoid Laravel's auto-generated
            // "comment on column" statement running before the column exists.
            DB::statement('ALTER TABLE payments DROP COLUMN payment_gateway_response');
            DB::statement('ALTER TABLE payments ADD COLUMN payment_gateway_response json NULL');
        } else {
            // If column exists, convert to JSON (if supported by DB)
            Schema::table('payments', function (Blueprint $table) {
                $table->json('payment_gateway_response')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'type')) {
                $table->dropColumn('type');
            }

            if (Schema::hasColumn('payments', 'item_id')) {
                $table->dropColumn('item_id');
            }
        });

        if (Schema::hasColumn('payments', 'payment_gateway_response')) {
            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                // Raw SQL to avoid Laravel's auto-generated "comment on column"
                // statement running before the column exists under its new name.
                DB::statement('ALTER TABLE payments DROP COLUMN payment_gateway_response');
                DB::statement('ALTER TABLE payments ADD COLUMN stripe_payment_id varchar(255) NULL');
            } else {
                Schema::table('payments', function (Blueprint $table) {
                    $table->string('payment_gateway_response')->nullable()->change();
                    $table->renameColumn('payment_gateway_response', 'stripe_payment_id');
                });
            }
        }
    }
};
