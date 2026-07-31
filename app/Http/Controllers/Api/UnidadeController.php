<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUnidadeRequest;
use App\Http\Requests\UpdateUnidadeRequest;
use App\Http\Resources\UnidadeResource;
use App\Models\Item;
use App\Models\SaldoPorUnidade;
use App\Models\Unidade;
use App\Services\UnidadeAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UnidadeController extends Controller
{
    public function __construct(private readonly UnidadeAccessService $unidadeAccessService) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $unidadeIds = $this->unidadeAccessService->idsFor($request->user());

        return UnidadeResource::collection(
            Unidade::query()
                ->when($unidadeIds !== null, fn ($query) => $query->whereIn('id', $unidadeIds))
                ->orderBy('nome')
                ->get(),
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUnidadeRequest $request)
    {
        $unidade = DB::transaction(function () use ($request) {
            $unidade = Unidade::create($request->validated());
            $agora = now();
            $saldos = Item::pluck('id')->map(fn (int $itemId) => [
                'item_id' => $itemId,
                'unidade_id' => $unidade->id,
                'quantidade' => 0,
                'created_at' => $agora,
                'updated_at' => $agora,
            ])->all();

            if ($saldos !== []) {
                SaldoPorUnidade::insert($saldos);
            }

            return $unidade;
        });

        return (new UnidadeResource($unidade))->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Unidade $unidade)
    {
        return new UnidadeResource($unidade);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUnidadeRequest $request, Unidade $unidade)
    {
        $unidade->update($request->validated());

        return new UnidadeResource($unidade);
    }
}
