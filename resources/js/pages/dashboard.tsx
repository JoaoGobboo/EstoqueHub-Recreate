import { Head } from '@inertiajs/react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardMovementDialog } from '@/components/dashboard-movement-dialog';
import { useDashboardScope } from '@/contexts/dashboard-scope-context';
import {
    DashboardChartLegendSkeleton,
    DashboardChartSkeleton,
    DashboardSkeleton,
    DashboardTableSkeleton,
    MetricCard,
} from '@/features/dashboard/dashboard-placeholders';
import type { Metric } from '@/features/dashboard/dashboard-placeholders';
import { dashboard } from '@/routes';

type DashboardData = {
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
        itens: Array<{
            id: number;
            nome: string;
            sku: string;
        }>;
        series: Array<{
            unidade: string;
            quantidades: number[];
        }>;
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

type DashboardSnapshot = {
    scopeKey: string;
    data: DashboardData;
    updatedAt: Date;
};

type DashboardRequestError = {
    scopeKey: string;
    message: string;
};

const numberFormatter = new Intl.NumberFormat('pt-BR');
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});
const seriesColors = ['#38bdf8', '#22c55e', '#a78bfa', '#f59e0b', '#fb7185'];
const minimumLoadingDuration = 450;

export default function Dashboard() {
    const { selectedUnitId, scopeName, ready } = useDashboardScope();
    const scopeKey =
        selectedUnitId === null ? 'group' : `unit:${selectedUnitId}`;
    const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
    const [requestError, setRequestError] =
        useState<DashboardRequestError | null>(null);
    const [filter, setFilter] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [movementDialogOpen, setMovementDialogOpen] = useState(false);
    const [movementDialogSession, setMovementDialogSession] = useState(0);
    const activeSnapshot = snapshot?.scopeKey === scopeKey ? snapshot : null;
    const error =
        requestError?.scopeKey === scopeKey ? requestError.message : null;
    const isDashboardLoading = !ready || (!activeSnapshot && !error);
    const data =
        activeSnapshot?.data ??
        (isDashboardLoading ? (snapshot?.data ?? null) : null);
    const updatedAt =
        activeSnapshot?.updatedAt ??
        (isDashboardLoading ? (snapshot?.updatedAt ?? null) : null);

    useEffect(() => {
        if (!ready) {
            return;
        }

        const controller = new AbortController();
        const loadingStartedAt = performance.now();
        const query =
            selectedUnitId === null ? '' : `?unidade_id=${selectedUnitId}`;

        fetch(`/api/dashboard${query}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        'N\u00e3o foi poss\u00edvel carregar os dados do dashboard.',
                    );
                }

                return response.json() as Promise<DashboardData>;
            })
            .then(async (dashboardData) => {
                const remainingLoadingTime = Math.max(
                    0,
                    minimumLoadingDuration -
                        (performance.now() - loadingStartedAt),
                );

                if (remainingLoadingTime > 0) {
                    await new Promise((resolve) =>
                        window.setTimeout(resolve, remainingLoadingTime),
                    );
                }

                if (controller.signal.aborted) {
                    return;
                }

                setSnapshot({
                    scopeKey,
                    data: dashboardData,
                    updatedAt: new Date(),
                });
                setRequestError((currentError) =>
                    currentError?.scopeKey === scopeKey ? null : currentError,
                );
            })
            .catch((requestError: unknown) => {
                if (
                    requestError instanceof DOMException &&
                    requestError.name === 'AbortError'
                ) {
                    return;
                }

                setRequestError({
                    scopeKey,
                    message:
                        requestError instanceof Error
                            ? requestError.message
                            : 'Falha ao carregar o dashboard.',
                });
            });

        return () => controller.abort();
    }, [ready, refreshKey, scopeKey, selectedUnitId]);

    const metrics = useMemo<Metric[]>(() => {
        if (!data) {
            return [
                'Itens em estoque',
                'Movimenta\u00e7\u00f5es',
                'Consumo no m\u00eas',
                'Abaixo do m\u00ednimo',
                'Valor imobilizado',
            ].map((title) => ({
                title,
                value: '\u2014',
                footer: 'Carregando dados...',
                badge: '... ',
            }));
        }

        return [
            {
                title: 'Itens em estoque',
                value: numberFormatter.format(data.itens_em_estoque),
                footer:
                    selectedUnitId === null
                        ? 'em todas as unidades'
                        : `em ${scopeName}`,
                badge: `${numberFormatter.format(data.skus_ativos)} SKUs`,
            },
            {
                title: 'Movimenta\u00e7\u00f5es',
                value: numberFormatter.format(data.movimentacoes_mes),
                footer: `${numberFormatter.format(data.movimentacoes_hoje.total)} registradas hoje`,
                badge: `${numberFormatter.format(data.movimentacoes_hoje.total)} hoje`,
            },
            {
                title: 'Consumo no m\u00eas',
                value: currencyFormatter.format(data.valor_consumido_mes),
                footer: 'valor das sa\u00eddas registradas',
                badge: 'sa\u00eddas',
                badgeClass:
                    'bg-[var(--dashboard-danger-bg)] text-[var(--dashboard-danger-text)]',
                compact: true,
                valueClass: 'text-[var(--dashboard-danger-text)]',
            },
            {
                title: 'Abaixo do m\u00ednimo',
                value: `${numberFormatter.format(data.abaixo_do_minimo)} itens`,
                footer: 'ver alertas \u2192',
                badge: 'alerta',
                badgeClass:
                    'bg-[var(--dashboard-danger-bg)] text-[var(--dashboard-danger-text)]',
                valueClass: 'text-[var(--dashboard-danger-text)]',
            },
            {
                title: 'Valor imobilizado',
                value: currencyFormatter.format(data.valor_imobilizado),
                footer: 'saldo atual x valor unit\u00e1rio',
                badge: 'atual',
                badgeClass:
                    'bg-[var(--dashboard-surface-muted)] text-[var(--dashboard-text-secondary)]',
                compact: true,
            },
        ];
    }, [data, scopeName, selectedUnitId]);

    const filteredBalances = useMemo(() => {
        const normalizedFilter = filter.trim().toLocaleLowerCase('pt-BR');
        const balances = data?.saldos_atuais ?? [];

        if (!normalizedFilter) {
            return balances.slice(0, 10);
        }

        return balances
            .filter((balance) =>
                [balance.sku, balance.item, balance.unidade].some((value) =>
                    value.toLocaleLowerCase('pt-BR').includes(normalizedFilter),
                ),
            )
            .slice(0, 10);
    }, [data, filter]);

    const chartItems = data?.consumo_30_dias.itens ?? [];
    const chartSeries = data?.consumo_30_dias.series ?? [];
    const chartMaximum = Math.max(
        0,
        ...chartSeries.flatMap((series) => series.quantidades),
    );

    return (
        <>
            <Head title="Dashboard" />
            <div
                className="min-h-full w-full min-w-0 bg-[var(--dashboard-canvas)] px-4 py-5 transition-colors sm:px-6 sm:py-6 lg:px-8 lg:py-8"
                aria-busy={isDashboardLoading}
            >
                <span className="sr-only" role="status" aria-live="polite">
                    {isDashboardLoading
                        ? `Atualizando os dados de ${scopeName}.`
                        : `Dados de ${scopeName} atualizados.`}
                </span>
                <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-col gap-6">
                    <header className="flex min-h-12 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-xl leading-tight font-bold text-[var(--dashboard-text)] sm:text-2xl lg:text-3xl">
                                Vis&atilde;o geral do estoque
                            </h1>
                            {isDashboardLoading ? (
                                <DashboardSkeleton className="h-3.5 w-64 max-w-full rounded" />
                            ) : (
                                <p className="dashboard-data-reveal text-xs text-[var(--dashboard-text-muted)] sm:text-sm">
                                    {data
                                        ? `${numberFormatter.format(data.skus_ativos)} SKUs ativos em ${scopeName} - atualizado ${updatedAt?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) ?? 'agora'}`
                                        : 'Dados do estoque indisponíveis.'}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setMovementDialogSession(
                                    (session) => session + 1,
                                );
                                setMovementDialogOpen(true);
                            }}
                            className="flex h-9 items-center justify-center rounded-md bg-[var(--dashboard-accent)] px-3 text-xs font-extrabold text-[var(--dashboard-accent-foreground)] transition-colors hover:bg-[var(--dashboard-accent-hover)] sm:h-10 sm:px-4 sm:text-sm"
                        >
                            + Nova movimenta&ccedil;&atilde;o
                        </button>
                    </header>

                    {error && (
                        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-[var(--dashboard-danger-border)] bg-[var(--dashboard-danger-bg)] p-4 text-sm text-[var(--dashboard-danger-text)] sm:flex-row sm:items-center">
                            <span className="flex items-center gap-2">
                                <AlertCircle className="size-4" />
                                {error}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setRequestError(null);
                                    setRefreshKey((key) => key + 1);
                                }}
                                className="inline-flex items-center gap-2 font-semibold transition-opacity hover:opacity-75"
                            >
                                <RefreshCw className="size-4" />
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        {metrics.map((metric) => (
                            <MetricCard
                                key={metric.title}
                                {...metric}
                                loading={isDashboardLoading}
                            />
                        ))}
                    </section>

                    <section className="flex min-h-[340px] max-w-full min-w-0 flex-col gap-5 overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 transition-colors sm:min-h-[390px] sm:p-5 lg:p-6">
                        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-sm font-bold text-[var(--dashboard-text)] sm:text-base">
                                    Itens mais solicitados por unidade
                                </h2>
                                <p className="text-xs text-[var(--dashboard-text-muted)] sm:text-sm">
                                    Sa&iacute;das acumuladas nos &uacute;ltimos
                                    30 dias.
                                </p>
                            </div>
                            <div className="flex overflow-hidden rounded-md border border-[var(--dashboard-border-strong)] text-xs sm:text-sm">
                                <span className="bg-[var(--dashboard-surface-muted)] px-3 py-2 text-[var(--dashboard-text)]">
                                    30 dias
                                </span>
                                <span className="px-3 py-2 text-[var(--dashboard-text-subtle)]">
                                    Dados reais
                                </span>
                            </div>
                        </div>

                        {isDashboardLoading ? (
                            <>
                                <DashboardChartSkeleton />
                                <DashboardChartLegendSkeleton />
                            </>
                        ) : (
                            <>
                                {chartItems.length > 0 && chartMaximum > 0 ? (
                                    <div className="dashboard-data-reveal w-full max-w-full min-w-0 [scrollbar-gutter:stable] overflow-x-auto overscroll-x-contain">
                                        <div className="flex h-[220px] min-w-[700px] items-end justify-between gap-4 border-b border-l border-[var(--dashboard-border-strong)] px-4 sm:h-[250px] sm:gap-8 sm:px-6">
                                            {chartItems.map(
                                                (item, itemIndex) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex h-full min-w-20 flex-1 flex-col items-center justify-end gap-3"
                                                    >
                                                        <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-1.5">
                                                            {chartSeries.map(
                                                                (
                                                                    series,
                                                                    seriesIndex,
                                                                ) => {
                                                                    const quantity =
                                                                        series
                                                                            .quantidades[
                                                                            itemIndex
                                                                        ] ?? 0;
                                                                    const height =
                                                                        chartMaximum >
                                                                        0
                                                                            ? (quantity /
                                                                                  chartMaximum) *
                                                                              100
                                                                            : 0;

                                                                    return (
                                                                        <span
                                                                            key={`${item.id}-${series.unidade}`}
                                                                            title={`${series.unidade}: ${numberFormatter.format(quantity)}`}
                                                                            className="w-4 rounded-t-md sm:w-6 lg:w-8"
                                                                            style={{
                                                                                height: `${height}%`,
                                                                                backgroundColor:
                                                                                    seriesColors[
                                                                                        seriesIndex %
                                                                                            seriesColors.length
                                                                                    ],
                                                                            }}
                                                                        />
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                        <span className="w-28 text-center text-[10px] leading-tight text-[var(--dashboard-text-muted)] sm:w-36 sm:text-xs">
                                                            {item.nome}
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="dashboard-data-reveal flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-[var(--dashboard-border-strong)] text-sm text-[var(--dashboard-text-subtle)]">
                                        Nenhuma sa&iacute;da registrada nos
                                        &uacute;ltimos 30 dias.
                                    </div>
                                )}

                                {chartSeries.length > 0 && (
                                    <div className="dashboard-data-reveal flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-[var(--dashboard-text-secondary)] sm:text-sm">
                                        {chartSeries.map((series, index) => (
                                            <span
                                                key={series.unidade}
                                                className="inline-flex items-center gap-2"
                                            >
                                                <span
                                                    className="size-2.5 rounded-sm"
                                                    style={{
                                                        backgroundColor:
                                                            seriesColors[
                                                                index %
                                                                    seriesColors.length
                                                            ],
                                                    }}
                                                />
                                                {series.unidade}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </section>

                    <section className="max-w-full min-w-0 overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] transition-colors">
                        <div className="flex min-w-0 flex-col items-start justify-between gap-4 border-b border-[var(--dashboard-border)] p-4 sm:flex-row sm:items-center sm:p-5">
                            <div className="flex min-w-0 flex-col gap-1">
                                <h2 className="text-sm font-bold text-[var(--dashboard-text)] sm:text-base">
                                    Saldo atual por item e unidade
                                </h2>
                                <p className="text-xs text-[var(--dashboard-text-muted)] sm:text-sm">
                                    Posi&ccedil;&atilde;o consolidada do
                                    estoque.
                                </p>
                            </div>
                            <input
                                type="search"
                                value={filter}
                                onChange={(event) =>
                                    setFilter(event.target.value)
                                }
                                placeholder="Filtrar item ou unidade..."
                                className="h-9 w-full min-w-0 rounded-md border border-[var(--dashboard-border-strong)] bg-[var(--dashboard-input)] px-3 text-xs text-[var(--dashboard-text)] transition-colors outline-none placeholder:text-[var(--dashboard-text-subtle)] focus:border-[var(--dashboard-accent)] sm:w-64 sm:text-sm"
                            />
                        </div>

                        <div className="max-h-[32rem] w-full max-w-full min-w-0 [scrollbar-gutter:stable] overflow-auto overscroll-contain">
                            <div className="w-full min-w-[960px] text-sm">
                                <div className="sticky top-0 z-10 grid h-11 grid-cols-[minmax(140px,0.75fr)_minmax(260px,1.7fr)_minmax(220px,1.25fr)_minmax(88px,0.45fr)_minmax(88px,0.45fr)] items-center gap-x-6 border-b border-[var(--dashboard-border)] bg-[var(--dashboard-panel)] px-5 text-[11px] font-semibold tracking-wide text-[var(--dashboard-text-muted)] sm:px-6 sm:text-xs">
                                    <span>SKU</span>
                                    <span>ITEM</span>
                                    <span>UNIDADE</span>
                                    <span className="text-right">SALDO</span>
                                    <span className="text-right">
                                        M&Iacute;NIMO
                                    </span>
                                </div>
                                {isDashboardLoading ? (
                                    <DashboardTableSkeleton />
                                ) : (
                                    <>
                                        {filteredBalances.map(
                                            (balance, index) => (
                                                <div
                                                    key={`${balance.item_id}-${balance.unidade_id}`}
                                                    className={`dashboard-data-reveal grid min-h-14 grid-cols-[minmax(140px,0.75fr)_minmax(260px,1.7fr)_minmax(220px,1.25fr)_minmax(88px,0.45fr)_minmax(88px,0.45fr)] items-center gap-x-6 px-5 py-3 text-xs leading-relaxed text-[var(--dashboard-text)] sm:px-6 ${
                                                        index <
                                                        filteredBalances.length -
                                                            1
                                                            ? 'border-b border-[var(--dashboard-border)]'
                                                            : ''
                                                    }`}
                                                >
                                                    <span
                                                        title={balance.sku}
                                                        className="min-w-0 truncate font-medium text-[var(--dashboard-text-secondary)]"
                                                    >
                                                        {balance.sku}
                                                    </span>
                                                    <span
                                                        title={balance.item}
                                                        className="min-w-0 truncate pr-2 font-medium text-[var(--dashboard-text)]"
                                                    >
                                                        {balance.item}
                                                    </span>
                                                    <span
                                                        title={balance.unidade}
                                                        className="min-w-0 truncate pr-2 text-[var(--dashboard-text-secondary)]"
                                                    >
                                                        {balance.unidade}
                                                    </span>
                                                    <span
                                                        className={`text-right tabular-nums ${
                                                            balance.quantidade <
                                                            balance.estoque_minimo
                                                                ? 'font-semibold text-[var(--dashboard-danger-text)]'
                                                                : ''
                                                        }`}
                                                    >
                                                        {numberFormatter.format(
                                                            balance.quantidade,
                                                        )}
                                                    </span>
                                                    <span className="text-right tabular-nums">
                                                        {numberFormatter.format(
                                                            balance.estoque_minimo,
                                                        )}
                                                    </span>
                                                </div>
                                            ),
                                        )}
                                        {data &&
                                            filteredBalances.length === 0 && (
                                                <div className="flex h-20 items-center justify-center px-4 text-xs text-[var(--dashboard-text-subtle)]">
                                                    Nenhum saldo encontrado para
                                                    este filtro.
                                                </div>
                                            )}
                                    </>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <DashboardMovementDialog
                key={movementDialogSession}
                open={movementDialogOpen}
                onOpenChange={setMovementDialogOpen}
                onCreated={() => {
                    setRequestError(null);
                    setRefreshKey((key) => key + 1);
                }}
            />
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
