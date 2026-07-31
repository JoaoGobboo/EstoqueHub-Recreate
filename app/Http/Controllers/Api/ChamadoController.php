<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChamadoMockResource;
use App\Models\ChamadoMock;
use App\Services\ChamadoProcessingService;
use Illuminate\Http\Request;

class ChamadoController extends Controller
{
    public function __construct(private readonly ChamadoProcessingService $processingService) {}

    /**
     * Display a listing of the resource, filtrável por status.
     */
    public function index(Request $request)
    {
        $chamados = ChamadoMock::query()
            ->with(['item', 'unidade'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->get();

        return ChamadoMockResource::collection($chamados);
    }

    /**
     * Processa os chamados pendentes via ChamadoConnectorInterface: registra
     * a saída de estoque correspondente e fecha cada chamado atendido.
     */
    public function processar(Request $request)
    {
        return response()->json($this->processingService->processarPendentes($request->user()));
    }
}
