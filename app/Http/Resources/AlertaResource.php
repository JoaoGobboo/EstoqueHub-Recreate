<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AlertaResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $minimo = $this->item->estoque_minimo;
        $percentual = $minimo > 0 ? round(($this->quantidade / $minimo) * 100) : 0;

        return [
            'item' => new ItemResource($this->whenLoaded('item')),
            'unidade' => new UnidadeResource($this->whenLoaded('unidade')),
            'quantidade' => $this->quantidade,
            'estoque_minimo' => $minimo,
            'percentual' => $percentual,
            'severidade' => match (true) {
                $percentual <= 40 => 'Crítico',
                $percentual <= 70 => 'Alto',
                default => 'Médio',
            },
            'updated_at' => $this->updated_at,
        ];
    }
}
