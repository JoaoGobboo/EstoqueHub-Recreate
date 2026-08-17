<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRequisicaoCompraRequest;
use App\Http\Resources\RequisicaoCompraResource;
use App\Models\RequisicaoCompra;
use App\Services\RequisicaoCompraService;
use Illuminate\Http\Request;

class RequisicaoCompraController extends Controller
{
    public function index(Request $request)
    {
        $requisicoes = RequisicaoCompra::query()
            ->with(['item', 'unidade', 'usuario'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return RequisicaoCompraResource::collection($requisicoes);
    }

    public function store(StoreRequisicaoCompraRequest $request, RequisicaoCompraService $service)
    {
        $requisicao = $service->criar($request->validated(), $request->user());

        return (new RequisicaoCompraResource($requisicao))->response()->setStatusCode(201);
    }
}
