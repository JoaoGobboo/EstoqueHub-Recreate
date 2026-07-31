<?php

namespace App\Exceptions;

use Exception;

/**
 * Lançada quando nenhuma conta Microsoft foi conectada ainda (fluxo de
 * conexão inicial nunca executado por um administrador).
 */
class PlannerNotConnectedException extends Exception
{
    //
}
