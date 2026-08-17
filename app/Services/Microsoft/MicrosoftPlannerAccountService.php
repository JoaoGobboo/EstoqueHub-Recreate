<?php

namespace App\Services\Microsoft;

use App\Exceptions\PlannerAccountMismatchException;
use App\Exceptions\PlannerNotConnectedException;
use App\Exceptions\PlannerReconnectRequiredException;
use App\Models\MicrosoftPlannerConnection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use League\OAuth2\Client\Token\AccessToken;
use RuntimeException;
use Throwable;

/**
 * Gerencia a conexão delegada (Authorization Code + PKCE) da conta Microsoft
 * dedicada usada pelo backend para criar tarefas no Planner. Usuários comuns
 * do EstoqueHub nunca são redirecionados para a Microsoft — apenas um
 * administrador conecta a conta EventoTI@positivo.com.br uma única vez, e o
 * backend renova o token silenciosamente a partir daí.
 */
class MicrosoftPlannerAccountService
{
    private const SESSION_STATE = 'microsoft_planner.state';

    private const SESSION_NONCE = 'microsoft_planner.nonce';

    private const SESSION_PKCE = 'microsoft_planner.pkce_verifier';

    public function __construct(
        private readonly AzureOAuthProvider $provider,
        private readonly GraphClient $graph,
    ) {}

    public function redirectParaConexao(): RedirectResponse
    {
        $state = Str::random(40);
        $nonce = Str::random(40);

        $url = $this->provider->getAuthorizationUrl([
            'state' => $state,
            'nonce' => $nonce,
        ]);

        session()->put(self::SESSION_STATE, $state);
        session()->put(self::SESSION_NONCE, $nonce);
        session()->put(self::SESSION_PKCE, $this->provider->getPkceCode());

        return redirect()->away($url);
    }

    public function tratarCallback(Request $request): MicrosoftPlannerConnection
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

        $this->provider->setPkceCode($verificadorPkce);

        $token = $this->provider->getAccessToken('authorization_code', [
            'code' => (string) $request->query('code'),
        ]);

        $claims = $token->getIdTokenClaims() ?? [];

        if (! $nonceEsperado || ! hash_equals((string) $nonceEsperado, (string) ($claims['nonce'] ?? ''))) {
            throw new RuntimeException('Nonce inválido na resposta da Microsoft.');
        }

        $resposta = $this->graph->request(
            method: 'GET',
            url: 'https://graph.microsoft.com/v1.0/me',
            token: $token->getToken(),
            contexto: 'confirmar a identidade da conta Microsoft',
        );

        if ($resposta->failed()) {
            throw GraphException::fromResponse($resposta, 'confirmar a identidade da conta Microsoft');
        }

        $me = $resposta->json();
        $upn = (string) ($me['userPrincipalName'] ?? '');
        $mail = (string) ($me['mail'] ?? '');
        $contaEsperada = (string) config('services.planner.expected_account');

        $confere = ($upn !== '' && strcasecmp($upn, $contaEsperada) === 0)
            || ($mail !== '' && strcasecmp($mail, $contaEsperada) === 0);

        if (! $confere) {
            Log::warning('Tentativa de conectar conta Microsoft divergente da esperada na integração do Planner.', [
                'conta_recebida' => $upn ?: $mail,
            ]);

            throw new PlannerAccountMismatchException($contaEsperada, $upn ?: $mail);
        }

        $conexao = MicrosoftPlannerConnection::current();
        $conexao->fill([
            'microsoft_account_id' => $me['id'] ?? null,
            'microsoft_account_upn' => $upn ?: $mail,
            'microsoft_account_name' => $me['displayName'] ?? null,
            'microsoft_connected_at' => now(),
            'microsoft_connection_status' => 'connected',
            'microsoft_token_cache_encrypted' => $this->cifrarToken($token),
            'microsoft_last_token_refresh_at' => now(),
            'microsoft_last_error' => null,
            'microsoft_reconnect_required' => false,
            'connected_by_user_id' => $request->user()?->id,
        ])->save();

