import { usePage } from '@inertiajs/react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Auth } from '@/types';

export type DashboardUnit = {
    id: number;
    nome: string;
    localizacao: string | null;
    responsavel: string | null;
};

type DashboardScopeContextValue = {
    units: DashboardUnit[];
    selectedUnitId: number | null;
    selectedUnit: DashboardUnit | null;
    scopeName: string;
    canSelectGroup: boolean;
    ready: boolean;
    selectUnit: (unitId: number | null) => void;
};

const DashboardScopeContext = createContext<DashboardScopeContextValue | null>(
    null,
);

function readStoredUnit(storageKey: string): number | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const storedValue = localStorage.getItem(storageKey);

    if (!storedValue || storedValue === 'group') {
        return null;
    }

    const unitId = Number(storedValue);

    return Number.isInteger(unitId) && unitId > 0 ? unitId : null;
}

export function DashboardScopeProvider({ children }: { children: ReactNode }) {
    const { auth } = usePage().props as unknown as { auth: Auth };
    const canSelectGroup = Boolean(auth.user.is_admin);
    const storageKey = `estoquehub-dashboard-scope:${auth.user.id}`;
    const [units, setUnits] = useState<DashboardUnit[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState<number | null>(() =>
        readStoredUnit(storageKey),
    );
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/unidades', {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Não foi possível carregar as sedes.');
                }

                return response.json() as Promise<{ data: DashboardUnit[] }>;
            })
            .then(({ data }) => {
                setUnits(data);
                setSelectedUnitId((currentUnitId) => {
                    const storedUnitIsAvailable = data.some(
                        (unit) => unit.id === currentUnitId,
                    );
                    const nextUnitId = storedUnitIsAvailable
                        ? currentUnitId
                        : canSelectGroup
                          ? null
                          : (data.at(0)?.id ?? null);

                    localStorage.setItem(
                        storageKey,
                        nextUnitId === null ? 'group' : String(nextUnitId),
                    );

                    return nextUnitId;
                });
                setReady(true);
            })
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setUnits([]);
                setReady(true);
            });

        return () => controller.abort();
    }, [canSelectGroup, storageKey]);

    const selectUnit = useCallback(
        (unitId: number | null) => {
            if (unitId === null && !canSelectGroup) {
                return;
            }

            if (unitId !== null && !units.some((unit) => unit.id === unitId)) {
                return;
            }

            setSelectedUnitId(unitId);
            localStorage.setItem(
                storageKey,
                unitId === null ? 'group' : String(unitId),
            );
        },
        [canSelectGroup, storageKey, units],
    );

    const selectedUnit = useMemo(
        () => units.find((unit) => unit.id === selectedUnitId) ?? null,
        [selectedUnitId, units],
    );
    const value = useMemo<DashboardScopeContextValue>(
        () => ({
            units,
            selectedUnitId,
            selectedUnit,
            scopeName: selectedUnit?.nome ?? 'Grupo Positivo',
            canSelectGroup,
            ready,
            selectUnit,
        }),
        [
            canSelectGroup,
            ready,
            selectUnit,
            selectedUnit,
            selectedUnitId,
            units,
        ],
    );

    return (
        <DashboardScopeContext.Provider value={value}>
            {children}
        </DashboardScopeContext.Provider>
    );
}

export function useDashboardScope(): DashboardScopeContextValue {
    const context = useContext(DashboardScopeContext);

    if (!context) {
        throw new Error(
            'useDashboardScope deve ser usado dentro de DashboardScopeProvider.',
        );
    }

    return context;
}
