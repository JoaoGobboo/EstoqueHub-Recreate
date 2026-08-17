import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowUpRight,
    Check,
    ChevronRight,
    Download,
    LoaderCircle,
    RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useDashboardScope } from '@/contexts/dashboard-scope-context';
import { SuggestionDetail } from '@/features/suggestions/suggestion-detail';
import type { Suggestion } from '@/features/suggestions/types';
import type { ApiError } from '@/types/api';

type MetricCardProps = {
    detail: string;
    icon: LucideIcon;
    tone: string;
    title: string;
    value: string;
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
});

function suggestionKey(suggestion: Suggestion): string {
    return [
        suggestion.tipo,
        suggestion.item.id,
        suggestion.unidade_origem?.id ?? 'compra',
        suggestion.unidade_destino.id,
    ].join(':');
}

function currentStock(suggestion: Suggestion): number {
    return Math.max(0, suggestion.item.estoque_minimo - suggestion.quantidade);
}

function readCsrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}

function apiErrorMessage(body: ApiError | null, fallback: string): string {
    const validationMessage = body?.errors
        ? Object.values(body.errors).flat().at(0)
        : null;

    return validationMessage ?? body?.message ?? fallback;
}

function suggestionPresentation(suggestion: Suggestion) {
    if (suggestion.tipo === 'transferencia') {
        return {
            description: `Há saldo excedente em ${suggestion.unidade_origem?.nome ?? 'outra unidade'} para atender esta reposição.`,
            markerClass: 'bg-[var(--dashboard-info-text)]',
            reason: 'Transferência disponível',
            reasonClass: 'text-[var(--dashboard-info-text)]',
        };
    }

    if (suggestion.requisicao_compra) {
        return {
            description:
                'Já existe uma solicitação de compra pendente para este item e unidade.',
            markerClass: 'bg-[var(--dashboard-positive-text)]',
            reason: 'Solicitação pendente',
            reasonClass: 'text-[var(--dashboard-positive-text)]',
        };
    }

    return {
        description:
            'O saldo está abaixo do mínimo definido e não há excedente disponível em outra unidade.',
        markerClass: 'bg-[var(--dashboard-danger-text)]',
        reason: 'Abaixo do mínimo',
        reasonClass: 'text-[var(--dashboard-danger-text)]',
    };
}

function MetricCard({
    detail,
    icon: Icon,
    tone,
    title,
    value,
}: MetricCardProps) {
    return (
        <article className="flex min-h-28 flex-col gap-1 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 sm:min-h-32 sm:p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold text-[var(--dashboard-text-secondary)] sm:text-sm">
                    {title}
                </h2>
                <Icon className={`size-4 ${tone}`} strokeWidth={1.8} />
            </div>
            <strong
                className={`mt-auto text-2xl leading-none font-bold ${tone}`}
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
            Carregando sugestões...
        </div>
    );
}

