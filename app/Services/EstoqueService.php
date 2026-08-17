<?php

namespace App\Services;

use App\Models\AlertaResolucao;
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
            ->whereHas('item', fn ($query) => $query->whereColumn(
                'saldos_por_unidade.quantidade',
                '<',
                'itens.estoque_minimo',
            ))
            ->get()
            ->sortBy(fn (SaldoPorUnidade $saldo) => $saldo->quantidade / max($saldo->item->estoque_minimo, 1))
            ->values();
    }

    /**
     * Retorna somente alertas que ainda não foram resolvidos para a fotografia
     * atual de saldo e estoque mínimo.
     *
     * @return Collection<int, SaldoPorUnidade>
     */
    public function alertasAtivos(): Collection
    {
        $saldos = $this->itensAbaixoDoMinimo();
        $resolucoes = AlertaResolucao::query()
            ->whereIn('item_id', $saldos->pluck('item_id')->unique())
            ->get()
            ->keyBy(fn (AlertaResolucao $resolucao) => "{$resolucao->item_id}:{$resolucao->unidade_id}");

        return $saldos
            ->filter(function (SaldoPorUnidade $saldo) use ($resolucoes) {
                $resolucao = $resolucoes->get("{$saldo->item_id}:{$saldo->unidade_id}");

                return $resolucao === null
                    || $resolucao->quantidade_resolvida !== $saldo->quantidade
                    || $resolucao->estoque_minimo_resolvido !== $saldo->item->estoque_minimo;
            })
            ->values();
    }

    /**
     * Para cada saldo abaixo do mínimo, sugere transferência de uma unidade com
     * excedente do mesmo item, ou compra quando não há excedente suficiente.
     *
     * @return array<int, array{
     *     tipo: string,
     *     item: Item,
     *     unidade_origem: ?Unidade,
     *     unidade_destino: Unidade,
     *     quantidade: int,
     *     requisicao_compra: ?RequisicaoCompra,
     * }>
     */
    public function gerarSugestoes(): array
    {
        $deficits = $this->itensAbaixoDoMinimo();
        $itemIds = $deficits->pluck('item_id')->unique();

        $requisicoesPendentes = RequisicaoCompra::query()
            ->whereIn('item_id', $itemIds)
            ->whereIn('unidade_id', $deficits->pluck('unidade_id')->unique())
            ->where('status', 'pendente')
            ->latest()
            ->get()
            ->groupBy(fn (RequisicaoCompra $requisicao) => "{$requisicao->item_id}:{$requisicao->unidade_id}")
            ->map(fn (Collection $requisicoes) => $requisicoes->first());

        $saldosPorItem = SaldoPorUnidade::with('unidade')
            ->whereIn('item_id', $itemIds)
            ->get()
            ->groupBy('item_id');

        $sugestoes = $deficits->map(function (SaldoPorUnidade $deficit) use ($requisicoesPendentes, $saldosPorItem) {
            $item = $deficit->item;
            $unidadeDeficit = $deficit->unidade;
            assert($item instanceof Item);
            assert($unidadeDeficit instanceof Unidade);
            $faltam = $item->estoque_minimo - $deficit->quantidade;
            /** @var RequisicaoCompra|null $requisicaoPendente */
            $requisicaoPendente = $requisicoesPendentes->get("{$item->id}:{$unidadeDeficit->id}");

            $origem = $saldosPorItem->get($item->id, collect())
                ->reject(fn (SaldoPorUnidade $saldo) => $saldo->unidade_id === $unidadeDeficit->id)
                ->map(fn (SaldoPorUnidade $saldo) => [
                    'saldo' => $saldo,
                    'excedente' => $saldo->quantidade - $item->estoque_minimo,
                ])
                ->filter(fn (array $saldo) => $saldo['excedente'] > 0)
                ->sortByDesc('excedente')
                ->first();

            if ($origem && $origem['excedente'] >= $faltam) {
                $unidadeOrigem = $origem['saldo']->unidade;
                assert($unidadeOrigem instanceof Unidade);

                return [
                    'tipo' => 'transferencia',
                    'item' => $item,
                    'unidade_origem' => $unidadeOrigem,
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

        return $sugestoes->all();
    }
}
