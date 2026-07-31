<?php

namespace Tests\Feature\Api;

use App\Models\Item;
use App\Models\Unidade;
use App\Services\MovimentacaoService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AnaliseConsumoApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_calcula_valor_adquirido_e_consumido_no_periodo(): void
    {
        $item = Item::factory()->create(['valor_unitario' => 10]);
        $unidade = Unidade::factory()->create();
        $service = app(MovimentacaoService::class);

        $service->registrarEntrada($item, $unidade, 100, 'Compra');
        $service->registrarSaida($item, $unidade, 30, 'Consumo');

        $response = $this->getJson('/api/analise-consumo');

        $response->assertOk()
            ->assertJsonPath('valor_adquirido', 1000)
            ->assertJsonPath('valor_consumido', 300)
            ->assertJsonPath('itens_mais_consumidos.0.quantidade', 30)
            ->assertJsonPath('itens_mais_consumidos.0.valor', 300);
    }

    public function test_filtra_por_unidade(): void
    {
        $item = Item::factory()->create(['valor_unitario' => 5]);
        $unidadeA = Unidade::factory()->create();
        $unidadeB = Unidade::factory()->create();
        $service = app(MovimentacaoService::class);

        $service->registrarEntrada($item, $unidadeA, 100);
        $service->registrarSaida($item, $unidadeA, 20);
        $service->registrarEntrada($item, $unidadeB, 100);
        $service->registrarSaida($item, $unidadeB, 50);

        $response = $this->getJson("/api/analise-consumo?unidade_id={$unidadeA->id}");

        $response->assertOk()->assertJsonPath('valor_consumido', 100); // 20 * 5
    }

    public function test_curva_abc_classifica_por_valor_acumulado(): void
    {
        // Valores (qtd fixa em 10): 1000, 500, 200, 100, 50 → total 1850.
        // Cumulativo: 54,1% | 81,1% | 91,9% | 97,3% | 100% → A={1}, B={2,3}, C={4,5}.
        $unidade = Unidade::factory()->create();
        $service = app(MovimentacaoService::class);

        foreach ([100, 50, 20, 10, 5] as $valorUnitario) {
            $item = Item::factory()->create(['valor_unitario' => $valorUnitario]);
            $service->registrarEntrada($item, $unidade, 10);
        }

        $response = $this->getJson('/api/analise-consumo');

        $response->assertOk();
        $classes = $response->json('curva_abc.classes');
        $this->assertSame(1, $classes['A']['skus']);
        $this->assertSame(2, $classes['B']['skus']);
        $this->assertSame(2, $classes['C']['skus']);
        $this->assertSame(5, $response->json('curva_abc.total_skus'));
        $this->assertSame(1850, $response->json('curva_abc.total_valor'));
    }

    public function test_data_invalida_retorna_422(): void
    {
        $response = $this->getJson('/api/analise-consumo?data_inicio=nao-e-uma-data');

        $response->assertStatus(422)->assertJsonValidationErrors(['data_inicio']);
    }
}
