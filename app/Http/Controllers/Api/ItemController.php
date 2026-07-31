<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreItemRequest;
use App\Http\Requests\UpdateItemRequest;
use App\Http\Resources\ItemResource;
use App\Models\Item;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ItemController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $itens = Item::query()
            ->withSum('saldos', 'quantidade')
            ->when($request->filled('busca'), function ($query) use ($request) {
                $busca = $request->string('busca');
                $query->where(fn ($q) => $q->where('nome', 'like', "%{$busca}%")
                    ->orWhere('sku', 'like', "%{$busca}%"));
            })
            ->when($request->filled('categoria'), fn ($query) => $query->where('categoria', $request->string('categoria')))
            ->orderBy('nome')
            ->paginate($request->integer('per_page', 20));

        return ItemResource::collection($itens);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreItemRequest $request)
    {
        $item = DB::transaction(function () use ($request) {
            $item = Item::create($request->validated());
            $agora = now();
            $saldos = Unidade::pluck('id')->map(fn (int $unidadeId) => [
                'item_id' => $item->id,
                'unidade_id' => $unidadeId,
                'quantidade' => 0,
                'created_at' => $agora,
                'updated_at' => $agora,
            ])->all();

            if ($saldos !== []) {
                SaldoPorUnidade::insert($saldos);
            }

            return $item;
        });

        return (new ItemResource($item))->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Item $item)
    {
        $item->load(['saldos.unidade']);

        return new ItemResource($item);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateItemRequest $request, Item $item)
    {
        $item->update($request->validated());

        return new ItemResource($item);
    }
}
