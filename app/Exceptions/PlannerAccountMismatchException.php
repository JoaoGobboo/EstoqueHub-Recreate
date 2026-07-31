<?php

namespace App\Exceptions;

use Exception;

/**
 * Lançada quando a conta Microsoft autenticada no fluxo de conexão não é a
 * conta esperada (PLANNER_EXPECTED_ACCOUNT). O token obtido nunca é
 * persistido quando esta exceção ocorre.
 */
class PlannerAccountMismatchException extends Exception
{
    public function __construct(
        public readonly string $contaEsperada,
        public readonly string $contaRecebida,
    ) {
        parent::__construct(sprintf(
            'Somente a conta %s pode ser conectada ao Microsoft Planner.',
            $contaEsperada,
        ));
    }
}
