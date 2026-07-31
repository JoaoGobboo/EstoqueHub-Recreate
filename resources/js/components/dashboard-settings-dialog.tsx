import { Link, router, usePage } from '@inertiajs/react';
import { BellRing, CalendarDays, Check, LogOut, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAppearance } from '@/hooks/use-appearance';
import { logout } from '@/routes';
import type { User } from '@/types';

type Unidade = {
    id: number;
    nome: string;
};

type DashboardSettings = {
    defaultUnit: string;
    alertRule: 'below-minimum' | 'zero-stock';
    stockAlerts: boolean;
    weeklySummary: boolean;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const storageKey = 'estoquehub-dashboard-settings';
const initialSettings: DashboardSettings = {
    defaultUnit: '',
    alertRule: 'below-minimum',
    stockAlerts: true,
    weeklySummary: false,
};

const themeOptions = [
    {
        value: 'light',
        label: 'Claro',
        description: 'Leve, arejado e com alto contraste',
        icon: Sun,
        colors: {
            canvas: '#f3f6fa',
            sidebar: '#ffffff',
            card: '#ffffff',
            border: '#dce3eb',
            text: '#18212f',
        },
    },
    {
        value: 'dark',
        label: 'Escuro',
        description: 'Menos brilho para ambientes escuros',
        icon: Moon,
        colors: {
            canvas: '#09090b',
            sidebar: '#0c0c0f',
            card: '#18181b',
            border: '#3f3f46',
            text: '#fafafa',
        },
    },
] as const;

function SettingsSection({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-panel)] p-4 transition-colors sm:p-5">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-[var(--dashboard-text)]">
                    {title}
                </h3>
                <p className="mt-1 text-xs text-[var(--dashboard-text-muted)]">
                    {description}
                </p>
            </div>
            {children}
        </section>
    );
}

function PreferenceToggle({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-7 w-12 shrink-0 appearance-none items-center justify-center self-center justify-self-end rounded-full border p-0 transition-colors focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dashboard-panel)] focus-visible:outline-none ${
                checked
                    ? 'border-[var(--dashboard-accent)] bg-[var(--dashboard-accent)]'
                    : 'border-[var(--dashboard-border-strong)] bg-[var(--dashboard-switch-track)]'
            }`}
        >
            <span
                className={`pointer-events-none absolute top-1/2 left-1 size-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
            <span className="sr-only">
                {checked ? 'Ativado' : 'Desativado'}
            </span>
        </button>
    );
}

function NotificationPreference({
    icon: Icon,
    title,
    description,
    checked,
    onChange,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="grid min-h-[4.5rem] grid-cols-[2.25rem_minmax(0,1fr)_3rem] items-center gap-x-3 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3.5 py-3 transition-colors">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
                <Icon className="size-4" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--dashboard-text)]">
                    {title}
                </p>
                <p className="mt-0.5 text-xs text-[var(--dashboard-text-muted)]">
                    {description}
                </p>
            </div>
            <PreferenceToggle
                checked={checked}
                onChange={onChange}
                label={title}
            />
        </div>
    );
}

