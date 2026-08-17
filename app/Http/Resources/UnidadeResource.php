<?php

namespace App\Http\Resources;

use App\Models\Unidade;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Unidade */
class UnidadeResource extends JsonResource
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
            'nome' => $this->nome,
            'localizacao' => $this->localizacao,
            'responsavel' => $this->responsavel,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
