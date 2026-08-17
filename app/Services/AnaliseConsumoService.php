<?php

namespace App\Services;

use App\Models\Movimentacao;
use App\Models\SaldoPorUnidade;
use Carbon\CarbonInterface;

class AnaliseConsumoService
{
    /**
     * @return array<string, mixed>
     */
    public function analisar(?CarbonInterface $dataInicio = null, ?CarbonInterface $dataFim = null, ?int $unidadeId = null): array
    {
        $dataInicio ??= today()->subDays(29)->startOfDay();
        $dataFim ??= today()->endOfDay();

        $saidas = Movimentacao::with(['item', 'unidadeOrigem'])
            ->where('tipo', 'saida')
            ->whereBetween('created_at', [$dataInicio, $dataFim])
            ->when($unidadeId, fn ($q) => $q->where('unidade_origem_id', $unidadeId))
            ->get();

        $entradas = Movimentacao::with('item')
            ->where('tipo', 'entrada')
            ->whereBetween('created_at', [$dataInicio, $dataFim])
            ->when($unidadeId, fn ($q) => $q->where('unidade_destino_id', $unidadeId))
            ->get();

        $itensMaisConsumidos = $saidas->groupBy('item_id')
            ->map(function ($grupo) {
                $item = $grupo->first()->item;
                $quantidade = (int) $grupo->sum('quantidade');

                return [
                    'item' => $item,
                    'quantidade' => $quantidade,
                    'valor' => round($quantidade * (float) $item->valor_unitario, 2),
                ];
            })
            ->sortByDesc('quantidade')
            ->take(10)
            ->values();

        $consumoPorUnidade = $saidas->groupBy('unidade_origem_id')
            ->map(fn ($grupo) => [
                'unidade' => $grupo->first()->unidadeOrigem,
                'quantidade' => (int) $grupo->sum('quantidade'),
            ])
            ->sortByDesc('quantidade')
            ->values();

        return [
            'periodo' => ['inicio' => $dataInicio->toDateString(), 'fim' => $dataFim->toDateString()],
            'valor_adquirido' => round($entradas->sum(fn ($m) => $m->quantidade * (float) $m->item->valor_unitario), 2),
            'valor_consumido' => round($saidas->sum(fn ($m) => $m->quantidade * (float) $m->item->valor_unitario), 2),
            'itens_mais_consumidos' => $itensMaisConsumidos,
            'consumo_por_unidade' => $consumoPorUnidade,
            'curva_abc' => $this->curvaAbc($unidadeId),
        ];
    }

    private function curvaAbc(?int $unidadeId): array
    {
        $porItem = SaldoPorUnidade::with('item')
            ->when($unidadeId, fn ($q) => $q->where('unidade_id', $unidadeId))
            ->get()
            ->groupBy('item_id')
            ->map(function ($grupo) {
                $item = $grupo->first()->item;
                $quantidade = (int) $grupo->sum('quantidade');

                return ['item' => $item, 'valor' => $quantidade * (float) $item->valor_unitario];
            })
            ->filter(fn ($linha) => $linha['valor'] > 0)
            ->sortByDesc('valor')
            ->values();

        $totalValor = $porItem->sum('valor');
        $classes = [
            'A' => ['skus' => 0, 'valor' => 0.0],
            'B' => ['skus' => 0, 'valor' => 0.0],
            'C' => ['skus' => 0, 'valor' => 0.0],
        ];

        $acumulado = 0.0;
        foreach ($porItem as $linha) {
            $acumulado += $linha['valor'];
            $pctAcumulado = $totalValor > 0 ? ($acumulado / $totalValor) * 100 : 0;
            $classe = $pctAcumulado <= 80 ? 'A' : ($pctAcumulado <= 95 ? 'B' : 'C');

            $classes[$classe]['skus']++;
            $classes[$classe]['valor'] += $linha['valor'];
        }

        foreach ($classes as $chave => $classe) {
            $classes[$chave]['percentual'] = $totalValor > 0 ? round(($classe['valor'] / $totalValor) * 100) : 0;
            $classes[$chave]['valor'] = round($classe['valor'], 2);
        }

        return [
            'total_valor' => round($totalValor, 2),
            'total_skus' => $porItem->count(),
            'classes' => $classes,
        ];
    }
}
