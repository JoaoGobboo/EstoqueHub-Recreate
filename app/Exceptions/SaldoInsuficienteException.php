<?php

namespace App\Exceptions;

use App\Models\Item;
use App\Models\Unidade;
use Exception;

class SaldoInsuficienteException extends Exception
{
    public function __construct(
        public readonly Item $item,
        public readonly Unidade $unidade,
        public readonly int $quantidadeSolicitada,
        public readonly int $saldoDisponivel,
    ) {
        parent::__construct(sprintf(
            'Saldo insuficiente para "%s" em %s: solicitado %d, disponível %d.',
            $item->nome,
            $unidade->nome,
            $quantidadeSolicitada,
            $saldoDisponivel,
        ));
    }
}
