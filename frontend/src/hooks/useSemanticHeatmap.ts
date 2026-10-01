import { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analytics';
import { HeatmapResponse } from '../types';

export type ZoomLevel = 'year' | 'month' | 'week' | 'day';

export function useSemanticHeatmap(dateStart?: string, dateEnd?: string) {
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
    
    const [cache, setCache] = useState<Record<string, HeatmapResponse | null>>({});
    const [loadingState, setLoadingState] = useState<Record<string, boolean>>({});

    // Clear cache if date range changes
    useEffect(() => {
        setCache({});
        setLoadingState({});
    }, [dateStart, dateEnd]);

    useEffect(() => {
        if (cache[zoomLevel] !== undefined || loadingState[zoomLevel]) {
            return;
        }

        setLoadingState(prev => ({ ...prev, [zoomLevel]: true }));

        analyticsApi.getHeatmap(zoomLevel, dateStart, dateEnd)
            .then((data) => {
                setCache(prev => ({ ...prev, [zoomLevel]: data }));
            })
            .catch((err) => {
                console.error("Failed to fetch semantic heatmap", err);
                setCache(prev => ({ ...prev, [zoomLevel]: null }));
            })
            .finally(() => {
                setLoadingState(prev => ({ ...prev, [zoomLevel]: false }));
            });
    }, [zoomLevel, dateStart, dateEnd, cache, loadingState]);

    const heatmapData = cache[zoomLevel] || null;
    const isLoading = loadingState[zoomLevel] || (cache[zoomLevel] === undefined);

    return { zoomLevel, setZoomLevel, heatmapData, isLoading };
}
