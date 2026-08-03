<?php

namespace App\Models;

use Database\Factories\ItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    /** @use HasFactory<ItemFactory> */
    use HasFactory;

    protected $table = 'itens';

    protected $fillable = [
        'sku',
        'nome',
        'categoria',
        'descricao',
        'valor_unitario',
        'estoque_minimo',
    ];

    protected static function booted(): void
    {
        static::updated(function (Item $item) {
            if ($item->wasChanged('estoque_minimo')) {
                AlertaResolucao::where('item_id', $item->id)->delete();
            }
        });
    }

    protected function casts(): array
    {
        return [
            'valor_unitario' => 'decimal:2',
            'estoque_minimo' => 'integer',
        ];
    }

    public function saldos(): HasMany
    {
        return $this->hasMany(SaldoPorUnidade::class);
    }

    public function movimentacoes(): HasMany
    {
        return $this->hasMany(Movimentacao::class);
    }

    public function chamados(): HasMany
    {
        return $this->hasMany(ChamadoMock::class);
    }

    public function requisicoesCompra(): HasMany
    {
        return $this->hasMany(RequisicaoCompra::class);
    }

    public function saldoTotal(): int
    {
        return (int) $this->saldos()->sum('quantidade');
    }
}
