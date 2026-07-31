<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\RequisicaoCompra;
use App\Models\Unidade;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RequisicaoCompra>
 */
class RequisicaoCompraFactory extends Factory
{
    public function definition(): array
    {
        return [
            'item_id' => Item::factory(),
            'unidade_id' => Unidade::factory(),
            'quantidade' => fake()->numberBetween(1, 50),
            'status' => 'pendente',
            'motivo' => 'Reposição de estoque mínimo',
            'user_id' => null,
        ];
    }
}
