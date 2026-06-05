import React, { useMemo, useState } from 'react';
import { ShieldCheck, ChevronDown, MapPin } from 'lucide-react';
import { SectionTitle, SubsectionLabel, BodyMuted } from './Typography';
import { type BedroomType, type AddressRentEstimate, BEDROOM_LABELS } from './detachedAduRoi';
import {
  POST_CAP_OWNER_PCT, RETURN_CAP_MULTIPLE,
  calculateFreeBuild, computeBuybackSchedule,
} from './detachedAduFreeBuild';
import { ExitBuybackModule } from './ExitBuybackModule';

// Capital breakdown ratios (from program spec example: 52/33/18/20 of 123k)
const CAPITAL_ITEMS: { label: string; ratio: number }[] = [
  { label: 'Prefab Construction & Shipping', ratio: 0.423 },
  { label: 'Site Construction & Installation', ratio: 0.268 },
  { label: 'Architectural Design & Permits', ratio: 0.146 },
  { label: 'Furniture & Delivery', ratio: 0.163 },
];

interface FreeBuildSectionProps {
  address?: string;
  bedroomType: BedroomType;
  sqft: number;
  rentEstimate: AddressRentEstimate;
  capitalPerSqft: number;
  setCapitalPerSqft: (n: number) => void;
  vacancyRatePct: number;
  managementFeePct: number;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  rentGrowthRatePct: number;
  formatCurrency: (n: number) => string;
  breakdownOpen: boolean;
  setBreakdownOpen: (b: boolean) => void;
  // Exit module state (owned by ValuePlanner)
  buyBackYear: number | null;
  setBuyBackYear: (year: number) => void;
  lockState: 'unlocked' | 'cooling' | 'final';
  onLock: () => void;
  selectedAdjustments?: { label: string; impact: string }[];
}

