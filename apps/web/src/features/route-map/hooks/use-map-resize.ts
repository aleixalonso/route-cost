import type { Map } from 'maplibre-gl';
import { useEffect } from 'react';

export function useMapResize(
  container: HTMLElement | null,
  map: Map | null,
  onMeasured?: () => void,
): void {
  useEffect(() => {
    if (container === null || map === null) {
      return;
    }

    let frameId: number | null = null;

    const observer = new ResizeObserver(() => {
      if (frameId !== null) {
        return;
      }

      frameId = requestAnimationFrame(() => {
        frameId = null;
        map.resize();
        onMeasured?.();
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [container, map, onMeasured]);
}
