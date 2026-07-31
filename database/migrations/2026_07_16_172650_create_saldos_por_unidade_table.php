<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('saldos_por_unidade', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('itens')->cascadeOnDelete();
            $table->foreignId('unidade_id')->constrained('unidades')->cascadeOnDelete();
            $table->unsignedInteger('quantidade')->default(0);
            $table->timestamps();

            $table->unique(['item_id', 'unidade_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saldos_por_unidade');
    }
};
