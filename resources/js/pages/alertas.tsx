import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    Check,
    ChevronRight,
    CircleAlert,
    Info,
    LoaderCircle,
    RefreshCw,
    SlidersHorizontal,
    TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useDashboardScope } from '@/contexts/dashboard-scope-context';
import { AlertDetail } from '@/features/alerts/alert-detail';
import type { AlertPresentation, StockAlert } from '@/features/alerts/types';

type SeverityFilter = 'all' | 'attention' | 'critical' | 'informative';

type ApiError = {
    errors?: Record<string, string[]>;
    message?: string;
};

type SummaryCardProps = {
    detail: string;
    icon: LucideIcon;
    title: string;
    toneClass: string;
    value: number;
};

const filterOptions: Array<{ label: string; value: SeverityFilter }> = [
    { label: 'Todas as severidades', value: 'all' },
    { label: 'Críticas', value: 'critical' },
    { label: 'Atenção', value: 'attention' },
    { label: 'Informativas', value: 'informative' },
];

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
});

function alertKey(alert: StockAlert): string {
    return `${alert.item.id}:${alert.unidade.id}`;
}

function readCsrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}

function apiErrorMessage(body: ApiError | null): string {
    const validationMessage = body?.errors
        ? Object.values(body.errors).flat().at(0)
        : null;

    return (
        validationMessage ??
        body?.message ??
        'Não foi possível resolver o alerta.'
    );
}

function alertPresentation(alert: StockAlert): AlertPresentation {
    if (alert.severidade === 'Crítico') {
        return {
            badgeClass:
                'border-[var(--dashboard-danger-border)] bg-[var(--dashboard-danger-bg)] text-[var(--dashboard-danger-text)]',
            description: `O saldo atingiu ${alert.percentual}% do mínimo configurado.`,
            icon: CircleAlert,
            label: 'Crítico',
            tone: 'critical',
            toneClass: 'text-[var(--dashboard-danger-text)]',
        };
    }

    if (alert.severidade === 'Alto') {
        return {
            badgeClass:
                'border-[var(--dashboard-warning-border)] bg-[var(--dashboard-warning-bg)] text-[var(--dashboard-warning-text)]',
            description: `O saldo está em ${alert.percentual}% do mínimo configurado.`,
            icon: TriangleAlert,
            label: 'Atenção',
            tone: 'attention',
            toneClass: 'text-[var(--dashboard-warning-text)]',
        };
    }

    return {
        badgeClass:
            'border-[var(--dashboard-info-border)] bg-[var(--dashboard-info-bg)] text-[var(--dashboard-info-text)]',
        description: `O saldo está próximo do mínimo, com ${alert.percentual}% disponível.`,
        icon: Info,
        label: 'Informativo',
        tone: 'informative',
        toneClass: 'text-[var(--dashboard-info-text)]',
    };
}

