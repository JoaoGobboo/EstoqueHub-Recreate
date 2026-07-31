import {
    ArrowDownToLine,
    ArrowLeftRight,
    ArrowRight,
    ArrowUpFromLine,
    Check,
    Info,
    LoaderCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { useDashboardScope } from '@/contexts/dashboard-scope-context';

type MovementType = 'entrada' | 'saida' | 'transferencia';

type MovementItem = {
    id: number;
    sku: string;
    nome: string;
    estoque_minimo: number;
};

type UnitBalance = {
    unidade_id: number;
    quantidade: number;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
};

type MovementFormVariant = 'dialog' | 'page';

type MovementFormContentProps = {
    active: boolean;
    variant: MovementFormVariant;
    onCompleted?: () => void;
    onCreated: () => void;
};

type DashboardMovementFormProps = {
    onCreated?: () => void;
};

type ApiError = {
    message?: string;
    errors?: Record<string, string[]>;
};

const movementOptions: Array<{
    value: MovementType;
    label: string;
    confirmationLabel: string;
    icon: LucideIcon;
}> = [
    {
        value: 'entrada',
        label: 'Entrada',
        confirmationLabel: 'Confirmar entrada',
        icon: ArrowDownToLine,
    },
    {
        value: 'saida',
        label: 'Saída',
        confirmationLabel: 'Confirmar saída',
        icon: ArrowUpFromLine,
    },
    {
        value: 'transferencia',
        label: 'Transferência',
        confirmationLabel: 'Confirmar transferência',
        icon: ArrowLeftRight,
    },
];

const controlClassName =
    'h-11 w-full border-[var(--dashboard-border-strong)] bg-[var(--dashboard-input)] text-sm text-[var(--dashboard-text)] shadow-none outline-none transition-colors placeholder:text-[var(--dashboard-text-subtle)] focus-visible:border-[var(--dashboard-accent)] focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/20 data-[size=default]:h-11';

const selectContentClassName =
    'max-h-72 w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text-secondary)]';

const selectItemClassName =
    'min-w-0 py-2.5 text-sm [&>span:last-child]:min-w-0 [&>span:last-child]:truncate';

function MovementField({
    label,
    children,
    className = '',
}: {
    label: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <label className={`grid min-w-0 gap-2 ${className}`}>
            <span className="text-[13px] leading-4 font-semibold text-[var(--dashboard-text)]">
                {label}
            </span>
            {children}
        </label>
    );
}

function ImpactLine({
    label,
    current,
    projected,
    invalid = false,
}: {
    label: string;
    current: number;
    projected: number;
    invalid?: boolean;
}) {
    return (
        <div className="flex min-w-0 items-center gap-4 rounded-md bg-[var(--dashboard-panel)] px-4 py-3">
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-[var(--dashboard-text-muted)]">
                    {label}
                </p>
                <p className="mt-1 text-sm text-[var(--dashboard-text-subtle)]">
                    Saldo atual
                </p>
                <p className="text-lg font-bold text-[var(--dashboard-text)] tabular-nums">
                    {current}
                </p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-[var(--dashboard-text-subtle)]" />
            <div className="min-w-0 flex-1 text-right">
                <p className="text-sm text-[var(--dashboard-text-subtle)]">
                    Projeção
                </p>
                <p
                    className={`text-lg font-bold tabular-nums ${
                        invalid
                            ? 'text-[var(--dashboard-danger-text)]'
                            : 'text-[var(--dashboard-success-text)]'
                    }`}
                >
                    {projected}
                </p>
            </div>
        </div>
    );
}

function readCsrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}

