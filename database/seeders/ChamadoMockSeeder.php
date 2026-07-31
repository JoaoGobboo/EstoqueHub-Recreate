<?php

namespace Database\Seeders;

use App\Models\ChamadoMock;
use App\Models\Item;
use App\Models\Unidade;
use Illuminate\Database\Seeder;

class ChamadoMockSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * "aberto" tickets are pending consumption — ChamadoMockConnector (Fase 2)
     * will process them into saida movements. "fechado" ones simulate tickets
     * already processed before this seed ran.
     */
    public function run(): void
    {
        $chamados = [
            ['numero_chamado' => 'CH-4450', 'sku' => 'CAB-HDMI-18', 'unidade' => 'Central Administrativa', 'qtd' => 4, 'status' => 'aberto'],
            ['numero_chamado' => 'CH-4451', 'sku' => 'MOU-USB-OPT', 'unidade' => 'Colégio Jardim Ambiental', 'qtd' => 3, 'status' => 'aberto'],
            ['numero_chamado' => 'CH-4452', 'sku' => 'RAM-DDR4-8GB', 'unidade' => 'Colégio Agua Verde', 'qtd' => 2, 'status' => 'aberto'],
            ['numero_chamado' => 'CH-4453', 'sku' => 'CAR-NB-65W', 'unidade' => 'Colégio Internacional', 'qtd' => 5, 'status' => 'aberto'],
            ['numero_chamado' => 'CH-4438', 'sku' => 'ADP-USBC-HDMI', 'unidade' => 'Central Administrativa', 'qtd' => 5, 'status' => 'fechado'],
            ['numero_chamado' => 'CH-4430', 'sku' => 'PEN-32GB', 'unidade' => 'Colégio Agua Verde', 'qtd' => 10, 'status' => 'fechado'],
            ['numero_chamado' => 'CH-4425', 'sku' => 'HEA-USB-MIC', 'unidade' => 'Colégio Jardim Ambiental', 'qtd' => 5, 'status' => 'fechado'],
            ['numero_chamado' => 'CH-4418', 'sku' => 'MOU-USB-OPT', 'unidade' => 'Central Administrativa', 'qtd' => 6, 'status' => 'fechado'],
        ];

        foreach ($chamados as $chamado) {
            ChamadoMock::create([
                'numero_chamado' => $chamado['numero_chamado'],
                'item_id' => Item::where('sku', $chamado['sku'])->value('id'),
                'unidade_id' => Unidade::where('nome', $chamado['unidade'])->value('id'),
                'quantidade_solicitada' => $chamado['qtd'],
                'status' => $chamado['status'],
            ]);
        }
    }
}