function updatedAtLabel(value: string | null): string {
    if (!value) {
        return 'Agora';
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? 'Agora' : dateFormatter.format(date);
}

function SummaryCard({
    detail,
    icon: Icon,
    title,
    toneClass,
    value,
}: SummaryCardProps) {
    return (
        <article className="flex min-h-28 flex-col gap-1 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 sm:min-h-32 sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold text-[var(--dashboard-text-secondary)] sm:text-sm">
                    {title}
                </h2>
                <Icon className={`size-4 ${toneClass}`} strokeWidth={1.8} />
            </div>
            <strong
                className={`mt-auto text-2xl leading-none font-bold ${toneClass}`}
            >
                {value}
            </strong>
            <p className="text-xs text-[var(--dashboard-text-muted)]">
                {detail}
            </p>
        </article>
    );
}

function LoadingState() {
    return (
        <div className="flex min-h-72 items-center justify-center gap-3 text-sm text-[var(--dashboard-text-muted)]">
            <LoaderCircle className="size-5 animate-spin" />
            Carregando alertas...
        </div>
    );
}

export default function Alertas() {
    const { ready, selectedUnitId } = useDashboardScope();
    const [alerts, setAlerts] = useState<StockAlert[]>([]);
    const [filter, setFilter] = useState<SeverityFilter>('all');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResolving, setIsResolving] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!ready) {
            return;
        }

        const controller = new AbortController();

        fetch('/api/alertas', {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        'Não foi possível carregar os alertas de estoque.',
                    );
                }

                return response.json() as Promise<{ data: StockAlert[] }>;
            })
            .then(({ data }) => {
                setAlerts(data);
                setIsLoading(false);
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setLoadError(
                    error instanceof Error
                        ? error.message
                        : 'Falha ao carregar os alertas.',
                );
                setIsLoading(false);
            });

        return () => controller.abort();
    }, [ready, refreshKey]);

    const scopedAlerts = useMemo(
        () =>
            alerts.filter(
                (alert) =>
                    selectedUnitId === null ||
                    alert.unidade.id === selectedUnitId,
            ),
        [alerts, selectedUnitId],
    );

    const summary = useMemo(
        () => ({
            attention: scopedAlerts.filter(
                (alert) => alertPresentation(alert).tone === 'attention',
            ).length,
            critical: scopedAlerts.filter(
                (alert) => alertPresentation(alert).tone === 'critical',
            ).length,
            informative: scopedAlerts.filter(
                (alert) => alertPresentation(alert).tone === 'informative',
            ).length,
        }),
        [scopedAlerts],
    );

    const visibleAlerts = useMemo(
        () =>
            filter === 'all'
                ? scopedAlerts
                : scopedAlerts.filter(
                      (alert) => alertPresentation(alert).tone === filter,
                  ),
        [filter, scopedAlerts],
    );

    const selectedAlert =
        visibleAlerts.find((alert) => alertKey(alert) === selectedKey) ??
        visibleAlerts.at(0);

    const refreshAlerts = () => {
        setIsLoading(true);
        setLoadError(null);
        setActionError(null);
        setSelectedKey(null);
        setRefreshKey((value) => value + 1);
    };

    const resolveAlert = async (alert: StockAlert) => {
        setIsResolving(true);
        setActionError(null);

        try {
            const response = await fetch('/api/alertas/resolver', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': readCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    item_id: alert.item.id,
                    unidade_id: alert.unidade.id,
                }),
            });

            if (!response.ok) {
                const responseBody = (await response
                    .json()
                    .catch(() => null)) as ApiError | null;

                throw new Error(apiErrorMessage(responseBody));
            }

            toast.success('Alerta marcado como resolvido.', {
                position: 'top-right',
            });
            setSelectedKey(null);
            setIsLoading(true);
            setRefreshKey((value) => value + 1);
        } catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível resolver o alerta.',
            );
        } finally {
            setIsResolving(false);
        }
    };

    return (
        <>
            <Head title="Alertas" />

            <div className="min-h-full w-full min-w-0 bg-[var(--dashboard-canvas)] px-4 py-5 transition-colors sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto flex w-full max-w-[1120px] min-w-0 flex-col gap-6">
                    <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-col gap-1">
                            <h1 className="text-xl leading-tight font-bold text-[var(--dashboard-text)] sm:text-2xl lg:text-3xl">
                                Alertas de estoque
                            </h1>
                            <p className="text-xs text-[var(--dashboard-text-muted)] sm:text-sm">
                                Acompanhe exceções que exigem atenção da
                                operação.
                            </p>
                        </div>

                        <label className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] px-3 text-xs text-[var(--dashboard-text-secondary)]">
                            <SlidersHorizontal className="size-4" />
                            <span className="sr-only">Filtrar severidade</span>
                            <select
                                value={filter}
                                onChange={(event) => {
                                    setFilter(
                                        event.target.value as SeverityFilter,
                                    );
                                    setSelectedKey(null);
                                }}
                                className="cursor-pointer appearance-none bg-transparent pr-2 outline-none"
                            >
                                {filterOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </header>

                    <section
                        aria-label="Resumo dos alertas"
                        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                    >
                        <SummaryCard
                            title="Críticas"
                            value={summary.critical}
                            detail="ação imediata"
                            icon={CircleAlert}
                            toneClass="text-[var(--dashboard-danger-text)]"
                        />
                        <SummaryCard
                            title="Atenção"
                            value={summary.attention}
                            detail="acompanhar hoje"
                            icon={TriangleAlert}
                            toneClass="text-[var(--dashboard-warning-text)]"
                        />
                        <SummaryCard
                            title="Informativas"
                            value={summary.informative}
                            detail="sem bloqueio"
                            icon={Info}
                            toneClass="text-[var(--dashboard-info-text)]"
                        />
                    </section>

                    <section className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                        <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]">
                            <div className="flex min-h-14 items-center justify-between gap-4 px-4 sm:px-5">
                                <h2 className="text-sm font-bold text-[var(--dashboard-text)] sm:text-base">
                                    Alertas recentes
                                </h2>
                                <span className="text-xs text-[var(--dashboard-text-muted)]">
                                    {visibleAlerts.length}{' '}
                                    {visibleAlerts.length === 1
                                        ? 'alerta ativo'
                                        : 'alertas ativos'}
                                </span>
                            </div>

                            {isLoading ? (
                                <LoadingState />
                            ) : loadError ? (
                                <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 text-center">
                                    <AlertCircle className="size-8 text-[var(--dashboard-danger-text)]" />
                                    <p className="max-w-md text-sm text-[var(--dashboard-text-muted)]">
                                        {loadError}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={refreshAlerts}
                                        className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--dashboard-border-strong)] px-3 text-xs font-semibold text-[var(--dashboard-text-secondary)] transition-colors hover:bg-[var(--dashboard-surface-hover)]"
                                    >
                                        <RefreshCw className="size-4" />
                                        Tentar novamente
                                    </button>
                                </div>
                            ) : visibleAlerts.length === 0 ? (
                                <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
                                    <Check className="size-8 text-[var(--dashboard-positive-text)]" />
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--dashboard-text)]">
                                            Nenhum alerta ativo
                                        </p>
                                        <p className="mt-1 text-xs text-[var(--dashboard-text-muted)]">
                                            Não há alertas para este contexto e
                                            severidade.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {visibleAlerts.map((alert) => {
                                        const key = alertKey(alert);
                                        const presentation =
                                            alertPresentation(alert);
                                        const Icon = presentation.icon;
                                        const selected =
                                            key === alertKey(selectedAlert!);

                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedKey(key)
                                                }
                                                aria-pressed={selected}
                                                className={`flex min-h-24 w-full items-center gap-3 border-t border-[var(--dashboard-border)] px-4 text-left transition-colors sm:px-5 ${
                                                    selected
                                                        ? 'bg-[var(--dashboard-surface-active)]'
                                                        : 'hover:bg-[var(--dashboard-surface-hover)]'
                                                }`}
                                            >
                                                <Icon
                                                    className={`size-5 shrink-0 ${presentation.toneClass}`}
                                                    strokeWidth={1.8}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-[var(--dashboard-text-secondary)]">
                                                        {alert.item.nome} abaixo
                                                        do mínimo
                                                    </span>
                                                    <span className="mt-1 block truncate text-xs text-[var(--dashboard-text-muted)]">
                                                        {
                                                            presentation.description
                                                        }
                                                    </span>
                                                </span>
                                                <span className="hidden w-40 shrink-0 sm:block">
                                                    <span className="block truncate text-xs text-[var(--dashboard-text-secondary)]">
                                                        {alert.unidade.nome}
                                                    </span>
                                                    <span
                                                        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${presentation.badgeClass}`}
                                                    >
                                                        {presentation.label}
                                                    </span>
                                                </span>
                                                <ChevronRight className="size-4 shrink-0 text-[var(--dashboard-text-muted)]" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <aside className="rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5 xl:sticky xl:top-8">
                            {selectedAlert ? (
                                <AlertDetail
                                    alert={selectedAlert}
                                    actionError={actionError}
                                    formatUpdatedAt={updatedAtLabel}
                                    isResolving={isResolving}
                                    onResolve={resolveAlert}
                                    presentation={alertPresentation(
                                        selectedAlert,
                                    )}
                                />
                            ) : (
                                <div className="flex min-h-52 items-center justify-center text-center text-xs text-[var(--dashboard-text-muted)]">
                                    Selecione um alerta para ver os detalhes.
                                </div>
                            )}
                        </aside>
                    </section>
                </div>
            </div>
        </>
    );
}
