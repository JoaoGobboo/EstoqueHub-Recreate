<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('microsoft_planner_connections', function (Blueprint $table) {
            $table->id();
            $table->string('microsoft_account_id')->nullable();
            $table->string('microsoft_account_upn')->nullable();
            $table->string('microsoft_account_name')->nullable();
            $table->timestamp('microsoft_connected_at')->nullable();
            $table->enum('microsoft_connection_status', ['disconnected', 'connected', 'reconnect_required'])
                ->default('disconnected');
            $table->text('microsoft_token_cache_encrypted')->nullable();
            $table->timestamp('microsoft_last_token_refresh_at')->nullable();
            $table->string('microsoft_last_error')->nullable();
            $table->boolean('microsoft_reconnect_required')->default(false);
            $table->timestamp('microsoft_last_test_at')->nullable();
            $table->string('microsoft_last_test_result')->nullable();
            $table->timestamp('microsoft_last_sync_at')->nullable();
            $table->foreignId('connected_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('microsoft_planner_connections');
    }
};
