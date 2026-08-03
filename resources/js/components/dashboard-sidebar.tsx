import { Link } from '@inertiajs/react';
import {
    Building2,
    ChartNoAxesColumnIncreasing,
    Check,
    ChevronDown,
    CircleHelp,
    History,
    LayoutGrid,
    Lightbulb,
    PackageOpen,
    School,
    Settings,
    TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashboardScope } from '@/contexts/dashboard-scope-context';
import { dashboard } from '@/routes';

type NavigationItem = {
    label: string;
    icon: LucideIcon;
    href?: string;
};

type DashboardSidebarProps = {
    activeItem?: string;
    onOpenSettings: () => void;
};

const navigation: NavigationItem[] = [
    { label: 'Dashboard', icon: LayoutGrid, href: dashboard().url },
    { label: 'Movimentação', icon: PackageOpen, href: '/movimentacao' },
    { label: 'Sugestões', icon: Lightbulb, href: '/sugestoes' },
    { label: 'Alertas', icon: TriangleAlert, href: '/alertas' },
    { label: 'Histórico', icon: History, href: '/historico' },
    { label: 'Análise de consumo', icon: ChartNoAxesColumnIncreasing },
];

const itemClassName =
    'flex h-9 w-full shrink-0 items-center gap-3 rounded-md px-3 text-left text-sm transition-colors';

function UnitGlyph({
    unitName,
    className,
}: {
    unitName: string;
    className: string;
}) {
    if (/central|administrativa/i.test(unitName)) {
        return <Building2 className={className} />;
    }

    return <School className={className} />;
}

export function DashboardAccountSwitcher({
    compact = false,
}: {
    compact?: boolean;
}) {
    const {
        units,
        selectedUnitId,
        selectedUnit,
        scopeName,
        canSelectGroup,
        ready,
        selectUnit,
    } = useDashboardScope();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={`flex items-center gap-3 rounded-md text-left transition-colors hover:bg-[var(--dashboard-surface-hover)] data-[state=open]:bg-[var(--dashboard-surface-hover)] ${
                        compact
                            ? 'h-10 max-w-[calc(100vw-4.75rem)] px-2'
                            : 'h-9 w-full px-3'
                    }`}
                    aria-label={`Selecionar sede. Contexto atual: ${scopeName}`}
                    data-test="dashboard-scope-trigger"
                >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--dashboard-accent)] text-xs font-extrabold text-[var(--dashboard-accent-foreground)]">
                        {selectedUnit ? (
                            <UnitGlyph
                                unitName={selectedUnit.nome}
                                className="size-3.5"
                            />
                        ) : (
                            'P'
                        )}
                    </span>
                    <span className="min-w-0 truncate text-sm leading-tight font-semibold">
                        {ready ? scopeName : 'Carregando sedes...'}
                    </span>
                    <ChevronDown className="ml-auto size-4 shrink-0 text-[var(--dashboard-text-muted)]" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 overflow-y-auto border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] p-1.5 text-[var(--dashboard-text-secondary)] shadow-xl"
            >
                <DropdownMenuLabel className="px-2 py-1 text-[10px] font-bold tracking-wide text-[var(--dashboard-text-subtle)]">
                    TROCAR CONTA
                </DropdownMenuLabel>

                {canSelectGroup && (
                    <DropdownMenuItem
                        onSelect={() => selectUnit(null)}
                        className={`h-10 gap-2.5 px-2 text-xs focus:bg-[var(--dashboard-surface-muted)] focus:text-[var(--dashboard-text)] ${
                            selectedUnitId === null
                                ? 'bg-[var(--dashboard-surface-active)] font-semibold text-[var(--dashboard-text)]'
                                : ''
                        }`}
                        data-test="dashboard-scope-group"
                    >
                        {selectedUnitId === null ? (
                            <Check className="size-4 text-[var(--dashboard-success-text)]" />
                        ) : (
                            <Building2 className="size-4 text-[var(--dashboard-text-muted)]" />
                        )}
                        <span className="truncate">Grupo Positivo</span>
                    </DropdownMenuItem>
                )}

                {units.map((unit) => {
                    const selected = selectedUnitId === unit.id;

                    return (
                        <DropdownMenuItem
                            key={unit.id}
                            onSelect={() => selectUnit(unit.id)}
                            className={`h-10 gap-2.5 px-2 text-xs focus:bg-[var(--dashboard-surface-muted)] focus:text-[var(--dashboard-text)] ${
                                selected
                                    ? 'bg-[var(--dashboard-surface-active)] font-semibold text-[var(--dashboard-text)]'
                                    : ''
                            }`}
                            data-test={`dashboard-scope-unit-${unit.id}`}
                        >
                            {selected ? (
                                <Check className="size-4 text-[var(--dashboard-success-text)]" />
                            ) : (
                                <UnitGlyph
                                    unitName={unit.nome}
                                    className="size-4 text-[var(--dashboard-text-muted)]"
                                />
                            )}
                            <span className="truncate">{unit.nome}</span>
                        </DropdownMenuItem>
                    );
                })}

                {ready && units.length === 0 && (
                    <DropdownMenuItem disabled className="h-10 px-2 text-xs">
                        Nenhuma sede disponível
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function DashboardSidebar({
    activeItem = 'Dashboard',
    onOpenSettings,
}: DashboardSidebarProps) {
    return (
        <aside
            aria-label="Navegação principal"
            className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-56 flex-col overflow-hidden border-r border-[var(--dashboard-border)] bg-[var(--dashboard-sidebar)] p-4 transition-colors duration-200 md:flex lg:w-60 xl:w-64"
        >
            <div className="flex h-10 shrink-0 items-center">
                <DashboardAccountSwitcher />
            </div>

            <nav className="mt-6 flex min-h-0 flex-1 [scrollbar-gutter:stable] flex-col gap-1 overflow-y-auto overscroll-contain">
                <span className="flex h-7 shrink-0 items-center px-3 text-xs font-medium text-[var(--dashboard-text-subtle)]">
                    OPERAÇÃO
                </span>
                {navigation.map(({ label, icon: Icon, href }) => {
                    const active = label === activeItem;
                    const className = `${itemClassName} ${
                        active
                            ? 'bg-[var(--dashboard-surface-active)] font-semibold text-[var(--dashboard-text)]'
                            : 'text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-surface-hover)]'
                    }`;

                    if (href) {
                        return (
                            <Link
                                key={label}
                                href={href}
                                aria-current={active ? 'page' : undefined}
                                className={className}
                            >
                                <Icon
                                    className="size-4 shrink-0"
                                    strokeWidth={1.6}
                                />
                                <span className="truncate">{label}</span>
                            </Link>
                        );
                    }

                    return (
                        <button
                            key={label}
                            type="button"
                            aria-disabled="true"
                            className={`${className} cursor-default`}
                        >
                            <Icon
                                className="size-4 shrink-0"
                                strokeWidth={1.6}
                            />
                            <span className="truncate">{label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="flex shrink-0 flex-col gap-1 border-t border-[var(--dashboard-border)] pt-4">
                <button
                    type="button"
                    onClick={onOpenSettings}
                    className={`${itemClassName} text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-surface-hover)]`}
                >
                    <Settings className="size-4 shrink-0" strokeWidth={1.6} />
                    <span className="truncate">Configurações</span>
                </button>
                <button
                    type="button"
                    className={`${itemClassName} text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-surface-hover)]`}
                >
                    <CircleHelp className="size-4 shrink-0" strokeWidth={1.6} />
                    <span className="truncate">Ajuda</span>
                </button>
            </div>
        </aside>
    );
}
