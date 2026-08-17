<?php

namespace Tests\Feature\Api;

use App\Models\ChamadoMock;
use App\Models\Item;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ChamadoApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_lista_chamados_filtrando_por_status(): void
    {
        $item = Item::factory()->create();
        $unidade = Unidade::factory()->create();
        ChamadoMock::factory()->create(['item_id' => $item->id, 'unidade_id' => $unidade->id, 'status' => 'aberto']);
        ChamadoMock::factory()->create(['item_id' => $item->id, 'unidade_id' => $unidade->id, 'status' => 'fechado']);

        $response = $this->getJson('/api/chamados?status=aberto');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_processar_chamados_pendentes_via_api(): void
    {
        $item = Item::factory()->create();
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $unidade->id, 'quantidade' => 100]);
        ChamadoMock::factory()->create([
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade_solicitada' => 10,
            'status' => 'aberto',
        ]);

        $response = $this->postJson('/api/chamados/processar');

        $response->assertOk()
            ->assertJsonPath('processados', 1)
            ->assertJsonPath('falhas', []);

        $this->assertSame(90, SaldoPorUnidade::where('item_id', $item->id)->value('quantidade'));
        $this->assertDatabaseHas('movimentacoes', [
            'item_id' => $item->id,
            'user_id' => $this->usuario->id,
            'tipo' => 'saida',
        ]);

        $this->postJson('/api/chamados/processar')
            ->assertOk()
            ->assertJsonPath('processados', 0)
            ->assertJsonPath('falhas', []);

        $this->assertSame(90, SaldoPorUnidade::where('item_id', $item->id)->value('quantidade'));
        $this->assertDatabaseCount('movimentacoes', 1);
    }

    public function test_mantem_chamado_aberto_se_o_saldo_for_insuficiente(): void
    {
        $item = Item::factory()->create();
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $unidade->id, 'quantidade' => 5]);
        ChamadoMock::factory()->create([
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade_solicitada' => 10,
            'status' => 'aberto',
        ]);

        $this->postJson('/api/chamados/processar')
            ->assertOk()
            ->assertJsonPath('processados', 0)
            ->assertJsonCount(1, 'falhas');

        $this->assertDatabaseHas('chamados_mock', ['status' => 'aberto']);
        $this->assertSame(5, SaldoPorUnidade::where('item_id', $item->id)->value('quantidade'));
        $this->assertDatabaseCount('movimentacoes', 0);
    }
}