export function FreeBuildSection(props: FreeBuildSectionProps) {
  const {
    address, bedroomType, sqft, rentEstimate,
    capitalPerSqft, setCapitalPerSqft,
    vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct,
    formatCurrency, breakdownOpen, setBreakdownOpen,
    buyBackYear, setBuyBackYear, lockState, onLock, selectedAdjustments,
  } = props;

  // Tunable program parameters (debug sliders in breakdown)
  const [tier1Pct, setTier1Pct] = useState(30);   // owner % Year 1–3
  const [tier2Pct, setTier2Pct] = useState(40);   // owner % Year 4–5
  const [tier3Pct, setTier3Pct] = useState(60);   // owner % Year 6+
  const [accrualPct, setAccrualPct] = useState(8);     // capital accrual %/yr
  const [premiumPct, setPremiumPct] = useState(10);    // Day-1 completion premium %

  const fb = useMemo(() => calculateFreeBuild({
    monthlyRent: rentEstimate.rent, sqft, capitalPerSqft,
    vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct,
    ownerTierPcts: [tier1Pct / 100, tier2Pct / 100, tier3Pct / 100],
  }), [rentEstimate.rent, sqft, capitalPerSqft, vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct, tier1Pct, tier2Pct, tier3Pct]);

  // Cumulative owner income, years 0..10, for the exit chart
  const ownerSeries = useMemo(
    () => [0, ...fb.years.slice(0, 10).map((y) => Math.round(y.ownerCumulative))],
    [fb],
  );

  const buyback = useMemo(
    () => computeBuybackSchedule(
      fb.totalCapital,
      fb.years.map((y) => y.xbuildIncome),
      accrualPct / 100,
      premiumPct / 100,
    ),
    [fb, accrualPct, premiumPct],
  );
  const fbMultipliers = useMemo(() => {
    const m: Record<number, number> = {};
    buyback.forEach((r) => { m[r.year] = r.multiple; });
    return m;
  }, [buyback]);

  return (
    <div>
      {/* ═══ 1. FINANCIAL SNAPSHOT ═══ */}
      <SubsectionLabel className="mb-3">Financial Snapshot</SubsectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white border border-slate-200">
          <p className="text-[34px] font-bold text-slate-900 leading-none">
            $0 <span className="text-[15px] font-semibold text-slate-400">Upfront</span>
          </p>
          <p className="text-[13px] text-slate-400 mt-2">
            <span className="line-through">{formatCurrency(fb.totalCapital)}</span> traditional cost
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> XBuild funds, builds and operates. You share the rental income.
          </p>
        </div>
        <div className="p-6 rounded-xl bg-[#2B7FFF]/5 border border-[#2B7FFF]/15">
          <p className="text-[34px] font-bold text-[#2B7FFF] leading-none">
            +{formatCurrency(fb.ownerMonthlyY1)} <span className="text-[15px] font-semibold text-[#2B7FFF]/60">/ mo</span>
          </p>
          <p className="text-[13px] text-slate-400 mt-2">
            Your {tier1Pct}% share (Year 1–3) · Year 4–5 {formatCurrency(fb.ownerMonthlyY4)}/mo · Year 6+ {formatCurrency(fb.ownerMonthlyY6)}/mo
          </p>
        </div>
      </div>

      {/* context line */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 px-1">
        <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold">{rentEstimate.areaLabel}</span>
          {address ? <span className="text-slate-400">· {address}</span> : null}
        </span>
        <span className="text-[12px] text-slate-500">
          {BEDROOM_LABELS[bedroomType]} · {sqft} sqft <span className="text-slate-400">(from your design)</span>
        </span>
        <span className="text-[12px] text-slate-500">
          Benchmark rent <span className="font-bold text-emerald-600">{formatCurrency(rentEstimate.rent)}/mo</span>
        </span>
      </div>

      {/* breakdown toggle */}
      <button
        onClick={() => setBreakdownOpen(!breakdownOpen)}
        className="flex items-center gap-1.5 mt-4 text-[13px] font-semibold text-[#2B7FFF]"
      >
        {breakdownOpen ? 'Hide financial breakdown' : 'View financial breakdown'}
        <ChevronDown className={`w-4 h-4 transition-transform ${breakdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {breakdownOpen && (
        <div className="mt-4 p-6 rounded-xl bg-white border border-slate-200 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Capital breakdown */}
          <div>
            <SubsectionLabel className="mb-3">Capital Breakdown</SubsectionLabel>
            <div className="space-y-2">
              {CAPITAL_ITEMS.map((it) => (
                <div key={it.label} className="flex justify-between items-center py-1">
                  <span className="text-[13px] text-slate-500">{it.label}</span>
                  <span className="text-[13px] font-bold tabular-nums text-slate-700">
                    {formatCurrency(Math.round(fb.totalCapital * it.ratio / 1000) * 1000)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[12px] text-slate-500">Total Delivered Investment</span>
                <span className="text-[13px] font-bold tabular-nums text-slate-700">${capitalPerSqft}/sqft · {formatCurrency(fb.totalCapital)}</span>
              </div>
              <input
                type="range" min={150} max={220} step={5}
                value={capitalPerSqft}
                onChange={(e) => setCapitalPerSqft(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <BodyMuted className="mt-2 text-[11px]">
              Capital fully funded by XBuild. Buyback based on deployed capital.
            </BodyMuted>
          </div>

          {/* Income assumptions + split schedule */}
          <div>
            <SubsectionLabel className="mb-3">Income Assumptions</SubsectionLabel>
            <div className="space-y-2">
              <div className="flex justify-between py-1"><span className="text-[13px] text-slate-500">Benchmark Rent</span><span className="text-[13px] font-bold tabular-nums text-slate-700">{formatCurrency(rentEstimate.rent)} / mo</span></div>
              <div className="flex justify-between py-1"><span className="text-[13px] text-slate-500">Rent Growth</span><span className="text-[13px] font-bold tabular-nums text-slate-700">{(rentGrowthRatePct * 100).toFixed(0)}% / yr (est.)</span></div>
              <div className="flex justify-between py-1"><span className="text-[13px] text-slate-500">Vacancy</span><span className="text-[13px] font-bold tabular-nums text-slate-700">{(vacancyRatePct * 100).toFixed(0)}% (est.)</span></div>
              <div className="flex justify-between py-1"><span className="text-[13px] text-slate-500">Management · Insurance · Maintenance</span><span className="text-[13px] font-bold tabular-nums text-slate-700">{(managementFeePct * 100).toFixed(0)}% · {formatCurrency(monthlyInsurance)} · {formatCurrency(monthlyMaintenance)}</span></div>
            </div>
            <SubsectionLabel className="mt-4 mb-2">Revenue Split (locked at signing · adjustable for tuning)</SubsectionLabel>
            <div className="space-y-2.5">
              {([
                ['Year 1–3 · Capital recovery', tier1Pct, setTier1Pct],
                ['Year 4–5 · Profit phase', tier2Pct, setTier2Pct],
                ['Year 6+ · Long-term partnership', tier3Pct, setTier3Pct],
              ] as [string, number, (n: number) => void][]).map(([label, val, set]) => (
                <div key={label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[12px] text-slate-500">{label}</span>
                    <span className="text-[12px] font-bold tabular-nums text-slate-700">You {val}% · XBuild {100 - val}%</span>
                  </div>
                  <input type="range" min={10} max={80} step={5} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full" />
                </div>
              ))}
              <div className="flex justify-between py-0.5">
                <span className="text-[12px] text-slate-500">After XBuild reaches {RETURN_CAP_MULTIPLE}x cap</span>
                <span className="text-[12px] font-bold tabular-nums text-emerald-600">You {Math.round(POST_CAP_OWNER_PCT * 100)}%</span>
              </div>
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[12px] text-slate-500">Capital accrual rate (buyback payoff)</span>
                  <span className="text-[12px] font-bold tabular-nums text-slate-700">{accrualPct}% / yr</span>
                </div>
                <input type="range" min={4} max={18} step={1} value={accrualPct} onChange={(e) => setAccrualPct(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <div className="flex justify-between mb-0.5">
                  <span className="text-[12px] text-slate-500">Day-1 completion premium</span>
                  <span className="text-[12px] font-bold tabular-nums text-slate-700">{premiumPct}%</span>
                </div>
                <input type="range" min={5} max={20} step={1} value={premiumPct} onChange={(e) => setPremiumPct(Number(e.target.value))} className="w-full" />
              </div>
            </div>
            <BodyMuted className="mt-2 text-[11px]">
              Net income = rent − vacancy − management − insurance − maintenance, then split. Buyback = X·(1+accrual)^year − XBuild's cumulative share, capped so XBuild's total take ≤ {RETURN_CAP_MULTIPLE}x.
            </BodyMuted>
          </div>
        </div>
      )}

      {/* ═══ 2. CHOOSE YOUR EXIT TIMING ═══ */}
      <div className="mt-12">
        <div className="mb-4">
          <SectionTitle>Choose Your Exit Timing</SectionTitle>
          <BodyMuted className="mt-1">
            Select the year you'd like to buy back the ADU. Earlier exits cost more; longer holds earn more income.
          </BodyMuted>
        </div>
        <ExitBuybackModule
          buyBackYear={buyBackYear}
          setBuyBackYear={setBuyBackYear}
          lockState={lockState}
          onLock={onLock}
          fmtCurrency={formatCurrency}
          ANNUAL_NET={fb.ownerMonthlyY1 * 12}
          CONSTRUCTION_COST={fb.totalCapital}
          INFLATION_RATE={rentGrowthRatePct}
          selectedAdjustments={selectedAdjustments}
          incomeSeries={ownerSeries}
          buybackMultipliers={fbMultipliers}
          shareNote={`tiered revenue share (you ${tier1Pct}% → ${tier3Pct}%)`}
        />
      </div>
    </div>
  );
}
