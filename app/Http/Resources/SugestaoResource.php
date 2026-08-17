<?php

namespace App\Http\Resources;

use App\Models\Item;
use App\Models\RequisicaoCompra;
use App\Models\Unidade;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SugestaoResource extends JsonResource
{
    /**
     * O recurso aqui é o array associativo produzido por
     * EstoqueService::gerarSugestoes(), não um model Eloquent.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{tipo: string, item: Item, unidade_origem: ?Unidade, unidade_destino: Unidade, quantidade: int, requisicao_compra: ?RequisicaoCompra} $dados */
        $dados = $this->resource;

        return [
            'tipo' => $dados['tipo'],
            'item' => new ItemResource($dados['item']),
            'unidade_origem' => $dados['unidade_origem'] ? new UnidadeResource($dados['unidade_origem']) : null,
            'unidade_destino' => new UnidadeResource($dados['unidade_destino']),
            'quantidade' => $dados['quantidade'],
            'requisicao_compra' => $dados['requisicao_compra']
                ? new RequisicaoCompraResource($dados['requisicao_compra'])
                : null,
        ];
    }
}
