<?php

namespace App\Models;

use Database\Factories\ChamadoMockFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChamadoMock extends Model
{
    /** @use HasFactory<ChamadoMockFactory> */
    use HasFactory;

    protected $table = 'chamados_mock';

    protected $fillable = [
        'numero_chamado',
        'item_id',
        'unidade_id',
        'quantidade_solicitada',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'quantidade_solicitada' => 'integer',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function unidade(): BelongsTo
    {
        return $this->belongsTo(Unidade::class);
    }
}
