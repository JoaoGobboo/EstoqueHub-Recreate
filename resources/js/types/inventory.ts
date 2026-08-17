export type Item = {
    id: number;
    sku: string;
    nome: string;
};

export type ItemWithStock = Item & {
    estoque_minimo: number;
};

export type ItemWithCategory = Item & {
    categoria?: string | null;
};

export type Unidade = {
    id: number;
    nome: string;
};

export type RequisicaoCompra = {
    id: number;
    status: string;
};

export type Sugestao = {
    tipo: 'compra' | 'transferencia';
    item: ItemWithStock & { valor_unitario: number };
    unidade_origem: Unidade | null;
    unidade_destino: Unidade;
    quantidade: number;
    requisicao_compra: RequisicaoCompra | null;
};

export type Movimentacao = {
    id: number;
    tipo: 'entrada' | 'saida' | 'transferencia';
    quantidade: number;
    observacao: string | null;
    data_movimentacao: string;
    item: Item;
    unidade_origem: Unidade | null;
    unidade_destino: Unidade;
};

export type Saldo = {
    item_id: number;
    item: string;
    sku: string;
    unidade_id: number;
    unidade: string;
    quantidade: number;
    estoque_minimo: number;
};
