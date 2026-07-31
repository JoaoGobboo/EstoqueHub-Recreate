<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RequisicaoCompraResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'quantidade' => $this->quantidade,
            'status' => $this->status,
            'motivo' => $this->motivo,
            'planner_task_url' => $this->planner_task_url,
            'planner_sync_status' => $this->planner_sync_status,
            'item' => new ItemResource($this->whenLoaded('item')),
            'unidade' => new UnidadeResource($this->whenLoaded('unidade')),
            'usuario' => $this->whenLoaded('usuario', fn () => $this->usuario?->name),
            'created_at' => $this->created_at,
        ];
    }
}
