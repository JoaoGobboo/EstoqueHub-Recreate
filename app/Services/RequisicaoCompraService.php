<?php

namespace App\Services;

use App\Models\Item;
use App\Models\RequisicaoCompra;
use App\Models\SaldoPorUnidade;
use App\Models\User;
use App\Services\Microsoft\PlannerTaskService;
use Illuminate\Validation\ValidationException;

class RequisicaoCompraService
{
    public function __construct(private readonly PlannerTaskService $planner) {}

    /**
     * @param  array{item_id: int, unidade_id: int, quantidade: int, motivo?: ?string}  $dados
     */
    public function criar(array $dados, ?User $usuario = null): RequisicaoCompra
    {
        $item = Item::findOrFail($dados['item_id']);
        $saldo = (int) (SaldoPorUnidade::query()
            ->where('item_id', $item->id)
            ->where('unidade_id', $dados['unidade_id'])
            ->value('quantidade') ?? 0);

        if ($saldo >= $item->estoque_minimo) {
            throw ValidationException::withMessages([
                'item_id' => 'O item não está abaixo do estoque mínimo nesta unidade.',
            ]);
        }

        if (RequisicaoCompra::query()
            ->where('item_id', $item->id)
            ->where('unidade_id', $dados['unidade_id'])
            ->where('status', 'pendente')
            ->exists()) {
            throw ValidationException::withMessages([
                'item_id' => 'Já existe uma requisição de compra pendente para este item e unidade.',
            ]);
        }

        $requisicao = RequisicaoCompra::create([
            ...$dados,
            'status' => 'pendente',
            'motivo' => $dados['motivo'] ?? 'Reposição de estoque mínimo',
            'user_id' => $usuario?->id,
        ]);

        $requisicao->load(['item', 'unidade', 'usuario']);
        $this->planner->sincronizar($requisicao);

        return $requisicao->refresh();
    }
}
