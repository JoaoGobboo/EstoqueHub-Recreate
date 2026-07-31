<?php

namespace Database\Seeders;

use App\Models\Unidade;
use Illuminate\Database\Seeder;

class UnidadeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $nomes = [
            'Central Administrativa',
            'Colégio Agua Verde',
            'Colégio Internacional',
            'Colégio Jardim Ambiental',
            'Colégio Junior',
            'Colégio Master',
            'Colégio Posiville',
            'Editora Aprende Brasil',
            'Posigraf',
            'Staff Educacional',
            'Colégio Santo Ivo I',
            'Colégio Hauer',
            'Colégio Santo Ivo II',
            'Colégio Vila Olímpia',
            'Curso Vicente Machado',
        ];

        foreach ($nomes as $nome) {
            Unidade::firstOrCreate(
                ['nome' => $nome],
                ['localizacao' => null, 'responsavel' => null],
            );
        }
    }
}
