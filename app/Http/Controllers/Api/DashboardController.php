<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MovimentacaoResource;
use App\Models\Item;
use App\Models\Movimentacao;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use App\Services\EstoqueService;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __construct(private readonly EstoqueService $estoqueService) {}

    /**
     * Resumo do estado atual do estoque para o painel principal. Todos os
     * campos são calculados a partir do schema existente — sem métricas
     * decorativas sem dado real por trás (ex.: acuracidade de inventário,
     * que exigiria um módulo de contagem cíclica ainda não construído).
     */
    public function index()
    {
        $movimentacoesHojeBase = Movimentacao::whereDate('created_at', today());
        $inicioDoMes = today()->startOfMonth();
        $movimentacoesMesBase = Movimentacao::whereBetween('created_at', [$inicioDoMes, now()]);

        $valorImobilizado = (float) DB::table('saldos_por_unidade')
            ->join('itens', 'itens.id', '=', 'saldos_por_unidade.item_id')
            ->selectRaw('COALESCE(SUM(saldos_por_unidade.quantidade * itens.valor_unitario), 0) as total')
            ->value('total');

        $fluxo7Dias = collect(range(6, 0))->map(function (int $diasAtras) {
            $data = today()->subDays($diasAtras);
            $base = Movimentacao::whereDate('created_at', $data);

            return [
                'data' => $data->toDateString(),
                'entradas' => (clone $base)->where('tipo', 'entrada')->count(),
                'saidas' => (clone $base)->where('tipo', 'saida')->count(),
                'transferencias' => (clone $base)->where('tipo', 'transferencia')->count(),
            ];
        })->values();

        $saldoPorUnidade = Unidade::withSum('saldos', 'quantidade')
            ->orderBy('nome')
            ->get()
            ->map(fn (Unidade $unidade) => [
                'unidade' => $unidade->nome,
                'quantidade' => (int) ($unidade->saldos_sum_quantidade ?? 0),
            ]);

        $valorConsumidoMes = (float) DB::table('movimentacoes')
            ->join('itens', 'itens.id', '=', 'movimentacoes.item_id')
            ->where('movimentacoes.tipo', 'saida')
            ->whereBetween('movimentacoes.created_at', [$inicioDoMes, now()])
            ->selectRaw('COALESCE(SUM(movimentacoes.quantidade * itens.valor_unitario), 0) as total')
            ->value('total');

        $consumo30Dias = Movimentacao::query()
            ->where('tipo', 'saida')
            ->where('created_at', '>=', today()->subDays(29)->startOfDay())
            ->selectRaw('item_id, unidade_origem_id, SUM(quantidade) as total')
            ->groupBy('item_id', 'unidade_origem_id')
            ->get();

        $topItemIds = $consumo30Dias
            ->groupBy('item_id')
            ->map(fn ($grupo) => (int) $grupo->sum('total'))
            ->sortDesc()
            ->keys()
            ->take(6)
            ->map(fn ($id) => (int) $id)
            ->values();

        $itensMaisSolicitados = Item::whereIn('id', $topItemIds)
            ->get()
            ->keyBy('id');

        $unidadesConsumo = Unidade::whereIn(
            'id',
            $consumo30Dias->whereIn('item_id', $topItemIds)->pluck('unidade_origem_id')->filter()->unique(),
        )->orderBy('nome')->get();

        $consumoPorItemUnidade = [
            'itens' => $topItemIds->map(function (int $itemId) use ($itensMaisSolicitados) {
                $item = $itensMaisSolicitados->get($itemId);

                return [
                    'id' => $item->id,
                    'nome' => $item->nome,
                    'sku' => $item->sku,
                ];
            }),
            'series' => $unidadesConsumo->map(fn (Unidade $unidade) => [
                'unidade' => $unidade->nome,
                'quantidades' => $topItemIds->map(fn (int $itemId) => (int) ($consumo30Dias
                    ->first(fn (Movimentacao $consumo) => $consumo->item_id === $itemId
                        && $consumo->unidade_origem_id === $unidade->id)?->total ?? 0)),
            ]),
        ];

        $saldosAtuais = SaldoPorUnidade::with(['item', 'unidade'])
            ->get()
            ->sortBy(fn (SaldoPorUnidade $saldo) => $saldo->item->nome.'|'.$saldo->unidade->nome)
            ->values()
            ->map(fn (SaldoPorUnidade $saldo) => [
                'item_id' => $saldo->item_id,
                'item' => $saldo->item->nome,
                'sku' => $saldo->item->sku,
                'unidade_id' => $saldo->unidade_id,
                'unidade' => $saldo->unidade->nome,
                'quantidade' => $saldo->quantidade,
                'estoque_minimo' => $saldo->item->estoque_minimo,
            ]);

        $feedRecente = Movimentacao::with(['item', 'unidadeOrigem', 'unidadeDestino', 'usuario'])
            ->latest()
            ->limit(8)
            ->get();

        return response()->json([
            'itens_em_estoque' => (int) SaldoPorUnidade::sum('quantidade'),
            'skus_ativos' => Item::count(),
            'movimentacoes_hoje' => [
                'total' => (clone $movimentacoesHojeBase)->count(),
                'entradas' => (clone $movimentacoesHojeBase)->where('tipo', 'entrada')->count(),
                'saidas' => (clone $movimentacoesHojeBase)->where('tipo', 'saida')->count(),
                'transferencias' => (clone $movimentacoesHojeBase)->where('tipo', 'transferencia')->count(),
            ],
            'movimentacoes_mes' => (clone $movimentacoesMesBase)->count(),
            'valor_consumido_mes' => $valorConsumidoMes,
            'abaixo_do_minimo' => $this->estoqueService->itensAbaixoDoMinimo()->count(),
            'valor_imobilizado' => $valorImobilizado,
            'fluxo_7_dias' => $fluxo7Dias,
            'saldo_por_unidade' => $saldoPorUnidade,
            'consumo_30_dias' => $consumoPorItemUnidade,
            'saldos_atuais' => $saldosAtuais,
            'feed_recente' => MovimentacaoResource::collection($feedRecente),
        ]);
    }
}
