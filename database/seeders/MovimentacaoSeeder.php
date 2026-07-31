<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\Movimentacao;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class MovimentacaoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $usuario = User::first();

        $movimentos = [
            ['sku' => 'NB-MASTER-N140I', 'tipo' => 'entrada', 'destino' => 'Colégio Agua Verde', 'qtd' => 10, 'motivo' => 'Compra - NF-e 5521', 'dias' => 9],
            ['sku' => 'MON-LED-215', 'tipo' => 'entrada', 'destino' => 'Central Administrativa', 'qtd' => 15, 'motivo' => 'Compra - NF-e 5522', 'dias' => 9],
            ['sku' => 'CAB-HDMI-18', 'tipo' => 'saida', 'origem' => 'Colégio Internacional', 'qtd' => 12, 'motivo' => 'Requisição interna - Chamado #4410', 'dias' => 8],
            ['sku' => 'RAM-DDR4-8GB', 'tipo' => 'transferencia', 'origem' => 'Colégio Agua Verde', 'destino' => 'Colégio Jardim Ambiental', 'qtd' => 8, 'motivo' => 'Rebalanceamento de estoque', 'dias' => 7],
            ['sku' => 'MOU-USB-OPT', 'tipo' => 'saida', 'origem' => 'Central Administrativa', 'qtd' => 6, 'motivo' => 'Requisição interna - Chamado #4418', 'dias' => 7],
            ['sku' => 'TEC-ABNT2-USB', 'tipo' => 'saida', 'origem' => 'Central Administrativa', 'qtd' => 4, 'motivo' => 'Requisição interna - Chamado #4418', 'dias' => 7],
            ['sku' => 'CAB-CAT6-2M', 'tipo' => 'entrada', 'destino' => 'Colégio Internacional', 'qtd' => 50, 'motivo' => 'Compra - NF-e 5530', 'dias' => 6],
            ['sku' => 'SSD-240GB', 'tipo' => 'transferencia', 'origem' => 'Central Administrativa', 'destino' => 'Colégio Internacional', 'qtd' => 6, 'motivo' => 'Suporte a upgrade de estações', 'dias' => 6],
            ['sku' => 'HEA-USB-MIC', 'tipo' => 'saida', 'origem' => 'Colégio Jardim Ambiental', 'qtd' => 5, 'motivo' => 'Requisição interna - Chamado #4425', 'dias' => 5],
            ['sku' => 'CAR-NB-65W', 'tipo' => 'entrada', 'destino' => 'Colégio Agua Verde', 'qtd' => 20, 'motivo' => 'Compra - NF-e 5541', 'dias' => 5],
            ['sku' => 'PEN-32GB', 'tipo' => 'saida', 'origem' => 'Colégio Agua Verde', 'qtd' => 10, 'motivo' => 'Requisição interna - Chamado #4430', 'dias' => 4],
            ['sku' => 'WEB-FHD', 'tipo' => 'entrada', 'destino' => 'Colégio Jardim Ambiental', 'qtd' => 8, 'motivo' => 'Compra - NF-e 5552', 'dias' => 4],
            ['sku' => 'NB-MASTER-N140I', 'tipo' => 'transferencia', 'origem' => 'Colégio Agua Verde', 'destino' => 'Colégio Jardim Ambiental', 'qtd' => 2, 'motivo' => 'Atendimento a chamado crítico', 'dias' => 3],
            ['sku' => 'ADP-USBC-HDMI', 'tipo' => 'saida', 'origem' => 'Central Administrativa', 'qtd' => 5, 'motivo' => 'Requisição interna - Chamado #4438', 'dias' => 3],
            ['sku' => 'HDX-1TB', 'tipo' => 'entrada', 'destino' => 'Colégio Internacional', 'qtd' => 6, 'motivo' => 'Compra - NF-e 5560', 'dias' => 2],
            ['sku' => 'CAB-FORCA-3P', 'tipo' => 'saida', 'origem' => 'Colégio Internacional', 'qtd' => 10, 'motivo' => 'Requisição interna - Chamado #4445', 'dias' => 1],
            ['sku' => 'MON-LED-215', 'tipo' => 'transferencia', 'origem' => 'Central Administrativa', 'destino' => 'Colégio Internacional', 'qtd' => 3, 'motivo' => 'Reposição emergencial', 'dias' => 1],
            ['sku' => 'MOU-USB-OPT', 'tipo' => 'entrada', 'destino' => 'Colégio Jardim Ambiental', 'qtd' => 15, 'motivo' => 'Compra - NF-e 5571', 'dias' => 0],
        ];

        foreach ($movimentos as $mov) {
            $item = Item::where('sku', $mov['sku'])->firstOrFail();
            $timestamp = Carbon::now()->subDays($mov['dias']);

            Movimentacao::create([
                'item_id' => $item->id,
                'unidade_origem_id' => isset($mov['origem'])
                    ? Unidade::where('nome', $mov['origem'])->value('id')
                    : null,
                'unidade_destino_id' => isset($mov['destino'])
                    ? Unidade::where('nome', $mov['destino'])->value('id')
                    : null,
                'tipo' => $mov['tipo'],
                'quantidade' => $mov['qtd'],
                'motivo' => $mov['motivo'],
                'user_id' => $usuario?->id,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ]);
        }
    }
}
