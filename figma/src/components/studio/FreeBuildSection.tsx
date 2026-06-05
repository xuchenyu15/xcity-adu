import React, { useMemo, useState } from 'react';
import { ShieldCheck, TrendingUp, ChevronDown, MapPin } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { SubsectionLabel, BodyMuted } from './Typography';
import {
  type BedroomType, type AddressRentEstimate, BEDROOM_LABELS,
  getEstimatedRentForAddress,
} from './detachedAduRoi';
import {
  SPLIT_TIERS, POST_CAP_OWNER_PCT, RETURN_CAP_MULTIPLE, BUYBACK_SCHEDULE,
  calculateFreeBuild, buybackPrice,
} from './detachedAduFreeBuild';

const BLUE = '#2B7FFF';
const GREEN = '#10b981';
const BEDROOM_TYPES: BedroomType[] = ['studio', 'oneBed', 'twoBed', 'threeBed'];

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
}

export function FreeBuildSection(props: FreeBuildSectionProps) {
  const {
    address, bedroomType, sqft, rentEstimate,
    capitalPerSqft, setCapitalPerSqft,
    vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct,
    formatCurrency,
  } = props;

  const [buybackYearSel, setBuybackYearSel] = useState(5);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const baseInputs = {
    sqft, capitalPerSqft, vacancyRatePct, managementFeePct,
    monthlyInsurance, monthlyMaintenance, rentGrowthRatePct,
  };

  const fb = useMemo(
    () => calculateFreeBuild({ monthlyRent: rentEstimate.rent, ...baseInputs }),
    [rentEstimate.rent, sqft, capitalPerSqft, vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct],
  );

  const chartData = useMemo(() => fb.years.map((y) => ({
    year: y.year,
    owner: Math.round(y.ownerCumulative),
    xbuild: Math.round(y.xbuildCumulative),
  })), [fb]);

  const layoutComparison = useMemo(() => BEDROOM_TYPES.map((bt) => {
    const est = getEstimatedRentForAddress('Seattle', address, bt, sqft);
    const r = calculateFreeBuild({ monthlyRent: est.rent, ...baseInputs });
    return { bt, rent: est.rent, ownerY1: r.ownerMonthlyY1, ownerY6: r.ownerMonthlyY6 };
  }), [address, sqft, capitalPerSqft, vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct]);

  const selBuyback = buybackPrice(fb.totalCapital, buybackYearSel);

  return (
    <div className="space-y-6">

      {/* ── Hero: $0 upfront vs traditional cost ── */}
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
            Your Year 1–3 share · grows to {formatCurrency(fb.ownerMonthlyY6)}/mo in Year 6+
          </p>
        </div>
      </div>

      {/* ── Your setup (read-only, derived from address + design) ── */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-1.5 text-[13px] text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold">{rentEstimate.areaLabel}</span>
          {address ? <span className="text-slate-400">· {address}</span> : null}
        </span>
        <span className="text-[13px] text-slate-600">
          {BEDROOM_LABELS[bedroomType]} · {sqft} sqft <span className="text-slate-400">(from your design)</span>
        </span>
        <span className="text-[13px] text-slate-600">
          Benchmark rent <span className="font-bold text-emerald-600">{formatCurrency(rentEstimate.rent)}/mo</span>
        </span>
        <span className="text-[11px] text-slate-400 ml-auto">To change size or layout, go back to the Design step.</span>
      </div>

      {/* ── Your monthly income ── */}
      <div className="p-5 rounded-xl bg-white border border-slate-200">
        <SubsectionLabel className="mb-3">Your Monthly Income (no investment required)</SubsectionLabel>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-400 mb-1">Year 1–3</p>
            <p className="text-[18px] font-bold text-slate-800 tabular-nums">{formatCurrency(fb.ownerMonthlyY1)}</p>
            <p className="text-[10px] text-slate-400">/mo · 30% share</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-400 mb-1">Year 4–5</p>
            <p className="text-[18px] font-bold text-slate-800 tabular-nums">{formatCurrency(fb.ownerMonthlyY4)}</p>
            <p className="text-[10px] text-slate-400">/mo · 40% share</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <p className="text-[10px] text-emerald-600 mb-1">Year 6+</p>
            <p className="text-[18px] font-bold text-emerald-700 tabular-nums">{formatCurrency(fb.ownerMonthlyY6)}</p>
            <p className="text-[10px] text-emerald-600">/mo · 60% share</p>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
          <span className="text-[12px] text-slate-500">Your cumulative income · 10 yrs / 20 yrs</span>
          <span className="text-[14px] font-bold tabular-nums text-slate-700">
            {formatCurrency(fb.ownerCumulative10)} / {formatCurrency(fb.ownerCumulative20)}
          </span>
        </div>
      </div>

      {/* ── Buyback ── */}
      <div className="p-5 rounded-xl bg-white border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <SubsectionLabel>Buyback Path (optional exit)</SubsectionLabel>
          <TrendingUp className="w-4 h-4 text-slate-300" />
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {BUYBACK_SCHEDULE.map((r) => (
            <button
              key={r.year}
              onClick={() => setBuybackYearSel(r.year)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border tabular-nums ${
                buybackYearSel === r.year
                  ? 'bg-[#2B7FFF] text-white border-[#2B7FFF]'
                  : 'bg-white text-slate-500 border-slate-200'
              }`}
            >
              {r.year === 0 ? 'Day 1' : `Yr ${r.year}`}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
          <div>
            <p className="text-[11px] text-slate-400">
              Buy back at {buybackYearSel === 0 ? 'completion (Day 1)' : `end of Year ${buybackYearSel}`}
            </p>
            <p className="text-[20px] font-bold text-slate-800 tabular-nums">{formatCurrency(selBuyback)}</p>
            <p className="text-[10px] text-slate-400 tabular-nums">
              = {(selBuyback / fb.totalCapital).toFixed(2)}x delivered capital
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400">After buyback you keep</p>
            <p className="text-[16px] font-bold text-emerald-600 tabular-nums">{formatCurrency(fb.monthlyNetRevenue)}/mo</p>
            <p className="text-[10px] text-slate-400">100% of net revenue</p>
          </div>
        </div>
      </div>

      {/* ── Collapsible: assumptions & details ── */}
      <div className="rounded-xl bg-white border border-slate-200">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full flex items-center justify-between px-5 py-4 text-[13px] font-semibold text-slate-600"
        >
          View assumptions & details
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
        </button>

        {detailsOpen && (
          <div className="px-5 pb-5 space-y-5 border-t border-slate-100 pt-5">

            {/* Delivered capital slider */}
            <div>
              <div className="flex justify-between items-baseline mb-1.5">
                <SubsectionLabel>Total Delivered Investment (funded by XBuild)</SubsectionLabel>
                <span className="text-[12px] text-slate-400 tabular-nums">${capitalPerSqft}/sqft · {formatCurrency(fb.totalCapital)}</span>
              </div>
              <input
                type="range" min={150} max={220} step={5}
                value={capitalPerSqft}
                onChange={(e) => setCapitalPerSqft(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-[11px] text-slate-400 mt-1">Logistics · foundation · install · permits · utility hookup · furniture</p>
            </div>

            {/* Split schedule */}
            <div>
              <SubsectionLabel className="mb-2">Revenue Split Schedule (locked at signing)</SubsectionLabel>
              <div className="space-y-1.5">
                {SPLIT_TIERS.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                    <span className="text-[12px] text-slate-500">{t.label}</span>
                    <span className="text-[13px] font-bold tabular-nums text-slate-700">
                      You {Math.round(t.ownerPct * 100)}% · XBuild {Math.round((1 - t.ownerPct) * 100)}%
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-1">
                  <span className="text-[12px] text-slate-500">After XBuild reaches {RETURN_CAP_MULTIPLE}x cap</span>
                  <span className="text-[13px] font-bold tabular-nums text-emerald-600">
                    You {Math.round(POST_CAP_OWNER_PCT * 100)}% · XBuild {Math.round((1 - POST_CAP_OWNER_PCT) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Program mechanics */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">XBuild payback</p>
                <p className="text-[15px] font-bold text-slate-800">{fb.xbuildPaybackYear ? `Yr ${fb.xbuildPaybackYear}` : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">{RETURN_CAP_MULTIPLE}x cap reached</p>
                <p className="text-[15px] font-bold text-slate-800">{fb.capYear ? `Yr ${fb.capYear}` : '>20 yrs'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">XBuild 10-yr IRR</p>
                <p className="text-[15px] font-bold text-slate-800 tabular-nums">
                  {fb.xbuildIRR10 !== null ? `${(fb.xbuildIRR10 * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>

            {/* Layout comparison */}
            <div>
              <SubsectionLabel className="mb-2">Compare Layouts (same {sqft} sqft unit)</SubsectionLabel>
              <div className="space-y-1">
                {layoutComparison.map((row) => (
                  <div key={row.bt} className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${row.bt === bedroomType ? 'bg-[#2B7FFF]/5' : ''}`}>
                    <span className={`text-[12px] ${row.bt === bedroomType ? 'font-bold text-[#2B7FFF]' : 'text-slate-500'}`}>
                      {BEDROOM_LABELS[row.bt]}{row.bt === bedroomType ? ' · current' : ''}
                    </span>
                    <span className="text-[12px] tabular-nums text-slate-600">
                      rent {formatCurrency(row.rent)} · you {formatCurrency(row.ownerY1)}/mo now → {formatCurrency(row.ownerY6)}/mo Yr 6+
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div>
              <SubsectionLabel className="mb-1">Cumulative Income Split (20-Year)</SubsectionLabel>
              <p className="text-[11px] text-slate-400 mb-3">
                {rentEstimate.areaLabel} · {BEDROOM_LABELS[bedroomType]} · {sqft} sqft · Free Build revenue share
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v: number) => `$${Math.round(v / 1000)}K`} />
                  <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'owner' ? 'You (owner)' : 'XBuild']} labelFormatter={(l) => `Year ${l}`} />
                  <Line type="monotone" dataKey="owner" stroke={GREEN} strokeWidth={2} dot={false} name="owner" />
                  <Line type="monotone" dataKey="xbuild" stroke={BLUE} strokeWidth={2} dot={false} name="xbuild" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: GREEN }} /> Your cumulative income
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: BLUE }} /> XBuild cumulative (capped at {RETURN_CAP_MULTIPLE}x)
                </span>
              </div>
            </div>

            <BodyMuted className="text-[10px]">
              Assumptions: {Math.round(vacancyRatePct * 100)}% vacancy · {Math.round(managementFeePct * 100)}% management ·
              {' '}{formatCurrency(monthlyInsurance)}/mo insurance · {formatCurrency(monthlyMaintenance)}/mo maintenance ·
              {' '}{(rentGrowthRatePct * 100).toFixed(1)}%/yr rent growth. Actual results shift the timeline, not the split.
            </BodyMuted>
          </div>
        )}
      </div>
    </div>
  );
}
