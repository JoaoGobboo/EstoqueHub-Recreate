<?php

namespace App\Models;

use Database\Factories\UnidadeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unidade extends Model
{
    /** @use HasFactory<UnidadeFactory> */
    use HasFactory;

    protected $fillable = [
        'nome',
        'localizacao',
        'responsavel',
    ];

    public function saldos(): HasMany
    {
        return $this->hasMany(SaldoPorUnidade::class);
    }

    public function movimentacoesOrigem(): HasMany
    {
        return $this->hasMany(Movimentacao::class, 'unidade_origem_id');
    }

    public function movimentacoesDestino(): HasMany
    {
        return $this->hasMany(Movimentacao::class, 'unidade_destino_id');
    }

    public function chamados(): HasMany
    {
        return $this->hasMany(ChamadoMock::class);
    }

    public function requisicoesCompra(): HasMany
    {
        return $this->hasMany(RequisicaoCompra::class);
    }
}
