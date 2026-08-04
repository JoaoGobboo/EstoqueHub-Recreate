import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowUpRight,
    CalendarDays,
    Package,
    RefreshCw,
    Sparkles,
    TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useDashboardScope } from '@/contexts/dashboard-scope-context';

type Item = {
    id: number;
    sku: string;
    nome: string;
    categoria?: string | null;
};

type Unit = {
    id: number;
    nome: string;
};

type ConsumedItem = {
    item: Item;
    quantidade: number;
    valor: number;
};

type UnitConsumption = {
    unidade: Unit | null;
    quantidade: number;
};

type ConsumptionData = {
    periodo: {
        inicio: string;
        fim: string;
    };
    valor_adquirido: number;
    valor_consumido: number;
    itens_mais_consumidos: ConsumedItem[];
    consumo_por_unidade: UnitConsumption[];
};

type ConsumptionSnapshot = {
    scopeKey: string;
    current: ConsumptionData;
    previous: ConsumptionData | null;
    updatedAt: Date;
};

type ConsumptionRequestError = {
    scopeKey: string;
    message: string;
};

type Insight = {
    body: string;
    icon: LucideIcon;
    iconClass: string;
    title: string;
};

type SkeletonProps = {
    className?: string;
    style?: CSSProperties;
};

const numberFormatter = new Intl.NumberFormat('pt-BR');
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});
const percentFormatter = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
});
const categoryColors = ['#38bdf8', '#a78bfa', '#22c55e', '#f59e0b', '#fb7185'];
const periodOptions = [30, 60, 90] as const;
const chartItemLimit = 8;
const minimumLoadingDuration = 450;

type PeriodOption = (typeof periodOptions)[number];

function formatDateParam(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Janela atual e a janela imediatamente anterior de mesmo tamanho, usada para
 * calcular a variação do período e o insight de ponto de atenção.
 */
function periodRanges(days: PeriodOption) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - (days - 1));

    return {
        current: { inicio: formatDateParam(start), fim: formatDateParam(end) },
        previous: {
            inicio: formatDateParam(previousStart),
            fim: formatDateParam(previousEnd),
        },
    };
}

function buildQuery(
    range: { inicio: string; fim: string },
    unitId: number | null,
): string {
    const params = new URLSearchParams({
        data_inicio: range.inicio,
        data_fim: range.fim,
    });

    if (unitId !== null) {
        params.set('unidade_id', `${unitId}`);
    }

    return params.toString();
}

function totalQuantity(data: ConsumptionData | null): number {
    return (
        data?.consumo_por_unidade.reduce(
            (total, entry) => total + entry.quantidade,
            0,
        ) ?? 0
    );
}

function AnalysisSkeleton({ className = '', style }: SkeletonProps) {
    return (
        <span
            aria-hidden="true"
            className={`dashboard-skeleton block ${className}`}
            style={style}
        />
    );
}

function MetricCard({
    detail,
    icon: Icon,
    iconClass,
    loading,
    title,
    value,
    valueClass = 'text-[var(--dashboard-text)]',
}: {
    detail: string;
    icon: LucideIcon;
    iconClass: string;
    loading: boolean;
    title: string;
    value: string;
    valueClass?: string;
}) {
    return (
        <div className="flex min-h-[112px] min-w-0 flex-col gap-2 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 transition-colors sm:min-h-[124px] sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <span className="truncate text-xs leading-tight font-semibold text-[var(--dashboard-text)] sm:text-sm">
                    {title}
                </span>
                <Icon className={`size-4 shrink-0 ${iconClass}`} />
            </div>
            {loading ? (
                <AnalysisSkeleton className="h-7 w-28 rounded-md" />
            ) : (
                <span
                    className={`dashboard-data-reveal text-xl leading-tight font-bold tracking-wide sm:text-2xl ${valueClass}`}
                >
                    {value}
                </span>
            )}
            {loading ? (
                <AnalysisSkeleton className="h-3 w-24 rounded" />
            ) : (
                <span className="dashboard-data-reveal text-xs text-[var(--dashboard-text-muted)]">
                    {detail}
                </span>
            )}
        </div>
    );
}

