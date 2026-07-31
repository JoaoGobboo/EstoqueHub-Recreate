<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const UNIDADES = [
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

    private const UNIDADES_LEGADAS = [
        'Curitiba - Suporte' => 'Central Administrativa',
        'Curitiba - TI Corporativo' => 'Colégio Agua Verde',
        'Manaus - Fábrica' => 'Colégio Internacional',
        'São Paulo - Filial' => 'Colégio Jardim Ambiental',
    ];

    public function up(): void
    {
        DB::transaction(function (): void {
            $temUnidadeLegada = DB::table('unidades')
                ->whereIn('nome', array_keys(self::UNIDADES_LEGADAS))
                ->exists();

            if (! $temUnidadeLegada) {
                return;
            }

            foreach (self::UNIDADES_LEGADAS as $nomeAntigo => $nomeNovo) {
                DB::table('unidades')
                    ->where('nome', $nomeAntigo)
                    ->update([
                        'nome' => $nomeNovo,
                        'localizacao' => null,
                        'responsavel' => null,
                        'updated_at' => now(),
                    ]);
            }

            foreach (self::UNIDADES as $nome) {
                if (DB::table('unidades')->where('nome', $nome)->exists()) {
                    continue;
                }

                DB::table('unidades')->insert([
                    'nome' => $nome,
                    'localizacao' => null,
                    'responsavel' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $agora = now();
            $unidadeIds = DB::table('unidades')->whereIn('nome', self::UNIDADES)->pluck('id');
            $itemIds = DB::table('itens')->pluck('id');

            foreach ($unidadeIds as $unidadeId) {
                foreach ($itemIds as $itemId) {
                    DB::table('saldos_por_unidade')->insertOrIgnore([
                        'item_id' => $itemId,
                        'unidade_id' => $unidadeId,
                        'quantidade' => 0,
                        'created_at' => $agora,
                        'updated_at' => $agora,
                    ]);
                }
            }
        });
    }

    public function down(): void
    {
        // A reversão não remove unidades para evitar perda de estoque e histórico.
    }
};
