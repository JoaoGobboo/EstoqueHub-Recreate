<?php

namespace Tests\Feature\Api;

use App\Models\Item;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use App\Services\MovimentacaoService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DashboardApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_dashboard_retorna_metricas_consistentes_com_os_dados(): void
    {
        $item = Item::factory()->create(['estoque_minimo' => 50, 'valor_unitario' => 10]);
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $unidade->id, 'quantidade' => 20]); // abaixo do minimo

        app(MovimentacaoService::class)->registrarEntrada($item, $unidade, 5, 'Compra');

        $response = $this->getJson('/api/dashboard');

        $response->assertOk();
        $response->assertJsonPath('itens_em_estoque', 25);
        $response->assertJsonPath('skus_ativos', 1);
        $response->assertJsonPath('abaixo_do_minimo', 1);
        $response->assertJsonPath('valor_imobilizado', 250);
        $response->assertJsonPath('movimentacoes_hoje.entradas', 1);
        $response->assertJsonPath('movimentacoes_mes', 1);
        $response->assertJsonPath('valor_consumido_mes', 0);
        $this->assertCount(7, $response->json('fluxo_7_dias'));
        $this->assertCount(1, $response->json('saldo_por_unidade'));
        $this->assertCount(1, $response->json('saldos_atuais'));
        $this->assertCount(1, $response->json('feed_recente'));
    }

    public function test_dashboard_com_banco_vazio_nao_quebra(): void
    {
        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('itens_em_estoque', 0)
            ->assertJsonPath('valor_imobilizado', 0)
            ->assertJsonPath('abaixo_do_minimo', 0);
    }

    public function test_dashboard_agrupa_itens_solicitados_por_unidade(): void
    {
        $item = Item::factory()->create(['valor_unitario' => 10]);
        $unidadeA = Unidade::factory()->create();
        $unidadeB = Unidade::factory()->create();
        $service = app(MovimentacaoService::class);

        $service->registrarEntrada($item, $unidadeA, 50);
        $service->registrarEntrada($item, $unidadeB, 50);
        $service->registrarSaida($item, $unidadeA, 8);
        $service->registrarSaida($item, $unidadeB, 3);

        $response = $this->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJsonPath('valor_consumido_mes', 110)
            ->assertJsonPath('consumo_30_dias.itens.0.id', $item->id);

        $this->assertCount(2, $response->json('consumo_30_dias.series'));
        $this->assertSame([8, 3], collect($response->json('consumo_30_dias.series'))->pluck('quantidades.0')->sortDesc()->values()->all());
    }

    public function test_dashboard_filtra_metricas_pela_unidade_selecionada(): void
    {
        $item = Item::factory()->create(['estoque_minimo' => 50, 'valor_unitario' => 10]);
        $unidadeA = Unidade::factory()->create();
        $unidadeB = Unidade::factory()->create();
        $service = app(MovimentacaoService::class);

        $service->registrarEntrada($item, $unidadeA, 10);
        $service->registrarEntrada($item, $unidadeB, 30);

        $response = $this->getJson("/api/dashboard?unidade_id={$unidadeA->id}");

        $response->assertOk()
            ->assertJsonPath('itens_em_estoque', 10)
            ->assertJsonPath('skus_ativos', 1)
            ->assertJsonPath('movimentacoes_hoje.total', 1)
            ->assertJsonPath('abaixo_do_minimo', 1)
            ->assertJsonPath('valor_imobilizado', 100);

        $this->assertCount(1, $response->json('saldo_por_unidade'));
        $this->assertCount(1, $response->json('saldos_atuais'));
        $this->assertSame($unidadeA->id, $response->json('saldos_atuais.0.unidade_id'));
    }

    public function test_usuario_com_unidade_atribuida_nao_acessa_outra_unidade(): void
    {
        $unidadePermitida = Unidade::factory()->create();
        $unidadeBloqueada = Unidade::factory()->create();
        $this->usuario->unidades()->attach($unidadePermitida);

        $this->getJson("/api/dashboard?unidade_id={$unidadeBloqueada->id}")
            ->assertForbidden();
    }
}
