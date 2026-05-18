import React, { useState, useRef, useEffect } from 'react';
import { 
  Map as MapIcon,
  Box
} from 'lucide-react';
import { PageTitle, PageSubtitle, SubsectionLabel, PANEL_CLASSES } from './Typography';

// --- Components ---

const ViewToggle = ({ mode, setMode }: { mode: '2d' | '3d', setMode: (m: '2d' | '3d') => void }) => (
    <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-200 flex items-center">
        <button
            onClick={() => setMode('2d')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                mode === '2d' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
        >
            <MapIcon className="w-3 h-3" /> 2D Map
        </button>
        <button
            onClick={() => setMode('3d')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                mode === '3d' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
        >
            <Box className="w-3 h-3" /> 3D Massing
        </button>
    </div>
);

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


export function SiteFeasibility({ onNavigate }: { onNavigate?: (tab: 'design') => void }) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  
  // --- Constants & Config ---
  // Scale: 1 ft = 6 units
  const FT_TO_UNIT = 6;
  const UNIT_TO_FT = 1 / FT_TO_UNIT; 
  
  // Lot Geometry (50' x 100')
  const LOT_W_FT = 50;
  const LOT_H_FT = 100;
  const LOT_W = LOT_W_FT * FT_TO_UNIT; // 300
  const LOT_H = LOT_H_FT * FT_TO_UNIT; // 600
  
  // Canvas Positioning
  const CANVAS_W = 1000;
  const CANVAS_H = 830;
  const LOT_X = (CANVAS_W - LOT_W) / 2; // Centered X
  const LOT_Y = 160; // Top of lot
  
  // Setbacks & Clearances
  const SETBACK_SIDE_FT = 5;
  const SETBACK_REAR_FT = 20;
  const HOUSE_SEP_FT = 5;
  const FRONT_SETBACK_FT = 10; 

  const SETBACK_SIDE = SETBACK_SIDE_FT * FT_TO_UNIT;
  const SETBACK_REAR = SETBACK_REAR_FT * FT_TO_UNIT;
  const HOUSE_SEP = HOUSE_SEP_FT * FT_TO_UNIT;

  // Existing Structures
  const HOUSE_W_FT = 30;
  const HOUSE_H_FT = 38;
  const HOUSE_W = HOUSE_W_FT * FT_TO_UNIT;
  const HOUSE_H = HOUSE_H_FT * FT_TO_UNIT;
  const HOUSE_X = LOT_X + (LOT_W - HOUSE_W) / 2 - 10;
  const HOUSE_Y = LOT_Y + (FRONT_SETBACK_FT * FT_TO_UNIT);

  // Garage - positioned at lower bottom-right of lot
  const GARAGE_W_FT = 18;
  const GARAGE_H_FT = 18;
  const GARAGE_W = GARAGE_W_FT * FT_TO_UNIT;
  const GARAGE_H = GARAGE_H_FT * FT_TO_UNIT;
  const GARAGE_X = LOT_X + LOT_W - GARAGE_W - 10; // tight to right lot edge
  const GARAGE_Y = LOT_Y + LOT_H - GARAGE_H - 20;

  // Obstacles (no driveway corridor in this layout)
  const OBSTACLES = [
    { x: HOUSE_X, y: HOUSE_Y, w: HOUSE_W, h: HOUSE_H },
    { x: GARAGE_X, y: GARAGE_Y, w: GARAGE_W, h: GARAGE_H },
  ];

  // Buildable Zone (Envelope) - ratio 1:1.45 (w:h)
  // Right edge = 5' (SETBACK_SIDE) gap from garage left edge
  const ZONE_W_DISPLAY = "22'-3\"";
  const ZONE_H_DISPLAY = "39'-2\"";
  const ZONE_LEFT = LOT_X + SETBACK_SIDE;
  const ZONE_TOP = HOUSE_Y + HOUSE_H + HOUSE_SEP;
  const ZONE_RIGHT = GARAGE_X - SETBACK_SIDE; // 5' gap from garage
  const ZONE_W = ZONE_RIGHT - ZONE_LEFT;
  const ZONE_H = Math.round(ZONE_W * 1.45 * 1.2); // ratio 1:1.45, scaled 1.2x vertically
  const ZONE_BOTTOM = ZONE_TOP + ZONE_H;

  // --- ADU Composite Module ---
  // Main body sized to allow movement within envelope
  const MAIN_W = ZONE_W * 0.52;
  const MAIN_H = ZONE_H * 0.65;

  // Portal (porch): same height as main body, 32% width
  const PORTAL_W = MAIN_W * 0.32;
  const PORTAL_H = MAIN_H;

  // Combined footprint
  const COMBINED_W = MAIN_W + PORTAL_W;
  const COMBINED_H = MAIN_H;

  // ADU center position (left-aligned within envelope)
  const ADU_CENTER_X = ZONE_LEFT + COMBINED_W / 2;
  const ADU_CENTER_Y = ZONE_TOP + ZONE_H / 2;

  // State - ADU position (center of combined module)
  const [aduState, setAduState] = useState({ 
    cx: ADU_CENTER_X,
    cy: ADU_CENTER_Y,
    rotation: 0
  });
  
  const [interactionMode, setInteractionMode] = useState<'move' | 'rotate' | null>(null);
  const [hoverADU, setHoverADU] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialState, setInitialState] = useState(aduState); // Snapshot at start of drag
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // Mouse offset from center
  const svgRef = useRef<SVGSVGElement>(null);

  // Helper to convert client coords to SVG coords
  // Must account for preserveAspectRatio="xMidYMid slice" uniform scaling
  const clientToSvg = (clientX: number, clientY: number) => {
    const svgEl = svgRef.current;
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    // With "slice", the SVG scales uniformly to COVER the viewport
    const sx = rect.width / CANVAS_W;
    const sy = rect.height / CANVAS_H;
    const uniformScale = Math.max(sx, sy);
    // Visible portion of the viewBox is centered
    const visibleW = rect.width / uniformScale;
    const visibleH = rect.height / uniformScale;
    const offsetX = (CANVAS_W - visibleW) / 2;
    const offsetY = (CANVAS_H - visibleH) / 2;
    return {
      x: (clientX - rect.left) / uniformScale + offsetX,
      y: (clientY - rect.top) / uniformScale + offsetY,
    };
  };

  // Check if a specific configuration is valid
  const checkValidity = (cx: number, cy: number, rot: number) => {
    const corners = getCorners(cx, cy, COMBINED_W, COMBINED_H, rot);
    
    // 1. All corners must stay within the visible buildable envelope (ZONE)
    for (const p of corners) {
        if (p.x < ZONE_LEFT || p.x > ZONE_RIGHT || p.y < ZONE_TOP || p.y > ZONE_BOTTOM) {
            return false;
        }
    }

    // 2. Check Obstacles
    for (const obs of OBSTACLES) {
        const obsPoly = rectToPoly(obs);
        if (doPolygonsIntersect(corners, obsPoly)) {
            return false;
        }
    }

    return true;
  };

  const handleMouseDown = (e: React.MouseEvent, mode: 'move' | 'rotate') => {
    e.preventDefault();
    e.stopPropagation();
    
    const pt = clientToSvg(e.clientX, e.clientY);
    if (!pt) return;

    setInteractionMode(mode);
    setDragStart(pt);
    setInitialState(aduState);
    
    if (mode === 'move') {
        setDragOffset({ x: pt.x - aduState.cx, y: pt.y - aduState.cy });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!interactionMode) return;
    
    const pt = clientToSvg(e.clientX, e.clientY);
    if (!pt) return;

    const mouseX = pt.x;
    const mouseY = pt.y;

    if (interactionMode === 'move') {
        // Calculate potential new position
        let targetX = mouseX - dragOffset.x;
        let targetY = mouseY - dragOffset.y;

        // Clamp ADU bounding box inside the buildable envelope
        const rot = aduState.rotation;
        const corners = getCorners(targetX, targetY, COMBINED_W, COMBINED_H, rot);
        
        // Find the axis-aligned bounding box of the rotated ADU
        let minPx = Infinity, maxPx = -Infinity, minPy = Infinity, maxPy = -Infinity;
        for (const p of corners) {
            minPx = Math.min(minPx, p.x);
            maxPx = Math.max(maxPx, p.x);
            minPy = Math.min(minPy, p.y);
            maxPy = Math.max(maxPy, p.y);
        }

        // Envelope bounds
        const envLeft = ZONE_LEFT;
        const envRight = ZONE_RIGHT;
        const envTop = ZONE_TOP;
        const envBottom = ZONE_BOTTOM;

        // Calculate how much the AABB exceeds the envelope and shift center accordingly
        if (minPx < envLeft) targetX += (envLeft - minPx);
        if (maxPx > envRight) targetX -= (maxPx - envRight);
        if (minPy < envTop) targetY += (envTop - minPy);
        if (maxPy > envBottom) targetY -= (maxPy - envBottom);

        // Also avoid obstacles (house, garage) — fallback to validity check
        if (checkValidity(targetX, targetY, rot)) {
            setAduState(s => ({ ...s, cx: targetX, cy: targetY }));
        } else {
            // Try sliding along each axis independently
            if (checkValidity(targetX, aduState.cy, rot)) {
                setAduState(s => ({ ...s, cx: targetX }));
            } else if (checkValidity(aduState.cx, targetY, rot)) {
                setAduState(s => ({ ...s, cy: targetY }));
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
        
        // Snapping
        const snapPoints = [0, 90, 180, 270, 360];
        let snappedRot = rawRot;
        for (const snap of snapPoints) {
            if (Math.abs(rawRot - snap) < 5) {
                snappedRot = snap;
                break;
            }
        }
        if (Math.abs(rawRot - 360) < 5) snappedRot = 0;

        // Check Validity
        if (checkValidity(aduState.cx, aduState.cy, snappedRot)) {
            setAduState(s => ({ ...s, rotation: snappedRot }));
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
      const mouseX = pt.x;
      const mouseY = pt.y;

      if (interactionMode === 'move') {
        let targetX = mouseX - dragOffset.x;
        let targetY = mouseY - dragOffset.y;

        const rot = aduState.rotation;
        const corners = getCorners(targetX, targetY, COMBINED_W, COMBINED_H, rot);
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

        const snapPoints = [0, 90, 180, 270, 360];
        let snappedRot = rawRot;
        for (const snap of snapPoints) {
          if (Math.abs(rawRot - snap) < 5) { snappedRot = snap; break; }
        }
        if (Math.abs(rawRot - 360) < 5) snappedRot = 0;

        if (checkValidity(aduState.cx, aduState.cy, snappedRot)) {
          setAduState(s => ({ ...s, rotation: snappedRot }));
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
  }, [interactionMode, dragOffset, dragStart, initialState, aduState]);

  // derived values for rendering
  const rotRad = (aduState.rotation * Math.PI) / 180;

  return (
    <div className="flex h-full w-full bg-slate-50 overflow-hidden font-sans">
        
        {/* === LEFT COLUMN: CANVAS === */}
        <div className="flex-1 relative bg-slate-50 overflow-hidden flex flex-col border-r border-slate-200">
            
            {/* Top Toolbar */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                <ViewToggle mode={viewMode} setMode={setViewMode} />
            </div>

            {/* Main Canvas Area */}
            <div 
                className="flex-1 relative w-full h-full select-none"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {viewMode === '2d' ? (
                    <div className="w-full h-full relative bg-[#f1f5f8] overflow-hidden">
                         {/* SVG Map Layer */}
                         <svg 
                            className="absolute inset-0 w-full h-full" 
                            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} 
                            preserveAspectRatio="xMidYMid slice"
                            ref={svgRef}
                         >
                            {/* --- CONTEXT BACKGROUND --- */}
                            
                            {/* Street (Top) */}
                            <rect x="0" y="0" width={CANVAS_W} height={LOT_Y} fill="#EDF1F6" opacity="0.5" />
                            <text x={CANVAS_W/2} y={LOT_Y/2 + 5} textAnchor="middle" fill="#94a3b8" fontSize="14" fontWeight="400" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.15em">164th Place</text>
                            
                            {/* Neighbors - same width as subject lot, flush against it, filling to canvas edges */}
                            {/* Left Neighbor 1 (immediately adjacent) */}
                            <g transform={`translate(${LOT_X - LOT_W}, ${LOT_Y})`}>
                                <rect x="0" y="0" width={LOT_W} height={LOT_H} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
                                {/* Neighbor house */}
                                <rect x={60} y={80} width={150} height={250} fill="#EDF1F6" />
                            </g>
                            {/* Left Neighbor 2 (partial, fills to left edge) */}
                            {LOT_X - LOT_W > 0 && (
                                <g transform={`translate(0, ${LOT_Y})`}>
                                    <rect x="0" y="0" width={LOT_X - LOT_W} height={LOT_H} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
                                </g>
                            )}
                            
                            {/* Right Neighbor 1 (immediately adjacent) */}
                            <g transform={`translate(${LOT_X + LOT_W}, ${LOT_Y})`}>
                                <rect x="0" y="0" width={LOT_W} height={LOT_H} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
                                {/* Neighbor house */}
                                <rect x={80} y={120} width={100} height={200} fill="#EDF1F6" />
                                {/* Neighbor small structure */}
                                <rect x={200} y={380} width={70} height={90} fill="#EDF1F6" />
                            </g>
                            {/* Right Neighbor 2 (partial, fills to right edge) */}
                            {LOT_X + LOT_W * 2 < CANVAS_W && (
                                <g transform={`translate(${LOT_X + LOT_W * 2}, ${LOT_Y})`}>
                                    <rect x="0" y="0" width={CANVAS_W - (LOT_X + LOT_W * 2)} height={LOT_H} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1" />
                                </g>
                            )}

                            {/* --- SUBJECT LOT --- */}
                            {/* Thick border */}
                            <rect 
                                x={LOT_X} 
                                y={LOT_Y} 
                                width={LOT_W} 
                                height={LOT_H} 
                                fill="white" 
                                stroke="#010101" 
                                strokeWidth="3" 
                            />

                            {/* --- EXISTING STRUCTURES --- */}
                            {/* Main House */}
                            <rect 
                                x={HOUSE_X} 
                                y={HOUSE_Y} 
                                width={HOUSE_W} 
                                height={HOUSE_H} 
                                fill="#CBD5E1" 
                            />
                            <text x={HOUSE_X + HOUSE_W/2} y={HOUSE_Y + HOUSE_H/2} textAnchor="middle" dominantBaseline="middle" fill="#64748b" fontSize="11" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" className="pointer-events-none">Existing House</text>

                            {/* Garage */}
                            <rect 
                                x={GARAGE_X} 
                                y={GARAGE_Y} 
                                width={GARAGE_W} 
                                height={GARAGE_H} 
                                fill="#EDF1F6" 
                            />
                            <text x={GARAGE_X + GARAGE_W/2} y={GARAGE_Y + GARAGE_H/2} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="10" fontWeight="500" fontFamily="Inter, system-ui, sans-serif" className="pointer-events-none">Garage</text>

                            {/* --- BUILDABLE ZONE (Blue Dashed Box) --- */}
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

                            {/* --- ANNOTATIONS --- */}
                            <g className="pointer-events-none">
                                {/* Left Setback 5' — lot left edge → envelope left edge (horizontal) */}
                                {(() => {
                                    const y = ZONE_BOTTOM - 15;
                                    return (<>
                                        <circle cx={LOT_X} cy={y} r="2" fill="#94a3b8" />
                                        <line x1={LOT_X} y1={y} x2={ZONE_LEFT} y2={y} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 2" />
                                        <circle cx={ZONE_LEFT} cy={y} r="2" fill="#94a3b8" />
                                        <text x={LOT_X + SETBACK_SIDE / 2} y={y - 6} textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif">5'</text>
                                    </>);
                                })()}

                                {/* Right Setback 5' — envelope right edge → garage left edge (horizontal) */}
                                {(() => {
                                    const y = ZONE_BOTTOM - 15;
                                    return (<>
                                        <circle cx={ZONE_RIGHT} cy={y} r="2" fill="#94a3b8" />
                                        <line x1={ZONE_RIGHT} y1={y} x2={GARAGE_X} y2={y} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 2" />
                                        <circle cx={GARAGE_X} cy={y} r="2" fill="#94a3b8" />
                                        <text x={(ZONE_RIGHT + GARAGE_X) / 2} y={y - 6} textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif">5'</text>
                                    </>);
                                })()}

                                {/* Top Separation 5' — house bottom edge → envelope top edge (vertical) */}
                                {(() => {
                                    const x = ZONE_RIGHT - 8;
                                    return (<>
                                        <circle cx={x} cy={HOUSE_Y + HOUSE_H} r="2" fill="#94a3b8" />
                                        <line x1={x} y1={HOUSE_Y + HOUSE_H} x2={x} y2={ZONE_TOP} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 2" />
                                        <circle cx={x} cy={ZONE_TOP} r="2" fill="#94a3b8" />
                                        <text x={x + 10} y={(HOUSE_Y + HOUSE_H + ZONE_TOP) / 2 + 2} dominantBaseline="middle" fill="#64748b" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif">5'</text>
                                    </>);
                                })()}

                                {/* Rear Setback 20' — envelope bottom edge → lot bottom edge (vertical) */}
                                {(() => {
                                    const x = ZONE_LEFT + ZONE_W / 2;
                                    return (<>
                                        <circle cx={x} cy={ZONE_BOTTOM} r="2" fill="#94a3b8" />
                                        <line x1={x} y1={ZONE_BOTTOM} x2={x} y2={LOT_Y + LOT_H} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 2" />
                                        <circle cx={x} cy={LOT_Y + LOT_H} r="2" fill="#94a3b8" />
                                        <text x={x + 10} y={(ZONE_BOTTOM + LOT_Y + LOT_H) / 2} dominantBaseline="middle" fill="#64748b" fontSize="8" fontWeight="500" fontFamily="Inter, system-ui, sans-serif">20'</text>
                                    </>);
                                })()}
                            </g>

                            {/* --- PROPOSED ADU --- */}
                            <g 
                                transform={`translate(${aduState.cx}, ${aduState.cy}) rotate(${aduState.rotation})`}
                                className={`${interactionMode === 'move' ? 'cursor-grabbing' : 'cursor-grab'} transition-opacity`}
                                onMouseEnter={() => setHoverADU(true)}
                                onMouseLeave={() => setHoverADU(false)}
                                onMouseDown={(e) => handleMouseDown(e, 'move')}
                            >
                                {/* Main Body (dark blue) - left portion */}
                                <rect 
                                    x={-COMBINED_W/2}
                                    y={-MAIN_H/2}
                                    width={MAIN_W} 
                                    height={MAIN_H}
                                    fill="#3B82F6" 
                                    stroke="white"
                                    strokeWidth="2"
                                    rx="2"
                                />
                                
                                {/* Entry Portal (light blue) - attached to right side, full height */}
                                <rect 
                                    x={-COMBINED_W/2 + MAIN_W}
                                    y={-MAIN_H/2}
                                    width={PORTAL_W} 
                                    height={PORTAL_H}
                                    fill="#BEDBFF"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    rx="1"
                                />

                                {/* Text labels on main body */}
                                <text x={-COMBINED_W/2 + MAIN_W/2} y={-12} textAnchor="middle" className="text-[11px] font-bold fill-white pointer-events-none">Proposed</text>
                                <text x={-COMBINED_W/2 + MAIN_W/2} y={4} textAnchor="middle" className="text-[11px] font-bold fill-white pointer-events-none">ADU</text>
                                <text x={-COMBINED_W/2 + MAIN_W/2} y={20} textAnchor="middle" className="text-[10px] font-medium fill-white/90 pointer-events-none">600 sqft</text>

                                {/* Rotation Handle - Top Right Corner of combined module */}
                                {(hoverADU || interactionMode === 'rotate') && (
                                    <g 
                                        className="cursor-alias"
                                        onMouseDown={(e) => handleMouseDown(e, 'rotate')}
                                        transform={`translate(${COMBINED_W/2 + 5}, ${-COMBINED_H/2 - 5})`}
                                    >
                                        {/* Invisible hit area for easier grabbing — no visible icon */}
                                        <circle r="16" fill="transparent" />
                                    </g>
                                )}
                            </g>

                            {/* --- ANGLE TOOLTIP (While Rotating) --- */}
                            {interactionMode === 'rotate' && (
                                <foreignObject 
                                    x={aduState.cx + 40} 
                                    y={aduState.cy - 40} 
                                    width="80" 
                                    height="40"
                                >
                                    <div className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded shadow-lg text-center w-fit">
                                        {Math.round(aduState.rotation)}°
                                    </div>
                                </foreignObject>
                            )}

                            {/* --- DIMENSION TABS (Blue rounded badges) --- */}
                            {/* Width Tab (Bottom center of Zone) - centered on dashed boundary */}
                            <g transform={`translate(${ZONE_LEFT + ZONE_W/2}, ${ZONE_BOTTOM})`}>
                                <rect x="-18" y="-8" width="36" height="16" rx="4" fill="#3B82F6" />
                                <text x="0" y="0" dominantBaseline="middle" textAnchor="middle" className="text-[7px] font-bold fill-white">{ZONE_W_DISPLAY}</text>
                            </g>
                            
                            {/* Depth Tab (Right Center of Zone, rotated) - centered on dashed boundary */}
                            <g transform={`translate(${ZONE_RIGHT}, ${ZONE_TOP + ZONE_H/2})`}>
                                <g transform="rotate(-90)">
                                    <rect x="-18" y="-8" width="36" height="16" rx="4" fill="#3B82F6" />
                                    <text x="0" y="0" dominantBaseline="middle" textAnchor="middle" className="text-[7px] font-bold fill-white">{ZONE_H_DISPLAY}</text>
                                </g>
                            </g>

                         </svg>

                         {/* Scale Legend */}
                         <div className="absolute bottom-6 right-6 bg-white px-3 py-1 rounded shadow-sm border border-slate-200 text-[10px] font-bold text-slate-500">
                             Scale: 1" = 20'
                         </div>

                         {/* Map Legend */}
                         <div className="absolute bottom-6 left-6 bg-white/95 p-4 rounded-xl shadow-lg border border-slate-200 z-10">
                             <div className="flex flex-col gap-2.5">
                                 <div className="flex items-center gap-3">
                                     <div className="w-4 h-4 rounded-md bg-blue-500"></div>
                                     <span className="text-xs font-medium text-slate-600">Proposed ADU</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <div className="w-4 h-4 rounded-md border-2 border-[#155dfc] border-dashed bg-white"></div>
                                     <span className="text-xs font-medium text-slate-600">Buildable Zone</span>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     <div className="w-4 h-4 rounded-md bg-[#CBD5E1]"></div>
                                     <span className="text-xs font-medium text-slate-600">Existing Structure</span>
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
                        >
                            <defs>
                                <filter id="softShadow" x="-20%" y="-10%" width="140%" height="130%">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                                </filter>
                                <filter id="softShadowSm" x="-30%" y="-15%" width="160%" height="150%">
                                    <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                                </filter>
                            </defs>

                            <g transform={`translate(${CANVAS_W / 2 + 50}, ${CANVAS_H / 2 - 10})`}>

                                {/* ═══ STREET BAND ═══ */}
                                {(() => {
                                    const sW = LOT_W + 600, sD = 60, sX = -150, sY = -sD;
                                    const p = [toIso(sX, sY, 0), toIso(sX + sW, sY, 0), toIso(sX + sW, sY + sD, 0), toIso(sX, sY + sD, 0)];
                                    return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#e8ecf0" />;
                                })()}
                                {/* Sidewalk */}
                                {(() => {
                                    const p = [toIso(-150, 0, 0), toIso(LOT_W + 450, 0, 0), toIso(LOT_W + 450, 12, 0), toIso(-150, 12, 0)];
                                    return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#f0f2f5" />;
                                })()}

                                {/* ═══ NEIGHBOR LOT PLANES ═══ */}
                                {[
                                    [-LOT_W - 20, 0, LOT_W, LOT_H],
                                    [LOT_W + 20, 0, LOT_W, LOT_H],
                                ].map(([nx, ny, nw, nh], i) => {
                                    const p = [toIso(nx, ny, 0), toIso(nx + nw, ny, 0), toIso(nx + nw, ny + nh, 0), toIso(nx, ny + nh, 0)];
                                    return <polygon key={`nlot-${i}`} points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#f4f5f7" stroke="#e5e7eb" strokeWidth="0.5" />;
                                })}

                                {/* ═══ SUBJECT LOT ═══ */}
                                {(() => {
                                    const p = [toIso(0, 0, 0), toIso(LOT_W, 0, 0), toIso(LOT_W, LOT_H, 0), toIso(0, LOT_H, 0)];
                                    return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#ffffff" stroke="#d1d5db" strokeWidth="0.8" />;
                                })()}

                                {/* ═══ SETBACK BOUNDARY ═══ */}
                                {(() => {
                                    const zX = ZONE_LEFT - LOT_X, zY = ZONE_TOP - LOT_Y;
                                    const p = [toIso(zX, zY, 0.5), toIso(zX + ZONE_W, zY, 0.5), toIso(zX + ZONE_W, zY + ZONE_H, 0.5), toIso(zX, zY + ZONE_H, 0.5)];
                                    return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="none" stroke="#155dfc" strokeWidth="0.8" strokeDasharray="8 5" opacity="0.4" />;
                                })()}

                                {/* ═══ NEIGHBOR CONTEXT MASSING ═══ */}
                                {[
                                    { x: -LOT_W + 40, y: 50, w: 140, h: 180, ht: 90 },
                                    { x: -LOT_W + 60, y: 380, w: 80, h: 80, ht: 45 },
                                    { x: LOT_W + 60, y: 80, w: 120, h: 160, ht: 80 },
                                    { x: LOT_W + 50, y: 350, w: 100, h: 100, ht: 55 },
                                    { x: LOT_W + 200, y: 120, w: 80, h: 120, ht: 60 },
                                    { x: 40, y: -110, w: 100, h: 40, ht: 70 },
                                    { x: 200, y: -100, w: 80, h: 35, ht: 55 },
                                ].map((nb, i) => {
                                    // Inline all 6 faces for proper closed solid
                                    const nc = [
                                        toIso(nb.x, nb.y, 0), toIso(nb.x + nb.w, nb.y, 0),
                                        toIso(nb.x + nb.w, nb.y + nb.h, 0), toIso(nb.x, nb.y + nb.h, 0),
                                        toIso(nb.x, nb.y, nb.ht), toIso(nb.x + nb.w, nb.y, nb.ht),
                                        toIso(nb.x + nb.w, nb.y + nb.h, nb.ht), toIso(nb.x, nb.y + nb.h, nb.ht),
                                    ];
                                    const npts = (idxs: number[]) => idxs.map(j => `${nc[j].x},${nc[j].y}`).join(' ');
                                    return (
                                        <g key={`nb-${i}`} opacity="0.14">
                                            <polygon points={npts([2, 3, 7, 6])} fill="#9ca3af" strokeWidth="0" />
                                            <polygon points={npts([1, 2, 6, 5])} fill="#9ca3af" strokeWidth="0" />
                                            <polygon points={npts([0, 3, 7, 4])} fill="#9ca3af" strokeWidth="0" />
                                            <polygon points={npts([0, 1, 5, 4])} fill="#b0b7c3" strokeWidth="0" />
                                            <polygon points={npts([4, 5, 6, 7])} fill="#cdd2d9" strokeWidth="0" />
                                        </g>
                                    );
                                })}

                                {/* ═══ GROUND SHADOWS ═══ */}
                                {(() => {
                                    const hx = HOUSE_X - LOT_X, hy = HOUSE_Y - LOT_Y;
                                    const p = [toIso(hx + 10, hy + 10, 0), toIso(hx + HOUSE_W + 10, hy + 10, 0), toIso(hx + HOUSE_W + 10, hy + HOUSE_H + 10, 0), toIso(hx + 10, hy + HOUSE_H + 10, 0)];
                                    return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#94a3b8" opacity="0.08" filter="url(#softShadow)" />;
                                })()}
                                {(() => {
                                    const ax = aduState.cx - COMBINED_W / 2 - LOT_X, ay = aduState.cy - COMBINED_H / 2 - LOT_Y;
                                    const p = [toIso(ax + 6, ay + 6, 0), toIso(ax + COMBINED_W + 6, ay + 6, 0), toIso(ax + COMBINED_W + 6, ay + COMBINED_H + 6, 0), toIso(ax + 6, ay + COMBINED_H + 6, 0)];
                                    return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#3b82f6" opacity="0.08" filter="url(#softShadowSm)" />;
                                })()}
                                {(() => {
                                    const gx = GARAGE_X - LOT_X, gy = GARAGE_Y - LOT_Y;
                                    const p = [toIso(gx + 6, gy + 6, 0), toIso(gx + GARAGE_W + 6, gy + 6, 0), toIso(gx + GARAGE_W + 6, gy + GARAGE_H + 6, 0), toIso(gx + 6, gy + GARAGE_H + 6, 0)];
                                    return <polygon points={p.map(pt => `${pt.x},${pt.y}`).join(' ')} fill="#94a3b8" opacity="0.06" filter="url(#softShadowSm)" />;
                                })()}

                                {/* ═══ EXISTING HOUSE — fully closed solid ═══ */}
                                {(() => {
                                    const ht = 120, hx = HOUSE_X - LOT_X, hy = HOUSE_Y - LOT_Y;
                                    const c = [
                                        toIso(hx, hy, 0), toIso(hx + HOUSE_W, hy, 0),
                                        toIso(hx + HOUSE_W, hy + HOUSE_H, 0), toIso(hx, hy + HOUSE_H, 0),
                                        toIso(hx, hy, ht), toIso(hx + HOUSE_W, hy, ht),
                                        toIso(hx + HOUSE_W, hy + HOUSE_H, ht), toIso(hx, hy + HOUSE_H, ht),
                                    ];
                                    const pts = (idxs: number[]) => idxs.map(j => `${c[j].x},${c[j].y}`).join(' ');
                                    return (
                                        <g>
                                            <polygon points={pts([2, 3, 7, 6])} fill="#8b95a5" stroke="#7a8698" strokeWidth="0.6" strokeLinejoin="round" />
                                            <polygon points={pts([1, 2, 6, 5])} fill="#8b95a5" stroke="#7a8698" strokeWidth="0.6" strokeLinejoin="round" />
                                            <polygon points={pts([0, 3, 7, 4])} fill="#9aa4b4" stroke="#7a8698" strokeWidth="0.8" strokeLinejoin="round" />
                                            <polygon points={pts([0, 1, 5, 4])} fill="#adb5c4" stroke="#7a8698" strokeWidth="0.8" strokeLinejoin="round" />
                                            <polygon points={pts([4, 5, 6, 7])} fill="#c8ced8" stroke="#9aa4b4" strokeWidth="0.8" strokeLinejoin="round" />
                                            <text x={(c[4].x + c[6].x) / 2} y={(c[4].y + c[6].y) / 2} textAnchor="middle" dominantBaseline="middle" fill="#5a6577" fontSize="10" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif">Existing House</text>
                                        </g>
                                    );
                                })()}

                                {/* ═══ GARAGE — fully closed solid ═══ */}
                                {(() => {
                                    const ht = 60, gx = GARAGE_X - LOT_X, gy = GARAGE_Y - LOT_Y;
                                    const c = [
                                        toIso(gx, gy, 0), toIso(gx + GARAGE_W, gy, 0),
                                        toIso(gx + GARAGE_W, gy + GARAGE_H, 0), toIso(gx, gy + GARAGE_H, 0),
                                        toIso(gx, gy, ht), toIso(gx + GARAGE_W, gy, ht),
                                        toIso(gx + GARAGE_W, gy + GARAGE_H, ht), toIso(gx, gy + GARAGE_H, ht),
                                    ];
                                    const pts = (idxs: number[]) => idxs.map(j => `${c[j].x},${c[j].y}`).join(' ');
                                    return (
                                        <g>
                                            <polygon points={pts([2, 3, 7, 6])} fill="#8b95a5" stroke="#7a8698" strokeWidth="0.6" strokeLinejoin="round" />
                                            <polygon points={pts([1, 2, 6, 5])} fill="#8b95a5" stroke="#7a8698" strokeWidth="0.6" strokeLinejoin="round" />
                                            <polygon points={pts([0, 3, 7, 4])} fill="#9aa4b4" stroke="#7a8698" strokeWidth="0.8" strokeLinejoin="round" />
                                            <polygon points={pts([0, 1, 5, 4])} fill="#adb5c4" stroke="#7a8698" strokeWidth="0.8" strokeLinejoin="round" />
                                            <polygon points={pts([4, 5, 6, 7])} fill="#c8ced8" stroke="#9aa4b4" strokeWidth="0.8" strokeLinejoin="round" />
                                            <text x={(c[4].x + c[6].x) / 2} y={(c[4].y + c[6].y) / 2} textAnchor="middle" dominantBaseline="middle" fill="#5a6577" fontSize="9" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif">Garage</text>
                                        </g>
                                    );
                                })()}

                                {/* ═══ PROPOSED ADU — hero blue closed solid ═══ */}
                                {(() => {
                                    const ht = 60;
                                    const ax = aduState.cx - COMBINED_W / 2 - LOT_X;
                                    const ay = aduState.cy - COMBINED_H / 2 - LOT_Y;
                                    const c = [
                                        toIso(ax, ay, 0), toIso(ax + COMBINED_W, ay, 0),
                                        toIso(ax + COMBINED_W, ay + COMBINED_H, 0), toIso(ax, ay + COMBINED_H, 0),
                                        toIso(ax, ay, ht), toIso(ax + COMBINED_W, ay, ht),
                                        toIso(ax + COMBINED_W, ay + COMBINED_H, ht), toIso(ax, ay + COMBINED_H, ht),
                                    ];
                                    const pts = (idxs: number[]) => idxs.map(j => `${c[j].x},${c[j].y}`).join(' ');
                                    const topCx = (c[4].x + c[6].x) / 2;
                                    const topCy = (c[4].y + c[6].y) / 2;

                                    return (
                                        <g>
                                            {/* All 6 faces for a watertight solid */}
                                            <polygon points={pts([0, 1, 2, 3])} fill="#2563eb" stroke="#1e3a8a" strokeWidth="0.3" strokeLinejoin="round" />
                                            <polygon points={pts([2, 3, 7, 6])} fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="0.5" strokeLinejoin="round" />
                                            <polygon points={pts([1, 2, 6, 5])} fill="#1d4ed8" stroke="#1e3a8a" strokeWidth="0.5" strokeLinejoin="round" />
                                            <polygon points={pts([0, 3, 7, 4])} fill="#2563eb" stroke="#1e40af" strokeWidth="0.8" strokeLinejoin="round" />
                                            <polygon points={pts([0, 1, 5, 4])} fill="#3b82f6" stroke="#1e40af" strokeWidth="0.8" strokeLinejoin="round" />
                                            <polygon points={pts([4, 5, 6, 7])} fill="#60a5fa" stroke="#3b82f6" strokeWidth="0.8" strokeLinejoin="round" />

                                            <text x={topCx} y={topCy - 6} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="11" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">Proposed ADU</text>
                                            <text x={topCx} y={topCy + 8} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontSize="10" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif">600 sqft</text>

                                            {/* Height callout */}
                                            {(() => {
                                                const btm = c[1], top = c[5], off = 12;
                                                const midY = (btm.y + top.y) / 2;
                                                return (
                                                    <g>
                                                        <line x1={btm.x + off} y1={btm.y} x2={top.x + off} y2={top.y} stroke="#93c5fd" strokeWidth="0.6" strokeDasharray="3,2" />
                                                        <line x1={top.x + off - 3} y1={top.y} x2={top.x + off + 3} y2={top.y} stroke="#93c5fd" strokeWidth="0.6" />
                                                        <line x1={btm.x + off - 3} y1={btm.y} x2={btm.x + off + 3} y2={btm.y} stroke="#93c5fd" strokeWidth="0.6" />
                                                        <rect x={btm.x + off + 6} y={midY - 9} width="46" height="18" rx="9" fill="#1e293b" opacity="0.85" />
                                                        <text x={btm.x + off + 29} y={midY + 1} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="8" fontWeight="600" fontFamily="system-ui, -apple-system, sans-serif">16ft Max</text>
                                                    </g>
                                                );
                                            })()}
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
        <div className={PANEL_CLASSES}>
             <div className="mb-6">
                 <PageTitle>Build Potential</PageTitle>
                 <PageSubtitle className="mt-2">
                     Your lot at <span className="italic">82-64 164th Place, Queens, 11432</span> qualifies for a <span className="font-semibold text-slate-900">Detached ADU</span>.
                 </PageSubtitle>
             </div>

             {/* Highlight Card */}
             <div className="bg-blue-50 rounded-2xl p-6 mb-2 border border-blue-100">
                 <div className="flex items-baseline gap-1.5 mb-1">
                     <span className="text-5xl font-bold text-slate-900 tracking-tight">600</span>
                     <span className="text-lg text-slate-500">sqft</span>
                 </div>
                 <div className="text-[11px] text-slate-400 tracking-widest uppercase mb-5">PROJECTED SIZE (PRESET MODULE)</div>

                 <div className="flex items-baseline gap-2 mb-1">
                     <span className="text-xl font-bold text-slate-900 tracking-tight">{ZONE_H_DISPLAY}</span>
                     <span className="text-xl text-slate-400 font-light">×</span>
                     <span className="text-xl font-bold text-slate-900 tracking-tight">{ZONE_W_DISPLAY}</span>
                 </div>
                 <div className="text-[11px] text-slate-400 tracking-widest uppercase">BUILDABLE ENVELOPE</div>
             </div>

             {/* CTA Button */}
             <button 
                onClick={() => onNavigate?.('design')}
                className="w-full bg-[#2B7FFF] hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 mb-6"
             >
                 Start Custom Design <span className="text-lg">→</span>
             </button>

             {/* Site Analysis Data */}
             <div className="space-y-0">
                 <SubsectionLabel className="mb-4">Site Analysis</SubsectionLabel>
                 
                 <div className="flex justify-between items-center py-4 border-b border-slate-100">
                     <div>
                         <div className="text-sm font-bold text-slate-900">Zoning</div>
                         <div className="text-xs text-slate-400">Optimal</div>
                     </div>
                     <div className="text-sm font-bold text-slate-900">Residential (R3-A)</div>
                 </div>

                 <div className="flex justify-between items-center py-4 border-b border-slate-100">
                     <div>
                         <div className="text-sm font-bold text-slate-900">Max Height</div>
                         <div className="text-xs text-slate-400">Standard</div>
                     </div>
                     <div className="text-sm font-bold text-slate-900">16 ft</div>
                 </div>

                 <div className="flex justify-between items-center py-4 border-b border-slate-100">
                     <div>
                         <div className="text-sm font-bold text-slate-900">Setbacks</div>
                         <div className="text-xs text-slate-400">Required</div>
                     </div>
                     <div className="text-sm font-bold text-slate-900 text-right">
                         Front 10' / Rear 20' / Side 5'
                     </div>
                 </div>

                 <div className="flex justify-between items-center py-4 border-b border-slate-100">
                     <div>
                         <div className="text-sm font-bold text-slate-900">Utility Access</div>
                         <div className="text-xs text-slate-400">Clear</div>
                     </div>
                     <div className="text-sm font-bold text-slate-900">Front Main</div>
                 </div>
             </div>

             {/* Build Strategy */}
             <div className="mt-6">
                 <SubsectionLabel className="mb-4">Build Strategy</SubsectionLabel>
                 <div className="bg-white border-2 border-blue-500 rounded-xl p-4 flex items-center gap-3">
                     <div className="w-4 h-4 rounded-full border-[4px] border-blue-500 bg-white"></div>
                     <span className="text-sm font-bold text-slate-900">Detached ADU</span>
                 </div>
             </div>

        </div>
    </div>
  );
}