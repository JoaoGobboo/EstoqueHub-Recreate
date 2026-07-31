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
        Schema::create('chamados_mock', function (Blueprint $table) {
            $table->id();
            $table->string('numero_chamado')->unique();
            $table->foreignId('item_id')->constrained('itens')->cascadeOnDelete();
            $table->foreignId('unidade_id')->constrained('unidades')->cascadeOnDelete();
            $table->unsignedInteger('quantidade_solicitada');
            $table->enum('status', ['aberto', 'fechado'])->default('aberto');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chamados_mock');
    }
};
