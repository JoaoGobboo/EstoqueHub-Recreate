<?php

namespace App\Services\Microsoft;

use Illuminate\Http\Client\Response;
use RuntimeException;

/**
 * Representa uma falha de chamada ao Microsoft Graph com o status HTTP e os
 * identificadores de correlação da resposta, para diagnóstico sem nunca
 * carregar tokens ou cabeçalhos de autorização.
 */
class GraphException extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        string $message,
        public readonly ?string $requestId = null,
        public readonly ?string $clientRequestId = null,
        public readonly ?int $retryAfter = null,
    ) {
        parent::__construct($message);
    }

    public static function fromResponse(Response $response, string $contexto): self
    {
        $erro = $response->json('error.message') ?? $response->reason();

        return new self(
            status: $response->status(),
            message: "Falha ao {$contexto} (HTTP {$response->status()}): {$erro}",
            requestId: $response->header('request-id') ?: null,
            clientRequestId: $response->header('client-request-id') ?: null,
            retryAfter: $response->header('Retry-After') ? (int) $response->header('Retry-After') : null,
        );
    }

    /**
     * Mensagem amigável para exibição a administradores, sem detalhes técnicos.
     */
    public function mensagemAmigavel(string $contaEsperada): string
    {
        return match ($this->status) {
            401 => 'Token inválido ou conexão expirada com o Microsoft Planner.',
            403 => "A conta {$contaEsperada} não possui acesso ao plano ou ao grupo Microsoft 365 responsável por ele.",
            404 => 'Plano, bucket ou tarefa não encontrado no Microsoft Planner.',
            412 => 'A tarefa foi alterada por outra origem (ETag desatualizado).',
            429 => 'Limite de requisições do Microsoft Graph atingido. Tente novamente em instantes.',
            500, 502, 503, 504 => 'O Microsoft Planner está indisponível no momento.',
            default => 'Falha ao comunicar com o Microsoft Planner.',
        };
    }
}
