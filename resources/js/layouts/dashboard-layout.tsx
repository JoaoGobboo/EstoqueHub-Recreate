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

    return (
        <div className="h-dvh w-full overflow-hidden bg-[#09090b] [font-family:Inter,ui-sans-serif,system-ui,sans-serif] text-[#fafafa]">
            <DashboardSidebar onOpenSettings={() => setSettingsOpen(true)} />

            <div className="flex h-full min-w-0 flex-col md:pl-56 lg:pl-60 xl:pl-64">
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#27272a] bg-[#09090b] px-4 md:hidden">
                    <DashboardAccountSwitcher compact />
                    <button
                        type="button"
                        onClick={() => setSettingsOpen(true)}
                        className="flex size-9 shrink-0 items-center justify-center rounded-md text-[#d4d4d8] hover:bg-[#18181b]"
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
