<?php

namespace App\Models;

use Database\Factories\SaldoPorUnidadeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaldoPorUnidade extends Model
{
    /** @use HasFactory<SaldoPorUnidadeFactory> */
    use HasFactory;

    protected $table = 'saldos_por_unidade';

    protected $fillable = [
        'item_id',
        'unidade_id',
        'quantidade',
    ];

    protected function casts(): array
    {
        return [
            'quantidade' => 'integer',
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
