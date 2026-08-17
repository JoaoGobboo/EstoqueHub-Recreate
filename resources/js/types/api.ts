export type ApiError = {
    message?: string;
    errors?: Record<string, string[]>;
};

export type PaginationMeta = {
    current_page: number;
    from?: number | null;
    last_page: number;
    to?: number | null;
    per_page: number;
    total: number;
};

export type Paginated<T> = {
    data: T[];
    meta: PaginationMeta;
};

export type DashboardData = {
    itens_em_estoque: number;
    skus_ativos: number;
    movimentacoes_hoje: {
        total: number;
        entradas: number;
        saidas: number;
        transferencias: number;
    };
    movimentacoes_mes: number;
    valor_consumido_mes: number;
    abaixo_do_minimo: number;
    valor_imobilizado: number;
    consumo_30_dias: {
        itens: Array<{ id: number; nome: string; sku: string }>;
        series: Array<{ unidade: string; quantidades: number[] }>;
    };
    saldos_atuais: Array<{
        item_id: number;
        item: string;
        sku: string;
        unidade_id: number;
        unidade: string;
        quantidade: number;
        estoque_minimo: number;
    }>;
};
