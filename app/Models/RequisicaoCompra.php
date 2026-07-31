<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequisicaoCompra extends Model
{
    use HasFactory;

    protected $table = 'requisicoes_compra';

    protected $fillable = [
        'item_id',
        'unidade_id',
        'quantidade',
        'status',
        'motivo',
        'user_id',
        'planner_task_id',
        'planner_task_url',
        'planner_sync_status',
        'planner_sync_error',
        'planner_synced_at',
        'planner_sync_attempts',
    ];

    protected function casts(): array
    {
        return [
            'quantidade' => 'integer',
            'planner_synced_at' => 'datetime',
            'planner_sync_attempts' => 'integer',
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

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
