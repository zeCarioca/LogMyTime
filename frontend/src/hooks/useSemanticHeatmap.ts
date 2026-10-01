import { useState, useEffect, useMemo } from 'react';
import { analyticsApi } from '../api/analytics';
import { HeatmapResponse } from '../types';

export function useSemanticHeatmap() {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    
    const [cache, setCache] = useState<Record<number, HeatmapResponse | null>>({});
    const [loadingState, setLoadingState] = useState<Record<number, boolean>>({});

    const { dateStart, dateEnd } = useMemo(() => {
        return {
            dateStart: `${selectedYear}-01-01`,
            dateEnd: `${selectedYear}-12-31`,
        };
    }, [selectedYear]);

    useEffect(() => {
        if (cache[selectedYear] !== undefined || loadingState[selectedYear]) {
            return;
        }

        setLoadingState(prev => ({ ...prev, [selectedYear]: true }));

        // Always use 'week' level to get day-resolution from the backend
        analyticsApi.getHeatmap('week', dateStart, dateEnd)
            .then((data) => {
                setCache(prev => ({ ...prev, [selectedYear]: data }));
            })
            .catch((err) => {
                console.error("Failed to fetch github heatmap data", err);
                setCache(prev => ({ ...prev, [selectedYear]: null }));
            })
            .finally(() => {
                setLoadingState(prev => ({ ...prev, [selectedYear]: false }));
            });
    }, [selectedYear, dateStart, dateEnd, cache, loadingState]);

    const heatmapData = cache[selectedYear] || null;
    const isLoading = loadingState[selectedYear] || (cache[selectedYear] === undefined);

    return { selectedYear, setSelectedYear, heatmapData, isLoading };
}
