<?php

namespace App\Services\Microsoft;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Cliente compartilhado para chamadas ao Microsoft Graph.
 * Renovação de token continua sob responsabilidade da conta conectada.
 */
class GraphClient
{
    /**
     * @param  array<string, mixed>|null  $body
     * @param  array<string, string|null>  $headers
     */
    public function request(
        string $method,
        string $url,
        string $token,
        ?array $body = null,
        array $headers = [],
        string $contexto = 'comunicar com o Microsoft Graph',
    ): Response {
        $tentativas = 0;

        while (true) {
            $resposta = Http::withToken($token)
                ->withHeaders(array_filter($headers, fn ($valor) => $valor !== null))
                ->send($method, $url, $body === null ? [] : ['json' => $body]);

            if ($resposta->successful()) {
                return $resposta;
            }

            $status = $resposta->status();

            if ($status === 429 && $tentativas < 2) {
                sleep(min((int) ($resposta->header('Retry-After') ?: 1), 5));
                $tentativas++;

                continue;
            }

            if (in_array($status, [500, 502, 503, 504], true) && $tentativas < 2) {
                usleep((2 ** $tentativas) * 200_000);
                $tentativas++;

                continue;
            }

            throw GraphException::fromResponse($resposta, $contexto);
        }
    }
}
