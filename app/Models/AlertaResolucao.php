<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AlertaResolucao extends Model
{
    protected $table = 'alerta_resolucoes';

    protected $fillable = [
        'item_id',
        'unidade_id',
        'resolvido_por',
        'quantidade_resolvida',
        'estoque_minimo_resolvido',
        'resolvido_em',
    ];

    protected function casts(): array
    {
        return [
            'quantidade_resolvida' => 'integer',
            'estoque_minimo_resolvido' => 'integer',
            'resolvido_em' => 'datetime',
        ];
    }

    /** @return BelongsTo<Item, $this> */
    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    /** @return BelongsTo<Unidade, $this> */
    public function unidade(): BelongsTo
    {
        return $this->belongsTo(Unidade::class);
    }

    /** @return BelongsTo<User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolvido_por');
    }
}
