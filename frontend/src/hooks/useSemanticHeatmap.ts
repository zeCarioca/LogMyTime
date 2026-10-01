import { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analytics';
import { HeatmapResponse } from '../types';

export type ZoomLevel = 'year' | 'month' | 'week' | 'day';

export function useSemanticHeatmap(dateStart?: string, dateEnd?: string) {
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
    const [heatmapData, setHeatmapData] = useState<HeatmapResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);
        analyticsApi.getHeatmap(zoomLevel, dateStart, dateEnd)
            .then((data) => setHeatmapData(data))
            .catch((err) => {
                console.error("Failed to fetch semantic heatmap", err);
                setHeatmapData(null);
            })
            .finally(() => setIsLoading(false));
    }, [zoomLevel, dateStart, dateEnd]);

    return { zoomLevel, setZoomLevel, heatmapData, isLoading };
}