export default function Sugestoes() {
    const { ready, selectedUnitId } = useDashboardScope();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [submittingKey, setSubmittingKey] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

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
                    throw new Error(
                        'Não foi possível carregar as sugestões de reposição.',
                    );
                }

                return response.json() as Promise<{ data: Suggestion[] }>;
            })
            .then(({ data }) => {
                setSuggestions(data);
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
                        : 'Falha ao carregar as sugestões.',
                );
                setIsLoading(false);
            });

        return () => controller.abort();
    }, [ready, refreshKey]);

    const visibleSuggestions = useMemo(
        () =>
            selectedUnitId === null
                ? suggestions
                : suggestions.filter(
                      (suggestion) =>
                          suggestion.unidade_destino.id === selectedUnitId,
                  ),
        [selectedUnitId, suggestions],
    );

    const selectedSuggestion =
        visibleSuggestions.find(
            (suggestion) => suggestionKey(suggestion) === selectedKey,
        ) ?? visibleSuggestions.at(0);

    const transferCount = visibleSuggestions.filter(
        (suggestion) => suggestion.tipo === 'transferencia',
    ).length;
    const estimatedSavings = visibleSuggestions.reduce(
        (total, suggestion) =>
            suggestion.tipo === 'transferencia'
                ? total + suggestion.quantidade * suggestion.item.valor_unitario
                : total,
        0,
    );

    const handleSuggestionAction = async (suggestion: Suggestion) => {
        if (suggestion.requisicao_compra) {
            return;
        }

        const key = suggestionKey(suggestion);
        const isTransfer = suggestion.tipo === 'transferencia';
        const endpoint = isTransfer
            ? '/api/sugestoes/aprovar-transferencia'
            : '/api/requisicoes-compra';
        const payload = isTransfer
            ? {
                  item_id: suggestion.item.id,
                  unidade_origem_id: suggestion.unidade_origem?.id,
                  unidade_destino_id: suggestion.unidade_destino.id,
                  quantidade: suggestion.quantidade,
              }
            : {
                  item_id: suggestion.item.id,
                  unidade_id: suggestion.unidade_destino.id,
                  quantidade: suggestion.quantidade,
                  motivo: 'Reposição sugerida pelo EstoqueHub',
              };

        setSubmittingKey(key);
        setActionError(null);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': readCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(payload),
            });
            const responseBody = (await response
                .json()
                .catch(() => null)) as ApiError | null;

            if (!response.ok) {
                throw new Error(
                    apiErrorMessage(
                        responseBody,
                        isTransfer
                            ? 'Não foi possível aprovar a transferência.'
                            : 'Não foi possível criar a solicitação.',
                    ),
                );
            }

            toast.success(
                isTransfer
                    ? 'Transferência aprovada com sucesso.'
                    : 'Solicitação de compra criada com sucesso.',
                { position: 'top-right' },
            );
            setSelectedKey(null);
            setIsLoading(true);
            setLoadError(null);
            setRefreshKey((value) => value + 1);
        } catch (error) {
            setActionError(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível concluir a ação.',
            );
        } finally {
            setSubmittingKey(null);
        }
    };

    const exportSuggestions = () => {
        const rows = visibleSuggestions.map((suggestion) => [
            suggestion.item.sku,
            suggestion.item.nome,
            suggestion.unidade_destino.nome,
            suggestion.tipo === 'transferencia' ? 'Transferência' : 'Compra',
            currentStock(suggestion),
            suggestion.item.estoque_minimo,
            suggestion.quantidade,
        ]);
        const csv = [
            [
                'SKU',
                'Item',
                'Unidade de destino',
                'Tipo',
                'Saldo atual',
                'Estoque mínimo',
                'Quantidade sugerida',
            ],
            ...rows,
        ]
            .map((row) =>
                row
                    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
                    .join(';'),
            )
            .join('\n');
        const blob = new Blob([`\uFEFF${csv}`], {
            type: 'text/csv;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = 'sugestoes-de-reposicao.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <Head title="Sugestões" />

            <div className="min-h-full w-full min-w-0 bg-[var(--dashboard-canvas)] px-4 py-5 transition-colors sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto flex w-full max-w-[1120px] min-w-0 flex-col gap-6">
                    <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-col gap-1">
                            <h1 className="text-xl leading-tight font-bold text-[var(--dashboard-text)] sm:text-2xl lg:text-3xl">
                                Sugestões de reposição
                            </h1>
                            <p className="text-xs text-[var(--dashboard-text-muted)] sm:text-sm">
                                Priorize compras e transferências com base no
                                consumo recente.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={exportSuggestions}
                            disabled={visibleSuggestions.length === 0}
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-[var(--dashboard-accent)] px-4 text-xs font-extrabold text-[var(--dashboard-accent-foreground)] transition-colors hover:bg-[var(--dashboard-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dashboard-canvas)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Download className="size-4" />
                            Exportar lista
                        </button>
                    </header>

                    <section
                        aria-label="Resumo das sugestões"
                        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
                    >
                        <MetricCard
                            title="Itens para repor"
                            value={String(visibleSuggestions.length)}
                            detail="abaixo do mínimo"
                            icon={ArrowUpRight}
                            tone="text-[var(--dashboard-danger-text)]"
                        />
                        <MetricCard
                            title="Transferências sugeridas"
                            value={String(transferCount)}
                            detail="entre unidades"
                            icon={ArrowUpRight}
                            tone="text-[var(--dashboard-info-text)]"
                        />
                        <MetricCard
                            title="Economia estimada"
                            value={currencyFormatter.format(estimatedSavings)}
                            detail="em compras evitadas"
                            icon={ArrowUpRight}
                            tone="text-[var(--dashboard-positive-text)]"
                        />
                    </section>

                    <section className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                        <div className="min-w-0 overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]">
                            <div className="flex min-h-14 items-center justify-between gap-4 px-4 sm:px-5">
                                <h2 className="text-sm font-bold text-[var(--dashboard-text)] sm:text-base">
                                    Itens prioritários
                                </h2>
                                <span className="text-xs text-[var(--dashboard-text-muted)]">
                                    {visibleSuggestions.length}{' '}
                                    {visibleSuggestions.length === 1
                                        ? 'sugestão'
                                        : 'sugestões'}
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
                                        onClick={() => {
                                            setIsLoading(true);
                                            setLoadError(null);
                                            setRefreshKey((value) => value + 1);
                                        }}
                                        className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--dashboard-border-strong)] px-3 text-xs font-semibold text-[var(--dashboard-text-secondary)] transition-colors hover:bg-[var(--dashboard-surface-hover)]"
                                    >
                                        <RefreshCw className="size-4" />
                                        Tentar novamente
                                    </button>
                                </div>
                            ) : visibleSuggestions.length === 0 ? (
                                <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 text-center">
                                    <Check className="size-8 text-[var(--dashboard-positive-text)]" />
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--dashboard-text)]">
                                            Estoque em dia
                                        </p>
                                        <p className="mt-1 text-xs text-[var(--dashboard-text-muted)]">
                                            Não há sugestões de reposição para
                                            este contexto.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {visibleSuggestions.map((suggestion) => {
                                        const key = suggestionKey(suggestion);
                                        const presentation =
                                            suggestionPresentation(suggestion);
                                        const selected =
                                            key ===
                                            suggestionKey(selectedSuggestion!);

                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedKey(key);
                                                    setActionError(null);
                                                }}
                                                aria-pressed={selected}
                                                className={`flex min-h-20 w-full items-center gap-3 border-t border-[var(--dashboard-border)] px-4 text-left transition-colors sm:px-5 ${
                                                    selected
                                                        ? 'bg-[var(--dashboard-surface-active)]'
                                                        : 'hover:bg-[var(--dashboard-surface-hover)]'
                                                }`}
                                            >
                                                <span
                                                    className={`h-11 w-1.5 shrink-0 rounded-full ${presentation.markerClass}`}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-[var(--dashboard-text-secondary)]">
                                                        {suggestion.item.nome}
                                                    </span>
                                                    <span className="mt-1 block truncate text-xs text-[var(--dashboard-text-muted)]">
                                                        {
                                                            suggestion
                                                                .unidade_destino
                                                                .nome
                                                        }
                                                    </span>
                                                </span>
                                                <span className="hidden w-32 shrink-0 sm:block">
                                                    <span className="block text-sm font-bold text-[var(--dashboard-text)] tabular-nums">
                                                        {currentStock(
                                                            suggestion,
                                                        )}{' '}
                                                        /{' '}
                                                        {
                                                            suggestion.item
                                                                .estoque_minimo
                                                        }
                                                    </span>
                                                    <span
                                                        className={`mt-1 block truncate text-[11px] font-semibold ${presentation.reasonClass}`}
                                                    >
                                                        {presentation.reason}
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
                            {selectedSuggestion ? (
                                <SuggestionDetail
                                    suggestion={selectedSuggestion}
                                    actionError={actionError}
                                    currentStock={currentStock}
                                    isSubmitting={
                                        submittingKey ===
                                        suggestionKey(selectedSuggestion)
                                    }
                                    onAction={handleSuggestionAction}
                                    presentation={suggestionPresentation(
                                        selectedSuggestion,
                                    )}
                                />
                            ) : (
                                <div className="flex min-h-52 items-center justify-center text-center text-xs text-[var(--dashboard-text-muted)]">
                                    Selecione uma sugestão para ver os detalhes.
                                </div>
                            )}
                        </aside>
                    </section>
                </div>
            </div>
        </>
    );
}
