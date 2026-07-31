import { Link, router, usePage } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
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
        <section className="rounded-lg border border-[#27272a] bg-[#09090b] p-4">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-[#fafafa]">
                    {title}
                </h3>
                <p className="mt-1 text-xs text-[#71717a]">{description}</p>
            </div>
            {children}
        </section>
    );
}

function PreferenceToggle({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-11 rounded-full border transition-colors ${
                checked
                    ? 'border-[#f58220] bg-[#f58220]'
                    : 'border-[#3f3f46] bg-[#27272a]'
            }`}
        >
            <span
                className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-5' : 'translate-x-1'
                }`}
            />
            <span className="sr-only">
                {checked ? 'Ativado' : 'Desativado'}
            </span>
        </button>
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
            <DialogContent className="max-h-[calc(100vh-2rem)] max-w-[680px] gap-0 overflow-y-auto border-[#3f3f46] bg-[#18181b] p-0 text-[#fafafa] sm:max-w-[680px]">
                <DialogHeader className="border-b border-[#27272a] px-5 py-4 text-left">
                    <DialogTitle className="text-lg font-bold">
                        Configura&ccedil;&otilde;es
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#a1a1aa] sm:text-sm">
                        Ajuste prefer&ecirc;ncias do controle de estoque.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 p-5">
                    <SettingsSection
                        title="Preferências de estoque"
                        description="Aplicado a novos registros"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="grid gap-2 text-xs text-[#a1a1aa]">
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
                                    <SelectTrigger className="w-full border-[#3f3f46] bg-[#18181b] text-[#d4d4d8]">
                                        <SelectValue placeholder="Selecione uma unidade" />
                                    </SelectTrigger>
                                    <SelectContent className="border-[#3f3f46] bg-[#18181b] text-[#d4d4d8]">
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

                            <label className="grid gap-2 text-xs text-[#a1a1aa]">
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
                                    <SelectTrigger className="w-full border-[#3f3f46] bg-[#18181b] text-[#d4d4d8]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-[#3f3f46] bg-[#18181b] text-[#d4d4d8]">
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
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-center justify-between gap-3 text-sm text-[#d4d4d8]">
                                Alertas de estoque
                                <PreferenceToggle
                                    checked={settings.stockAlerts}
                                    onChange={(stockAlerts) =>
                                        setSettings((current) => ({
                                            ...current,
                                            stockAlerts,
                                        }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 text-sm text-[#d4d4d8]">
                                Resumo semanal
                                <PreferenceToggle
                                    checked={settings.weeklySummary}
                                    onChange={(weeklySummary) =>
                                        setSettings((current) => ({
                                            ...current,
                                            weeklySummary,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title="Aparência"
                        description="Tema da interface"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-[#d4d4d8]">Tema</span>
                            <div className="flex rounded-md border border-[#3f3f46] p-1">
                                {(['dark', 'light'] as const).map((theme) => (
                                    <button
                                        key={theme}
                                        type="button"
                                        onClick={() => updateAppearance(theme)}
                                        className={`rounded px-4 py-1.5 text-xs font-semibold transition-colors ${
                                            resolvedAppearance === theme
                                                ? 'bg-[#f58220] text-[#052e16]'
                                                : 'text-[#a1a1aa] hover:text-[#fafafa]'
                                        }`}
                                    >
                                        {theme === 'dark' ? 'Escuro' : 'Claro'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection title="Conta" description="Sessão atual">
                        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                            <span className="text-sm text-[#d4d4d8]">
                                {user?.name ?? 'Usu\u00e1rio'} &middot;{' '}
                                {user?.email ?? 'E-mail indispon\u00edvel'}
                            </span>
                            <Link
                                href={logout()}
                                as="button"
                                onClick={handleLogout}
                                data-test="logout-button"
                                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#7f1d1d] px-3 text-sm font-semibold text-[#fda4af] transition-colors hover:bg-[#7f1d1d]/30"
                            >
                                <LogOut className="size-4" />
                                Sair
                            </Link>
                        </div>
                    </SettingsSection>
                </div>

                <DialogFooter className="items-center border-t border-[#27272a] px-5 py-4 sm:justify-between">
                    <p className="text-xs text-[#71717a]">
                        Altera&ccedil;&otilde;es aplicadas ao pr&oacute;ximo
                        carregamento.
                    </p>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="border-[#3f3f46] bg-[#18181b] text-[#d4d4d8] hover:bg-[#27272a] hover:text-[#fafafa]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={saveSettings}
                            className="bg-[#f58220] font-bold text-[#052e16] hover:bg-[#fb923c]"
                        >
                            Salvar altera&ccedil;&otilde;es
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
