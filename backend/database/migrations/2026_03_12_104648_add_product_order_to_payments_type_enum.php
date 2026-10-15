<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check");
            DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_type_check CHECK (type IN ('event_ticket_category','subscription_plan','product_order'))");
        } else {
            DB::statement("ALTER TABLE payments MODIFY COLUMN type ENUM('event_ticket_category','subscription_plan','product_order') NOT NULL");
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check");
            DB::statement("ALTER TABLE payments ADD CONSTRAINT payments_type_check CHECK (type IN ('event_ticket_category','subscription_plan'))");
        } else {
            DB::statement("ALTER TABLE payments MODIFY COLUMN type ENUM('event_ticket_category','subscription_plan') NOT NULL");
        }
    }
};
