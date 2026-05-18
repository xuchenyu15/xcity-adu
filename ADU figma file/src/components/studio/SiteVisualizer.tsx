import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Box, Map, AlertTriangle, Ruler, ChevronUp } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import designAxon from 'figma:asset/14c0936e977e1e63a7ef2e6238db4be085f11de8.png';
import focusPodMap from 'figma:asset/aa02773ad04f745ecac9523522cd1283927285e7.png';
import designPlan2D from 'figma:asset/a09f42c9883049d87eb085059702d9197b83d8b7.png';
import defaultMapImage from 'figma:asset/7b15af8633fedc0db6d6cfa0811ccbcc3957d530.png';
import floorPlanImage from 'figma:asset/2eab8163ce7e31f7fd3ec3b399c982cada5eceb4.png';
import selectedMapImage from 'figma:asset/8606a838cd05455cbaf21b0362e6cee5c4d5512a.png';
import massing3dDefault from 'figma:asset/fae51a05e7cc61bc40db7d6bf3340525017ba878.png';
import massing3dExterior from 'figma:asset/ec51a550f3d3c9289dc2377d981ca0c75acb1530.png';
import massing3dInterior from 'figma:asset/f7ce27699304c5378b28a3fc5758fb5d33529a8c.png';

const PLAN_IMAGE_2D = designPlan2D;
const DEFAULT_MAP_IMAGE = defaultMapImage;
const SELECTED_MAP_IMAGE = selectedMapImage;
const FLOOR_PLAN_IMAGE = floorPlanImage;

interface SiteVisualizerProps {
  projectType: 'detached' | 'interior' | 'undecided';
  constraints: {
    maxCoverage: number;
    setbacks: {
      side: number;
      rear: number;
    };
  };
  mode?: 'analysis' | 'design';
  selectedModel?: string;
  onSizeChange?: (size: number) => void;
  exteriorMaterial?: string;
  balconies?: ('left' | 'right')[];
  styleSelected?: boolean;
  floorPlanSrc?: string;
}

// ── Isometric projection helpers ──
// Standard isometric: x-axis 30° right-down, y-axis 30° left-down, z-axis up
const ISO_COS = Math.cos(Math.PI / 6); // cos(30°) ≈ 0.866
const ISO_SIN = Math.sin(Math.PI / 6); // sin(30°) = 0.5

function isoProject(x: number, y: number, z: number): [number, number] {
  const sx = (x - y) * ISO_COS;
  const sy = (x + y) * ISO_SIN - z;
  return [sx, sy];
}

