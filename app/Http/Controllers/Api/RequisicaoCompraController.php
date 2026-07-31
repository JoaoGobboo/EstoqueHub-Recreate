<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRequisicaoCompraRequest;
use App\Http\Resources\RequisicaoCompraResource;
use App\Models\Item;
use App\Models\RequisicaoCompra;
use App\Models\SaldoPorUnidade;
use App\Services\Microsoft\PlannerTaskService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class RequisicaoCompraController extends Controller
{
    public function index(Request $request)
    {
        $requisicoes = RequisicaoCompra::query()
            ->with(['item', 'unidade', 'usuario'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->paginate($request->integer('per_page', 20));

        return RequisicaoCompraResource::collection($requisicoes);
    }

    public function store(StoreRequisicaoCompraRequest $request, PlannerTaskService $planner)
    {
        $dados = $request->validated();
        $item = Item::findOrFail($dados['item_id']);
        $saldo = (int) (SaldoPorUnidade::where('item_id', $item->id)
            ->where('unidade_id', $dados['unidade_id'])
            ->value('quantidade') ?? 0);

        if ($saldo >= $item->estoque_minimo) {
            throw ValidationException::withMessages([
                'item_id' => 'O item não está abaixo do estoque mínimo nesta unidade.',
            ]);
        }

        $jaExiste = RequisicaoCompra::where('item_id', $item->id)
            ->where('unidade_id', $dados['unidade_id'])
            ->where('status', 'pendente')
            ->exists();

        if ($jaExiste) {
            throw ValidationException::withMessages([
                'item_id' => 'Já existe uma requisição de compra pendente para este item e unidade.',
            ]);
        }

        $requisicao = RequisicaoCompra::create([
            ...$dados,
            'status' => 'pendente',
            'motivo' => $dados['motivo'] ?? 'Reposição de estoque mínimo',
            'user_id' => $request->user()?->id,
        ]);

        $requisicao->load(['item', 'unidade', 'usuario']);

        $planner->sincronizar($requisicao);
        $requisicao->refresh();

        return (new RequisicaoCompraResource($requisicao))->response()->setStatusCode(201);
    }
}
