<?php

namespace App\Models;

use Database\Factories\MovimentacaoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Movimentacao extends Model
{
    /** @use HasFactory<MovimentacaoFactory> */
    use HasFactory;

    protected $table = 'movimentacoes';

    protected $fillable = [
        'item_id',
        'unidade_origem_id',
        'unidade_destino_id',
        'tipo',
        'quantidade',
        'motivo',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'quantidade' => 'integer',
        ];
    }

    /** @return BelongsTo<Item, $this> */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /** @return BelongsTo<Unidade, $this> */
    public function unidadeOrigem(): BelongsTo
    {
        return $this->belongsTo(Unidade::class, 'unidade_origem_id');
    }

    /** @return BelongsTo<Unidade, $this> */
    public function unidadeDestino(): BelongsTo
    {
        return $this->belongsTo(Unidade::class, 'unidade_destino_id');
    }

    /** @return BelongsTo<User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
