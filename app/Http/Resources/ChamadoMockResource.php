<?php

namespace App\Http\Resources;

use App\Models\ChamadoMock;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ChamadoMock */
class ChamadoMockResource extends JsonResource
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
            'numero_chamado' => $this->numero_chamado,
            'quantidade_solicitada' => $this->quantidade_solicitada,
            'status' => $this->status,
            'item' => new ItemResource($this->whenLoaded('item')),
            'unidade' => new UnidadeResource($this->whenLoaded('unidade')),
            'created_at' => $this->created_at,
        ];
    }
}
