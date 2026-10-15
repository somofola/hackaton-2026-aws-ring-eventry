<?php

use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
     public function up()
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('payment_reference', 50)->after('item_id')->nullable()->unique();
        });

        // Populate existing records with unique 12-character references
        DB::table('payments')->whereNull('payment_reference')->get()->each(function ($payment) {
            do {
                $reference = 'CC-SUB-EVENT-'.Str::upper(Str::random(12));
            } while (DB::table('payments')->where('payment_reference', $reference)->exists());

            DB::table('payments')
              ->where('id', $payment->id)
              ->update(['payment_reference' => $reference]);
        });

        // Make the column non-nullable after filling
        Schema::table('payments', function (Blueprint $table) {
            $table->string('payment_reference', 50)->nullable(false)->change();
        });
    }

    public function down()
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropUnique(['payment_reference']);
            $table->dropColumn('payment_reference');
        });
    }
};
