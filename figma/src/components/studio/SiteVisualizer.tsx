import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box, Map as MapIcon, AlertTriangle, Ruler } from 'lucide-react';
import { useI18n } from '../../i18n';
import { IsoGlbOverlay } from './IsoGlbOverlay';
import { DEFAULT_MODEL_ID } from './siteVisualizerModels';

interface SiteVisualizerProps {
  projectType: 'detached' | 'interior' | 'undecided';
  constraints: {
    maxCoverage: number;
    setbacks: {
      side: number;
      rear: number;
    };
  };
  lookup?: any;
  mode?: 'analysis' | 'design';
  selectedModel?: string;
  onSizeChange?: (size: number) => void;
  exteriorMaterial?: string;
  balconies?: ('left' | 'right')[];
  styleSelected?: boolean;
  floorPlanSrc?: string;
}

function SvgSitePreview({
  view,
  showSetbacks,
  orbitYawRef,
  lookup,
  measureEnabled,
  glbModelId,
  glbShowRoof,
  onGlbHasRoofChange,
}: {
  view: '2d' | '3d';
  showSetbacks: boolean;
  orbitYawRef: React.MutableRefObject<number>;
  lookup: any;
  measureEnabled?: boolean;
  glbModelId: string;
  glbShowRoof: boolean;
  onGlbHasRoofChange?: (hasRoof: boolean) => void;
}) {
  return (
    <LegacySvgSitePreview
      view={view}
      showSetbacks={showSetbacks}
      orbitYawRef={orbitYawRef}
      lookup={lookup}
      measureEnabled={measureEnabled === true}
      glbModelId={glbModelId}
      glbShowRoof={glbShowRoof}
      onGlbHasRoofChange={onGlbHasRoofChange}
    />
  );
}

