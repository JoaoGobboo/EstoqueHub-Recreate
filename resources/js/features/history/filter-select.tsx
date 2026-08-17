import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
    ariaLabel: string;
    children: ReactNode;
    disabled?: boolean;
    icon: LucideIcon;
    onChange: (value: string) => void;
    value: string;
};

export function FilterSelect({
    ariaLabel,
    children,
    disabled = false,
    icon: Icon,
    onChange,
    value,
}: Props) {
    return (
        <label
            className={`relative flex h-10 min-w-0 items-center gap-2 rounded-md border border-[var(--dashboard-border-strong)] bg-[var(--dashboard-surface)] px-3 text-xs text-[var(--dashboard-text-secondary)] ${disabled ? 'opacity-70' : ''}`}
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