        return $conexao;
    }

    public function desconectar(): void
    {
        MicrosoftPlannerConnection::current()->forceFill([
            'microsoft_account_id' => null,
            'microsoft_account_upn' => null,
            'microsoft_account_name' => null,
            'microsoft_connected_at' => null,
            'microsoft_connection_status' => 'disconnected',
            'microsoft_token_cache_encrypted' => null,
            'microsoft_reconnect_required' => false,
            'microsoft_last_error' => null,
            'connected_by_user_id' => null,
        ])->save();
    }

    /**
     * Retorna um access token válido para a conta conectada, renovando
     * silenciosamente via refresh token quando necessário. Nunca solicita
     * senha nem usa client credentials.
     */
    public function obterTokenValido(): string
    {
        $conexao = MicrosoftPlannerConnection::current();

        if (! $conexao->microsoft_token_cache_encrypted || $conexao->microsoft_connection_status === 'disconnected') {
            throw new PlannerNotConnectedException('Nenhuma conta Microsoft conectada à integração do Planner.');
        }

        if ($conexao->microsoft_reconnect_required || $conexao->microsoft_connection_status === 'reconnect_required') {
            throw new PlannerReconnectRequiredException('A conexão com o Microsoft Planner precisa ser refeita.');
        }

        try {
            $token = $this->decifrarToken($conexao->microsoft_token_cache_encrypted);
        } catch (Throwable) {
            $this->marcarReconexaoNecessaria($conexao, 'Token cache corrompido ou ilegível.');

            throw new PlannerReconnectRequiredException('A conexão com o Microsoft Planner precisa ser refeita.');
        }

        if (! $token->hasExpired()) {
            return $token->getToken();
        }

        return $this->renovarSilenciosamente($conexao, $token);
    }

    /**
     * Força uma renovação mesmo que o token em cache ainda pareça válido —
     * usado quando o Microsoft Graph rejeita o token com 401 inesperadamente.
     */
    public function forcarRenovacao(): string
    {
        $conexao = MicrosoftPlannerConnection::current();
        $token = $this->decifrarToken($conexao->microsoft_token_cache_encrypted ?? '');

        return $this->renovarSilenciosamente($conexao, $token);
    }

    private function renovarSilenciosamente(MicrosoftPlannerConnection $conexao, AccessToken $token): string
    {
        try {
            $novoToken = $this->provider->getAccessToken('refresh_token', [
                'refresh_token' => $token->getRefreshToken(),
            ]);
        } catch (Throwable $e) {
            $this->marcarReconexaoNecessaria($conexao, $this->sanitizarErro($e));

            throw new PlannerReconnectRequiredException('A conexão com o Microsoft Planner precisa ser refeita.', previous: $e);
        }

        $conexao->forceFill([
            'microsoft_token_cache_encrypted' => $this->cifrarToken($novoToken),
            'microsoft_last_token_refresh_at' => now(),
            'microsoft_reconnect_required' => false,
            'microsoft_connection_status' => 'connected',
        ])->save();

        return $novoToken->getToken();
    }

    /**
     * Testa o acesso da conta conectada ao plano e aos buckets, sem criar
     * nenhuma tarefa.
     *
     * @return array{plano: string|null, buckets: array<int, string>}
     */
    public function testarConexao(): array
    {
        $conexao = MicrosoftPlannerConnection::current();
        $planId = config('services.planner.plan_id');

        try {
            $token = $this->obterTokenValido();

            $planResp = $this->graph->request(
                method: 'GET',
                url: "https://graph.microsoft.com/v1.0/planner/plans/{$planId}",
                token: $token,
                contexto: 'consultar o plano do Planner',
            );

            $bucketsResp = $this->graph->request(
                method: 'GET',
                url: "https://graph.microsoft.com/v1.0/planner/plans/{$planId}/buckets",
                token: $token,
                contexto: 'consultar os buckets do plano',
            );

            $conexao->forceFill([
                'microsoft_last_test_at' => now(),
                'microsoft_last_test_result' => 'success',
                'microsoft_last_error' => null,
            ])->save();

            return [
                'plano' => $planResp->json('title'),
                'buckets' => collect($bucketsResp->json('value'))->pluck('name')->all(),
            ];
        } catch (GraphException $e) {
            $conexao->forceFill([
                'microsoft_last_test_at' => now(),
                'microsoft_last_test_result' => 'failed',
                'microsoft_last_error' => Str::limit($e->mensagemAmigavel((string) config('services.planner.expected_account')), 250, ''),
            ])->save();

            throw $e;
        } catch (PlannerReconnectRequiredException|PlannerNotConnectedException $e) {
            $conexao->forceFill([
                'microsoft_last_test_at' => now(),
                'microsoft_last_test_result' => 'failed',
            ])->save();

            throw $e;
        }
    }

    private function marcarReconexaoNecessaria(MicrosoftPlannerConnection $conexao, string $erro): void
    {
        $conexao->forceFill([
            'microsoft_connection_status' => 'reconnect_required',
            'microsoft_reconnect_required' => true,
            'microsoft_last_error' => Str::limit($erro, 250, ''),
        ])->save();
    }

    private function sanitizarErro(Throwable $e): string
    {
        return match (true) {
            $e instanceof IdentityProviderException => 'Falha ao renovar token: '.($e->getMessage() ?: 'erro desconhecido'),
            default => 'Falha ao renovar token de acesso.',
        };
    }

    private function cifrarToken(AccessToken $token): string
    {
        return Crypt::encryptString(json_encode([
            'access_token' => $token->getToken(),
            'refresh_token' => $token->getRefreshToken(),
            'expires' => $token->getExpires(),
        ], JSON_THROW_ON_ERROR));
    }

    private function decifrarToken(string $cifrado): AccessToken
    {
        $dados = json_decode(Crypt::decryptString($cifrado), true, flags: JSON_THROW_ON_ERROR);

        return new AccessToken($dados);
    }
}
