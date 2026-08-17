import { Check, LoaderCircle } from 'lucide-react';
import type { AlertPresentation, StockAlert } from '@/features/alerts/types';

type Props = {
    actionError: string | null;
    alert: StockAlert;
    formatUpdatedAt: (value: string | null) => string;
    isResolving: boolean;
    onResolve: (alert: StockAlert) => Promise<void>;
    presentation: AlertPresentation;
};

export function AlertDetail({
    actionError,
    alert,
    formatUpdatedAt,
    isResolving,
    onResolve,
    presentation,
}: Props) {
    const Icon = presentation.icon;

    return (
        <div className="flex min-h-72 flex-col gap-4">
            <p className="text-[11px] font-bold tracking-wide text-[var(--dashboard-text-muted)]">
                ALERTA SELECIONADO
            </p>
            <div className="flex items-center gap-3">
                <Icon
                    className={`size-5 shrink-0 ${presentation.toneClass}`}
                    strokeWidth={1.8}
                />
                <h2 className="text-lg font-bold text-[var(--dashboard-text)]">
                    Abaixo do mínimo
                </h2>
            </div>
            <p className="text-xs leading-relaxed text-[var(--dashboard-text-muted)]">
                {alert.item.nome} está com saldo insuficiente na{' '}
                {alert.unidade.nome}.
            </p>
            <div className="h-px bg-[var(--dashboard-border-strong)]" />
            <dl className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-[var(--dashboard-text-muted)]">
                        Saldo atual
                    </dt>
                    <dd
                        className={`font-semibold tabular-nums ${presentation.toneClass}`}
                    >
                        {alert.quantidade} unidades
                    </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-[var(--dashboard-text-muted)]">
                        Mínimo configurado
                    </dt>
                    <dd className="font-semibold text-[var(--dashboard-text)] tabular-nums">
                        {alert.estoque_minimo} unidades
                    </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-[var(--dashboard-text-muted)]">
                        Última atualização
                    </dt>
                    <dd className="font-semibold text-[var(--dashboard-text-secondary)]">
                        {formatUpdatedAt(alert.updated_at)}
                    </dd>
                </div>
            </dl>
            {actionError ? (
                <p
                    role="alert"
                    className="rounded-md border border-[var(--dashboard-danger-border)] bg-[var(--dashboard-danger-bg)] px-3 py-2 text-xs text-[var(--dashboard-danger-text)]"
                >
                    {actionError}
                </p>
            ) : null}
            <button
                type="button"
                onClick={() => void onResolve(alert)}
                disabled={isResolving}
                className="mt-auto inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--dashboard-surface-muted)] px-4 text-xs font-bold text-[var(--dashboard-positive-text)] transition-colors hover:bg-[var(--dashboard-surface-active)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-positive-text)] focus-visible:outline-none"
            >
                {isResolving ? (
                    <LoaderCircle className="size-4 animate-spin" />
                ) : (
                    <Check className="size-4" />
                )}
                {isResolving ? 'Resolvendo...' : 'Marcar como resolvido'}
            </button>
        </div>
    );
}
