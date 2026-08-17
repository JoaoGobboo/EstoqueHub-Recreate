export type SuggestionType = 'compra' | 'transferencia';

export type Suggestion = {
    tipo: SuggestionType;
    item: {
        id: number;
        sku: string;
        nome: string;
        valor_unitario: number;
        estoque_minimo: number;
    };
    unidade_origem: { id: number; nome: string } | null;
    unidade_destino: { id: number; nome: string };
    quantidade: number;
    requisicao_compra: { id: number; status: string } | null;
};

export type SuggestionPresentation = {
    description: string;
};