function polygonPoints(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

// A fully enclosed isometric box: renders top, left-face, right-face
interface IsoBoxProps {
  x: number; y: number; z: number;
  w: number; d: number; h: number;
  topFill: string;
  leftFill: string;
  rightFill: string;
  stroke?: string;
  strokeWidth?: number;
  label?: string;
  labelColor?: string;
  labelSize?: number;
  subLabel?: string;
  subLabelColor?: string;
  heightLabel?: string;
}

function IsoBox({
  x, y, z, w, d, h,
  topFill, leftFill, rightFill,
  stroke = '#94a3b8', strokeWidth = 1,
  label, labelColor = '#334155', labelSize = 11,
  subLabel, subLabelColor = '#64748b',
  heightLabel,
}: IsoBoxProps) {
  // 8 corners
  const blf = isoProject(x, y, z);         // bottom-left-front
  const brf = isoProject(x + w, y, z);     // bottom-right-front
  const brb = isoProject(x + w, y + d, z); // bottom-right-back
  const blb = isoProject(x, y + d, z);     // bottom-left-back
  const tlf = isoProject(x, y, z + h);     // top-left-front
  const trf = isoProject(x + w, y, z + h); // top-right-front
  const trb = isoProject(x + w, y + d, z + h); // top-right-back
  const tlb = isoProject(x, y + d, z + h);     // top-left-back

  // Top face (visible)
  const topPoly = [tlf, trf, trb, tlb];
  // Front-left face (visible from left)
  const leftPoly = [blf, blb, tlb, tlf];
  // Front-right face (visible from right)
  const rightPoly = [blf, brf, trf, tlf];

  // Bottom edge lines for grounding
  const bottomFrontRight = [blf, brf];
  const bottomFrontLeft = [blf, blb];

  // Label position: center of top face
  const topCx = (tlf[0] + trf[0] + trb[0] + tlb[0]) / 4;
  const topCy = (tlf[1] + trf[1] + trb[1] + tlb[1]) / 4;

  // Height label: at right edge midpoint
  const heightMidY = (brf[1] + trf[1]) / 2;
  const heightMidX = brf[0];

  return (
    <g>
      {/* Back faces (hidden by front faces but draw for completeness at edges) */}
      {/* Right-back face */}
      <polygon
        points={polygonPoints([brf, brb, trb, trf])}
        fill={leftFill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Left-back face */}
      <polygon
        points={polygonPoints([blb, brb, trb, tlb])}
        fill={rightFill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Bottom face */}
      <polygon
        points={polygonPoints([blf, brf, brb, blb])}
        fill={topFill}
        stroke={stroke}
        strokeWidth={strokeWidth * 0.5}
        strokeLinejoin="round"
        opacity={0.3}
      />
      {/* Front-left face */}
      <polygon
        points={polygonPoints(leftPoly)}
        fill={leftFill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Front-right face */}
      <polygon
        points={polygonPoints(rightPoly)}
        fill={rightFill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Top face */}
      <polygon
        points={polygonPoints(topPoly)}
        fill={topFill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      {/* Labels */}
      {label && (
        <text
          x={topCx}
          y={topCy - (subLabel ? 4 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fill={labelColor}
          fontSize={labelSize}
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
        >
          {label}
        </text>
      )}
      {subLabel && (
        <text
          x={topCx}
          y={topCy + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fill={subLabelColor}
          fontSize={10}
          fontWeight="500"
          fontFamily="system-ui, sans-serif"
        >
          {subLabel}
        </text>
      )}

      {/* Height label with line */}
      {heightLabel && (
        <g>
          {/* Vertical line along right edge */}
          <line
            x1={heightMidX + 8}
            y1={brf[1]}
            x2={heightMidX + 8}
            y2={trf[1]}
            stroke="#64748b"
            strokeWidth={0.8}
            strokeDasharray="3,2"
          />
          {/* Top tick */}
          <line x1={heightMidX + 4} y1={trf[1]} x2={heightMidX + 12} y2={trf[1]} stroke="#64748b" strokeWidth={0.8} />
          {/* Bottom tick */}
          <line x1={heightMidX + 4} y1={brf[1]} x2={heightMidX + 12} y2={brf[1]} stroke="#64748b" strokeWidth={0.8} />
          {/* Label */}
          <rect
            x={heightMidX + 12}
            y={heightMidY - 9}
            width={50}
            height={18}
            rx={4}
            fill="white"
            stroke="#cbd5e1"
            strokeWidth={0.5}
          />
          <text
            x={heightMidX + 37}
            y={heightMidY}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#475569"
            fontSize={9}
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {heightLabel}
          </text>
        </g>
      )}
    </g>
  );
}

// Dashed isometric rectangle on the ground plane
function IsoSetbackBoundary({
  x, y, w, d,
}: {
  x: number; y: number; w: number; d: number;
}) {
  const p1 = isoProject(x, y, 0);
  const p2 = isoProject(x + w, y, 0);
  const p3 = isoProject(x + w, y + d, 0);
  const p4 = isoProject(x, y + d, 0);

  return (
    <polygon
      points={polygonPoints([p1, p2, p3, p4])}
      fill="none"
      stroke="#155dfc"
      strokeWidth={1.2}
      strokeDasharray="8,5"
      strokeLinejoin="round"
      opacity={0.5}
    />
  );
}

// Ground lot rectangle
function IsoGroundPlane({
  x, y, w, d,
}: {
  x: number; y: number; w: number; d: number;
}) {
  const p1 = isoProject(x, y, 0);
  const p2 = isoProject(x + w, y, 0);
  const p3 = isoProject(x + w, y + d, 0);
  const p4 = isoProject(x, y + d, 0);

  return (
    <polygon
      points={polygonPoints([p1, p2, p3, p4])}
      fill="#f8fafc"
      stroke="#e2e8f0"
      strokeWidth={1}
      strokeLinejoin="round"
    />
  );
}

// The full isometric massing scene
function IsometricMassing({
  simulatedSize,
  isViolation,
  showSetbacks,
  projectType,
}: {
  simulatedSize: number;
  isViolation: boolean;
  showSetbacks: boolean;
  projectType: string;
}) {
  // Scene coordinates (isometric units)
  // Lot: 80 wide x 140 deep
  const LOT_X = 0;
  const LOT_Y = 0;
  const LOT_W = 80;
  const LOT_D = 140;

  // Existing house: centered-ish, front of lot
  const HOUSE_X = 15;
  const HOUSE_Y = 20;
  const HOUSE_W = 55;
  const HOUSE_D = 35;
  const HOUSE_H = 22;

  // Garage: separate volume, right side, slightly forward
  const GARAGE_X = 40;
  const GARAGE_Y = 10;
  const GARAGE_W = 25;
  const GARAGE_D = 32;
  const GARAGE_H = 14;

  // ADU: backyard, with size based on simulatedSize
  const aduScale = Math.sqrt(simulatedSize / 600);
  const ADU_W = 40 * aduScale;
  const ADU_D = 22 * aduScale;
  const ADU_H = 16;
  const ADU_X = 10;
  const ADU_Y = 90;

  // Setback boundary (inset from lot edges)
  const SETBACK_FRONT = 5;
  const SETBACK_REAR = 12;
  const SETBACK_SIDE = 5;

  // Scale factor for SVG
  const SCALE = 3.2;

  // Calculate SVG viewBox to center everything
  // Project all corners to find bounding box
  const allPoints: [number, number][] = [
    isoProject(LOT_X * SCALE, LOT_Y * SCALE, 0),
    isoProject((LOT_X + LOT_W) * SCALE, LOT_Y * SCALE, 0),
    isoProject((LOT_X + LOT_W) * SCALE, (LOT_Y + LOT_D) * SCALE, 0),
    isoProject(LOT_X * SCALE, (LOT_Y + LOT_D) * SCALE, 0),
    isoProject(HOUSE_X * SCALE, HOUSE_Y * SCALE, HOUSE_H * SCALE),
    isoProject(ADU_X * SCALE, ADU_Y * SCALE, ADU_H * SCALE),
  ];

  const xs = allPoints.map(p => p[0]);
  const ys = allPoints.map(p => p[1]);
  const minX = Math.min(...xs) - 80;
  const maxX = Math.max(...xs) + 80;
  const minY = Math.min(...ys) - 40;
  const maxY = Math.max(...ys) + 40;

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Ground plane (lot) */}
      <IsoGroundPlane
        x={LOT_X * SCALE}
        y={LOT_Y * SCALE}
        w={LOT_W * SCALE}
        d={LOT_D * SCALE}
      />

      {/* Setback boundary */}
      {showSetbacks && (
        <IsoSetbackBoundary
          x={(LOT_X + SETBACK_SIDE) * SCALE}
          y={(LOT_Y + SETBACK_FRONT) * SCALE}
          w={(LOT_W - SETBACK_SIDE * 2) * SCALE}
          d={(LOT_D - SETBACK_FRONT - SETBACK_REAR) * SCALE}
        />
      )}

      {/* Existing House — dark gray solid volume */}
      <IsoBox
        x={HOUSE_X * SCALE}
        y={HOUSE_Y * SCALE}
        z={0}
        w={HOUSE_W * SCALE}
        d={HOUSE_D * SCALE}
        h={HOUSE_H * SCALE}
        topFill="#cbd5e1"
        leftFill="#94a3b8"
        rightFill="#a3b1c6"
        stroke="#64748b"
        strokeWidth={1.2}
        label="Existing House"
        labelColor="#475569"
        labelSize={11}
      />

      {/* Garage — separate darker gray solid */}
      <IsoBox
        x={GARAGE_X * SCALE}
        y={GARAGE_Y * SCALE}
        z={0}
        w={GARAGE_W * SCALE}
        d={GARAGE_D * SCALE}
        h={GARAGE_H * SCALE}
        topFill="#cbd5e1"
        leftFill="#94a3b8"
        rightFill="#a3b1c6"
        stroke="#64748b"
        strokeWidth={1.2}
        label="Garage"
        labelColor="#475569"
        labelSize={9}
      />

      {/* Proposed ADU — blue solid enclosed volume */}
      {(projectType === 'detached' || projectType === 'undecided') && (
        <IsoBox
          x={ADU_X * SCALE}
          y={ADU_Y * SCALE}
          z={0}
          w={ADU_W * SCALE}
          d={ADU_D * SCALE}
          h={ADU_H * SCALE}
          topFill={isViolation ? '#fca5a5' : '#93c5fd'}
          leftFill={isViolation ? '#ef4444' : '#3b82f6'}
          rightFill={isViolation ? '#f87171' : '#60a5fa'}
          stroke={isViolation ? '#b91c1c' : '#2563eb'}
          strokeWidth={1.4}
          label="Proposed ADU"
          labelColor="white"
          labelSize={10}
          subLabel={`${simulatedSize} sqft`}
          subLabelColor="rgba(255,255,255,0.85)"
          heightLabel="16ft Max"
        />
      )}

      {/* Interior conversion highlight */}
      {projectType === 'interior' && (
        <IsoBox
          x={GARAGE_X * SCALE}
          y={GARAGE_Y * SCALE}
          z={GARAGE_H * SCALE}
          w={GARAGE_W * SCALE}
          d={GARAGE_D * SCALE}
          h={4 * SCALE}
          topFill="rgba(59,130,246,0.3)"
          leftFill="rgba(59,130,246,0.2)"
          rightFill="rgba(59,130,246,0.25)"
          stroke="#3b82f6"
          strokeWidth={1.5}
          label="Target Area"
          labelColor="#2563eb"
          labelSize={9}
        />
      )}
    </svg>
  );
}

export function SiteVisualizer({
  projectType,
  constraints,
  mode = 'analysis',
  selectedModel = 'model-a',
  onSizeChange,
  exteriorMaterial = 'timber',
  balconies,
  styleSelected = false,
  floorPlanSrc,
}: SiteVisualizerProps) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [massingView, setMassingView] = useState<'exterior' | 'interior'>('exterior');
  const [show3dMenu, setShow3dMenu] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showSetbacks, setShowSetbacks] = useState(true);
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

  // Calculate dimensions for 2D floor plan view
  const baseScale = 4.5;
  const sideLength = Math.sqrt(simulatedSize) * baseScale;
  const aduWidth = sideLength * 1.2;
  const aduDepth = sideLength * 0.8;

  return (
    <div
      className="relative w-full h-full bg-slate-50 overflow-hidden shadow-inner group select-none"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* 3D Scene Container */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {/* DESIGN MODE: Show High-Quality Visuals */}
        {mode === 'design' ? (
          <div className="relative w-full h-full bg-[#f1f5f8]">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full relative"
            >
              {viewMode === '3d' ? (
                <div className="w-full h-full overflow-hidden flex items-center justify-center bg-[#f1f5f8]">
                  <ImageWithFallback
                    src={
                      !styleSelected
                        ? massing3dDefault
                        : massingView === 'interior'
                          ? massing3dInterior
                          : massing3dExterior
                    }
                    alt={`3D Massing ${!styleSelected ? 'default' : massingView}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-[#f1f5f8] flex items-center justify-center overflow-hidden">
                  {/* Wrapper matches image aspect ratio so overlay % align with image content */}
                  <div className="relative" style={{ aspectRatio: '1030 / 837', maxWidth: '100%', maxHeight: '100%' }}>
                    <ImageWithFallback
                      src={styleSelected ? SELECTED_MAP_IMAGE : DEFAULT_MAP_IMAGE}
                      alt="Site Plan 2D"
                      className="w-full h-full block"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        ) : viewMode === '2d' ? (
          /* 2D PLAN VIEW with CSS */
          <motion.div
            className="relative w-[1000px] h-[1000px] bg-[#f1f5f8]"
            animate={{ rotateX: 0, rotateZ: 0, scale: zoom }}
            transition={{ duration: 0.8, type: 'spring', bounce: 0.15 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Grid */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            {/* Lot */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[700px] bg-white shadow-xl border-[3px] border-[#010101]"
              style={{ transformStyle: 'preserve-3d' }}
            >

              {/* Setbacks */}
              <AnimatePresence>
                {showSetbacks && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 pointer-events-none"
                  >
                    <div className="absolute top-[10px] bottom-[60px] left-[24px] right-[24px] border-2 border-dashed border-[#155dfc]" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main House (2D) */}
              <div className="absolute bg-[#CBD5E1]" style={{ left: 40, top: 120, width: 280, height: 180 }}>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-[#64748b]">Existing House</span>
              </div>

              {/* Garage (2D) */}
              <div className="absolute bg-[#EDF1F6]" style={{ left: 220, top: 60, width: 140, height: 180 }}>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-[#94a3b8]">Garage</span>
              </div>

              {/* ADU (2D) */}
              {(projectType === 'detached' || projectType === 'undecided') && (
                <div
                  className={`absolute shadow-lg transition-all duration-300 bg-white ${isViolation ? 'ring-4 ring-red-500/50' : 'ring-1 ring-slate-200'}`}
                  style={{
                    width: aduWidth,
                    height: aduDepth,
                    left: isViolation ? 60 : 80,
                    top: 500,
                  }}
                >
                  <ImageWithFallback
                    src={FLOOR_PLAN_IMAGE}
                    alt="Floor Plan"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-slate-500 whitespace-nowrap bg-white/80 px-1 rounded">
                    {Math.round(aduWidth / baseScale)}' x {Math.round(aduDepth / baseScale)}'
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* 3D ISOMETRIC MASSING VIEW — SVG */
          <div className="w-full h-full flex items-center justify-center p-8">
            <IsometricMassing
              simulatedSize={simulatedSize}
              isViolation={isViolation}
              showSetbacks={showSetbacks}
              projectType={projectType}
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
            onClick={() => { setViewMode('2d'); setShow3dMenu(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              viewMode === '2d'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Map className="w-4 h-4" />
            2D Map
          </button>
          <div className="relative">
            <button
              onClick={() => {
                if (viewMode === '3d') {
                  setShow3dMenu(!show3dMenu);
                } else {
                  setViewMode('3d');
                  setShow3dMenu(false);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                viewMode === '3d'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Box className="w-4 h-4" />
              3D Massing
              {viewMode === '3d' && (
                <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 ${show3dMenu ? '' : 'rotate-180'}`} />
              )}
            </button>

            {/* Drop-up segmented menu */}
            <AnimatePresence>
              {show3dMenu && viewMode === '3d' && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 mb-2 p-1 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl"
                >
                  <div className="flex flex-col gap-0.5 min-w-[140px]">
                    {(['exterior', 'interior'] as const).map((view) => (
                      <button
                        key={view}
                        onClick={() => {
                          setMassingView(view);
                          setShow3dMenu(false);
                        }}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${
                          massingView === view
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        {view === 'exterior' ? 'Exterior' : 'Interior'}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <button
            onClick={() => setShowSetbacks(!showSetbacks)}
            className={`p-2.5 rounded-xl transition-all ${showSetbacks ? 'bg-blue-50 text-[#155dfc]' : 'text-slate-400 hover:text-slate-600'}`}
            title="Toggle Setbacks"
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