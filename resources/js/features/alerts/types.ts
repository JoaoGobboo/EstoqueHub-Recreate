import type { LucideIcon } from 'lucide-react';
import type { Item, Unidade } from '@/types/inventory';

export type AlertItem = Item;
export type Unit = Unidade;

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
