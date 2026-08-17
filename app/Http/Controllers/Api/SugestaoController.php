<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AprovarTransferenciaRequest;
use App\Http\Resources\MovimentacaoResource;
use App\Http\Resources\SugestaoResource;
use App\Models\Item;
use App\Models\Unidade;
use App\Services\EstoqueService;
use App\Services\MovimentacaoService;
use Illuminate\Http\Resources\Json\JsonResource;

class SugestaoController extends Controller
{
    public function __construct(
        private readonly EstoqueService $estoqueService,
        private readonly MovimentacaoService $movimentacaoService,
    ) {}

    /**
     * Lista as sugestões de reposição: transferência (quando há excedente em
     * outra unidade) ou compra (quando não há).
     */
    public function index(): JsonResource
    {
        return SugestaoResource::collection($this->estoqueService->gerarSugestoes());
    }

    /**
     * Executa a sugestão de transferência: registra a movimentação real via
     * MovimentacaoService. Sugestões de compra são persistidas pelo endpoint
     * de requisições de compra.
     */
    public function aprovarTransferencia(AprovarTransferenciaRequest $request): JsonResource
    {
        $dados = $request->validated();

        $movimentacao = $this->movimentacaoService->registrarTransferencia(
            item: $this->item($dados['item_id']),
            origem: $this->unidade($dados['unidade_origem_id']),
            destino: $this->unidade($dados['unidade_destino_id']),
            quantidade: $dados['quantidade'],
            motivo: 'Sugestão de reposição aprovada',
            usuario: $request->user(),
        );

        $movimentacao->load(['item', 'unidadeOrigem', 'unidadeDestino', 'usuario']);

        return new MovimentacaoResource($movimentacao);
    }

    private function item(int $id): Item
    {
        return Item::findOrFail($id);
    }

    private function unidade(int $id): Unidade
    {
        return Unidade::findOrFail($id);
    }
}