function MovementFormContent({
    active,
    variant,
    onCompleted,
    onCreated,
}: MovementFormContentProps) {
    const { units, selectedUnitId } = useDashboardScope();
    const scopedUnitId = selectedUnitId === null ? '' : String(selectedUnitId);
    const [movementType, setMovementType] = useState<MovementType>('entrada');
    const [items, setItems] = useState<MovementItem[]>([]);
    const [itemId, setItemId] = useState('');
    const [unitId, setUnitId] = useState(scopedUnitId);
    const [originUnitId, setOriginUnitId] = useState(scopedUnitId);
    const [destinationUnitId, setDestinationUnitId] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [reason, setReason] = useState('');
    const [balances, setBalances] = useState<UnitBalance[]>([]);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [isLoadingBalances, setIsLoadingBalances] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!active) {
            return;
        }

        const controller = new AbortController();

        fetch('/api/itens?per_page=100', {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Não foi possível carregar os itens.');
                }

                return response.json() as Promise<{ data: MovementItem[] }>;
            })
            .then(({ data }) => {
                setItems(data);
                setIsLoadingItems(false);
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setItems([]);
                setFormError(
                    error instanceof Error
                        ? error.message
                        : 'Não foi possível carregar os itens.',
                );
                setIsLoadingItems(false);
            });

        return () => controller.abort();
    }, [active]);

    useEffect(() => {
        if (!active || !itemId) {
            return;
        }

        const controller = new AbortController();

        fetch(`/api/saldos?item_id=${itemId}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Não foi possível calcular o saldo.');
                }

                return response.json() as Promise<{ data: UnitBalance[] }>;
            })
            .then(({ data }) => {
                setBalances(data);
                setIsLoadingBalances(false);
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setBalances([]);
                setFormError(
                    error instanceof Error
                        ? error.message
                        : 'Não foi possível calcular o saldo.',
                );
                setIsLoadingBalances(false);
            });

        return () => controller.abort();
    }, [active, itemId]);

    const selectedItem = items.find((item) => String(item.id) === itemId);
    const selectedUnit = units.find((unit) => String(unit.id) === unitId);
    const originUnit = units.find((unit) => String(unit.id) === originUnitId);
    const destinationUnit = units.find(
        (unit) => String(unit.id) === destinationUnitId,
    );
    const quantityValue = Number(quantity);
    const validQuantity = Number.isInteger(quantityValue) && quantityValue > 0;
    const balanceFor = (selectedId: string): number =>
        balances.find((balance) => String(balance.unidade_id) === selectedId)
            ?.quantidade ?? 0;
    const currentBalance = balanceFor(unitId);
    const originBalance = balanceFor(originUnitId);
    const destinationBalance = balanceFor(destinationUnitId);
    const sameTransferUnit =
        movementType === 'transferencia' &&
        originUnitId !== '' &&
        originUnitId === destinationUnitId;
    const insufficientBalance =
        Boolean(selectedItem) &&
        validQuantity &&
        !isLoadingBalances &&
        ((movementType === 'saida' && currentBalance < quantityValue) ||
            (movementType === 'transferencia' &&
                Boolean(originUnitId && destinationUnitId) &&
                !sameTransferUnit &&
                originBalance < quantityValue));
    const hasRequiredUnits =
        movementType === 'transferencia'
            ? Boolean(originUnitId && destinationUnitId && !sameTransferUnit)
            : Boolean(unitId);
    const impactReady = Boolean(
        selectedItem && validQuantity && hasRequiredUnits,
    );
    const canSubmit =
        impactReady &&
        !insufficientBalance &&
        !isSubmitting &&
        !isLoadingBalances;
    const activeOption =
        movementOptions.find((option) => option.value === movementType) ??
        movementOptions[0];
    const activeMovementIndex = movementOptions.findIndex(
        (option) => option.value === movementType,
    );

    const impactToneClass = useMemo(() => {
        if (movementType === 'entrada') {
            return 'text-[var(--dashboard-success-text)]';
        }

        if (movementType === 'saida') {
            return 'text-[var(--dashboard-danger-text)]';
        }

        return 'text-[var(--dashboard-accent)]';
    }, [movementType]);

    const selectMovementType = (nextType: MovementType) => {
        setMovementType(nextType);
        setFormError(null);

        if (nextType === 'transferencia' && !originUnitId) {
            setOriginUnitId(unitId);
        }

        if (nextType !== 'transferencia' && !unitId) {
            setUnitId(originUnitId);
        }
    };

    const submitMovement = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!canSubmit || !selectedItem) {
            return;
        }

        const payload: Record<string, number | string> = {
            tipo: movementType,
            item_id: selectedItem.id,
            quantidade: quantityValue,
        };

        if (movementType === 'transferencia') {
            payload.unidade_origem_id = Number(originUnitId);
            payload.unidade_destino_id = Number(destinationUnitId);
        } else {
            payload.unidade_id = Number(unitId);
        }

        if (reason.trim()) {
            payload.motivo = reason.trim();
        }

        setIsSubmitting(true);
        setFormError(null);

        try {
            const response = await fetch('/api/movimentacoes', {
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
                const validationMessage = responseBody?.errors
                    ? Object.values(responseBody.errors).flat().at(0)
                    : null;

                throw new Error(
                    validationMessage ??
                        responseBody?.message ??
                        'Não foi possível registrar a movimentação.',
                );
            }

            toast.success(`${activeOption.label} registrada com sucesso.`, {
                position: variant === 'page' ? 'top-right' : 'bottom-right',
            });

            onCompleted?.();

            if (variant === 'page') {
                setItemId('');
                setDestinationUnitId('');
                setQuantity('1');
                setReason('');
                setBalances([]);
                setIsLoadingBalances(false);
            }

            onCreated();
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : 'Não foi possível registrar a movimentação.',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {variant === 'dialog' && (
                <DialogHeader className="shrink-0 gap-1 px-6 pt-5 pb-3 text-left">
                    <DialogTitle className="text-lg leading-tight font-bold">
                        Nova movimentação
                    </DialogTitle>
                    <DialogDescription className="text-[13px] text-[var(--dashboard-text-muted)]">
                        Registre uma entrada, saída ou transferência.
                    </DialogDescription>
                </DialogHeader>
            )}

            <form
                onSubmit={submitMovement}
                className={`flex min-w-0 flex-col gap-4 ${
                    variant === 'dialog' ? 'min-h-0 flex-1 px-6 pb-5' : 'w-full'
                }`}
            >
                <section
                    className={`flex min-w-0 flex-col gap-4 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 transition-colors sm:p-5 ${
                        variant === 'dialog'
                            ? 'min-h-0 flex-1 sm:min-h-[400px] sm:flex-none'
                            : 'shadow-sm'
                    }`}
                >
                    <div className="relative isolate grid shrink-0 grid-cols-3 rounded-md bg-[var(--dashboard-surface-muted)] p-1">
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-1 left-1 z-0 w-[calc((100%_-_0.5rem)/3)] rounded bg-[var(--dashboard-accent)] shadow-sm transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none"
                            style={{
                                transform: `translateX(${activeMovementIndex * 100}%)`,
                            }}
                        />
                        {movementOptions.map((option) => {
                            const Icon = option.icon;
                            const active = movementType === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() =>
                                        selectMovementType(option.value)
                                    }
                                    aria-pressed={active}
                                    className={`relative z-10 flex h-11 min-w-0 items-center justify-center gap-2.5 rounded text-xs font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)] focus-visible:outline-none ${
                                        active
                                            ? 'text-[var(--dashboard-accent-foreground)]'
                                            : 'text-[var(--dashboard-text-secondary)] hover:bg-[var(--dashboard-surface-hover)] hover:text-[var(--dashboard-text)]'
                                    }`}
                                >
                                    <Icon className="size-4 shrink-0" />
                                    <span className="truncate">
                                        {option.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid min-w-0 shrink-0 gap-3 min-[480px]:grid-cols-2">
                        <MovementField label="Item">
                            <Select
                                value={itemId}
                                onValueChange={(value) => {
                                    setItemId(value);
                                    setBalances([]);
                                    setIsLoadingBalances(true);
                                    setFormError(null);
                                }}
                                disabled={isLoadingItems}
                            >
                                <SelectTrigger className={controlClassName}>
                                    <SelectValue
                                        placeholder={
                                            isLoadingItems
                                                ? 'Carregando itens...'
                                                : 'Selecione um item...'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent
                                    align="start"
                                    className={selectContentClassName}
                                >
                                    {items.map((item) => (
                                        <SelectItem
                                            key={item.id}
                                            value={String(item.id)}
                                            className={selectItemClassName}
                                            title={`${item.sku} — ${item.nome}`}
                                        >
                                            {item.sku} — {item.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </MovementField>

                        {movementType === 'transferencia' ? (
                            <MovementField label="Quantidade">
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    inputMode="numeric"
                                    value={quantity}
                                    onChange={(event) =>
                                        setQuantity(event.target.value)
                                    }
                                    className={`${controlClassName} rounded-md px-3.5`}
                                />
                            </MovementField>
                        ) : (
                            <MovementField label="Unidade">
                                <Select
                                    value={unitId}
                                    onValueChange={(value) => {
                                        setUnitId(value);
                                        setFormError(null);
                                    }}
                                >
                                    <SelectTrigger className={controlClassName}>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent
                                        align="start"
                                        className={selectContentClassName}
                                    >
                                        {units.map((unit) => (
                                            <SelectItem
                                                key={unit.id}
                                                value={String(unit.id)}
                                                className={selectItemClassName}
                                            >
                                                {unit.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </MovementField>
                        )}

                        {movementType === 'transferencia' ? (
                            <>
                                <MovementField label="Unidade de origem">
                                    <Select
                                        value={originUnitId}
                                        onValueChange={(value) => {
                                            setOriginUnitId(value);

                                            if (value === destinationUnitId) {
                                                setDestinationUnitId('');
                                            }

                                            setFormError(null);
                                        }}
                                    >
                                        <SelectTrigger
                                            className={controlClassName}
                                        >
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent
                                            align="start"
                                            className={selectContentClassName}
                                        >
                                            {units.map((unit) => (
                                                <SelectItem
                                                    key={unit.id}
                                                    value={String(unit.id)}
                                                    className={
                                                        selectItemClassName
                                                    }
                                                >
                                                    {unit.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </MovementField>
                                <MovementField label="Unidade de destino">
                                    <Select
                                        value={destinationUnitId}
                                        onValueChange={(value) => {
                                            setDestinationUnitId(value);
                                            setFormError(null);
                                        }}
                                    >
                                        <SelectTrigger
                                            className={controlClassName}
                                        >
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent
                                            align="start"
                                            className={selectContentClassName}
                                        >
                                            {units.map((unit) => (
                                                <SelectItem
                                                    key={unit.id}
                                                    value={String(unit.id)}
                                                    disabled={
                                                        String(unit.id) ===
                                                        originUnitId
                                                    }
                                                    className={
                                                        selectItemClassName
                                                    }
                                                >
                                                    {unit.nome}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </MovementField>
                                <MovementField
                                    label="Motivo / documento"
                                    className="col-span-full"
                                >
                                    <input
                                        type="text"
                                        maxLength={255}
                                        value={reason}
                                        onChange={(event) =>
                                            setReason(event.target.value)
                                        }
                                        placeholder="Ex.: NF-e 8842, Chamado #4410"
                                        className={`${controlClassName} rounded-md px-3.5`}
                                    />
                                </MovementField>
                            </>
                        ) : (
                            <>
                                <MovementField label="Quantidade">
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        inputMode="numeric"
                                        value={quantity}
                                        onChange={(event) =>
                                            setQuantity(event.target.value)
                                        }
                                        className={`${controlClassName} rounded-md px-3.5`}
                                    />
                                </MovementField>
                                <MovementField label="Motivo / documento">
                                    <input
                                        type="text"
                                        maxLength={255}
                                        value={reason}
                                        onChange={(event) =>
                                            setReason(event.target.value)
                                        }
                                        placeholder="Ex.: NF-e 8842, Chamado #4410"
                                        className={`${controlClassName} rounded-md px-3.5`}
                                    />
                                </MovementField>
                            </>
                        )}
                    </div>

                    {formError && (
                        <p
                            role="alert"
                            className="rounded-md border border-[var(--dashboard-danger-border)] bg-[var(--dashboard-danger-bg)] px-4 py-3 text-sm text-[var(--dashboard-danger-text)]"
                        >
                            {formError}
                        </p>
                    )}

                    {insufficientBalance && (
                        <p className="text-sm font-medium text-[var(--dashboard-danger-text)]">
                            Saldo insuficiente para esta movimentação.
                        </p>
                    )}

                    <div className="mt-auto flex shrink-0 flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <span className="flex items-center gap-2.5 text-xs leading-5 text-[var(--dashboard-text-muted)]">
                            <Info className="size-4 shrink-0" />
                            Os dados ficam disponíveis no histórico após a
                            confirmação.
                        </span>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className="inline-flex h-11 shrink-0 items-center justify-center gap-2.5 rounded-md bg-[var(--dashboard-accent)] px-5 text-sm font-extrabold text-[var(--dashboard-accent-foreground)] transition-colors hover:bg-[var(--dashboard-accent-hover)] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {isSubmitting ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Check className="size-4" />
                            )}
                            {isSubmitting
                                ? 'Registrando...'
                                : activeOption.confirmationLabel}
                        </button>
                    </div>
                </section>

                <section
                    className={`grid gap-3 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 transition-colors sm:p-5 ${
                        variant === 'dialog'
                            ? 'min-h-[104px] shrink-0 sm:min-h-0 sm:flex-1'
                            : 'min-h-[132px] shadow-sm'
                    }`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-[var(--dashboard-text-muted)]">
                            Impacto no saldo
                        </h3>
                        <span
                            className={`text-xs font-bold tracking-wide ${impactToneClass}`}
                        >
                            {activeOption.label.toLocaleUpperCase('pt-BR')}
                        </span>
                    </div>

                    {isLoadingBalances ? (
                        <div className="flex h-14 items-center gap-2.5 text-sm text-[var(--dashboard-text-subtle)]">
                            <LoaderCircle className="size-4 animate-spin" />
                            Calculando impacto...
                        </div>
                    ) : !impactReady ? (
                        <p className="py-1 text-sm leading-5 text-[var(--dashboard-text-subtle)]">
                            Selecione um item e uma unidade para visualizar o
                            saldo atual e a projeção.
                        </p>
                    ) : movementType === 'transferencia' ? (
                        <div className="grid gap-3 min-[480px]:grid-cols-2">
                            <ImpactLine
                                label={`Origem · ${originUnit?.nome ?? ''}`}
                                current={originBalance}
                                projected={originBalance - quantityValue}
                                invalid={insufficientBalance}
                            />
                            <ImpactLine
                                label={`Destino · ${destinationUnit?.nome ?? ''}`}
                                current={destinationBalance}
                                projected={destinationBalance + quantityValue}
                            />
                        </div>
                    ) : (
                        <ImpactLine
                            label={`${selectedItem?.nome ?? ''} · ${selectedUnit?.nome ?? ''}`}
                            current={currentBalance}
                            projected={
                                movementType === 'entrada'
                                    ? currentBalance + quantityValue
                                    : currentBalance - quantityValue
                            }
                            invalid={insufficientBalance}
                        />
                    )}
                </section>
            </form>
        </>
    );
}

export function DashboardMovementForm({
    onCreated = () => undefined,
}: DashboardMovementFormProps) {
    return <MovementFormContent active variant="page" onCreated={onCreated} />;
}

export function DashboardMovementDialog({
    open,
    onOpenChange,
    onCreated,
}: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[calc(100vh-2rem)] max-h-[760px] max-w-[760px] flex-col gap-0 overflow-y-auto border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] p-0 text-[var(--dashboard-text)] shadow-[var(--dashboard-shadow)] transition-colors sm:h-[680px] sm:max-h-[calc(100vh-2rem)] sm:max-w-[760px] [&_[data-slot=dialog-close]]:top-5 [&_[data-slot=dialog-close]]:right-5 [&_[data-slot=dialog-close]]:flex [&_[data-slot=dialog-close]]:size-8 [&_[data-slot=dialog-close]]:items-center [&_[data-slot=dialog-close]]:justify-center [&_[data-slot=dialog-close]]:bg-[var(--dashboard-surface-muted)] [&_[data-slot=dialog-close]]:text-[var(--dashboard-text-secondary)] [&_[data-slot=dialog-close]]:opacity-100">
                <MovementFormContent
                    active={open}
                    variant="dialog"
                    onCompleted={() => onOpenChange(false)}
                    onCreated={onCreated}
                />
            </DialogContent>
        </Dialog>
    );
}
