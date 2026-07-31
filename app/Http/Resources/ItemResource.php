<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'nome' => $this->nome,
            'categoria' => $this->categoria,
            'descricao' => $this->descricao,
            'valor_unitario' => (float) $this->valor_unitario,
            'estoque_minimo' => $this->estoque_minimo,
            'saldo_total' => $this->whenAggregated('saldos', 'quantidade', 'sum'),
            'saldos' => SaldoPorUnidadeResource::collection($this->whenLoaded('saldos')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
