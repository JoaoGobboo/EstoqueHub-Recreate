<?php

namespace Tests\Feature\Api;

use App\Models\Item;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use Illuminate\Foundation\Testing\RefreshDatabase;

class MovimentacaoApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_registra_entrada_via_api(): void
    {
        $item = Item::factory()->create();
        $unidade = Unidade::factory()->create();

        $response = $this->postJson('/api/movimentacoes', [
            'tipo' => 'entrada',
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 50,
            'motivo' => 'Compra - NF-e 1',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.tipo', 'entrada')
            ->assertJsonPath('data.quantidade', 50)
            ->assertJsonPath('data.usuario', $this->usuario->name);

        $this->assertSame(50, SaldoPorUnidade::where('item_id', $item->id)->where('unidade_id', $unidade->id)->value('quantidade'));
        $this->assertDatabaseHas('movimentacoes', ['user_id' => $this->usuario->id]);
    }

    public function test_registra_transferencia_via_api(): void
    {
        $item = Item::factory()->create();
        $origem = Unidade::factory()->create();
        $destino = Unidade::factory()->create();
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $origem->id, 'quantidade' => 100]);

        $response = $this->postJson('/api/movimentacoes', [
            'tipo' => 'transferencia',
            'item_id' => $item->id,
            'unidade_origem_id' => $origem->id,
            'unidade_destino_id' => $destino->id,
            'quantidade' => 30,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.unidade_origem.id', $origem->id)
            ->assertJsonPath('data.unidade_destino.id', $destino->id);
    }

    public function test_saida_com_saldo_insuficiente_retorna_422_com_mensagem(): void
    {
        $item = Item::factory()->create();
        $unidade = Unidade::factory()->create();
        SaldoPorUnidade::create(['item_id' => $item->id, 'unidade_id' => $unidade->id, 'quantidade' => 5]);

        $response = $this->postJson('/api/movimentacoes', [
            'tipo' => 'saida',
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 999,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', fn (string $msg) => str_contains($msg, 'Saldo insuficiente'));

        $this->assertSame(5, SaldoPorUnidade::where('item_id', $item->id)->value('quantidade'));
    }

    public function test_transferencia_com_origem_igual_destino_retorna_422_de_validacao(): void
    {
        $item = Item::factory()->create();
        $unidade = Unidade::factory()->create();

        $response = $this->postJson('/api/movimentacoes', [
            'tipo' => 'transferencia',
            'item_id' => $item->id,
            'unidade_origem_id' => $unidade->id,
            'unidade_destino_id' => $unidade->id,
            'quantidade' => 10,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['unidade_destino_id']);
    }

    public function test_quantidade_invalida_retorna_422_de_validacao(): void
    {
        $item = Item::factory()->create();
        $unidade = Unidade::factory()->create();

        $response = $this->postJson('/api/movimentacoes', [
            'tipo' => 'entrada',
            'item_id' => $item->id,
            'unidade_id' => $unidade->id,
            'quantidade' => 0,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['quantidade']);
    }

    public function test_item_inexistente_retorna_422_de_validacao(): void
    {
        $unidade = Unidade::factory()->create();

        $response = $this->postJson('/api/movimentacoes', [
            'tipo' => 'entrada',
            'item_id' => 99999,
            'unidade_id' => $unidade->id,
            'quantidade' => 10,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['item_id']);
    }

    public function test_entrada_sem_unidade_id_retorna_422_de_validacao(): void
    {
        $item = Item::factory()->create();

        $response = $this->postJson('/api/movimentacoes', [
            'tipo' => 'entrada',
            'item_id' => $item->id,
            'quantidade' => 10,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['unidade_id']);
    }

    public function test_lista_movimentacoes_com_filtro_por_tipo(): void
    {
        $item = Item::factory()->create();
        $unidade = Unidade::factory()->create();

        $this->postJson('/api/movimentacoes', [
            'tipo' => 'entrada', 'item_id' => $item->id, 'unidade_id' => $unidade->id, 'quantidade' => 10,
        ])->assertCreated();

        SaldoPorUnidade::where('item_id', $item->id)->update(['quantidade' => 100]);

        $this->postJson('/api/movimentacoes', [
            'tipo' => 'saida', 'item_id' => $item->id, 'unidade_id' => $unidade->id, 'quantidade' => 5,
        ])->assertCreated();

        $response = $this->getJson('/api/movimentacoes?tipo=saida');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('saida', $response->json('data.0.tipo'));
    }

    public function test_lista_movimentacoes_com_busca_por_item_unidade_ou_documento(): void
    {
        $itemEncontrado = Item::factory()->create([
            'nome' => 'Projetor Epson',
            'sku' => 'PROJ-001',
        ]);
        $itemIgnorado = Item::factory()->create([
            'nome' => 'Cadeira escolar',
            'sku' => 'CAD-002',
        ]);
        $unidadeEncontrada = Unidade::factory()->create([
            'nome' => 'Colégio Jardim',
        ]);
        $unidadeIgnorada = Unidade::factory()->create([
            'nome' => 'Colégio Centro',
        ]);

        $this->postJson('/api/movimentacoes', [
            'tipo' => 'entrada',
            'item_id' => $itemEncontrado->id,
            'unidade_id' => $unidadeEncontrada->id,
            'quantidade' => 10,
            'motivo' => 'NF-e 7788',
        ])->assertCreated();

        $this->postJson('/api/movimentacoes', [
            'tipo' => 'entrada',
            'item_id' => $itemIgnorado->id,
            'unidade_id' => $unidadeIgnorada->id,
            'quantidade' => 5,
            'motivo' => 'Inventário inicial',
        ])->assertCreated();

        foreach (['Projetor', 'PROJ-001', 'Jardim', '7788'] as $busca) {
            $response = $this->getJson('/api/movimentacoes?busca='.urlencode($busca));

            $response->assertOk();
            $this->assertCount(1, $response->json('data'));
            $this->assertSame(
                $itemEncontrado->id,
                $response->json('data.0.item.id'),
            );
        }
    }
}
