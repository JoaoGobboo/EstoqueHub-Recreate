import { Head } from '@inertiajs/react';
import { DashboardMovementForm } from '@/components/dashboard-movement-dialog';

export default function Movimentacao() {
    return (
        <>
            <Head title="Movimentação" />

            <div className="min-h-full w-full min-w-0 bg-[var(--dashboard-canvas)] px-4 py-5 transition-colors sm:px-6 sm:py-6 lg:px-8 lg:py-8">
                <div className="mx-auto flex w-full max-w-[1120px] min-w-0 flex-col gap-6">
                    <header className="flex min-h-12 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-col gap-1">
                            <h1 className="text-xl leading-tight font-bold text-[var(--dashboard-text)] sm:text-2xl lg:text-3xl">
                                Nova movimentação
                            </h1>
                            <p className="text-xs text-[var(--dashboard-text-muted)] sm:text-sm">
                                Registre entradas, saídas e transferências de
                                estoque.
                            </p>
                        </div>
                    </header>

                    <DashboardMovementForm />
                </div>
            </div>
        </>
    );
}
