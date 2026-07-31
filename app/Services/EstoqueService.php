<?php

namespace App\Services;

use App\Models\Item;
use App\Models\RequisicaoCompra;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use Illuminate\Support\Collection;

class EstoqueService
{
    public function saldoAtual(Item $item, Unidade $unidade): int
    {
        return (int) (SaldoPorUnidade::where('item_id', $item->id)
            ->where('unidade_id', $unidade->id)
            ->value('quantidade') ?? 0);
    }

    /**
     * Saldos cujo item está abaixo do estoque mínimo, ordenados do mais crítico
     * (menor proporção saldo/mínimo) para o menos crítico.
     *
     * @return Collection<int, SaldoPorUnidade>
     */
    public function itensAbaixoDoMinimo(): Collection
    {
        return SaldoPorUnidade::with(['item', 'unidade'])
            ->get()
            ->filter(fn (SaldoPorUnidade $saldo) => $saldo->quantidade < $saldo->item->estoque_minimo)
            ->sortBy(fn (SaldoPorUnidade $saldo) => $saldo->quantidade / max($saldo->item->estoque_minimo, 1))
            ->values();
    }

    /**
     * Para cada saldo abaixo do mínimo, sugere transferência de uma unidade com
     * excedente do mesmo item, ou compra quando não há excedente suficiente.
     *
     * @return Collection<int, array{
     *     tipo: string,
     *     item: Item,
     *     unidade_origem: ?Unidade,
     *     unidade_destino: Unidade,
     *     quantidade: int,
     * }>
     */
    public function gerarSugestoes(): Collection
    {
        return $this->itensAbaixoDoMinimo()->map(function (SaldoPorUnidade $deficit) {
            $item = $deficit->item;
            $unidadeDeficit = $deficit->unidade;
            $faltam = $item->estoque_minimo - $deficit->quantidade;
            $requisicaoPendente = RequisicaoCompra::where('item_id', $item->id)
                ->where('unidade_id', $unidadeDeficit->id)
                ->where('status', 'pendente')
                ->latest()
                ->first();

            $origem = SaldoPorUnidade::with('unidade')
                ->where('item_id', $item->id)
                ->where('unidade_id', '!=', $unidadeDeficit->id)
                ->get()
                ->map(fn (SaldoPorUnidade $s) => [
                    'saldo' => $s,
                    'excedente' => $s->quantidade - $item->estoque_minimo,
                ])
                ->filter(fn (array $s) => $s['excedente'] > 0)
                ->sortByDesc('excedente')
                ->first();

            if ($origem && $origem['excedente'] >= $faltam) {
                return [
                    'tipo' => 'transferencia',
                    'item' => $item,
                    'unidade_origem' => $origem['saldo']->unidade,
                    'unidade_destino' => $unidadeDeficit,
                    'quantidade' => $faltam,
                    'requisicao_compra' => null,
                ];
            }

            return [
                'tipo' => 'compra',
                'item' => $item,
                'unidade_origem' => null,
                'unidade_destino' => $unidadeDeficit,
                'quantidade' => $faltam,
                'requisicao_compra' => $requisicaoPendente,
            ];
        });
    }
}
