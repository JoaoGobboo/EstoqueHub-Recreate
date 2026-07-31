<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

class UnidadeAccessService
{
    /**
     * IDs das unidades atribuídas ao usuário. Null representa acesso global.
     * Usuários legados sem atribuições mantêm o acesso anterior até que os
     * vínculos sejam configurados.
     *
     * @return Collection<int, int>|null
     */
    public function idsFor(User $user): ?Collection
    {
        if ($user->is_admin) {
            return null;
        }

        $ids = $user->unidades()
            ->pluck('unidades.id')
            ->map(fn ($id) => (int) $id)
            ->values();

        return $ids->isEmpty() ? null : $ids;
    }

    public function canAccess(User $user, int $unidadeId): bool
    {
        $ids = $this->idsFor($user);

        return $ids === null || $ids->contains($unidadeId);
    }
}
