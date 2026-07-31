<?php

namespace App\Services\Microsoft;

use App\Exceptions\PlannerNotConnectedException;
use App\Exceptions\PlannerReconnectRequiredException;
use App\Models\RequisicaoCompra;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Cria, de forma idempotente, a tarefa no Microsoft Planner correspondente a
 * uma requisição de compra já persistida. Sempre usa o token delegado da
 * conta administrativa conectada (nunca client credentials). Uma falha aqui
 * nunca desfaz, apaga ou impede o registro interno já salvo.
 */
class PlannerTaskService
{
    public function __construct(
        private readonly MicrosoftPlannerAccountService $contas,
        private readonly GraphMailService $email,
    ) {}

    public function sincronizar(RequisicaoCompra $requisicao): void
    {
        $requisicao->refresh();

        if ($requisicao->planner_task_id) {
            return;
        }

        $requisicao->increment('planner_sync_attempts');

        try {
            $token = $this->contas->obterTokenValido();
        } catch (PlannerReconnectRequiredException) {
            $this->registrarFalha($requisicao, 'reconnect_required', 'A conexão com o Microsoft Planner precisa ser refeita.');

            return;
        } catch (PlannerNotConnectedException) {
            $this->registrarFalha($requisicao, 'failed', 'Integração com o Microsoft Planner não está conectada.');

            return;
        }

        $planId = (string) config('services.planner.plan_id');
        $bucketName = (string) config('services.planner.bucket_name');

        if ($bucketName === '') {
            $this->registrarFalha($requisicao, 'failed', 'PLANNER_BUCKET_NAME não configurado.');

            return;
        }

        try {
            $bucketId = $this->localizarBucket($token, $planId, $bucketName);

            if (! $bucketId) {
                $this->registrarFalha($requisicao, 'failed', "Bucket \"{$bucketName}\" não encontrado no plano.");

                return;
            }

            $tarefaId = $this->criarTarefa($token, $planId, $bucketId, $requisicao);
        } catch (PlannerReconnectRequiredException) {
            $this->registrarFalha($requisicao, 'reconnect_required', 'A conexão com o Microsoft Planner precisa ser refeita.');

            return;
        } catch (GraphException $e) {
            $this->registrarFalha(
                $requisicao,
                $e->status === 401 ? 'reconnect_required' : 'failed',
                $e->mensagemAmigavel($this->contaEsperada()),
                $e,
            );

            return;
        }

        $requisicao->forceFill([
            'planner_task_id' => $tarefaId,
            'planner_task_url' => $this->linkTarefa($tarefaId),
        ])->save();

        $this->notificarPorEmail($requisicao);

        try {
            $this->definirDescricao($token, $tarefaId, $requisicao);
        } catch (Throwable $e) {
            $mensagem = $e instanceof GraphException ? $e->mensagemAmigavel($this->contaEsperada()) : 'Falha ao atualizar a descrição da tarefa.';

            $requisicao->forceFill([
                'planner_sync_status' => 'success',
                'planner_sync_error' => Str::limit($mensagem, 250, ''),
                'planner_synced_at' => now(),
            ])->save();

            return;
        }

        Log::info('Tarefa criada no Microsoft Planner para requisição de compra.', [
            'requisicao_id' => $requisicao->id,
            'planner_task_id' => $tarefaId,
            'etapa' => 'success',
        ]);

        $requisicao->forceFill([
            'planner_sync_status' => 'success',
            'planner_sync_error' => null,
            'planner_synced_at' => now(),
        ])->save();
    }

    private function localizarBucket(string $token, string $planId, string $bucketName): ?string
    {
        $resposta = $this->chamarGraph('GET', "https://graph.microsoft.com/v1.0/planner/plans/{$planId}/buckets", $token);

        $bucket = collect($resposta->json('value'))->first(fn (array $b) => $b['name'] === $bucketName);

        return $bucket['id'] ?? null;
    }

    private function criarTarefa(string $token, string $planId, string $bucketId, RequisicaoCompra $requisicao): string
    {
        $resposta = $this->chamarGraph('POST', 'https://graph.microsoft.com/v1.0/planner/tasks', $token, [
            'planId' => $planId,
            'bucketId' => $bucketId,
            'title' => $this->titulo($requisicao),
        ]);

        return (string) $resposta->json('id');
    }

    private function definirDescricao(string $token, string $tarefaId, RequisicaoCompra $requisicao): void
    {
        $detalhes = $this->chamarGraph('GET', "https://graph.microsoft.com/v1.0/planner/tasks/{$tarefaId}/details", $token);
        $etag = $this->etagDe($detalhes);

        try {
            $this->patchDescricao($token, $tarefaId, $etag, $requisicao);
        } catch (GraphException $e) {
            if ($e->status !== 412) {
                throw $e;
            }

            $detalhes = $this->chamarGraph('GET', "https://graph.microsoft.com/v1.0/planner/tasks/{$tarefaId}/details", $token);
            $this->patchDescricao($token, $tarefaId, $this->etagDe($detalhes), $requisicao);
        }
    }

    private function patchDescricao(string $token, string $tarefaId, ?string $etag, RequisicaoCompra $requisicao): void
    {
        $this->chamarGraph(
            'PATCH',
            "https://graph.microsoft.com/v1.0/planner/tasks/{$tarefaId}/details",
            $token,
            [
                'description' => $this->descricao($requisicao),
                'previewType' => 'description',
            ],
            [
                'If-Match' => $etag,
                'Prefer' => 'return=representation',
            ],
        );
    }

