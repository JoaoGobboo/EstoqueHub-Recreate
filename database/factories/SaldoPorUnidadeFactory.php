<?php

namespace Database\Factories;

use App\Models\Item;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SaldoPorUnidade>
 */
class SaldoPorUnidadeFactory extends Factory
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
            'unidade_id' => Unidade::factory(),
            'quantidade' => $this->faker->numberBetween(0, 200),
        ];
    }
}
