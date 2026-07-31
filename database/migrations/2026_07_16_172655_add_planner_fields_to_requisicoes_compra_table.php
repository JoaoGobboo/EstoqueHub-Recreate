<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('requisicoes_compra', function (Blueprint $table) {
            $table->string('planner_task_id')->nullable()->after('motivo');
            $table->string('planner_task_url')->nullable()->after('planner_task_id');
        });
    }

    public function down(): void
    {
        Schema::table('requisicoes_compra', function (Blueprint $table) {
            $table->dropColumn(['planner_task_id', 'planner_task_url']);
        });
    }
};
