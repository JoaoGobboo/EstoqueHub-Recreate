<?php

namespace App\Exceptions;

use Exception;

/**
 * Lançada quando a renovação silenciosa do token da conta conectada falha
 * (refresh token expirado/revogado). A integração deve ser marcada como
 * "reconexão necessária" e um administrador precisa reconectar manualmente.
 */
class PlannerReconnectRequiredException extends Exception
{
    //
}
