<?php

namespace App\Services\Microsoft;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use TheNetworg\OAuth2\Client\Token\AccessToken as AzureAccessToken;

/**
 * Login opcional "Entrar com Microsoft" para usuários internos, além do
 * login por e-mail/senha existente. Usa Authorization Code + PKCE contra o
 * tenant configurado (AZURE_TENANT_ID) — apenas contas desse tenant do
 * Grupo Positivo conseguem autenticar, pois o endpoint do Microsoft Identity
 * Platform é específico do tenant (não é "common"). Não tem relação com a
 * conexão administrativa da conta EventoTI@positivo.com.br usada para o
 * Microsoft Planner (fluxo e credenciais completamente separados).
 */
class MicrosoftLoginService
{
    private const SESSION_STATE = 'microsoft_login.state';

    private const SESSION_NONCE = 'microsoft_login.nonce';

    private const SESSION_PKCE = 'microsoft_login.pkce_verifier';

    public function __construct(private readonly AzureLoginOAuthProvider $provider) {}

    public function redirectParaLogin(): RedirectResponse
    {
        $provider = $this->provider;

        $state = Str::random(40);
        $nonce = Str::random(40);

        $url = $provider->getAuthorizationUrl([
            'state' => $state,
            'nonce' => $nonce,
        ]);

        session()->put(self::SESSION_STATE, $state);
        session()->put(self::SESSION_NONCE, $nonce);
        session()->put(self::SESSION_PKCE, $provider->getPkceCode());

        return redirect()->away($url);
    }

    public function tratarCallback(Request $request): User
    {
        $estadoEsperado = $request->session()->pull(self::SESSION_STATE);
        $nonceEsperado = $request->session()->pull(self::SESSION_NONCE);
        $verificadorPkce = $request->session()->pull(self::SESSION_PKCE);

        if ($request->filled('error')) {
            throw new RuntimeException((string) $request->string('error_description'));
        }

        if (! $estadoEsperado || ! hash_equals((string) $estadoEsperado, (string) $request->query('state'))) {
            throw new RuntimeException('Estado inválido na resposta da Microsoft.');
        }

        $provider = $this->provider;
        $provider->setPkceCode($verificadorPkce);

        $token = $provider->getAccessToken('authorization_code', [
            'code' => (string) $request->query('code'),
        ]);

        if (! $token instanceof AzureAccessToken) {
            throw new RuntimeException('Token Microsoft inválido.');
        }

        $claims = $token->getIdTokenClaims() ?? [];

        if (! $nonceEsperado || ! hash_equals((string) $nonceEsperado, (string) ($claims['nonce'] ?? ''))) {
            throw new RuntimeException('Nonce inválido na resposta da Microsoft.');
        }

        $resposta = Http::withToken($token->getToken())->get('https://graph.microsoft.com/v1.0/me');

        if ($resposta->failed()) {
            throw GraphException::fromResponse($resposta, 'confirmar a identidade da conta Microsoft');
        }

        $me = $resposta->json();
        $oid = (string) ($me['id'] ?? '');
        $email = (string) ($me['mail'] ?? $me['userPrincipalName'] ?? '');
        $nome = (string) ($me['displayName'] ?? $email);

        if ($oid === '' || $email === '') {
            throw new RuntimeException('Não foi possível obter os dados da conta Microsoft.');
        }

        return $this->localizarOuCriarUsuario($oid, $email, $nome);
    }

    private function localizarOuCriarUsuario(string $oid, string $email, string $nome): User
    {
        $usuario = User::where('microsoft_oid', $oid)->first()
            ?? User::whereRaw('lower(email) = ?', [strtolower($email)])->first();

        if ($usuario) {
            $usuario->forceFill([
                'microsoft_oid' => $oid,
                'email_verified_at' => $usuario->email_verified_at ?? now(),
            ])->save();

            return $usuario;
        }

        return User::create([
            'name' => $nome,
            'email' => $email,
            'password' => null,
            'microsoft_oid' => $oid,
            'email_verified_at' => now(),
        ]);
    }
}
