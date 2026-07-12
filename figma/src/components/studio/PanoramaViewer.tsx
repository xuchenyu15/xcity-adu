import { useEffect, useRef } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';

interface PanoramaViewerProps {
  panorama: string;
  className?: string;
}

// Renders an equirectangular panorama as a 360 sphere; drag with the mouse
// (or touch) to look around. Mounts the viewer once and swaps the panorama
// in place on prop changes, so switching rooms/finishes doesn't tear down
// the WebGL context or reset the current look-around angle.
export function PanoramaViewer({ panorama, className }: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer | null>(null);
  // The constructor below already loads `panorama` for the initial mount;
  // this flag stops the update effect (which also fires once on mount) from
  // immediately calling setPanorama() again and aborting that first load.
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = new Viewer({
      container: containerRef.current,
      panorama,
      navbar: false,
    });
    viewerRef.current = viewer;
    return () => {
      viewer.destroy();
      viewerRef.current = null;
      isInitialMount.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    viewerRef.current?.setPanorama(panorama).catch(() => {});
  }, [panorama]);

  return <div ref={containerRef} className={className ?? 'absolute inset-0 w-full h-full'} />;
}
