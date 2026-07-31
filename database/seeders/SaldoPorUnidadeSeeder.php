<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use Illuminate\Database\Seeder;

class SaldoPorUnidadeSeeder extends Seeder
{
    /**
     * Base stock multiplier (applied to estoque_minimo) per unidade, keyed by nome.
     * Colégio Internacional and Colégio Jardim Ambiental run leaner to produce realistic
     * below-minimum cases for the Alertas/Sugestões screens.
     */
    private const MULTIPLICADOR_BASE = [
        'Central Administrativa' => 3.2,
        'Colégio Agua Verde' => 2.4,
        'Colégio Internacional' => 1.1,
        'Colégio Jardim Ambiental' => 0.9,
    ];

    /**
     * Explicit overrides (sku => [unidade => multiplicador]) for items that
     * need to land below their estoque_minimo to seed a believable alert.
     */
    private const OVERRIDES = [
        'CAB-HDMI-18' => ['Colégio Internacional' => 0.4],
        'NB-MASTER-N140I' => ['Colégio Jardim Ambiental' => 0.2],
        'MON-LED-215' => ['Colégio Internacional' => 0.5],
        'RAM-DDR4-8GB' => ['Colégio Jardim Ambiental' => 0.6],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $itens = Item::all();
        $unidades = Unidade::all();

        foreach ($itens as $item) {
            foreach ($unidades as $unidade) {
                $multiplicador = self::OVERRIDES[$item->sku][$unidade->nome]
                    ?? self::MULTIPLICADOR_BASE[$unidade->nome]
                    ?? 1.5;

                $quantidade = (int) round($item->estoque_minimo * $multiplicador);

                SaldoPorUnidade::create([
                    'item_id' => $item->id,
                    'unidade_id' => $unidade->id,
                    'quantidade' => max($quantidade, 0),
                ]);
            }
        }
    }
}
