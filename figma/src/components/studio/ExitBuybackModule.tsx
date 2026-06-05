import React, { useMemo, useRef, useCallback, useState } from 'react';
import { ArrowRight, Check, Lock, Clock, Scale, TrendingUp } from 'lucide-react';
import { SectionTitle, SubsectionLabel, BodyMuted } from './Typography';
import { type ROIInputs, getExitScenarios } from './detachedAduRoi';

const BLUE = '#2B7FFF';

type LockState = 'unlocked' | 'cooling' | 'final';

interface ExitBuybackModuleProps {
  buyBackYear: number | null;
  setBuyBackYear: (year: number) => void;
  lockState: LockState;
  onLock: () => void;
  fmtCurrency: (n: number) => string;
  ANNUAL_NET: number;
  CONSTRUCTION_COST: number;
  INFLATION_RATE: number;
  selectedAdjustments?: { label: string; impact: string }[];
  roiInputs?: ROIInputs;
  /** Precomputed cumulative income by year (index 0..10). Overrides internal calc. */
  incomeSeries?: number[];
  /** Override buyback multipliers (e.g. Free Build schedule with Day-1 premium). */
  buybackMultipliers?: Record<number, number>;
  /** Note appended to the chart subtitle (e.g. revenue-share description). */
  shareNote?: string;
}

const MAX_YEAR = 10;
const YEAR_LABELS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const BUYBACK_MULTIPLIERS: Record<number, number> = {
  0: 1.10, 1: 1.08, 2: 1.07, 3: 1.06, 4: 1.05,
  5: 1.04, 6: 1.03, 7: 1.02, 8: 1.03, 9: 1.04, 10: 1.05,
};

const GUIDANCE_BLOCKS = [
  { icon: Clock, label: 'Early Exit (1–3 yrs)', focus: 'Liquidity', tradeoff: 'Lower total return' },
  { icon: Scale, label: 'Mid Hold (4–6 yrs)', focus: 'Balanced growth', tradeoff: 'Moderate capital lock-in' },
  { icon: TrendingUp, label: 'Long Hold (7–10 yrs)', focus: 'Maximum cumulative income', tradeoff: 'Longer liquidity horizon' },
];

function formatPct(r: number | null) {
  if (r === null || !isFinite(r) || isNaN(r)) return '—';
  return `${(r * 100).toFixed(1)}%`;
}

