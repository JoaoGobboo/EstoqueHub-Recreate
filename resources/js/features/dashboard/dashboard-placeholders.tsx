import type { CSSProperties } from 'react';

export type Metric = {
    title: string;
    value: string;
    footer: string;
    badge: string;
    badgeClass?: string;
    compact?: boolean;
    valueClass?: string;
};

type SkeletonProps = {
    className?: string;
    style?: CSSProperties;
};

export function DashboardSkeleton({ className = '', style }: SkeletonProps) {
    return (
        <span
            aria-hidden="true"
            className={`dashboard-skeleton block ${className}`}
            style={style}
        />
    );
}

export function MetricCard({
    title,
    value,
    footer,
    badge,
    badgeClass = 'bg-[var(--dashboard-success-bg)] text-[var(--dashboard-success-text)]',
    compact = false,
    valueClass = 'text-[var(--dashboard-text)]',
    loading = false,
}: Metric & { loading?: boolean }) {
    return (
        <div className="flex min-h-[112px] min-w-0 flex-col gap-2 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4 transition-colors sm:min-h-[128px] sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <span className="truncate text-xs leading-tight font-semibold text-[var(--dashboard-text)] sm:text-sm">
                    {title}
                </span>
                {loading ? (
                    <DashboardSkeleton className="h-5 w-14 shrink-0 rounded-full sm:w-16" />
                ) : (
                    <span
                        className={`dashboard-data-reveal shrink-0 rounded-full border border-[var(--dashboard-border-strong)] px-2 py-1 text-[10px] leading-none sm:text-xs ${badgeClass}`}
                    >
                        {badge}
                    </span>
                )}
            </div>
            {loading ? (
                <DashboardSkeleton
                    className={`rounded-md ${compact ? 'h-6 w-32' : 'h-7 w-24'}`}
                />
            ) : (
                <span
                    className={`dashboard-data-reveal leading-tight font-bold tracking-wide ${valueClass} ${compact ? 'text-base sm:text-xl' : 'text-xl sm:text-2xl'}`}
                >
                    {value}
                </span>
            )}
            {loading ? (
                <DashboardSkeleton className="h-3 w-3/4 rounded" />
            ) : (
                <span className="dashboard-data-reveal truncate text-xs leading-tight text-[var(--dashboard-text-muted)]">
                    {footer}
                </span>
            )}
        </div>
    );
}

const chartSkeletonHeights = [
    [42, 68, 54],
    [64, 88, 70],
    [50, 74, 61],
    [72, 94, 78],
    [58, 82, 66],
];

export function DashboardChartSkeleton() {
    return (
        <div className="w-full max-w-full min-w-0 [scrollbar-gutter:stable] overflow-x-auto overscroll-x-contain">
            <div className="flex h-[220px] min-w-[700px] items-end justify-between gap-4 border-b border-l border-[var(--dashboard-border-strong)] px-4 sm:h-[250px] sm:gap-8 sm:px-6">
                {chartSkeletonHeights.map((bars, groupIndex) => (
                    <div
                        key={groupIndex}
                        className="flex h-full min-w-20 flex-1 flex-col items-center justify-end gap-3"
                    >
                        <div className="flex min-h-0 w-full flex-1 items-end justify-center gap-1.5">
                            {bars.map((height, barIndex) => (
                                <DashboardSkeleton
                                    key={height}
                                    className="w-4 rounded-t-md sm:w-6 lg:w-8"
                                    style={{
                                        height: `${height}%`,
                                        animationDelay: `${(groupIndex * 3 + barIndex) * 45}ms`,
                                    }}
                                />
                            ))}
                        </div>
                        <DashboardSkeleton
                            className="h-3 rounded"
                            style={{
                                width: groupIndex % 2 === 0 ? '5rem' : '6.5rem',
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DashboardChartLegendSkeleton() {
    return (
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {[5.5, 7, 6].map((width, index) => (
                <div key={width} className="flex items-center gap-2">
                    <DashboardSkeleton
                        className="size-2.5 rounded-sm"
                        style={{ animationDelay: `${index * 90}ms` }}
                    />
                    <DashboardSkeleton
                        className="h-3 rounded"
                        style={{
                            width: `${width}rem`,
                            animationDelay: `${index * 90}ms`,
                        }}
                    />
                </div>
            ))}
        </div>
    );
}

export function DashboardTableSkeleton() {
    return (
        <>
            {Array.from({ length: 7 }, (_, rowIndex) => (
                <div
                    key={rowIndex}
                    className={`grid h-14 grid-cols-[minmax(140px,0.75fr)_minmax(260px,1.7fr)_minmax(220px,1.25fr)_minmax(88px,0.45fr)_minmax(88px,0.45fr)] items-center gap-x-6 px-5 sm:px-6 ${rowIndex < 6 ? 'border-b border-[var(--dashboard-border)]' : ''}`}
                >
                    {[48, 132, 148, 42, 42].map((width, cellIndex) => (
                        <DashboardSkeleton
                            key={`${rowIndex}-${cellIndex}`}
                            className={`h-3 max-w-[85%] rounded ${cellIndex >= 3 ? 'justify-self-end' : ''}`}
                            style={{
                                width,
                                animationDelay: `${rowIndex * 55 + cellIndex * 25}ms`,
                            }}
                        />
                    ))}
                </div>
            ))}
        </>
    );
}
