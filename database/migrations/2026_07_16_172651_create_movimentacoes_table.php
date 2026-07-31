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
        Schema::create('movimentacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('itens')->cascadeOnDelete();
            $table->foreignId('unidade_origem_id')->nullable()->constrained('unidades')->nullOnDelete();
            $table->foreignId('unidade_destino_id')->nullable()->constrained('unidades')->nullOnDelete();
            $table->enum('tipo', ['entrada', 'saida', 'transferencia']);
            $table->unsignedInteger('quantidade');
            $table->string('motivo')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimentacoes');
    }
};
