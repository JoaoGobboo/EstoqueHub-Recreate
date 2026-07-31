<?php

namespace Database\Factories;

use App\Models\Item;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Item>
 */
class ItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sku' => strtoupper($this->faker->unique()->bothify('???-####')),
            'nome' => $this->faker->words(3, true),
            'categoria' => $this->faker->randomElement(['Cabos', 'Periféricos', 'Monitores', 'Notebooks', 'Acessórios', 'Armazenamento', 'Peças']),
            'descricao' => $this->faker->sentence(),
            'valor_unitario' => $this->faker->randomFloat(2, 5, 3500),
            'estoque_minimo' => $this->faker->numberBetween(5, 50),
        ];
    }
}
