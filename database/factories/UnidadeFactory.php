<?php

namespace Database\Factories;

use App\Models\Unidade;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unidade>
 */
class UnidadeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nome' => $this->faker->unique()->city().' - '.$this->faker->randomElement(['Suporte', 'TI Corporativo', 'Fábrica', 'Filial']),
            'localizacao' => $this->faker->city().', '.$this->faker->randomElement(['SP', 'PR', 'RS', 'MG']),
            'responsavel' => $this->faker->name(),
        ];
    }
}
