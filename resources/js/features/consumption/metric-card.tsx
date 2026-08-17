import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

type SkeletonProps = { className?: string; style?: CSSProperties };

export function AnalysisSkeleton({ className = '', style }: SkeletonProps) {
    return (
        <span
            aria-hidden="true"
            className={`dashboard-skeleton block ${className}`}
            style={style}
        />
    );
}

export function MetricCard({
    detail,
    icon: Icon,
    iconClass,
    loading,
    title,
    value,
    valueClass = 'text-[var(--dashboard-text)]',
}: {
    detail: string;
    icon: LucideIcon;
    iconClass: string;
    loading: boolean;
    title: string;
    value: string;
    valueClass?: string;
}) {
    return (
        <div className="flex min-h-[112px] min-w-0 flex-col gap-2 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 transition-colors sm:min-h-[124px] sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <span className="truncate text-xs leading-tight font-semibold text-[var(--dashboard-text)] sm:text-sm">
                    {title}
                </span>
                <Icon className={`size-4 shrink-0 ${iconClass}`} />
            </div>
            {loading ? (
                <AnalysisSkeleton className="h-7 w-28 rounded-md" />
            ) : (
                <span
                    className={`dashboard-data-reveal text-xl leading-tight font-bold tracking-wide sm:text-2xl ${valueClass}`}
                >
                    {value}
                </span>
            )}
            {loading ? (
                <AnalysisSkeleton className="h-3 w-24 rounded" />
            ) : (
                <span className="dashboard-data-reveal text-xs text-[var(--dashboard-text-muted)]">
                    {detail}
                </span>
            )}
        </div>
    );
}
