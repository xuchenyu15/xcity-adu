import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { 
  Map as MapIcon,
  Box
} from 'lucide-react';
import { PageTitle, PageSubtitle, SubsectionLabel, PANEL_CLASSES } from './Typography';
import { useI18n } from '../../i18n';

// --- Components ---

const ViewToggle = ({ mode, setMode }: { mode: '2d' | '3d', setMode: (m: '2d' | '3d') => void }) => {
    const { language } = useI18n();
    const isZh = language === 'zh';
    return (
        <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-200 flex items-center">
            <button
                onClick={() => setMode('2d')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    mode === '2d' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
                <MapIcon className="w-3 h-3" /> {isZh ? '2D 地图' : '2D Map'}
            </button>
            <button
                onClick={() => setMode('3d')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    mode === '3d' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
                <Box className="w-3 h-3" /> {isZh ? '3D 轮廓' : '3D Massing'}
            </button>
        </div>
    );
};

// --- Math & Geometry Helpers ---

type Point = { x: number, y: number };
type Rect = { x: number, y: number, w: number, h: number };

// Get corners of a rotated rectangle
const getCorners = (cx: number, cy: number, w: number, h: number, angleDeg: number): Point[] => {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const hw = w / 2;
    const hh = h / 2;
    
    // Relative corners
    // TL: -hw, -hh
    // TR: hw, -hh
    // BR: hw, hh
    // BL: -hw, hh
    
    const corners = [
        { x: -hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh }
    ];
    
    return corners.map(p => ({
        x: cx + (p.x * cos - p.y * sin),
        y: cy + (p.x * sin + p.y * cos)
    }));
};

// Separating Axis Theorem (SAT) for collision detection
const doPolygonsIntersect = (poly1: Point[], poly2: Point[]): boolean => {
    const polygons = [poly1, poly2];
    
    for (let i = 0; i < polygons.length; i++) {
        const polygon = polygons[i];
        for (let j = 0; j < polygon.length; j++) {
            const p1 = polygon[j];
            const p2 = polygon[(j + 1) % polygon.length];
            
            const normal = { x: -(p2.y - p1.y), y: p2.x - p1.x };
            // Normalize normal is not strictly needed for boolean intersection, but good for projection
            
            let min1 = Infinity, max1 = -Infinity;
            for (const p of poly1) {
                const q = (p.x * normal.x + p.y * normal.y);
                min1 = Math.min(min1, q);
                max1 = Math.max(max1, q);
            }
            
            let min2 = Infinity, max2 = -Infinity;
            for (const p of poly2) {
                const q = (p.x * normal.x + p.y * normal.y);
                min2 = Math.min(min2, q);
                max2 = Math.max(max2, q);
            }
            
            if (!(max1 >= min2 && max2 >= min1)) {
                return false;
            }
        }
    }
    return true;
};

const distPointToSeg2 = (p: Point, a: Point, b: Point) => {
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const vv = vx * vx + vy * vy;
    if (vv < 1e-12) {
        const dx = p.x - a.x;
        const dy = p.y - a.y;
        return dx * dx + dy * dy;
    }
    const wx = p.x - a.x;
    const wy = p.y - a.y;
    let t = (wx * vx + wy * vy) / vv;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    const cx = a.x + vx * t;
    const cy = a.y + vy * t;
    const dx = p.x - cx;
    const dy = p.y - cy;
    return dx * dx + dy * dy;
};

const pointInRing = (p: Point, ring: Point[], epsPx: number = 1.5) => {
    if (ring.length < 3) return false;
    const eps2 = epsPx * epsPx;
    const cleaned: Point[] = [];
    for (let i = 0; i < ring.length; i++) {
        const cur = ring[i];
        const prev = cleaned.length ? cleaned[cleaned.length - 1] : null;
        if (prev && Math.abs(cur.x - prev.x) < 1e-9 && Math.abs(cur.y - prev.y) < 1e-9) continue;
        cleaned.push(cur);
    }
    if (cleaned.length >= 2) {
        const first = cleaned[0];
        const last = cleaned[cleaned.length - 1];
        if (Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) cleaned.pop();
    }
    if (cleaned.length < 3) return false;

    for (let i = 0; i < cleaned.length; i++) {
        const a = cleaned[i];
        const b = cleaned[(i + 1) % cleaned.length];
        if (distPointToSeg2(p, a, b) <= eps2) return true;
    }

    let inside = false;
    for (let i = 0, j = cleaned.length - 1; i < cleaned.length; j = i++) {
        const a = cleaned[j];
        const b = cleaned[i];
        const intersect = ((a.y > p.y) !== (b.y > p.y)) && (p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x);
        if (intersect) inside = !inside;
    }
    return inside;
};

const segmentsIntersect = (a: Point, b: Point, c: Point, d: Point, eps: number = 1e-9) => {
    const orient = (p: Point, q: Point, r: Point) => {
        const v = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (Math.abs(v) <= eps) return 0;
        return v > 0 ? 1 : 2;
    };
    const onSeg = (p: Point, q: Point, r: Point) => {
        return Math.min(p.x, r.x) - eps <= q.x && q.x <= Math.max(p.x, r.x) + eps &&
            Math.min(p.y, r.y) - eps <= q.y && q.y <= Math.max(p.y, r.y) + eps &&
            distPointToSeg2(q, p, r) <= (eps * eps * 100);
    };
    const o1 = orient(a, b, c);
    const o2 = orient(a, b, d);
    const o3 = orient(c, d, a);
    const o4 = orient(c, d, b);
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSeg(a, c, b)) return true;
    if (o2 === 0 && onSeg(a, d, b)) return true;
    if (o3 === 0 && onSeg(c, a, d)) return true;
    if (o4 === 0 && onSeg(c, b, d)) return true;
    return false;
};

const polygonsOverlap = (polyA: Point[], polyB: Point[]) => {
    if (polyA.length < 3 || polyB.length < 3) return false;
    for (let i = 0; i < polyA.length; i++) {
        const a1 = polyA[i];
        const a2 = polyA[(i + 1) % polyA.length];
        for (let j = 0; j < polyB.length; j++) {
            const b1 = polyB[j];
            const b2 = polyB[(j + 1) % polyB.length];
            if (segmentsIntersect(a1, a2, b1, b2)) return true;
        }
    }
    if (pointInRing(polyA[0], polyB)) return true;
    if (pointInRing(polyB[0], polyA)) return true;
    return false;
};

const pointInPolyWithHoles = (p: Point, poly: { outer: Point[]; holes: Point[][] }) => {
  if (!pointInRing(p, poly.outer)) return false;
  for (const h of poly.holes) {
    if (pointInRing(p, h)) return false;
  }
  return true;
};

const raySegmentIntersectionT = (p: Point, dirUnit: Point, a: Point, b: Point) => {
  const rx = dirUnit.x;
  const ry = dirUnit.y;
  const sx = b.x - a.x;
  const sy = b.y - a.y;
  const rxs = rx * sy - ry * sx;
  const qpx = a.x - p.x;
  const qpy = a.y - p.y;
  const qpxr = qpx * ry - qpy * rx;

  const EPS = 1e-9;
  if (Math.abs(rxs) <= EPS) {
    if (Math.abs(qpxr) > EPS) return null;
    const rr = rx * rx + ry * ry;
    if (rr < EPS) return null;
    const t0 = (qpx * rx + qpy * ry) / rr;
    const t1 = ((b.x - p.x) * rx + (b.y - p.y) * ry) / rr;
    const tMin = Math.min(t0, t1);
    const tMax = Math.max(t0, t1);
    if (tMax < 0) return null;
    return tMin >= 0 ? tMin : 0;
  }

  const t = (qpx * sy - qpy * sx) / rxs;
  const u = (qpx * ry - qpy * rx) / rxs;
  if (t >= 0 && u >= 0 && u <= 1) return t;
  return null;
};

// Convert AABB rect to Polygon
const rectToPoly = (r: Rect): Point[] => [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h }
];

// Isometric projection helper
const toIso = (x: number, y: number, z: number = 0) => {
    const angle = Math.PI / 6; // 30 degrees
    return {
        x: (x - y) * Math.cos(angle),
        y: (x + y) * Math.sin(angle) - z
    };
};

// Draw isometric box
const drawIsoBox = (x: number, y: number, w: number, h: number, height: number) => {
    const corners = [
        toIso(x, y, 0),         // 0: bottom-near-left
        toIso(x + w, y, 0),     // 1: bottom-near-right
        toIso(x + w, y + h, 0), // 2: bottom-far-right
        toIso(x, y + h, 0),     // 3: bottom-far-left
        toIso(x, y, height),         // 4: top-near-left
        toIso(x + w, y, height),     // 5: top-near-right
        toIso(x + w, y + h, height), // 6: top-far-right
        toIso(x, y + h, height),     // 7: top-far-left
    ];

    // Top face
    const topPath = `M ${corners[4].x} ${corners[4].y} L ${corners[5].x} ${corners[5].y} L ${corners[6].x} ${corners[6].y} L ${corners[7].x} ${corners[7].y} Z`;
    
    // Front-right face (y=0 near side, appears on the right in iso view)
    const frontPath = `M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[5].x} ${corners[5].y} L ${corners[4].x} ${corners[4].y} Z`;
    
    // Left face (x=0 side, appears on the left in iso view)
    const sidePath = `M ${corners[0].x} ${corners[0].y} L ${corners[3].x} ${corners[3].y} L ${corners[7].x} ${corners[7].y} L ${corners[4].x} ${corners[4].y} Z`;

    return { topPath, frontPath, sidePath, corners };
};


