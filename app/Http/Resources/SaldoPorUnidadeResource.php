<?php

namespace App\Http\Resources;

use App\Models\SaldoPorUnidade;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SaldoPorUnidade */
class SaldoPorUnidadeResource extends JsonResource
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
            'item_id' => $this->item_id,
            'unidade_id' => $this->unidade_id,
            'quantidade' => $this->quantidade,
            'item' => new ItemResource($this->whenLoaded('item')),
            'unidade' => new UnidadeResource($this->whenLoaded('unidade')),
            'updated_at' => $this->updated_at,
        ];
    }
}
