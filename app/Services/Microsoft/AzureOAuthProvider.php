<?php

namespace App\Services\Microsoft;

use TheNetworg\OAuth2\Client\Provider\Azure;

/**
 * Provider Azure AD/Entra ID com PKCE (S256) habilitado. A biblioteca
 * league/oauth2-client + thenetworg/oauth2-azure é o padrão de fato do
 * ecossistema PHP para o fluxo Authorization Code do Microsoft Identity
 * Platform — não existe um MSAL oficial mantido pela Microsoft para PHP.
 */
class AzureOAuthProvider extends Azure
{
    protected function getPkceMethod(): string
    {
        return self::PKCE_METHOD_S256;
    }
}
