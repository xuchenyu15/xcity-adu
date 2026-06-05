import React, { useMemo, useState } from 'react';
import { ChevronDown, MapPin, Calculator } from 'lucide-react';
import { SectionTitle, SubsectionLabel, BodyMuted } from './Typography';
import {
  type BedroomType, type AddressRentEstimate, BEDROOM_LABELS, calculateROI,
} from './detachedAduRoi';

const CAPITAL_ITEMS: { label: string; ratio: number }[] = [
  { label: 'Prefab Construction & Shipping', ratio: 0.423 },
  { label: 'Site Construction & Installation', ratio: 0.268 },
  { label: 'Architectural Design & Permits', ratio: 0.146 },
  { label: 'Furniture & Delivery', ratio: 0.163 },
];

interface SelfFundedSectionProps {
  address?: string;
  bedroomType: BedroomType;
  sqft: number;
  rentEstimate: AddressRentEstimate;
  vacancyRatePct: number;
  managementFeePct: number;
  monthlyInsurance: number;
  monthlyMaintenance: number;
  rentGrowthRatePct: number;
  formatCurrency: (n: number) => string;
  breakdownOpen: boolean;
  setBreakdownOpen: (b: boolean) => void;
}

function Slider({ label, value, display, min, max, step, onChange }: {
  label: string; value: number; display: string; min: number; max: number; step: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[12px] text-slate-500">{label}</span>
        <span className="text-[12px] font-bold tabular-nums text-slate-700">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}

export function SelfFundedSection(props: SelfFundedSectionProps) {
  const {
    address, bedroomType, sqft, rentEstimate,
    vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct,
    formatCurrency, breakdownOpen, setBreakdownOpen,
  } = props;

  // Zillow-style cost simulator inputs
  const [constructionCost, setConstructionCost] = useState(200 * 600);
  const [downPct, setDownPct] = useState(20);
  const [ratePct, setRatePct] = useState(6.5);
  const [termYears, setTermYears] = useState(30);

  const roi = useMemo(() => calculateROI({
    monthlyRent: rentEstimate.rent,
    constructionCost,
    downPaymentPct: downPct / 100,
    loanRatePct: ratePct / 100,
    loanTermYears: termYears,
    vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct,
  }), [rentEstimate.rent, constructionCost, downPct, ratePct, termYears, vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct]);

  return (
    <div>
      {/* ═══ 1. FINANCIAL SNAPSHOT (same skeleton as Free Build) ═══ */}
      <SubsectionLabel className="mb-3">Financial Snapshot</SubsectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white border border-slate-200">
          <p className="text-[34px] font-bold text-slate-900 leading-none">
            {formatCurrency(roi.downPayment)} <span className="text-[15px] font-semibold text-slate-400">Upfront</span>
          </p>
          <p className="text-[13px] text-slate-400 mt-2">
            {downPct}% down of {formatCurrency(constructionCost)} total cost · you own 100% from day one
          </p>
        </div>
        <div className="p-6 rounded-xl bg-[#2B7FFF]/5 border border-[#2B7FFF]/15">
          <p className="text-[34px] font-bold text-[#2B7FFF] leading-none">
            {roi.monthlyNetCashFlow >= 0 ? '+' : ''}{formatCurrency(roi.monthlyNetCashFlow)} <span className="text-[15px] font-semibold text-[#2B7FFF]/60">/ mo</span>
          </p>
          <p className="text-[13px] text-slate-400 mt-2">
            Net cash flow · rent {formatCurrency(rentEstimate.rent)} − loan {formatCurrency(roi.monthlyLoanPayment)}/mo − operating costs
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
          <div>
            <SubsectionLabel className="mb-3">Capital Breakdown</SubsectionLabel>
            <div className="space-y-2">
              {CAPITAL_ITEMS.map((it) => (
                <div key={it.label} className="flex justify-between items-center py-1">
                  <span className="text-[13px] text-slate-500">{it.label}</span>
                  <span className="text-[13px] font-bold tabular-nums text-slate-700">
                    {formatCurrency(Math.round(constructionCost * it.ratio / 1000) * 1000)}
                  </span>
                </div>
              ))}
            </div>
            <BodyMuted className="mt-3 text-[11px]">
              Funded by you: {formatCurrency(roi.downPayment)} down payment + {formatCurrency(roi.loanAmount)} construction loan.
            </BodyMuted>
          </div>
          <div>
            <SubsectionLabel className="mb-3">Income & Loan Assumptions</SubsectionLabel>
            <div className="space-y-2">
              <div className="flex justify-between py-1"><span className="text-[13px] text-slate-500">Benchmark Rent</span><span className="text-[13px] font-bold tabular-nums text-slate-700">{formatCurrency(rentEstimate.rent)} / mo</span></div>
              <div className="flex justify-between py-1"><span className="text-[13px] text-slate-500">Rent Growth</span><span className="text-[13px] font-bold tabular-nums text-slate-700">{(rentGrowthRatePct * 100).toFixed(0)}% / yr (est.)</span></div>
              <div className="flex justify-between py-1"><span className="text-[13px] text-slate-500">Vacancy</span><span className="text-[13px] font-bold tabular-nums text-slate-700">{(vacancyRatePct * 100).toFixed(0)}% (est.)</span></div>
              <div className="flex justify-between py-1"><span className="text-[13px] text-slate-500">Management · Insurance · Maintenance</span><span className="text-[13px] font-bold tabular-nums text-slate-700">{(managementFeePct * 100).toFixed(0)}% · {formatCurrency(monthlyInsurance)} · {formatCurrency(monthlyMaintenance)}</span></div>
              <div className="flex justify-between py-1"><span className="text-[13px] text-slate-500">Loan</span><span className="text-[13px] font-bold tabular-nums text-slate-700">{ratePct.toFixed(1)}% · {termYears} yr fixed</span></div>
            </div>
            <BodyMuted className="mt-3 text-[11px]">
              Yield calculated as net annual income ÷ equity invested.
            </BodyMuted>
          </div>
        </div>
      )}

      {/* ═══ 2. COST & PAYMENT CALCULATOR (single block, Zillow-style) ═══ */}
      <div className="mt-12">
        <div className="mb-4">
          <SectionTitle>Cost & Payment Calculator</SectionTitle>
          <BodyMuted className="mt-1">
            Adjust cost and financing to see your monthly payment and cash flow.
          </BodyMuted>
        </div>
        <div className="p-6 lg:p-8 rounded-2xl bg-white border border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* inputs */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="w-4 h-4 text-[#2B7FFF]" />
                <SubsectionLabel>Financing Inputs</SubsectionLabel>
              </div>
              <Slider label="Total construction cost" value={constructionCost} display={formatCurrency(constructionCost)}
                min={80000} max={400000} step={5000} onChange={setConstructionCost} />
              <Slider label="Down payment" value={downPct} display={`${downPct}% · ${formatCurrency(constructionCost * downPct / 100)}`}
                min={0} max={50} step={5} onChange={setDownPct} />
              <Slider label="Interest rate" value={ratePct} display={`${ratePct.toFixed(2)}%`}
                min={3} max={10} step={0.25} onChange={setRatePct} />
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[12px] text-slate-500">Loan term</span>
                </div>
                <div className="flex gap-2">
                  {[15, 20, 30].map((t) => (
                    <button key={t} onClick={() => setTermYears(t)}
                      className={`px-4 py-2 rounded-lg text-[12px] font-semibold border ${
                        termYears === t ? 'bg-[#2B7FFF] text-white border-[#2B7FFF]' : 'bg-white text-slate-500 border-slate-200'
                      }`}>
                      {t} yr
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* results */}
            <div>
              <SubsectionLabel className="mb-4">Your Numbers</SubsectionLabel>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-[13px] text-slate-500">Loan amount</span>
                  <span className="text-[16px] font-bold tabular-nums text-slate-800">{formatCurrency(roi.loanAmount)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-[13px] text-slate-500">Monthly loan payment</span>
                  <span className="text-[16px] font-bold tabular-nums text-slate-800">{formatCurrency(roi.monthlyLoanPayment)} / mo</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-[13px] text-slate-500">Monthly net cash flow (after rent)</span>
                  <span className={`text-[16px] font-bold tabular-nums ${roi.monthlyNetCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {roi.monthlyNetCashFlow >= 0 ? '+' : ''}{formatCurrency(roi.monthlyNetCashFlow)} / mo
                  </span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <span className="text-[13px] text-slate-500">Annual net income</span>
                  <span className="text-[16px] font-bold tabular-nums text-slate-800">{formatCurrency(roi.annualNetIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-slate-500">Equity payback period</span>
                  <span className="text-[16px] font-bold tabular-nums text-slate-800">
                    {roi.paybackYears ? `${roi.paybackYears.toFixed(1)} yrs` : '—'}
                  </span>
                </div>
              </div>
              <BodyMuted className="mt-4 text-[11px]">
                Assumes the unit is rented at the benchmark rent with {(vacancyRatePct * 100).toFixed(0)}% vacancy. You keep 100% of income — no revenue share, no buyback.
              </BodyMuted>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
