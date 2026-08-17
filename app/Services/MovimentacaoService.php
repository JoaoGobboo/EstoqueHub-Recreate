<?php

namespace App\Services;

use App\Exceptions\SaldoInsuficienteException;
use App\Models\Item;
use App\Models\Movimentacao;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class MovimentacaoService
{
    public function registrarEntrada(Item $item, Unidade $unidade, int $quantidade, ?string $motivo = null, ?User $usuario = null): Movimentacao
    {
        $this->validarQuantidade($quantidade);

        return DB::transaction(function () use ($item, $unidade, $quantidade, $motivo, $usuario) {
            $this->creditarSaldo($item, $unidade, $quantidade);

            return $this->criarMovimentacao(
                item: $item,
                tipo: 'entrada',
                quantidade: $quantidade,
                unidadeDestinoId: $unidade->id,
                motivo: $motivo,
                usuario: $usuario,
            );
        });
    }

    /**
     * @throws SaldoInsuficienteException
     */
    public function registrarSaida(Item $item, Unidade $unidade, int $quantidade, ?string $motivo = null, ?User $usuario = null): Movimentacao
    {
        $this->validarQuantidade($quantidade);

        return DB::transaction(function () use ($item, $unidade, $quantidade, $motivo, $usuario) {
            $this->debitarSaldo($item, $unidade, $quantidade);

            return $this->criarMovimentacao(
                item: $item,
                tipo: 'saida',
                quantidade: $quantidade,
                unidadeOrigemId: $unidade->id,
                motivo: $motivo,
                usuario: $usuario,
            );
        });
    }

    /**
     * @throws SaldoInsuficienteException
     */
    public function registrarTransferencia(Item $item, Unidade $origem, Unidade $destino, int $quantidade, ?string $motivo = null, ?User $usuario = null): Movimentacao
    {
        $this->validarQuantidade($quantidade);

        if ($origem->is($destino)) {
            throw new InvalidArgumentException('Origem e destino não podem ser a mesma unidade.');
        }

        return DB::transaction(function () use ($item, $origem, $destino, $quantidade, $motivo, $usuario) {
            $this->debitarSaldo($item, $origem, $quantidade);
            $this->creditarSaldo($item, $destino, $quantidade);

            return $this->criarMovimentacao(
                item: $item,
                tipo: 'transferencia',
                quantidade: $quantidade,
                unidadeOrigemId: $origem->id,
                unidadeDestinoId: $destino->id,
                motivo: $motivo,
                usuario: $usuario,
            );
        });
    }

    private function criarMovimentacao(
        Item $item,
        string $tipo,
        int $quantidade,
        ?int $unidadeOrigemId = null,
        ?int $unidadeDestinoId = null,
        ?string $motivo = null,
        ?User $usuario = null,
    ): Movimentacao {
        return Movimentacao::create([
            'item_id' => $item->id,
            'unidade_origem_id' => $unidadeOrigemId,
            'unidade_destino_id' => $unidadeDestinoId,
            'tipo' => $tipo,
            'quantidade' => $quantidade,
            'motivo' => $motivo,
            'user_id' => $usuario?->id,
        ]);
    }

    private function validarQuantidade(int $quantidade): void
    {
        if ($quantidade <= 0) {
            throw new InvalidArgumentException('Quantidade deve ser maior que zero.');
        }
    }

    private function creditarSaldo(Item $item, Unidade $unidade, int $quantidade): void
    {
        $saldo = $this->saldoParaAtualizacao($item, $unidade);
        $saldo->increment('quantidade', $quantidade);
    }

    /**
     * @throws SaldoInsuficienteException
     */
    private function debitarSaldo(Item $item, Unidade $unidade, int $quantidade): void
    {
        $saldo = $this->saldoParaAtualizacao($item, $unidade);

        if ($saldo->quantidade < $quantidade) {
            throw new SaldoInsuficienteException($item, $unidade, $quantidade, $saldo->quantidade);
        }

        $saldo->decrement('quantidade', $quantidade);
    }

    /**
     * Busca (com lock de linha) ou cria o saldo do item na unidade.
     * Deve ser chamado dentro de uma transação.
     */
    private function saldoParaAtualizacao(Item $item, Unidade $unidade): SaldoPorUnidade
    {
        return SaldoPorUnidade::lockForUpdate()->firstOrCreate(
            ['item_id' => $item->id, 'unidade_id' => $unidade->id],
            ['quantidade' => 0],
        );
    }
}
