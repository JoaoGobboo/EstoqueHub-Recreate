<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('requisicoes_compra', function (Blueprint $table) {
            $table->enum('planner_sync_status', ['pending', 'success', 'failed', 'reconnect_required'])
                ->default('pending')
                ->after('planner_task_url');
            $table->string('planner_sync_error')->nullable()->after('planner_sync_status');
            $table->timestamp('planner_synced_at')->nullable()->after('planner_sync_error');
            $table->unsignedTinyInteger('planner_sync_attempts')->default(0)->after('planner_synced_at');
        });
    }

    public function down(): void
    {
        Schema::table('requisicoes_compra', function (Blueprint $table) {
            $table->dropColumn(['planner_sync_status', 'planner_sync_error', 'planner_synced_at', 'planner_sync_attempts']);
        });
    }
};
