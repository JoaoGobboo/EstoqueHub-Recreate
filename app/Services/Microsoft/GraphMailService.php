<?php

namespace App\Services\Microsoft;

use App\Models\RequisicaoCompra;

/**
 * Envia e-mails de notificação via Microsoft Graph (POST /me/sendMail),
 * usando o mesmo token delegado da conta EventoTI@positivo.com.br conectada
 * para o Planner — não usa SMTP nem o sistema de Mail do Laravel.
 */
class GraphMailService
{
    public function __construct(
        private readonly MicrosoftPlannerAccountService $contas,
        private readonly GraphClient $graph,
    ) {}

    public function notificarNovaSolicitacaoDeCompra(RequisicaoCompra $requisicao): void
    {
        $destinatario = (string) config('services.planner.notification_email');

        if ($destinatario === '') {
            return;
        }

        $token = $this->contas->obterTokenValido();

        $this->graph->request(
            method: 'POST',
            url: 'https://graph.microsoft.com/v1.0/me/sendMail',
            token: $token,
            body: [
                'message' => [
                    'subject' => $this->assunto($requisicao),
                    'body' => [
                        'contentType' => 'Text',
                        'content' => $this->corpo($requisicao),
                    ],
                    'toRecipients' => [
                        ['emailAddress' => ['address' => $destinatario]],
                    ],
                ],
                'saveToSentItems' => true,
            ],
            contexto: 'enviar e-mail de notificação da solicitação de compra',
        );
    }

    private function assunto(RequisicaoCompra $requisicao): string
    {
        return sprintf(
            'Nova solicitação de compra no Planner: %s (%s)',
            $requisicao->item->nome,
            $requisicao->unidade->nome,
        );
    }

    private function corpo(RequisicaoCompra $requisicao): string
    {
        $campos = [
            'ID interno' => (string) $requisicao->id,
            'Item' => $requisicao->item ? "{$requisicao->item->nome} ({$requisicao->item->sku})" : null,
            'Unidade' => $requisicao->unidade?->nome,
            'Quantidade' => (string) $requisicao->quantidade,
            'Solicitado por' => $requisicao->usuario?->name,
            'Observações' => $requisicao->motivo,
            'Cartão no Planner' => $requisicao->planner_task_url,
            'Registro no sistema' => route('sugestoes.index'),
        ];

        $detalhes = collect($campos)
            ->filter(fn (?string $valor) => filled($valor))
            ->map(fn (string $valor, string $rotulo) => "{$rotulo}: {$valor}")
            ->implode("\n");

        return "Uma nova solicitação de compra gerou um cartão no Microsoft Planner.\n\n".$detalhes;
    }
}
