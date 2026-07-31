<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class AprovarTransferenciaRequest extends FormRequest
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
            'item_id' => ['required', 'integer', 'exists:itens,id'],
            'unidade_origem_id' => ['required', 'integer', 'exists:unidades,id'],
            'unidade_destino_id' => ['required', 'integer', 'exists:unidades,id', 'different:unidade_origem_id'],
            'quantidade' => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'unidade_destino_id.different' => 'Origem e destino não podem ser a mesma unidade.',
        ];
    }
}
