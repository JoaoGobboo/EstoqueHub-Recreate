<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MovimentacaoResource;
use App\Services\DashboardService;
use App\Services\UnidadeAccessService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService,
        private readonly UnidadeAccessService $unidadeAccessService,
    ) {}

    /**
     * Resumo do estado atual do estoque para o painel principal.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'unidade_id' => ['nullable', 'integer', 'exists:unidades,id'],
        ]);
        $unidadeId = isset($validated['unidade_id']) ? (int) $validated['unidade_id'] : null;
        $unidadesAcessiveis = $this->unidadeAccessService->idsFor($request->user());

        if ($unidadeId !== null && $unidadesAcessiveis !== null && ! $unidadesAcessiveis->contains($unidadeId)) {
            abort(403, 'Você não possui acesso a esta unidade.');
        }

        $unidadeIds = $unidadeId !== null ? collect([$unidadeId]) : $unidadesAcessiveis;
        $dados = $this->dashboardService->resumo($unidadeIds);
        $dados['feed_recente'] = MovimentacaoResource::collection($dados['feed_recente']);

        return response()->json($dados);
    }
}
