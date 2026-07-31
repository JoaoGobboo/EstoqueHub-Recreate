<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateItemRequest extends FormRequest
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
            'sku' => ['sometimes', 'string', 'max:50', Rule::unique('itens', 'sku')->ignore($this->route('item'))],
            'nome' => ['sometimes', 'string', 'max:255'],
            'categoria' => ['nullable', 'string', 'max:100'],
            'descricao' => ['nullable', 'string'],
            'valor_unitario' => ['sometimes', 'numeric', 'min:0'],
            'estoque_minimo' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
