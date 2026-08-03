<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ResolverAlertaRequest;
use App\Http\Resources\AlertaResource;
use App\Models\AlertaResolucao;
use App\Models\SaldoPorUnidade;
use App\Services\EstoqueService;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class AlertaController extends Controller
{
    public function __construct(private readonly EstoqueService $estoqueService) {}

    /**
     * Lista os saldos abaixo do estoque mínimo, do mais crítico ao menos crítico.
     */
    public function index()
    {
        return AlertaResource::collection($this->estoqueService->alertasAtivos());
    }

    /**
     * Resolve o alerta para a fotografia atual. Mudanças posteriores no saldo
     * ou no estoque mínimo fazem o alerta ser aberto novamente.
     */
    public function resolver(ResolverAlertaRequest $request): Response
    {
        $dados = $request->validated();
        $saldo = SaldoPorUnidade::with('item')
            ->where('item_id', $dados['item_id'])
            ->where('unidade_id', $dados['unidade_id'])
            ->firstOrFail();

        if ($saldo->quantidade >= $saldo->item->estoque_minimo) {
            throw ValidationException::withMessages([
                'item_id' => 'Este item não possui um alerta de estoque ativo nesta unidade.',
            ]);
        }

        AlertaResolucao::updateOrCreate(
            [
                'item_id' => $saldo->item_id,
                'unidade_id' => $saldo->unidade_id,
            ],
            [
                'resolvido_por' => $request->user()?->id,
                'quantidade_resolvida' => $saldo->quantidade,
                'estoque_minimo_resolvido' => $saldo->item->estoque_minimo,
                'resolvido_em' => now(),
            ],
        );

        return response()->noContent();
    }
}
