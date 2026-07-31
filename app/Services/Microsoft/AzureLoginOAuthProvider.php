<?php

namespace App\Services\Microsoft;

/**
 * Classe distinta apenas para permitir um binding de container separado do
 * provider usado na conexão administrativa do Planner — mesmo client/tenant,
 * porém com redirect_uri e escopos próprios do login de usuários comuns.
 */
class AzureLoginOAuthProvider extends AzureOAuthProvider
{
    //
}