export function DashboardSettingsDialog({ open, onOpenChange }: Props) {
    const page = usePage();
    const user = (page.props.auth as { user?: User } | undefined)?.user;
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const [settings, setSettings] = useState<DashboardSettings>(() => {
        if (typeof window === 'undefined') {
            return initialSettings;
        }

        const savedSettings = localStorage.getItem(storageKey);

        if (!savedSettings) {
            return initialSettings;
        }

        try {
            return {
                ...initialSettings,
                ...(JSON.parse(savedSettings) as Partial<DashboardSettings>),
            };
        } catch {
            localStorage.removeItem(storageKey);

            return initialSettings;
        }
    });
    const [units, setUnits] = useState<Unidade[]>([]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const controller = new AbortController();

        fetch('/api/unidades', {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Nao foi possivel carregar as unidades.');
                }

                return response.json() as Promise<{ data: Unidade[] }>;
            })
            .then(({ data }) => {
                setUnits(data);
                setSettings((current) => ({
                    ...current,
                    defaultUnit:
                        current.defaultUnit || String(data.at(0)?.id ?? ''),
                }));
            })
            .catch((error: unknown) => {
                if (!(
                    error instanceof DOMException && error.name === 'AbortError'
                )) {
                    setUnits([]);
                }
            });

        return () => controller.abort();
    }, [open]);

    const saveSettings = () => {
        localStorage.setItem(storageKey, JSON.stringify(settings));
        window.dispatchEvent(new CustomEvent('estoquehub:settings-saved'));
        onOpenChange(false);
    };

    const handleLogout = () => {
        onOpenChange(false);
        router.flushAll();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100vh-2rem)] max-w-[700px] gap-0 overflow-y-auto border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] p-0 text-[var(--dashboard-text)] shadow-[var(--dashboard-shadow)] transition-colors sm:max-w-[700px]">
                <DialogHeader className="border-b border-[var(--dashboard-border)] px-5 py-4 text-left sm:px-6">
                    <DialogTitle className="text-lg font-bold">
                        Configura&ccedil;&otilde;es
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[var(--dashboard-text-muted)] sm:text-sm">
                        Ajuste prefer&ecirc;ncias do controle de estoque.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 p-4 sm:p-5">
                    <SettingsSection
                        title="Preferências de estoque"
                        description="Aplicado a novos registros"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-2 text-xs font-medium text-[var(--dashboard-text-muted)]">
                                Unidade padr&atilde;o
                                <Select
                                    value={settings.defaultUnit}
                                    onValueChange={(defaultUnit) =>
                                        setSettings((current) => ({
                                            ...current,
                                            defaultUnit,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full border-[var(--dashboard-border-strong)] bg-[var(--dashboard-input)] text-[var(--dashboard-text-secondary)]">
                                        <SelectValue placeholder="Selecione uma unidade" />
                                    </SelectTrigger>
                                    <SelectContent className="border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text-secondary)]">
                                        {units.map((unit) => (
                                            <SelectItem
                                                key={unit.id}
                                                value={String(unit.id)}
                                            >
                                                {unit.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </label>

                            <label className="grid gap-2 text-xs font-medium text-[var(--dashboard-text-muted)]">
                                Regra de alerta
                                <Select
                                    value={settings.alertRule}
                                    onValueChange={(alertRule) =>
                                        setSettings((current) => ({
                                            ...current,
                                            alertRule:
                                                alertRule as DashboardSettings['alertRule'],
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full border-[var(--dashboard-border-strong)] bg-[var(--dashboard-input)] text-[var(--dashboard-text-secondary)]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text-secondary)]">
                                        <SelectItem value="below-minimum">
                                            Abaixo do m&iacute;nimo
                                        </SelectItem>
                                        <SelectItem value="zero-stock">
                                            Somente estoque zerado
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </label>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title="Alertas e notificações"
                        description="Avisos operacionais"
                    >
                        <div className="grid gap-2.5">
                            <NotificationPreference
                                icon={BellRing}
                                title="Alertas de estoque"
                                description="Avise quando um item atingir a regra definida"
                                checked={settings.stockAlerts}
                                onChange={(stockAlerts) =>
                                    setSettings((current) => ({
                                        ...current,
                                        stockAlerts,
                                    }))
                                }
                            />
                            <NotificationPreference
                                icon={CalendarDays}
                                title="Resumo semanal"
                                description="Receba um consolidado periódico do estoque"
                                checked={settings.weeklySummary}
                                onChange={(weeklySummary) =>
                                    setSettings((current) => ({
                                        ...current,
                                        weeklySummary,
                                    }))
                                }
                            />
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title="Aparência"
                        description="Escolha a paleta visual do dashboard"
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            {themeOptions.map((theme) => {
                                const Icon = theme.icon;
                                const selected =
                                    resolvedAppearance === theme.value;

                                return (
                                    <button
                                        key={theme.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() =>
                                            updateAppearance(theme.value)
                                        }
                                        data-test={`dashboard-theme-${theme.value}`}
                                        className={`relative grid gap-3 rounded-lg border p-3 text-left transition-all focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:outline-none ${
                                            selected
                                                ? 'border-[var(--dashboard-accent)] bg-[var(--dashboard-accent-soft)] ring-1 ring-[var(--dashboard-accent)]'
                                                : 'border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] hover:border-[var(--dashboard-border-strong)] hover:bg-[var(--dashboard-surface-hover)]'
                                        }`}
                                    >
                                        <span
                                            className="flex h-16 overflow-hidden rounded-md border"
                                            style={{
                                                backgroundColor:
                                                    theme.colors.canvas,
                                                borderColor:
                                                    theme.colors.border,
                                            }}
                                            aria-hidden="true"
                                        >
                                            <span
                                                className="w-6 shrink-0 border-r"
                                                style={{
                                                    backgroundColor:
                                                        theme.colors.sidebar,
                                                    borderColor:
                                                        theme.colors.border,
                                                }}
                                            />
                                            <span className="flex flex-1 flex-col gap-1.5 p-2">
                                                <span
                                                    className="h-1.5 w-14 rounded-full opacity-40"
                                                    style={{
                                                        backgroundColor:
                                                            theme.colors.text,
                                                    }}
                                                />
                                                <span
                                                    className="flex flex-1 items-end rounded border p-1.5"
                                                    style={{
                                                        backgroundColor:
                                                            theme.colors.card,
                                                        borderColor:
                                                            theme.colors.border,
                                                    }}
                                                >
                                                    <span className="h-2 w-8 rounded-full bg-[#f58220]" />
                                                </span>
                                            </span>
                                        </span>
                                        <span className="flex items-start gap-2.5">
                                            <Icon className="mt-0.5 size-4 shrink-0 text-[var(--dashboard-accent)]" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-semibold text-[var(--dashboard-text)]">
                                                    {theme.label}
                                                </span>
                                                <span className="mt-0.5 block text-xs leading-snug text-[var(--dashboard-text-muted)]">
                                                    {theme.description}
                                                </span>
                                            </span>
                                            {selected && (
                                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--dashboard-accent)] text-[var(--dashboard-accent-foreground)]">
                                                    <Check className="size-3.5" />
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-3 text-xs text-[var(--dashboard-text-subtle)]">
                            A prévia é aplicada imediatamente em toda a tela.
                        </p>
                    </SettingsSection>

                    <SettingsSection title="Conta" description="Sessão atual">
                        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                            <span className="min-w-0 text-sm break-words text-[var(--dashboard-text-secondary)]">
                                {user?.name ?? 'Usu\u00e1rio'} &middot;{' '}
                                {user?.email ?? 'E-mail indispon\u00edvel'}
                            </span>
                            <Link
                                href={logout()}
                                as="button"
                                onClick={handleLogout}
                                data-test="logout-button"
                                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-[var(--dashboard-danger-border)] px-3 text-sm font-semibold text-[var(--dashboard-danger-text)] transition-colors hover:bg-[var(--dashboard-danger-bg)]"
                            >
                                <LogOut className="size-4" />
                                Sair
                            </Link>
                        </div>
                    </SettingsSection>
                </div>

                <DialogFooter className="items-stretch border-t border-[var(--dashboard-border)] px-4 py-4 sm:items-center sm:justify-between sm:px-5">
                    <p className="text-xs text-[var(--dashboard-text-subtle)]">
                        Altera&ccedil;&otilde;es aplicadas ao pr&oacute;ximo
                        carregamento.
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-surface-hover)] hover:text-[var(--dashboard-text)]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={saveSettings}
                            className="bg-[var(--dashboard-accent)] font-bold text-[var(--dashboard-accent-foreground)] hover:bg-[var(--dashboard-accent-hover)]"
                        >
                            Salvar altera&ccedil;&otilde;es
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
