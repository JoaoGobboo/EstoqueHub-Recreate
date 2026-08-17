<?php

namespace App\Services;

use App\Contracts\ChamadoConnectorInterface;
use App\DataTransferObjects\ChamadoPendente;
use App\Exceptions\SaldoInsuficienteException;
use App\Models\Item;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ChamadoProcessingService
{
    public function __construct(
        private readonly ChamadoConnectorInterface $connector,
        private readonly MovimentacaoService $movimentacaoService,
    ) {}

    /**
     * Processa todos os chamados pendentes de forma idempotente: reivindica
     * cada chamado uma única vez, registra a saída correspondente e o fecha.
     * Chamados cujo item não tem saldo suficiente permanecem abertos.
     *
     * @return array{processados: int, falhas: array<int, array{numero_chamado: string, erro: string}>}
     */
    public function processarPendentes(?User $usuario = null): array
    {
        $processados = 0;
        $falhas = [];

        foreach ($this->connector->listarPendentes() as $chamado) {
            try {
                if ($this->processarUm($chamado, $usuario)) {
                    $processados++;
                }
            } catch (SaldoInsuficienteException $e) {
                $falhas[] = [
                    'numero_chamado' => $chamado->numeroChamado,
                    'erro' => $e->getMessage(),
                ];
            }
        }

        return compact('processados', 'falhas');
    }

    /**
     * @throws SaldoInsuficienteException
     */
    private function processarUm(ChamadoPendente $chamado, ?User $usuario): bool
    {
        return DB::transaction(function () use ($chamado, $usuario) {
            if (! $this->connector->tentarMarcarProcessado($chamado)) {
                return false;
            }

            $item = Item::findOrFail($chamado->itemId);
            $unidade = Unidade::findOrFail($chamado->unidadeId);

            $this->movimentacaoService->registrarSaida(
                item: $item,
                unidade: $unidade,
                quantidade: $chamado->quantidade,
                motivo: "Chamado #{$chamado->numeroChamado}",
                usuario: $usuario,
            );

            return true;
        });
    }
}
