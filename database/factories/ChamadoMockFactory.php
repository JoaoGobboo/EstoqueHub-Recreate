<?php

namespace Database\Factories;

use App\Models\ChamadoMock;
use App\Models\Item;
use App\Models\Unidade;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ChamadoMock>
 */
class ChamadoMockFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'numero_chamado' => 'CH-'.$this->faker->unique()->numberBetween(1000, 999999),
            'item_id' => Item::factory(),
            'unidade_id' => Unidade::factory(),
            'quantidade_solicitada' => $this->faker->numberBetween(1, 20),
            'status' => 'aberto',
        ];
    }
}
