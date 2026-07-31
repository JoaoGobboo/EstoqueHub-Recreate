<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Movimentacao;
use App\Models\SaldoPorUnidade;
use Illuminate\Http\Request;

class AnaliseConsumoController extends Controller
{
    /**
     * Métricas de consumo no período: itens mais consumidos, consumo por
     * unidade, valor adquirido vs. consumido, e curva ABC (por valor
     * imobilizado atual). Tudo calculado a partir do schema existente.
     */
    public function index(Request $request)
    {
        $request->validate([
            'data_inicio' => ['nullable', 'date'],
            'data_fim' => ['nullable', 'date'],
            'unidade_id' => ['nullable', 'integer', 'exists:unidades,id'],
        ]);

        $dataInicio = $request->filled('data_inicio') ? $request->date('data_inicio')->startOfDay() : today()->subDays(29);
        $dataFim = $request->filled('data_fim') ? $request->date('data_fim')->endOfDay() : today()->endOfDay();
        $unidadeId = $request->integer('unidade_id') ?: null;

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

        return response()->json([
            'periodo' => ['inicio' => $dataInicio->toDateString(), 'fim' => $dataFim->toDateString()],
            'valor_adquirido' => round($entradas->sum(fn ($m) => $m->quantidade * (float) $m->item->valor_unitario), 2),
            'valor_consumido' => round($saidas->sum(fn ($m) => $m->quantidade * (float) $m->item->valor_unitario), 2),
            'itens_mais_consumidos' => $itensMaisConsumidos,
            'consumo_por_unidade' => $consumoPorUnidade,
            'curva_abc' => $this->curvaAbc($unidadeId),
        ]);
    }

    /**
     * Classifica os itens por valor imobilizado atual (saldo × valor unitário):
     * A = até 80% do valor acumulado, B = até 95%, C = restante.
     */
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

        foreach ($classes as $chave => $c) {
            $classes[$chave]['percentual'] = $totalValor > 0 ? round(($c['valor'] / $totalValor) * 100) : 0;
            $classes[$chave]['valor'] = round($c['valor'], 2);
        }

        return [
            'total_valor' => round($totalValor, 2),
            'total_skus' => $porItem->count(),
            'classes' => $classes,
        ];
    }
}
