import { useState, useEffect } from 'react';
import { analyticsApi } from '../api/analytics';
import { HeatmapResponse } from '../types';

export type ZoomLevel = 'month' | 'day' | 'commit';

export function useSemanticHeatmap(dateStart?: string, dateEnd?: string) {
    const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('day');
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
