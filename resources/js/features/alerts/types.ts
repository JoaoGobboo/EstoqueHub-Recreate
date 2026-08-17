import type { LucideIcon } from 'lucide-react';

export type AlertItem = {
    id: number;
    nome: string;
    sku: string;
};

export type Unit = {
    id: number;
    nome: string;
};

export type StockAlert = {
    estoque_minimo: number;
    item: AlertItem;
    percentual: number;
    quantidade: number;
    severidade: 'Alto' | 'Crítico' | 'Médio';
    unidade: Unit;
    updated_at: string | null;
};

export type AlertPresentation = {
    badgeClass: string;
    description: string;
    icon: LucideIcon;
    label: string;
    tone: Exclude<'all' | 'attention' | 'critical' | 'informative', 'all'>;
    toneClass: string;
};
