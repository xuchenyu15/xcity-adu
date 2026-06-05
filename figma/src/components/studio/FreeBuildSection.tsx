import React, { useMemo, useState } from 'react';
import { ShieldCheck, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { SubsectionLabel, BodyMuted } from './Typography';
import {
  type BedroomType, type RentEstimate, BEDROOM_LABELS, BEDROOM_DEFAULT_SQFT, SEATTLE_NEIGHBORHOODS,
} from './detachedAduRoi';
import {
  SPLIT_TIERS, POST_CAP_OWNER_PCT, RETURN_CAP_MULTIPLE, BUYBACK_SCHEDULE,
  calculateFreeBuild, buybackPrice,
} from './detachedAduFreeBuild';

const BLUE = '#2B7FFF';
const GREEN = '#10b981';
const BEDROOM_TYPES: BedroomType[] = ['studio', 'oneBed', 'twoBed', 'threeBed'];
const SQFT_PRESETS = [350, 500, 600, 750];

interface FreeBuildSectionProps {
  neighborhood: string;
  setNeighborhood: (s: string) => void;
  bedroomType: BedroomType;
  setBedroomType: (b: BedroomType) => void;
  sqft: number;
  setSqft: (n: number) => void;
  capitalPerSqft: number;
  setCapitalPerSqft: (n: number) => void;
  rentEstimate: RentEstimate;
  vacancyRatePct: number;
  managementFeePct: number;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  rentGrowthRatePct: number;
  formatCurrency: (n: number) => string;
}

export function FreeBuildSection(props: FreeBuildSectionProps) {
  const {
    neighborhood, setNeighborhood, bedroomType, setBedroomType, sqft, setSqft,
    capitalPerSqft, setCapitalPerSqft, rentEstimate,
    vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct,
    formatCurrency,
  } = props;

  const [buybackYearSel, setBuybackYearSel] = useState(5);

  const fb = useMemo(() => calculateFreeBuild({
    monthlyRent: rentEstimate.rent,
    sqft,
    capitalPerSqft,
    vacancyRatePct,
    managementFeePct,
    monthlyInsurance,
    monthlyMaintenance,
    rentGrowthRatePct,
  }), [rentEstimate.rent, sqft, capitalPerSqft, vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct]);

  const chartData = useMemo(() => fb.years.map((y) => ({
    year: y.year,
    owner: Math.round(y.ownerCumulative),
    xbuild: Math.round(y.xbuildCumulative),
  })), [fb]);

  const selBuyback = buybackPrice(fb.totalCapital, buybackYearSel);

  return (
    <div>
      {/* Hero snapshot: $0 upfront vs traditional cost */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-6 rounded-xl bg-white border border-slate-200">
          <p className="text-[34px] font-bold text-slate-900 leading-none">
            $0 <span className="text-[15px] font-semibold text-slate-400">Upfront</span>
          </p>
          <p className="text-[13px] text-slate-400 mt-2">
            <span className="line-through">{formatCurrency(fb.totalCapital)}</span> traditional cost
          </p>
        </div>
        <div className="p-6 rounded-xl bg-[#2B7FFF]/5 border border-[#2B7FFF]/15">
          <p className="text-[34px] font-bold text-[#2B7FFF] leading-none">
            +{formatCurrency(fb.ownerMonthlyY1)} <span className="text-[15px] font-semibold text-[#2B7FFF]/60">/ mo</span>
          </p>
          <p className="text-[13px] text-slate-400 mt-2">
            Your Year 1–3 share · base rent {formatCurrency(rentEstimate.rent)} · grows to {formatCurrency(fb.ownerMonthlyY6)}/mo in Year 6+
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Inputs ── */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-emerald-700">Free Build Program · $0 Upfront</p>
                <p className="text-[11px] text-emerald-600/70">XBuild funds, builds and operates. You share the rental income.</p>
              </div>
            </div>
          </div>

          {/* Neighborhood */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Neighborhood / Area</label>
            <select
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-[14px] text-slate-700"
            >
              {SEATTLE_NEIGHBORHOODS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Bedroom type */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Bedroom Type</label>
            <div className="grid grid-cols-4 gap-2">
              {BEDROOM_TYPES.map((bt) => (
                <button
                  key={bt}
                  onClick={() => { setBedroomType(bt); setSqft(BEDROOM_DEFAULT_SQFT[bt]); }}
                  className={`px-2 py-2 rounded-lg text-[12px] font-semibold border transition-colors ${
                    bedroomType === bt
                      ? 'bg-[#2B7FFF] text-white border-[#2B7FFF]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {BEDROOM_LABELS[bt].replace(' Bedroom', ' Bed')}
                </button>
              ))}
            </div>
          </div>

          {/* Unit size */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">Unit Size</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={sqft}
                onChange={(e) => setSqft(Math.max(0, Number(e.target.value)))}
                className="w-28 px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-[14px] text-slate-700"
              />
              <span className="text-[12px] text-slate-400">sqft</span>
              <div className="flex-1" />
              {SQFT_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setSqft(p)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border ${
                    sqft === p ? 'border-[#2B7FFF] text-[#2B7FFF]' : 'border-slate-200 text-slate-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Delivered capital */}
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="text-[12px] font-semibold text-slate-500">Total Delivered Investment (funded by XBuild)</label>
              <span className="text-[12px] text-slate-400 tabular-nums">${capitalPerSqft}/sqft</span>
            </div>
            <input
              type="range" min={150} max={220} step={5}
              value={capitalPerSqft}
              onChange={(e) => setCapitalPerSqft(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-[11px] text-slate-400">Logistics · foundation · install · permits · utility hookup · furniture</span>
              <span className="text-[18px] font-bold text-slate-800 tabular-nums">{formatCurrency(fb.totalCapital)}</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Your upfront cost: $0</p>
          </div>

          {/* Estimated rent */}
          {rentEstimate.rent > 0 && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-baseline gap-2">
                <span className="text-[24px] font-bold text-emerald-700 tabular-nums">{formatCurrency(rentEstimate.rent)}</span>
                <span className="text-[12px] text-emerald-600">/mo estimated rent</span>
              </div>
              <p className="text-[11px] text-emerald-700/70 mt-1.5">{rentEstimate.explanation}</p>
            </div>
          )}

          {/* Revenue split schedule */}
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <SubsectionLabel className="mb-3">Revenue Split Schedule (locked at signing)</SubsectionLabel>
            <div className="space-y-2">
              {SPLIT_TIERS.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-[12px] text-slate-500">{t.label}</span>
                  <span className="text-[13px] font-bold tabular-nums text-slate-700">
                    You {Math.round(t.ownerPct * 100)}% · XBuild {Math.round((1 - t.ownerPct) * 100)}%
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[12px] text-slate-500">After XBuild reaches {RETURN_CAP_MULTIPLE}x cap</span>
                <span className="text-[13px] font-bold tabular-nums text-emerald-600">
                  You {Math.round(POST_CAP_OWNER_PCT * 100)}% · XBuild {Math.round((1 - POST_CAP_OWNER_PCT) * 100)}%
                </span>
              </div>
            </div>
            <BodyMuted className="mt-2 text-[10px]">
              Actual results shift the timeline, not the split. XBuild total return is capped at {RETURN_CAP_MULTIPLE}x invested capital.
            </BodyMuted>
          </div>
        </div>

        {/* ── RIGHT: Owner economics ── */}
        <div className="space-y-4">
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
              <span className="text-[12px] text-slate-500">Net operating revenue (month 1, pre-split)</span>
              <span className="text-[14px] font-bold tabular-nums text-slate-700">{formatCurrency(fb.monthlyNetRevenue)}/mo</span>
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[12px] text-slate-500">Your cumulative income · 10 yrs / 20 yrs</span>
              <span className="text-[14px] font-bold tabular-nums text-slate-700">
                {formatCurrency(fb.ownerCumulative10)} / {formatCurrency(fb.ownerCumulative20)}
              </span>
            </div>
          </div>

          {/* XBuild side metrics */}
          <div className="p-5 rounded-xl bg-white border border-slate-200">
            <SubsectionLabel className="mb-3">Program Mechanics</SubsectionLabel>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-1">XBuild payback</p>
                <p className="text-[16px] font-bold text-slate-800">{fb.xbuildPaybackYear ? `Yr ${fb.xbuildPaybackYear}` : '—'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">{RETURN_CAP_MULTIPLE}x cap reached</p>
                <p className="text-[16px] font-bold text-slate-800">{fb.capYear ? `Yr ${fb.capYear}` : '>20 yrs'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-1">XBuild 10-yr IRR</p>
                <p className="text-[16px] font-bold text-slate-800 tabular-nums">
                  {fb.xbuildIRR10 !== null ? `${(fb.xbuildIRR10 * 100).toFixed(1)}%` : '—'}
                </p>
              </div>
            </div>
            <BodyMuted className="mt-3 text-[10px]">
              XBuild recovers its delivered capital from its revenue share. Target payback 6–8 years; total return capped at {RETURN_CAP_MULTIPLE}x.
            </BodyMuted>
          </div>

          {/* Buyback */}
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
            <BodyMuted className="mt-2 text-[10px]">
              Early buyback carries a completion premium; the factor declines toward Year 7. Buying earlier captures more of the future upside.
            </BodyMuted>
          </div>
        </div>
      </div>

      {/* ── Chart: cumulative split ── */}
      <div className="mt-6 p-5 rounded-xl bg-white border border-slate-200">
        <SubsectionLabel className="mb-1">Cumulative Income Split (20-Year)</SubsectionLabel>
        <p className="text-[11px] text-slate-400 mb-4">
          {neighborhood} · {BEDROOM_LABELS[bedroomType]} · {sqft} sqft · Free Build revenue share
        </p>
        <ResponsiveContainer width="100%" height={240}>
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
    </div>
  );
}
