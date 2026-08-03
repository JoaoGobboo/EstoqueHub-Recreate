import { Head } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownToLine,
    ArrowLeftRight,
    ArrowUpFromLine,
    Building2,
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    FileClock,
    ListFilter,
    LoaderCircle,
    RefreshCw,
    Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useDashboardScope } from '@/contexts/dashboard-scope-context';

type MovementType = 'entrada' | 'saida' | 'transferencia';
type MovementTypeFilter = 'all' | MovementType;
type PeriodFilter = 'all' | 'today' | '7d' | '30d';

type Item = {
    id: number;
    nome: string;
    sku: string;
};

type Unit = {
    id: number;
    nome: string;
};

type Movement = {
    id: number;
    tipo: MovementType;
    quantidade: number;
    motivo: string | null;
    item: Item;
    unidade_origem: Unit | null;
    unidade_destino: Unit | null;
    usuario: string | null;
    created_at: string;
};

type PaginationMeta = {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
};

type MovementResponse = {
    data: Movement[];
    meta: PaginationMeta;
};

type MovementQuery = {
    page: number;
    perPage: number;
    period: PeriodFilter;
    search: string;
    type: MovementTypeFilter;
    unitId: number | null;
};

type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

const movementDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function dateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function periodRange(period: PeriodFilter): {
    end?: string;
    start?: string;
} {
    if (period === 'all') {
        return {};
    }

    const today = new Date();
    const start = new Date(today);

    if (period === '7d') {
        start.setDate(start.getDate() - 6);
    }

    if (period === '30d') {
        start.setDate(start.getDate() - 29);
    }

    return {
        start: dateInputValue(start),
        end: period === 'today' ? dateInputValue(today) : undefined,
    };
}

function buildMovementQuery({
    page,
    perPage,
    period,
    search,
    type,
    unitId,
}: MovementQuery): string {
    const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
    });
    const range = periodRange(period);

    if (search) {
        params.set('busca', search);
    }

    if (type !== 'all') {
        params.set('tipo', type);
    }

    if (unitId !== null) {
        params.set('unidade_id', String(unitId));
    }

    if (range.start) {
        params.set('data_inicio', range.start);
    }

    if (range.end) {
        params.set('data_fim', range.end);
    }

    return params.toString();
}

function movementPresentation(type: MovementType): {
    icon: LucideIcon;
    label: string;
    quantityClass: string;
    tagClass: string;
} {
    if (type === 'entrada') {
        return {
            icon: ArrowDownToLine,
            label: 'Entrada',
            quantityClass: 'text-[var(--dashboard-positive-text)]',
            tagClass:
                'border-[var(--dashboard-positive-border)] bg-[var(--dashboard-positive-bg)] text-[var(--dashboard-positive-text)]',
        };
    }

    if (type === 'saida') {
        return {
            icon: ArrowUpFromLine,
            label: 'Saída',
            quantityClass: 'text-[var(--dashboard-danger-text)]',
            tagClass:
                'border-[var(--dashboard-danger-border)] bg-[var(--dashboard-danger-bg)] text-[var(--dashboard-danger-text)]',
        };
    }

    return {
        icon: ArrowLeftRight,
        label: 'Transferência',
        quantityClass: 'text-[var(--dashboard-info-text)]',
        tagClass:
            'border-[var(--dashboard-info-border)] bg-[var(--dashboard-info-bg)] text-[var(--dashboard-info-text)]',
    };
}

function movementUnit(movement: Movement): string {
    if (movement.tipo === 'transferencia') {
        return `${movement.unidade_origem?.nome ?? '—'} → ${movement.unidade_destino?.nome ?? '—'}`;
    }

    return (
        movement.unidade_destino?.nome ?? movement.unidade_origem?.nome ?? '—'
    );
}

function quantityLabel(movement: Movement): string {
    if (movement.tipo === 'entrada') {
        return `+${movement.quantidade}`;
    }

    if (movement.tipo === 'saida') {
        return `-${movement.quantidade}`;
    }

    return String(movement.quantidade);
}

