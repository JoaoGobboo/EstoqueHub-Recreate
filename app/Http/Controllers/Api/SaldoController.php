<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SaldoPorUnidadeResource;
use App\Models\SaldoPorUnidade;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SaldoController extends Controller
{
    /**
     * Display a listing of the resource, filtrável por item e/ou unidade.
     */
    public function index(Request $request): JsonResource
    {
        $saldos = SaldoPorUnidade::query()
            ->with(['item', 'unidade'])
            ->when($request->filled('item_id'), fn ($query) => $query->where('item_id', $request->integer('item_id')))
            ->when($request->filled('unidade_id'), fn ($query) => $query->where('unidade_id', $request->integer('unidade_id')))
            ->get();

        return SaldoPorUnidadeResource::collection($saldos);
    }
}
