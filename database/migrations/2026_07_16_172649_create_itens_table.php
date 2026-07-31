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
        Schema::create('itens', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('nome');
            $table->string('categoria')->nullable();
            $table->text('descricao')->nullable();
            $table->decimal('valor_unitario', 12, 2)->default(0);
            $table->unsignedInteger('estoque_minimo')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('itens');
    }
};
