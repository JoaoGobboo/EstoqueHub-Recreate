<?php

namespace Tests\Feature\Api;

use App\Models\Item;
use App\Models\MicrosoftPlannerConnection;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

class RequisicaoCompraApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_gera_e_lista_requisicao_para_item_abaixo_do_minimo(): void
    {
        $item = Item::factory()->create(['estoque_minimo' => 50]);
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create([
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 10,
        ]);

        $response = $this->postJson('/api/requisicoes-compra', [
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 40,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pendente')
            ->assertJsonPath('data.quantidade', 40)
            ->assertJsonPath('data.item.id', $item->id)
            ->assertJsonPath('data.unidade.id', $unidade->id)
            ->assertJsonPath('data.usuario', $this->usuario->name);

        $this->getJson('/api/requisicoes-compra?status=pendente')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_impede_requisicao_pendente_duplicada(): void
    {
        $item = Item::factory()->create(['estoque_minimo' => 50]);
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create([
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 10,
        ]);

        $dados = [
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 40,
        ];

        $this->postJson('/api/requisicoes-compra', $dados)->assertCreated();
        $this->postJson('/api/requisicoes-compra', $dados)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['item_id']);
    }

    public function test_recusa_requisicao_quando_saldo_esta_no_minimo(): void
    {
        $item = Item::factory()->create(['estoque_minimo' => 50]);
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create([
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 50,
        ]);

        $this->postJson('/api/requisicoes-compra', [
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 10,
        ])->assertStatus(422)->assertJsonValidationErrors(['item_id']);
    }

    public function test_cria_tarefa_no_planner_quando_conta_delegada_ja_esta_conectada(): void
    {
        config([
            'services.microsoft.tenant_id' => 'tenant-teste',
            'services.planner.plan_id' => 'plano-teste',
            'services.planner.bucket_name' => 'Compras',
            'services.planner.expected_account' => 'EventoTI@positivo.com.br',
        ]);

        MicrosoftPlannerConnection::query()->create([
            'microsoft_connection_status' => 'connected',
            'microsoft_account_upn' => 'EventoTI@positivo.com.br',
            'microsoft_token_cache_encrypted' => Crypt::encryptString(json_encode([
                'access_token' => 'access-valido',
                'refresh_token' => 'refresh-valido',
                'expires' => time() + 3600,
            ])),
        ]);

        Http::fake([
            'graph.microsoft.com/v1.0/planner/plans/plano-teste/buckets' => Http::response(['value' => [['id' => 'bucket-teste', 'name' => 'Compras']]], 200),
            'graph.microsoft.com/v1.0/planner/tasks/*/details' => Http::response([], 200, ['ETag' => 'etag-teste']),
            'graph.microsoft.com/v1.0/planner/tasks' => Http::response(['id' => 'tarefa-teste'], 201),
            'graph.microsoft.com/v1.0/me/sendMail' => Http::response([], 202),
        ]);

        $item = Item::factory()->create(['estoque_minimo' => 50]);
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create([
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 10,
        ]);

        $response = $this->postJson('/api/requisicoes-compra', [
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 40,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.planner_task_url', 'https://tasks.office.com/tenant-teste/Home/Task/tarefa-teste')
            ->assertJsonPath('data.planner_sync_status', 'success');

        Http::assertSent(fn ($request) => $request->url() === 'https://graph.microsoft.com/v1.0/planner/tasks'
            && $request['planId'] === 'plano-teste'
            && $request['bucketId'] === 'bucket-teste');
    }
}
