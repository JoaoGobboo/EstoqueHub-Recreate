<?php

namespace App\Models;

use Database\Factories\UnidadeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\Pivot;

class Unidade extends Model
{
    /** @use HasFactory<UnidadeFactory> */
    use HasFactory;

    protected $fillable = [
        'nome',
        'localizacao',
        'responsavel',
    ];

    /** @return BelongsToMany<User, $this, Pivot, 'pivot'> */
    public function usuarios(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    /** @return HasMany<SaldoPorUnidade, $this> */
    public function saldos(): HasMany
    {
        return $this->hasMany(SaldoPorUnidade::class);
    }

    /** @return HasMany<Movimentacao, $this> */
    public function movimentacoesOrigem(): HasMany
    {
        return $this->hasMany(Movimentacao::class, 'unidade_origem_id');
    }

    /** @return HasMany<Movimentacao, $this> */
    public function movimentacoesDestino(): HasMany
    {
        return $this->hasMany(Movimentacao::class, 'unidade_destino_id');
    }

    /** @return HasMany<ChamadoMock, $this> */
    public function chamados(): HasMany
    {
        return $this->hasMany(ChamadoMock::class);
    }

    /** @return HasMany<RequisicaoCompra, $this> */
    public function requisicoesCompra(): HasMany
    {
        return $this->hasMany(RequisicaoCompra::class);
    }
}