export default function AnaliseConsumo() {
    const { ready, selectedUnitId, scopeName } = useDashboardScope();
    const [days, setDays] = useState<PeriodOption>(30);
    const [snapshot, setSnapshot] = useState<ConsumptionSnapshot | null>(null);
    const [requestError, setRequestError] =
        useState<ConsumptionRequestError | null>(null);
    const [transferOpportunities, setTransferOpportunities] = useState<
        number | null
    >(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const scopeKey = `${selectedUnitId ?? 'todas'}:${days}`;
    const activeSnapshot = snapshot?.scopeKey === scopeKey ? snapshot : null;
    const error =
        requestError?.scopeKey === scopeKey ? requestError.message : null;
    const isLoading = !ready || (!activeSnapshot && !error);
    const current = activeSnapshot?.current ?? null;
    const previous = activeSnapshot?.previous ?? null;

    useEffect(() => {
        if (!ready) {
            return;
        }

        const controller = new AbortController();
        const loadingStartedAt = performance.now();
        const ranges = periodRanges(days);

        const load = (range: { inicio: string; fim: string }) =>
            fetch(`/api/analise-consumo?${buildQuery(range, selectedUnitId)}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                signal: controller.signal,
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(
                        'Não foi possível carregar a análise de consumo.',
                    );
                }

                return response.json() as Promise<ConsumptionData>;
            });

        // O período anterior só alimenta a comparação: se ele falhar, a página
        // continua com os dados do período atual.
        Promise.all([
            load(ranges.current),
            load(ranges.previous).catch(() => null),
        ])
            .then(async ([currentData, previousData]) => {
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
                    current: currentData,
                    previous: previousData,
                    updatedAt: new Date(),
                });
                setRequestError((currentError) =>
                    currentError?.scopeKey === scopeKey ? null : currentError,
                );
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setRequestError({
                    scopeKey,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Falha ao carregar a análise de consumo.',
                });
            });

        return () => controller.abort();
    }, [days, ready, refreshKey, scopeKey, selectedUnitId]);

    // A oportunidade de transferência é um complemento: se falhar, o insight
    // some, mas o restante da página continua utilizável.
    useEffect(() => {
        if (!ready) {
            return;
        }

        const controller = new AbortController();

        fetch('/api/sugestoes', {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Sugestões indisponíveis.');
                }

                return response.json() as Promise<{
                    data: Array<{
                        tipo: string;
                        unidade_destino: { id: number };
                    }>;
                }>;
            })
            .then(({ data }) => {
                setTransferOpportunities(
                    data.filter(
                        (suggestion) =>
                            suggestion.tipo === 'transferencia' &&
                            (selectedUnitId === null ||
                                suggestion.unidade_destino.id ===
                                    selectedUnitId),
                    ).length,
                );
            })
            .catch(() => setTransferOpportunities(null));

        return () => controller.abort();
    }, [ready, refreshKey, selectedUnitId]);

    const chartItems = useMemo(
        () => current?.itens_mais_consumidos.slice(0, chartItemLimit) ?? [],
        [current],
    );
    const chartMaximum = Math.max(
        0,
        ...chartItems.map((entry) => entry.quantidade),
    );

    const categories = useMemo(() => {
        const names = new Set<string>();

        for (const entry of chartItems) {
            names.add(entry.item.categoria ?? 'Sem categoria');
        }

        return [...names];
    }, [chartItems]);

    const categoryColor = (categoria?: string | null) => {
        const index = categories.indexOf(categoria ?? 'Sem categoria');

        return categoryColors[Math.max(0, index) % categoryColors.length];
    };

    const consumedTotal = totalQuantity(current);
    const previousConsumedValue = previous?.valor_consumido ?? 0;
    const consumedValue = current?.valor_consumido ?? 0;
    const variation =
        previousConsumedValue > 0
            ? ((consumedValue - previousConsumedValue) /
                  previousConsumedValue) *
              100
            : null;

    const insights = useMemo<Insight[]>(() => {
        if (!current) {
            return [];
        }

        const collected: Insight[] = [];
        const topItem = current.itens_mais_consumidos.at(0);

        if (topItem && consumedTotal > 0) {
            const share = Math.round(
                (topItem.quantidade / consumedTotal) * 100,
            );

            collected.push({
                body: `${topItem.item.nome} concentra ${share}% das saídas.`,
                icon: Package,
                iconClass: 'text-[#38bdf8]',
                title: 'Maior consumo',
            });
        }

        const previousByUnit = new Map(
            (previous?.consumo_por_unidade ?? [])
                .filter((entry) => entry.unidade !== null)
                .map((entry) => [entry.unidade!.id, entry.quantidade]),
        );
        const growth = current.consumo_por_unidade
            .filter((entry) => entry.unidade !== null)
            .map((entry) => {
                const before = previousByUnit.get(entry.unidade!.id) ?? 0;

                return {
                    nome: entry.unidade!.nome,
                    percentual:
                        before > 0
                            ? ((entry.quantidade - before) / before) * 100
                            : null,
                };
            })
            .filter(
                (entry) => entry.percentual !== null && entry.percentual > 0,
            )
            .sort((a, b) => (b.percentual ?? 0) - (a.percentual ?? 0))
            .at(0);
        const topUnit = current.consumo_por_unidade.find(
            (entry) => entry.unidade !== null,
        );

        if (growth) {
            collected.push({
                body: `${growth.nome} aumentou o consumo em ${Math.round(growth.percentual ?? 0)}%.`,
                icon: TriangleAlert,
                iconClass: 'text-[#fbbf24]',
                title: 'Ponto de atenção',
            });
        } else if (topUnit?.unidade) {
            collected.push({
                body: `${topUnit.unidade.nome} lidera as saídas com ${numberFormatter.format(topUnit.quantidade)} itens.`,
                icon: TriangleAlert,
                iconClass: 'text-[#fbbf24]',
                title: 'Ponto de atenção',
            });
        }

        if (transferOpportunities !== null && transferOpportunities > 0) {
            collected.push({
                body: `${transferOpportunities} ${transferOpportunities === 1 ? 'item pode ser transferido' : 'itens podem ser transferidos'} antes de comprar.`,
                icon: Sparkles,
                iconClass: 'text-[#86efac]',
                title: 'Oportunidade',
            });
        }

        return collected;
    }, [consumedTotal, current, previous, transferOpportunities]);

    return (
        <>
            <Head title="Análise de consumo" />
            <div
                className="min-h-full w-full min-w-0 bg-[var(--dashboard-canvas)] px-4 py-5 transition-colors sm:px-6 sm:py-6 lg:px-8 lg:py-8"
                aria-busy={isLoading}
            >
                <span className="sr-only" role="status" aria-live="polite">
                    {isLoading
                        ? `Atualizando a análise de consumo de ${scopeName}.`
                        : `Análise de consumo de ${scopeName} atualizada.`}
                </span>

                <div className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-col gap-6">
                    <header className="flex min-h-12 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-col gap-1">
                            <h1 className="text-xl leading-tight font-bold text-[var(--dashboard-text)] sm:text-2xl lg:text-3xl">
                                Análise de consumo
                            </h1>
                            <p className="text-xs text-[var(--dashboard-text-muted)] sm:text-sm">
                                Entenda o ritmo de consumo por item, unidade e
                                período.
                            </p>
                        </div>

                        <div
                            role="group"
                            aria-label="Período de análise"
                            className="flex shrink-0 items-center overflow-hidden rounded-md border border-[var(--dashboard-border-strong)] text-xs sm:text-sm"
                        >
                            <span className="flex items-center gap-2 border-r border-[var(--dashboard-border-strong)] px-3 py-2 text-[var(--dashboard-text-subtle)]">
                                <CalendarDays className="size-4" />
                                Últimos
                            </span>
                            {periodOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    aria-pressed={option === days}
                                    onClick={() => setDays(option)}
                                    className={`px-3 py-2 transition-colors ${
                                        option === days
                                            ? 'bg-[var(--dashboard-surface-muted)] font-semibold text-[var(--dashboard-text)]'
                                            : 'text-[var(--dashboard-text-subtle)] hover:bg-[var(--dashboard-surface-hover)]'
                                    }`}
                                >
                                    {option} dias
                                </button>
                            ))}
                        </div>
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

                    <section className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
                        <MetricCard
                            title="Total de saídas"
                            value={numberFormatter.format(consumedTotal)}
                            detail={`itens no período de ${days} dias`}
                            icon={Package}
                            iconClass="text-[#38bdf8]"
                            loading={isLoading}
                        />
                        <MetricCard
                            title="Custo consumido"
                            value={currencyFormatter.format(consumedValue)}
                            detail="valor no período"
                            icon={ArrowUpRight}
                            iconClass="text-[var(--dashboard-text-muted)]"
                            loading={isLoading}
                        />
                        <MetricCard
                            title="Variação"
                            value={
                                variation === null
                                    ? '—'
                                    : `${variation >= 0 ? '+' : '−'}${percentFormatter.format(Math.abs(variation))}%`
                            }
                            detail={
                                variation === null
                                    ? 'sem consumo no período anterior'
                                    : `versus os ${days} dias anteriores`
                            }
                            icon={TriangleAlert}
                            iconClass={
                                variation !== null && variation > 0
                                    ? 'text-[#fbbf24]'
                                    : 'text-[var(--dashboard-text-muted)]'
                            }
                            valueClass={
                                variation === null
                                    ? 'text-[var(--dashboard-text-muted)]'
                                    : variation > 0
                                      ? 'text-[#fbbf24]'
                                      : 'text-[var(--dashboard-positive-text)]'
                            }
                            loading={isLoading}
                        />
                    </section>

                    <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <section className="flex min-h-[340px] max-w-full min-w-0 flex-col gap-5 overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 transition-colors sm:min-h-[390px] sm:p-5 lg:p-6">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-sm font-bold text-[var(--dashboard-text)] sm:text-base">
                                    Consumo por item
                                </h2>
                                <p className="text-xs text-[var(--dashboard-text-muted)] sm:text-sm">
                                    Saídas acumuladas no período selecionado.
                                </p>
                            </div>

                            {isLoading ? (
                                <AnalysisSkeleton className="h-[220px] w-full rounded-lg sm:h-[250px]" />
                            ) : chartItems.length > 0 && chartMaximum > 0 ? (
                                <>
                                    <div className="dashboard-data-reveal w-full max-w-full min-w-0 [scrollbar-gutter:stable] overflow-x-auto overscroll-x-contain">
                                        <div className="flex h-[220px] min-w-[640px] items-end justify-between gap-4 border-b border-l border-[var(--dashboard-border-strong)] px-4 sm:h-[250px] sm:gap-6 sm:px-6">
                                            {chartItems.map((entry) => {
                                                const height =
                                                    (entry.quantidade /
                                                        chartMaximum) *
                                                    100;

                                                return (
                                                    <div
                                                        key={entry.item.id}
                                                        className="flex h-full min-w-16 flex-1 flex-col items-center justify-end gap-3"
                                                    >
                                                        <span className="text-[10px] font-semibold text-[var(--dashboard-text-secondary)] sm:text-xs">
                                                            {numberFormatter.format(
                                                                entry.quantidade,
                                                            )}
                                                        </span>
                                                        <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                                                            <span
                                                                title={`${entry.item.nome}: ${numberFormatter.format(entry.quantidade)} - ${currencyFormatter.format(entry.valor)}`}
                                                                className="w-4 rounded-t-md sm:w-6 lg:w-8"
                                                                style={{
                                                                    height: `${height}%`,
                                                                    backgroundColor:
                                                                        categoryColor(
                                                                            entry
                                                                                .item
                                                                                .categoria,
                                                                        ),
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="w-24 text-center text-[10px] leading-tight text-[var(--dashboard-text-muted)] sm:w-32 sm:text-xs">
                                                            {entry.item.nome}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="dashboard-data-reveal flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-[var(--dashboard-text-secondary)] sm:text-sm">
                                        {categories.map((categoria) => (
                                            <span
                                                key={categoria}
                                                className="inline-flex items-center gap-2"
                                            >
                                                <span
                                                    className="size-2.5 rounded-sm"
                                                    style={{
                                                        backgroundColor:
                                                            categoryColor(
                                                                categoria,
                                                            ),
                                                    }}
                                                />
                                                {categoria}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="dashboard-data-reveal flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-[var(--dashboard-border-strong)] text-sm text-[var(--dashboard-text-subtle)]">
                                    Nenhuma saída registrada no período.
                                </div>
                            )}
                        </section>

                        <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 transition-colors sm:p-5">
                            <span className="text-[11px] font-semibold tracking-wide text-[var(--dashboard-text-subtle)]">
                                PRINCIPAIS INSIGHTS
                            </span>

                            {isLoading ? (
                                <div className="flex flex-col gap-4">
                                    {[0, 1, 2].map((index) => (
                                        <div
                                            key={index}
                                            className="flex flex-col gap-2"
                                        >
                                            <AnalysisSkeleton className="h-3.5 w-32 rounded" />
                                            <AnalysisSkeleton className="h-3 w-full rounded" />
                                        </div>
                                    ))}
                                </div>
                            ) : insights.length > 0 ? (
                                <div className="dashboard-data-reveal flex flex-col gap-4">
                                    {insights.map(
                                        ({
                                            body,
                                            icon: Icon,
                                            iconClass,
                                            title,
                                        }) => (
                                            <div
                                                key={title}
                                                className="flex flex-col gap-1.5"
                                            >
                                                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--dashboard-text-secondary)]">
                                                    <Icon
                                                        className={`size-4 shrink-0 ${iconClass}`}
                                                    />
                                                    {title}
                                                </span>
                                                <p className="text-xs leading-relaxed text-[var(--dashboard-text-muted)]">
                                                    {body}
                                                </p>
                                            </div>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-[var(--dashboard-text-subtle)]">
                                    Sem insights para o período selecionado.
                                </p>
                            )}

                            <Link
                                href="/sugestoes"
                                className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--dashboard-border-strong)] px-3 text-xs font-semibold text-[var(--dashboard-text-secondary)] transition-colors hover:bg-[var(--dashboard-surface-hover)] sm:text-sm"
                            >
                                <ArrowUpRight className="size-4" />
                                Ver sugestões de reposição
                            </Link>
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}