function csvCell(value: string | number | null): string {
    const normalized = String(value ?? '').replaceAll('"', '""');

    return `"${normalized}"`;
}

function paginationItems(
    lastPage: number,
    currentPage: number,
): PaginationItem[] {
    if (lastPage <= 5) {
        return Array.from({ length: lastPage }, (_, index) => index + 1);
    }

    const pages = new Set([
        1,
        lastPage,
        currentPage - 1,
        currentPage,
        currentPage + 1,
    ]);
    const visiblePages = [...pages]
        .filter((page) => page >= 1 && page <= lastPage)
        .sort((left, right) => left - right);
    const items: PaginationItem[] = [];

    visiblePages.forEach((page, index) => {
        const previousPage = visiblePages[index - 1];

        if (previousPage && page - previousPage > 1) {
            items.push(previousPage === 1 ? 'start-ellipsis' : 'end-ellipsis');
        }

        items.push(page);
    });

    return items;
}

function FilterSelect({
    ariaLabel,
    children,
    disabled = false,
    icon: Icon,
    onChange,
    value,
}: {
    ariaLabel: string;
    children: ReactNode;
    disabled?: boolean;
    icon: LucideIcon;
    onChange: (value: string) => void;
    value: string;
}) {
    return (
        <label
            className={`relative flex h-10 min-w-0 items-center gap-2 rounded-md border border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] px-3 text-xs text-[var(--dashboard-text-secondary)] ${
                disabled ? 'opacity-70' : ''
            }`}
        >
            <Icon className="size-4 shrink-0" strokeWidth={1.7} />
            <span className="sr-only">{ariaLabel}</span>
            <select
                aria-label={ariaLabel}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.target.value)}
                className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pr-5 outline-none disabled:cursor-default"
            >
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-[var(--dashboard-text-muted)]" />
        </label>
    );
}

