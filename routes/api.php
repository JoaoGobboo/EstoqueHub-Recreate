<?php

use App\Http\Controllers\Api\AlertaController;
use App\Http\Controllers\Api\AnaliseConsumoController;
use App\Http\Controllers\Api\ChamadoController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\MovimentacaoController;
use App\Http\Controllers\Api\RequisicaoCompraController;
use App\Http\Controllers\Api\SaldoController;
use App\Http\Controllers\Api\SugestaoController;
use App\Http\Controllers\Api\UnidadeController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index']);
    Route::get('analise-consumo', [AnaliseConsumoController::class, 'index']);

    Route::apiResource('itens', ItemController::class)
        ->parameter('itens', 'item')
        ->only(['index', 'show', 'store', 'update']);

    Route::apiResource('unidades', UnidadeController::class)->only(['index', 'show', 'store', 'update']);

    Route::apiResource('movimentacoes', MovimentacaoController::class)
        ->parameter('movimentacoes', 'movimentacao')
        ->only(['index', 'show', 'store']);

    Route::get('saldos', [SaldoController::class, 'index']);

    Route::get('alertas', [AlertaController::class, 'index']);

    Route::get('sugestoes', [SugestaoController::class, 'index']);
    Route::post('sugestoes/aprovar-transferencia', [SugestaoController::class, 'aprovarTransferencia']);

    Route::apiResource('requisicoes-compra', RequisicaoCompraController::class)
        ->only(['index', 'store']);

    Route::get('chamados', [ChamadoController::class, 'index']);
    Route::post('chamados/processar', [ChamadoController::class, 'processar']);
});
