import { usePage } from '@inertiajs/react';
import { Settings } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { DashboardSettingsDialog } from '@/components/dashboard-settings-dialog';
import {
    DashboardAccountSwitcher,
    DashboardSidebar,
} from '@/components/dashboard-sidebar';
import { DashboardScopeProvider } from '@/contexts/dashboard-scope-context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <DashboardScopeProvider>
            <DashboardShell>{children}</DashboardShell>
        </DashboardScopeProvider>
    );
}

function DashboardShell({ children }: { children: ReactNode }) {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const { url } = usePage();
    const activeItem = url.startsWith('/movimentacao')
        ? 'Movimentação'
        : url.startsWith('/sugestoes')
          ? 'Sugestões'
          : url.startsWith('/alertas')
            ? 'Alertas'
            : url.startsWith('/historico')
              ? 'Histórico'
              : url.startsWith('/analise-consumo')
                ? 'Análise de consumo'
                : 'Dashboard';

    return (
        <div className="dashboard-theme h-dvh w-full overflow-hidden bg-[var(--dashboard-canvas)] [font-family:Inter,ui-sans-serif,system-ui,sans-serif] text-[var(--dashboard-text)] transition-colors duration-200">
            <DashboardSidebar
                activeItem={activeItem}
                onOpenSettings={() => setSettingsOpen(true)}
            />

            <div className="flex h-full min-w-0 flex-col md:pl-56 lg:pl-60 xl:pl-64">
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--dashboard-border)] bg-[var(--dashboard-sidebar)] px-4 md:hidden">
                    <DashboardAccountSwitcher compact />
                    <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        className="flex size-9 shrink-0 items-center justify-center rounded-md text-[var(--dashboard-text-secondary)] transition-colors hover:bg-[var(--dashboard-surface-hover)]"
                        aria-label="Abrir configurações"
                    >
                        <Settings className="size-5" />
                    </button>
                </header>

                <main
                    id="dashboard-content"
                    className="min-h-0 min-w-0 flex-1 [scrollbar-gutter:stable] overflow-x-hidden overflow-y-auto overscroll-contain"
                >
                    {children}
                </main>
            </div>

            <DashboardSettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
            />
        </div>
    );
}
