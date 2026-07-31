<?php

namespace App\Contracts;

use App\DataTransferObjects\ChamadoPendente;
use Illuminate\Support\Collection;

/**
 * Contrato do conector com o sistema externo de chamados. A implementação
 * mock (ChamadoMockConnector) lê de uma tabela local; uma implementação real
 * (ex.: ChamadoRealConnector) faria requisições HTTP ao sistema de chamados
 * do Grupo Positivo. O restante do fluxo (ChamadoProcessingService) não muda.
 */
interface ChamadoConnectorInterface
{
    /**
     * @return Collection<int, ChamadoPendente>
     */
    public function listarPendentes(): Collection;

    public function marcarProcessado(ChamadoPendente $chamado): void;
}
