<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMovimentacaoRequest;
use App\Http\Resources\MovimentacaoResource;
use App\Models\Item;
use App\Models\Movimentacao;
use App\Models\Unidade;
use App\Services\MovimentacaoService;
use Illuminate\Http\Request;

class MovimentacaoController extends Controller
{
    public function __construct(private readonly MovimentacaoService $movimentacaoService) {}

    /**
     * Display a listing of the resource, with filters for histórico.
     */
    public function index(Request $request)
    {
        $movimentacoes = Movimentacao::query()
            ->with(['item', 'unidadeOrigem', 'unidadeDestino', 'usuario'])
            ->when($request->filled('busca'), function ($query) use ($request) {
                $busca = (string) $request->string('busca')->trim();

                $query->where(function ($query) use ($busca) {
                    $query->where('motivo', 'like', "%{$busca}%")
                        ->orWhereHas('item', fn ($itemQuery) => $itemQuery
                            ->where('nome', 'like', "%{$busca}%")
                            ->orWhere('sku', 'like', "%{$busca}%"))
                        ->orWhereHas('unidadeOrigem', fn ($unidadeQuery) => $unidadeQuery
                            ->where('nome', 'like', "%{$busca}%"))
                        ->orWhereHas('unidadeDestino', fn ($unidadeQuery) => $unidadeQuery
                            ->where('nome', 'like', "%{$busca}%"));
                });
            })
            ->when($request->filled('tipo'), fn ($query) => $query->where('tipo', $request->string('tipo')))
            ->when($request->filled('item_id'), fn ($query) => $query->where('item_id', $request->integer('item_id')))
            ->when($request->filled('unidade_id'), function ($query) use ($request) {
                $unidadeId = $request->integer('unidade_id');
                $query->where(fn ($q) => $q->where('unidade_origem_id', $unidadeId)
                    ->orWhere('unidade_destino_id', $unidadeId));
            })
            ->when($request->filled('data_inicio'), fn ($query) => $query->whereDate('created_at', '>=', $request->date('data_inicio')))
            ->when($request->filled('data_fim'), fn ($query) => $query->whereDate('created_at', '<=', $request->date('data_fim')))
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return MovimentacaoResource::collection($movimentacoes);
    }

    /**
     * Registra uma entrada, saída ou transferência, delegando ao MovimentacaoService.
     */
    public function store(StoreMovimentacaoRequest $request)
    {
        $dados = $request->validated();
        $item = Item::findOrFail($dados['item_id']);

        $movimentacao = match ($dados['tipo']) {
            'entrada' => $this->movimentacaoService->registrarEntrada(
                item: $item,
                unidade: Unidade::findOrFail($dados['unidade_id']),
                quantidade: $dados['quantidade'],
                motivo: $dados['motivo'] ?? null,
                usuario: $request->user(),
            ),
            'saida' => $this->movimentacaoService->registrarSaida(
                item: $item,
                unidade: Unidade::findOrFail($dados['unidade_id']),
                quantidade: $dados['quantidade'],
                motivo: $dados['motivo'] ?? null,
                usuario: $request->user(),
            ),
            'transferencia' => $this->movimentacaoService->registrarTransferencia(
                item: $item,
                origem: Unidade::findOrFail($dados['unidade_origem_id']),
                destino: Unidade::findOrFail($dados['unidade_destino_id']),
                quantidade: $dados['quantidade'],
                motivo: $dados['motivo'] ?? null,
                usuario: $request->user(),
            ),
        };

        $movimentacao->load(['item', 'unidadeOrigem', 'unidadeDestino', 'usuario']);

        return (new MovimentacaoResource($movimentacao))->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Movimentacao $movimentacao)
    {
        $movimentacao->load(['item', 'unidadeOrigem', 'unidadeDestino', 'usuario']);

        return new MovimentacaoResource($movimentacao);
    }
}
