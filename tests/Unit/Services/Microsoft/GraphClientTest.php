<?php

namespace Tests\Unit\Services\Microsoft;

use App\Services\Microsoft\GraphClient;
use App\Services\Microsoft\GraphException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GraphClientTest extends TestCase
{
    public function test_retries_rate_limit_before_returning_success(): void
    {
        Http::fakeSequence()
            ->push(['error' => ['message' => 'aguarde']], 429, ['Retry-After' => '0'])
            ->push(['ok' => true], 200);

        $response = app(GraphClient::class)->request(
            method: 'GET',
            url: 'https://graph.microsoft.com/v1.0/test',
            token: 'token-teste',
        );

        $this->assertTrue($response->successful());
        Http::assertSentCount(2);
    }

    public function test_converts_http_error_to_graph_exception(): void
    {
        Http::fake([
            'graph.microsoft.com/*' => Http::response(
                ['error' => ['message' => 'acesso negado']],
                403,
                ['request-id' => 'request-teste'],
            ),
        ]);

        try {
            app(GraphClient::class)->request(
                method: 'GET',
                url: 'https://graph.microsoft.com/v1.0/test',
                token: 'token-teste',
                contexto: 'consultar o recurso',
            );
            $this->fail('A chamada deveria lançar GraphException.');
        } catch (GraphException $exception) {
            $this->assertSame(403, $exception->status);
            $this->assertSame('request-teste', $exception->requestId);
            $this->assertStringContainsString('consultar o recurso', $exception->getMessage());
        }

        Http::assertSentCount(1);
    }
}