export function SiteFeasibility({
  onNavigate,
  lookup,
  variant = 'full',
  viewMode: viewModeProp,
  onViewModeChange,
  showViewToggle = true,
}: {
  onNavigate?: (tab: 'design') => void;
  lookup?: any;
  variant?: 'full' | 'viewport';
  viewMode?: '2d' | '3d';
  onViewModeChange?: (m: '2d' | '3d') => void;
  showViewToggle?: boolean;
}) {
  const [viewModeInternal, setViewModeInternal] = useState<'2d' | '3d'>(viewModeProp ?? '2d');
  const viewMode = viewModeProp ?? viewModeInternal;
  const setViewMode = onViewModeChange ?? setViewModeInternal;
  const { language } = useI18n();
  const isZh = language === 'zh';
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 1600, h: 900 });
  const [showCutouts, setShowCutouts] = useState(false);
  const [orbitYawDeg, setOrbitYawDeg] = useState(0);
  const [orbitPitchDeg, setOrbitPitchDeg] = useState(0);
  const [isoZoom, setIsoZoom] = useState(1);
  const [orbiting3d, setOrbiting3d] = useState(false);
  const orbit3dStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number }>({ x: 0, y: 0, yaw: 0, pitch: 0 });
  const plan = lookup?.plan;
  const canFitAdu = typeof plan?.canFitAdu === 'boolean'
    ? plan.canFitAdu
    : (Array.isArray(lookup?.computed?.aduFits) ? lookup.computed.aduFits.some((x: any) => x?.canFit) : true);
  const backendMeasureLines: any[] = Array.isArray(lookup?.computed?.rulerLinesFt) ? lookup.computed.rulerLinesFt : [];
  const fullAddress = (lookup?.request?.address || '').toString();
  const streetName = (lookup?.region?.streetName || '').toString();

  useEffect(() => {
    if (!orbiting3d) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - orbit3dStartRef.current.x;
      const dy = e.clientY - orbit3dStartRef.current.y;
      const yaw = orbit3dStartRef.current.yaw + dx * 0.25;
      let pitchDelta = dy * 0.18;
      if (!e.shiftKey) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        const ratio = absDx / Math.max(1e-6, absDy);
        const damp = ratio > 2 ? 0.15 : (ratio > 1 ? 0.4 : 1);
        pitchDelta *= damp;
      }
      const pitch = Math.max(-25, Math.min(25, orbit3dStartRef.current.pitch + pitchDelta));
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
    if (viewMode !== '3d') {
      setOrbiting3d(false);
      setOrbitPitchDeg(0);
      return;
    }
    setIsoZoom(1);
  }, [viewMode]);

  useLayoutEffect(() => {
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
  
  // --- Constants & Config ---
  // Scale: 1 ft = 6 units
  const FT_TO_UNIT = 6;
  const UNIT_TO_FT = 1 / FT_TO_UNIT; 
  
  const setbacks = lookup?.computed?.setbacksFt;
  const SETBACK_SIDE_FT = Number.isFinite(Number(setbacks?.sideLeft)) ? Number(setbacks.sideLeft) : 5;
  const SETBACK_REAR_FT = Number.isFinite(Number(setbacks?.rear)) ? Number(setbacks.rear) : 20;
  const HOUSE_SEP_FT = Number.isFinite(Number(setbacks?.houseSep)) ? Number(setbacks.houseSep) : 5;
  const FRONT_SETBACK_FT = Number.isFinite(Number(setbacks?.front)) ? Number(setbacks.front) : 10;

  // Lot Geometry (fallback: 50' x 100')
  const LOT_W_FT = 50;
  const LOT_H_FT = 100;
  const LOT_W = LOT_W_FT * FT_TO_UNIT;
  const LOT_H = LOT_H_FT * FT_TO_UNIT;
  
  // Canvas Positioning
  const CANVAS_W = canvasSize.w;
  const CANVAS_H = canvasSize.h;
  const LOT_X = (CANVAS_W - LOT_W) / 2; // Centered X
  const LOT_Y = 100; // Top of lot

  const structures: any[] = [];
  const structuresCount = Array.isArray(lookup?.subjectBuildings?.features) ? lookup.subjectBuildings.features.length : 0;
  const houseRectFt = undefined;
  const garageRectFt = undefined;
  const hasHouse = false;
  const hasGarage = false;
  const HOUSE_W_FT = 0;
  const HOUSE_H_FT = 0;
  const HOUSE_W = 0;
  const HOUSE_H = 0;
  const HOUSE_X = LOT_X;
  const HOUSE_Y = LOT_Y;
  const GARAGE_W_FT = 18;
  const GARAGE_H_FT = 18;
  const GARAGE_W = GARAGE_W_FT * FT_TO_UNIT;
  const GARAGE_H = GARAGE_H_FT * FT_TO_UNIT;
  const GARAGE_X = LOT_X + (LOT_W - GARAGE_W - 10);
  const GARAGE_Y = LOT_Y + (LOT_H - GARAGE_H - 20);
  const OBSTACLES: Array<{ x: number; y: number; w: number; h: number }> = [];
  
  const subjectParcel = lookup?.subjectParcel;
  const subjectBuildings = lookup?.subjectBuildings;
  const nearbyBuildings = lookup?.nearbyBuildings;
  const nearbyRoads = lookup?.nearbyRoads;
  const rotationDegRaw = Number(lookup?.computed?.rotationDeg);
  const rotationDeg = Number.isFinite(rotationDegRaw) ? rotationDegRaw : 0;

  const mapViewport = (() => {
    const x = 0;
    const y = LOT_Y;
    const w = CANVAS_W;
    const h = Math.max(1, CANVAS_H - LOT_Y);
    return { x, y, w, h };
  })();

  const bboxMercator = (() => {
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
      if (Array.isArray(rings)) {
        for (const ring of rings) pushRing(ring);
      }
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
      return {
        x: R * lonRad,
        y: -(R * Math.log(Math.tan(Math.PI / 4 + latRad / 2)))
      };
    };

    const pts = allLonLat.map(([lon, lat]) => toScreenMercator(lon, lat));

    if (pts.length < 3) return null;

    const center = {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length
    };

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

    const bboxCenteredCenter = {
      x: center.x + invDx,
      y: center.y + invDy
    };

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

    return { scale, offsetX, offsetY, center: bboxCenteredCenter, toScreenMercator, spanRx, spanRy };
  })();

  const mapRotationCenter = (() => {
    if (!bboxMercator) return null;
    const cx = mapViewport.x + mapViewport.w / 2;
    const cy = mapViewport.y + mapViewport.h / 2;
    return { x: cx, y: cy };
  })();

  const lonLatToCanvas = (lon: number, lat: number) => {
    if (!bboxMercator) return null;
    const m = bboxMercator.toScreenMercator(lon, lat);
    const x = bboxMercator.offsetX + m.x * bboxMercator.scale;
    const y = bboxMercator.offsetY + m.y * bboxMercator.scale;
    return { x, y };
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

  const lotRotationCenter3d = (() => {
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
    if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
      for (const ring of geom.coordinates) pushRing(ring);
    } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
      for (const poly of geom.coordinates) {
        if (!Array.isArray(poly)) continue;
        for (const ring of poly) pushRing(ring);
      }
    }
    if (pts.length === 0) return mapRotationCenter;
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return { x, y };
  })();

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

  const polygonAreaAbs = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length < 3) return 0;
    let a2 = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      a2 += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(a2 / 2);
  };

  const geoPolygonToOuterRingCanvas = (geom: any, opts?: { applyRotation?: boolean; rotationCenter?: 'map' | 'lot' }) => {
    if (!bboxMercator || !geom) return null as Array<{ x: number; y: number }> | null;
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
      return ringToPts(geom.coordinates[0]);
    }

    if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
      let best: Array<{ x: number; y: number }> | null = null;
      let bestA = 0;
      for (const poly of geom.coordinates) {
        if (!Array.isArray(poly) || !Array.isArray(poly?.[0])) continue;
        const pts = ringToPts(poly[0]);
        if (!pts) continue;
        const a = polygonAreaAbs(pts);
        if (a > bestA) {
          bestA = a;
          best = pts;
        }
      }
      return best;
    }

    return null;
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

    return [] as Array<Array<{ x: number; y: number }>>;
  };

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

    if (geom.type === 'Polygon' && Array.isArray(geom.coordinates?.[0])) {
      addRing(geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon' && Array.isArray(geom.coordinates)) {
      for (const poly of geom.coordinates) {
        if (!Array.isArray(poly) || !Array.isArray(poly?.[0])) continue;
        addRing(poly[0]);
      }
    } else {
      return null;
    }

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
      ? {
        x: parts.reduce((s, p) => s + p.centroid.x * p.areaAbs, 0) / sumA,
        y: parts.reduce((s, p) => s + p.centroid.y * p.areaAbs, 0) / sumA
      }
      : { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
    const areaAbs = sumA;
    return { d, bounds, centroid, areaAbs };
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
    const collectRings = (g: any): any[] => {
      if (!g) return [];
      if (g.type === 'Feature' && g.geometry) return collectRings(g.geometry);
      if (g.type === 'Polygon' && Array.isArray(g.coordinates)) return g.coordinates;
      if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) {
        return g.coordinates.flatMap((p: any) => (Array.isArray(p) ? p : []));
      }
      if (g.type === 'GeometryCollection' && Array.isArray(g.geometries)) {
        return g.geometries.flatMap((gg: any) => collectRings(gg));
      }
      return [];
    };
    const rings: any[] = collectRings(geom);
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

  const lotPolygonD = geoPolygonToPathWithBounds(subjectParcel?.geometry)?.d ?? null;
  const buildableGeom = lookup?.computed?.buildableArea?.geometry ?? null;
  const aduPlacementGeom = lookup?.computed?.aduPlacementArea?.geometry ?? null;
  const buildableAreaD = geoPolygonToPathAllRingsWithBounds(buildableGeom)?.d ?? null;

  const isoLotFrame = (() => {
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
  })();

  const buildableAreaPolyScreen = (() => {
    if (!bboxMercator) return null;
    const collectPolys = (g: any): any[] => {
      if (!g) return [];
      if (g.type === 'Feature' && g.geometry) return collectPolys(g.geometry);
      if (g.type === 'Polygon' && Array.isArray(g.coordinates)) return [g.coordinates];
      if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) return g.coordinates;
      if (g.type === 'GeometryCollection' && Array.isArray(g.geometries)) {
        return g.geometries.flatMap((gg: any) => collectPolys(gg));
      }
      return [];
    };
    const geom = buildableGeom;
    const polysRaw = collectPolys(geom);
    if (polysRaw.length === 0) return null;

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

    const polys = polysRaw
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
  })();

  const lotPolyScreen = (() => {
    if (!bboxMercator) return null;
    const geom = subjectParcel?.geometry;
    if (!geom || !Array.isArray((geom as any).coordinates)) return null;
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
    return { polys };
  })();

  const subjectBuildingRingsScreen = (() => {
    if (!bboxMercator) return [] as Array<Array<{ x: number; y: number }>>;
    const feats = Array.isArray(subjectBuildings?.features) ? subjectBuildings.features : [];
    const out: Array<Array<{ x: number; y: number }>> = [];
    for (let i = 0; i < feats.length; i++) {
      const rings = geoPolygonToOuterRingsCanvas(feats[i]?.geometry, { applyRotation: false });
      for (const r of rings) out.push(r);
    }
    return out;
  })();

  const nearbyBuildingRingsScreen = (() => {
    if (!bboxMercator) return [] as Array<Array<{ x: number; y: number }>>;
    const feats = Array.isArray(lookup?.nearbyBuildings?.features) ? lookup.nearbyBuildings.features : [];
    const out: Array<Array<{ x: number; y: number }>> = [];
    for (let i = 0; i < feats.length; i++) {
      const rings = geoPolygonToOuterRingsCanvas(feats[i]?.geometry, { applyRotation: false });
      for (const r of rings) out.push(r);
    }
    return out;
  })();

  const aduPlacementPolyScreen = (() => {
    if (!bboxMercator) return null;
    const collectPolys = (g: any): any[] => {
      if (!g) return [];
      if (g.type === 'Feature' && g.geometry) return collectPolys(g.geometry);
      if (g.type === 'Polygon' && Array.isArray(g.coordinates)) return [g.coordinates];
      if (g.type === 'MultiPolygon' && Array.isArray(g.coordinates)) return g.coordinates;
      if (g.type === 'GeometryCollection' && Array.isArray(g.geometries)) {
        return g.geometries.flatMap((gg: any) => collectPolys(gg));
      }
      return [];
    };
    const geom = aduPlacementGeom;
    const polysRaw = collectPolys(geom);
    if (polysRaw.length === 0) return null;

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

    const polys = polysRaw
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
  })();

  const nearbyParcelPaths = (() => {
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
  })();

  const buildingPaths = (() => {
    const toFeaturePaths = (fc: any, kind: 'subject' | 'nearby') => {
      const feats = Array.isArray(fc?.features) ? fc.features : [];
      return feats
        .map((f: any, idx: number) => {
          const r = geoPolygonToPathMetrics(f?.geometry);
          if (!r) return null;
          const tags = f?.properties ?? {};
          const tagsLower = (() => {
            try { return JSON.stringify(tags).toLowerCase(); } catch { return ''; }
          })();
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
        .filter(Boolean) as Array<{ key: string; d: string; role: string; kind: string; areaAbs: number; centroid: { x: number; y: number }; hasAddress: boolean }>;
    };

    return [
      ...toFeaturePaths(subjectBuildings, 'subject'),
      ...toFeaturePaths(nearbyBuildings, 'nearby')
    ];
  })();

  const mainSubjectBuildingKey = (() => {
    const subjects = buildingPaths.filter(b => b.kind === 'subject');
    if (subjects.length === 0) return null as string | null;
    let main = subjects[0];
    for (const b of subjects) {
      if ((b.areaAbs ?? 0) > (main.areaAbs ?? 0)) main = b;
    }
    return main.key as string;
  })();

  const handleToggleCutoutsFromHouse = (e: React.MouseEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    e.stopPropagation();
    setShowCutouts(v => !v);
  };

  const cutoutOverlays = (() => {
    const feats = Array.isArray(lookup?.computed?.cutouts?.features) ? lookup.computed.cutouts.features : [];
    return feats
      .map((f: any, idx: number) => {
        const r = geoPolygonToPathMetrics(f?.geometry);
        if (!r) return null;
        const props = f?.properties ?? {};
        const reason = String(props?.reason ?? '');
        const labelZh = String(props?.labelZh ?? reason);
        const labelEn = String(props?.labelEn ?? reason);
        const text = isZh ? labelZh : labelEn;
        return { key: `cutout-${idx}-${reason}`, d: r.d, centroid: r.centroid, areaAbs: r.areaAbs, reason, text };
      })
      .filter(Boolean) as Array<{ key: string; d: string; centroid: { x: number; y: number }; areaAbs: number; reason: string; text: string }>;
  })();

  const subjectBuildingLabels = (() => {
    type SubjectBuildingLabel = { key: string; text: string; x: number; y: number; kind: 'main' | 'garage' };
    const subjects = buildingPaths.filter(b => b.kind === 'subject');
    if (subjects.length === 0) return [] as SubjectBuildingLabel[];

    let main = subjects[0];
    for (const b of subjects) {
      if ((b.areaAbs ?? 0) > (main.areaAbs ?? 0)) main = b;
    }

    const labels: SubjectBuildingLabel[] = [];
    labels.push({ key: `${main.key}-label`, text: isZh ? '主屋' : 'Existing House', x: main.centroid.x, y: main.centroid.y, kind: 'main' });

    const explicitGarages = subjects.filter(b => b.key !== main.key && b.role === 'garage');
    for (const g of explicitGarages) {
      labels.push({ key: `${g.key}-label`, text: isZh ? '车库' : 'Garage', x: g.centroid.x, y: g.centroid.y, kind: 'garage' });
    }

    if (explicitGarages.length === 0) {
      const mainArea = Number(main.areaAbs) || 0;
      const heuristic = subjects
        .filter(b => b.key !== main.key)
        .filter(b => !b.hasAddress)
        .filter(b => (Number(b.areaAbs) || 0) > 0 && (Number(b.areaAbs) || 0) < mainArea * 0.65);
      for (const g of heuristic) {
        labels.push({ key: `${g.key}-label`, text: isZh ? '车库' : 'Garage', x: g.centroid.x, y: g.centroid.y, kind: 'garage' });
      }
    }
    return labels;
  })();

  const roadPaths = (() => {
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

    const feats = Array.isArray(nearbyRoads?.features) ? nearbyRoads.features : [];
    const out: Array<{ key: string; d: string; name: string; isTarget: boolean; centroid: { x: number; y: number } }> = [];

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
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      return { d, centroid: { x: cx, y: cy } };
    };

    for (let i = 0; i < feats.length; i++) {
      const f = feats[i];
      const geom = f?.geometry;
      const name = (f?.properties?.name ?? f?.properties?.ref ?? '').toString();
      const isTarget = isRoadNameMatch(streetName, name);
      if (!geom) continue;
      if (geom.type === 'LineString' && Array.isArray(geom.coordinates)) {
        const r = lineToPath(geom.coordinates);
        if (r) out.push({ key: `road-${i}`, d: r.d, centroid: r.centroid, name, isTarget });
      } else if (geom.type === 'MultiLineString' && Array.isArray(geom.coordinates)) {
        for (let j = 0; j < geom.coordinates.length; j++) {
          const r = lineToPath(geom.coordinates[j]);
          if (r) out.push({ key: `road-${i}-${j}`, d: r.d, centroid: r.centroid, name, isTarget });
        }
      }
    }
    return out;
  })();

  const mapGroupTransform = mapRotationCenter
    ? `rotate(${rotationDeg}, ${mapRotationCenter.x}, ${mapRotationCenter.y})`
    : undefined;

  const structurePaths = (() => {
    const toPath = (pts: Array<[number, number]>) => {
      const d = pts
        .map(([xFt, yFt], idx) => `${idx === 0 ? 'M' : 'L'} ${LOT_X + xFt * FT_TO_UNIT} ${LOT_Y + yFt * FT_TO_UNIT}`)
        .join(' ');
      return `${d} Z`;
    };

    return structures
      .map((s: any) => {
        const role = (s?.role ?? null) as string | null;
        const isContext = !role;
        const polyRaw = Array.isArray(s?.polygonFt) ? s.polygonFt : null;
        const poly = polyRaw
          ? polyRaw
            .map((p: any): [number, number] => [Number(p?.xFt), Number(p?.yFt)])
            .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
          : null;

        const rect = s?.rectFt;
        const hasRect = rect && Number.isFinite(Number(rect?.xFt)) && Number.isFinite(Number(rect?.yFt)) && Number.isFinite(Number(rect?.wFt)) && Number.isFinite(Number(rect?.hFt));
        const fill = role === 'house' ? '#CBD5E1' : (role === 'garage' ? '#EDF1F6' : '#E2E8F0');
        const stroke = role === 'house' ? '#94a3b8' : (role === 'garage' ? '#cbd5e1' : '#cbd5e1');
        const opacity = isContext ? 0.42 : 1;

        if (poly && poly.length >= 3) {
          return { key: `poly-${role ?? 'context'}-${poly.length}-${Math.round(poly[0][0] * 10)}-${Math.round(poly[0][1] * 10)}`, kind: 'path' as const, d: toPath(poly), fill, stroke, role, opacity };
        }

        if (hasRect) {
          const x = LOT_X + Number(rect.xFt) * FT_TO_UNIT;
          const y = LOT_Y + Number(rect.yFt) * FT_TO_UNIT;
          const w = Number(rect.wFt) * FT_TO_UNIT;
          const h = Number(rect.hFt) * FT_TO_UNIT;
          return { key: `rect-${role ?? 'context'}-${Math.round(x)}-${Math.round(y)}-${Math.round(w)}-${Math.round(h)}`, kind: 'rect' as const, x, y, w, h, fill, stroke, role, opacity };
        }

        return null;
      })
      .filter(Boolean) as Array<any>;
  })();

  // Buildable Zone (Envelope) from Backend Plan
  const bz = plan?.buildableZone;
  const hasBz =
    bz &&
    typeof bz.xFt === 'number' &&
    typeof bz.yFt === 'number' &&
    typeof bz.wFt === 'number' &&
    typeof bz.hFt === 'number';
  const houseBottomFt = (hasHouse && typeof houseRectFt?.hFt === 'number')
    ? (houseRectFt.yFt + houseRectFt.hFt)
    : FRONT_SETBACK_FT;
  const minZoneTopFt = houseBottomFt + HOUSE_SEP_FT;

  const rawZoneLeftFt = bz && typeof bz.xFt === 'number' ? bz.xFt : SETBACK_SIDE_FT;
  const rawZoneTopFt = bz && typeof bz.yFt === 'number' ? bz.yFt : minZoneTopFt;
  const rawZoneWFt = bz && typeof bz.wFt === 'number'
    ? bz.wFt
    : ((hasGarage ? ((GARAGE_X - LOT_X) * UNIT_TO_FT - SETBACK_SIDE_FT) : (LOT_W_FT - SETBACK_SIDE_FT)) - rawZoneLeftFt);
  const rawZoneBottomFt = bz && typeof bz.yFt === 'number' && typeof bz.hFt === 'number'
    ? (bz.yFt + bz.hFt)
    : (LOT_H_FT - SETBACK_REAR_FT);

  const zoneLeftFt = rawZoneLeftFt;
  const zoneTopFt = hasBz ? rawZoneTopFt : Math.max(rawZoneTopFt, minZoneTopFt);
  const zoneWFt = Math.max(0, rawZoneWFt);
  const zoneHFt = hasBz ? Math.max(0, Number(bz.hFt)) : Math.max(0, rawZoneBottomFt - zoneTopFt);

  const zonePxOverride = buildableAreaPolyScreen
    ? {
      left: buildableAreaPolyScreen.bounds.minX,
      top: buildableAreaPolyScreen.bounds.minY,
      w: buildableAreaPolyScreen.bounds.maxX - buildableAreaPolyScreen.bounds.minX,
      h: buildableAreaPolyScreen.bounds.maxY - buildableAreaPolyScreen.bounds.minY
    }
    : null;

  const ZONE_LEFT = zonePxOverride ? zonePxOverride.left : (LOT_X + zoneLeftFt * FT_TO_UNIT);
  const ZONE_TOP = zonePxOverride ? zonePxOverride.top : (LOT_Y + zoneTopFt * FT_TO_UNIT);
  const ZONE_W = zonePxOverride ? zonePxOverride.w : (zoneWFt * FT_TO_UNIT);
  const ZONE_H = zonePxOverride ? zonePxOverride.h : (zoneHFt * FT_TO_UNIT);
  const ZONE_RIGHT = ZONE_LEFT + ZONE_W;
  const ZONE_BOTTOM = ZONE_TOP + ZONE_H;
  // Keep a tiny visual inset so ADU stroke does not appear outside dashed envelope.
  const ZONE_VISUAL_INSET = 1;

  // Display texts for envelope size (convert from PX back to FT for display)
  const formatFt = (px: number) => {
    const ft = px / FT_TO_UNIT;
    const sign = ft < 0 ? '-' : '';
    const abs = Math.abs(ft);
    const feet = Math.floor(abs);
    const inches = Math.round((abs - feet) * 12);
    if (inches === 12) return `${sign}${feet + 1}'`;
    return inches === 0 ? `${sign}${feet}'` : `${sign}${feet}'-${inches}"`;
  };
  const FT_PER_M = 3.280839895;
  const mapPxPerFt =
    bboxMercator && Number.isFinite(bboxMercator.scale) && bboxMercator.scale > 1e-12
      ? bboxMercator.scale / FT_PER_M
      : FT_TO_UNIT;
  const formatFtFromMapPx = (px: number) => {
    if (!(bboxMercator && Number.isFinite(bboxMercator.scale) && bboxMercator.scale > 1e-12)) return formatFt(px);
    const ft = (px / bboxMercator.scale) * FT_PER_M;
    return formatFt(ft * FT_TO_UNIT);
  };
  const ZONE_W_DISPLAY = zonePxOverride ? formatFtFromMapPx(ZONE_W) : formatFt(ZONE_W);
  const ZONE_H_DISPLAY = zonePxOverride ? formatFtFromMapPx(ZONE_H) : formatFt(ZONE_H);

  // --- ADU Composite Module ---
  const aduFits: Array<{ wFt: number; hFt: number; canFit: boolean }> = Array.isArray(lookup?.computed?.aduFits)
    ? lookup.computed.aduFits
      .map((x: any) => ({
        wFt: Number(x?.w),
        hFt: Number(x?.h),
        canFit: !!x?.canFit
      }))
      .filter((x: any) => Number.isFinite(x.wFt) && Number.isFinite(x.hFt))
    : [];

  const MODULE_OPTIONS = [
    { key: '16x37.5', wFt: 16, hFt: 37.5, label: `37.5' × 16'`, sqft: 16 * 37.5 },
    { key: '32x37.5', wFt: 32, hFt: 37.5, label: `37.5' × 32'`, sqft: 32 * 37.5 }
  ] as const;

  const [selectedModuleKey, setSelectedModuleKey] = useState<(typeof MODULE_OPTIONS)[number]['key']>('16x37.5');
  const [endAddon, setEndAddon] = useState<'none' | 'end-right' | 'end-left' | 'end-both'>('none');
  const [hasBalcony, setHasBalcony] = useState(false);
  const ADDON_FT = 7.5;

  const selectedModule = MODULE_OPTIONS.find(m => m.key === selectedModuleKey) ?? MODULE_OPTIONS[0];
  const selectedFit = aduFits.find(f => (Math.abs(f.wFt - selectedModule.wFt) < 1e-6 && Math.abs(f.hFt - selectedModule.hFt) < 1e-6) || (Math.abs(f.wFt - selectedModule.hFt) < 1e-6 && Math.abs(f.hFt - selectedModule.wFt) < 1e-6));
  const selectedCanFit = selectedFit ? !!selectedFit.canFit : true;
  const endRightOn = endAddon === 'end-right' || endAddon === 'end-both';
  const endLeftOn = endAddon === 'end-left' || endAddon === 'end-both';
  const endAddonCount = (endRightOn ? 1 : 0) + (endLeftOn ? 1 : 0);
  const balconyLenFt = selectedModule.hFt;
  const projectedSqft = Math.round(
    selectedModule.sqft
      + endAddonCount * selectedModule.wFt * ADDON_FT
  );
  const moduleCanFit = (m: any) => {
    const f = aduFits.find(x => (Math.abs(x.wFt - m.wFt) < 1e-6 && Math.abs(x.hFt - m.hFt) < 1e-6) || (Math.abs(x.wFt - m.hFt) < 1e-6 && Math.abs(x.hFt - m.wFt) < 1e-6));
    return f ? !!f.canFit : true;
  };

  const MAIN_W = selectedModule.wFt * FT_TO_UNIT;
  const MAIN_H = selectedModule.hFt * FT_TO_UNIT;
  const ADDON_PX = ADDON_FT * FT_TO_UNIT;

  // Combined footprint
  const COMBINED_W = hasBalcony ? (MAIN_W + ADDON_PX) : MAIN_W;
  const COMBINED_H = endAddon === 'end-right' || endAddon === 'end-left'
    ? (MAIN_H + ADDON_PX)
    : (endAddon === 'end-both' ? (MAIN_H + ADDON_PX * 2) : MAIN_H);

  const defaultPreferredRotationDeg = useMemo(() => {
    const polys = lotPolyScreen?.polys ?? null;
    if (!polys || polys.length === 0) return 0;
    let bestLen = -1;
    let bestTheta: number | null = null;
    for (const poly of polys) {
      const pts = poly?.outer ?? null;
      if (!Array.isArray(pts) || pts.length < 2) continue;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const dx = Number(b?.x) - Number(a?.x);
        const dy = Number(b?.y) - Number(a?.y);
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) continue;
        const len = Math.hypot(dx, dy);
        if (!Number.isFinite(len) || len <= bestLen) continue;
        bestLen = len;
        bestTheta = Math.atan2(dy, dx) * (180 / Math.PI);
      }
    }
    if (!Number.isFinite(bestLen) || bestLen <= 0 || bestTheta === null || !Number.isFinite(bestTheta)) return 0;
    const theta = ((bestTheta % 360) + 360) % 360;
    const rot = ((theta - 90) % 360 + 360) % 360;
    return Math.round(rot);
  }, [lotPolyScreen]);

  // ADU center position (visual center within envelope)
  const ADU_CENTER_X = (aduPlacementPolyScreen ?? buildableAreaPolyScreen) ? (aduPlacementPolyScreen ?? buildableAreaPolyScreen)!.center.x : (ZONE_LEFT + ZONE_W / 2);
  const ADU_CENTER_Y = (aduPlacementPolyScreen ?? buildableAreaPolyScreen) ? (aduPlacementPolyScreen ?? buildableAreaPolyScreen)!.center.y : (ZONE_TOP + ZONE_H / 2);

  // State - ADU position (center of combined module)
  const [aduState, setAduState] = useState({ 
    cx: ADU_CENTER_X,
    cy: ADU_CENTER_Y,
    rotation: 0
  });

  const aduPivotLocal3d = (() => {
    if (!isoLotFrame) return null as { x: number; y: number } | null;
    const s = rotateCanvasPoint3d({ x: aduState.cx, y: aduState.cy });
    return isoLotFrame.toLocal(s);
  })();

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
    const angle = Math.PI / 6;
    const A = Math.cos(angle);
    const B = Math.sin(angle);
    const p = (orbitPitchDeg * Math.PI) / 180;
    const cosP = Math.cos(p);
    const sinP = Math.sin(p);
    const ax = Math.SQRT1_2;
    const ay = -Math.SQRT1_2;
    const az = 0;

    const dot = ax * r.x + ay * r.y + az * z;
    const cx = ay * z - az * r.y;
    const cy = az * r.x - ax * z;
    const cz = ax * r.y - ay * r.x;

    const x1 = r.x * cosP + cx * sinP + ax * dot * (1 - cosP);
    const y1 = r.y * cosP + cy * sinP + ay * dot * (1 - cosP);
    const z1 = z * cosP + cz * sinP + az * dot * (1 - cosP);

    return { x: (x1 - y1) * A, y: (x1 + y1) * B - z1 };
  };

  const isoLotPolygons = (() => {
    if (!isoLotFrame) return [] as Array<{ key: string; points: string }>;
    const out: Array<{ key: string; points: string }> = [];
    for (let i = 0; i < isoLotFrame.lotRings.length; i++) {
      const ring = isoLotFrame.lotRings[i];
      const points = ring
        .map(p => {
          const q = isoLotFrame.toLocal(p);
          const iso = toIsoView(q.x, q.y, 0);
          return `${iso.x},${iso.y}`;
        })
        .join(' ');
      out.push({ key: `iso-lot-${i}`, points });
    }
    return out;
  })();

  const isoNearbyParcelPolygons = (() => {
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
  })();

  const isoSceneTransform = (() => {
    const fallback = `translate(${CANVAS_W / 2}, ${CANVAS_H / 2})`;
    if (!isoLotFrame) return fallback;
    if (!aduPivotLocal3d) return fallback;

    const pivotIsoNoPitch = toIso(aduPivotLocal3d.x, aduPivotLocal3d.y, 0);
    const pivotIso = toIsoView(aduPivotLocal3d.x, aduPivotLocal3d.y, 0);
    const yawSamples = [0, 90, 180, 270];
    let maxDx = 1e-6;
    let maxDy = 1e-6;
    for (const ring of isoLotFrame.lotRings) {
      for (const p of ring) {
        const q = isoLotFrame.toLocal(p);
        for (const yaw of yawSamples) {
          const r = rotateLocalAroundAdu3d(q.x, q.y, yaw);
          const iso = toIso(r.x, r.y, 0);
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
  })();

  const isoBuildingFaces = (() => {
    type Face = { key: string; points: string; fill: string; stroke: string; strokeWidth: string; opacity: number };
    type FaceWithDepth = Face & { depth: number };

    if (!isoLotFrame) return [] as FaceWithDepth[];

    const pxPerFtIso = FT_TO_UNIT * (isoLotFrame.scale ?? 1);
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

        const topPts = ring.map(p => {
          const iso = toIsoView(p.x, p.y, ht);
          return `${iso.x},${iso.y}`;
        }).join(' ');
        const topDepth = ring.reduce((s, p) => {
          const rp = rotateLocalAroundAdu3d(p.x, p.y, orbitYawDeg);
          return s + (rp.x + rp.y);
        }, 0) / ring.length + ht;
        args.out.push({
          key: `${args.keyPrefix}-${b}-top`,
          points: topPts,
          fill: args.topFill,
          stroke: args.stroke,
          strokeWidth: args.strokeWidthTop,
          opacity: args.opacity,
          depth: topDepth
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
          const quad = [
            toIsoView(p1.x, p1.y, 0),
            toIsoView(p2.x, p2.y, 0),
            toIsoView(p2.x, p2.y, ht),
            toIsoView(p1.x, p1.y, ht),
          ];
          const points = quad.map(pt => `${pt.x},${pt.y}`).join(' ');
          const depth = ((rp1.x + rp1.y) + (rp2.x + rp2.y)) / 2 + ht / 2;
          args.out.push({
            key: `${args.keyPrefix}-${b}-side-${i}`,
            points,
            fill,
            stroke: args.stroke,
            strokeWidth: args.strokeWidthSide,
            opacity: args.opacity,
            depth
          });
        }
      }
    };

    const faces: FaceWithDepth[] = [];

    const featureMeta = (f: any) => {
      const tags = f?.properties ?? {};
      const tagsLower = (() => {
        try { return JSON.stringify(tags).toLowerCase(); } catch { return ''; }
      })();
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
  })();

  const isoBuildableOuters = (() => {
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
  })();
  const [selectedBuildablePolyIdx, setSelectedBuildablePolyIdx] = useState<number | null>(null);
  const includeDeck = false;
  const normalizePlacementId = (v: unknown) => {
    const s = (v ?? '').toString().trim().toLowerCase();
    return s.replace(/\s+/g, ' ');
  };
  const llUuidPlacementId = normalizePlacementId(lookup?.subjectParcel?.properties?.fields?.ll_uuid);
  const placementIdentity = llUuidPlacementId;
  // localStorage key（按地块稳定 id，不按 address 文本）：
  // - 只使用 ll_uuid 作为主键，避免因字段缺失/切换导致 key 抖动
  // - 目的：同一地块反复进入时复用「用户已经摆好的」ADU 位置/角度/外挂/露台
  const placementKeyReady = !!placementIdentity;
  const placementStorageKey = placementKeyReady ? `xhomes.aduPlacement:${String(placementIdentity)}` : '';
  // restore 流程会拆成多步（parse -> 等待几何 ready -> apply）：
  // - pendingRestoreRef：保存“候选要恢复的 cx/cy/rotation”，等外挂/露台/可建区等约束 ready 后再校验并应用
  // - restoreParsedRef：只在 placementStorageKey 变化时从 localStorage 读取并解析一次，避免 resize / 重新计算 bbox 时反复读取并覆盖用户交互
  // - restoreAppliedKeyRef：同一个 key 只允许自动 restore 成功应用一次，防止后续 effect 反复 setAduState
  // - userTouchedPlacementRef：用户一旦开始拖拽/旋转/点外挂按钮，就不再允许自动 restore 覆盖（否则会出现“点一下闪一下又回去”）
  const pendingRestoreRef = useRef<null | { cx: number; cy: number; rotation: number }>(null);
  const restoreParsedRef = useRef<null | { key: string; parsed: any }>(null);
  const restoreAppliedKeyRef = useRef<string | null>(null);
  const restoreConfigReadyRef = useRef(false);
  const restorePoseAttemptedKeyRef = useRef<string | null>(null);
  const restoreJustAppliedKeyRef = useRef<string | null>(null);
  const userTouchedPlacementRef = useRef(false);
  const placementSaveRef = useRef<null | { key: string; payload: string }>(null);
  const [isHydratingPlacement, setIsHydratingPlacement] = useState(false);

  useLayoutEffect(() => {
    if (!placementKeyReady) return;
    try {
      setIsHydratingPlacement(!!localStorage.getItem(placementStorageKey));
    } catch {
      setIsHydratingPlacement(false);
    }
  }, [placementKeyReady, placementStorageKey]);

  const [interactionMode, setInteractionMode] = useState<'move' | 'rotate' | null>(null);
  const [hoverADU, setHoverADU] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialState, setInitialState] = useState(aduState); // Snapshot at start of drag
  const dragOffsetRef = useRef({ x: 0, y: 0 }); // Mouse offset from center
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotateMenuOpen, setRotateMenuOpen] = useState(false);
  const [rotateMenuPos, setRotateMenuPos] = useState({ x: 0, y: 0 });

  // Helper to convert client coords to SVG coords
  const clientToSvg = (clientX: number, clientY: number) => {
    const svgEl = svgRef.current;
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const sx = rect.width / CANVAS_W;
    const sy = rect.height / CANVAS_H;
    const uniformScale = Math.min(sx, sy);
    // Visible portion of the viewBox is centered
    const visibleW = CANVAS_W * uniformScale;
    const visibleH = CANVAS_H * uniformScale;
    const offsetX = (rect.width - visibleW) / 2;
    const offsetY = (rect.height - visibleH) / 2;
    return {
      x: (clientX - rect.left - offsetX) / uniformScale,
      y: (clientY - rect.top - offsetY) / uniformScale,
    };
  };

  const mapLocalToScreen = (p: { x: number; y: number }) => {
    if (!mapRotationCenter) return p;
    if (!Number.isFinite(rotationDeg) || Math.abs(rotationDeg) < 1e-9) return p;
    const rad = (rotationDeg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const dx = p.x - mapRotationCenter.x;
    const dy = p.y - mapRotationCenter.y;
    return { x: mapRotationCenter.x + dx * c - dy * s, y: mapRotationCenter.y + dx * s + dy * c };
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

  const openRotateMenuAt = (clientX: number, clientY: number) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const pad = 16;
    const menuW = 150;
    const menuH = 112;
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    const x = Math.max(pad, Math.min(rect.width - menuW - pad, rawX));
    const y = Math.max(pad, Math.min(rect.height - menuH - pad, rawY));
    setRotateMenuPos({ x, y });
    setRotateMenuOpen(true);
  };

  // Check if a specific configuration is valid
  const checkValidity = (cx: number, cy: number, rot: number, includeDeckOverride?: boolean, selectedPolyIdxOverride?: number | null) => {
    const endRightOnLocal = endAddon === 'end-right' || endAddon === 'end-both';
    const endLeftOnLocal = endAddon === 'end-left' || endAddon === 'end-both';
    const rectSpecs: Array<{ localCx: number; localCy: number; w: number; h: number }> = [
      { localCx: 0, localCy: 0, w: MAIN_W, h: MAIN_H }
    ];
    if (endRightOnLocal) rectSpecs.push({ localCx: 0, localCy: -(MAIN_H / 2 + ADDON_PX / 2), w: MAIN_W, h: ADDON_PX });
    if (endLeftOnLocal) rectSpecs.push({ localCx: 0, localCy: MAIN_H / 2 + ADDON_PX / 2, w: MAIN_W, h: ADDON_PX });

    const rad = rot * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const allRects = rectSpecs.map(r => {
      const rcx = cx + (r.localCx * cos - r.localCy * sin);
      const rcy = cy + (r.localCx * sin + r.localCy * cos);
      return { corners: getCorners(rcx, rcy, r.w, r.h, rot) };
    });
    const envLeft = ZONE_LEFT + ZONE_VISUAL_INSET;
    const envRight = ZONE_RIGHT - ZONE_VISUAL_INSET;
    const envTop = ZONE_TOP + ZONE_VISUAL_INSET;
    const envBottom = ZONE_BOTTOM - ZONE_VISUAL_INSET;

    if (buildableAreaPolyScreen) {
      const selectedIdx = selectedPolyIdxOverride ?? selectedBuildablePolyIdx;
      const EDGE_EPS_PX = 1.5;
      const edgeEps2 = EDGE_EPS_PX * EDGE_EPS_PX;
      const distPointToSeg2 = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const vv = vx * vx + vy * vy;
        if (vv < 1e-12) {
          const dx = p.x - a.x;
          const dy = p.y - a.y;
          return dx * dx + dy * dy;
        }
        const wx = p.x - a.x;
        const wy = p.y - a.y;
        let t = (wx * vx + wy * vy) / vv;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        const cx = a.x + vx * t;
        const cy = a.y + vy * t;
        const dx = p.x - cx;
        const dy = p.y - cy;
        return dx * dx + dy * dy;
      };
      const onSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
        return distPointToSeg2(p, a, b) <= edgeEps2;
      };

      const inRing = (p: { x: number; y: number }, ring: Array<{ x: number; y: number }>) => {
        if (ring.length < 3) return false;
        const cleaned: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < ring.length; i++) {
          const cur = ring[i];
          const prev = cleaned.length ? cleaned[cleaned.length - 1] : null;
          if (prev && Math.abs(cur.x - prev.x) < 1e-9 && Math.abs(cur.y - prev.y) < 1e-9) continue;
          cleaned.push(cur);
        }
        if (cleaned.length >= 2) {
          const first = cleaned[0];
          const last = cleaned[cleaned.length - 1];
          if (Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) cleaned.pop();
        }
        if (cleaned.length < 3) return false;
        let inside = false;
        for (let i = 0, j = cleaned.length - 1; i < cleaned.length; j = i++) {
          const a = cleaned[j];
          const b = cleaned[i];
          if (onSeg(p, a, b)) return true;
          const intersect = ((a.y > p.y) !== (b.y > p.y)) && (p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x);
          if (intersect) inside = !inside;
        }
        return inside;
      };

      const inPoly = (p: { x: number; y: number }, poly: { outer: Array<{ x: number; y: number }>; holes: Array<Array<{ x: number; y: number }>> }) => {
        const inOuter = inRing(p, poly.outer);
        if (!inOuter) {
          let minD2 = Infinity;
          const ring = poly.outer;
          for (let i = 0; i < ring.length; i++) {
            const a = ring[i];
            const b = ring[(i + 1) % ring.length];
            minD2 = Math.min(minD2, distPointToSeg2(p, a, b));
          }
          if (!(minD2 <= edgeEps2)) return false;
        }
        for (const h of poly.holes) {
          const inH = inRing(p, h);
          if (!inH) continue;
          let minD2 = Infinity;
          for (let i = 0; i < h.length; i++) {
            const a = h[i];
            const b = h[(i + 1) % h.length];
            minD2 = Math.min(minD2, distPointToSeg2(p, a, b));
          }
          if (!(minD2 <= edgeEps2)) return false;
        }
        return true;
      };

      const edgeSamples: Array<{ x: number; y: number }> = [];
      const allCorners: Array<{ x: number; y: number }> = [];
      for (const r of allRects) {
        const rect = r.corners;
        for (const p of rect) allCorners.push(p);
        for (let i = 0; i < rect.length; i++) {
          const a = rect[i];
          const b = rect[(i + 1) % rect.length];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          const stepPx = 1 * FT_TO_UNIT;
          const steps = Math.max(6, Math.ceil(len / Math.max(1e-6, stepPx)));
          for (let k = 1; k < steps; k++) {
            const t = k / steps;
            edgeSamples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
          }
        }
      }

      const rectInsidePoly = (poly: { outer: Array<{ x: number; y: number }>; holes: Array<Array<{ x: number; y: number }>> }) => {
        const center = { x: cx, y: cy };
        if (!inPoly(center, poly)) return false;
        for (const p of allCorners) if (!inPoly(p, poly)) return false;
        for (const p of edgeSamples) if (!inPoly(p, poly)) return false;
        return true;
      };

      const polysToCheck =
        selectedIdx !== null &&
        Number.isInteger(selectedIdx) &&
        selectedIdx >= 0 &&
        selectedIdx < buildableAreaPolyScreen.polys.length
          ? [buildableAreaPolyScreen.polys[selectedIdx]]
          : buildableAreaPolyScreen.polys;

      let ok = false;
      for (const poly of polysToCheck) {
        if (rectInsidePoly(poly)) { ok = true; break; }
      }
      if (!ok) return false;
    } else {
      for (const r of allRects) {
        for (const p of r.corners) {
          if (p.x < envLeft || p.x > envRight || p.y < envTop || p.y > envBottom) {
            return false;
          }
        }
      }
    }

    for (const obs of OBSTACLES) {
      const obsPoly = rectToPoly(obs);
      for (const r of allRects) {
        if (doPolygonsIntersect(r.corners, obsPoly)) return false;
      }
    }

    const checkDeck = (typeof includeDeckOverride === 'boolean' ? includeDeckOverride : true) && hasBalcony;
    if (checkDeck) {
      const deckLocalCy = 0;
      const deckLocalCx = -(MAIN_W / 2 + ADDON_PX / 2);
      const dcx = cx + (deckLocalCx * cos - deckLocalCy * sin);
      const dcy = cy + (deckLocalCx * sin + deckLocalCy * cos);
      const deckCorners = getCorners(dcx, dcy, ADDON_PX, MAIN_H, rot);

      const deckEdgeSamples: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < deckCorners.length; i++) {
        const a = deckCorners[i];
        const b = deckCorners[(i + 1) % deckCorners.length];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const stepPx = 1 * FT_TO_UNIT;
        const steps = Math.max(6, Math.ceil(len / Math.max(1e-6, stepPx)));
        for (let k = 1; k < steps; k++) {
          const t = k / steps;
          deckEdgeSamples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }

      const inLotPoly = (p: { x: number; y: number }) => {
        if (!lotPolyScreen) {
          return p.x >= LOT_X && p.x <= LOT_X + LOT_W && p.y >= LOT_Y && p.y <= LOT_Y + LOT_H;
        }
        for (const poly of lotPolyScreen.polys) {
          const inOuter = pointInRing(p, poly.outer);
          if (!inOuter) continue;
          let inHole = false;
          for (const h of poly.holes) {
            if (pointInRing(p, h)) { inHole = true; break; }
          }
          if (!inHole) return true;
        }
        return false;
      };

      const deckCenter = { x: dcx, y: dcy };
      if (!inLotPoly(deckCenter)) return false;
      for (const p of deckCorners) if (!inLotPoly(p)) return false;
      for (const p of deckEdgeSamples) if (!inLotPoly(p)) return false;

      for (const ring of subjectBuildingRingsScreen) {
        if (ring.length < 3) continue;
        if (polygonsOverlap(deckCorners, ring as any)) return false;
      }
    }

    return true;
  };

  const checkFootprintFit = (args: {
    cx: number;
    cy: number;
    rot: number;
    rectSpecs: Array<{ localCx: number; localCy: number; w: number; h: number }>;
    selectedPolyIdxOverride?: number | null;
  }) => {
    const rad = args.rot * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const allRects = args.rectSpecs.map(r => {
      const rcx = args.cx + (r.localCx * cos - r.localCy * sin);
      const rcy = args.cy + (r.localCx * sin + r.localCy * cos);
      return { corners: getCorners(rcx, rcy, r.w, r.h, args.rot) };
    });
    const envLeft = ZONE_LEFT + ZONE_VISUAL_INSET;
    const envRight = ZONE_RIGHT - ZONE_VISUAL_INSET;
    const envTop = ZONE_TOP + ZONE_VISUAL_INSET;
    const envBottom = ZONE_BOTTOM - ZONE_VISUAL_INSET;

    if (buildableAreaPolyScreen) {
      const selectedIdx = args.selectedPolyIdxOverride ?? selectedBuildablePolyIdx;
      const EDGE_EPS_PX = 1.5;
      const edgeEps2 = EDGE_EPS_PX * EDGE_EPS_PX;
      const distPointToSeg2 = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
        const vx = b.x - a.x;
        const vy = b.y - a.y;
        const vv = vx * vx + vy * vy;
        if (vv < 1e-12) {
          const dx = p.x - a.x;
          const dy = p.y - a.y;
          return dx * dx + dy * dy;
        }
        const wx = p.x - a.x;
        const wy = p.y - a.y;
        let t = (wx * vx + wy * vy) / vv;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        const cx = a.x + vx * t;
        const cy = a.y + vy * t;
        const dx = p.x - cx;
        const dy = p.y - cy;
        return dx * dx + dy * dy;
      };
      const onSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
        return distPointToSeg2(p, a, b) <= edgeEps2;
      };

      const inRing = (p: { x: number; y: number }, ring: Array<{ x: number; y: number }>) => {
        if (ring.length < 3) return false;
        const cleaned: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < ring.length; i++) {
          const cur = ring[i];
          const prev = cleaned.length ? cleaned[cleaned.length - 1] : null;
          if (prev && Math.abs(cur.x - prev.x) < 1e-9 && Math.abs(cur.y - prev.y) < 1e-9) continue;
          cleaned.push(cur);
        }
        if (cleaned.length >= 2) {
          const first = cleaned[0];
          const last = cleaned[cleaned.length - 1];
          if (Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) cleaned.pop();
        }
        if (cleaned.length < 3) return false;
        let inside = false;
        for (let i = 0, j = cleaned.length - 1; i < cleaned.length; j = i++) {
          const a = cleaned[j];
          const b = cleaned[i];
          if (onSeg(p, a, b)) return true;
          const intersect = ((a.y > p.y) !== (b.y > p.y)) && (p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x);
          if (intersect) inside = !inside;
        }
        return inside;
      };

      const inPoly = (p: { x: number; y: number }, poly: { outer: Array<{ x: number; y: number }>; holes: Array<Array<{ x: number; y: number }>> }) => {
        const inOuter = inRing(p, poly.outer);
        if (!inOuter) {
          let minD2 = Infinity;
          const ring = poly.outer;
          for (let i = 0; i < ring.length; i++) {
            const a = ring[i];
            const b = ring[(i + 1) % ring.length];
            minD2 = Math.min(minD2, distPointToSeg2(p, a, b));
          }
          if (!(minD2 <= edgeEps2)) return false;
        }
        for (const h of poly.holes) {
          const inH = inRing(p, h);
          if (!inH) continue;
          let minD2 = Infinity;
          for (let i = 0; i < h.length; i++) {
            const a = h[i];
            const b = h[(i + 1) % h.length];
            minD2 = Math.min(minD2, distPointToSeg2(p, a, b));
          }
          if (!(minD2 <= edgeEps2)) return false;
        }
        return true;
      };

      const edgeSamples: Array<{ x: number; y: number }> = [];
      const allCorners: Array<{ x: number; y: number }> = [];
      for (const r of allRects) {
        const rect = r.corners;
        for (const p of rect) allCorners.push(p);
        for (let i = 0; i < rect.length; i++) {
          const a = rect[i];
          const b = rect[(i + 1) % rect.length];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          const stepPx = 1 * FT_TO_UNIT;
          const steps = Math.max(6, Math.ceil(len / Math.max(1e-6, stepPx)));
          for (let k = 1; k < steps; k++) {
            const t = k / steps;
            edgeSamples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
          }
        }
      }

      const rectInsidePoly = (poly: { outer: Array<{ x: number; y: number }>; holes: Array<Array<{ x: number; y: number }>> }) => {
        const center = { x: args.cx, y: args.cy };
        if (!inPoly(center, poly)) return false;
        for (const p of allCorners) if (!inPoly(p, poly)) return false;
        for (const p of edgeSamples) if (!inPoly(p, poly)) return false;
        return true;
      };

      const polysToCheck =
        selectedIdx !== null &&
        Number.isInteger(selectedIdx) &&
        selectedIdx >= 0 &&
        selectedIdx < buildableAreaPolyScreen.polys.length
          ? [buildableAreaPolyScreen.polys[selectedIdx]]
          : buildableAreaPolyScreen.polys;

      let ok = false;
      for (const poly of polysToCheck) {
        if (rectInsidePoly(poly)) { ok = true; break; }
      }
      if (!ok) return false;
    } else {
      for (const r of allRects) {
        for (const p of r.corners) {
          if (p.x < envLeft || p.x > envRight || p.y < envTop || p.y > envBottom) {
            return false;
          }
        }
      }
    }

    for (const obs of OBSTACLES) {
      const obsPoly = rectToPoly(obs);
      for (const r of allRects) {
        if (doPolygonsIntersect(r.corners, obsPoly)) return false;
      }
    }

    return true;
  };

  const addOnFits = (() => {
    const tooltip = "Doesn't fit your lot";
    const buildableRectSpecsFor = (endAddonOpt: typeof endAddon) => {
      const endRightOnOpt = endAddonOpt === 'end-right' || endAddonOpt === 'end-both';
      const endLeftOnOpt = endAddonOpt === 'end-left' || endAddonOpt === 'end-both';
      const specs: Array<{ localCx: number; localCy: number; w: number; h: number }> = [
        { localCx: 0, localCy: 0, w: MAIN_W, h: MAIN_H }
      ];
      if (endRightOnOpt) specs.push({ localCx: 0, localCy: -(MAIN_H / 2 + ADDON_PX / 2), w: MAIN_W, h: ADDON_PX });
      if (endLeftOnOpt) specs.push({ localCx: 0, localCy: MAIN_H / 2 + ADDON_PX / 2, w: MAIN_W, h: ADDON_PX });
      return specs;
    };

    const deckOkFor = (endAddonOpt: typeof endAddon) => {
      const endRightOnOpt = endAddonOpt === 'end-right' || endAddonOpt === 'end-both';
      const endLeftOnOpt = endAddonOpt === 'end-left' || endAddonOpt === 'end-both';
      const combinedHOpt = MAIN_H;
      const deckLocalCy = 0;
      const deckLocalCx = -(MAIN_W / 2 + ADDON_PX / 2);
      const rot = aduState.rotation;
      const rad = rot * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dcx = aduState.cx + (deckLocalCx * cos - deckLocalCy * sin);
      const dcy = aduState.cy + (deckLocalCx * sin + deckLocalCy * cos);
      const deckCorners = getCorners(dcx, dcy, ADDON_PX, combinedHOpt, rot);

      const deckEdgeSamples: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < deckCorners.length; i++) {
        const a = deckCorners[i];
        const b = deckCorners[(i + 1) % deckCorners.length];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const stepPx = 1 * FT_TO_UNIT;
        const steps = Math.max(6, Math.ceil(len / Math.max(1e-6, stepPx)));
        for (let k = 1; k < steps; k++) {
          const t = k / steps;
          deckEdgeSamples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }

      const inLotPoly = (p: { x: number; y: number }) => {
        if (!lotPolyScreen) {
          return p.x >= LOT_X && p.x <= LOT_X + LOT_W && p.y >= LOT_Y && p.y <= LOT_Y + LOT_H;
        }
        for (const poly of lotPolyScreen.polys) {
          const inOuter = pointInRing(p, poly.outer);
          if (!inOuter) continue;
          let inHole = false;
          for (const h of poly.holes) {
            if (pointInRing(p, h)) { inHole = true; break; }
          }
          if (!inHole) return true;
        }
        return false;
      };

      if (!inLotPoly({ x: dcx, y: dcy })) return false;
      for (const p of deckCorners) if (!inLotPoly(p)) return false;
      for (const p of deckEdgeSamples) if (!inLotPoly(p)) return false;

      for (const ring of subjectBuildingRingsScreen) {
        if (ring.length < 3) continue;
        if (polygonsOverlap(deckCorners, ring as any)) return false;
      }
      return true;
    };

    const baseArgs = { cx: aduState.cx, cy: aduState.cy, rot: aduState.rotation, selectedPolyIdxOverride: undefined as number | null | undefined };
    const buildableOkNone = checkFootprintFit({ ...baseArgs, rectSpecs: buildableRectSpecsFor('none') });
    const buildableOkEndRight = checkFootprintFit({ ...baseArgs, rectSpecs: buildableRectSpecsFor('end-right') });
    const buildableOkEndLeft = checkFootprintFit({ ...baseArgs, rectSpecs: buildableRectSpecsFor('end-left') });
    const buildableOkEndBoth = checkFootprintFit({ ...baseArgs, rectSpecs: buildableRectSpecsFor('end-both') });

    const none = buildableOkNone && (!hasBalcony || deckOkFor('none'));
    const endRight = buildableOkEndRight && (!hasBalcony || deckOkFor('end-right'));
    const endLeft = buildableOkEndLeft && (!hasBalcony || deckOkFor('end-left'));
    const endBoth = buildableOkEndBoth && (!hasBalcony || deckOkFor('end-both'));
    const balconyOn = checkFootprintFit({ ...baseArgs, rectSpecs: buildableRectSpecsFor(endAddon) }) && deckOkFor(endAddon);

    return { tooltip, none, endRight, endLeft, endBoth, balconyOn };
  })();

  const resolveNearestValidCenter = (targetCx: number, targetCy: number, rot: number, selectedPolyIdxOverride?: number | null, maxRFt: number = 30) => {
    if (checkValidity(targetCx, targetCy, rot, undefined, selectedPolyIdxOverride)) return { cx: targetCx, cy: targetCy };
    const step = 0.5 * FT_TO_UNIT;
    const maxR = Math.max(0, maxRFt) * FT_TO_UNIT;
    for (let r = step; r <= maxR + 1e-6; r += step) {
      for (let deg = 0; deg < 360; deg += 22.5) {
        const rad = (deg * Math.PI) / 180;
        const cx = targetCx + Math.cos(rad) * r;
        const cy = targetCy + Math.sin(rad) * r;
        if (checkValidity(cx, cy, rot, undefined, selectedPolyIdxOverride)) return { cx, cy };
      }
    }
    return null;
  };

  const constrainMoveCenter = (currentCx: number, currentCy: number, targetCx: number, targetCy: number, rot: number, selectedPolyIdxOverride?: number | null) => {
    if (checkValidity(targetCx, targetCy, rot, undefined, selectedPolyIdxOverride)) return { cx: targetCx, cy: targetCy };
    if (!checkValidity(currentCx, currentCy, rot, undefined, selectedPolyIdxOverride)) {
      return resolveNearestValidCenter(targetCx, targetCy, rot, selectedPolyIdxOverride, 200);
    }

    let lo = 0;
    let hi = 1;
    for (let iter = 0; iter < 18; iter++) {
      const mid = (lo + hi) / 2;
      const cx = currentCx + (targetCx - currentCx) * mid;
      const cy = currentCy + (targetCy - currentCy) * mid;
      if (checkValidity(cx, cy, rot, undefined, selectedPolyIdxOverride)) lo = mid;
      else hi = mid;
    }
    const clamped = { cx: currentCx + (targetCx - currentCx) * lo, cy: currentCy + (targetCy - currentCy) * lo };
    const moved = Math.hypot(clamped.cx - currentCx, clamped.cy - currentCy);
    const intended = Math.hypot(targetCx - currentCx, targetCy - currentCy);
    if (intended > 2 * FT_TO_UNIT && moved < 0.25 * FT_TO_UNIT) {
      const snapped = resolveNearestValidCenter(targetCx, targetCy, rot, selectedPolyIdxOverride, 200);
      if (snapped) return snapped;
    }
    return clamped;
  };

  const resolveNearestValidPose = (targetCx: number, targetCy: number, preferredRot: number, selectedPolyIdxOverride?: number | null) => {
    const normPreferred = ((preferredRot % 360) + 360) % 360;
    const tryAt = (cx: number, cy: number) => {
      if (checkValidity(cx, cy, normPreferred, undefined, selectedPolyIdxOverride)) {
        return { cx, cy, rotation: normPreferred };
      }
      for (let delta = 2; delta <= 180; delta += 2) {
        const a = (normPreferred + delta) % 360;
        const b = (normPreferred - delta + 360) % 360;
        if (checkValidity(cx, cy, a, undefined, selectedPolyIdxOverride)) return { cx, cy, rotation: a };
        if (checkValidity(cx, cy, b, undefined, selectedPolyIdxOverride)) return { cx, cy, rotation: b };
      }
      return null;
    };

    const direct = tryAt(targetCx, targetCy);
    if (direct) return direct;

    const step = 0.5 * FT_TO_UNIT;
    const maxR = 60 * FT_TO_UNIT;
    for (let r = step; r <= maxR + 1e-6; r += step) {
      for (let deg = 0; deg < 360; deg += 22.5) {
        const rad = (deg * Math.PI) / 180;
        const cx = targetCx + Math.cos(rad) * r;
        const cy = targetCy + Math.sin(rad) * r;
        const pose = tryAt(cx, cy);
        if (pose) return pose;
      }
    }
    return null;
  };

  const buildableAreaParts = (() => {
    if (!buildableAreaPolyScreen) return [] as Array<{ idx: number; d: string; centroid: { x: number; y: number } }>;
    const ringToD = (ring: Array<{ x: number; y: number }>) =>
      ring.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    const polyToD = (poly: { outer: Array<{ x: number; y: number }>; holes: Array<Array<{ x: number; y: number }>> }) =>
      [poly.outer, ...poly.holes].map(ringToD).join(' ');
    const centroidOfOuter = (outer: Array<{ x: number; y: number }>) => {
      let sx = 0, sy = 0;
      for (const p of outer) { sx += p.x; sy += p.y; }
      const n = Math.max(1, outer.length);
      return { x: sx / n, y: sy / n };
    };
    return buildableAreaPolyScreen.polys.map((poly, idx) => ({ idx, d: polyToD(poly), centroid: centroidOfOuter(poly.outer) }));
  })();

  const hasVisibleBuildable = canFitAdu && (
    buildableAreaParts.length > 0 ||
    !!buildableAreaD ||
    hasBz
  );

  const buildableEdgeSegmentsAll = (() => {
    if (!buildableAreaPolyScreen) return [] as Array<{ key: string; ax: number; ay: number; bx: number; by: number; mx: number; my: number; len: number; ux: number; uy: number; nx: number; ny: number }>;
    const idx =
      selectedBuildablePolyIdx !== null &&
      Number.isInteger(selectedBuildablePolyIdx) &&
      selectedBuildablePolyIdx >= 0 &&
      selectedBuildablePolyIdx < buildableAreaPolyScreen.polys.length
        ? selectedBuildablePolyIdx
        : 0;
    const poly = buildableAreaPolyScreen.polys[idx];
    const ringRaw = poly?.outer ?? [];
    if (ringRaw.length < 3) return [] as Array<{ key: string; ax: number; ay: number; bx: number; by: number; mx: number; my: number; len: number; ux: number; uy: number; nx: number; ny: number }>;
    const ring = (() => {
      const out: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < ringRaw.length; i++) {
        const cur = ringRaw[i];
        const prev = out.length ? out[out.length - 1] : null;
        if (prev && Math.abs(cur.x - prev.x) < 1e-9 && Math.abs(cur.y - prev.y) < 1e-9) continue;
        out.push(cur);
      }
      if (out.length >= 2) {
        const first = out[0];
        const last = out[out.length - 1];
        if (Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) out.pop();
      }
      return out;
    })();
    if (ring.length < 3) return [] as Array<{ key: string; ax: number; ay: number; bx: number; by: number; mx: number; my: number; len: number; ux: number; uy: number; nx: number; ny: number }>;

    const segs: Array<{ ax: number; ay: number; bx: number; by: number; len: number }> = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (!Number.isFinite(len) || len < 1e-6) continue;
      segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, len });
    }
    if (segs.length === 0) return [] as Array<{ key: string; ax: number; ay: number; bx: number; by: number; mx: number; my: number; len: number; ux: number; uy: number; nx: number; ny: number }>;

    const isCollinear = (s1: { ax: number; ay: number; bx: number; by: number }, s2: { ax: number; ay: number; bx: number; by: number }) => {
      const v1x = s1.bx - s1.ax;
      const v1y = s1.by - s1.ay;
      const v2x = s2.bx - s2.ax;
      const v2y = s2.by - s2.ay;
      const cross = v1x * v2y - v1y * v2x;
      const dot = v1x * v2x + v1y * v2y;
      const denom = (Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y)) + 1e-9;
      const sinAbs = Math.abs(cross) / denom;
      return sinAbs <= 0.25 && dot > 0;
    };

    const merged: Array<{ ax: number; ay: number; bx: number; by: number; len: number }> = [];
    let cur = { ...segs[0] };
    for (let i = 1; i < segs.length; i++) {
      const s = segs[i];
      if (isCollinear(cur, s)) {
        cur = { ax: cur.ax, ay: cur.ay, bx: s.bx, by: s.by, len: cur.len + s.len };
      } else {
        merged.push(cur);
        cur = { ...s };
      }
    }
    if (merged.length > 0 && isCollinear(merged[0], cur)) {
      merged[0] = { ax: cur.ax, ay: cur.ay, bx: merged[0].bx, by: merged[0].by, len: merged[0].len + cur.len };
    } else {
      merged.push(cur);
    }

    const minLenMeasurePx = 1 * mapPxPerFt;
    const candidates = merged
      .filter(s => s.len >= minLenMeasurePx)
      .map((s, i) => {
        const mx = (s.ax + s.bx) / 2;
        const my = (s.ay + s.by) / 2;
        const vx = s.bx - s.ax;
        const vy = s.by - s.ay;
        const vLen = Math.hypot(vx, vy) + 1e-9;
        const ux = vx / vLen;
        const uy = vy / vLen;
        const nx = -uy;
        const ny = ux;
        return { key: `buildable-edge-${idx}-${i}`, ax: s.ax, ay: s.ay, bx: s.bx, by: s.by, mx, my, len: s.len, ux, uy, nx, ny };
      });
    return candidates;
  })();

  const buildableEdgeSegmentsForLabels = (() => {
    const isCollinearDir = (a: { ux: number; uy: number }, b: { ux: number; uy: number }) => {
      const dot = a.ux * b.ux + a.uy * b.uy;
      const cross = a.ux * b.uy - a.uy * b.ux;
      const sinAbs = Math.abs(cross);
      return sinAbs <= 0.25 && dot > 0;
    };

    const notchMaxLenPx = 12 * mapPxPerFt;
    const nAll = buildableEdgeSegmentsAll.length;
    let start = 0;
    if (nAll >= 3) {
      for (let i = 0; i < nAll; i++) {
        const prev = buildableEdgeSegmentsAll[(i - 1 + nAll) % nAll];
        const cur = buildableEdgeSegmentsAll[i];
        if (prev.len <= notchMaxLenPx && cur.len > notchMaxLenPx) {
          start = i;
          break;
        }
      }
    }
    const rotated = buildableEdgeSegmentsAll.slice(start).concat(buildableEdgeSegmentsAll.slice(0, start));

    const combinedAcrossNotch: Array<typeof buildableEdgeSegmentsAll[number]> = [];
    const notchBridgeMaxPx = notchMaxLenPx;
    for (let i = 0; i < rotated.length; i++) {
      const a = rotated[i];

      let merged = false;
      let sumBetween = 0;
      for (let k = i + 1; k < Math.min(rotated.length, i + 7); k++) {
        const s = rotated[k];
        if (k > i + 1) sumBetween += rotated[k - 1].len;

        if (sumBetween > notchBridgeMaxPx) break;
        if (k > i + 1 && rotated.slice(i + 1, k).some(seg => seg.len > notchMaxLenPx)) break;

        if (isCollinearDir(a, s)) {
          const anchor = a.len >= s.len ? a : s;
          combinedAcrossNotch.push({
            ...anchor,
            key: `${a.key}-notch-${i}`,
            len: a.len + s.len
          });
          i = k;
          merged = true;
          break;
        }
      }
      if (merged) continue;

      combinedAcrossNotch.push(a);
    }

    const minLenLabelPx = 6 * mapPxPerFt;
    const candidates = combinedAcrossNotch.filter((s) => s.len >= minLenLabelPx);
    const keep = candidates.map(() => true);
    const lenTol = 0.75 * mapPxPerFt;
    const parallelDot = 0.985;
    const oppositeMinDist = 6 * mapPxPerFt;
    for (let i = 0; i < candidates.length; i++) {
      if (!keep[i]) continue;
      const a = candidates[i];
      for (let j = i + 1; j < candidates.length; j++) {
        if (!keep[j]) continue;
        const b = candidates[j];
        if (Math.abs(a.len - b.len) > lenTol) continue;
        const dot = Math.abs(a.ux * b.ux + a.uy * b.uy);
        if (dot < parallelDot) continue;
        const dx = b.mx - a.mx;
        const dy = b.my - a.my;
        const dist = Math.abs(dx * a.nx + dy * a.ny);
        if (dist < oppositeMinDist) continue;
        const drop = (a.my < b.my) ? j : i;
        keep[drop] = false;
        if (drop === i) break;
      }
    }
    return candidates.filter((_, i) => keep[i]);
  })();

  const buildableEdgeLabels = (() => {
    return buildableEdgeSegmentsForLabels.map((s) => {
      const text = formatFtFromMapPx(s.len);
      const w = Math.max(40, Math.min(84, 12 + text.length * 6));
      return { key: `${s.key}-label`, x: s.mx, y: s.my, text, w };
    });
  })();

  const computedMeasureLines = (() => {
    if (!buildableAreaPolyScreen || buildableEdgeSegmentsAll.length === 0) return [] as any[];
    const idx =
      selectedBuildablePolyIdx !== null &&
      Number.isInteger(selectedBuildablePolyIdx) &&
      selectedBuildablePolyIdx >= 0 &&
      selectedBuildablePolyIdx < buildableAreaPolyScreen.polys.length
        ? selectedBuildablePolyIdx
        : 0;
    const poly = buildableAreaPolyScreen.polys[idx];
    const allBuildingRings = [...subjectBuildingRingsScreen, ...nearbyBuildingRingsScreen]
      .filter((r) => Array.isArray(r) && r.length >= 3) as Point[][];

    const lotRings: Point[][] = lotPolyScreen
      ? lotPolyScreen.polys.map((p) => p.outer).filter((r) => Array.isArray(r) && r.length >= 3) as Point[][]
      : [rectToPoly({ x: LOT_X, y: LOT_Y, w: LOT_W, h: LOT_H })];

    const minHitT = (origin: Point, dirUnit: Point, rings: Point[][]) => {
      let best: { t: number; hit: Point } | null = null;
      for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i];
          const b = ring[(i + 1) % ring.length];
          const t = raySegmentIntersectionT(origin, dirUnit, a, b);
          if (t === null) continue;
          if (!Number.isFinite(t) || t < 0) continue;
          if (!best || t < best.t) {
            best = { t, hit: { x: origin.x + dirUnit.x * t, y: origin.y + dirUnit.y * t } };
          }
        }
      }
      return best;
    };

    const offsetPx = 2;
    const samples = [0.5, 0.2, 0.8];
    const out: any[] = [];

    const signedArea = (ring: Point[]) => {
      let a = 0;
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i];
        const q = ring[(i + 1) % ring.length];
        a += p.x * q.y - q.x * p.y;
      }
      return a / 2;
    };
    const interiorIsLeft = signedArea(poly.outer as any) > 0;

    const minMeasureEdgeLenPx = 6 * mapPxPerFt;
    for (const seg of buildableEdgeSegmentsAll) {
      if (seg.len < minMeasureEdgeLenPx) continue;
      const dir = { x: seg.ux, y: seg.uy };
      const n = interiorIsLeft ? { x: dir.y, y: -dir.x } : { x: -dir.y, y: dir.x };

      let bestChoice: { a: Point; b: Point; distPx: number } | null = null;
      for (const tEdge of samples) {
        const aPt = { x: seg.ax + (seg.bx - seg.ax) * tEdge, y: seg.ay + (seg.by - seg.ay) * tEdge };
        const origin = { x: aPt.x + n.x * offsetPx, y: aPt.y + n.y * offsetPx };

        const lotHit = minHitT(origin, n, lotRings);
        if (!lotHit) continue;
        const bldgHit = allBuildingRings.length ? minHitT(origin, n, allBuildingRings) : null;

        const chosen = (bldgHit && bldgHit.t < lotHit.t - 1e-6) ? bldgHit : lotHit;
        const distPx = chosen.t + offsetPx;
        if (!bestChoice || distPx < bestChoice.distPx) {
          bestChoice = { a: aPt, b: chosen.hit, distPx };
        }
      }

      if (!bestChoice) continue;
      let distFt = bestChoice.distPx / FT_TO_UNIT;
      if (bboxMercator && Number.isFinite(bboxMercator.scale) && bboxMercator.scale > 1e-12) {
        const dx = bestChoice.b.x - bestChoice.a.x;
        const dy = bestChoice.b.y - bestChoice.a.y;
        const distM = Math.hypot(dx, dy) / bboxMercator.scale;
        distFt = distM * FT_PER_M;
      }
      if (!Number.isFinite(distFt) || distFt < 0.25) continue;
      out.push({
        kind: 'env-clearance',
        a: { x: bestChoice.a.x, y: bestChoice.a.y },
        b: { x: bestChoice.b.x, y: bestChoice.b.y },
        distanceFt: distFt
      });
    }

    return out;
  })();

  const measureLines = computedMeasureLines.length > 0 ? computedMeasureLines : backendMeasureLines;

  useEffect(() => {
    if (!buildableAreaPolyScreen) {
      if (selectedBuildablePolyIdx !== null) setSelectedBuildablePolyIdx(null);
      return;
    }
    if (selectedBuildablePolyIdx === null) return;
    if (selectedBuildablePolyIdx < 0 || selectedBuildablePolyIdx >= buildableAreaPolyScreen.polys.length) {
      setSelectedBuildablePolyIdx(null);
    }
  }, [buildableAreaPolyScreen?.polys.length, selectedBuildablePolyIdx]);

  const handleSelectBuildablePoly = (e: React.MouseEvent, polyIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canFitAdu) return;
    if (!buildableAreaParts.length) return;
    const part = buildableAreaParts.find(p => p.idx === polyIdx);
    if (!part) return;
    setSelectedBuildablePolyIdx(polyIdx);
    const pt = clientToSvg(e.clientX, e.clientY);
    if (!pt) return;
    const localPt = screenToMapLocal(pt);
    const pose = resolveNearestValidPose(localPt.x, localPt.y, aduState.rotation, polyIdx);
    if (pose) setAduState({ cx: pose.cx, cy: pose.cy, rotation: pose.rotation });
  };

  const resolveValidPlacement = (preferred?: { cx: number; cy: number; rotation: number }) => {
    const envLeft = ZONE_LEFT + ZONE_VISUAL_INSET;
    const envRight = ZONE_RIGHT - ZONE_VISUAL_INSET;
    const envTop = ZONE_TOP + ZONE_VISUAL_INSET;
    const envBottom = ZONE_BOTTOM - ZONE_VISUAL_INSET;

    const centerCx = ADU_CENTER_X;
    const centerCy = ADU_CENTER_Y;
    const centerCandidates: Array<{ cx: number; cy: number }> = [];
    const seen = new Set<string>();
    const pushCenter = (cx: number, cy: number) => {
      const key = `${Math.round(cx * 1000)}:${Math.round(cy * 1000)}`;
      if (seen.has(key)) return;
      seen.add(key);
      centerCandidates.push({ cx, cy });
    };

    if (preferred) pushCenter(preferred.cx, preferred.cy);
    pushCenter(centerCx, centerCy);

    // Expand from center in 1ft rings to keep "most centered" effect.
    const ringStep = FT_TO_UNIT;
    const maxRadius = Math.max(
      Math.hypot(centerCx - envLeft, centerCy - envTop),
      Math.hypot(centerCx - envLeft, envBottom - centerCy),
      Math.hypot(envRight - centerCx, centerCy - envTop),
      Math.hypot(envRight - centerCx, envBottom - centerCy)
    );
    for (let r = ringStep; r <= maxRadius + 1e-6; r += ringStep) {
      for (let deg = 0; deg < 360; deg += 22.5) {
        const rad = deg * Math.PI / 180;
        pushCenter(centerCx + Math.cos(rad) * r, centerCy + Math.sin(rad) * r);
      }
    }

    const preferredRot = preferred ? ((preferred.rotation % 360) + 360) % 360 : null;
    const findIntervalMidAngle = (validAngles: boolean[], preferredAngle: number | null) => {
      const n = validAngles.length;
      let hasAny = false;
      for (let i = 0; i < n; i++) {
        if (validAngles[i]) {
          hasAny = true;
          break;
        }
      }
      if (!hasAny) return null;

      const doubled = validAngles.concat(validAngles);
      const intervals: Array<{ start: number; end: number; len: number }> = [];
      let i = 0;
      while (i < doubled.length) {
        if (!doubled[i]) {
          i++;
          continue;
        }
        const start = i;
        while (i < doubled.length && doubled[i]) i++;
        const end = i - 1;
        const len = end - start + 1;
        if (start < n) {
          intervals.push({ start: start % n, end: end % n, len: Math.min(len, n) });
        }
      }
      if (intervals.length === 0) return null;

      const inInterval = (angle: number, seg: { start: number; end: number }) => {
        if (seg.start <= seg.end) return angle >= seg.start && angle <= seg.end;
        return angle >= seg.start || angle <= seg.end;
      };

      let best = intervals[0];
      if (preferredAngle !== null) {
        const match = intervals
          .filter(seg => inInterval(preferredAngle, seg))
          .sort((a, b) => b.len - a.len)[0];
        if (match) best = match;
        else best = intervals.sort((a, b) => b.len - a.len)[0];
      } else {
        best = intervals.sort((a, b) => b.len - a.len)[0];
      }

      const endLinear = best.start + best.len - 1;
      return Math.round((best.start + endLinear) / 2) % n;
    };

    for (const c of centerCandidates) {
      const validAngles = Array.from({ length: 360 }, (_, deg) => checkValidity(c.cx, c.cy, deg));
      const midRot = findIntervalMidAngle(validAngles, preferredRot);
      if (midRot !== null) {
        return { cx: c.cx, cy: c.cy, rotation: midRot };
      }
    }
    return null;
  };

  // 入口默认位（没有 saved placement 才会走这里）：
  // - 这个 effect 的作用是：当没有 localStorage 记录时，给 aduState 一个“推荐位”
  // - 注意：如果此时 buildableAreaPolyScreen / canFitAdu 还没 ready，画面可能会先渲染一个临时状态，
  //   后续等约束 ready 之后会被下面的 “Final guard” 修正（就会看到“先在外面一下，再快速跳回合法位置”）
  // Important: if only 90° can fit, do not force 0° or it will visibly overflow.
  useEffect(() => {
    if (!placementKeyReady) return;
    try {
      const raw = localStorage.getItem(placementStorageKey);
      if (raw) return;
    } catch {
    }
    const resolved = resolveValidPlacement({ cx: ADU_CENTER_X, cy: ADU_CENTER_Y, rotation: defaultPreferredRotationDeg });
    setAduState(resolved ?? { cx: ADU_CENTER_X, cy: ADU_CENTER_Y, rotation: defaultPreferredRotationDeg });
  }, [placementStorageKey, defaultPreferredRotationDeg, ADU_CENTER_X, ADU_CENTER_Y, ZONE_LEFT, ZONE_RIGHT, ZONE_TOP, ZONE_BOTTOM, MAIN_W, MAIN_H, HOUSE_X, HOUSE_Y, HOUSE_W, HOUSE_H, GARAGE_X, GARAGE_Y, GARAGE_W, GARAGE_H]);

  // Step 1) 读取并解析 localStorage（只在 key 变化时读一次）：
  // - 这里只恢复“离散配置”（外挂/露台/选中的 buildable poly）
  // - 位置/角度不在这里直接 setAduState：因为这一步可能发生在 bboxMercator/lotPolyScreen 未 ready 的时刻，
  //   如果直接用 cxPx/cyPx 会因为页面尺寸变化导致坐标系不一致，从而出现“先看见在外面，再被纠正”的闪动
  useEffect(() => {
    if (!placementKeyReady) return;
    restoreParsedRef.current = null;
    restoreAppliedKeyRef.current = null;
    restoreConfigReadyRef.current = false;
    restorePoseAttemptedKeyRef.current = null;
    userTouchedPlacementRef.current = false;
    try {
      const raw = localStorage.getItem(placementStorageKey);
      if (!raw) {
        setIsHydratingPlacement(false);
        return;
      }
      setIsHydratingPlacement(true);
      const parsed = JSON.parse(raw);
      restoreParsedRef.current = { key: placementStorageKey, parsed };

      const rawEndAddon = (parsed?.endAddon ?? null) as any;
      const nextEndAddon =
        rawEndAddon === 'none' || rawEndAddon === 'end-right' || rawEndAddon === 'end-left' || rawEndAddon === 'end-both'
          ? rawEndAddon
          : null;
      const nextHasBalcony = typeof parsed?.hasBalcony === 'boolean' ? parsed.hasBalcony : null;

      if (nextEndAddon !== null) setEndAddon(nextEndAddon);
      if (nextHasBalcony !== null) setHasBalcony(nextHasBalcony);
    } catch {
      setIsHydratingPlacement(false);
    }
  }, [placementStorageKey]);

  useEffect(() => {
    if (!placementKeyReady) return;
    const entry = restoreParsedRef.current;
    if (!entry || entry.key !== placementStorageKey) {
      restoreConfigReadyRef.current = false;
      return;
    }
    const parsed = entry.parsed;
    const rawEndAddon = (parsed?.endAddon ?? null) as any;
    const expectedEndAddon =
      rawEndAddon === 'none' || rawEndAddon === 'end-right' || rawEndAddon === 'end-left' || rawEndAddon === 'end-both'
        ? rawEndAddon
        : null;
    const expectedHasBalcony = typeof parsed?.hasBalcony === 'boolean' ? parsed.hasBalcony : null;

    const endAddonOk = expectedEndAddon === null || endAddon === expectedEndAddon;
    const hasBalconyOk = expectedHasBalcony === null || hasBalcony === expectedHasBalcony;
    restoreConfigReadyRef.current = endAddonOk && hasBalconyOk;
  }, [placementStorageKey, endAddon, hasBalcony, selectedBuildablePolyIdx]);

  // Step 2) 基于解析出的 payload 计算“应该恢复到的 cx/cy/rotation”（但先不直接 setAduState）：
  // - 优先级：cxRel/cyRel（相对 lot bounds，最不受页面尺寸影响）
  //         -> cxM/cyM（WebMercator 米坐标，需要 bboxMercator scale/offset 才能转回屏幕）
  //         -> cxPx/cyPx（屏幕像素坐标，页面尺寸变化会漂，不作为首选）
  // - 关键：如果 payload 里有 rel/merc，但此时几何还没 ready，就 return 等下一轮
  //         这样避免先用 cxPx 进行一次不稳定的恢复，导致画面“先偏一下”
  useEffect(() => {
    if (!placementKeyReady) return;
    if (userTouchedPlacementRef.current) return;
    if (restoreAppliedKeyRef.current === placementStorageKey) return;
    const entry = restoreParsedRef.current;
    if (!entry || entry.key !== placementStorageKey) return;
    if (!restoreConfigReadyRef.current) return;
    const parsed = entry.parsed;

    const rot = Number(parsed?.rotationDeg);
    if (!Number.isFinite(rot)) return;

    const cxRel = Number(parsed?.cxRel);
    const cyRel = Number(parsed?.cyRel);
    const cxM = Number(parsed?.cxM);
    const cyM = Number(parsed?.cyM);
    const cxPx = Number(parsed?.cxPx);
    const cyPx = Number(parsed?.cyPx);
    const cxFt = Number(parsed?.cxFt);
    const cyFt = Number(parsed?.cyFt);

    const hasRel = Number.isFinite(cxRel) && Number.isFinite(cyRel);
    const hasMerc = Number.isFinite(cxM) && Number.isFinite(cyM);
    if (hasMerc && !bboxMercator) return;
    if (!hasMerc && hasRel && !lotPolyScreen) return;

    const lotBounds = (() => {
      const polys = lotPolyScreen?.polys ?? null;
      if (!polys || polys.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const poly of polys) {
        for (const p of poly.outer) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
      }
      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
      const w = maxX - minX;
      const h = maxY - minY;
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 1e-9 || h <= 1e-9) return null;
      return { minX, minY, w, h };
    })();

    const cx =
      bboxMercator && Number.isFinite(cxM)
        ? (bboxMercator.offsetX + cxM * bboxMercator.scale)
        : (lotBounds && Number.isFinite(cxRel)
          ? (lotBounds.minX + cxRel * lotBounds.w)
          : (Number.isFinite(cxPx) ? cxPx : (Number.isFinite(cxFt) ? (LOT_X + cxFt * FT_TO_UNIT) : NaN)));
    const cy =
      bboxMercator && Number.isFinite(cyM)
        ? (bboxMercator.offsetY + cyM * bboxMercator.scale)
        : (lotBounds && Number.isFinite(cyRel)
          ? (lotBounds.minY + cyRel * lotBounds.h)
          : (Number.isFinite(cyPx) ? cyPx : (Number.isFinite(cyFt) ? (LOT_Y + cyFt * FT_TO_UNIT) : NaN)));
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    const rotation = ((rot % 360) + 360) % 360;

    if (buildableAreaPolyScreen?.polys?.length) {
      let idx: number | null = null;
      for (let i = 0; i < buildableAreaPolyScreen.polys.length; i++) {
        const poly = buildableAreaPolyScreen.polys[i];
        if (pointInPolyWithHoles({ x: cx, y: cy }, { outer: poly.outer as any, holes: poly.holes as any })) {
          idx = i;
          break;
        }
      }
      if (idx === null) {
        let bestIdx = 0;
        let bestD2 = Infinity;
        for (let i = 0; i < buildableAreaPolyScreen.polys.length; i++) {
          const outer = buildableAreaPolyScreen.polys[i]?.outer ?? [];
          if (!outer.length) continue;
          let sx = 0, sy = 0;
          for (const p of outer) { sx += p.x; sy += p.y; }
          const c = { x: sx / outer.length, y: sy / outer.length };
          const d2 = (c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy);
          if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
        }
        idx = bestIdx;
      }
      setSelectedBuildablePolyIdx(idx);
    }

    pendingRestoreRef.current = { cx, cy, rotation };
  }, [placementStorageKey, endAddon, hasBalcony, selectedBuildablePolyIdx, LOT_X, LOT_Y, FT_TO_UNIT, lotPolyScreen, bboxMercator?.scale, bboxMercator?.offsetX, bboxMercator?.offsetY, buildableAreaPolyScreen]);

  // Step 3) 真正应用 restore（需要用当前的外挂/露台/选区约束来校验）：
  // - 先 checkValidity：如果已合法，直接 setAduState
  // - 如果不合法：尝试 resolveNearestValidPose 在“保存位置附近”找一个最近的合法姿态（避免直接回推荐位）
  // - 仍不合法：保持 pending，等待下一次约束变化（例如 buildableAreaPolyScreen ready）再试一次
  useEffect(() => {
    if (!placementKeyReady) return;
    const pending = pendingRestoreRef.current;
    if (!pending) return;
    if (!restoreConfigReadyRef.current) return;
    pendingRestoreRef.current = null;
    restoreAppliedKeyRef.current = placementStorageKey;
    restoreJustAppliedKeyRef.current = placementStorageKey;
    setAduState({ cx: pending.cx, cy: pending.cy, rotation: pending.rotation });
  }, [canFitAdu, buildableAreaPolyScreen, aduPlacementPolyScreen, lotPolyScreen, bboxMercator?.scale, bboxMercator?.offsetX, bboxMercator?.offsetY, endAddon, hasBalcony, selectedBuildablePolyIdx, placementStorageKey, LOT_X, LOT_Y, FT_TO_UNIT, COMBINED_W, COMBINED_H, ZONE_LEFT, ZONE_RIGHT, ZONE_TOP, ZONE_BOTTOM, HOUSE_X, HOUSE_Y, HOUSE_W, HOUSE_H, GARAGE_X, GARAGE_Y, GARAGE_W, GARAGE_H]);

  useEffect(() => {
    if (!placementKeyReady) return;
    if (!isHydratingPlacement) return;
    if (userTouchedPlacementRef.current) return;
    if (restoreJustAppliedKeyRef.current !== placementStorageKey) return;
    const deriveIdxForPoint = (cx: number, cy: number) => {
      if (!buildableAreaPolyScreen?.polys?.length) return null;
      for (let i = 0; i < buildableAreaPolyScreen.polys.length; i++) {
        const poly = buildableAreaPolyScreen.polys[i];
        if (pointInPolyWithHoles({ x: cx, y: cy }, { outer: poly.outer as any, holes: poly.holes as any })) return i;
      }
      let bestIdx = 0;
      let bestD2 = Infinity;
      for (let i = 0; i < buildableAreaPolyScreen.polys.length; i++) {
        const outer = buildableAreaPolyScreen.polys[i]?.outer ?? [];
        if (!outer.length) continue;
        let sx = 0, sy = 0;
        for (const p of outer) { sx += p.x; sy += p.y; }
        const c = { x: sx / outer.length, y: sy / outer.length };
        const d2 = (c.x - cx) * (c.x - cx) + (c.y - cy) * (c.y - cy);
        if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
      }
      return bestIdx;
    };
    const idx = deriveIdxForPoint(aduState.cx, aduState.cy);
    if (idx !== null && idx !== selectedBuildablePolyIdx) setSelectedBuildablePolyIdx(idx);
    restoreJustAppliedKeyRef.current = null;
    setIsHydratingPlacement(false);
  }, [placementKeyReady, placementStorageKey, isHydratingPlacement, endAddon, hasBalcony, selectedBuildablePolyIdx, canFitAdu, buildableAreaPolyScreen, aduPlacementPolyScreen, lotPolyScreen, bboxMercator?.scale, bboxMercator?.offsetX, bboxMercator?.offsetY, aduState, COMBINED_W, COMBINED_H, ZONE_LEFT, ZONE_RIGHT, ZONE_TOP, ZONE_BOTTOM, HOUSE_X, HOUSE_Y, HOUSE_W, HOUSE_H, GARAGE_X, GARAGE_Y, GARAGE_W, GARAGE_H]);

  // 后端推荐位（只有没有 saved placement 才会走这里）：
  // - 用 plan.suggestedAduPlacement 的 ft 坐标转成画布单位
  // - 如果推荐位不合法，会 fallback 到 resolveValidPlacement
  useEffect(() => {
    if (!placementKeyReady) return;
    try {
      const raw = localStorage.getItem(placementStorageKey);
      if (raw) return;
      const sp = (plan as any)?.suggestedAduPlacement;
      const cxFt = Number(sp?.cxFt);
      const cyFt = Number(sp?.cyFt);
      const rot = Number(sp?.rotationDeg);
      if (!Number.isFinite(cxFt) || !Number.isFinite(cyFt) || !Number.isFinite(rot)) return;

      const cx = LOT_X + cxFt * FT_TO_UNIT;
      const cy = LOT_Y + cyFt * FT_TO_UNIT;
      const rotation = ((rot % 360) + 360) % 360;
      if (checkValidity(cx, cy, rotation)) {
        setAduState({ cx, cy, rotation });
      } else {
        const fallback = resolveValidPlacement({ cx: ADU_CENTER_X, cy: ADU_CENTER_Y, rotation: defaultPreferredRotationDeg });
        if (fallback) setAduState(fallback);
      }
    } catch {
    }
  }, [placementStorageKey, plan, defaultPreferredRotationDeg, ADU_CENTER_X, ADU_CENTER_Y, LOT_X, LOT_Y, FT_TO_UNIT, COMBINED_W, COMBINED_H, ZONE_LEFT, ZONE_RIGHT, ZONE_TOP, ZONE_BOTTOM, HOUSE_X, HOUSE_Y, HOUSE_W, HOUSE_H, GARAGE_X, GARAGE_Y, GARAGE_W, GARAGE_H]);

  // Final guard（约束收敛器）：
  // - 任何会影响合法性的输入变化（可建区 polygon、外挂/露台、选区、房屋遮挡等）都会触发
  // - 如果当前 aduState 不合法，会把它“吸附”到一个合法位置
  // - 你看到的“进来先在地块外面，然后快速回到推荐位”通常就是：
  //   1) 初始 aduState 先渲染出来（此时 buildableAreaPolyScreen 还没 ready / 或 restore 尚未 apply）
  //   2) 下一帧/下一次 effect 里约束 ready，checkValidity 变严格，判 invalid
  //   3) 这个 guard 运行，把它推回合法位置（视觉上就是快速跳动）
  useEffect(() => {
    if (!placementKeyReady) return;
    if (isHydratingPlacement) return;
    if (
      !userTouchedPlacementRef.current
      && restoreAppliedKeyRef.current === placementStorageKey
    ) return;
    if (
      !userTouchedPlacementRef.current
      && restoreParsedRef.current?.key === placementStorageKey
      && restoreAppliedKeyRef.current !== placementStorageKey
    ) return;
    if (!canFitAdu) return;
    if (checkValidity(aduState.cx, aduState.cy, aduState.rotation)) return;
    if (selectedBuildablePolyIdx !== null && checkValidity(aduState.cx, aduState.cy, aduState.rotation, undefined, null)) {
      if (buildableAreaPolyScreen?.polys?.length) {
        let idx: number | null = null;
        for (let i = 0; i < buildableAreaPolyScreen.polys.length; i++) {
          const poly = buildableAreaPolyScreen.polys[i];
          if (pointInPolyWithHoles({ x: aduState.cx, y: aduState.cy }, { outer: poly.outer as any, holes: poly.holes as any })) { idx = i; break; }
        }
        if (idx === null) {
          let bestIdx = 0;
          let bestD2 = Infinity;
          for (let i = 0; i < buildableAreaPolyScreen.polys.length; i++) {
            const outer = buildableAreaPolyScreen.polys[i]?.outer ?? [];
            if (!outer.length) continue;
            let sx = 0, sy = 0;
            for (const p of outer) { sx += p.x; sy += p.y; }
            const c = { x: sx / outer.length, y: sy / outer.length };
            const d2 = (c.x - aduState.cx) * (c.x - aduState.cx) + (c.y - aduState.cy) * (c.y - aduState.cy);
            if (d2 < bestD2) { bestD2 = d2; bestIdx = i; }
          }
          idx = bestIdx;
        }
        if (idx !== null && idx !== selectedBuildablePolyIdx) setSelectedBuildablePolyIdx(idx);
      }
      return;
    }
    const snapped = resolveNearestValidPose(aduState.cx, aduState.cy, aduState.rotation, null);
    const fixed = snapped ?? resolveValidPlacement(aduState) ?? resolveValidPlacement();
    if (!fixed) return;
    if (Math.abs(fixed.cx - aduState.cx) < 1e-6 &&
        Math.abs(fixed.cy - aduState.cy) < 1e-6 &&
        Math.abs(fixed.rotation - aduState.rotation) < 1e-6) return;
    setAduState(fixed);
  }, [canFitAdu, aduState, endAddon, hasBalcony, COMBINED_W, COMBINED_H, selectedBuildablePolyIdx, ZONE_LEFT, ZONE_RIGHT, ZONE_TOP, ZONE_BOTTOM, HOUSE_X, HOUSE_Y, HOUSE_W, HOUSE_H, GARAGE_X, GARAGE_Y, GARAGE_W, GARAGE_H]);

  // Persist（写 localStorage，带防抖）：
  // - 这里的 setItem 是 160ms debounce：目的是拖拽/旋转时不要每一帧都写 localStorage
  // - 副作用：如果你“点外挂/露台后立刻跳页面”，可能还没来得及写入
  // - 下面还有一个 unmount flush：页面卸载/切地址时会把最后一次 payload 强制写入
  useEffect(() => {
    if (!placementKeyReady) return;
    const usingGeo = !!bboxMercator && (!!buildableAreaPolyScreen || !!aduPlacementPolyScreen);
    const rotNorm = ((aduState.rotation % 360) + 360) % 360;
    const rotRounded = Math.round(rotNorm * 1000) / 1000;
    const lotBounds = (() => {
      if (!usingGeo) return null;
      const polys = lotPolyScreen?.polys ?? null;
      if (!polys || polys.length === 0) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const poly of polys) {
        for (const p of poly.outer) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
      }
      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
      const w = maxX - minX;
      const h = maxY - minY;
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 1e-9 || h <= 1e-9) return null;
      return { minX, minY, w, h };
    })();
    const payload = {
      cxPx: aduState.cx,
      cyPx: aduState.cy,
      ...(usingGeo ? {
        cxM: (aduState.cx - bboxMercator.offsetX) / bboxMercator.scale,
        cyM: (aduState.cy - bboxMercator.offsetY) / bboxMercator.scale,
      } : {}),
      ...(lotBounds ? {
        cxRel: (aduState.cx - lotBounds.minX) / lotBounds.w,
        cyRel: (aduState.cy - lotBounds.minY) / lotBounds.h,
      } : {}),
      ...(usingGeo ? {} : {
        cxFt: (aduState.cx - LOT_X) * UNIT_TO_FT,
        cyFt: (aduState.cy - LOT_Y) * UNIT_TO_FT,
      }),
      rotationDeg: rotRounded,
      endAddon,
      hasBalcony,
      selectedBuildablePolyIdx,
      updatedAt: Date.now(),
    };
    const payloadStr = JSON.stringify(payload);
    placementSaveRef.current = { key: placementStorageKey, payload: payloadStr };
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(placementStorageKey, payloadStr);
      } catch {
        // ignore storage failures
      }
    }, 160);
    return () => window.clearTimeout(t);
  }, [placementKeyReady, placementIdentity, llUuidPlacementId, placementStorageKey, aduState, LOT_X, LOT_Y, UNIT_TO_FT, endAddon, hasBalcony, selectedBuildablePolyIdx, buildableAreaPolyScreen, aduPlacementPolyScreen, lotPolyScreen, bboxMercator?.scale, bboxMercator?.offsetX, bboxMercator?.offsetY]);

  useEffect(() => {
    return () => {
      try {
        if (!placementKeyReady) return;
        const cur = placementSaveRef.current;
        if (!cur || cur.key !== placementStorageKey) return;
        localStorage.setItem(cur.key, cur.payload);
      } catch {
      }
    };
  }, [placementKeyReady, placementIdentity, llUuidPlacementId, placementStorageKey]);

  useEffect(() => {
    if (!placementKeyReady) return;
    try {
      localStorage.removeItem('xhomes.aduPlacement:default');
    } catch {
    }
  }, [placementKeyReady]);

  const handleMouseDown = (e: React.MouseEvent, mode: 'move' | 'rotate') => {
    e.preventDefault();
    e.stopPropagation();
    userTouchedPlacementRef.current = true;
    
    const pt = clientToSvg(e.clientX, e.clientY);
    if (!pt) return;
    const localPt = screenToMapLocal(pt);

    setInteractionMode(mode);
    setDragStart(localPt);
    setInitialState(aduState);
    
    if (mode === 'move') {
        dragOffsetRef.current = { x: localPt.x - aduState.cx, y: localPt.y - aduState.cy };
        setRotateMenuOpen(false);
    } else {
        setRotateMenuOpen(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!interactionMode) return;
    
    const pt = clientToSvg(e.clientX, e.clientY);
    if (!pt) return;

    const localPt = screenToMapLocal(pt);
    const mouseX = localPt.x;
    const mouseY = localPt.y;

    if (interactionMode === 'move') {
        // Calculate potential new position
        let targetX = mouseX - dragOffsetRef.current.x;
        let targetY = mouseY - dragOffsetRef.current.y;

        const rot = aduState.rotation;
        if (buildableAreaPolyScreen) {
          const fixed = constrainMoveCenter(aduState.cx, aduState.cy, targetX, targetY, rot, selectedBuildablePolyIdx);
          if (fixed) {
            if (Math.abs(fixed.cx - targetX) > 1e-6 || Math.abs(fixed.cy - targetY) > 1e-6) {
              dragOffsetRef.current = { x: mouseX - fixed.cx, y: mouseY - fixed.cy };
            }
            setAduState(s => ({ ...s, cx: fixed.cx, cy: fixed.cy }));
          }
        } else {
          const corners = getCorners(targetX, targetY, MAIN_W, MAIN_H, rot);
          let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
          for (const p of corners) {
            minPx = Math.min(minPx, p.x);
            maxPx = Math.max(maxPx, p.x);
            minPy = Math.min(minPy, p.y);
            maxPy = Math.max(maxPy, p.y);
          }
          const envLeft = ZONE_LEFT + ZONE_VISUAL_INSET;
          const envRight = ZONE_RIGHT - ZONE_VISUAL_INSET;
          const envTop = ZONE_TOP + ZONE_VISUAL_INSET;
          const envBottom = ZONE_BOTTOM - ZONE_VISUAL_INSET;
          if (minPx < envLeft) targetX += (envLeft - minPx);
          if (maxPx > envRight) targetX -= (maxPx - envRight);
          if (minPy < envTop) targetY += (envTop - minPy);
          if (maxPy > envBottom) targetY -= (maxPy - envBottom);

          if (checkValidity(targetX, targetY, rot)) {
            setAduState(s => ({ ...s, cx: targetX, cy: targetY }));
          } else {
            if (checkValidity(targetX, aduState.cy, rot)) {
              setAduState(s => ({ ...s, cx: targetX }));
            } else if (checkValidity(aduState.cx, targetY, rot)) {
              setAduState(s => ({ ...s, cy: targetY }));
            }
          }
        }

    } else if (interactionMode === 'rotate') {
        // Calculate angle from center to mouse
        const dx = mouseX - aduState.cx;
        const dy = mouseY - aduState.cy;
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        
        // The handle starts at a specific offset. 
        // Usually rotation handles work better if we track delta, but absolute angle is fine if we consider offset.
        // Let's assume handle is at 0 deg relative to center?
        // Actually, the handle visually is at Top Right corner or similar.
        // Let's just track the raw angle and apply offset based on initial click or just use raw angle if handle is at 0.
        // Simplified: The handle is visually at one corner. Let's make the handle dragging feel natural.
        // Current handle is top-right? No, implementation details below.
        
        // Better Interaction: Dragging rotates the object such that the handle follows the mouse.
        // Angle = angle(mouse - center).
        // If handle is at, say, 45deg relative to center in local space, we subtract 45.
        // Let's assume the handle is visually placed and we just want to follow the mouse.
        
        // Snapping
        // Normalize angle to 0-360
        let newRot = angle + 90 + 45; // Offset to match corner visual
        // Actually, let's just use delta from start.
        
        // Simpler approach: Calculate angle of mouse relative to center.
        // Initial angle of mouse relative to center.
        // Delta angle.
        // Apply to initial rotation.
        
        const startDx = dragStart.x - initialState.cx;
        const startDy = dragStart.y - initialState.cy;
        const startAngle = Math.atan2(startDy, startDx) * (180 / Math.PI);
        
        const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        const delta = currentAngle - startAngle;
        
        let rawRot = initialState.rotation + delta;
        
        // Normalize
        rawRot = (rawRot % 360 + 360) % 360;
        
        // Check Validity (no snapping)
        if (checkValidity(aduState.cx, aduState.cy, rawRot, undefined, selectedBuildablePolyIdx)) {
            setAduState(s => ({ ...s, rotation: rawRot }));
        }
    }
  };

  const handleMouseUp = () => {
    setInteractionMode(null);
  };

  // Use global document listeners for reliable drag tracking
  useEffect(() => {
    if (!interactionMode) return;

    const onMouseMove = (e: MouseEvent) => {
      const pt = clientToSvg(e.clientX, e.clientY);
      if (!pt) return;
      const localPt = screenToMapLocal(pt);
      const mouseX = localPt.x;
      const mouseY = localPt.y;

      if (interactionMode === 'move') {
        let targetX = mouseX - dragOffsetRef.current.x;
        let targetY = mouseY - dragOffsetRef.current.y;

        const rot = aduState.rotation;
        if (buildableAreaPolyScreen) {
          const fixed = constrainMoveCenter(aduState.cx, aduState.cy, targetX, targetY, rot, selectedBuildablePolyIdx);
          if (fixed) {
            if (Math.abs(fixed.cx - targetX) > 1e-6 || Math.abs(fixed.cy - targetY) > 1e-6) {
              dragOffsetRef.current = { x: mouseX - fixed.cx, y: mouseY - fixed.cy };
            }
            setAduState(s => ({ ...s, cx: fixed.cx, cy: fixed.cy }));
          }
        } else {
          const corners = getCorners(targetX, targetY, MAIN_W, MAIN_H, rot);
          let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
          for (const p of corners) {
            minPx = Math.min(minPx, p.x);
            maxPx = Math.max(maxPx, p.x);
            minPy = Math.min(minPy, p.y);
            maxPy = Math.max(maxPy, p.y);
          }

          if (minPx < ZONE_LEFT) targetX += (ZONE_LEFT - minPx);
          if (maxPx > ZONE_RIGHT) targetX -= (maxPx - ZONE_RIGHT);
          if (minPy < ZONE_TOP) targetY += (ZONE_TOP - minPy);
          if (maxPy > ZONE_BOTTOM) targetY -= (maxPy - ZONE_BOTTOM);

          if (checkValidity(targetX, targetY, rot)) {
            setAduState(s => ({ ...s, cx: targetX, cy: targetY }));
          } else {
            if (checkValidity(targetX, aduState.cy, rot)) {
              setAduState(s => ({ ...s, cx: targetX }));
            } else if (checkValidity(aduState.cx, targetY, rot)) {
              setAduState(s => ({ ...s, cy: targetY }));
            }
          }
        }
      } else if (interactionMode === 'rotate') {
        const dx = mouseX - aduState.cx;
        const dy = mouseY - aduState.cy;

        const startDx = dragStart.x - initialState.cx;
        const startDy = dragStart.y - initialState.cy;
        const startAngle = Math.atan2(startDy, startDx) * (180 / Math.PI);
        const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        const delta = currentAngle - startAngle;

        let rawRot = initialState.rotation + delta;
        rawRot = (rawRot % 360 + 360) % 360;

        if (checkValidity(aduState.cx, aduState.cy, rawRot, undefined, selectedBuildablePolyIdx)) {
          setAduState(s => ({ ...s, rotation: rawRot }));
        }
      }
    };

    const onMouseUp = () => {
      setInteractionMode(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [interactionMode, dragStart, initialState, aduState, includeDeck, selectedBuildablePolyIdx, buildableAreaPolyScreen, aduPlacementPolyScreen]);

  // derived values for rendering
  const rotRad = (aduState.rotation * Math.PI) / 180;
  const aduScreen = mapLocalToScreen({ x: aduState.cx, y: aduState.cy });

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden font-sans">
        
        {/* === LEFT COLUMN: CANVAS === */}
        <div className={`flex-1 relative bg-slate-50 overflow-hidden flex flex-col ${variant === 'full' ? 'border-r border-slate-200' : ''}`}>
            
            {/* Top Toolbar */}
            {showViewToggle && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                  <ViewToggle mode={viewMode} setMode={setViewMode} />
              </div>
            )}

            {/* Main Canvas Area */}
            <div 
                className="flex-1 relative w-full h-full select-none"
                ref={canvasHostRef}
            >
                {(!placementKeyReady || isHydratingPlacement) && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                    <div className="flex items-center gap-3 rounded-xl bg-white/90 border border-slate-200 px-4 py-3 shadow-sm">
                      <div className="w-4 h-4 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
                      <div className="text-sm font-semibold text-slate-700">
                        {!placementKeyReady ? (isZh ? '正在加载地块数据…' : 'Loading parcel...') : (isZh ? '正在加载已保存的摆放…' : 'Restoring saved placement...')}
                      </div>
                    </div>
                  </div>
                )}
                {viewMode === '2d' ? (
                    <div className="w-full h-full relative bg-[#f1f5f8] overflow-hidden">
                        <div className="absolute top-4 right-4 z-30 select-none">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 rounded-full border border-slate-400 bg-white/90 backdrop-blur-sm flex items-center justify-center">
                                    <svg
                                        width="34"
                                        height="34"
                                        viewBox="0 0 34 34"
                                        style={{ transform: `rotate(${rotationDeg}deg)`, transformOrigin: '50% 50%' }}
                                    >
                                        <text x="17" y="8" textAnchor="middle" fontSize="10" fontWeight="700" fill="#334155">N</text>
                                        <line x1="17" y1="17" x2="17" y2="11" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                                        <circle cx="17" cy="17" r="2.5" fill="#0f172a" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                         {/* SVG Map Layer */}
                         <svg 
                            className="absolute inset-0 w-full h-full" 
                            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} 
                            preserveAspectRatio="xMidYMid meet"
                            ref={svgRef}
                         >
                            {/* --- CONTEXT BACKGROUND --- */}                            
                            {/* Street (Top) */}
                            <text x={CANVAS_W/2} y={LOT_Y - 15} textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="400" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.15em">{streetName || (isZh ? '街道' : 'Street')}</text>

                            {/* --- SUBJECT LOT --- */}
                            {/* --- CONTEXT STRUCTURES (OUTSIDE PARCEL) --- */}
                            {structurePaths.filter((s: any) => !s.role).map((s: any) => (
                                <g key={s.key}>
                                    {s.kind === 'path' ? (
                                        <path d={s.d} fill={s.fill} stroke={s.stroke} strokeWidth="1" opacity={s.opacity} />
                                    ) : (
                                        <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} stroke={s.stroke} strokeWidth="1" opacity={s.opacity} />
                                    )}
                                </g>
                            ))}
                            <g clipPath="url(#site-map-clip)">
                                <g transform={mapGroupTransform}>
                                    {/* Nearby parcels (GeoJSON Polygon) */}
                                    {nearbyParcelPaths.map((p) => (
                                        <path key={p.key} d={p.d} fill="none" stroke="#e2e8f0" strokeWidth="2" opacity="0.85" />
                                    ))}

                                    {/* Roads (GeoJSON LineString) */}
                                    {roadPaths.filter((r) => !r.isTarget).map((r) => (
                                        <path key={r.key} d={r.d} fill="none" stroke="#CBD5E1" strokeWidth="3" opacity="0.55" />
                                    ))}
                                    {roadPaths.filter((r) => r.isTarget).map((r) => (
                                        <path key={r.key} d={r.d} fill="none" stroke="#155dfc" strokeWidth="6" opacity="0.9" />
                                    ))}

                                    {/* Lot border */}
                                    {lotPolygonD ? (
                                        <path d={lotPolygonD} fill="white" stroke="#010101" strokeWidth="3" />
                                    ) : (
                                        <rect 
                                            x={LOT_X} 
                                            y={LOT_Y} 
                                            width={LOT_W} 
                                            height={LOT_H} 
                                            fill="white" 
                                            stroke="#010101" 
                                            strokeWidth="3" 
                                        />
                                    )}

                                    {/* Cutouts (debug overlays) */}
                                    {showCutouts && (
                                      <>
                                        {cutoutOverlays.map((c) => (
                                            <path
                                                key={`${c.key}-shape`}
                                                d={c.d}
                                                fill="#f97316"
                                                fillOpacity="0.14"
                                                stroke="#f97316"
                                                strokeWidth="1.5"
                                                opacity="0.9"
                                                fillRule="evenodd"
                                            />
                                        ))}
                                        {cutoutOverlays.map((c) => (
                                            <text
                                                key={`${c.key}-label`}
                                                x={c.centroid.x}
                                                y={c.centroid.y}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                fill="#9a3412"
                                                fontSize="10"
                                                fontWeight="600"
                                                fontFamily="Inter, system-ui, sans-serif"
                                                opacity="0.95"
                                                transform={`rotate(${-rotationDeg} ${c.centroid.x} ${c.centroid.y})`}
                                            >
                                                {c.text}
                                            </text>
                                        ))}
                                      </>
                                    )}

                                    {/* Buildable area (GeoJSON Polygon/MultiPolygon with holes) */}
                                    {buildableAreaParts.length > 0 ? (
                                        <>
                                            {buildableAreaParts.map((p) => {
                                                const selected = selectedBuildablePolyIdx === p.idx;
                                                return (
                                                    <path
                                                        key={`buildable-${p.idx}`}
                                                        d={p.d}
                                                        fill="#155dfc"
                                                        fillOpacity={selected ? 0.12 : 0.08}
                                                        stroke="#155dfc"
                                                        strokeWidth={selected ? 3 : 2}
                                                        strokeDasharray="8 5"
                                                        fillRule="evenodd"
                                                        style={{ cursor: canFitAdu ? 'pointer' : 'default' }}
                                                        onMouseDown={(e) => handleSelectBuildablePoly(e, p.idx)}
                                                    />
                                                );
                                            })}
                                            {buildableEdgeLabels.map((l) => (
                                                <g
                                                    key={l.key}
                                                    transform={`translate(${l.x} ${l.y}) rotate(${-rotationDeg})`}
                                                    className="pointer-events-none"
                                                >
                                                    <rect x={-l.w / 2} y={-8} width={l.w} height={16} rx="4" fill="#3B82F6" />
                                                    <text x="0" y="0" dominantBaseline="middle" textAnchor="middle" className="text-[8px] font-bold fill-white">{l.text}</text>
                                                </g>
                                            ))}
                                        </>
                                    ) : buildableAreaD ? (
                                        <path
                                            d={buildableAreaD}
                                            fill="#155dfc"
                                            fillOpacity="0.08"
                                            stroke="#155dfc"
                                            strokeWidth="2"
                                            strokeDasharray="8 5"
                                            fillRule="evenodd"
                                        />
                                    ) : null}

                                    {/* Buildings (GeoJSON Polygon) */}
                                    {buildingPaths.map((b) => {
                                        const isSubject = b.kind === 'subject';
                                        const isMainSubject = !!mainSubjectBuildingKey && b.key === mainSubjectBuildingKey;
                                        const fill = isSubject ? '#CBD5E1' : '#EDF1F6';
                                        const stroke = isSubject ? '#94a3b8' : '#cbd5e1';
                                        const opacity = isSubject ? 1 : 0.55;
                                        return (
                                          <path
                                            key={b.key}
                                            d={b.d}
                                            fill={fill}
                                            stroke={stroke}
                                            strokeWidth="1"
                                            opacity={opacity}
                                            style={isMainSubject ? { cursor: 'pointer' } : undefined}
                                            onDoubleClick={isMainSubject ? handleToggleCutoutsFromHouse : undefined}
                                          />
                                        );
                                    })}

                                    {subjectBuildingLabels.map((t) => (
                                        <text
                                            key={t.key}
                                            x={t.x}
                                            y={t.y}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill={t.kind === 'main' ? '#64748b' : '#94a3b8'}
                                            fontSize={t.kind === 'main' ? '12' : '11'}
                                            fontWeight={t.kind === 'main' ? '600' : '500'}
                                            fontFamily="Inter, system-ui, sans-serif"
                                            transform={`rotate(${-rotationDeg} ${t.x} ${t.y})`}
                                            onDoubleClick={t.kind === 'main' ? handleToggleCutoutsFromHouse : undefined}
                                        >
                                            {t.text}
                                        </text>
                                    ))}

                                    {placementKeyReady && !isHydratingPlacement && canFitAdu && selectedCanFit && (
                                      <g
                                        transform={`translate(${aduState.cx}, ${aduState.cy}) rotate(${aduState.rotation})`}
                                        className={`${interactionMode === 'move' ? 'cursor-grabbing' : 'cursor-grab'} transition-opacity`}
                                        onMouseEnter={() => setHoverADU(true)}
                                        onMouseLeave={() => setHoverADU(false)}
                                        onMouseDown={(e) => handleMouseDown(e, 'move')}
                                        onContextMenu={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          openRotateMenuAt(e.clientX, e.clientY);
                                        }}
                                      >
                                        {(() => {
                                          const bodyRects: Array<{ key: string; localCx: number; localCy: number; w: number; h: number; opacity?: number }> = [
                                            { key: 'base', localCx: 0, localCy: 0, w: MAIN_W, h: MAIN_H }
                                          ];
                                          if (endRightOn) bodyRects.push({ key: 'end-right', localCx: 0, localCy: -(MAIN_H / 2 + ADDON_PX / 2), w: MAIN_W, h: ADDON_PX, opacity: 0.85 });
                                          if (endLeftOn) bodyRects.push({ key: 'end-left', localCx: 0, localCy: MAIN_H / 2 + ADDON_PX / 2, w: MAIN_W, h: ADDON_PX, opacity: 0.85 });
                                          const rects = hasBalcony
                                            ? [...bodyRects, { key: 'balcony', localCx: -(MAIN_W / 2 + ADDON_PX / 2), localCy: 0, w: ADDON_PX, h: MAIN_H, opacity: 0.75 }]
                                            : bodyRects;
                                          const rectBounds = (() => {
                                            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                                            for (const r of bodyRects) {
                                              minX = Math.min(minX, r.localCx - r.w / 2);
                                              maxX = Math.max(maxX, r.localCx + r.w / 2);
                                              minY = Math.min(minY, r.localCy - r.h / 2);
                                              maxY = Math.max(maxY, r.localCy + r.h / 2);
                                            }
                                            if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
                                              return { minX: -MAIN_W / 2, maxX: MAIN_W / 2, minY: -MAIN_H / 2, maxY: MAIN_H / 2 };
                                            }
                                            return { minX, maxX, minY, maxY };
                                          })();
                                          const doorMarkLen = 4.429133858 * FT_TO_UNIT;
                                          const doorSide = -1;
                                          const doorX = doorSide * (MAIN_W / 2);
                                          const doorY1 = -doorMarkLen / 2;
                                          const doorY2 = doorMarkLen / 2;
                                          const sqftText = `${projectedSqft} sqft`;
                                          return (
                                            <g>
                                              {rects.map(r => (
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
                                              ))}

                                              <line x1={doorX} y1={doorY1} x2={doorX} y2={doorY2} stroke="#22C55E" strokeWidth="3" strokeLinecap="round" />

                                              <g
                                                transform={`rotate(${-(rotationDeg + aduState.rotation)} ${0} 4)`}
                                                className="pointer-events-none"
                                              >
                                                <text x={0} y={-12} textAnchor="middle" className="text-[11px] font-bold fill-white">{isZh ? '拟建' : 'Proposed'}</text>
                                                <text x={0} y={4} textAnchor="middle" className="text-[11px] font-bold fill-white">ADU</text>
                                                <text x={0} y={20} textAnchor="middle" className="text-[10px] font-medium fill-white/90">{isZh ? `${projectedSqft} 平方英尺` : sqftText}</text>
                                              </g>

                                              {(hoverADU || interactionMode === 'rotate') && (
                                                <>
                                                  {[
                                                    [rectBounds.maxX + 5, rectBounds.minY - 5],
                                                    [rectBounds.minX - 5, rectBounds.minY - 5],
                                                    [rectBounds.maxX + 5, rectBounds.maxY + 5],
                                                    [rectBounds.minX - 5, rectBounds.maxY + 5],
                                                  ].map(([hx, hy], idx) => (
                                                    <g
                                                      key={idx}
                                                      className="cursor-alias"
                                                      onMouseDown={(e) => handleMouseDown(e, 'rotate')}
                                                      transform={`translate(${hx}, ${hy})`}
                                                    >
                                                      <circle r="16" fill="transparent" />
                                                    </g>
                                                  ))}
                                                </>
                                              )}
                                            </g>
                                          );
                                        })()}
                                      </g>
                                    )}

                                    <g className="pointer-events-none">
                                      {measureLines.length > 0 ? (
                                        <>
                                          {measureLines.map((ml: any, idx: number) => {
                                            const distFt = Number(ml?.distanceFt);
                                            if (!Number.isFinite(distFt)) return null;
                                            const axPx = Number(ml?.a?.x);
                                            const ayPx = Number(ml?.a?.y);
                                            const bxPx = Number(ml?.b?.x);
                                            const byPx = Number(ml?.b?.y);
                                            const axFt = Number(ml?.a?.xFt);
                                            const ayFt = Number(ml?.a?.yFt);
                                            const bxFt = Number(ml?.b?.xFt);
                                            const byFt = Number(ml?.b?.yFt);

                                            const hasPx = Number.isFinite(axPx) && Number.isFinite(ayPx) && Number.isFinite(bxPx) && Number.isFinite(byPx);
                                            const hasFt = Number.isFinite(axFt) && Number.isFinite(ayFt) && Number.isFinite(bxFt) && Number.isFinite(byFt);
                                            if (!hasPx && !hasFt) return null;

                                            const ax = hasPx ? axPx : (LOT_X + axFt * FT_TO_UNIT);
                                            const ay = hasPx ? ayPx : (LOT_Y + ayFt * FT_TO_UNIT);
                                            const bx = hasPx ? bxPx : (LOT_X + bxFt * FT_TO_UNIT);
                                            const by = hasPx ? byPx : (LOT_Y + byFt * FT_TO_UNIT);
                                            const mx = (ax + bx) / 2;
                                            const my = (ay + by) / 2;

                                            const vx = bx - ax;
                                            const vy = by - ay;
                                            const vLen = Math.hypot(vx, vy) + 1e-9;
                                            const nx = -vy / vLen;
                                            const ny = vx / vLen;
                                            const labelX = mx + nx * 7;
                                            const labelY = my + ny * 7;

                                            const t =
                                              Number.isFinite(rotationDeg) && Math.abs(rotationDeg) > 1e-9
                                                ? `rotate(${-rotationDeg} ${labelX} ${labelY})`
                                                : undefined;

                                            return (
                                              <g key={`${ml?.kind ?? 'ml'}-${idx}`}>
                                                <circle cx={ax} cy={ay} r="2" fill="#94a3b8" />
                                                <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 2" />
                                                <circle cx={bx} cy={by} r="2" fill="#94a3b8" />
                                                <text
                                                  x={labelX}
                                                  y={labelY}
                                                  textAnchor="middle"
                                                  dominantBaseline="middle"
                                                  fill="#64748b"
                                                  fontSize="8"
                                                  fontWeight="500"
                                                  fontFamily="Inter, system-ui, sans-serif"
                                                  transform={t}
                                                >
                                                  {formatFt(distFt * FT_TO_UNIT)}
                                                </text>
                                              </g>
                                            );
                                          })}
                                        </>
                                      ) : null}
                                    </g>
                                </g>
                            </g>

                            {/* --- EXISTING STRUCTURES --- */}
                            {structurePaths.filter((s: any) => !!s.role).map((s: any) => (
                                <g key={s.key}>
                                    {s.kind === 'path' ? (
                                        <path d={s.d} fill={s.fill} stroke={s.stroke} strokeWidth="1" opacity={s.opacity} />
                                    ) : (
                                        <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={s.fill} stroke={s.stroke} strokeWidth="1" opacity={s.opacity} />
                                    )}
                                </g>
                            ))}

                            {hasHouse && (
                                <text x={HOUSE_X + HOUSE_W/2} y={HOUSE_Y + HOUSE_H/2} textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize="11" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" className="pointer-events-none">{isZh ? '现有住宅' : 'Existing House'}</text>
                            )}
                            {hasGarage && (
                                <text x={GARAGE_X + GARAGE_W/2} y={GARAGE_Y + GARAGE_H/2} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="10" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" className="pointer-events-none">{isZh ? '车库' : 'Garage'}</text>
                            )}

                            {/* --- BUILDABLE ZONE (Blue Dashed Box) --- */}
                            {!buildableAreaD && canFitAdu ? (
                                <rect 
                                    x={ZONE_LEFT} 
                                    y={ZONE_TOP} 
                                    width={ZONE_W} 
                                    height={ZONE_H} 
                                    fill="none" 
                                    stroke="#155dfc" 
                                    strokeWidth="2" 
                                    strokeDasharray="8 5"
                                />
                            ) : null}
                            
                            {!canFitAdu && (
                              <foreignObject x={ZONE_LEFT} y={Math.max(LOT_Y + 24, ZONE_TOP + 12)} width={Math.max(260, Math.min(ZONE_W, 480))} height="74">
                                <div className="bg-slate-900/90 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 shadow-lg">
                                  <div>{isZh ? '当前地块可建区域无法放入所选标准户型。' : 'No feasible ADU placement in the buildable envelope for this lot.'}</div>
                                  <div className="mt-1 text-[11px] font-medium text-white/80">
                                    {(isZh ? '标准户型：' : 'Module: ') + `${selectedModule.wFt}×${selectedModule.hFt}ft`}
                                  </div>
                                </div>
                              </foreignObject>
                            )}

                            {/* --- ANGLE TOOLTIP (While Rotating) --- */}
                            {interactionMode === 'rotate' && (
                                <foreignObject 
                                    x={aduScreen.x + 40} 
                                    y={aduScreen.y - 40} 
                                    width="80" 
                                    height="40"
                                >
                                    <div className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded shadow-lg text-center w-fit">
                                        {Math.round(aduState.rotation)}°
                                    </div>
                                </foreignObject>
                            )}

                            {!buildableAreaPolyScreen && ZONE_W > 1 && ZONE_H > 1 && (
                              <>
                                <g transform={`translate(${ZONE_LEFT + ZONE_W/2}, ${ZONE_BOTTOM + 14})`}>
                                    <rect x="-18" y="-8" width="36" height="16" rx="4" fill="#3B82F6" />
                                    <text x="0" y="0" dominantBaseline="middle" textAnchor="middle" className="text-[7px] font-bold fill-white">{ZONE_W_DISPLAY}</text>
                                </g>

                                <g transform={`translate(${ZONE_LEFT + ZONE_W/2}, ${ZONE_TOP - 14})`}>
                                    <rect x="-18" y="-8" width="36" height="16" rx="4" fill="#3B82F6" />
                                    <text x="0" y="0" dominantBaseline="middle" textAnchor="middle" className="text-[7px] font-bold fill-white">{ZONE_W_DISPLAY}</text>
                                </g>
                                
                                <g transform={`translate(${ZONE_RIGHT + 14}, ${ZONE_TOP + ZONE_H/2})`}>
                                    <g transform="rotate(-90)">
                                        <rect x="-18" y="-8" width="36" height="16" rx="4" fill="#3B82F6" />
                                        <text x="0" y="0" dominantBaseline="middle" textAnchor="middle" className="text-[7px] font-bold fill-white">{ZONE_H_DISPLAY}</text>
                                    </g>
                                </g>

                                <g transform={`translate(${ZONE_LEFT - 14}, ${ZONE_TOP + ZONE_H/2})`}>
                                    <g transform="rotate(-90)">
                                        <rect x="-18" y="-8" width="36" height="16" rx="4" fill="#3B82F6" />
                                        <text x="0" y="0" dominantBaseline="middle" textAnchor="middle" className="text-[7px] font-bold fill-white">{ZONE_H_DISPLAY}</text>
                                    </g>
                                </g>
                              </>
                            )}

                         </svg>

                         {rotateMenuOpen && canFitAdu && (
                            <div
                                className="absolute inset-0 z-50"
                                onMouseDown={() => setRotateMenuOpen(false)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setRotateMenuOpen(false);
                                }}
                            >
                                <div
                                    className="absolute bg-white rounded-lg border border-slate-200 shadow-lg p-2 text-xs w-[150px]"
                                    style={{ left: rotateMenuPos.x, top: rotateMenuPos.y }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setRotateMenuOpen(false);
                                    }}
                                >
                                    {[90, 180, 270].map((deg) => {
                                        const nextRot = ((aduState.rotation + deg) % 360 + 360) % 360;
                                        const ok = checkValidity(aduState.cx, aduState.cy, nextRot);
                                        return (
                                            <button
                                                key={deg}
                                                className={`w-full text-left px-2 py-1.5 rounded ${ok ? 'hover:bg-slate-100 text-slate-900' : 'text-slate-400 cursor-not-allowed'}`}
                                                onClick={() => {
                                                    if (!ok) return;
                                                    setAduState(s => ({ ...s, rotation: ((s.rotation + deg) % 360 + 360) % 360 }));
                                                    setRotateMenuOpen(false);
                                                }}
                                                disabled={!ok}
                                            >
                                                {isZh ? `旋转 ${deg}°` : `Rotate ${deg}°`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                         )}

                         {/* Scale Legend */}
                         <div className="absolute bottom-6 right-6 bg-white px-3 py-1 rounded shadow-sm border border-slate-200 text-[10px] font-bold text-slate-500">
                             {isZh ? `比例：自适应（非实尺）` : `Scale: fit-to-view`}
                         </div>

                         {/* Map Legend */}
                         <div className="absolute bottom-6 left-6 bg-white/95 p-4 rounded-xl shadow-lg border border-slate-200 z-10">
                             <div className="flex flex-col gap-2.5">
                                 {canFitAdu ? (
                                   <div className="flex items-center gap-3">
                                       <div className="w-4 h-4 rounded-md bg-blue-500"></div>
                                       <span className="text-xs font-medium text-slate-600">{isZh ? '拟建 ADU' : 'Proposed ADU'}</span>
                                   </div>
                                 ) : (
                                   <div className="flex items-center gap-3">
                                       <div className="w-4 h-4 rounded-md bg-slate-300"></div>
                                       <span className="text-xs font-medium text-slate-600">{isZh ? '不可建设 ADU' : 'ADU not feasible'}</span>
                                   </div>
                                 )}
                                 {(buildableAreaParts.length > 0 || !!buildableAreaD || (canFitAdu && !buildableAreaD && ZONE_W > 1 && ZONE_H > 1)) && (
                                   <div className="flex items-center gap-3">
                                       <div className="w-4 h-4 rounded-md border-2 border-[#155dfc] border-dashed bg-white"></div>
                                       <span className="text-xs font-medium text-slate-600">{isZh ? '可建区域' : 'Buildable Zone'}</span>
                                   </div>
                                 )}
                                 <div className="flex items-center gap-3">
                                     <div className="w-4 h-4 rounded-md bg-[#CBD5E1]"></div>
                                     <span className="text-xs font-medium text-slate-600">{isZh ? `现有建筑（${structuresCount}）` : `Existing Structures (${structuresCount})`}</span>
                                 </div>
                             </div>
                         </div>
                    </div>
                ) : (
                    // 3D MASSING VIEW — Apple-style clean axonometric
                    <div className="w-full h-full bg-[#fafbfc] flex items-center justify-center relative">
                        <svg
                            className="absolute inset-0 w-full h-full"
                            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                            preserveAspectRatio="xMidYMid meet"
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              e.preventDefault();
                              orbit3dStartRef.current = { x: e.clientX, y: e.clientY, yaw: orbitYawDeg, pitch: orbitPitchDeg };
                              setOrbiting3d(true);
                            }}
                            onWheel={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const factor = Math.exp(-e.deltaY * 0.0012);
                              setIsoZoom((z) => {
                                const next = Math.max(0.6, Math.min(2.2, z * factor));
                                return Math.abs(next - z) < 1e-4 ? z : next;
                              });
                            }}
                            style={{ cursor: orbiting3d ? 'grabbing' : 'grab' }}
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

                                {/* ═══ SUBJECT LOT ═══ */}
                                {(() => {
                                    if (isoLotPolygons.length > 0) {
                                      return (
                                        <g>
                                          {isoNearbyParcelPolygons.map(p => (
                                            <polygon key={p.key} points={p.points} fill="#f4f5f7" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.9" />
                                          ))}
                                          {isoLotPolygons.map(p => (
                                            <polygon key={p.key} points={p.points} fill="#ffffff" stroke="#d1d5db" strokeWidth="0.8" />
                                          ))}
                                        </g>
                                      );
                                    }
                                    if (plan?.lot?.polygon) {
                                      const poly = plan.lot.polygon;
                                      if (Array.isArray(poly) && poly.length >= 3) {
                                        const pts = poly
                                          .map((p: any): [number, number] => [Number(p?.xFt), Number(p?.yFt)])
                                          .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
                                        if (pts.length >= 3) {
                                          const p = pts.map(([xFt, yFt]) => toIsoView(xFt * FT_TO_UNIT, yFt * FT_TO_UNIT, 0));
                                          return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#ffffff" stroke="#d1d5db" strokeWidth="0.8" />;
                                        }
                                      }
                                    }
                                    const p = [toIsoView(0, 0, 0), toIsoView(LOT_W, 0, 0), toIsoView(LOT_W, LOT_H, 0), toIsoView(0, LOT_H, 0)];
                                    return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#ffffff" stroke="#d1d5db" strokeWidth="0.8" />;
                                })()}

                                {/* ═══ SETBACK BOUNDARY ═══ */}
                                {(() => {
                                    if (isoBuildableOuters.length === 0) return null;
                                    return (
                                      <g>
                                        {isoBuildableOuters.map(p => (
                                          <polygon key={p.key} points={p.points} fill="none" stroke="#155dfc" strokeWidth="0.8" strokeDasharray="8 5" opacity="0.38" />
                                        ))}
                                      </g>
                                    );
                                })()}

                                {(() => {
                                  if (isoBuildingFaces.length === 0) return null;
                                  if (!aduPivotLocal3d) return (
                                    <g>
                                      {isoBuildingFaces.map((f: any) => (
                                        <polygon
                                          key={f.key}
                                          points={f.points}
                                          fill={
                                            String(f.key).startsWith('nearby-bldg')
                                              ? (f.fill === '#e5e7eb'
                                                ? 'url(#nearbyBldgTop)'
                                                : (f.fill === '#d1d5db' ? 'url(#nearbyBldgFront)' : 'url(#nearbyBldgBack)'))
                                              : f.fill
                                          }
                                          stroke={f.stroke}
                                          strokeWidth={f.strokeWidth}
                                          opacity={String(f.key).startsWith('nearby-bldg') ? 1 : f.opacity}
                                          strokeOpacity={String(f.key).startsWith('nearby-bldg') ? 0.35 : 1}
                                          mask={String(f.key).startsWith('subject-bldg') ? 'url(#fadeUpMask)' : undefined}
                                          strokeLinejoin="round"
                                        />
                                      ))}
                                    </g>
                                  );
                                  const rp = rotateLocalAroundAdu3d(aduPivotLocal3d.x, aduPivotLocal3d.y, orbitYawDeg);
                                  const pivotDepth = (rp.x + rp.y) + 30;
                                  const behind = isoBuildingFaces.filter((f: any) => f.depth <= pivotDepth);
                                  if (behind.length === 0) return null;
                                  return (
                                    <g>
                                      {behind.map((f: any) => (
                                        <polygon
                                          key={f.key}
                                          points={f.points}
                                          fill={
                                            String(f.key).startsWith('nearby-bldg')
                                              ? (f.fill === '#e5e7eb'
                                                ? 'url(#nearbyBldgTop)'
                                                : (f.fill === '#d1d5db' ? 'url(#nearbyBldgFront)' : 'url(#nearbyBldgBack)'))
                                              : f.fill
                                          }
                                          stroke={f.stroke}
                                          strokeWidth={f.strokeWidth}
                                          opacity={String(f.key).startsWith('nearby-bldg') ? 1 : f.opacity}
                                          strokeOpacity={String(f.key).startsWith('nearby-bldg') ? 0.35 : 1}
                                          mask={String(f.key).startsWith('subject-bldg') ? 'url(#fadeUpMask)' : undefined}
                                          strokeLinejoin="round"
                                        />
                                      ))}
                                    </g>
                                  );
                                })()}

                                {/* ═══ GROUND SHADOWS ═══ */}
                                {(() => {
                                    const hx = HOUSE_X - LOT_X, hy = HOUSE_Y - LOT_Y;
                                    const p = [toIsoView(hx + 10, hy + 10, 0), toIsoView(hx + HOUSE_W + 10, hy + 10, 0), toIsoView(hx + HOUSE_W + 10, hy + HOUSE_H + 10, 0), toIsoView(hx + 10, hy + HOUSE_H + 10, 0)];
                                    return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#94a3b8" opacity="0.08" filter="url(#softShadow)" />;
                                })()}
                                {placementKeyReady && !isHydratingPlacement && (() => {
                                    const rad = aduState.rotation * Math.PI / 180;
                                    const cos = Math.cos(rad);
                                    const sin = Math.sin(rad);

                                    const drawShadow = (localCx: number, localCy: number, w: number, h: number) => {
                                        if (!isoLotFrame) return null;
                                        const centerMapLocal = {
                                          x: aduState.cx + (localCx * cos - localCy * sin),
                                          y: aduState.cy + (localCx * sin + localCy * cos)
                                        };
                                        const cornersMapLocal = getCorners(centerMapLocal.x, centerMapLocal.y, w, h, aduState.rotation);
                                        const cornersScreen = cornersMapLocal.map(rotateCanvasPoint3d);
                                        const cornersLocal = cornersScreen.map(p => isoLotFrame.toLocal(p));
                                        const p = cornersLocal.map(pt => toIsoView(pt.x + 6, pt.y + 6, 0));
                                        return <polygon key={`${localCx}-${localCy}`} points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#3b82f6" opacity="0.08" filter="url(#softShadowSm)" />;
                                    };

                                    const rects: Array<{ key: string; localCx: number; localCy: number; w: number; h: number }> = [
                                      { key: 'base', localCx: 0, localCy: 0, w: MAIN_W, h: MAIN_H }
                                    ];
                                    if (endRightOn) rects.push({ key: 'end-right', localCx: 0, localCy: -(MAIN_H / 2 + ADDON_PX / 2), w: MAIN_W, h: ADDON_PX });
                                    if (endLeftOn) rects.push({ key: 'end-left', localCx: 0, localCy: MAIN_H / 2 + ADDON_PX / 2, w: MAIN_W, h: ADDON_PX });
                                    if (hasBalcony) {
                                      rects.push({ key: 'balcony', localCx: -(MAIN_W / 2 + ADDON_PX / 2), localCy: 0, w: ADDON_PX, h: MAIN_H });
                                    }

                                    return (
                                        <g>
                                            {rects.map(r => drawShadow(r.localCx, r.localCy, r.w, r.h))}
                                        </g>
                                    );
                                })()}
                                {hasGarage && (() => {
                                    const gx = GARAGE_X - LOT_X, gy = GARAGE_Y - LOT_Y;
                                    const p = [toIsoView(gx + 6, gy + 6, 0), toIsoView(gx + GARAGE_W + 6, gy + 6, 0), toIsoView(gx + GARAGE_W + 6, gy + GARAGE_H + 6, 0), toIsoView(gx + 6, gy + GARAGE_H + 6, 0)];
                                    return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#94a3b8" opacity="0.06" filter="url(#softShadowSm)" />;
                                })()}

                                {/* ═══ EXISTING HOUSE — fully closed solid ═══ */}
                                {hasHouse && (() => {
                                    const ht = 24 * FT_TO_UNIT * (isoLotFrame?.scale ?? 1), hx = HOUSE_X - LOT_X, hy = HOUSE_Y - LOT_Y;
                                    const c = [
                                        toIsoView(hx, hy, 0), toIsoView(hx + HOUSE_W, hy, 0),
                                        toIsoView(hx + HOUSE_W, hy + HOUSE_H, 0), toIsoView(hx, hy + HOUSE_H, 0),
                                        toIsoView(hx, hy, ht), toIsoView(hx + HOUSE_W, hy, ht),
                                        toIsoView(hx + HOUSE_W, hy + HOUSE_H, ht), toIsoView(hx, hy + HOUSE_H, ht),
                                    ];
                                    const pts = (idxs: number[]) => idxs.map(j => `${c[j].x},${c[j].y}`).join(' ');
                                    return (
                                        <g>
                                            <g mask="url(#fadeUpMask)">
                                              <polygon points={pts([2, 3, 7, 6])} fill="#8b95a5" stroke="#7a8698" strokeWidth="0.6" strokeLinejoin="round" />
                                              <polygon points={pts([1, 2, 6, 5])} fill="#8b95a5" stroke="#7a8698" strokeWidth="0.6" strokeLinejoin="round" />
                                              <polygon points={pts([0, 3, 7, 4])} fill="#9aa4b4" stroke="#7a8698" strokeWidth="0.8" strokeLinejoin="round" />
                                              <polygon points={pts([0, 1, 5, 4])} fill="#adb5c4" stroke="#7a8698" strokeWidth="0.8" strokeLinejoin="round" />
                                              <polygon points={pts([4, 5, 6, 7])} fill="#c8ced8" stroke="#9aa4b4" strokeWidth="0.8" strokeLinejoin="round" />
                                            </g>
                                            <text x={(c[4].x + c[6].x) / 2} y={(c[4].y + c[6].y) / 2} textAnchor="middle" dominantBaseline="middle" fill="#5a6577" fontSize="10" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif">{isZh ? '现有住宅' : 'Existing House'}</text>
                                        </g>
                                    );
                                })()}

                                {/* ═══ GARAGE — fully closed solid ═══ */}
                                {hasGarage && (() => {
                                    const ht = 11 * FT_TO_UNIT * (isoLotFrame?.scale ?? 1), gx = GARAGE_X - LOT_X, gy = GARAGE_Y - LOT_Y;
                                    const c = [
                                        toIsoView(gx, gy, 0), toIsoView(gx + GARAGE_W, gy, 0),
                                        toIsoView(gx + GARAGE_W, gy + GARAGE_H, 0), toIsoView(gx, gy + GARAGE_H, 0),
                                        toIsoView(gx, gy, ht), toIsoView(gx + GARAGE_W, gy, ht),
                                        toIsoView(gx + GARAGE_W, gy + GARAGE_H, ht), toIsoView(gx, gy + GARAGE_H, ht),
                                    ];
                                    const pts = (idxs: number[]) => idxs.map(j => `${c[j].x},${c[j].y}`).join(' ');
                                    return (
                                        <g>
                                            <g mask="url(#fadeUpMask)">
                                              <polygon points={pts([2, 3, 7, 6])} fill="#8b95a5" stroke="#7a8698" strokeWidth="0.6" strokeLinejoin="round" />
                                              <polygon points={pts([1, 2, 6, 5])} fill="#8b95a5" stroke="#7a8698" strokeWidth="0.6" strokeLinejoin="round" />
                                              <polygon points={pts([0, 3, 7, 4])} fill="#9aa4b4" stroke="#7a8698" strokeWidth="0.8" strokeLinejoin="round" />
                                              <polygon points={pts([0, 1, 5, 4])} fill="#adb5c4" stroke="#7a8698" strokeWidth="0.8" strokeLinejoin="round" />
                                              <polygon points={pts([4, 5, 6, 7])} fill="#c8ced8" stroke="#9aa4b4" strokeWidth="0.8" strokeLinejoin="round" />
                                            </g>
                                            <text x={(c[4].x + c[6].x) / 2} y={(c[4].y + c[6].y) / 2} textAnchor="middle" dominantBaseline="middle" fill="#5a6577" fontSize="9" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif">{isZh ? '车库' : 'Garage'}</text>
                                        </g>
                                    );
                                })()}

                                {/* ═══ PROPOSED ADU — hero blue closed solid ═══ */}
                                {placementKeyReady && !isHydratingPlacement && (() => {
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

                                    const renderProjectedBox = (corners2d: Array<{ x: number; y: number }>, ht: number, fills: any, label?: string, roofOnly?: boolean, opacity?: number) => {
                                      if (corners2d.length < 4) return null;
                                      const v3d = [
                                        ...corners2d.map(p => ({ x: p.x, y: p.y, z: 0 })),
                                        ...corners2d.map(p => ({ x: p.x, y: p.y, z: ht }))
                                      ];
                                      const proj = v3d.map(v => toIsoView(v.x, v.y, v.z));
                                      const pts = (idxs: number[]) => idxs.map(j => `${proj[j].x},${proj[j].y}`).join(' ');

                                      if (roofOnly) {
                                        const cx = corners2d.reduce((s, p) => s + p.x, 0) / corners2d.length;
                                        const cy = corners2d.reduce((s, p) => s + p.y, 0) / corners2d.length;
                                        const roof = corners2d.map(p => ({ x: cx + (p.x - cx) * 0.88, y: cy + (p.y - cy) * 0.88 }));
                                        const roofV3d = [
                                          ...roof.map(p => ({ x: p.x, y: p.y, z: 0 })),
                                          ...roof.map(p => ({ x: p.x, y: p.y, z: ht }))
                                        ];
                                        const roofProj = roofV3d.map(v => toIsoView(v.x, v.y, v.z));
                                        const roofPts = (idxs: number[]) => idxs.map(j => `${roofProj[j].x},${roofProj[j].y}`).join(' ');
                                        const stroke = fills.strokeFront ?? fills.stroke ?? '#93c5fd';
                                        return (
                                          <g key={label || `${cx}-${cy}`} opacity={opacity ?? 1}>
                                            <g mask="url(#fadeUpMask)">
                                              <polygon points={roofPts([4, 5, 6, 7])} fill={fills.top} stroke={stroke} strokeWidth="0.7" strokeLinejoin="round" />
                                              <line x1={roofProj[0].x} y1={roofProj[0].y} x2={roofProj[4].x} y2={roofProj[4].y} stroke={stroke} strokeWidth="0.55" opacity="0.14" />
                                              <line x1={roofProj[1].x} y1={roofProj[1].y} x2={roofProj[5].x} y2={roofProj[5].y} stroke={stroke} strokeWidth="0.55" opacity="0.14" />
                                              <line x1={roofProj[2].x} y1={roofProj[2].y} x2={roofProj[6].x} y2={roofProj[6].y} stroke={stroke} strokeWidth="0.55" opacity="0.14" />
                                              <line x1={roofProj[3].x} y1={roofProj[3].y} x2={roofProj[7].x} y2={roofProj[7].y} stroke={stroke} strokeWidth="0.55" opacity="0.14" />
                                            </g>
                                          </g>
                                        );
                                      }

                                      const sideFaces = [
                                        { idxs: [0, 1, 5, 4], p1: 0, p2: 1 },
                                        { idxs: [1, 2, 6, 5], p1: 1, p2: 2 },
                                        { idxs: [2, 3, 7, 6], p1: 2, p2: 3 },
                                        { idxs: [3, 0, 4, 7], p1: 3, p2: 0 },
                                      ].map(f => {
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
                                              <text x={(proj[4].x + proj[6].x) / 2} y={(proj[4].y + proj[6].y) / 2 - 6} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">{isZh ? '拟建 ADU' : label}</text>
                                              <text x={(proj[4].x + proj[6].x) / 2} y={(proj[4].y + proj[6].y) / 2 + 8} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontSize="10" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif">{isZh ? '600 平方英尺' : '600 sqft'}</text>
                                            </>
                                          )}

                                          {label === "Proposed ADU" && (() => {
                                            let lowestIdx = 0;
                                            let maxProjY = -Infinity;
                                            for (let i = 0; i < 4; i++) {
                                              if (proj[i].y > maxProjY) {
                                                maxProjY = proj[i].y;
                                                lowestIdx = i;
                                              }
                                            }
                                            const btm = proj[lowestIdx];
                                            const top = proj[lowestIdx + 4];
                                            const off = 12;
                                            const midY = (btm.y + top.y) / 2;
                                            return (
                                              <g>
                                                <line x1={btm.x + off} y1={btm.y} x2={top.x + off} y2={top.y} stroke="#93c5fd" strokeWidth="0.6" strokeDasharray="3,2" />
                                                <line x1={top.x + off - 3} y1={top.y} x2={top.x + off + 3} y2={top.y} stroke="#93c5fd" strokeWidth="0.6" />
                                                <line x1={btm.x + off - 3} y1={btm.y} x2={btm.x + off + 3} y2={btm.y} stroke="#93c5fd" strokeWidth="0.6" />
                                                <rect x={btm.x + off + 6} y={midY - 9} width="46" height="18" rx="9" fill="#1e293b" opacity="0.85" />
                                                <text x={btm.x + off + 29} y={midY + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="8" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">{isZh ? '最高 16 英尺' : '16ft Max'}</text>
                                              </g>
                                            );
                                          })()}
                                        </g>
                                      );
                                    };

                                    if (!canFitAdu) return null;
                                    const addonFills = { bottom: "#60a5fa", back: "#3b82f6", frontLeft: "#60a5fa", frontRight: "#93c5fd", top: "#bfdbfe", stroke: "#1e40af", strokeFront: "#1d4ed8" };
                                    const deckFills = { bottom: "#93c5fd", back: "#60a5fa", frontLeft: "#93c5fd", frontRight: "#bfdbfe", top: "#dbeafe", stroke: "#1d4ed8", strokeFront: "#1e40af" };

                                    const aduHt = 16 * FT_TO_UNIT * (isoLotFrame?.scale ?? 1);
                                    const boxes: Array<{ key: string; localCx: number; localCy: number; w: number; h: number; ht: number; label?: string; fills: any; roofOnly?: boolean; opacity?: number }> = [
                                      { key: 'main', localCx: 0, localCy: 0, w: MAIN_W, h: MAIN_H, ht: aduHt, label: "Proposed ADU", fills: {
                                        bottom: "#2563eb", back: "#1d4ed8", frontLeft: "#2563eb", frontRight: "#3b82f6", top: "#60a5fa", stroke: "#1e3a8a", strokeFront: "#1e40af"
                                      } }
                                    ];
                                    if (endRightOn) boxes.push({ key: 'end-right', localCx: 0, localCy: -(MAIN_H / 2 + ADDON_PX / 2), w: MAIN_W, h: ADDON_PX, ht: aduHt, fills: addonFills, opacity: 0.65 });
                                    if (endLeftOn) boxes.push({ key: 'end-left', localCx: 0, localCy: MAIN_H / 2 + ADDON_PX / 2, w: MAIN_W, h: ADDON_PX, ht: aduHt, fills: addonFills, opacity: 0.65 });
                                    if (hasBalcony) {
                                      boxes.push({ key: 'balcony', localCx: -(MAIN_W / 2 + ADDON_PX / 2), localCy: 0, w: ADDON_PX, h: MAIN_H, ht: aduHt, fills: deckFills, opacity: 0.7 });
                                    }

                                    const boxesWithDepth = boxes.map(b => {
                                        const rad = aduState.rotation * Math.PI / 180;
                                        const cos = Math.cos(rad);
                                        const sin = Math.sin(rad);
                                        const base = isoLotFrame
                                          ? isoLotFrame.toLocal(rotateCanvasPoint3d({ x: aduState.cx, y: aduState.cy }))
                                          : { x: aduState.cx - LOT_X, y: aduState.cy - LOT_Y };
                                        const cx = base.x + (b.localCx * cos - b.localCy * sin);
                                        const cy = base.y + (b.localCx * sin + b.localCy * cos);
                                        const r = rotateLocalAroundAdu3d(cx, cy, orbitYawDeg);
                                        return { ...b, depth: r.x + r.y };
                                    });

                                    boxesWithDepth.sort((a, b) => a.depth - b.depth);

                                    return (
                                        <g>
                                            {boxesWithDepth.map(b => {
                                              const corners = projectAduBox(b.localCx, b.localCy, b.w, b.h);
                                              return renderProjectedBox(corners, b.ht, b.fills, b.label, (b as any).roofOnly, (b as any).opacity);
                                            })}
                                            {(() => {
                                              if (!isoLotFrame) return null;
                                              const ht = aduHt;
                                              const doorMarkLen = 4.429133858 * FT_TO_UNIT * isoLotFrame.scale;
                                              const doorHt = 7.545931759 * FT_TO_UNIT * isoLotFrame.scale;
                                              const rad = aduState.rotation * Math.PI / 180;
                                              const cos = Math.cos(rad);
                                              const sin = Math.sin(rad);
                                              const doorSide = -1;
                                              const doorX = doorSide * (MAIN_W / 2);
                                              const doorY1 = -doorMarkLen / 2;
                                              const doorY2 = doorMarkLen / 2;

                                              const p1 = { x: aduState.cx + (doorX * cos - doorY1 * sin), y: aduState.cy + (doorX * sin + doorY1 * cos) };
                                              const p2 = { x: aduState.cx + (doorX * cos - doorY2 * sin), y: aduState.cy + (doorX * sin + doorY2 * cos) };
                                              const s1 = rotateCanvasPoint3d(p1);
                                              const s2 = rotateCanvasPoint3d(p2);
                                              const l1 = isoLotFrame.toLocal(s1);
                                              const l2 = isoLotFrame.toLocal(s2);

                                              const a0 = toIsoView(l1.x, l1.y, 0);
                                              const a1 = toIsoView(l1.x, l1.y, doorHt);
                                              const b0 = toIsoView(l2.x, l2.y, 0);
                                              const b1 = toIsoView(l2.x, l2.y, doorHt);

                                              return (
                                                <g>
                                                  <line x1={a0.x} y1={a0.y} x2={a1.x} y2={a1.y} stroke="#22C55E" strokeWidth="1.2" opacity="0.55" />
                                                  <line x1={b0.x} y1={b0.y} x2={b1.x} y2={b1.y} stroke="#22C55E" strokeWidth="1.2" opacity="0.55" />
                                                  <line x1={a1.x} y1={a1.y} x2={b1.x} y2={b1.y} stroke="#22C55E" strokeWidth="1.6" opacity="0.95" strokeLinecap="round" />
                                                </g>
                                              );
                                            })()}
                                        </g>
                                    );
                                })()}

                                {(() => {
                                  if (isoBuildingFaces.length === 0) return null;
                                  if (!aduPivotLocal3d) return null;
                                  const rp = rotateLocalAroundAdu3d(aduPivotLocal3d.x, aduPivotLocal3d.y, orbitYawDeg);
                                  const pivotDepth = (rp.x + rp.y) + 30;
                                  const front = isoBuildingFaces.filter((f: any) => f.depth > pivotDepth);
                                  if (front.length === 0) return null;
                                  return (
                                    <g>
                                      {front.map((f: any) => (
                                        <polygon
                                          key={f.key}
                                          points={f.points}
                                          fill={
                                            String(f.key).startsWith('nearby-bldg')
                                              ? (f.fill === '#e5e7eb'
                                                ? 'url(#nearbyBldgTop)'
                                                : (f.fill === '#d1d5db' ? 'url(#nearbyBldgFront)' : 'url(#nearbyBldgBack)'))
                                              : f.fill
                                          }
                                          stroke={f.stroke}
                                          strokeWidth={f.strokeWidth}
                                          opacity={String(f.key).startsWith('nearby-bldg') ? 1 : (String(f.key).startsWith('subject-bldg') ? f.opacity * 0.75 : f.opacity)}
                                          strokeOpacity={String(f.key).startsWith('nearby-bldg') ? 0.35 : 1}
                                          strokeLinejoin="round"
                                        />
                                      ))}
                                    </g>
                                  );
                                })()}

                            </g>
                        </svg>
                    </div>
                )}
            </div>
        </div>

        {/* === RIGHT COLUMN: PANEL === */}
        {variant === 'full' && (
        <div className={PANEL_CLASSES}>
             <div className="mb-6">
                 <PageTitle>{isZh ? '建设潜力' : 'Build Potential'}</PageTitle>
                 <PageSubtitle className="mt-2">
                     {!hasVisibleBuildable ? (
                       <>
                         {isZh
                           ? <>位于 <span>{fullAddress || '—'}</span> 的地块当前<span className="font-semibold text-slate-900">不可建设独立 ADU</span>。</>
                           : <>Your lot at <span>{fullAddress || '—'}</span> is currently <span className="font-semibold text-slate-900">not feasible</span> for a detached ADU.</>}
                       </>
                     ) : isZh ? (
                         <>位于 <span>{fullAddress || '—'}</span> 的地块符合建设 <span className="font-semibold text-slate-900">独立 ADU</span> 的条件。</>
                     ) : (
                         <>Your lot at <span>{fullAddress || '—'}</span> qualifies for a <span className="font-semibold text-slate-900">Detached ADU</span>.</>
                     )}
                 </PageSubtitle>
             </div>

             {/* Highlight Card */}
             {hasVisibleBuildable ? (
               <div className="bg-blue-50 rounded-2xl p-6 mb-2 border border-blue-100">
                   <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="text-5xl font-bold text-slate-900 tracking-tight">{projectedSqft}</span>
                       <span className="text-lg text-slate-500">{isZh ? '平方英尺' : 'sqft'}</span>
                   </div>
                   <div className="text-[11px] text-slate-400 tracking-widest uppercase mb-5">{isZh ? '预计面积（预设户型）' : 'PROJECTED SIZE (PRESET MODULE)'}</div>

                   <div className="mb-4">
                     <div className="text-[11px] text-slate-400 tracking-widest uppercase mb-2">{isZh ? '户型尺寸' : 'MODULE SIZE'}</div>
                     <select
                       value={selectedModuleKey}
                       onChange={(e) => setSelectedModuleKey(e.target.value as any)}
                       className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                     >
                       {MODULE_OPTIONS.map((m) => {
                         const ok = moduleCanFit(m);
                         const suffix = ok ? '' : (isZh ? '（放不下）' : ' (no fit)');
                         return <option key={m.key} value={m.key}>{m.label}{suffix}</option>;
                       })}
                     </select>
                   </div>

                   <div className="mb-4">
                     <div className="text-[11px] text-slate-400 tracking-widest uppercase mb-2">{isZh ? '外挂/阳台' : 'ADD-ONS'}</div>
                     <div className="grid grid-cols-2 gap-2">
                      {(() => {
                        const noneDisabled = !addOnFits.none && endAddon !== 'none';
                        return (
                          <div title={noneDisabled ? addOnFits.tooltip : undefined}>
                            <button
                              type="button"
                              disabled={noneDisabled}
                              onClick={() => {
                                if (noneDisabled) return;
                                userTouchedPlacementRef.current = true;
                                setEndAddon('none');
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-sm font-semibold border ${endAddon === 'none' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-200'} ${noneDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isZh ? '无外挂' : 'No Add-on'}
                            </button>
                          </div>
                        );
                      })()}
                      {(() => {
                        const disabled = !addOnFits.endBoth && endAddon !== 'end-both';
                        return (
                          <div title={disabled ? addOnFits.tooltip : undefined}>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                if (disabled) return;
                                userTouchedPlacementRef.current = true;
                                setEndAddon('end-both');
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-sm font-semibold border ${endAddon === 'end-both' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isZh ? '双侧外挂' : 'Both Sides'}
                            </button>
                          </div>
                        );
                      })()}
                      {(() => {
                        const disabled = !addOnFits.endLeft && endAddon !== 'end-left';
                        return (
                          <div title={disabled ? addOnFits.tooltip : undefined}>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                if (disabled) return;
                                userTouchedPlacementRef.current = true;
                                setEndAddon('end-left');
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-sm font-semibold border ${endAddon === 'end-left' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isZh ? '左侧外挂' : 'Left Side'}
                            </button>
                          </div>
                        );
                      })()}
                      {(() => {
                        const disabled = !addOnFits.endRight && endAddon !== 'end-right';
                        return (
                          <div title={disabled ? addOnFits.tooltip : undefined}>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                if (disabled) return;
                                userTouchedPlacementRef.current = true;
                                setEndAddon('end-right');
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-sm font-semibold border ${endAddon === 'end-right' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isZh ? '右侧外挂' : 'Right Side'}
                            </button>
                          </div>
                        );
                      })()}
                      {(() => {
                        const disabled = !hasBalcony && !addOnFits.balconyOn;
                        return (
                          <div className="col-span-2" title={disabled ? addOnFits.tooltip : undefined}>
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => {
                                if (disabled) return;
                                userTouchedPlacementRef.current = true;
                                setHasBalcony(v => !v);
                              }}
                              className={`w-full rounded-lg px-3 py-2 text-sm font-semibold border ${hasBalcony ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isZh ? '入户露台' : 'Entry Deck'}
                            </button>
                          </div>
                        );
                      })()}
                     </div>
                   </div>
               </div>
             ) : (
               <div className="bg-slate-50 rounded-2xl p-6 mb-2 border border-slate-200">
                   <div className="text-sm font-bold text-slate-900">{isZh ? '不可建设 ADU' : 'ADU not feasible'}</div>
                   <div className="text-xs text-slate-500 mt-1">{isZh ? '当前可建区域无法放入 37.5×16 英尺的预设户型。' : 'The current buildable area cannot fit the 37.5×16ft preset module.'}</div>
               </div>
             )}

             {/* CTA Button */}
             {hasVisibleBuildable && (
               <button 
                  onClick={() => {
                      onNavigate?.('design');
                  }}
                  className="w-full font-medium py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mb-6 bg-[#2B7FFF] hover:bg-blue-600 text-white shadow-blue-100"
               >
                   {isZh ? '开始定制设计' : 'Start Custom Design'} <span className="text-lg">→</span>
               </button>
             )}

             {/* Site Analysis Data */}
             <div className="space-y-0">
                 <SubsectionLabel className="mb-4">{isZh ? '地块分析' : 'Site Analysis'}</SubsectionLabel>
                 
                 {(() => {
                   const ai = lookup?.aiParcelInfo;
                   const requiredSubtitle = isZh ? '要求' : 'Required';
                   const fmt = (v: any) => {
                     const zh = (v?.zh ?? '').toString().trim();
                     const en = (v?.en ?? '').toString().trim();
                     if (isZh) return zh || en || '—';
                     return en || zh || '—';
                   };
                   const isUnknown = (s: string) => {
                     const t = (s ?? '').toString().trim();
                     if (!t) return true;
                     if (t === '—') return true;
                     if (t.toLowerCase() === 'unknown') return true;
                     if (t === '未知') return true;
                     return false;
                   };
                   const zoningSubtitle = ai?.zoningIsLikely ? (isZh ? '可能' : 'Likely') : undefined;
                   const heightLimitFallback = isZh ? "16 英尺" : "16 ft";
                   const setbacksFallback = isZh
                     ? `前 ${FRONT_SETBACK_FT} 英尺 / 后 ${SETBACK_REAR_FT} 英尺 / 侧 ${SETBACK_SIDE_FT} 英尺`
                     : `Front ${FRONT_SETBACK_FT}' / Rear ${SETBACK_REAR_FT}' / Side ${SETBACK_SIDE_FT}'`;

                   const normalizeHeightLimit = () => {
                     const raw = fmt(ai?.heightLimit);
                     return isUnknown(raw) ? heightLimitFallback : raw;
                   };

                   const normalizeSetbacks = () => {
                     const raw = fmt(ai?.setbacks);
                     if (isUnknown(raw)) return setbacksFallback;

                     if (isZh) {
                       const hasRear = raw.includes('后');
                       const hasSide = raw.includes('侧');
                       const hasUnknown = raw.includes('未知') || raw.toLowerCase().includes('unknown') || raw.includes('—');
                       if (!hasUnknown) return raw;
                       if (!hasRear && !hasSide) return setbacksFallback;

                       let s = raw;
                       if (hasRear) s = s.replace(/后\s*(未知|Unknown|unknown|—)/g, `后 ${SETBACK_REAR_FT} 英尺`);
                       if (hasSide) s = s.replace(/侧\s*(未知|Unknown|unknown|—)/g, `侧 ${SETBACK_SIDE_FT} 英尺`);
                       return s;
                     }

                     let s = raw;
                     s = s.replace(/Rear\s*[: ]\s*(Unknown|—)/gi, `Rear ${SETBACK_REAR_FT}'`);
                     s = s.replace(/Rear\s+(Unknown|—)/gi, `Rear ${SETBACK_REAR_FT}'`);
                     s = s.replace(/Side\s*[: ]\s*(Unknown|—)/gi, `Side ${SETBACK_SIDE_FT}'`);
                     s = s.replace(/Side\s+(Unknown|—)/gi, `Side ${SETBACK_SIDE_FT}'`);
                     return s;
                   };

                   const row = (label: string, value: string, subtitle?: string) => (
                     <div className="flex justify-between items-center py-4 border-b border-slate-100">
                       <div>
                         <div className="text-sm font-bold text-slate-900">{label}</div>
                         <div className="text-xs text-slate-400">{subtitle ?? ''}</div>
                       </div>
                       <div className="text-sm font-bold text-slate-900 text-right max-w-[60%]">
                         {value}
                       </div>
                     </div>
                   );
                  const lotDimensionsDerived = (() => {
                    const geom = subjectParcel?.geometry;
                    if (!bboxMercator || !geom) return '';
                    if (geom.type !== 'Polygon' || !Array.isArray(geom.coordinates?.[0])) return '';
                    const ring = geom.coordinates[0] as any[];
                    if (!Array.isArray(ring) || ring.length < 4) return '';

                    const toMerc = (lon: number, lat: number) => bboxMercator.toScreenMercator(lon, lat);
                    const ptsM: Array<{ x: number; y: number }> = [];
                    for (const pt of ring) {
                      const lon = Number(pt?.[0]);
                      const lat = Number(pt?.[1]);
                      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
                      ptsM.push(toMerc(lon, lat));
                    }
                    if (ptsM.length < 4) return '';
                    const first = ptsM[0];
                    const last = ptsM[ptsM.length - 1];
                    if (Math.hypot(first.x - last.x, first.y - last.y) < 1e-6) ptsM.pop();
                    if (ptsM.length < 3) return '';

                    const center = {
                      x: ptsM.reduce((s, p) => s + p.x, 0) / ptsM.length,
                      y: ptsM.reduce((s, p) => s + p.y, 0) / ptsM.length
                    };
                    const rad = (rotationDeg * Math.PI) / 180;
                    const c = Math.cos(rad);
                    const s = Math.sin(rad);
                    const rot = (p: { x: number; y: number }) => {
                      const dx = p.x - center.x;
                      const dy = p.y - center.y;
                      return { x: dx * c - dy * s, y: dx * s + dy * c };
                    };

                    const segs: Array<{ vx: number; vy: number; len: number }> = [];
                    for (let i = 0; i < ptsM.length; i++) {
                      const a = rot(ptsM[i]);
                      const b = rot(ptsM[(i + 1) % ptsM.length]);
                      const vx = b.x - a.x;
                      const vy = b.y - a.y;
                      const len = Math.hypot(vx, vy);
                      if (len > 1e-6) segs.push({ vx, vy, len });
                    }
                    if (segs.length < 2) return '';

                    const merged: Array<{ vx: number; vy: number; len: number }> = [];
                    const isCollinear = (a: { vx: number; vy: number }, b: { vx: number; vy: number }) => {
                      const al = Math.hypot(a.vx, a.vy);
                      const bl = Math.hypot(b.vx, b.vy);
                      if (al < 1e-9 || bl < 1e-9) return false;
                      const ax = a.vx / al, ay = a.vy / al;
                      const bx = b.vx / bl, by = b.vy / bl;
                      const cross = ax * by - ay * bx;
                      const dot = ax * bx + ay * by;
                      return Math.abs(cross) < 0.03 && dot > 0;
                    };
                    for (const seg of segs) {
                      const prev = merged[merged.length - 1];
                      if (prev && isCollinear(prev, seg)) {
                        prev.len += seg.len;
                        prev.vx += seg.vx;
                        prev.vy += seg.vy;
                      } else {
                        merged.push({ vx: seg.vx, vy: seg.vy, len: seg.len });
                      }
                    }
                    if (merged.length > 1 && isCollinear(merged[0], merged[merged.length - 1])) {
                      const firstSeg = merged[0];
                      const lastSeg = merged[merged.length - 1];
                      firstSeg.len += lastSeg.len;
                      firstSeg.vx += lastSeg.vx;
                      firstSeg.vy += lastSeg.vy;
                      merged.pop();
                    }

                    const xs: number[] = [];
                    const ys: number[] = [];
                    for (const seg of merged) {
                      const al = Math.hypot(seg.vx, seg.vy);
                      if (al < 1e-9) continue;
                      const ax = seg.vx / al;
                      const ay = seg.vy / al;
                      if (Math.abs(ax) >= Math.abs(ay)) xs.push(seg.len);
                      else ys.push(seg.len);
                    }
                    if (xs.length === 0 || ys.length === 0) return '';
                    const avg = (arr: number[]) => arr.reduce((t, n) => t + n, 0) / Math.max(1, arr.length);
                    const wFtRaw = avg(xs) * FT_PER_M;
                    const dFtRaw = avg(ys) * FT_PER_M;
                    if (!Number.isFinite(wFtRaw) || !Number.isFinite(dFtRaw) || wFtRaw <= 0 || dFtRaw <= 0) return '';
                    const wFt = Math.min(wFtRaw, dFtRaw);
                    const dFt = Math.max(wFtRaw, dFtRaw);
                    const w = wFt.toFixed(2);
                    const d = dFt.toFixed(2);
                    return isZh ? `${w}英尺宽 x ${d}英尺深` : `${w}' W x ${d}' D`;
                  })();
                   return (
                     <>
                       {row(isZh ? '分区类型' : 'Zoning', fmt(ai?.zoning), zoningSubtitle)}
                       {row(isZh ? '地块面积' : 'Lot Area', fmt(ai?.lotArea))}
                       {row(isZh ? '地块尺寸' : 'Lot Dimensions', lotDimensionsDerived || '—')}
                       {row(isZh ? '高度限制' : 'Height Limit', normalizeHeightLimit())}
                       {row(isZh ? '现有建筑数量' : 'Existing Units', fmt(ai?.existingUnits))}
                       {row(isZh ? '退尺要求' : 'Setbacks', normalizeSetbacks(), requiredSubtitle)}
                       {row(isZh ? '公共设施接入' : 'Utility Access', fmt(ai?.utilityAccess))}
                     </>
                   );
                 })()}
             </div>

             {/* Build Strategy */}
             {hasVisibleBuildable && (
               <div className="mt-6">
                   <SubsectionLabel className="mb-4">{isZh ? '建设策略' : 'Build Strategy'}</SubsectionLabel>
                   <div className="bg-white border-2 border-blue-500 rounded-xl p-4 flex items-center gap-3">
                       <div className="w-4 h-4 rounded-full border-[4px] border-blue-500 bg-white"></div>
                       <span className="text-sm font-bold text-slate-900">{isZh ? '独立 ADU' : 'Detached ADU'}</span>
                   </div>
               </div>
             )}

        </div>
        )}
    </div>
  );
}