export default function Historico() {
    const { ready, selectedUnitId, units } = useDashboardScope();
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<MovementTypeFilter>('all');
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
    const [unitFilter, setUnitFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [snapshot, setSnapshot] = useState<{
        key: string;
        response: MovementResponse;
    } | null>(null);
    const [requestError, setRequestError] = useState<{
        key: string;
        message: string;
    } | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    const effectiveUnitId =
        selectedUnitId ?? (unitFilter === 'all' ? null : Number(unitFilter));
    const selectedUnitValue =
        selectedUnitId === null ? unitFilter : String(selectedUnitId);
    const queryString = useMemo(
        () =>
            buildMovementQuery({
                page,
                perPage: 6,
                period: periodFilter,
                search: searchQuery,
                type: typeFilter,
                unitId: effectiveUnitId,
            }),
        [effectiveUnitId, page, periodFilter, searchQuery, typeFilter],
    );

    useEffect(() => {
        const normalizedSearch = searchInput.trim();

        if (normalizedSearch === searchQuery) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setSearchQuery(normalizedSearch);
            setPage(1);
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [searchInput, searchQuery]);

    useEffect(() => {
        if (!ready) {
            return;
        }

        const controller = new AbortController();

        fetch(`/api/movimentacoes?${queryString}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        'Não foi possível carregar o histórico de movimentações.',
                    );
                }

                return response.json() as Promise<MovementResponse>;
            })
            .then((response) => {
                if (
                    response.meta.current_page > response.meta.last_page &&
                    response.meta.last_page > 0
                ) {
                    setPage(response.meta.last_page);

                    return;
                }

                setSnapshot({ key: queryString, response });
                setRequestError(null);
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setRequestError({
                    key: queryString,
                    message:
                        error instanceof Error
                            ? error.message
                            : 'Falha ao carregar o histórico.',
                });
            });

        return () => controller.abort();
    }, [queryString, ready, refreshKey]);

    const currentSnapshot =
        snapshot?.key === queryString ? snapshot.response : null;
    const currentError =
        requestError?.key === queryString ? requestError.message : null;
    const movements = currentSnapshot?.data ?? [];
    const meta = currentSnapshot?.meta;
    const isLoading = !ready || (!currentSnapshot && !currentError);

    const changeFilter = (callback: () => void) => {
        callback();
        setPage(1);
    };

    const retry = () => {
        setRequestError(null);
        setRefreshKey((value) => value + 1);
    };

    const exportCsv = async () => {
        if (!meta || meta.total === 0) {
            return;
        }

        setIsExporting(true);

        try {
            const exportQuery = buildMovementQuery({
                page: 1,
                perPage: Math.max(meta.total, 1),
                period: periodFilter,
                search: searchQuery,
                type: typeFilter,
                unitId: effectiveUnitId,
            });
            const response = await fetch(`/api/movimentacoes?${exportQuery}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                throw new Error('Não foi possível preparar o arquivo.');
            }

            const body = (await response.json()) as MovementResponse;
            const rows = body.data.map((movement) => [
                movementDateFormatter.format(new Date(movement.created_at)),
                movementPresentation(movement.tipo).label,
                `${movement.item.nome} (${movement.item.sku})`,
                movementUnit(movement),
                quantityLabel(movement),
                movement.motivo,
                movement.usuario,
            ]);
            const csv = [
                [
                    'Data e hora',
                    'Tipo',
                    'Item',
                    'Unidade',
                    'Quantidade',
                    'Documento',
                    'Usuário',
                ],
                ...rows,
            ]
                .map((row) => row.map(csvCell).join(';'))
                .join('\r\n');
            const blob = new Blob([`\uFEFF${csv}`], {
                type: 'text/csv;charset=utf-8',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = `historico-movimentacoes-${dateInputValue(new Date())}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast.success('Histórico exportado com sucesso.', {
                position: 'top-right',
            });
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível exportar o histórico.',
                { position: 'top-right' },
            );
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <Head title="Histórico" />

            <div className="min-h-full w-full min-w-0 bg-[var(--dashboard-canvas)] px-4 py-5 transition-colors sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto flex w-full max-w-[1120px] min-w-0 flex-col gap-6">
                    <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                            <h1 className="text-xl leading-tight font-bold text-[var(--dashboard-text)] sm:text-2xl lg:text-3xl">
                                Histórico de movimentações
                            </h1>
                            <p className="mt-1 text-xs text-[var(--dashboard-text-muted)] sm:text-sm">
                                Consulte entradas, saídas e transferências
                                registradas no estoque.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void exportCsv()}
                            disabled={isExporting || !meta?.total}
                            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] px-4 text-xs font-semibold text-[var(--dashboard-text-secondary)] transition-colors hover:bg-[var(--dashboard-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isExporting ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Download className="size-4" />
                            )}
                            {isExporting ? 'Exportando...' : 'Exportar CSV'}
                        </button>
                    </header>

                    <section className="min-w-0 overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]">
                        <div className="grid gap-2 border-b border-[var(--dashboard-border)] p-3 sm:grid-cols-2 lg:grid-cols-[minmax(15rem,1fr)_11rem_10rem_13rem] lg:p-4">
                            <label className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-[var(--dashboard-border-strong)] bg-[var(--dashboard-canvas)] px-3 text-[var(--dashboard-text-muted)] focus-within:border-[var(--dashboard-text-subtle)]">
                                <Search
                                    className="size-4 shrink-0"
                                    strokeWidth={1.8}
                                />
                                <span className="sr-only">
                                    Buscar movimentações
                                </span>
                                <input
                                    type="search"
                                    value={searchInput}
                                    onChange={(event) =>
                                        setSearchInput(event.target.value)
                                    }
                                    placeholder="Buscar por item, unidade ou documento..."
                                    className="min-w-0 flex-1 bg-transparent text-xs text-[var(--dashboard-text)] outline-none placeholder:text-[var(--dashboard-text-subtle)]"
                                />
                            </label>

                            <FilterSelect
                                ariaLabel="Filtrar por período"
                                icon={CalendarDays}
                                value={periodFilter}
                                onChange={(value) =>
                                    changeFilter(() =>
                                        setPeriodFilter(value as PeriodFilter),
                                    )
                                }
                            >
                                <option value="all">Todo o período</option>
                                <option value="today">Hoje</option>
                                <option value="7d">Últimos 7 dias</option>
                                <option value="30d">Últimos 30 dias</option>
                            </FilterSelect>

                            <FilterSelect
                                ariaLabel="Filtrar por tipo"
                                icon={ListFilter}
                                value={typeFilter}
                                onChange={(value) =>
                                    changeFilter(() =>
                                        setTypeFilter(
                                            value as MovementTypeFilter,
                                        ),
                                    )
                                }
                            >
                                <option value="all">Todos os tipos</option>
                                <option value="entrada">Entrada</option>
                                <option value="saida">Saída</option>
                                <option value="transferencia">
                                    Transferência
                                </option>
                            </FilterSelect>

                            <FilterSelect
                                ariaLabel="Filtrar por unidade"
                                disabled={selectedUnitId !== null}
                                icon={Building2}
                                value={selectedUnitValue}
                                onChange={(value) =>
                                    changeFilter(() => setUnitFilter(value))
                                }
                            >
                                <option value="all">Todas as unidades</option>
                                {units.map((unit) => (
                                    <option
                                        key={unit.id}
                                        value={String(unit.id)}
                                    >
                                        {unit.nome}
                                    </option>
                                ))}
                            </FilterSelect>
                        </div>

                        {isLoading ? (
                            <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-[var(--dashboard-text-muted)]">
                                <LoaderCircle className="size-5 animate-spin" />
                                Carregando histórico...
                            </div>
                        ) : currentError ? (
                            <div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center">
                                <AlertCircle className="size-8 text-[var(--dashboard-danger-text)]" />
                                <p className="max-w-md text-sm text-[var(--dashboard-text-muted)]">
                                    {currentError}
                                </p>
                                <button
                                    type="button"
                                    onClick={retry}
                                    className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--dashboard-border-strong)] px-3 text-xs font-semibold text-[var(--dashboard-text-secondary)] transition-colors hover:bg-[var(--dashboard-surface-hover)]"
                                >
                                    <RefreshCw className="size-4" />
                                    Tentar novamente
                                </button>
                            </div>
                        ) : movements.length === 0 ? (
                            <div className="flex min-h-80 flex-col items-center justify-center gap-3 px-6 text-center">
                                <FileClock className="size-9 text-[var(--dashboard-text-subtle)]" />
                                <div>
                                    <p className="text-sm font-semibold text-[var(--dashboard-text)]">
                                        Nenhuma movimentação encontrada
                                    </p>
                                    <p className="mt-1 text-xs text-[var(--dashboard-text-muted)]">
                                        Ajuste os filtros ou registre uma nova
                                        movimentação.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="min-w-0 overflow-x-auto">
                                <div className="min-w-[900px]">
                                    <div className="grid grid-cols-[9rem_8.5rem_minmax(12rem,1.2fr)_minmax(13rem,1.3fr)_7rem_minmax(9rem,0.8fr)] gap-3 border-b border-[var(--dashboard-border)] bg-[var(--dashboard-surface-muted)] px-4 py-3 text-[10px] font-bold tracking-wide text-[var(--dashboard-text-subtle)]">
                                        <span>DATA E HORA</span>
                                        <span>TIPO</span>
                                        <span>ITEM</span>
                                        <span>UNIDADE</span>
                                        <span>QUANTIDADE</span>
                                        <span>DOCUMENTO</span>
                                    </div>

                                    {movements.map((movement) => {
                                        const presentation =
                                            movementPresentation(movement.tipo);
                                        const Icon = presentation.icon;

                                        return (
                                            <article
                                                key={movement.id}
                                                className="grid min-h-[4.5rem] grid-cols-[9rem_8.5rem_minmax(12rem,1.2fr)_minmax(13rem,1.3fr)_7rem_minmax(9rem,0.8fr)] items-center gap-3 border-b border-[var(--dashboard-border)] px-4 py-3 text-xs last:border-b-0 hover:bg-[var(--dashboard-surface-hover)]"
                                            >
                                                <time
                                                    dateTime={
                                                        movement.created_at
                                                    }
                                                    className="text-[var(--dashboard-text-secondary)]"
                                                >
                                                    {movementDateFormatter.format(
                                                        new Date(
                                                            movement.created_at,
                                                        ),
                                                    )}
                                                </time>
                                                <span
                                                    className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold ${presentation.tagClass}`}
                                                >
                                                    <Icon className="size-3.5" />
                                                    {presentation.label}
                                                </span>
                                                <span className="min-w-0">
                                                    <strong className="block truncate font-semibold text-[var(--dashboard-text)]">
                                                        {movement.item.nome}
                                                    </strong>
                                                    <span className="mt-0.5 block truncate text-[11px] text-[var(--dashboard-text-muted)]">
                                                        {movement.item.sku}
                                                    </span>
                                                </span>
                                                <span className="truncate text-[var(--dashboard-text-secondary)]">
                                                    {movementUnit(movement)}
                                                </span>
                                                <strong
                                                    className={`font-bold tabular-nums ${presentation.quantityClass}`}
                                                >
                                                    {quantityLabel(movement)}
                                                </strong>
                                                <span
                                                    className="truncate text-[var(--dashboard-text-secondary)]"
                                                    title={
                                                        movement.motivo ?? '—'
                                                    }
                                                >
                                                    {movement.motivo ?? '—'}
                                                </span>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {meta && meta.total > 0 ? (
                            <footer className="flex min-h-14 flex-col items-center justify-between gap-3 border-t border-[var(--dashboard-border)] px-4 py-3 sm:flex-row">
                                <p className="text-xs text-[var(--dashboard-text-muted)]">
                                    Exibindo {meta.from}–{meta.to} de{' '}
                                    {meta.total} movimentações
                                </p>

                                <nav
                                    aria-label="Paginação do histórico"
                                    className="flex items-center gap-1"
                                >
                                    <button
                                        type="button"
                                        aria-label="Página anterior"
                                        disabled={meta.current_page === 1}
                                        onClick={() =>
                                            setPage((value) => value - 1)
                                        }
                                        className="flex size-8 items-center justify-center rounded-md text-[var(--dashboard-text-muted)] transition-colors hover:bg-[var(--dashboard-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronLeft className="size-4" />
                                    </button>

                                    {paginationItems(
                                        meta.last_page,
                                        meta.current_page,
                                    ).map((item) =>
                                        typeof item === 'number' ? (
                                            <button
                                                key={item}
                                                type="button"
                                                aria-current={
                                                    item === meta.current_page
                                                        ? 'page'
                                                        : undefined
                                                }
                                                onClick={() => setPage(item)}
                                                className={`flex size-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${
                                                    item === meta.current_page
                                                        ? 'bg-[var(--dashboard-surface-active)] text-[var(--dashboard-text)]'
                                                        : 'text-[var(--dashboard-text-muted)] hover:bg-[var(--dashboard-surface-hover)]'
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        ) : (
                                            <span
                                                key={item}
                                                className="flex size-8 items-center justify-center text-xs text-[var(--dashboard-text-subtle)]"
                                            >
                                                …
                                            </span>
                                        ),
                                    )}

                                    <button
                                        type="button"
                                        aria-label="Próxima página"
                                        disabled={
                                            meta.current_page === meta.last_page
                                        }
                                        onClick={() =>
                                            setPage((value) => value + 1)
                                        }
                                        className="flex size-8 items-center justify-center rounded-md text-[var(--dashboard-text-muted)] transition-colors hover:bg-[var(--dashboard-surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <ChevronRight className="size-4" />
                                    </button>
                                </nav>
                            </footer>
                        ) : null}
                    </section>
                </div>
            </div>
        </>
    );
}
