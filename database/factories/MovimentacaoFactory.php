<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\Movimentacao;
use App\Models\Unidade;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Movimentacao>
 */
class MovimentacaoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'item_id' => Item::factory(),
            'unidade_origem_id' => null,
            'unidade_destino_id' => Unidade::factory(),
            'tipo' => 'entrada',
            'quantidade' => $this->faker->numberBetween(1, 100),
            'motivo' => $this->faker->sentence(4),
            'user_id' => null,
        ];
    }
}
