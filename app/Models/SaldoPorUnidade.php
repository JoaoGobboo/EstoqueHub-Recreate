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

    protected static function booted(): void
    {
        static::updated(function (SaldoPorUnidade $saldo) {
            if ($saldo->wasChanged('quantidade')) {
                AlertaResolucao::where('item_id', $saldo->item_id)
                    ->where('unidade_id', $saldo->unidade_id)
                    ->delete();
            }
        });

        static::deleted(fn (SaldoPorUnidade $saldo) => AlertaResolucao::where('item_id', $saldo->item_id)
            ->where('unidade_id', $saldo->unidade_id)
            ->delete());
    }

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
