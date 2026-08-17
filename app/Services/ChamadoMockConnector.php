<?php

namespace App\Services;

use App\Contracts\ChamadoConnectorInterface;
use App\DataTransferObjects\ChamadoPendente;
use App\Models\ChamadoMock;
use Illuminate\Support\Collection;

class ChamadoMockConnector implements ChamadoConnectorInterface
{
    public function listarPendentes(): Collection
    {
        return ChamadoMock::query()
            ->where('status', 'aberto')
            ->get()
            ->map(fn (ChamadoMock $chamado) => new ChamadoPendente(
                numeroChamado: $chamado->numero_chamado,
                itemId: $chamado->item_id,
                unidadeId: $chamado->unidade_id,
                quantidade: $chamado->quantidade_solicitada,
            ));
    }

    public function tentarMarcarProcessado(ChamadoPendente $chamado): bool
    {
        return ChamadoMock::query()
            ->where('numero_chamado', $chamado->numeroChamado)
            ->where('status', 'aberto')
            ->update(['status' => 'fechado']) === 1;
    }
}
