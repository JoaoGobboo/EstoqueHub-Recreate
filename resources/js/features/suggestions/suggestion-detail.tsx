import { Check, LoaderCircle, Plus } from 'lucide-react';
import type {
    Suggestion,
    SuggestionPresentation,
} from '@/features/suggestions/types';

type Props = {
    actionError: string | null;
    currentStock: (suggestion: Suggestion) => number;
    isSubmitting: boolean;
    onAction: (suggestion: Suggestion) => Promise<void>;
    presentation: SuggestionPresentation;
    suggestion: Suggestion;
};

export function SuggestionDetail({
    actionError,
    currentStock,
    isSubmitting,
    onAction,
    presentation,
    suggestion,
}: Props) {
    const isPending = Boolean(suggestion.requisicao_compra);
    const isTransfer = suggestion.tipo === 'transferencia';

    return (
        <div className="flex min-h-64 flex-col gap-4">
            <p className="text-[11px] font-bold tracking-wide text-[var(--dashboard-text-muted)]">
                DETALHE DA SUGESTÃO
            </p>
            <div>
                <h2 className="text-lg font-bold text-[var(--dashboard-text)]">
                    {suggestion.item.nome}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[var(--dashboard-text-muted)]">
                    {presentation.description}
                </p>
            </div>
            <div className="h-px bg-[var(--dashboard-border-strong)]" />
            <dl className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-[var(--dashboard-text-muted)]">
                        Saldo atual
                    </dt>
                    <dd className="font-semibold text-[var(--dashboard-danger-text)] tabular-nums">
                        {currentStock(suggestion)} unidades
                    </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <dt className="text-[var(--dashboard-text-muted)]">
                        Mínimo configurado
                    </dt>
                    <dd className="font-semibold text-[var(--dashboard-text)] tabular-nums">
                        {suggestion.item.estoque_minimo} unidades
                    </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                    <dt className="text-[var(--dashboard-text-muted)]">
                        Sugestão
                    </dt>
                    <dd className="text-right font-semibold text-[var(--dashboard-positive-text)]">
                        {isTransfer ? 'Transferir' : 'Comprar'}{' '}
                        {suggestion.quantidade} unidades
                    </dd>
                </div>
                {isTransfer && suggestion.unidade_origem ? (
                    <div className="flex items-start justify-between gap-4">
                        <dt className="text-[var(--dashboard-text-muted)]">
                            Origem
                        </dt>
                        <dd className="max-w-40 text-right font-semibold text-[var(--dashboard-text)]">
                            {suggestion.unidade_origem.nome}
                        </dd>
                    </div>
                ) : null}
            </dl>
            {actionError ? (
                <p
                    role="alert"
                    className="rounded-md border border-[var(--dashboard-danger-border)] bg-[var(--dashboard-danger-bg)] px-3 py-2 text-xs text-[var(--dashboard-danger-text)]"
                >
                    {actionError}
                </p>
            ) : null}
            <button
                type="button"
                onClick={() => void onAction(suggestion)}
                disabled={isSubmitting || isPending}
                className="mt-auto inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--dashboard-accent)] px-4 text-xs font-extrabold text-[var(--dashboard-accent-foreground)] transition-colors hover:bg-[var(--dashboard-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dashboard-surface)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55"
            >
                {isSubmitting ? (
                    <LoaderCircle className="size-4 animate-spin" />
                ) : isPending ? (
                    <Check className="size-4" />
                ) : (
                    <Plus className="size-4" />
                )}
                {isSubmitting
                    ? 'Processando...'
                    : isPending
                      ? 'Solicitação pendente'
                      : isTransfer
                        ? 'Aprovar transferência'
                        : 'Criar solicitação'}
            </button>
        </div>
    );
}
