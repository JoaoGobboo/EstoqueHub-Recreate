<?php

namespace App\Http\Resources;

use App\Models\Movimentacao;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Movimentacao */
class MovimentacaoResource extends JsonResource
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
            'tipo' => $this->tipo,
            'quantidade' => $this->quantidade,
            'motivo' => $this->motivo,
            'item' => new ItemResource($this->whenLoaded('item')),
            'unidade_origem' => new UnidadeResource($this->whenLoaded('unidadeOrigem')),
            'unidade_destino' => new UnidadeResource($this->whenLoaded('unidadeDestino')),
            'usuario' => $this->whenLoaded('usuario', fn () => $this->usuario?->name),
            'created_at' => $this->created_at,
        ];
    }
}
