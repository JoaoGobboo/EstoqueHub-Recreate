<?php

namespace Database\Seeders;

use App\Models\Item;
use Illuminate\Database\Seeder;

class ItemSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $itens = [
            ['sku' => 'CAB-HDMI-18', 'nome' => 'Cabo HDMI 1.8m', 'categoria' => 'Cabos', 'descricao' => 'Cabo HDMI 2.0, 1.8 metros, conectores banhados a ouro.', 'valor_unitario' => 18.90, 'estoque_minimo' => 30],
            ['sku' => 'CAB-CAT6-2M', 'nome' => 'Cabo de rede Cat6 2m', 'categoria' => 'Cabos', 'descricao' => 'Cabo de rede Cat6 UTP, 2 metros, com conectores RJ45 crimpados.', 'valor_unitario' => 12.50, 'estoque_minimo' => 40],
            ['sku' => 'MOU-USB-OPT', 'nome' => 'Mouse óptico USB', 'categoria' => 'Periféricos', 'descricao' => 'Mouse óptico USB, 1000 DPI, 3 botões.', 'valor_unitario' => 24.90, 'estoque_minimo' => 25],
            ['sku' => 'TEC-ABNT2-USB', 'nome' => 'Teclado ABNT2 USB', 'categoria' => 'Periféricos', 'descricao' => 'Teclado padrão ABNT2, conexão USB.', 'valor_unitario' => 39.90, 'estoque_minimo' => 20],
            ['sku' => 'MON-LED-215', 'nome' => 'Monitor LED 21.5"', 'categoria' => 'Monitores', 'descricao' => 'Monitor LED 21.5 polegadas, Full HD, VGA/HDMI.', 'valor_unitario' => 649.00, 'estoque_minimo' => 8],
            ['sku' => 'NB-MASTER-N140I', 'nome' => 'Notebook Positivo Master N140i', 'categoria' => 'Notebooks', 'descricao' => 'Notebook corporativo Positivo Master, i5, 8GB, SSD 256GB.', 'valor_unitario' => 3299.00, 'estoque_minimo' => 5],
            ['sku' => 'CAR-NB-65W', 'nome' => 'Carregador notebook 65W', 'categoria' => 'Acessórios', 'descricao' => 'Carregador universal USB-C 65W para notebooks corporativos.', 'valor_unitario' => 89.90, 'estoque_minimo' => 15],
            ['sku' => 'HEA-USB-MIC', 'nome' => 'Headset USB com microfone', 'categoria' => 'Periféricos', 'descricao' => 'Headset USB estéreo com microfone com cancelamento de ruído.', 'valor_unitario' => 59.90, 'estoque_minimo' => 20],
            ['sku' => 'PEN-32GB', 'nome' => 'Pendrive 32GB', 'categoria' => 'Armazenamento', 'descricao' => 'Pendrive USB 3.0, 32GB.', 'valor_unitario' => 22.00, 'estoque_minimo' => 30],
            ['sku' => 'HDX-1TB', 'nome' => 'HD externo 1TB', 'categoria' => 'Armazenamento', 'descricao' => 'HD externo portátil USB 3.0, 1TB.', 'valor_unitario' => 219.00, 'estoque_minimo' => 10],
            ['sku' => 'RAM-DDR4-8GB', 'nome' => 'Memória RAM DDR4 8GB', 'categoria' => 'Peças', 'descricao' => 'Módulo de memória RAM DDR4 8GB 2666MHz.', 'valor_unitario' => 129.00, 'estoque_minimo' => 12],
            ['sku' => 'SSD-240GB', 'nome' => 'SSD 240GB SATA', 'categoria' => 'Armazenamento', 'descricao' => 'SSD SATA III 240GB para upgrade de notebooks e desktops.', 'valor_unitario' => 159.00, 'estoque_minimo' => 10],
            ['sku' => 'CAB-FORCA-3P', 'nome' => 'Cabo de força tripolar', 'categoria' => 'Cabos', 'descricao' => 'Cabo de força tripolar padrão NBR 14136, 1.5m.', 'valor_unitario' => 15.90, 'estoque_minimo' => 25],
            ['sku' => 'WEB-FHD', 'nome' => 'Webcam Full HD', 'categoria' => 'Periféricos', 'descricao' => 'Webcam USB Full HD 1080p com microfone integrado.', 'valor_unitario' => 149.00, 'estoque_minimo' => 10],
            ['sku' => 'ADP-USBC-HDMI', 'nome' => 'Adaptador USB-C para HDMI', 'categoria' => 'Acessórios', 'descricao' => 'Adaptador USB-C macho para HDMI fêmea, 4K.', 'valor_unitario' => 34.90, 'estoque_minimo' => 15],
        ];

        foreach ($itens as $item) {
            Item::create($item);
        }
    }
}