export function ExitBuybackModule({
  buyBackYear,
  setBuyBackYear,
  lockState,
  onLock,
  fmtCurrency,
  ANNUAL_NET,
  CONSTRUCTION_COST,
  INFLATION_RATE,
  selectedAdjustments,
  roiInputs,
  incomeSeries,
  buybackMultipliers,
  shareNote,
}: ExitBuybackModuleProps) {
  const MULTIPLIERS = buybackMultipliers ?? BUYBACK_MULTIPLIERS;
  const hasSelection = buyBackYear !== null;
  const year = hasSelection ? Math.min(Math.max(buyBackYear, 0), MAX_YEAR) : null;
  const isLocked = lockState !== 'unlocked';

  const [hoverYear, setHoverYear] = useState<number | null>(null);

  // Compute cumulative income series using real ANNUAL_NET
  const monthlyNet = ANNUAL_NET / 12;
  const RENT_GROWTH = INFLATION_RATE;

  const cumulativeData = useMemo(() => {
    if (incomeSeries && incomeSeries.length >= MAX_YEAR + 1) return incomeSeries.slice(0, MAX_YEAR + 1);
    const data: number[] = [0];
    let cumulative = 0;
    for (let yr = 1; yr <= MAX_YEAR; yr++) {
      const monthlyShare = monthlyNet * Math.pow(1 + RENT_GROWTH, yr - 1);
      cumulative += monthlyShare * 12;
      data.push(Math.round(cumulative));
    }
    return data;
  }, [incomeSeries, monthlyNet, RENT_GROWTH]);

  const estRentData = useMemo(() => {
    const baseMonthlyRent = roiInputs?.monthlyRent ?? 2900;
    return Array.from({ length: MAX_YEAR + 1 }, (_, yr) =>
      Math.round(baseMonthlyRent * Math.pow(1 + RENT_GROWTH, yr))
    );
  }, [roiInputs?.monthlyRent, RENT_GROWTH]);

  // Exit scenarios (5 / 10 / 20 years)
  const exitScenarios = useMemo(() => {
    if (!roiInputs) return null;
    return getExitScenarios(roiInputs);
  }, [roiInputs]);

  const multiplier = year !== null ? MULTIPLIERS[year] : 0;
  const buyBackPrice = year !== null ? Math.round(CONSTRUCTION_COST * multiplier) : 0;
  const incomeEarned = year !== null ? cumulativeData[year] : 0;
  const estRent = year !== null ? estRentData[year] : 0;

  const hoverMultiplier = hoverYear !== null ? MULTIPLIERS[hoverYear] : 0;
  const hoverBuyback = hoverYear !== null ? Math.round(CONSTRUCTION_COST * hoverMultiplier) : 0;

  const coolingDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const SVG_W = 560;
  const SVG_H = 340;
  const PAD = { top: 24, right: 24, bottom: 56, left: 60 };
  const chartW = SVG_W - PAD.left - PAD.right;
  const chartH = SVG_H - PAD.top - PAD.bottom;

  const maxVal = useMemo(() => {
    const step = 50000;
    return Math.ceil(cumulativeData[MAX_YEAR] / step) * step || 100000;
  }, [cumulativeData]);

  const yGridValues = useMemo(() => {
    const steps = 4;
    const increment = maxVal / steps;
    return Array.from({ length: steps + 1 }, (_, i) => Math.round(i * increment));
  }, [maxVal]);

  const points = useMemo(() => {
    return cumulativeData.map((val, i) => ({
      x: PAD.left + (i / MAX_YEAR) * chartW,
      y: PAD.top + chartH - (val / maxVal) * chartH,
      val,
      year: i,
    }));
  }, [cumulativeData, chartW, chartH, maxVal]);

  const curvePath = useMemo(() => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const tension = 0.4;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [points]);

  const areaPath = curvePath
    + ` L ${points[points.length - 1].x} ${PAD.top + chartH}`
    + ` L ${points[0].x} ${PAD.top + chartH} Z`;

  const selectedPoint = year !== null ? points[year] : null;

  const fmtK = (n: number) => {
    if (n === 0) return '$0';
    if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}K`;
    return `$${n}`;
  };

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const resolveYearFromX = useCallback((clientX: number): number | undefined => {
    const container = chartContainerRef.current;
    if (!container) return undefined;
    const svg = container.querySelector('svg');
    if (!svg) return undefined;
    const rect = svg.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * SVG_W;
    const ratio = (svgX - PAD.left) / chartW;
    const clamped = Math.max(0, Math.min(1, ratio));
    return Math.round(clamped * MAX_YEAR);
  }, [chartW]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (lockState === 'final') return;
    isDragging.current = true;
    const yr = resolveYearFromX(e.clientX);
    if (yr !== undefined) setBuyBackYear(yr);
    const onMove = (ev: MouseEvent) => {
      if (isDragging.current) {
        const y = resolveYearFromX(ev.clientX);
        if (y !== undefined) setBuyBackYear(y);
      }
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [resolveYearFromX, setBuyBackYear, lockState]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current || lockState === 'final') return;
    const yr = resolveYearFromX(e.clientX);
    if (yr !== undefined) setHoverYear(yr);
  }, [resolveYearFromX, lockState]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging.current) setHoverYear(null);
  }, []);

  const hoverPoint = hoverYear !== null ? points[hoverYear] : null;

  return (
    <div className="space-y-6">
      {/* ─── Exit Year Selector Chart ─── */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="px-8 pt-8 pb-4">
          <h3 className="text-[20px] font-semibold tracking-tight text-slate-900 mb-2">Asset Growth & Exit Value</h3>
          <p className="text-[14px] font-medium text-slate-500">
            Cumulative Net Cash Flow (USD) · {(RENT_GROWTH * 100).toFixed(1)}% annual growth{shareNote ? ` · ${shareNote}` : ''}
          </p>
        </div>

        <div className="px-8 pb-6 flex flex-col lg:flex-row gap-6">
          {/* LEFT: Chart */}
          <div
            ref={chartContainerRef}
            className={`flex-1 min-w-0 select-none ${lockState === 'final' ? 'cursor-default' : 'cursor-pointer'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE} stopOpacity="0.12" />
                  <stop offset="60%" stopColor={BLUE} stopOpacity="0.04" />
                  <stop offset="100%" stopColor={BLUE} stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {yGridValues.map((val) => {
                const gy = PAD.top + chartH - (val / maxVal) * chartH;
                return (
                  <g key={val}>
                    <line x1={PAD.left} y1={gy} x2={SVG_W - PAD.right} y2={gy} stroke="#f1f5f9" strokeWidth="1" />
                    <text x={PAD.left - 10} y={gy + 4} textAnchor="end" fill="#94a3b8" fontSize="12" fontFamily="system-ui, sans-serif">
                      {fmtK(val)}
                    </text>
                  </g>
                );
              })}

              <line x1={PAD.left} y1={PAD.top + chartH} x2={SVG_W - PAD.right} y2={PAD.top + chartH} stroke="#e2e8f0" strokeWidth="1" />

              {points.map((p, i) => (
                <text key={`yr-${i}`} x={p.x} y={PAD.top + chartH + 20} textAnchor="middle"
                  fill={i === year ? '#0f172a' : i === hoverYear ? '#64748b' : '#94a3b8'}
                  fontSize="12" fontWeight={i === year ? 600 : 400} fontFamily="system-ui, sans-serif">
                  {YEAR_LABELS[i]}
                </text>
              ))}

              <text x={PAD.left + chartW / 2} y={PAD.top + chartH + 46} textAnchor="middle" fill="#64748b" fontSize="13" fontWeight="500" fontFamily="system-ui, sans-serif">
                Exit Year
              </text>

              <path d={areaPath} fill="url(#blueAreaGrad)" />
              <path d={curvePath} fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {hoverYear !== null && hoverYear !== year && (() => {
                const hp = points[hoverYear];
                return <line x1={hp.x} y1={PAD.top} x2={hp.x} y2={PAD.top + chartH} stroke={BLUE} strokeWidth="1" strokeDasharray="3 3" opacity="0.15" />;
              })()}

              {selectedPoint && (
                <line x1={selectedPoint.x} y1={PAD.top} x2={selectedPoint.x} y2={PAD.top + chartH}
                  stroke={BLUE} strokeWidth={isLocked ? 1.5 : 1} strokeDasharray={isLocked ? 'none' : '4 3'} opacity={isLocked ? 0.5 : 0.3} />
              )}

              {points.map((p, i) => {
                const isSelected = year !== null && i === year;
                const isHovered = hoverYear !== null && i === hoverYear && i !== year;
                if (isSelected) return <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={5.5} fill={BLUE} stroke="white" strokeWidth="2.5" />;
                if (isHovered) return <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={4} fill={BLUE} stroke="white" strokeWidth="2" opacity="0.6" />;
                return <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={2.5}
                  fill={hasSelection && year !== null && i < year ? BLUE : '#cbd5e1'} stroke="white" strokeWidth="1"
                  opacity={hasSelection && year !== null && i < year ? 0.5 : 0.4} />;
              })}

              {hoverYear !== null && hoverYear !== year && hoverPoint && (() => {
                const pillText = `Year ${hoverYear} · ${fmtCurrency(hoverBuyback)} · ${hoverMultiplier.toFixed(2)}×`;
                const pillW = pillText.length * 5.2 + 16;
                const pillH = 22;
                const pillX = Math.max(PAD.left, Math.min(hoverPoint.x - pillW / 2, SVG_W - PAD.right - pillW));
                const pillY = Math.max(PAD.top, hoverPoint.y - 30);
                return (
                  <g>
                    <rect x={pillX} y={pillY} width={pillW} height={pillH} rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.06))" />
                    <text x={pillX + pillW / 2} y={pillY + pillH / 2 + 3.5} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="500" fontFamily="system-ui, sans-serif">
                      {pillText}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* RIGHT: Decision Panel */}
          <div className="lg:w-[240px] shrink-0 flex flex-col">
            {!hasSelection ? (
              <div className="flex flex-col h-full">
                <div className="mb-5">
                  <span className="text-[15px] font-semibold tracking-tight text-slate-900">Choose Your Exit Timing</span>
                </div>
                <p className="text-[12.5px] text-slate-500 leading-relaxed mb-6">
                  Exiting earlier lowers risk and shortens capital lock-in. Holding longer increases cumulative income but delays liquidity.
                </p>
                <div className="space-y-3">
                  {GUIDANCE_BLOCKS.map((block, i) => {
                    const Icon = block.icon;
                    return (
                      <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.8} />
                          <span className="text-[12px] font-semibold text-slate-700">{block.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 pl-[22px]">Focus: <span className="text-slate-500">{block.focus}</span></div>
                        <div className="text-[11px] text-slate-400 pl-[22px] mt-0.5">Trade-off: <span className="text-slate-500">{block.tradeoff}</span></div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
                  Select a year on the chart to preview buyback value and projected returns.
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="mb-5">
                  <span className="text-xs text-slate-400">Selected</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-bold tracking-tight text-slate-900">Year {year}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <SubsectionLabel>Buyback</SubsectionLabel>
                    <div className="text-2xl font-bold tracking-tight text-[#2B7FFF] mt-0.5">{fmtCurrency(buyBackPrice)}</div>
                  </div>
                  <div>
                    <SubsectionLabel>Multiplier</SubsectionLabel>
                    <div className="text-[14px] font-semibold text-slate-900 mt-0.5">{multiplier.toFixed(2)}×</div>
                  </div>
                  <div>
                    <SubsectionLabel>Cumulative Net Income</SubsectionLabel>
                    <div className="text-[14px] text-slate-700 mt-0.5">{year === 0 ? '—' : fmtCurrency(incomeEarned)}</div>
                  </div>
                  <div>
                    <SubsectionLabel>Est. Monthly Rent</SubsectionLabel>
                    <div className="text-[14px] text-slate-500 mt-0.5">${estRent.toLocaleString()}/mo</div>
                  </div>
                </div>

                <div className="border-t border-slate-100 mb-5" />

                {selectedAdjustments && selectedAdjustments.length > 0 && (
                  <div className="mb-5">
                    <SubsectionLabel className="mb-2.5">Return Adjustments</SubsectionLabel>
                    <div className="space-y-2">
                      {selectedAdjustments.map((adj, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-[12px] text-slate-500">{adj.label}</span>
                          <span className="text-[11px] font-semibold text-emerald-600">{adj.impact}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 mt-4 pt-3 flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-slate-900">Net Adjusted Return</span>
                      <span className="text-[14px] font-semibold text-[#2B7FFF]">
                        {year === 0 ? fmtCurrency(buyBackPrice) : fmtCurrency(incomeEarned + buyBackPrice)}
                      </span>
                    </div>
                    <div className="border-t border-slate-100 mt-3 mb-0" />
                  </div>
                )}

                {lockState === 'unlocked' && (
                  <div>
                    <button onClick={onLock} className="w-full h-10 bg-[#2B7FFF] text-white rounded-xl text-[15px] font-medium flex items-center justify-center gap-1.5 hover:bg-blue-600 transition-colors active:scale-[0.98] cursor-pointer">
                      Lock Year {year} Buyback <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                      <span className="text-slate-300 mr-1">&#8226;</span>15-day modification window
                      <span className="text-slate-300 mx-1.5">&#8226;</span>Multiplier fixed after confirmation
                    </p>
                  </div>
                )}

                {lockState === 'cooling' && (
                  <div>
                    <button onClick={onLock} className="w-full h-10 bg-[#2B7FFF] text-white rounded-xl text-[15px] font-medium flex items-center justify-center gap-1.5 hover:bg-blue-600 transition-colors cursor-pointer">
                      <Check className="w-3.5 h-3.5" /> Locked at Year {year}
                    </button>
                    <p className="text-[11px] text-slate-400 mt-2.5">Cooling-off until {coolingDate}</p>
                  </div>
                )}

                {lockState === 'final' && (
                  <div>
                    <button disabled className="w-full h-10 bg-slate-100 text-slate-400 rounded-xl text-[15px] font-medium flex items-center justify-center gap-1.5 cursor-not-allowed">
                      <Lock className="w-3.5 h-3.5" /> Locked · Final
                    </button>
                    <p className="text-[11px] text-slate-400 mt-2.5">Multiplier secured at {multiplier.toFixed(2)}×</p>
                  </div>
                )}

                <p className="text-[10px] text-slate-300 mt-auto pt-4 leading-relaxed">
                  Projections are estimates only. Actual rental income and buyback value may vary with market conditions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Detached ADU Exit Scenarios ─── */}
      {exitScenarios && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <div className="mb-5">
            <h3 className="text-[16px] font-semibold text-slate-900">Detached ADU Exit Scenarios</h3>
            <p className="text-[13px] text-slate-400 mt-1">
              Long-term hold projections based on your current ROI inputs. All figures assume rent grows at {((roiInputs?.rentGrowthRatePct ?? 0.03) * 100).toFixed(1)}%/yr.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exitScenarios.map((scenario) => {
              const isPositive = scenario.cumulativeNetCashFlow >= 0;
              return (
                <div key={scenario.years} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-semibold text-slate-800">{scenario.label}</span>
                    {scenario.irr !== null && (
                      <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                        scenario.irr > 0 ? 'bg-[#2B7FFF]/10 text-[#2B7FFF]' : 'bg-red-50 text-red-500'
                      }`}>
                        IRR {formatPct(scenario.irr)}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-[11px] text-slate-400">Cumulative Gross Rent</span>
                      <span className="text-[11px] font-semibold text-slate-700 tabular-nums">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(scenario.cumulativeRent)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-slate-400">Cumulative Net Cash Flow</span>
                      <span className={`text-[12px] font-bold tabular-nums ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(scenario.cumulativeNetCashFlow)}
                      </span>
                    </div>
                    {scenario.irr !== null && (
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="text-[11px] text-slate-400">IRR on Equity</span>
                        <span className={`text-[12px] font-bold tabular-nums ${scenario.irr > 0 ? 'text-[#2B7FFF]' : 'text-red-500'}`}>
                          {formatPct(scenario.irr)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-300 mt-4">
            IRR reflects return on equity invested (down payment). Does not include potential property appreciation or sale proceeds.
            Projections are estimates only.
          </p>
        </div>
      )}
    </div>
  );
}
