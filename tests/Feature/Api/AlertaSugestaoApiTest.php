<?php

namespace Tests\Feature\Api;

use App\Models\Item;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AlertaSugestaoApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_lista_alertas_com_severidade(): void
    {
        $item = Item::factory()->create(['estoque_minimo' => 100]);
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $unidade->id, 'quantidade' => 20]); // 20%

        $response = $this->getJson('/api/alertas');

        $response->assertOk();
        $this->assertSame('Crítico', $response->json('data.0.severidade'));
        $this->assertSame(20, $response->json('data.0.percentual'));
    }

    public function test_lista_sugestoes_de_transferencia(): void
    {
        $item = Item::factory()->create(['estoque_minimo' => 50]);
        $comExcedente = Unidade::factory()->create();
        $comDeficit = Unidade::factory()->create();
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $comExcedente->id, 'quantidade' => 200]);
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $comDeficit->id, 'quantidade' => 10]);

        $response = $this->getJson('/api/sugestoes');

        $response->assertOk()->assertJsonPath('data.0.tipo', 'transferencia');
    }

    public function test_aprovar_transferencia_executa_movimentacao_real(): void
    {
        $item = Item::factory()->create();
        $origem = Unidade::factory()->create();
        $destino = Unidade::factory()->create();
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $origem->id, 'quantidade' => 100]);

        $response = $this->postJson('/api/sugestoes/aprovar-transferencia', [
            'item_id' => $item->id,
            'unidade_origem_id' => $origem->id,
            'unidade_destino_id' => $destino->id,
            'quantidade' => 40,
        ]);

        $response->assertCreated()->assertJsonPath('data.tipo', 'transferencia');
        $this->assertSame(60, SaldoPorUnidade::where('unidade_id', $origem->id)->value('quantidade'));
        $this->assertSame(40, SaldoPorUnidade::where('unidade_id', $destino->id)->value('quantidade'));
    }

    public function test_aprovar_transferencia_com_origem_igual_destino_retorna_422(): void
    {
        $item = Item::factory()->create();
        $unidade = Unidade::factory()->create();

        $response = $this->postJson('/api/sugestoes/aprovar-transferencia', [
            'item_id' => $item->id,
            'unidade_origem_id' => $unidade->id,
            'unidade_destino_id' => $unidade->id,
            'quantidade' => 10,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['unidade_destino_id']);
    }

    public function test_sugestao_de_compra_informa_requisicao_pendente(): void
    {
        $item = Item::factory()->create(['estoque_minimo' => 50]);
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create([
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 10,
        ]);

        $requisicao = $this->postJson('/api/requisicoes-compra', [
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 40,
        ])->assertCreated()->json('data');

        $this->getJson('/api/sugestoes')
            ->assertOk()
            ->assertJsonPath('data.0.tipo', 'compra')
            ->assertJsonPath('data.0.requisicao_compra.id', $requisicao['id']);
    }
}
