<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AlertaResource;
use App\Services\EstoqueService;

class AlertaController extends Controller
{
    public function __construct(private readonly EstoqueService $estoqueService) {}

    /**
     * Lista os saldos abaixo do estoque mínimo, do mais crítico ao menos crítico.
     */
    public function index()
    {
        return AlertaResource::collection($this->estoqueService->itensAbaixoDoMinimo());
    }
}
