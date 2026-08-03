<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alerta_resolucoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained('itens')->cascadeOnDelete();
            $table->foreignId('unidade_id')->constrained('unidades')->cascadeOnDelete();
            $table->foreignId('resolvido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('quantidade_resolvida');
            $table->unsignedInteger('estoque_minimo_resolvido');
            $table->timestamp('resolvido_em');
            $table->timestamps();

            $table->unique(['item_id', 'unidade_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerta_resolucoes');
    }
};
