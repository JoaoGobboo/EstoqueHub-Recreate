<?php

namespace Tests\Feature\Api;

use App\Models\Item;
use App\Models\Unidade;
use Illuminate\Foundation\Testing\RefreshDatabase;

class UnidadeApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_lista_unidades(): void
    {
        Unidade::factory()->count(3)->create();

        $response = $this->getJson('/api/unidades');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    public function test_cria_unidade(): void
    {
        $response = $this->postJson('/api/unidades', [
            'nome' => 'Recife - Filial',
            'localizacao' => 'Recife, PE',
            'responsavel' => 'Ana Souza',
        ]);

        $response->assertCreated()->assertJsonPath('data.nome', 'Recife - Filial');
    }

    public function test_cria_saldo_zero_para_todos_os_itens_ao_cadastrar_unidade(): void
    {
        $itens = Item::factory()->count(2)->create();

        $unidadeId = $this->postJson('/api/unidades', [
            'nome' => 'Brasília - Filial',
        ])->assertCreated()->json('data.id');

        foreach ($itens as $item) {
            $this->assertDatabaseHas('saldos_por_unidade', [
                'item_id' => $item->id,
                'unidade_id' => $unidadeId,
                'quantidade' => 0,
            ]);
        }
    }

    public function test_criar_unidade_sem_nome_retorna_422(): void
    {
        $response = $this->postJson('/api/unidades', ['localizacao' => 'Recife, PE']);

        $response->assertStatus(422)->assertJsonValidationErrors(['nome']);
    }

    public function test_atualiza_unidade(): void
    {
        $unidade = Unidade::factory()->create(['responsavel' => 'Fulano']);

        $response = $this->putJson("/api/unidades/{$unidade->id}", ['responsavel' => 'Ciclano']);

        $response->assertOk()->assertJsonPath('data.responsavel', 'Ciclano');
    }
}
