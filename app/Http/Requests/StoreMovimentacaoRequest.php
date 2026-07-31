<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreMovimentacaoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'tipo' => ['required', 'string', 'in:entrada,saida,transferencia'],
            'item_id' => ['required', 'integer', 'exists:itens,id'],
            'quantidade' => ['required', 'integer', 'min:1'],
            'motivo' => ['nullable', 'string', 'max:255'],

            // entrada/saida: unidade única envolvida
            'unidade_id' => ['required_if:tipo,entrada,saida', 'integer', 'exists:unidades,id'],

            // transferencia: origem e destino distintos
            'unidade_origem_id' => ['required_if:tipo,transferencia', 'integer', 'exists:unidades,id'],
            'unidade_destino_id' => ['required_if:tipo,transferencia', 'integer', 'exists:unidades,id', 'different:unidade_origem_id'],
        ];
    }

    public function messages(): array
    {
        return [
            'unidade_destino_id.different' => 'Origem e destino não podem ser a mesma unidade.',
        ];
    }
}