    private function etagDe(Response $resposta): ?string
    {
        return $resposta->header('ETag') ?: $resposta->json('@odata.etag');
    }

    private function titulo(RequisicaoCompra $requisicao): string
    {
        return sprintf(
            'Compra: %s x%d — %s',
            $requisicao->item->nome,
            $requisicao->quantidade,
            $requisicao->unidade->nome,
        );
    }

    private function descricao(RequisicaoCompra $requisicao): string
    {
        $linhas = [
            'ID interno' => (string) $requisicao->id,
            'Criado no Planner por' => $this->contaEsperada(),
            'Criado no sistema por' => $requisicao->usuario?->name,
            'Login interno' => $requisicao->usuario?->email,
            'E-mail do solicitante' => $requisicao->usuario?->email,
            'Local' => $requisicao->unidade?->nome,
            'Tipo' => 'Requisição de compra',
            'Item' => $requisicao->item ? "{$requisicao->item->nome} ({$requisicao->item->sku})" : null,
            'Quantidade' => (string) $requisicao->quantidade,
            'Data e hora' => optional($requisicao->created_at)->format('d/m/Y H:i'),
            'Observações' => $requisicao->motivo,
            'Link do registro' => route('sugestoes.index'),
        ];

        return collect($linhas)
            ->filter(fn (?string $valor) => filled($valor))
            ->map(fn (string $valor, string $rotulo) => "{$rotulo}: {$valor}")
            ->implode("\n");
    }

    private function linkTarefa(string $tarefaId): string
    {
        return sprintf('https://tasks.office.com/%s/Home/Task/%s', config('services.microsoft.tenant_id'), $tarefaId);
    }

    private function contaEsperada(): string
    {
        return (string) config('services.planner.expected_account');
    }

    /**
     * Notifica por e-mail (via Graph, conta EventoTI) que um cartão foi
     * criado no Planner. Falha no envio nunca desfaz a tarefa já criada nem
     * o registro interno — só fica registrada em log.
     */
    private function notificarPorEmail(RequisicaoCompra $requisicao): void
    {
        try {
            $this->email->notificarNovaSolicitacaoDeCompra($requisicao);
        } catch (Throwable $e) {
            Log::warning('Falha ao enviar e-mail de notificação da solicitação de compra.', array_filter([
                'requisicao_id' => $requisicao->id,
                'planner_task_id' => $requisicao->planner_task_id,
                'status_http' => $e instanceof GraphException ? $e->status : null,
                'request_id' => $e instanceof GraphException ? $e->requestId : null,
                'mensagem' => $e instanceof GraphException ? $e->mensagemAmigavel($this->contaEsperada()) : 'Falha ao enviar e-mail de notificação.',
            ], fn ($v) => $v !== null));
        }
    }

    /**
     * Executa a chamada ao Graph com renovação silenciosa em 401 (uma vez),
     * backoff exponencial em 5xx e respeito ao Retry-After em 429 — poucas
     * tentativas, para não segurar a requisição HTTP síncrona por muito tempo.
     */
    private function chamarGraph(string $method, string $url, string $token, ?array $body = null, array $headers = []): Response
    {
        $tentativasFalhaTransitoria = 0;
        $jaTentouRenovar = false;

        while (true) {
            $resposta = Http::withToken($token)
                ->withHeaders(array_filter($headers, fn ($v) => $v !== null))
                ->send($method, $url, $body === null ? [] : ['json' => $body]);

            if ($resposta->successful()) {
                return $resposta;
            }

            $status = $resposta->status();

            if ($status === 401 && ! $jaTentouRenovar) {
                $jaTentouRenovar = true;
                $token = $this->contas->forcarRenovacao();

                continue;
            }

            if ($status === 429 && $tentativasFalhaTransitoria < 2) {
                sleep(min((int) ($resposta->header('Retry-After') ?: 1), 5));
                $tentativasFalhaTransitoria++;

                continue;
            }

            if (in_array($status, [500, 502, 503, 504], true) && $tentativasFalhaTransitoria < 2) {
                usleep((2 ** $tentativasFalhaTransitoria) * 200_000);
                $tentativasFalhaTransitoria++;

                continue;
            }

            throw GraphException::fromResponse($resposta, 'comunicar com o Microsoft Planner');
        }
    }

    private function registrarFalha(RequisicaoCompra $requisicao, string $status, string $mensagem, ?GraphException $erro = null): void
    {
        Log::warning('Falha ao sincronizar requisição de compra com o Microsoft Planner.', array_filter([
            'requisicao_id' => $requisicao->id,
            'planner_task_id' => $requisicao->planner_task_id,
            'etapa' => $status,
            'status_http' => $erro?->status,
            'conta_upn' => config('services.planner.expected_account'),
            'mensagem' => $mensagem,
            'request_id' => $erro?->requestId,
            'client_request_id' => $erro?->clientRequestId,
        ], fn ($v) => $v !== null));

        $requisicao->forceFill([
            'planner_sync_status' => $status,
            'planner_sync_error' => Str::limit($mensagem, 250, ''),
        ])->save();
    }
}