function LegacySvgSitePreview({
  view,
  showSetbacks,
  orbitYawRef,
  lookup,
  measureEnabled,
  glbModelId,
  glbShowRoof,
  onGlbHasRoofChange,
}: {
  view: '2d' | '3d';
  showSetbacks: boolean;
  orbitYawRef: React.MutableRefObject<number>;
  lookup: any;
  measureEnabled: boolean;
  glbModelId: string;
  glbShowRoof: boolean;
  onGlbHasRoofChange?: (hasRoof: boolean) => void;
}) {
  const { language } = useI18n();
  const isZh = language === 'zh';
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 1600, h: 900 });
  const [orbitYawDeg, setOrbitYawDeg] = useState(0);
  const [orbitPitchDeg, setOrbitPitchDeg] = useState(0);
  const [isoZoom, setIsoZoom] = useState(1);
  const [orbiting3d, setOrbiting3d] = useState(false);
  const orbitStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number }>({ x: 0, y: 0, yaw: 0, pitch: 0 });
  const [placementReloadTick, setPlacementReloadTick] = useState(0);
  const [measureState, setMeasureState] = useState<null | {
    mode: '2d' | '3d';
    a: { x: number; y: number };
    b: { x: number; y: number } | null;
    preview: { x: number; y: number } | null;
    aSnapped: boolean;
    bSnapped: boolean;
    previewSnapped: boolean;
    a3: { x: number; y: number; z: number; snapped: boolean } | null;
    b3: { x: number; y: number; z: number; snapped: boolean } | null;
    preview3: { x: number; y: number; z: number; snapped: boolean } | null;
  }>(null);
  const [measureHover, setMeasureHover] = useState<null | { iso: { x: number; y: number }; snapped: boolean }>(null);
  const [hoveredBuildingKey, setHoveredBuildingKey] = useState<string | null>(null);
  const [glbReady, setGlbReady] = useState(false);
  const [glbProgress, setGlbProgress] = useState<{ loaded: number; total: number | null; progress: number | null }>({ loaded: 0, total: null, progress: null });
  const glbPickRef = useRef<null | { pick: (clientX: number, clientY: number) => null | { x: number; y: number; z: number; snapped: boolean; kind: 'vertex' | 'edge' | 'surface' } }>(null);

  useEffect(() => {
    const bump = () => setPlacementReloadTick((t) => t + 1);
    const t0 = window.setTimeout(bump, 0);
    const t1 = window.setTimeout(bump, 60);
    const t2 = window.setTimeout(bump, 220);
    window.addEventListener('focus', bump);
    document.addEventListener('visibilitychange', bump);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('focus', bump);
      document.removeEventListener('visibilitychange', bump);
    };
  }, []);

  useEffect(() => {
    const el = canvasHostRef.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const w = Math.max(1, Math.round(cr.width));
      const h = Math.max(1, Math.round(cr.height));
      setCanvasSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!orbiting3d) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - orbitStartRef.current.x;
      const dy = e.clientY - orbitStartRef.current.y;
      const yaw = orbitStartRef.current.yaw + dx * 0.25;
      let pitchDelta = dy * 0.18;
      if (!e.shiftKey) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const ratio = absDx / Math.max(1e-6, absDy);
        const damp = ratio > 2 ? 0.15 : (ratio > 1 ? 0.4 : 1);
        pitchDelta *= damp;
      }
      const pitch = Math.max(-25, Math.min(25, orbitStartRef.current.pitch + pitchDelta));
      setOrbitYawDeg(yaw);
      setOrbitPitchDeg(pitch);
    };
    const onUp = () => setOrbiting3d(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [orbiting3d]);

  useEffect(() => {
    if (view !== '3d') {
      setOrbiting3d(false);
      setOrbitPitchDeg(0);
      setGlbReady(false);
      setGlbProgress({ loaded: 0, total: null, progress: null });
      return;
    }
    setIsoZoom(1);
    setGlbReady(false);
    setGlbProgress({ loaded: 0, total: null, progress: null });
  }, [view]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const factor = Math.exp(-e.deltaY * 0.0012);
      setIsoZoom((z) => {
        const next = Math.max(0.6, Math.min(2.2, z * factor));
        return Math.abs(next - z) < 1e-4 ? z : next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    if (!measureEnabled) {
      setMeasureState(null);
      return;
    }
    setOrbiting3d(false);
    setMeasureState(null);
  }, [measureEnabled, view]);

  useEffect(() => {
    if (!measureEnabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMeasureState(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [measureEnabled]);

  const FT_TO_UNIT = 6;
  const LOT_W_FT = 50;
  const LOT_H_FT = 100;
  const LOT_W = LOT_W_FT * FT_TO_UNIT;
  const LOT_H = LOT_H_FT * FT_TO_UNIT;
  const CANVAS_W = canvasSize.w;
  const CANVAS_H = canvasSize.h;
  const LOT_X = (CANVAS_W - LOT_W) / 2;
  const LOT_Y = 100;

  const subjectParcel = lookup?.subjectParcel;
  const subjectBuildings = lookup?.subjectBuildings;
  const nearbyBuildings = lookup?.nearbyBuildings;
  const nearbyRoads = lookup?.nearbyRoads;
  const rotationDegRaw = Number(lookup?.computed?.rotationDeg);
  const rotationDeg = Number.isFinite(rotationDegRaw) ? rotationDegRaw : 0;
  const streetName = (lookup?.region?.streetName || '').toString();

  const mapViewport = useMemo(() => {
    const x = 0;
    const y = LOT_Y;
    const w = CANVAS_W;
    const h = Math.max(1, CANVAS_H - LOT_Y);
    return { x, y, w, h };
  }, [CANVAS_W, CANVAS_H, LOT_Y]);

  const bboxMercator = useMemo(() => {
    const geom = subjectParcel?.geometry;
    const allLonLat: Array<[number, number]> = [];

    const pushRing = (ring: any) => {
      if (!Array.isArray(ring)) return;
      for (const pt of ring) {
        const lon = Number(pt?.[0]);
        const lat = Number(pt?.[1]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        allLonLat.push([lon, lat]);
      }
    };

    if (geom?.type === 'Polygon') {
      const rings = geom?.coordinates;
      if (Array.isArray(rings)) for (const ring of rings) pushRing(ring);
    } else if (geom?.type === 'MultiPolygon') {
      const polys = geom?.coordinates;
      if (Array.isArray(polys)) {
        for (const poly of polys) {
          if (!Array.isArray(poly)) continue;
          for (const ring of poly) pushRing(ring);
        }
      }
    }

    if (allLonLat.length < 3) return null;

    const R = 6378137;
    const toScreenMercator = (lon: number, lat: number) => {
      const lonRad = (lon * Math.PI) / 180;
      const latRad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
      return { x: R * lonRad, y: -(R * Math.log(Math.tan(Math.PI / 4 + latRad / 2))) };
    };

    const pts = allLonLat.map(([lon, lat]) => toScreenMercator(lon, lat));
    const center = { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
    const rad = (rotationDeg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    let minRlx = Infinity, minRly = Infinity, maxRlx = -Infinity, maxRly = -Infinity;
    for (const p of pts) {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      const rlx = dx * c - dy * s;
      const rly = dx * s + dy * c;
      minRlx = Math.min(minRlx, rlx);
      minRly = Math.min(minRly, rly);
      maxRlx = Math.max(maxRlx, rlx);
      maxRly = Math.max(maxRly, rly);
    }
    if (!Number.isFinite(minRlx) || !Number.isFinite(minRly) || !Number.isFinite(maxRlx) || !Number.isFinite(maxRly)) return null;

    const bboxCenterRlx = (minRlx + maxRlx) / 2;
    const bboxCenterRly = (minRly + maxRly) / 2;
    const invDx = bboxCenterRlx * c + bboxCenterRly * s;
    const invDy = -bboxCenterRlx * s + bboxCenterRly * c;
    const bboxCenteredCenter = { x: center.x + invDx, y: center.y + invDy };

    const spanRx = Math.max(1e-9, maxRlx - minRlx);
    const spanRy = Math.max(1e-9, maxRly - minRly);
    const padPx = 10;
    const targetW = Math.max(1, mapViewport.w - padPx * 2);
    const targetH = Math.max(1, mapViewport.h - padPx * 2);
    const scale = Math.min(targetW / spanRx, targetH / spanRy);
    const viewportCx = mapViewport.x + mapViewport.w / 2;
    const viewportCy = mapViewport.y + mapViewport.h / 2;
    const offsetX = viewportCx - bboxCenteredCenter.x * scale;
    const offsetY = viewportCy - bboxCenteredCenter.y * scale;
    return { scale, offsetX, offsetY, center: bboxCenteredCenter, toScreenMercator };
  }, [subjectParcel?.geometry, rotationDeg, mapViewport.x, mapViewport.y, mapViewport.w, mapViewport.h]);

  const mapRotationCenter = useMemo(() => {
    if (!bboxMercator) return null;
    return { x: mapViewport.x + mapViewport.w / 2, y: mapViewport.y + mapViewport.h / 2 };
  }, [bboxMercator, mapViewport.x, mapViewport.y, mapViewport.w, mapViewport.h]);

  const lonLatToCanvas = (lon: number, lat: number) => {
    if (!bboxMercator) return null;
    const m = bboxMercator.toScreenMercator(lon, lat);
    return { x: bboxMercator.offsetX + m.x * bboxMercator.scale, y: bboxMercator.offsetY + m.y * bboxMercator.scale };
  };

  const rotateCanvasPoint = (p: { x: number; y: number }) => {
    if (!mapRotationCenter) return p;
    if (!Number.isFinite(rotationDeg) || Math.abs(rotationDeg) < 1e-9) return p;
    const rad = (rotationDeg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const dx = p.x - mapRotationCenter.x;
    const dy = p.y - mapRotationCenter.y;
    return { x: mapRotationCenter.x + dx * c - dy * s, y: mapRotationCenter.y + dx * s + dy * c };
  };

  const mapGroupTransform = mapRotationCenter ? `rotate(${rotationDeg}, ${mapRotationCenter.x}, ${mapRotationCenter.y})` : undefined;

  const polygonAreaAbs = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length < 3) return 0;
    let a2 = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      a2 += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(a2 / 2);
  };

  const geoPolygonToPathWithBounds = (geom: any) => {
    if (!bboxMercator || !geom) return null;
    const rings: any[] =
      geom.type === 'Polygon'
        ? (Array.isArray(geom.coordinates?.[0]) ? [geom.coordinates[0]] : [])
        : (geom.type === 'MultiPolygon'
          ? (Array.isArray(geom.coordinates) ? geom.coordinates.map((p: any) => p?.[0]).filter((x: any) => Array.isArray(x)) : [])
          : []);
    if (rings.length === 0) return null;
    const parts: string[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ring of rings) {
      const pts = ring
        .map((pt: any) => {
          const lon = Number(pt?.[0]);
          const lat = Number(pt?.[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
          return lonLatToCanvas(lon, lat);
        })
        .filter(Boolean) as Array<{ x: number; y: number }>;
      if (pts.length < 3) continue;
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      parts.push(`${d} Z`);
    }
    if (parts.length === 0) return null;
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
    return { d: parts.join(' '), bounds: { minX, minY, maxX, maxY } };
  };

  const geoPolygonToPathAllRingsWithBounds = (geom: any) => {
    if (!bboxMercator || !geom) return null;
    const rings: any[] =
      geom.type === 'Polygon'
        ? (Array.isArray(geom.coordinates) ? geom.coordinates : [])
        : (geom.type === 'MultiPolygon'
          ? (Array.isArray(geom.coordinates) ? geom.coordinates.flatMap((p: any) => Array.isArray(p) ? p : []) : [])
          : []);
    if (rings.length === 0) return null;
    const parts: string[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ring of rings) {
      if (!Array.isArray(ring)) continue;
      const pts = ring
        .map((pt: any) => {
          const lon = Number(pt?.[0]);
          const lat = Number(pt?.[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
          return lonLatToCanvas(lon, lat);
        })
        .filter(Boolean) as Array<{ x: number; y: number }>;
      if (pts.length < 3) continue;
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      const d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      parts.push(`${d} Z`);
    }
    if (parts.length === 0) return null;
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
    return { d: parts.join(' '), bounds: { minX, minY, maxX, maxY } };
  };

  const lotPathWithBounds = geoPolygonToPathWithBounds(subjectParcel?.geometry);
  const lotPolygonD = lotPathWithBounds?.d ?? null;
  const lotBoundsCanvas = lotPathWithBounds?.bounds ?? null;
  const buildableGeom = lookup?.computed?.buildableArea?.geometry ?? null;
  const buildableAreaD = geoPolygonToPathAllRingsWithBounds(buildableGeom)?.d ?? null;

  const nearbyParcelPaths = useMemo(() => {
    const feats = Array.isArray(lookup?.nearbyParcels?.features) ? lookup.nearbyParcels.features : [];
    const out: Array<{ key: string; d: string }> = [];
    for (let i = 0; i < feats.length; i++) {
      const f = feats[i];
      const r = geoPolygonToPathWithBounds(f?.geometry);
      if (!r) continue;
      const b = r.bounds;
      const intersects =
        b.maxX >= mapViewport.x &&
        b.maxY >= mapViewport.y &&
        b.minX <= mapViewport.x + mapViewport.w &&
        b.minY <= mapViewport.y + mapViewport.h;
      if (!intersects) continue;
      out.push({ key: `nearby-parcel-${i}`, d: r.d });
    }
    return out;
  }, [lookup?.nearbyParcels?.features, mapViewport.x, mapViewport.y, mapViewport.w, mapViewport.h, bboxMercator]);

  const geoPolygonToPathMetrics = (geom: any) => {
    if (!bboxMercator || !geom) return null;
    const parts: Array<{ d: string; areaAbs: number; centroid: { x: number; y: number }; bounds: { minX: number; minY: number; maxX: number; maxY: number } }> = [];
    const addRing = (ring: any[]) => {
      const pts = ring
        .map((pt: any) => {
          const lon = Number(pt?.[0]);
          const lat = Number(pt?.[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
          return lonLatToCanvas(lon, lat);
        })
        .filter(Boolean) as Array<{ x: number; y: number }>;
      if (pts.length < 3) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of pts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return;
      let a2 = 0;
      let cx6 = 0;
      let cy6 = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        const cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
        a2 += cross;
        cx6 += (pts[i].x + pts[j].x) * cross;
        cy6 += (pts[i].y + pts[j].y) * cross;
      }
      const area = a2 / 2;
      const areaAbs = Math.abs(area);
      const centroid =
        Math.abs(a2) > 1e-9
          ? { x: cx6 / (3 * a2), y: cy6 / (3 * a2) }
          : { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
      const d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      parts.push({ d: `${d} Z`, areaAbs, centroid, bounds: { minX, minY, maxX, maxY } });
    };
    if (geom.type === 'Polygon' && Array.isArray(geom.coordinates?.[0])) addRing(geom.coordinates[0]);
    else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
      for (const poly of geom.coordinates) {
        if (!Array.isArray(poly) || !Array.isArray(poly?.[0])) continue;
        addRing(poly[0]);
      }
    } else return null;
    if (parts.length === 0) return null;
    const d = parts.map(p => p.d).join(' ');
    const bounds = parts.reduce((acc, p) => ({
      minX: Math.min(acc.minX, p.bounds.minX),
      minY: Math.min(acc.minY, p.bounds.minY),
      maxX: Math.max(acc.maxX, p.bounds.maxX),
      maxY: Math.max(acc.maxY, p.bounds.maxY),
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const sumA = parts.reduce((s, p) => s + p.areaAbs, 0);
    const centroid = sumA > 1e-9
      ? { x: parts.reduce((s, p) => s + p.centroid.x * p.areaAbs, 0) / sumA, y: parts.reduce((s, p) => s + p.centroid.y * p.areaAbs, 0) / sumA }
      : { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
    return { d, bounds, centroid, areaAbs: sumA };
  };

  const buildingPaths = useMemo(() => {
    const toFeaturePaths = (fc: any, kind: 'subject' | 'nearby') => {
      const feats = Array.isArray(fc?.features) ? fc.features : [];
      return feats
        .map((f: any, idx: number) => {
          const r = geoPolygonToPathMetrics(f?.geometry);
          if (!r) return null;
          const tags = f?.properties ?? {};
          const tagsLower = (() => { try { return JSON.stringify(tags).toLowerCase(); } catch { return ''; } })();
          const building = (tags?.building ?? '').toString().toLowerCase();
          const hasAddress =
            !!tags?.['addr:housenumber'] ||
            !!tags?.['addr:street'] ||
            !!tags?.['addr:full'] ||
            tagsLower.includes('"addr:housenumber"') ||
            tagsLower.includes('"addr:street"') ||
            tagsLower.includes('"addr:full"');
          const isGarageLike =
            building.includes('garage') ||
            building.includes('carport') ||
            tagsLower.includes('garage') ||
            tagsLower.includes('carport');
          const isHouseLike =
            building === 'house' ||
            building.includes('residential') ||
            building.includes('detached') ||
            tagsLower.includes('"building":"house"');
          const role = isGarageLike ? 'garage' : (isHouseLike ? 'house' : 'other');
          return { key: `${kind}-${idx}`, d: r.d, role, kind, areaAbs: r.areaAbs, centroid: r.centroid, hasAddress };
        })
        .filter(Boolean) as Array<any>;
    };
    return [...toFeaturePaths(subjectBuildings, 'subject'), ...toFeaturePaths(nearbyBuildings, 'nearby')];
  }, [subjectBuildings, nearbyBuildings, bboxMercator]);

  const normalizeRoadName = (s: string) => {
    const raw = (s || '').trim().toLowerCase();
    if (!raw) return '';
    const cleaned = raw.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned
      .replace(/\bnorthwest\b/g, 'nw')
      .replace(/\bnortheast\b/g, 'ne')
      .replace(/\bsouthwest\b/g, 'sw')
      .replace(/\bsoutheast\b/g, 'se')
      .replace(/\bnorth\b/g, 'n')
      .replace(/\bsouth\b/g, 's')
      .replace(/\beast\b/g, 'e')
      .replace(/\bwest\b/g, 'w')
      .replace(/\bstreet\b/g, 'st')
      .replace(/\bavenue\b/g, 'ave')
      .replace(/\broad\b/g, 'rd')
      .replace(/\bboulevard\b/g, 'blvd')
      .replace(/\bdrive\b/g, 'dr')
      .replace(/\blane\b/g, 'ln')
      .replace(/\bcourt\b/g, 'ct')
      .replace(/\bplace\b/g, 'pl')
      .replace(/\bterrace\b/g, 'ter')
      .replace(/\bhighway\b/g, 'hwy')
      .replace(/\bparkway\b/g, 'pkwy')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isRoadNameMatch = (target: string, wayName: string) => {
    const t = normalizeRoadName(target);
    const w = normalizeRoadName(wayName);
    if (!t || !w) return false;
    if (w === t || w.includes(t) || t.includes(w)) return true;
    const tTokens = new Set(t.split(' ').filter(Boolean));
    const wTokens = new Set(w.split(' ').filter(Boolean));
    if (tTokens.size === 0 || wTokens.size === 0) return false;
    let inter = 0;
    for (const tok of tTokens) if (wTokens.has(tok)) inter++;
    const minCount = Math.min(tTokens.size, wTokens.size);
    return inter >= minCount;
  };

  const roadPaths = useMemo(() => {
    const feats = Array.isArray(nearbyRoads?.features) ? nearbyRoads.features : [];
    const out: Array<{ key: string; d: string; isTarget: boolean }> = [];
    const lineToPath = (coords: any[]) => {
      const pts = coords
        .map((pt: any) => {
          const lon = Number(pt?.[0]);
          const lat = Number(pt?.[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
          return lonLatToCanvas(lon, lat);
        })
        .filter(Boolean) as Array<{ x: number; y: number }>;
      if (pts.length < 2) return null;
      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      return { d };
    };
    for (let i = 0; i < feats.length; i++) {
      const f = feats[i];
      const geom = f?.geometry;
      const name = (f?.properties?.name ?? f?.properties?.ref ?? '').toString();
      const isTarget = isRoadNameMatch(streetName, name);
      if (!geom) continue;
      if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
        const r = lineToPath(geom.coordinates);
        if (r) out.push({ key: `road-${i}`, d: r.d, isTarget });
      } else if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates)) {
        for (let j = 0; j < geom.coordinates.length; j++) {
          const r = lineToPath(geom.coordinates[j]);
          if (r) out.push({ key: `road-${i}-${j}`, d: r.d, isTarget });
        }
      }
    }
    return out;
  }, [nearbyRoads, bboxMercator, streetName, rotationDeg]);

  const buildableCenter = useMemo(() => {
    const r = geoPolygonToPathWithBounds(buildableGeom);
    if (!r) return { x: LOT_X + LOT_W / 2, y: LOT_Y + LOT_H / 2 };
    return { x: (r.bounds.minX + r.bounds.maxX) / 2, y: (r.bounds.minY + r.bounds.maxY) / 2 };
  }, [buildableGeom, bboxMercator, LOT_X, LOT_Y, LOT_W, LOT_H]);

  const normalizePlacementId = (v: unknown) => {
    const s = (v ?? '').toString().trim().toLowerCase();
    return s.replace(/\s+/g, ' ');
  };
  const placementIdentity = normalizePlacementId(lookup?.subjectParcel?.properties?.fields?.ll_uuid);
  const placementStorageKey = placementIdentity ? `xhomes.aduPlacement:${String(placementIdentity)}` : '';
  const aduPlacement = (() => {
    try {
      void placementReloadTick;
      if (!placementStorageKey) return null;
      const raw = localStorage.getItem(placementStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const rotationDeg = Number(parsed?.rotationDeg);
      if (!Number.isFinite(rotationDeg)) return null;

      const cxRel = Number(parsed?.cxRel);
      const cyRel = Number(parsed?.cyRel);
      const cxFt = Number(parsed?.cxFt);
      const cyFt = Number(parsed?.cyFt);
      const cxPx = Number(parsed?.cxPx);
      const cyPx = Number(parsed?.cyPx);

      const hasRel = Number.isFinite(cxRel) && Number.isFinite(cyRel) && !!lotBoundsCanvas;
      const hasFt = Number.isFinite(cxFt) && Number.isFinite(cyFt);
      const hasPx = Number.isFinite(cxPx) && Number.isFinite(cyPx);

      const cx =
        hasRel
          ? (lotBoundsCanvas!.minX + cxRel * (lotBoundsCanvas!.maxX - lotBoundsCanvas!.minX))
          : (hasFt ? (LOT_X + cxFt * FT_TO_UNIT) : (hasPx ? cxPx : null));
      const cy =
        hasRel
          ? (lotBoundsCanvas!.minY + cyRel * (lotBoundsCanvas!.maxY - lotBoundsCanvas!.minY))
          : (hasFt ? (LOT_Y + cyFt * FT_TO_UNIT) : (hasPx ? cyPx : null));

      const rawEndAddon = (parsed?.endAddon ?? null) as any;
      const endAddon =
        rawEndAddon === 'none' || rawEndAddon === 'end-right' || rawEndAddon === 'end-left' || rawEndAddon === 'end-both'
          ? rawEndAddon
          : 'none';
      const hasBalcony = typeof parsed?.hasBalcony === 'boolean' ? parsed.hasBalcony : false;

      if (!Number.isFinite(cx as any) || !Number.isFinite(cy as any)) return null;
      return { cx: cx as number, cy: cy as number, rotation: ((rotationDeg % 360) + 360) % 360, endAddon, hasBalcony };
    } catch {
      return null;
    }
  })();

  const MAIN_W = 16 * FT_TO_UNIT;
  const MAIN_H = 37.5 * FT_TO_UNIT;
  const ADDON_PX = 7.5 * FT_TO_UNIT;
  const aduState = {
    cx: aduPlacement?.cx ?? buildableCenter.x,
    cy: aduPlacement?.cy ?? buildableCenter.y,
    rotation: Number.isFinite(aduPlacement?.rotation) ? aduPlacement!.rotation : 0,
    endAddon: (aduPlacement?.endAddon ?? 'none') as 'none' | 'end-right' | 'end-left' | 'end-both',
    hasBalcony: !!aduPlacement?.hasBalcony,
  };

  const getAduCorners = () => {
    const rad = (aduState.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const hw = MAIN_W / 2;
    const hh = MAIN_H / 2;
    const pts = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
    return pts.map((p) => ({ x: aduState.cx + (p.x * cos - p.y * sin), y: aduState.cy + (p.x * sin + p.y * cos) }));
  };

  const clientToSvg = (clientX: number, clientY: number) => {
    const svgEl = svgRef.current;
    if (!svgEl) return null as { x: number; y: number } | null;
    const ctm = svgEl.getScreenCTM();
    if (!ctm) return null as { x: number; y: number } | null;
    const pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const screenToMapLocal = (p: { x: number; y: number }) => {
    if (!mapRotationCenter) return p;
    if (!Number.isFinite(rotationDeg) || Math.abs(rotationDeg) < 1e-9) return p;
    const rad = (-rotationDeg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const dx = p.x - mapRotationCenter.x;
    const dy = p.y - mapRotationCenter.y;
    return { x: mapRotationCenter.x + dx * c - dy * s, y: mapRotationCenter.y + dx * s + dy * c };
  };

  const formatMeasureFt = (ft: number) => {
    if (!Number.isFinite(ft)) return '';
    const sign = ft < 0 ? '-' : '';
    const abs = Math.abs(ft);
    const feet = Math.floor(abs);
    const inches = Math.round((abs - feet) * 12);
    if (inches === 12) return `${sign}${feet + 1}'`;
    return inches === 0 ? `${sign}${feet}'` : `${sign}${feet}'-${inches}"`;
  };

  const pxToFeet = (px: number) => {
    if (!Number.isFinite(px)) return NaN;
    const s = Number((bboxMercator as any)?.scale);
    if (Number.isFinite(s) && Math.abs(s) > 1e-12) {
      const meters = px / s;
      return meters * 3.280839895;
    }
    return px / FT_TO_UNIT;
  };

  if (view === '2d') {
    return (
      <div className="absolute inset-0" ref={canvasHostRef}>
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet"
          onMouseDown={(e) => {
            if (!measureEnabled) return;
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            const p = clientToSvg(e.clientX, e.clientY);
            if (!p) return;
            const local = screenToMapLocal(p);
            setMeasureState((prev) => {
              if (!prev || prev.mode !== '2d' || prev.b) return { mode: '2d', a: local, b: null, preview: null, aSnapped: false, bSnapped: false, previewSnapped: false, a3: null, b3: null, preview3: null };
              return { ...prev, b: local, preview: null, bSnapped: false, previewSnapped: false, b3: null, preview3: null };
            });
          }}
          onMouseMove={(e) => {
            if (!measureEnabled) return;
            const p = clientToSvg(e.clientX, e.clientY);
            if (!p) return;
            const local = screenToMapLocal(p);
            setMeasureState((prev) => {
              if (!prev || prev.mode !== '2d' || prev.b) return prev;
              return { ...prev, preview: local, previewSnapped: false, preview3: null };
            });
          }}
          onMouseLeave={() => {
            if (!measureEnabled) return;
            setMeasureState((prev) => {
              if (!prev || prev.mode !== '2d' || prev.b) return prev;
              return { ...prev, preview: null, previewSnapped: false, preview3: null };
            });
          }}
          style={{ cursor: measureEnabled ? 'crosshair' : undefined }}
        >
          <text x={CANVAS_W / 2} y={LOT_Y - 15} textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="400" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.15em">
            {streetName || (isZh ? '街道' : 'Street')}
          </text>
          <g transform={mapGroupTransform}>
            {nearbyParcelPaths.map((p) => (
              <path key={p.key} d={p.d} fill="none" stroke="#e2e8f0" strokeWidth="2" opacity="0.85" />
            ))}
            {roadPaths.filter(r => !r.isTarget).map((r) => (
              <path key={r.key} d={r.d} fill="none" stroke="#CBD5E1" strokeWidth="3" opacity="0.55" />
            ))}
            {roadPaths.filter(r => r.isTarget).map((r) => (
              <path key={r.key} d={r.d} fill="none" stroke="#155dfc" strokeWidth="6" opacity="0.9" />
            ))}
            {lotPolygonD ? (
              <path d={lotPolygonD} fill="white" stroke="#010101" strokeWidth="3" />
            ) : (
              <rect x={LOT_X} y={LOT_Y} width={LOT_W} height={LOT_H} fill="white" stroke="#010101" strokeWidth="3" />
            )}
            {!!buildableAreaD && showSetbacks && (
              <path d={buildableAreaD} fill="#155dfc" fillOpacity="0.08" stroke="#155dfc" strokeWidth="2" strokeDasharray="8 5" fillRule="evenodd" />
            )}
            {buildingPaths.map((b: any) => {
              const isSubject = b.kind === 'subject';
              const fill = isSubject ? '#CBD5E1' : '#EDF1F6';
              const stroke = isSubject ? '#94a3b8' : '#cbd5e1';
              const opacity = isSubject ? 1 : 0.55;
              return <path key={b.key} d={b.d} fill={fill} stroke={stroke} strokeWidth="1" opacity={opacity} />;
            })}
            <g transform={`translate(${aduState.cx}, ${aduState.cy}) rotate(${aduState.rotation})`}>
              {(() => {
                const endRightOn = aduState.endAddon === 'end-right' || aduState.endAddon === 'end-both';
                const endLeftOn = aduState.endAddon === 'end-left' || aduState.endAddon === 'end-both';
                const rects: Array<{ key: string; localCx: number; localCy: number; w: number; h: number; opacity?: number }> = [
                  { key: 'base', localCx: 0, localCy: 0, w: MAIN_W, h: MAIN_H }
                ];
                if (endRightOn) rects.push({ key: 'end-right', localCx: 0, localCy: -(MAIN_H / 2 + ADDON_PX / 2), w: MAIN_W, h: ADDON_PX, opacity: 0.85 });
                if (endLeftOn) rects.push({ key: 'end-left', localCx: 0, localCy: MAIN_H / 2 + ADDON_PX / 2, w: MAIN_W, h: ADDON_PX, opacity: 0.85 });
                if (aduState.hasBalcony) rects.push({ key: 'balcony', localCx: -(MAIN_W / 2 + ADDON_PX / 2), localCy: 0, w: ADDON_PX, h: MAIN_H, opacity: 0.75 });
                return rects.map(r => (
                  <rect
                    key={r.key}
                    x={r.localCx - r.w / 2}
                    y={r.localCy - r.h / 2}
                    width={r.w}
                    height={r.h}
                    fill="#3B82F6"
                    fillOpacity={r.opacity ?? 1}
                    stroke="white"
                    strokeWidth="2"
                    rx="2"
                  />
                ));
              })()}
              <line x1={-(MAIN_W / 2)} y1={-(4.429133858 / 2) * FT_TO_UNIT} x2={-(MAIN_W / 2)} y2={(4.429133858 / 2) * FT_TO_UNIT} stroke="#22C55E" strokeWidth="3" strokeLinecap="round" />
              <g transform={`rotate(${-(rotationDeg + aduState.rotation)} 0 0)`}>
                <text x={0} y={-12} textAnchor="middle" className="text-[11px] font-bold fill-white">{isZh ? '拟建' : 'Proposed'}</text>
                <text x={0} y={4} textAnchor="middle" className="text-[11px] font-bold fill-white">ADU</text>
              </g>
            </g>
            {measureEnabled && measureState?.mode === '2d' && (() => {
              const a = measureState.a;
              const b = measureState.b ?? measureState.preview;
              if (!b) return null;
              const distFt = pxToFeet(Math.hypot(b.x - a.x, b.y - a.y));
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const t =
                Number.isFinite(rotationDeg) && Math.abs(rotationDeg) > 1e-9
                  ? `rotate(${-rotationDeg} ${mx} ${my})`
                  : undefined;
              return (
                <g className="pointer-events-none">
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#155dfc" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.9" />
                  <circle cx={a.x} cy={a.y} r="3" fill="#155dfc" />
                  <circle cx={b.x} cy={b.y} r="3" fill="#155dfc" />
                  <text
                    x={mx}
                    y={my - 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#155dfc"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
                    transform={t}
                  >
                    {formatMeasureFt(distFt)}
                  </text>
                </g>
              );
            })()}
          </g>
        </svg>
      </div>
    );
  }

  const toIso = (x: number, y: number, z: number = 0) => {
    const angle = Math.PI / 6;
    const A = Math.cos(angle);
    const B = Math.sin(angle);
    const p = (orbitPitchDeg * Math.PI) / 180;
    const cosP = Math.cos(p);
    const sinP = Math.sin(p);
    const ax = Math.SQRT1_2;
    const ay = -Math.SQRT1_2;
    const az = 0;

    const dot = ax * x + ay * y + az * z;
    const cx = ay * z - az * y;
    const cy = az * x - ax * z;
    const cz = ax * y - ay * x;

    const x1 = x * cosP + cx * sinP + ax * dot * (1 - cosP);
    const y1 = y * cosP + cy * sinP + ay * dot * (1 - cosP);
    const z1 = z * cosP + cz * sinP + az * dot * (1 - cosP);

    return { x: (x1 - y1) * A, y: (x1 + y1) * B - z1 };
  };

  const lotRotationCenter3d = useMemo(() => {
    if (!bboxMercator || !subjectParcel?.geometry) return mapRotationCenter;
    const geom = subjectParcel.geometry;
    const pts: Array<{ x: number; y: number }> = [];
    const pushRing = (ring: any) => {
      if (!Array.isArray(ring)) return;
      for (const pt of ring) {
        const lon = Number(pt?.[0]);
        const lat = Number(pt?.[1]);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        const p = lonLatToCanvas(lon, lat);
        if (p) pts.push(p);
      }
    };
    if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) for (const ring of geom.coordinates) pushRing(ring);
    else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
      for (const poly of geom.coordinates) {
        if (!Array.isArray(poly)) continue;
        for (const ring of poly) pushRing(ring);
      }
    }
    if (pts.length === 0) return mapRotationCenter;
    return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length };
  }, [bboxMercator, subjectParcel?.geometry, mapRotationCenter]);

  const rotateCanvasPoint3d = (p: { x: number; y: number }) => {
    if (!lotRotationCenter3d) return p;
    if (!Number.isFinite(rotationDeg) || Math.abs(rotationDeg) < 1e-9) return p;
    const rad = (rotationDeg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const dx = p.x - lotRotationCenter3d.x;
    const dy = p.y - lotRotationCenter3d.y;
    return { x: lotRotationCenter3d.x + dx * c - dy * s, y: lotRotationCenter3d.y + dx * s + dy * c };
  };

  const geoPolygonToOuterRingsCanvas = (geom: any, opts?: { applyRotation?: boolean; rotationCenter?: 'map' | 'lot' }) => {
    if (!bboxMercator || !geom) return [] as Array<Array<{ x: number; y: number }>>;
    const applyRotation = opts?.applyRotation === true;
    const rot = opts?.rotationCenter === 'lot' ? rotateCanvasPoint3d : rotateCanvasPoint;
    const ringToPts = (ring: any[]) => {
      if (!Array.isArray(ring)) return null as Array<{ x: number; y: number }> | null;
      const pts = ring
        .map((pt: any) => {
          const lon = Number(pt?.[0]);
          const lat = Number(pt?.[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
          const p = lonLatToCanvas(lon, lat);
          if (!p) return null;
          return applyRotation ? rot(p) : p;
        })
        .filter(Boolean) as Array<{ x: number; y: number }>;
      return pts.length >= 3 ? pts : null;
    };
    if (geom.type === 'Polygon' && Array.isArray(geom.coordinates?.[0])) {
      const r = ringToPts(geom.coordinates[0]);
      return r ? [r] : [];
    }
    if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
      const out: Array<Array<{ x: number; y: number }>> = [];
      for (const poly of geom.coordinates) {
        if (!Array.isArray(poly) || !Array.isArray(poly?.[0])) continue;
        const r = ringToPts(poly[0]);
        if (r) out.push(r);
      }
      return out;
    }
    return [];
  };

  const isoLotFrame = useMemo(() => {
    const lotRings = geoPolygonToOuterRingsCanvas(subjectParcel?.geometry, { applyRotation: true, rotationCenter: 'lot' });
    if (lotRings.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const ring of lotRings) {
      for (const p of ring) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
    const w = Math.max(1e-6, maxX - minX);
    const h = Math.max(1e-6, maxY - minY);
    const scale = Math.min(LOT_W / w, LOT_H / h) * 0.96;
    const toLocal = (p: { x: number; y: number }) => ({ x: (p.x - minX) * scale, y: (p.y - minY) * scale });
    return { lotRings, bounds: { minX, minY, maxX, maxY }, scale, toLocal };
  }, [subjectParcel?.geometry, bboxMercator, LOT_W, LOT_H]);

  const aduPivotLocal3d = useMemo(() => {
    if (!isoLotFrame) return null;
    const p = rotateCanvasPoint3d({ x: aduState.cx, y: aduState.cy });
    return isoLotFrame.toLocal(p);
  }, [isoLotFrame, aduState.cx, aduState.cy, rotationDeg, lotRotationCenter3d]);

  const rotateLocalAroundAdu3d = (x: number, y: number, yawDeg: number) => {
    if (!aduPivotLocal3d || !Number.isFinite(yawDeg) || Math.abs(yawDeg) < 1e-9) return { x, y };
    const rad = (yawDeg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const dx = x - aduPivotLocal3d.x;
    const dy = y - aduPivotLocal3d.y;
    return { x: aduPivotLocal3d.x + dx * c - dy * s, y: aduPivotLocal3d.y + dx * s + dy * c };
  };

  const toIsoView = (x: number, y: number, z: number = 0) => {
    const r = rotateLocalAroundAdu3d(x, y, orbitYawDeg);
    return toIso(r.x, r.y, z);
  };

  const isoSceneTransform = useMemo(() => {
    const fallback = `translate(${CANVAS_W / 2}, ${CANVAS_H / 2})`;
    if (!isoLotFrame) return fallback;
    if (!aduPivotLocal3d) return fallback;
    const angle = Math.PI / 6;
    const A = Math.cos(angle);
    const B = Math.sin(angle);
    const toIsoNoPitch = (x: number, y: number, z: number = 0) => ({ x: (x - y) * A, y: (x + y) * B - z });
    const pivotIsoNoPitch = toIsoNoPitch(aduPivotLocal3d.x, aduPivotLocal3d.y, 0);
    const pivotIso = toIso(aduPivotLocal3d.x, aduPivotLocal3d.y, 0);
    let maxDx = 1e-6;
    let maxDy = 1e-6;
    const yawSamples = [0, 90, 180, 270];
    for (const ring of isoLotFrame.lotRings) {
      for (const p of ring) {
        const q = isoLotFrame.toLocal(p);
        for (const yaw of yawSamples) {
          const r = rotateLocalAroundAdu3d(q.x, q.y, yaw);
          const iso = toIsoNoPitch(r.x, r.y, 0);
          maxDx = Math.max(maxDx, Math.abs(iso.x - pivotIsoNoPitch.x));
          maxDy = Math.max(maxDy, Math.abs(iso.y - pivotIsoNoPitch.y));
        }
      }
    }
    const w = Math.max(1e-6, maxDx * 2);
    const h = Math.max(1e-6, maxDy * 2);
    const targetW = CANVAS_W * 0.92;
    const targetH = CANVAS_H * 0.92;
    const s = Math.min(targetW / w, targetH / h) * 0.98;
    const zoom = Math.max(0.6, Math.min(2.2, Number.isFinite(isoZoom) ? isoZoom : 1));
    return `translate(${CANVAS_W / 2}, ${CANVAS_H / 2}) scale(${s * zoom}) translate(${-pivotIso.x}, ${-pivotIso.y})`;
  }, [isoLotFrame, aduPivotLocal3d, CANVAS_W, CANVAS_H, isoZoom, orbitPitchDeg]);

  const isoSceneParams = useMemo(() => {
    const nums = isoSceneTransform.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 5) return null;
    const tx = Number(nums[0]);
    const ty = Number(nums[1]);
    const s = Number(nums[2]);
    const t2x = Number(nums[3]);
    const t2y = Number(nums[4]);
    if (!Number.isFinite(tx) || !Number.isFinite(ty) || !Number.isFinite(s) || Math.abs(s) < 1e-9 || !Number.isFinite(t2x) || !Number.isFinite(t2y)) return null;
    const pivotX = -t2x;
    const pivotY = -t2y;
    return { tx, ty, s, pivotX, pivotY };
  }, [isoSceneTransform]);

  const svgToIso = (p: { x: number; y: number }) => {
    if (!isoSceneParams) return null as { x: number; y: number } | null;
    return { x: (p.x - isoSceneParams.tx) / isoSceneParams.s + isoSceneParams.pivotX, y: (p.y - isoSceneParams.ty) / isoSceneParams.s + isoSceneParams.pivotY };
  };

  const isoToLocal2d = (p: { x: number; y: number }) => {
    const a = Math.PI / 6;
    const A = Math.cos(a);
    const B = Math.sin(a);
    const u = p.x / A;
    const v = p.y / B;
    return { x: (u + v) / 2, y: (v - u) / 2 };
  };

  const isoLotPolygons = useMemo(() => {
    if (!isoLotFrame) return [] as Array<{ key: string; points: string }>;
    return isoLotFrame.lotRings.map((ring, i) => {
      const points = ring.map((p) => {
        const q = isoLotFrame.toLocal(p);
        const iso = toIsoView(q.x, q.y, 0);
        return `${iso.x},${iso.y}`;
      }).join(' ');
      return { key: `iso-lot-${i}`, points };
    });
  }, [isoLotFrame, orbitYawDeg, orbitPitchDeg]);

  const isoNearbyParcelPolygons = useMemo(() => {
    if (!isoLotFrame) return [] as Array<{ key: string; points: string }>;
    const feats = Array.isArray(lookup?.nearbyParcels?.features) ? lookup.nearbyParcels.features : [];
    const out: Array<{ key: string; points: string }> = [];
    for (let i = 0; i < feats.length; i++) {
      const rings = geoPolygonToOuterRingsCanvas(feats[i]?.geometry, { applyRotation: true, rotationCenter: 'lot' });
      if (rings.length === 0) continue;
      for (let j = 0; j < rings.length; j++) {
        const ring = rings[j];
        const points = ring
          .map(p => {
            const q = isoLotFrame.toLocal(p);
            const iso = toIsoView(q.x, q.y, 0);
            return `${iso.x},${iso.y}`;
          })
          .join(' ');
        out.push({ key: `iso-nearby-parcel-${i}-${j}`, points });
      }
    }
    return out;
  }, [isoLotFrame, lookup?.nearbyParcels?.features, orbitYawDeg, orbitPitchDeg]);

  const buildableAreaPolyScreen = useMemo(() => {
    if (!bboxMercator) return null;
    const geom = buildableGeom;
    if (!geom || !Array.isArray(geom.coordinates)) return null;
    const isPoly = geom.type === 'Polygon';
    const isMulti = geom.type === 'MultiPolygon';
    if (!isPoly && !isMulti) return null;

    const mapRing = (ring: any) => {
      if (!Array.isArray(ring)) return [] as Array<{ x: number; y: number }>;
      const pts = ring
        .map((pt: any) => {
          const lon = Number(pt?.[0]);
          const lat = Number(pt?.[1]);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
          return lonLatToCanvas(lon, lat);
        })
        .filter(Boolean) as Array<{ x: number; y: number }>;
      if (pts.length < 3) return [] as Array<{ x: number; y: number }>;
      return pts;
    };

    const polys = (isPoly ? [geom.coordinates] : geom.coordinates)
      .map((polyRings: any) => {
        if (!Array.isArray(polyRings) || polyRings.length === 0) return null;
        const rings = polyRings.map(mapRing).filter((r: any[]) => r.length >= 3) as Array<Array<{ x: number; y: number }>>;
        if (rings.length === 0) return null;
        return { outer: rings[0], holes: rings.slice(1) };
      })
      .filter(Boolean) as Array<{ outer: Array<{ x: number; y: number }>; holes: Array<Array<{ x: number; y: number }>> }>;
    if (polys.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const poly of polys) {
      for (const p of poly.outer) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return { polys, bounds: { minX, minY, maxX, maxY }, center: { x: cx, y: cy } };
  }, [bboxMercator, buildableGeom]);

  const isoBuildableOuters = useMemo(() => {
    if (!isoLotFrame || !buildableAreaPolyScreen) return [] as Array<{ key: string; points: string }>;
    const out: Array<{ key: string; points: string }> = [];
    for (let i = 0; i < buildableAreaPolyScreen.polys.length; i++) {
      const outer = buildableAreaPolyScreen.polys[i]?.outer ?? [];
      if (!Array.isArray(outer) || outer.length < 3) continue;
      const points = outer
        .map(p => {
          const q = isoLotFrame.toLocal(rotateCanvasPoint3d(p));
          const iso = toIsoView(q.x, q.y, 1);
          return `${iso.x},${iso.y}`;
        })
        .join(' ');
      out.push({ key: `iso-buildable-${i}`, points });
    }
    return out;
  }, [isoLotFrame, buildableAreaPolyScreen, orbitYawDeg, orbitPitchDeg]);

  const isoBuildingFaces = useMemo(() => {
    type Face = { key: string; points: string; fill: string; stroke: string; strokeWidth: string; opacity: number };
    type FaceWithDepth = Face & { depth: number; layerDepth: number; groupKey: string; isTop: boolean; ht: number; isoPts: Array<{ x: number; y: number }>; verts3: Array<{ x: number; y: number; z: number }> };
    if (!isoLotFrame) return [] as FaceWithDepth[];

    const decimateRing = (ring: Array<{ x: number; y: number }>, maxPts: number) => {
      if (ring.length <= maxPts) return ring;
      const step = Math.max(1, Math.ceil(ring.length / maxPts));
      const out: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < ring.length; i += step) out.push(ring[i]);
      return out.length >= 3 ? out : ring.slice(0, maxPts);
    };

    const addExtrudedRings = (args: {
      rings: Array<Array<{ x: number; y: number }>>;
      keyPrefix: string;
      stroke: string;
      topFill: string;
      frontFill: string;
      backFill: string;
      opacity: number;
      strokeWidthTop: string;
      strokeWidthSide: string;
      htForRing: (idx: number) => number;
      out: FaceWithDepth[];
    }) => {
      for (let b = 0; b < args.rings.length; b++) {
        const ring = args.rings[b];
        if (ring.length < 3) continue;
        const ht = args.htForRing(b);
        const groupKey = `${args.keyPrefix}-${b}`;

        const topIsoPts = ring.map(p => toIsoView(p.x, p.y, ht));
        const topPts = topIsoPts.map((iso) => `${iso.x},${iso.y}`).join(' ');
        const topVerts3 = ring.map((p) => ({ x: p.x, y: p.y, z: ht }));
        const baseDepth = ring.reduce((s, p) => {
          const rp = rotateLocalAroundAdu3d(p.x, p.y, orbitYawDeg);
          return s + (rp.x + rp.y);
        }, 0) / ring.length;
        const topDepth = baseDepth + ht;
        args.out.push({
          key: `${args.keyPrefix}-${b}-top`,
          points: topPts,
          fill: args.topFill,
          stroke: args.stroke,
          strokeWidth: args.strokeWidthTop,
          opacity: args.opacity,
          depth: topDepth,
          layerDepth: baseDepth,
          groupKey,
          isTop: true,
          ht,
          isoPts: topIsoPts,
          verts3: topVerts3
        });

        for (let i = 0; i < ring.length; i++) {
          const j = (i + 1) % ring.length;
          const p1 = ring[i];
          const p2 = ring[j];
          const rp1 = rotateLocalAroundAdu3d(p1.x, p1.y, orbitYawDeg);
          const rp2 = rotateLocalAroundAdu3d(p2.x, p2.y, orbitYawDeg);
          const dx = rp2.x - rp1.x;
          const dy = rp2.y - rp1.y;
          const fill = (dx + dy) >= 0 ? args.frontFill : args.backFill;
          const quadIsoPts = [
            toIsoView(p1.x, p1.y, 0),
            toIsoView(p2.x, p2.y, 0),
            toIsoView(p2.x, p2.y, ht),
            toIsoView(p1.x, p1.y, ht),
          ];
          const points = quadIsoPts.map(pt => `${pt.x},${pt.y}`).join(' ');
          const quadVerts3 = [
            { x: p1.x, y: p1.y, z: 0 },
            { x: p2.x, y: p2.y, z: 0 },
            { x: p2.x, y: p2.y, z: ht },
            { x: p1.x, y: p1.y, z: ht },
          ];
          const layerDepth = ((rp1.x + rp1.y) + (rp2.x + rp2.y)) / 2;
          const depth = layerDepth + ht / 2;
          args.out.push({
            key: `${args.keyPrefix}-${b}-side-${i}`,
            points,
            fill,
            stroke: args.stroke,
            strokeWidth: args.strokeWidthSide,
            opacity: args.opacity,
            depth,
            layerDepth,
            groupKey,
            isTop: false,
            ht,
            isoPts: quadIsoPts,
            verts3: quadVerts3
          });
        }
      }
    };

    const faces: FaceWithDepth[] = [];
    const pxPerFtIso = FT_TO_UNIT * (isoLotFrame.scale ?? 1);
    const featureMeta = (f: any) => {
      const tags = f?.properties ?? {};
      const tagsLower = (() => { try { return JSON.stringify(tags).toLowerCase(); } catch { return ''; } })();
      const building = (tags?.building ?? '').toString().toLowerCase();
      const hasAddress =
        !!tags?.['addr:housenumber'] ||
        !!tags?.['addr:street'] ||
        !!tags?.['addr:full'] ||
        tagsLower.includes('"addr:housenumber"') ||
        tagsLower.includes('"addr:street"') ||
        tagsLower.includes('"addr:full"');
      const isGarageLike =
        building.includes('garage') ||
        building.includes('carport') ||
        tagsLower.includes('garage') ||
        tagsLower.includes('carport');
      if (isGarageLike) return { role: 'garage' as const, hasAddress };
      const isHouseLike =
        building === 'house' ||
        building.includes('residential') ||
        building.includes('detached') ||
        tagsLower.includes('"building":"house"');
      if (isHouseLike) return { role: 'house' as const, hasAddress };
      return { role: 'other' as const, hasAddress };
    };
    const areaAbs2 = (ring: Array<{ x: number; y: number }>) => Math.abs(polygonAreaAbs(ring));
    const areaSqft = (ring: Array<{ x: number; y: number }>) => {
      const px2 = areaAbs2(ring);
      const k = Math.max(1e-9, pxPerFtIso * pxPerFtIso);
      return px2 / k;
    };

    const nearbyFeats = Array.isArray(nearbyBuildings?.features) ? nearbyBuildings.features : [];
    const nearbyEntries: Array<{ ring: Array<{ x: number; y: number }>; role: 'house' | 'garage' | 'other'; sqft: number; hasAddress: boolean }> = [];
    for (let i = 0; i < nearbyFeats.length; i++) {
      const f = nearbyFeats[i];
      const rings = geoPolygonToOuterRingsCanvas(f?.geometry, { applyRotation: true, rotationCenter: 'lot' });
      const meta = featureMeta(f);
      for (const r of rings) {
        const ring = decimateRing(r.map(p => isoLotFrame.toLocal(p)), 18);
        nearbyEntries.push({ ring, role: meta.role, hasAddress: meta.hasAddress, sqft: areaSqft(ring) });
      }
    }

    addExtrudedRings({
      rings: nearbyEntries.map(e => e.ring),
      keyPrefix: 'nearby-bldg',
      stroke: '#94a3b8',
      topFill: '#e5e7eb',
      frontFill: '#d1d5db',
      backFill: '#cbd5e1',
      opacity: 0.45,
      strokeWidthTop: '0.6',
      strokeWidthSide: '0.5',
      htForRing: (idx) => {
        const e = nearbyEntries[idx];
        if (!e) return 9 * pxPerFtIso;
        if (e.role === 'house') return (e.sqft > 0 && e.sqft < 900 ? 14 : 24) * pxPerFtIso;
        if (e.role === 'garage') return 11 * pxPerFtIso;
        return 9 * pxPerFtIso;
      },
      out: faces
    });

    const subjectFeats = Array.isArray(subjectBuildings?.features) ? subjectBuildings.features : [];
    const subjectEntries: Array<{ ring: Array<{ x: number; y: number }>; role: 'house' | 'garage' | 'other'; sqft: number; hasAddress: boolean }> = [];
    for (let i = 0; i < subjectFeats.length; i++) {
      const f = subjectFeats[i];
      const rings = geoPolygonToOuterRingsCanvas(f?.geometry, { applyRotation: true, rotationCenter: 'lot' });
      const meta = featureMeta(f);
      for (const r of rings) {
        const ring = decimateRing(r.map(p => isoLotFrame.toLocal(p)), 24);
        subjectEntries.push({ ring, role: meta.role, hasAddress: meta.hasAddress, sqft: areaSqft(ring) });
      }
    }

    let mainHouseIdx = 0;
    let mainHouseSqft = 0;
    let anyHouse = false;
    for (let i = 0; i < subjectEntries.length; i++) {
      const e = subjectEntries[i];
      if (e.role !== 'house') continue;
      anyHouse = true;
      if ((e.sqft ?? 0) > mainHouseSqft) {
        mainHouseSqft = e.sqft ?? 0;
        mainHouseIdx = i;
      }
    }
    if (!anyHouse) {
      for (let i = 0; i < subjectEntries.length; i++) {
        const e = subjectEntries[i];
        if ((e.sqft ?? 0) > mainHouseSqft) {
          mainHouseSqft = e.sqft ?? 0;
          mainHouseIdx = i;
        }
      }
    }

    addExtrudedRings({
      rings: subjectEntries.map(e => e.ring),
      keyPrefix: 'subject-bldg',
      stroke: '#7a8698',
      topFill: '#c8ced8',
      frontFill: '#adb5c4',
      backFill: '#9aa4b4',
      opacity: 0.78,
      strokeWidthTop: '0.7',
      strokeWidthSide: '0.6',
      htForRing: (idx) => {
        const e = subjectEntries[idx];
        if (!e) return 9 * pxPerFtIso;
        if (e.role === 'house' || idx === mainHouseIdx) return (e.sqft > 0 && e.sqft < 900 ? 14 : 24) * pxPerFtIso;
        if (e.role === 'garage') return 11 * pxPerFtIso;
        if (!e.hasAddress && mainHouseSqft > 1e-6 && e.sqft > 0 && e.sqft < mainHouseSqft * 0.65) return 11 * pxPerFtIso;
        return 9 * pxPerFtIso;
      },
      out: faces
    });

    faces.sort((a, b) => a.depth - b.depth);
    return faces;
  }, [isoLotFrame, subjectBuildings, nearbyBuildings, orbitYawDeg, orbitPitchDeg]);

  const buildingHitFaces = useMemo(() => {
    const pointInPoly = (p: { x: number; y: number }, poly: Array<{ x: number; y: number }>) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[j];
        const b = poly[i];
        const intersect = ((a.y > p.y) !== (b.y > p.y)) && (p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x);
        if (intersect) inside = !inside;
      }
      return inside;
    };
    return isoBuildingFaces
      .map((f: any) => {
        const poly = Array.isArray(f.isoPts) ? (f.isoPts as Array<{ x: number; y: number }>) : [];
        const verts3 = Array.isArray(f.verts3) ? (f.verts3 as Array<{ x: number; y: number; z: number }>) : [];
        if (poly.length < 3 || verts3.length !== poly.length) return null;
        return {
          key: String(f.key),
          groupKey: String(f.groupKey),
          isTop: !!f.isTop,
          ht: Number(f.ht) || 0,
          depth: Number(f.depth) || 0,
          poly,
          verts3,
          hit: (p: any) => pointInPoly(p, poly)
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.depth - a.depth);
  }, [isoBuildingFaces]);

  const lotHitSegments = useMemo(() => {
    if (!isoLotFrame) return [] as Array<{ aIso: { x: number; y: number }; bIso: { x: number; y: number }; a3: { x: number; y: number; z: number }; b3: { x: number; y: number; z: number } }>;
    const out: Array<{ aIso: { x: number; y: number }; bIso: { x: number; y: number }; a3: { x: number; y: number; z: number }; b3: { x: number; y: number; z: number } }> = [];
    for (const ring of isoLotFrame.lotRings) {
      if (!ring || ring.length < 2) continue;
      const pts = ring.map((p) => isoLotFrame.toLocal(p));
      if (pts.length < 2) continue;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const aIso = toIsoView(a.x, a.y, 0);
        const bIso = toIsoView(b.x, b.y, 0);
        out.push({ aIso, bIso, a3: { x: a.x, y: a.y, z: 0 }, b3: { x: b.x, y: b.y, z: 0 } });
      }
    }
    return out;
  }, [isoLotFrame, orbitYawDeg, orbitPitchDeg]);

  const lotHitVertices = useMemo(() => {
    if (!isoLotFrame) return [] as Array<{ iso: { x: number; y: number }; local: { x: number; y: number; z: number } }>;
    const raw: Array<{ iso: { x: number; y: number }; local: { x: number; y: number; z: number } }> = [];
    for (const ring of isoLotFrame.lotRings) {
      if (!ring || ring.length < 2) continue;
      const pts = ring.map((p) => isoLotFrame.toLocal(p));
      for (const p of pts) {
        raw.push({ iso: toIsoView(p.x, p.y, 0), local: { x: p.x, y: p.y, z: 0 } });
      }
    }
    const dedup: Array<{ iso: { x: number; y: number }; local: { x: number; y: number; z: number } }> = [];
    const eps = 0.75;
    for (const p of raw) {
      let exists = false;
      for (const q of dedup) {
        if (Math.hypot(p.iso.x - q.iso.x, p.iso.y - q.iso.y) <= eps) {
          exists = true;
          break;
        }
      }
      if (!exists) dedup.push(p);
    }
    return dedup;
  }, [isoLotFrame, orbitYawDeg, orbitPitchDeg]);

  const snapIsoPoint = (pIso: { x: number; y: number }) => {
    const segPickRadius = 7;
    const cornerPickRadius = 9;
    const cornerT = 0.12;
    const vertexPickRadius = 8;
    let best: null | { d: number; iso: { x: number; y: number } } = null;

    let bestV: null | { d: number; iso: { x: number; y: number } } = null;
    for (const v of lotHitVertices) {
      const d = Math.hypot(pIso.x - v.iso.x, pIso.y - v.iso.y);
      if (d > vertexPickRadius) continue;
      if (!bestV || d < bestV.d) bestV = { d, iso: v.iso };
    }
    if (bestV) return { iso: bestV.iso, snapped: true };

    const distToSeg2d = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const apx = p.x - a.x;
      const apy = p.y - a.y;
      const ab2 = abx * abx + aby * aby;
      const t = ab2 < 1e-9 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
      const cx = a.x + abx * t;
      const cy = a.y + aby * t;
      const dx = p.x - cx;
      const dy = p.y - cy;
      return { d: Math.hypot(dx, dy), t };
    };

    const considerSeg = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const { d, t } = distToSeg2d(pIso, a, b);
      if (d > cornerPickRadius) return;
      let tt = t;
      let effectiveD = d;
      if (t <= cornerT || t >= 1 - cornerT) {
        tt = t <= cornerT ? 0 : 1;
        effectiveD = d - 3;
      }
      if (effectiveD > segPickRadius) return;
      const iso = { x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt };
      if (!best || effectiveD < best.d) best = { d: effectiveD, iso };
    };

    for (const s of lotHitSegments) considerSeg(s.aIso, s.bIso);
    for (const f of buildingHitFaces as any[]) {
      const poly = f.poly as Array<{ x: number; y: number }>;
      if (!poly || poly.length < 2) continue;
      for (let i = 0; i < poly.length; i++) considerSeg(poly[i], poly[(i + 1) % poly.length]);
    }

    return best ? { iso: best.iso, snapped: true } : { iso: pIso, snapped: false };
  };

  const aduLocal = useMemo(() => {
    if (!isoLotFrame) return { x: aduState.cx - LOT_X, y: aduState.cy - LOT_Y };
    const base = isoLotFrame.toLocal(rotateCanvasPoint3d({ x: aduState.cx, y: aduState.cy }));
    return base;
  }, [isoLotFrame, aduState.cx, aduState.cy, rotationDeg]);

  const aduIsoBox = useMemo(() => {
    const rad = (aduState.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const hw = MAIN_W / 2;
    const hh = MAIN_H / 2;
    const pts = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ].map((p) => ({ x: aduLocal.x + (p.x * cos - p.y * sin), y: aduLocal.y + (p.x * sin + p.y * cos) }));
    const proj = pts.map((p) => toIsoView(p.x, p.y, 0));
    return proj.map((p) => `${p.x},${p.y}`).join(' ');
  }, [aduLocal, aduState.rotation, orbitYawDeg, orbitPitchDeg]);

  const glbEnabled = !!isoSceneParams && !!aduPivotLocal3d && !!isoLotFrame;
  const formatBytes = (n: number) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return '0 MB';
    const mb = v / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(gb < 10 ? 1 : 0)} GB`;
  };

  return (
    <div className="absolute inset-0 bg-[#fafbfc]" ref={canvasHostRef}>
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          if (measureEnabled) {
            const p = clientToSvg(e.clientX, e.clientY);
            if (!p) return;
            const iso = svgToIso(p);
            if (!iso) return;
            const glb3 = glbPickRef.current?.pick(e.clientX, e.clientY) ?? null;
            const snapped = glb3 ? { iso: toIsoView(glb3.x, glb3.y, glb3.z), snapped: !!glb3.snapped } : snapIsoPoint(iso);
            setMeasureState((prev) => {
              if (!prev || prev.mode !== '3d' || prev.b) {
                return { mode: '3d', a: snapped.iso, b: null, preview: null, aSnapped: snapped.snapped, bSnapped: false, previewSnapped: false, a3: glb3, b3: null, preview3: null };
              }
              return { ...prev, b: snapped.iso, preview: null, bSnapped: snapped.snapped, previewSnapped: false, b3: glb3, preview3: null };
            });
            return;
          }
          orbitStartRef.current = { x: e.clientX, y: e.clientY, yaw: orbitYawDeg, pitch: orbitPitchDeg };
          setOrbiting3d(true);
        }}
        onMouseMove={(e) => {
          if (!measureEnabled) return;
          const p = clientToSvg(e.clientX, e.clientY);
          if (!p) return;
          const iso = svgToIso(p);
          if (!iso) return;
          const glb3 = glbPickRef.current?.pick(e.clientX, e.clientY) ?? null;
          const snapped = glb3 ? { iso: toIsoView(glb3.x, glb3.y, glb3.z), snapped: !!glb3.snapped } : snapIsoPoint(iso);
          setMeasureHover((prev) => {
            const next = snapped;
            if (!prev) return next;
            if (prev.snapped === next.snapped && Math.abs(prev.iso.x - next.iso.x) < 1e-6 && Math.abs(prev.iso.y - next.iso.y) < 1e-6) return prev;
            return next;
          });
          if (buildingHitFaces.length) {
            const hit = buildingHitFaces.find((f: any) => f.hit(iso)) as any;
            const next = hit ? String(hit.groupKey) : null;
            setHoveredBuildingKey((prev) => (prev === next ? prev : next));
          } else {
            setHoveredBuildingKey((prev) => (prev === null ? prev : null));
          }
          setMeasureState((prev) => {
            if (!prev || prev.mode !== '3d' || prev.b) return prev;
            return { ...prev, preview: snapped.iso, previewSnapped: snapped.snapped, preview3: glb3 };
          });
        }}
        onMouseLeave={() => {
          if (!measureEnabled) return;
          setHoveredBuildingKey((prev) => (prev === null ? prev : null));
          setMeasureHover((prev) => (prev === null ? prev : null));
          setMeasureState((prev) => {
            if (!prev || prev.mode !== '3d' || prev.b) return prev;
            return { ...prev, preview: null, previewSnapped: false, preview3: null };
          });
        }}
        style={{ cursor: measureEnabled ? 'crosshair' : (orbiting3d ? 'grabbing' : 'grab') }}
      >
        <defs>
          <filter id="softShadow" x="-20%" y="-10%" width="140%" height="130%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
          </filter>
          <filter id="softShadowSm" x="-30%" y="-15%" width="160%" height="150%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
          <linearGradient id="fadeUpAlpha" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="55%" stopColor="white" stopOpacity="0.55" />
            <stop offset="100%" stopColor="white" stopOpacity="0.15" />
          </linearGradient>
          <mask id="fadeUpMask" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
            <rect x="0" y="0" width="1" height="1" fill="url(#fadeUpAlpha)" />
          </mask>
          <linearGradient id="nearbyBldgTop" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="nearbyBldgFront" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#d1d5db" stopOpacity="0.92" />
            <stop offset="40%" stopColor="#d1d5db" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="nearbyBldgBack" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.86" />
            <stop offset="40%" stopColor="#cbd5e1" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <g transform={isoSceneTransform}>
          {isoNearbyParcelPolygons.map((p) => (
            <polygon key={p.key} points={p.points} fill="none" stroke="#e2e8f0" strokeWidth="1.2" opacity="0.55" />
          ))}
          {isoLotPolygons.map((p) => (
            <polygon key={p.key} points={p.points} fill="#ffffff" stroke="#d1d5db" strokeWidth="0.8" />
          ))}
          {isoBuildableOuters.map((p) => (
            <polygon key={p.key} points={p.points} fill="none" stroke="#155dfc" strokeWidth="0.8" strokeDasharray="8 5" opacity="0.38" />
          ))}

          {(() => {
            if (isoBuildingFaces.length === 0) return null;
            const isHovered = (f: any) => hoveredBuildingKey && String(f.groupKey) === hoveredBuildingKey;
            const fillFor = (f: any) =>
              String(f.key).startsWith('nearby-bldg')
                ? (f.fill === '#e5e7eb'
                  ? 'url(#nearbyBldgTop)'
                  : (f.fill === '#d1d5db' ? 'url(#nearbyBldgFront)' : 'url(#nearbyBldgBack)'))
                : f.fill;
            if (!aduPivotLocal3d) {
              return (
                <g>
                  {isoBuildingFaces.map((f: any) => (
                    <g key={f.key}>
                      <polygon
                        points={f.points}
                        fill={fillFor(f)}
                        stroke={f.stroke}
                        strokeWidth={f.strokeWidth}
                        opacity={String(f.key).startsWith('nearby-bldg') ? 1 : f.opacity}
                        strokeOpacity={String(f.key).startsWith('nearby-bldg') ? 0.35 : 1}
                        mask={String(f.key).startsWith('subject-bldg') ? 'url(#fadeUpMask)' : undefined}
                        strokeLinejoin="round"
                      />
                      {isHovered(f) && (
                        <>
                          <polygon points={f.points} fill="#60a5fa" opacity="0.14" stroke="none" />
                          <polygon points={f.points} fill="none" stroke="#2563eb" strokeWidth="1.1" opacity="0.55" strokeLinejoin="round" />
                        </>
                      )}
                    </g>
                  ))}
                </g>
              );
            }
            const rp = rotateLocalAroundAdu3d(aduPivotLocal3d.x, aduPivotLocal3d.y, orbitYawDeg);
            const pivotLayerDepth = (rp.x + rp.y);
            const behind = isoBuildingFaces.filter((f: any) => f.layerDepth <= pivotLayerDepth);
            if (behind.length === 0) return null;
            return (
              <g>
                {behind.map((f: any) => (
                  <g key={f.key}>
                    <polygon
                      points={f.points}
                      fill={fillFor(f)}
                      stroke={f.stroke}
                      strokeWidth={f.strokeWidth}
                      opacity={String(f.key).startsWith('nearby-bldg') ? 1 : f.opacity}
                      strokeOpacity={String(f.key).startsWith('nearby-bldg') ? 0.35 : 1}
                      mask={String(f.key).startsWith('subject-bldg') ? 'url(#fadeUpMask)' : undefined}
                      strokeLinejoin="round"
                    />
                    {isHovered(f) && (
                      <>
                        <polygon points={f.points} fill="#60a5fa" opacity="0.14" stroke="none" />
                        <polygon points={f.points} fill="none" stroke="#2563eb" strokeWidth="1.1" opacity="0.55" strokeLinejoin="round" />
                      </>
                    )}
                  </g>
                ))}
              </g>
            );
          })()}

          {(() => {
            if (glbReady) return null;
            const getCorners = (cx: number, cy: number, w: number, h: number, angleDeg: number) => {
              const rad = (angleDeg * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              const hw = w / 2;
              const hh = h / 2;
              const pts = [
                { x: -hw, y: -hh },
                { x: hw, y: -hh },
                { x: hw, y: hh },
                { x: -hw, y: hh }
              ];
              return pts.map((p) => ({ x: cx + (p.x * cos - p.y * sin), y: cy + (p.x * sin + p.y * cos) }));
            };

            const projectAduBox = (localCx: number, localCy: number, w: number, h: number) => {
              const rad = aduState.rotation * Math.PI / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              const centerMapLocal = {
                x: aduState.cx + (localCx * cos - localCy * sin),
                y: aduState.cy + (localCx * sin + localCy * cos)
              };
              const cornersMapLocal = getCorners(centerMapLocal.x, centerMapLocal.y, w, h, aduState.rotation);
              const cornersScreen = cornersMapLocal.map(rotateCanvasPoint3d);
              const cornersLocal = isoLotFrame
                ? cornersScreen.map(p => isoLotFrame.toLocal(p))
                : cornersScreen.map(p => ({ x: p.x - LOT_X, y: p.y - LOT_Y }));
              return cornersLocal;
            };

            const renderProjectedBox = (corners2d: Array<{ x: number; y: number }>, ht: number, fills: any, label?: string, opacity?: number) => {
              if (corners2d.length < 4) return null;
              const v3d = [
                ...corners2d.map(p => ({ x: p.x, y: p.y, z: 0 })),
                ...corners2d.map(p => ({ x: p.x, y: p.y, z: ht }))
              ];
              const proj = v3d.map(v => toIsoView(v.x, v.y, v.z));
              const pts = (idxs: number[]) => idxs.map(j => `${proj[j].x},${proj[j].y}`).join(' ');

              const sideFaces = [
                { idxs: [0, 1, 5, 4], p1: 0, p2: 1 },
                { idxs: [1, 2, 6, 5], p1: 1, p2: 2 },
                { idxs: [2, 3, 7, 6], p1: 2, p2: 3 },
                { idxs: [3, 0, 4, 7], p1: 3, p2: 0 },
              ].map((f) => {
                const p1 = v3d[f.p1];
                const p2 = v3d[f.p2];
                const depth = (p1.x + p2.x) / 2 + (p1.y + p2.y) / 2;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const isVisible = dx > dy;
                const nx = dy;
                const ny = -dx;
                let fill = fills.back;
                let stroke = fills.stroke;
                if (isVisible) {
                  fill = nx < ny ? fills.frontLeft : fills.frontRight;
                  stroke = fills.strokeFront;
                }
                return { ...f, depth, isVisible, fill, stroke };
              });

              sideFaces.sort((a, b) => a.depth - b.depth);

              return (
                <g key={label || `${corners2d[0].x}-${corners2d[0].y}`} opacity={opacity ?? 1}>
                  <g mask="url(#fadeUpMask)">
                    <polygon points={pts([0, 1, 2, 3])} fill={fills.bottom} stroke={fills.stroke} strokeWidth="0.3" strokeLinejoin="round" />
                    {sideFaces.map((f, i) => (
                      <polygon key={i} points={pts(f.idxs)} fill={f.fill} stroke={f.stroke} strokeWidth={f.isVisible ? "0.8" : "0.5"} strokeLinejoin="round" />
                    ))}
                    <polygon points={pts([4, 5, 6, 7])} fill={fills.top} stroke={fills.frontRight} strokeWidth="0.8" strokeLinejoin="round" />
                  </g>
                  {label === "Proposed ADU" && (
                    <>
                      <text x={(proj[4].x + proj[6].x) / 2} y={(proj[4].y + proj[6].y) / 2 - 6} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">
                        {isZh ? '拟建 ADU' : label}
                      </text>
                      <text x={(proj[4].x + proj[6].x) / 2} y={(proj[4].y + proj[6].y) / 2 + 8} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontSize="10" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif">
                        {isZh ? '600 平方英尺' : '600 sqft'}
                      </text>
                    </>
                  )}
                </g>
              );
            };

            const ht = 16 * FT_TO_UNIT * (isoLotFrame?.scale ?? 1);
            const endRightOn = aduState.endAddon === 'end-right' || aduState.endAddon === 'end-both';
            const endLeftOn = aduState.endAddon === 'end-left' || aduState.endAddon === 'end-both';
            const rects: Array<{ key: string; localCx: number; localCy: number; w: number; h: number; kind: 'main' | 'addon' | 'deck' }> = [
              { key: 'main', localCx: 0, localCy: 0, w: MAIN_W, h: MAIN_H, kind: 'main' }
            ];
            if (endRightOn) rects.push({ key: 'end-right', localCx: 0, localCy: -(MAIN_H / 2 + ADDON_PX / 2), w: MAIN_W, h: ADDON_PX, kind: 'addon' });
            if (endLeftOn) rects.push({ key: 'end-left', localCx: 0, localCy: MAIN_H / 2 + ADDON_PX / 2, w: MAIN_W, h: ADDON_PX, kind: 'addon' });
            if (aduState.hasBalcony) rects.push({ key: 'balcony', localCx: -(MAIN_W / 2 + ADDON_PX / 2), localCy: 0, w: ADDON_PX, h: MAIN_H, kind: 'deck' });

            const fillsMain = {
              bottom: "#2563eb",
              back: "#1d4ed8",
              frontLeft: "#2563eb",
              frontRight: "#3b82f6",
              top: "#60a5fa",
              stroke: "#1e3a8a",
              strokeFront: "#1e40af"
            };
            const fillsAddon = {
              bottom: "#2563eb",
              back: "#1e40af",
              frontLeft: "#2563eb",
              frontRight: "#3b82f6",
              top: "#7dd3fc",
              stroke: "#1e3a8a",
              strokeFront: "#1e40af"
            };
            const fillsDeck = {
              bottom: "#3b82f6",
              back: "#2563eb",
              frontLeft: "#3b82f6",
              frontRight: "#60a5fa",
              top: "#93c5fd",
              stroke: "#1e40af",
              strokeFront: "#1e40af"
            };

            const boxes = rects.map((r) => {
              const corners = projectAduBox(r.localCx, r.localCy, r.w, r.h);
              const fills = r.kind === 'main' ? fillsMain : (r.kind === 'deck' ? fillsDeck : fillsAddon);
              const opacity = r.kind === 'main' ? 1 : (r.kind === 'deck' ? 0.75 : 0.85);
              const label = r.kind === 'main' ? "Proposed ADU" : undefined;
              return <g key={r.key}>{renderProjectedBox(corners, ht, fills, label, opacity)}</g>;
            });

            const doorMarkLen = 4.429133858 * FT_TO_UNIT * (isoLotFrame?.scale ?? 1);
            const doorHt = 7.545931759 * FT_TO_UNIT * (isoLotFrame?.scale ?? 1);
            const rad = aduState.rotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const doorX = -(MAIN_W / 2);
            const doorY1 = -doorMarkLen / 2;
            const doorY2 = doorMarkLen / 2;
            const p1 = { x: aduState.cx + (doorX * cos - doorY1 * sin), y: aduState.cy + (doorX * sin + doorY1 * cos) };
            const p2 = { x: aduState.cx + (doorX * cos - doorY2 * sin), y: aduState.cy + (doorX * sin + doorY2 * cos) };
            const s1 = rotateCanvasPoint3d(p1);
            const s2 = rotateCanvasPoint3d(p2);
            const l1 = isoLotFrame ? isoLotFrame.toLocal(s1) : { x: s1.x - LOT_X, y: s1.y - LOT_Y };
            const l2 = isoLotFrame ? isoLotFrame.toLocal(s2) : { x: s2.x - LOT_X, y: s2.y - LOT_Y };
            const a0 = toIsoView(l1.x, l1.y, 0);
            const a1 = toIsoView(l1.x, l1.y, doorHt);
            const b1 = toIsoView(l2.x, l2.y, doorHt);
            const b0 = toIsoView(l2.x, l2.y, 0);

            return (
              <g>
                {boxes}
                <g>
                  <line x1={a0.x} y1={a0.y} x2={a1.x} y2={a1.y} stroke="#22C55E" strokeWidth="1.2" opacity="0.55" />
                  <line x1={b0.x} y1={b0.y} x2={b1.x} y2={b1.y} stroke="#22C55E" strokeWidth="1.2" opacity="0.55" />
                  <line x1={a1.x} y1={a1.y} x2={b1.x} y2={b1.y} stroke="#22C55E" strokeWidth="1.6" opacity="0.95" strokeLinecap="round" />
                </g>
              </g>
            );
          })()}

        </g>
      </svg>

      <IsoGlbOverlay
        enabled={glbEnabled}
        modelId={glbModelId}
        canvasW={CANVAS_W}
        canvasH={CANVAS_H}
        isoSceneParams={isoSceneParams}
        orbitYawDeg={orbitYawDeg}
        orbitPitchDeg={orbitPitchDeg}
        aduCenterLocal={aduPivotLocal3d}
        aduRotationDeg={aduState.rotation}
        lotRotationDeg={rotationDeg}
        hasBalcony={aduState.hasBalcony === true}
        endAddon={aduState.endAddon}
        showRoof={glbShowRoof}
        onHasRoofChange={onGlbHasRoofChange}
        targetW={MAIN_W * (isoLotFrame?.scale ?? 1)}
        targetD={MAIN_H * (isoLotFrame?.scale ?? 1)}
        onReadyChange={setGlbReady}
        onProgressChange={setGlbProgress}
        onPickApiChange={(api) => { glbPickRef.current = api; }}
      />

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="fadeUpAlpha2" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="55%" stopColor="white" stopOpacity="0.55" />
            <stop offset="100%" stopColor="white" stopOpacity="0.15" />
          </linearGradient>
          <mask id="fadeUpMask2" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
            <rect x="0" y="0" width="1" height="1" fill="url(#fadeUpAlpha2)" />
          </mask>
          <linearGradient id="nearbyBldgTop2" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="nearbyBldgFront2" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#d1d5db" stopOpacity="0.92" />
            <stop offset="40%" stopColor="#d1d5db" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="nearbyBldgBack2" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0.86" />
            <stop offset="40%" stopColor="#cbd5e1" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <g transform={isoSceneTransform}>
          {(() => {
            if (isoBuildingFaces.length === 0) return null;
            if (!aduPivotLocal3d) return null;
            const isHovered = (f: any) => hoveredBuildingKey && String(f.groupKey) === hoveredBuildingKey;
            const fillFor = (f: any) =>
              String(f.key).startsWith('nearby-bldg')
                ? (f.fill === '#e5e7eb'
                  ? 'url(#nearbyBldgTop2)'
                  : (f.fill === '#d1d5db' ? 'url(#nearbyBldgFront2)' : 'url(#nearbyBldgBack2)'))
                : f.fill;
            const rp = rotateLocalAroundAdu3d(aduPivotLocal3d.x, aduPivotLocal3d.y, orbitYawDeg);
            const pivotLayerDepth = (rp.x + rp.y);
            const front = isoBuildingFaces.filter((f: any) => f.layerDepth > pivotLayerDepth);
            if (front.length === 0) return null;
            return (
              <g>
                {front.map((f: any) => (
                  <g key={f.key}>
                    <polygon
                      points={f.points}
                      fill={fillFor(f)}
                      stroke={f.stroke}
                      strokeWidth={f.strokeWidth}
                      opacity={String(f.key).startsWith('nearby-bldg') ? 1 : (String(f.key).startsWith('subject-bldg') ? f.opacity * 0.75 : f.opacity)}
                      strokeOpacity={String(f.key).startsWith('nearby-bldg') ? 0.35 : 1}
                      strokeLinejoin="round"
                    />
                    {isHovered(f) && (
                      <>
                        <polygon points={f.points} fill="#60a5fa" opacity="0.14" stroke="none" />
                        <polygon points={f.points} fill="none" stroke="#2563eb" strokeWidth="1.1" opacity="0.55" strokeLinejoin="round" />
                      </>
                    )}
                  </g>
                ))}
              </g>
            );
          })()}
          {measureEnabled && measureState?.mode === '3d' && (() => {
            const a = measureState.a;
            const b = measureState.b ?? measureState.preview;
            if (!b) return null;
            if (!isoLotFrame) return null;
            if (!aduPivotLocal3d) return null;

            const angle = Math.PI / 6;
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const aduHt = 16 * FT_TO_UNIT * isoLotFrame.scale;

            const endRightOn = aduState.endAddon === 'end-right' || aduState.endAddon === 'end-both';
            const endLeftOn = aduState.endAddon === 'end-left' || aduState.endAddon === 'end-both';
            const rectsForPick: Array<{ localCx: number; localCy: number; w: number; h: number }> = [
              { localCx: 0, localCy: 0, w: MAIN_W, h: MAIN_H }
            ];
            if (endRightOn) rectsForPick.push({ localCx: 0, localCy: MAIN_H / 2 + ADDON_PX / 2, w: MAIN_W, h: ADDON_PX });
            if (endLeftOn) rectsForPick.push({ localCx: 0, localCy: -(MAIN_H / 2 + ADDON_PX / 2), w: MAIN_W, h: ADDON_PX });
            if (aduState.hasBalcony) rectsForPick.push({ localCx: (MAIN_W / 2 + ADDON_PX / 2), localCy: 0, w: ADDON_PX, h: MAIN_H });

            const getCornersForPick = (cx: number, cy: number, w: number, h: number, angleDeg: number) => {
              const rad = (angleDeg * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              const hw = w / 2;
              const hh = h / 2;
              const pts = [
                { x: -hw, y: -hh },
                { x: hw, y: -hh },
                { x: hw, y: hh },
                { x: -hw, y: hh }
              ];
              return pts.map((p) => ({ x: cx + (p.x * cos - p.y * sin), y: cy + (p.x * sin + p.y * cos) }));
            };

            const projectAduBoxForPick = (localCx: number, localCy: number, w: number, h: number) => {
              const rad = aduState.rotation * Math.PI / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);
              const centerMapLocal = {
                x: aduState.cx + (localCx * cos - localCy * sin),
                y: aduState.cy + (localCx * sin + localCy * cos)
              };
              const cornersMapLocal = getCornersForPick(centerMapLocal.x, centerMapLocal.y, w, h, aduState.rotation);
              const cornersScreen = cornersMapLocal.map(rotateCanvasPoint3d);
              const cornersLocal = isoLotFrame
                ? cornersScreen.map(p => isoLotFrame.toLocal(p))
                : cornersScreen.map(p => ({ x: p.x - LOT_X, y: p.y - LOT_Y }));
              return cornersLocal;
            };

            const distToSeg2d = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
              const abx = b.x - a.x;
              const aby = b.y - a.y;
              const apx = p.x - a.x;
              const apy = p.y - a.y;
              const ab2 = abx * abx + aby * aby;
              const t = ab2 < 1e-9 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
              const cx = a.x + abx * t;
              const cy = a.y + aby * t;
              const dx = p.x - cx;
              const dy = p.y - cy;
              return { d: Math.hypot(dx, dy), t };
            };

            const pick3dPoint = (pIso: { x: number; y: number }) => {
              const segPickRadius = 7;
              const cornerPickRadius = 9;
              const cornerT = 0.12;
              const vertexPickRadius = 8;
              let best: null | { d: number; x: number; y: number; z: number; iso: { x: number; y: number }; snapped: boolean } = null;

              for (const r of rectsForPick) {
                const corners = projectAduBoxForPick(r.localCx, r.localCy, r.w, r.h);
                if (corners.length !== 4) continue;

                const bottom3 = corners.map((c) => ({ x: c.x, y: c.y, z: 0 }));
                const top3 = corners.map((c) => ({ x: c.x, y: c.y, z: aduHt }));
                const bottomIso = corners.map((c) => toIsoView(c.x, c.y, 0));
                const topIso = corners.map((c) => toIsoView(c.x, c.y, aduHt));

                const considerSeg = (
                  a2: { x: number; y: number },
                  b2: { x: number; y: number },
                  a3: { x: number; y: number; z: number },
                  b3: { x: number; y: number; z: number }
                ) => {
                  const { d, t } = distToSeg2d(pIso, a2, b2);
                  if (d > segPickRadius) return;
                  const x = a3.x + (b3.x - a3.x) * t;
                  const y = a3.y + (b3.y - a3.y) * t;
                  const z = a3.z + (b3.z - a3.z) * t;
                  const iso = { x: a2.x + (b2.x - a2.x) * t, y: a2.y + (b2.y - a2.y) * t };
                  if (!best || d < best.d) best = { d, x, y, z, iso, snapped: true };
                };

                for (let i = 0; i < 4; i++) {
                  const j = (i + 1) % 4;
                  considerSeg(bottomIso[i], bottomIso[j], bottom3[i], bottom3[j]);
                  considerSeg(topIso[i], topIso[j], top3[i], top3[j]);
                  considerSeg(bottomIso[i], topIso[i], bottom3[i], top3[i]);
                }
              }

              if (best) return { x: best.x, y: best.y, z: best.z, iso: best.iso, snapped: best.snapped };

              let bestLotV: null | { d: number; x: number; y: number; z: number; iso: { x: number; y: number } } = null;
              for (const v of lotHitVertices) {
                const d = Math.hypot(pIso.x - v.iso.x, pIso.y - v.iso.y);
                if (d > vertexPickRadius) continue;
                if (!bestLotV || d < bestLotV.d) bestLotV = { d, x: v.local.x, y: v.local.y, z: v.local.z, iso: v.iso };
              }
              if (bestLotV) return { x: bestLotV.x, y: bestLotV.y, z: bestLotV.z, iso: bestLotV.iso, snapped: true };

              const invertOnPlane = (
                p: { x: number; y: number },
                origin: { x: number; y: number; z: number },
                u: { x: number; y: number; z: number },
                v: { x: number; y: number; z: number }
              ) => {
                const p0 = toIsoView(origin.x, origin.y, origin.z);
                const pu = toIsoView(origin.x + u.x, origin.y + u.y, origin.z + u.z);
                const pv = toIsoView(origin.x + v.x, origin.y + v.y, origin.z + v.z);
                const ex = { x: pu.x - p0.x, y: pu.y - p0.y };
                const ey = { x: pv.x - p0.x, y: pv.y - p0.y };
                const det = ex.x * ey.y - ex.y * ey.x;
                if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return { x: origin.x, y: origin.y, z: origin.z };
                const dx = p.x - p0.x;
                const dy = p.y - p0.y;
                const a = (dx * ey.y - dy * ey.x) / det;
                const b = (ex.x * dy - ex.y * dx) / det;
                return { x: origin.x + u.x * a + v.x * b, y: origin.y + u.y * a + v.y * b, z: origin.z + u.z * a + v.z * b };
              };

              for (const s of lotHitSegments) {
                const { d, t } = distToSeg2d(pIso, s.aIso, s.bIso);
                if (d > segPickRadius) continue;
                const x = s.a3.x + (s.b3.x - s.a3.x) * t;
                const y = s.a3.y + (s.b3.y - s.a3.y) * t;
                const z = 0;
                const iso = { x: s.aIso.x + (s.bIso.x - s.aIso.x) * t, y: s.aIso.y + (s.bIso.y - s.aIso.y) * t };
                if (!best || d < best.d) best = { d, x, y, z, iso, snapped: true };
              }
              if (best) return { x: best.x, y: best.y, z: best.z, iso: best.iso, snapped: best.snapped };

              if (buildingHitFaces.length) {
                for (const f of buildingHitFaces as any[]) {
                  const poly = f.poly as Array<{ x: number; y: number }>;
                  const v3 = f.verts3 as Array<{ x: number; y: number; z: number }>;
                  if (poly.length < 3 || v3.length !== poly.length) continue;
                  for (let i = 0; i < poly.length; i++) {
                    const j = (i + 1) % poly.length;
                    const { d, t } = distToSeg2d(pIso, poly[i], poly[j]);
                    if (d > cornerPickRadius) continue;
                    let tt = t;
                    let effectiveD = d;
                    if (d <= cornerPickRadius && (t <= cornerT || t >= 1 - cornerT)) {
                      tt = t <= cornerT ? 0 : 1;
                      effectiveD = d - 3;
                    }
                    if (effectiveD > segPickRadius) continue;
                    const a3 = v3[i];
                    const b3 = v3[j];
                    const x = a3.x + (b3.x - a3.x) * tt;
                    const y = a3.y + (b3.y - a3.y) * tt;
                    const z = a3.z + (b3.z - a3.z) * tt;
                    const iso = { x: poly[i].x + (poly[j].x - poly[i].x) * tt, y: poly[i].y + (poly[j].y - poly[i].y) * tt };
                    if (!best || effectiveD < best.d) best = { d: effectiveD, x, y, z, iso, snapped: true };
                  }
                }
                if (best) return { x: best.x, y: best.y, z: best.z, iso: best.iso, snapped: best.snapped };

                const faceHit = (buildingHitFaces as any[]).find((f: any) => f.hit(pIso));
                if (faceHit) {
                  if (faceHit.isTop) {
                    const z = Number(faceHit.ht) || 0;
                    const pl = invertOnPlane(pIso, { x: 0, y: 0, z }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
                    return { x: pl.x, y: pl.y, z: pl.z, iso: pIso, snapped: false };
                  }
                  const v3 = faceHit.verts3 as Array<{ x: number; y: number; z: number }>;
                  if (v3.length >= 2) {
                    const a0 = v3[0];
                    const a1 = v3[1];
                    const ht = Number(faceHit.ht) || 0;
                    const u = { x: a1.x - a0.x, y: a1.y - a0.y, z: 0 };
                    const v = { x: 0, y: 0, z: ht };
                    const pl0 = invertOnPlane(pIso, { x: a0.x, y: a0.y, z: 0 }, u, v);
                    const ux2 = u.x * u.x + u.y * u.y;
                    const s = ux2 < 1e-9 ? 0 : ((pl0.x - a0.x) * u.x + (pl0.y - a0.y) * u.y) / ux2;
                    const clampedS = Math.max(0, Math.min(1, s));
                    const clampedZ = Math.max(0, Math.min(ht, pl0.z));
                    const x = a0.x + u.x * clampedS;
                    const y = a0.y + u.y * clampedS;
                    const z = clampedZ;
                    const iso = toIsoView(x, y, z);
                    return { x, y, z, iso, snapped: true };
                  }
                }
              }

              const pl = invertOnPlane(pIso, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
              return { x: pl.x, y: pl.y, z: pl.z, iso: pIso, snapped: false };
            };

            const pb3 = (measureState.b ? measureState.b3 : measureState.preview3) ?? null;
            const pa = measureState.a3
              ? { x: measureState.a3.x, y: measureState.a3.y, z: measureState.a3.z, iso: a, snapped: !!measureState.a3.snapped }
              : pick3dPoint(a);
            const pb = pb3
              ? { x: pb3.x, y: pb3.y, z: pb3.z, iso: b, snapped: !!pb3.snapped }
              : pick3dPoint(b);
            const aSnapped = !!measureState.aSnapped || !!measureState.a3?.snapped || !!pa.snapped;
            const bSnapped = (measureState.b ? !!measureState.bSnapped : !!measureState.previewSnapped) || !!pb3?.snapped || !!pb.snapped;
            const dxFt = pxToFeet((pb.x - pa.x) / isoLotFrame.scale);
            const dyFt = pxToFeet((pb.y - pa.y) / isoLotFrame.scale);
            const dzFt = (pb.z - pa.z) / (FT_TO_UNIT * isoLotFrame.scale);
            const distFt = Math.hypot(dxFt, dyFt, dzFt);
            const aIso = pa.iso;
            const bIso = pb.iso;
            const mx = (aIso.x + bIso.x) / 2;
            const my = (aIso.y + bIso.y) / 2;
            return (
              <g className="pointer-events-none">
                <line x1={aIso.x} y1={aIso.y} x2={bIso.x} y2={bIso.y} stroke="#155dfc" strokeWidth="1.1" strokeDasharray="4 3" opacity="0.9" />
                <circle cx={aIso.x} cy={aIso.y} r="2.6" fill="#155dfc" />
                <circle cx={bIso.x} cy={bIso.y} r="2.6" fill="#155dfc" />
                {aSnapped && (
                  <>
                    <circle cx={aIso.x} cy={aIso.y} r="5.2" fill="#60a5fa" opacity="0.18" />
                    <circle cx={aIso.x} cy={aIso.y} r="5.2" fill="none" stroke="#2563eb" strokeWidth="1" opacity="0.55" />
                  </>
                )}
                {bSnapped && (
                  <>
                    <circle cx={bIso.x} cy={bIso.y} r="5.2" fill="#60a5fa" opacity="0.18" />
                    <circle cx={bIso.x} cy={bIso.y} r="5.2" fill="none" stroke="#2563eb" strokeWidth="1" opacity="0.55" />
                  </>
                )}
                <text x={mx} y={my - 10} textAnchor="middle" dominantBaseline="middle" fill="#155dfc" fontSize="10" fontWeight="700" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif">
                  {formatMeasureFt(distFt)}
                </text>
              </g>
            );
          })()}
          {measureEnabled && measureHover && (!measureState || measureState.mode !== '3d' || !!measureState.b) && (
            <g className="pointer-events-none">
              <circle cx={measureHover.iso.x} cy={measureHover.iso.y} r="2.6" fill="#155dfc" />
              {measureHover.snapped && (
                <>
                  <circle cx={measureHover.iso.x} cy={measureHover.iso.y} r="5.2" fill="#60a5fa" opacity="0.18" />
                  <circle cx={measureHover.iso.x} cy={measureHover.iso.y} r="5.2" fill="none" stroke="#2563eb" strokeWidth="1" opacity="0.55" />
                </>
              )}
            </g>
          )}
        </g>
      </svg>

      {view === '3d' && glbEnabled && !glbReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[320px] rounded-2xl bg-white/90 backdrop-blur border border-slate-200 shadow-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-800">{isZh ? '模型加载中…' : 'Loading model…'}</div>
              <div className="text-[11px] font-semibold text-slate-600">
                {typeof glbProgress.progress === 'number'
                  ? `${Math.round(glbProgress.progress * 100)}%`
                  : (glbProgress.loaded > 0 ? formatBytes(glbProgress.loaded) : (isZh ? '准备中' : 'Preparing'))}
              </div>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              {typeof glbProgress.progress === 'number' ? (
                <div
                  className="h-full bg-[#155dfc]"
                  style={{ width: `${Math.round(glbProgress.progress * 100)}%` }}
                />
              ) : (
                <motion.div
                  className="h-full w-1/2 bg-[#155dfc]"
                  animate={{ x: [-180, 320] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <div>{glbProgress.loaded > 0 ? formatBytes(glbProgress.loaded) : ''}</div>
              <div>{glbProgress.total ? formatBytes(glbProgress.total) : ''}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SiteVisualizer({
  projectType,
  constraints,
  lookup,
  mode = 'analysis',
  selectedModel = DEFAULT_MODEL_ID,
  onSizeChange,
  exteriorMaterial = 'timber',
  balconies,
  styleSelected = false,
  floorPlanSrc,
}: SiteVisualizerProps) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [showSetbacks, setShowSetbacks] = useState(true);
  const [measureMode, setMeasureMode] = useState(false);
  const [glbHasRoof, setGlbHasRoof] = useState(false);
  const [glbShowRoof, setGlbShowRoof] = useState(true);
  const orbitYawRef = useRef(0);
  const [isHovering, setIsHovering] = useState(false);

  // Simulation state
  const [simulatedSize, setSimulatedSize] = useState(600);
  const [isViolation, setIsViolation] = useState(false);

  useEffect(() => {
    if (mode === 'design') {
      if (selectedModel === 'model-a') setSimulatedSize(495);
      else if (selectedModel === 'model-b') setSimulatedSize(600);
      else if (selectedModel === 'model-c') setSimulatedSize(750);
    }
  }, [mode, selectedModel]);

  useEffect(() => {
    setIsViolation(simulatedSize > constraints.maxCoverage);
    if (onSizeChange) onSizeChange(simulatedSize);
  }, [simulatedSize, constraints.maxCoverage, onSizeChange]);

  useEffect(() => {
    if (mode === 'analysis') {
      if (projectType === 'interior') setSimulatedSize(400);
      else if (projectType === 'detached') setSimulatedSize(600);
      else setSimulatedSize(0);
    }
  }, [projectType, mode]);

  return (
    <div
      className="relative w-full h-full bg-slate-50 overflow-hidden shadow-inner group select-none"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* 3D Scene Container */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {mode === 'design' ? (
          <div className="relative w-full h-full bg-[#f1f5f8]">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full relative"
            >
              <div className="w-full h-full relative">
                <SvgSitePreview
                  view={viewMode}
                  showSetbacks={showSetbacks}
                  orbitYawRef={orbitYawRef}
                  lookup={lookup}
                  measureEnabled={measureMode}
                  glbModelId={selectedModel}
                  glbShowRoof={glbShowRoof}
                  onGlbHasRoofChange={setGlbHasRoof}
                />
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="absolute inset-0">
            <SvgSitePreview
              view={viewMode}
              showSetbacks={showSetbacks}
              orbitYawRef={orbitYawRef}
              lookup={lookup}
              measureEnabled={measureMode}
              glbModelId={selectedModel}
              glbShowRoof={glbShowRoof}
              onGlbHasRoofChange={setGlbHasRoof}
            />
          </div>
        )}
      </div>

      {/* --- UI OVERLAYS --- */}

      {/* Warning Toast */}
      <AnimatePresence>
        {isViolation && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border-l-4 border-red-500 text-slate-800 px-6 py-4 rounded-r-xl shadow-2xl flex items-start gap-4 z-30 max-w-sm"
          >
            <div className="p-2 bg-red-100 text-red-600 rounded-full mt-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-red-600">Zoning Violation</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                The selected footprint ({simulatedSize} sqft) exceeds the maximum lot coverage allowance of {constraints.maxCoverage} sqft.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Bar */}
      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between pointer-events-none">
        {/* View Controls */}
        <div className="pointer-events-auto flex items-center gap-2 p-1.5 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              viewMode === '2d'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            2D Map
          </button>
          <div className="relative">
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === '3d'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Box className="w-4 h-4" />
              3D Massing
            </button>
          </div>
          {viewMode === '3d' && glbHasRoof && (
            <button
              onClick={() => setGlbShowRoof(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                glbShowRoof
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Toggle Roof"
            >
              Roof
            </button>
          )}
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <button
            onClick={() => setMeasureMode(v => !v)}
            className={`p-2.5 rounded-xl transition-all ${measureMode ? 'bg-blue-50 text-[#155dfc]' : 'text-slate-400 hover:text-slate-600'}`}
            title="Measure Distance"
          >
            <Ruler className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Slider — ONLY IN ANALYSIS MODE */}
        {mode === 'analysis' && (
          <div className="pointer-events-auto bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-5 w-[320px]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Target Size</span>
                <span className="text-[10px] text-slate-400">Drag to test fit</span>
              </div>
              <div className={`text-xl font-mono font-bold ${isViolation ? 'text-red-600' : 'text-slate-900'}`}>
                {simulatedSize} <span className="text-sm text-slate-400 font-normal">sqft</span>
              </div>
            </div>

            <div className="relative h-6 flex items-center">
              <div className="absolute w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 bg-emerald-500" style={{ width: `${((constraints.maxCoverage - 200) / 1000) * 100}%` }} />
                <div className="absolute right-0 top-0 bottom-0 bg-red-200" style={{ left: `${((constraints.maxCoverage - 200) / 1000) * 100}%` }} />
              </div>

              <input
                type="range"
                min="200"
                max="1200"
                step="50"
                value={simulatedSize}
                onChange={(e) => setSimulatedSize(parseInt(e.target.value))}
                className="absolute w-full h-6 opacity-0 cursor-pointer z-10"
              />

              <div
                className={`absolute w-6 h-6 bg-white border-2 rounded-full shadow-md pointer-events-none transition-all duration-75 flex items-center justify-center ${
                  isViolation ? 'border-red-500 scale-110' : 'border-slate-900'
                }`}
                style={{ left: `calc(${((simulatedSize - 200) / 1000) * 100}% - 12px)` }}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${isViolation ? 'bg-red-500' : 'bg-slate-900'}`} />
              </div>
            </div>

            <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">Min 200</span>
              <span className="text-[10px] font-bold text-red-400">Max {constraints.maxCoverage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
