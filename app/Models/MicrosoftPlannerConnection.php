<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro único (singleton) da conta Microsoft conectada à integração com o
 * Planner. O token cache fica cifrado em repouso (Crypt, baseado em APP_KEY)
 * e nunca é exposto pela aplicação — apenas metadados de status.
 */
class MicrosoftPlannerConnection extends Model
{
    protected $fillable = [
        'microsoft_account_id',
        'microsoft_account_upn',
        'microsoft_account_name',
        'microsoft_connected_at',
        'microsoft_connection_status',
        'microsoft_token_cache_encrypted',
        'microsoft_last_token_refresh_at',
        'microsoft_last_error',
        'microsoft_reconnect_required',
        'microsoft_last_test_at',
        'microsoft_last_test_result',
        'microsoft_last_sync_at',
        'connected_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'microsoft_connected_at' => 'datetime',
            'microsoft_last_token_refresh_at' => 'datetime',
            'microsoft_reconnect_required' => 'boolean',
            'microsoft_last_test_at' => 'datetime',
            'microsoft_last_sync_at' => 'datetime',
        ];
    }

    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'microsoft_connection_status' => 'disconnected',
        ]);
    }

    public function conectada(): bool
    {
        return $this->microsoft_connection_status === 'connected' && ! $this->microsoft_reconnect_required;
    }

    /** @return BelongsTo<User, $this> */
    public function connectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'connected_by_user_id');
    }
}
