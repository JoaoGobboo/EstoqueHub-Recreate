<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnaliseConsumoService;
use Illuminate\Http\Request;

class AnaliseConsumoController extends Controller
{
    public function __construct(private readonly AnaliseConsumoService $service) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'data_inicio' => ['nullable', 'date'],
            'data_fim' => ['nullable', 'date'],
            'unidade_id' => ['nullable', 'integer', 'exists:unidades,id'],
        ]);

        $dataInicio = $request->filled('data_inicio')
            ? $request->date('data_inicio')->startOfDay()
            : today()->subDays(29)->startOfDay();
        $dataFim = $request->filled('data_fim')
            ? $request->date('data_fim')->endOfDay()
            : today()->endOfDay();
        $unidadeId = isset($validated['unidade_id']) ? (int) $validated['unidade_id'] : null;

        return response()->json($this->service->analisar($dataInicio, $dataFim, $unidadeId));
    }
}
