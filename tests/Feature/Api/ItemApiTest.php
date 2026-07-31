<?php

namespace Tests\Feature\Api;

use App\Models\Item;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ItemApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_lista_itens_com_saldo_total(): void
    {
        $item = Item::factory()->create();
        $u1 = Unidade::factory()->create();
        $u2 = Unidade::factory()->create();
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $u1->id, 'quantidade' => 30]);
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $u2->id, 'quantidade' => 20]);

        $response = $this->getJson('/api/itens');

        $response->assertOk();
        $found = collect($response->json('data'))->firstWhere('id', $item->id);
        $this->assertSame(50, $found['saldo_total']);
    }

    public function test_cria_item(): void
    {
        $response = $this->postJson('/api/itens', [
            'sku' => 'TST-0001',
            'nome' => 'Item de teste',
            'categoria' => 'Cabos',
            'valor_unitario' => 10.5,
            'estoque_minimo' => 5,
        ]);

        $response->assertCreated()->assertJsonPath('data.sku', 'TST-0001');
        $this->assertDatabaseHas('itens', ['sku' => 'TST-0001']);
    }

    public function test_cria_saldo_zero_em_todas_as_unidades_ao_cadastrar_item(): void
    {
        $unidades = Unidade::factory()->count(2)->create();

        $itemId = $this->postJson('/api/itens', [
            'sku' => 'TST-0002',
            'nome' => 'Item com saldos iniciais',
            'valor_unitario' => 10,
            'estoque_minimo' => 5,
        ])->assertCreated()->json('data.id');

        foreach ($unidades as $unidade) {
            $this->assertDatabaseHas('saldos_por_unidade', [
                'item_id' => $itemId,
                'unidade_id' => $unidade->id,
                'quantidade' => 0,
            ]);
        }
    }

    public function test_cria_item_com_sku_duplicado_retorna_422(): void
    {
        Item::factory()->create(['sku' => 'DUP-0001']);

        $response = $this->postJson('/api/itens', [
            'sku' => 'DUP-0001',
            'nome' => 'Outro item',
            'valor_unitario' => 1,
            'estoque_minimo' => 1,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['sku']);
    }

    public function test_atualiza_item(): void
    {
        $item = Item::factory()->create(['nome' => 'Nome antigo']);

        $response = $this->putJson("/api/itens/{$item->id}", ['nome' => 'Nome novo']);

        $response->assertOk()->assertJsonPath('data.nome', 'Nome novo');
    }

    public function test_mostra_item_com_saldos_por_unidade(): void
    {
        $item = Item::factory()->create();
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $unidade->id, 'quantidade' => 12]);

        $response = $this->getJson("/api/itens/{$item->id}");

        $response->assertOk();
        $this->assertCount(1, $response->json('data.saldos'));
        $this->assertSame(12, $response->json('data.saldos.0.quantidade'));
    }
}
