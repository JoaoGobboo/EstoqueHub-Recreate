<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SugestaoResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    /**
     * O recurso aqui é o array associativo produzido por
     * EstoqueService::gerarSugestoes(), não um model Eloquent.
     */
    public function toArray(Request $request): array
    {
        return [
            'tipo' => $this->resource['tipo'],
            'item' => new ItemResource($this->resource['item']),
            'unidade_origem' => $this->resource['unidade_origem'] ? new UnidadeResource($this->resource['unidade_origem']) : null,
            'unidade_destino' => new UnidadeResource($this->resource['unidade_destino']),
            'quantidade' => $this->resource['quantidade'],
            'requisicao_compra' => $this->resource['requisicao_compra']
                ? new RequisicaoCompraResource($this->resource['requisicao_compra'])
                : null,
        ];
    }
}
