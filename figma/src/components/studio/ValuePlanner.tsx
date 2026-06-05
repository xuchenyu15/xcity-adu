import React, { useState, useRef, useMemo } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  FileSignature,
  ShieldCheck,
  MessageSquare,
  ChevronDown,
  ExternalLink,
  Check,
  Upload,
  UploadCloud,
  FileText,
  Building2,
  Landmark,
  ScrollText,
  X,
  Info,
  Home,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ExitBuybackModule } from './ExitBuybackModule';
import { FreeBuildSection } from './FreeBuildSection';
import { PageTitle, PageSubtitle, SectionTitle, SubsectionLabel, BodyMuted } from './Typography';
import {
  type BedroomType,
  type ROIInputs,
  BEDROOM_LABELS,
  BEDROOM_DEFAULT_SQFT,
  SEATTLE_NEIGHBORHOODS,
  getEstimatedRent,
  getEstimatedRentForAddress,
  calculateROI,
  generateCumulativeCashFlows,
  getBedroomComparisonData,
} from './detachedAduRoi';

interface ValuePlannerProps {
  theme?: 'dark' | 'light';
  buildIntent?: 'freeBuild' | 'buyout';
  address?: string;
  onAction?: () => void;
  onNavigate?: (route: string) => void;
  onComplete?: () => void;
}

interface Incentive {
  id: string;
  title: string;
  source: string;
  amount: string;
  impactLabel: string;
  description: string;
  selected: boolean;
}

const BLUE = '#2B7FFF';
const BEDROOM_TYPES: BedroomType[] = ['studio', 'oneBed', 'twoBed', 'threeBed'];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(r: number | null) {
  if (r === null || !isFinite(r)) return '—';
  return `${(r * 100).toFixed(1)}%`;
}

function formatPayback(yrs: number | null) {
  if (yrs === null || !isFinite(yrs) || yrs <= 0) return '—';
  return `${yrs.toFixed(1)} yrs`;
}

// Slider with label
function LabeledSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[12px] text-slate-500">{label}</span>
        <span className="text-[12px] font-semibold text-slate-800">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#2B7FFF] h-1.5 rounded-full cursor-pointer"
      />
    </div>
  );
}

export function ValuePlanner({ theme = 'light', buildIntent, address, onAction, onNavigate, onComplete }: ValuePlannerProps) {
  // ─── ROI Calculator State ───────────────────────────────────────────────────
  const city = 'Seattle';
  const [neighborhood, setNeighborhood] = useState('Ballard');
  const [bedroomType, setBedroomType] = useState<BedroomType>('oneBed');
  const [sqft, setSqft] = useState(BEDROOM_DEFAULT_SQFT['oneBed']);
  const [constructionCost, setConstructionCost] = useState(200000);
  const [downPaymentPct, setDownPaymentPct] = useState(0.20);
  const [loanRatePct, setLoanRatePct] = useState(0.065);
  const [loanTermYears, setLoanTermYears] = useState(30);
  const [vacancyRatePct, setVacancyRatePct] = useState(0.05);
  const [managementFeePct, setManagementFeePct] = useState(0.08);
  const [monthlyInsurance, setMonthlyInsurance] = useState(150);
  const [monthlyMaintenance, setMonthlyMaintenance] = useState(200);
  const [rentGrowthRatePct, setRentGrowthRatePct] = useState(0.03);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [buildPath, setBuildPath] = useState<'freeBuild' | 'buyout'>(buildIntent ?? 'freeBuild');
  const [capitalPerSqft, setCapitalPerSqft] = useState(200);

  // Free Build uses upstream answers: address (entered at start) + design preset module
  const fbSqft = 600;
  const fbBedroom: BedroomType = 'oneBed';
  const fbRentEstimate = useMemo(
    () => getEstimatedRentForAddress('Seattle', address, fbBedroom, fbSqft),
    [address],
  );

  // ─── Exit flow state (existing) ────────────────────────────────────────────
  const [buyBackYear, setBuyBackYear] = useState<number | null>(null);
  const [lockState, setLockState] = useState<'unlocked' | 'cooling' | 'final'>('unlocked');
  const [contractStatus, setContractStatus] = useState<'reviewing' | 'ready' | 'signed'>('reviewing');
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const [incentives, setIncentives] = useState<Incentive[]>([
    { id: 'calhfa', title: 'Plus One ADU Program', source: 'CalHFA', amount: 'Up to $40,000', impactLabel: '+$40K one-time', description: 'Reimburses pre-development and non-recurring closing costs for qualifying ADU projects.', selected: false },
    { id: 'sect8', title: 'Section 8 Voucher Bonus', source: 'Local Housing Authority', amount: '$1,500', impactLabel: '+$1.5K one-time', description: 'Bonus incentive for leasing to eligible voucher holders.', selected: false },
    { id: 'impact', title: 'Development Fee Waiver', source: 'City Planning', amount: 'Est. $4,000–$9,000', impactLabel: '+$4–9K est.', description: 'Local planning fee reductions integrated into your project cost where applicable.', selected: false },
  ]);

  const toggleIncentive = (id: string) => setIncentives(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  const selectedIncentives = incentives.filter(i => i.selected);

  // ─── Derived ROI values ─────────────────────────────────────────────────────
  const rentEstimate = useMemo(
    () => getEstimatedRent(city, neighborhood, bedroomType, sqft),
    [city, neighborhood, bedroomType, sqft],
  );

  const roiInputs = useMemo((): ROIInputs => ({
    monthlyRent: rentEstimate.rent,
    constructionCost,
    downPaymentPct,
    loanRatePct,
    loanTermYears,
    vacancyRatePct,
    managementFeePct,
    monthlyInsurance,
    monthlyMaintenance,
    rentGrowthRatePct,
  }), [rentEstimate.rent, constructionCost, downPaymentPct, loanRatePct, loanTermYears, vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct]);

  const roi = useMemo(() => calculateROI(roiInputs), [roiInputs]);

  const cumulativeData = useMemo(
    () => generateCumulativeCashFlows(roiInputs, 20),
    [roiInputs],
  );

  const bedroomComparison = useMemo(
    () => getBedroomComparisonData(city, neighborhood, sqft, {
      constructionCost, downPaymentPct, loanRatePct, loanTermYears,
      vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct,
    }),
    [city, neighborhood, sqft, constructionCost, downPaymentPct, loanRatePct, loanTermYears, vacancyRatePct, managementFeePct, monthlyInsurance, monthlyMaintenance, rentGrowthRatePct],
  );

  const irrRows = [
    { label: '5-Year IRR', value: formatPct(roi.irr5) },
    { label: '10-Year IRR', value: formatPct(roi.irr10) },
    { label: '20-Year IRR', value: formatPct(roi.irr20) },
  ];

  const monthlyBreakdown = [
    { label: 'Estimated Monthly Rent', value: formatCurrency(rentEstimate.rent), positive: true },
    { label: 'Monthly Loan Payment', value: `-${formatCurrency(roi.monthlyLoanPayment)}`, positive: false },
    { label: 'Vacancy Loss', value: `-${formatCurrency(roi.monthlyVacancyLoss)}`, positive: false },
    { label: 'Management Fee', value: `-${formatCurrency(roi.monthlyManagementFee)}`, positive: false },
    { label: 'Insurance', value: `-${formatCurrency(monthlyInsurance)}`, positive: false },
    { label: 'Maintenance Reserve', value: `-${formatCurrency(monthlyMaintenance)}`, positive: false },
  ];

  // Comparison chart colors
  const BAR_COLORS = ['#94a3b8', BLUE, '#3b82f6', '#1d4ed8'];

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto font-sans p-6 lg:p-10 bg-slate-50 text-slate-600">
      <div className="max-w-7xl mx-auto w-full pb-20">

        {/* ─── PAGE HEADER ─── */}
        <div className="mb-10">
          <PageTitle>Financial Planning</PageTitle>
          <PageSubtitle className="mt-2 max-w-2xl">
            ROI calculator and financial terms for your Detached ADU project.
          </PageSubtitle>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 1: DETACHED ADU ROI CALCULATOR                           */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <SectionTitle>Detached ADU ROI Calculator</SectionTitle>
            <span className="px-2.5 py-0.5 rounded-full bg-[#2B7FFF]/10 text-[#2B7FFF] text-[11px] font-semibold border border-[#2B7FFF]/20 flex items-center gap-1">
              <Home className="w-3 h-3" /> Detached ADU Only
            </span>
          </div>
          <BodyMuted className="mt-1 mb-6">
            Enter your project details to calculate estimated rental income, monthly cash flow, payback period, and IRR.
            All calculations are for Detached ADU / DADU — no attached or garage conversion types.
          </BodyMuted>

          {/* Build path toggle: Route B (Free Build) vs Route A (Buyout) */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setBuildPath('freeBuild')}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors flex items-center gap-2 ${
                buildPath === 'freeBuild'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              Free Build Program · $0 Upfront
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                buildPath === 'freeBuild' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
              }`}>RECOMMENDED</span>
            </button>
            <button
              onClick={() => setBuildPath('buyout')}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors ${
                buildPath === 'buyout'
                  ? 'bg-[#2B7FFF] text-white border-[#2B7FFF]'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              Buyout / Self-Funded
            </button>
          </div>

          {buildPath === 'freeBuild' && (
            <FreeBuildSection
              address={address}
              bedroomType={fbBedroom}
              sqft={fbSqft}
              rentEstimate={fbRentEstimate}
              capitalPerSqft={capitalPerSqft}
              setCapitalPerSqft={setCapitalPerSqft}
              vacancyRatePct={vacancyRatePct}
              managementFeePct={managementFeePct}
              monthlyInsurance={monthlyInsurance}
              monthlyMaintenance={monthlyMaintenance}
              rentGrowthRatePct={rentGrowthRatePct}
              formatCurrency={formatCurrency}
            />
          )}

          {buildPath === 'buyout' && (<>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: Inputs */}
            <div className="space-y-4">
              {/* ADU Type Badge */}
              <div className="p-4 rounded-xl bg-[#f4f7ff] border border-[#2B7FFF]/15">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#2B7FFF]/10">
                    <Home className="w-4 h-4 text-[#2B7FFF]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#2B7FFF]">Detached ADU / DADU</p>
                    <p className="text-[11px] text-slate-400">Freestanding structure separate from main house</p>
                  </div>
                </div>
              </div>

              {/* Neighborhood */}
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">Neighborhood / Area</label>
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2B7FFF]/30 cursor-pointer"
                >
                  {SEATTLE_NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Bedroom Type */}
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">Bedroom Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {BEDROOM_TYPES.map((bt) => (
                    <button
                      key={bt}
                      onClick={() => {
                        setBedroomType(bt);
                        setSqft(BEDROOM_DEFAULT_SQFT[bt]);
                      }}
                      className={`py-2 px-1 rounded-xl border text-[12px] font-medium transition-all cursor-pointer ${
                        bedroomType === bt
                          ? 'bg-[#2B7FFF] text-white border-[#2B7FFF] shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {bt === 'studio' ? 'Studio' : bt === 'oneBed' ? '1 Bed' : bt === 'twoBed' ? '2 Bed' : '3 Bed'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Area (sqft) */}
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">Unit Size</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={sqft}
                    min={100}
                    max={1500}
                    onChange={(e) => setSqft(Math.max(100, Number(e.target.value)))}
                    className="w-28 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2B7FFF]/30"
                  />
                  <span className="text-[13px] text-slate-400">sqft</span>
                  <div className="flex gap-1.5 ml-auto">
                    {[350, 500, 750, 1000].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSqft(s)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all cursor-pointer ${
                          sqft === s
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Construction Cost */}
              <div>
                <label className="block text-[12px] font-medium text-slate-500 mb-1.5">Construction Cost</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px]">$</span>
                    <input
                      type="number"
                      value={constructionCost}
                      min={50000}
                      max={800000}
                      step={5000}
                      onChange={(e) => setConstructionCost(Math.max(50000, Number(e.target.value)))}
                      className="w-full pl-7 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2B7FFF]/30"
                    />
                  </div>
                </div>
              </div>

              {/* Estimated Rent Card */}
              {rentEstimate.rent > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-[24px] font-bold text-emerald-700">{formatCurrency(rentEstimate.rent)}</span>
                    <span className="text-[12px] text-emerald-500 font-medium">/mo estimated rent</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Info className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-emerald-600 leading-relaxed">{rentEstimate.explanation}</p>
                  </div>
                </div>
              )}

              {/* Advanced Parameters */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="text-[13px] font-medium text-slate-700">Advanced Parameters</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
                </button>
                {advancedOpen && (
                  <div className="px-4 pb-4 bg-white space-y-4 border-t border-slate-100 pt-4">
                    <LabeledSlider
                      label="Down Payment"
                      value={downPaymentPct}
                      min={0.05} max={1.0} step={0.05}
                      display={`${Math.round(downPaymentPct * 100)}% — ${formatCurrency(roi.downPayment)}`}
                      onChange={setDownPaymentPct}
                    />
                    <LabeledSlider
                      label="Loan Interest Rate"
                      value={loanRatePct}
                      min={0.02} max={0.15} step={0.0025}
                      display={`${(loanRatePct * 100).toFixed(2)}%`}
                      onChange={setLoanRatePct}
                    />
                    <LabeledSlider
                      label="Loan Term"
                      value={loanTermYears}
                      min={5} max={30} step={5}
                      display={`${loanTermYears} years`}
                      onChange={setLoanTermYears}
                    />
                    <LabeledSlider
                      label="Vacancy Rate"
                      value={vacancyRatePct}
                      min={0} max={0.20} step={0.01}
                      display={`${Math.round(vacancyRatePct * 100)}%`}
                      onChange={setVacancyRatePct}
                    />
                    <LabeledSlider
                      label="Management Fee"
                      value={managementFeePct}
                      min={0} max={0.15} step={0.01}
                      display={`${Math.round(managementFeePct * 100)}%`}
                      onChange={setManagementFeePct}
                    />
                    <LabeledSlider
                      label="Monthly Insurance"
                      value={monthlyInsurance}
                      min={50} max={500} step={25}
                      display={formatCurrency(monthlyInsurance)}
                      onChange={setMonthlyInsurance}
                    />
                    <LabeledSlider
                      label="Maintenance Reserve"
                      value={monthlyMaintenance}
                      min={50} max={600} step={25}
                      display={formatCurrency(monthlyMaintenance)}
                      onChange={setMonthlyMaintenance}
                    />
                    <LabeledSlider
                      label="Annual Rent Growth"
                      value={rentGrowthRatePct}
                      min={0} max={0.10} step={0.005}
                      display={`${(rentGrowthRatePct * 100).toFixed(1)}%`}
                      onChange={setRentGrowthRatePct}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Results */}
            <div className="space-y-4">
              {/* Monthly Cash Flow Summary */}
              <div className="p-5 rounded-xl bg-white border border-slate-200">
                <SubsectionLabel className="mb-4">Monthly Cash Flow Breakdown</SubsectionLabel>
                <div className="space-y-2.5">
                  {monthlyBreakdown.map((row, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-[12px] text-slate-500">{row.label}</span>
                      <span className={`text-[12px] font-semibold tabular-nums ${row.positive ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-slate-200 pt-2.5 mt-1 flex justify-between items-center">
                    <span className="text-[13px] font-semibold text-slate-800">Monthly Net Cash Flow</span>
                    <span className={`text-[18px] font-bold tabular-nums ${roi.monthlyNetCashFlow >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {roi.monthlyNetCashFlow >= 0 ? '' : ''}{formatCurrency(roi.monthlyNetCashFlow)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-1">Annual Net Income</p>
                  <p className={`text-[20px] font-bold tabular-nums ${roi.annualNetIncome >= 0 ? 'text-slate-900' : 'text-red-500'}`}>
                    {formatCurrency(roi.annualNetIncome)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-1">Equity Invested</p>
                  <p className="text-[20px] font-bold tabular-nums text-slate-900">{formatCurrency(roi.downPayment)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-1">Payback Period</p>
                  <p className="text-[20px] font-bold tabular-nums text-slate-900">{formatPayback(roi.paybackYears)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mb-1">Loan Payment</p>
                  <p className="text-[20px] font-bold tabular-nums text-slate-900">{formatCurrency(roi.monthlyLoanPayment)}<span className="text-[12px] text-slate-400 font-normal">/mo</span></p>
                </div>
              </div>

              {/* IRR Table */}
              <div className="p-5 rounded-xl bg-white border border-slate-200">
                <SubsectionLabel className="mb-3">Internal Rate of Return (IRR)</SubsectionLabel>
                <div className="space-y-2">
                  {irrRows.map((row, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-[13px] text-slate-600">{row.label}</span>
                      <span className={`text-[15px] font-bold tabular-nums ${
                        row.value === '—' ? 'text-slate-400' :
                        parseFloat(row.value) > 0 ? 'text-[#2B7FFF]' : 'text-red-500'
                      }`}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                <BodyMuted className="mt-3 text-[10px]">
                  IRR based on equity invested (down payment). Assumes rent grows at {(rentGrowthRatePct * 100).toFixed(1)}%/yr.
                </BodyMuted>
              </div>
            </div>
          </div>

          {/* ─── Charts Section ──────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Chart 1: Cumulative Return Line Chart */}
            <div className="p-5 rounded-xl bg-white border border-slate-200">
              <SubsectionLabel className="mb-1">Cumulative Net Cash Flow (20-Year)</SubsectionLabel>
              <p className="text-[11px] text-slate-400 mb-4">
                {neighborhood} · {BEDROOM_LABELS[bedroomType]} · {sqft} sqft Detached ADU
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={cumulativeData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    label={{ value: 'Year', position: 'insideBottom', offset: -2, fontSize: 11, fill: '#94a3b8' }}
                    height={32}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v) => `$${Math.round(v / 1000)}K`}
                    width={52}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Cumulative Net']}
                    labelFormatter={(l) => `Year ${l}`}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke={BLUE}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Monthly Net Cash Flow by Bedroom Type */}
            <div className="p-5 rounded-xl bg-white border border-slate-200">
              <SubsectionLabel className="mb-1">Monthly Net Cash Flow by Bedroom Type</SubsectionLabel>
              <p className="text-[11px] text-slate-400 mb-4">
                {neighborhood} · Detached ADU · {sqft} sqft · Same cost parameters
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={bedroomComparison.map((d) => ({ name: d.shortLabel, value: d.monthlyNet }))}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(v) => `$${v}`}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), 'Monthly Net']}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                    {bedroomComparison.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS[idx] ?? BLUE} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: Payback Period by Bedroom Type */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 lg:col-span-2">
              <SubsectionLabel className="mb-1">Bedroom Type Comparison — {neighborhood} Detached ADU</SubsectionLabel>
              <p className="text-[11px] text-slate-400 mb-4">
                Estimated rent, monthly net cash flow, payback period, and 10-year IRR
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Type</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Est. Rent</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Monthly Net</th>
                      <th className="text-right py-2 px-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Annual Net</th>
                      <th className="text-right py-2 pl-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Payback</th>
                      <th className="text-right py-2 pl-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">10yr IRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bedroomComparison.map((row, i) => {
                      const isSelected = row.bedroomType === bedroomType;
                      return (
                        <tr
                          key={i}
                          onClick={() => {
                            setBedroomType(row.bedroomType);
                            setSqft(BEDROOM_DEFAULT_SQFT[row.bedroomType]);
                          }}
                          className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#f4f7ff]' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#2B7FFF]" />}
                              <span className={`font-medium ${isSelected ? 'text-[#2B7FFF]' : 'text-slate-700'}`}>
                                Detached ADU {row.label}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-600 tabular-nums">{formatCurrency(row.estimatedRent)}</td>
                          <td className={`py-2.5 px-4 text-right font-semibold tabular-nums ${row.monthlyNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {formatCurrency(row.monthlyNet)}
                          </td>
                          <td className={`py-2.5 px-4 text-right tabular-nums ${row.annualNet >= 0 ? 'text-slate-700' : 'text-red-500'}`}>
                            {formatCurrency(row.annualNet)}
                          </td>
                          <td className="py-2.5 pl-4 text-right text-slate-600 tabular-nums">{formatPayback(row.payback)}</td>
                          <td className={`py-2.5 pl-4 text-right font-semibold tabular-nums ${
                            row.irr10 === null ? 'text-slate-400' :
                            row.irr10 > 0 ? 'text-[#2B7FFF]' : 'text-red-500'
                          }`}>
                            {formatPct(row.irr10)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </>)}
        </div>

        <div className="h-px bg-slate-200/60 mb-12" />

        {/* Legacy snapshot + exit timing: superseded. Free Build has its own buyback path; self-funded (cost simulator) has no exit timing. */}
        {false && (<>
        {/* ─── 2. FINANCIAL SNAPSHOT ─── */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <SubsectionLabel>Financial Snapshot</SubsectionLabel>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#c7d8f5]/25 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[36px] font-semibold tracking-tight text-slate-900">{formatCurrency(roi.downPayment)}</span>
                  <span className="text-[14px] font-medium text-slate-400">Equity In</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[13px] text-slate-400">
                  <span>{Math.round(downPaymentPct * 100)}% down · {formatCurrency(roi.loanAmount)} financed</span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[#2B7FFF]/15 bg-[#f4f7ff] p-6">
              <div className="absolute -top-12 -right-12 w-56 h-56 bg-[#2B7FFF]/[0.08] rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-baseline gap-2.5">
                  <span className={`text-[36px] font-semibold tracking-tight ${roi.monthlyNetCashFlow >= 0 ? 'text-[#2B7FFF]' : 'text-red-500'}`}>
                    {roi.monthlyNetCashFlow >= 0 ? '+' : ''}{formatCurrency(roi.monthlyNetCashFlow)}
                  </span>
                  <span className="text-[14px] font-medium text-[#2B7FFF]/50">/ mo</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-400">
                  <span>Base rent {formatCurrency(rentEstimate.rent)}</span>
                  <span className="text-slate-300">·</span>
                  <span>{neighborhood} {BEDROOM_LABELS[bedroomType]}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => setBreakdownOpen(!breakdownOpen)}
            className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-[#2B7FFF] hover:text-blue-700 cursor-pointer transition-colors"
          >
            {breakdownOpen ? 'Hide' : 'View'} financial breakdown
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${breakdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {breakdownOpen && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-8 p-6 bg-white rounded-xl border border-slate-100">
              <div>
                <SubsectionLabel className="mb-3">Cost Breakdown</SubsectionLabel>
                <div className="space-y-2.5">
                  {[
                    { label: 'Total Construction Cost', amount: formatCurrency(constructionCost) },
                    { label: 'Down Payment', amount: formatCurrency(roi.downPayment) },
                    { label: 'Loan Amount', amount: formatCurrency(roi.loanAmount) },
                    { label: 'Monthly Loan Payment', amount: `${formatCurrency(roi.monthlyLoanPayment)}/mo` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-500">{item.label}</span>
                      <span className="text-[12px] font-semibold tabular-nums text-slate-900">{item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SubsectionLabel className="mb-3">Income Assumptions</SubsectionLabel>
                <div className="space-y-2.5">
                  {[
                    { label: 'Estimated Rent', value: `${formatCurrency(rentEstimate.rent)}/mo` },
                    { label: 'Rent Growth', value: `${(rentGrowthRatePct * 100).toFixed(1)}%/yr` },
                    { label: 'Vacancy', value: `${Math.round(vacancyRatePct * 100)}%` },
                    { label: 'Management Fee', value: `${Math.round(managementFeePct * 100)}% of rent` },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-500">{item.label}</span>
                      <span className="text-[12px] font-semibold tabular-nums text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-slate-200/60 mt-8" />
        </div>

        {/* ─── 3. CHOOSE YOUR EXIT TIMING ─── */}
        <div className="mb-12">
          <div className="mb-4">
            <SectionTitle>Exit Scenarios & Buyback Timing</SectionTitle>
            <BodyMuted className="mt-1">
              Select the year you'd like to exit. View 5/10/20-year return projections below the chart.
            </BodyMuted>
          </div>

          <ExitBuybackModule
            buyBackYear={buyBackYear}
            setBuyBackYear={setBuyBackYear}
            lockState={lockState}
            onLock={() => {
              if (lockState === 'unlocked') setLockState('cooling');
              else if (lockState === 'cooling') setLockState('final');
            }}
            fmtCurrency={formatCurrency}
            ANNUAL_NET={roi.annualNetIncome}
            CONSTRUCTION_COST={constructionCost}
            INFLATION_RATE={rentGrowthRatePct}
            selectedAdjustments={selectedIncentives.map(i => ({ label: i.title, impact: i.impactLabel }))}
            roiInputs={roiInputs}
          />
        </div>

        </>)}

        {/* ─── 4. INCENTIVE REVIEW SUMMARY ─── */}
        <div className="mb-12">
          <div className="mb-4">
            <SectionTitle>Incentive Review Summary</SectionTitle>
            <BodyMuted className="mt-1">
              Based on your property and project profile, the following incentives have been identified for review and submission.
            </BodyMuted>
          </div>
          <IncentivesSection
            incentives={incentives}
            toggleIncentive={toggleIncentive}
            selectedIncentives={selectedIncentives}
          />
        </div>

        {/* ─── 5. FINALIZE COMMITMENT ─── */}
        <div className="mb-12">
          <div className="mb-4">
            <SectionTitle>Finalize Commitment</SectionTitle>
            <BodyMuted className="mt-1">
              Review the draft terms to lock in your financial plan. Final step before execution begins.
            </BodyMuted>
          </div>

          <div className="p-6 rounded-xl bg-white border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-slate-50 text-slate-500 rounded-lg">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[14px] font-medium text-slate-900">Contract Status</span>
                    {contractStatus === 'signed' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[11px] font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Signed
                      </span>
                    ) : contractStatus === 'ready' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-[#2B7FFF] rounded-full text-[11px] font-semibold">
                        <ShieldCheck className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[11px] font-semibold">
                        Reviewing
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    Lock your buyback timing and return adjustments before signing.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-medium text-[13px] transition-all flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="w-3.5 h-3.5" /> Advisor
                </button>

                {contractStatus === 'signed' ? (
                  <button className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-medium text-[13px] flex items-center gap-2 cursor-default">
                    View Contract
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (contractStatus === 'reviewing') setContractStatus('ready');
                      else if (contractStatus === 'ready') { setContractStatus('signed'); onComplete?.(); }
                    }}
                    className="px-5 py-2 bg-[#2B7FFF] text-white hover:bg-blue-600 rounded-lg font-medium text-[13px] transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    {contractStatus === 'ready' ? 'Review & Sign Contract' : 'Review Draft Terms'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

interface UploadedFile { name: string; size: string; date: string; }
interface IncentivesSectionProps {
  incentives: Incentive[];
  toggleIncentive: (id: string) => void;
  selectedIncentives: Incentive[];
}

const INCENTIVE_ICONS: Record<string, React.ReactNode> = {
  calhfa: <Building2 className="w-5 h-5" />,
  sect8: <Landmark className="w-5 h-5" />,
  impact: <ScrollText className="w-5 h-5" />,
};

interface IncentiveReviewConfig {
  tag: string;
  tagColor: 'blue' | 'gray' | 'slate' | 'emerald';
  statusLabel: string;
  statusColor: 'blue' | 'emerald' | 'gray';
  description: string;
  actionItems?: string[];
  buttonLabel?: string;
  buttonVariant?: 'primary' | 'outline';
}

const INCENTIVE_REVIEW_CONFIG: Record<string, IncentiveReviewConfig> = {
  calhfa: {
    tag: 'Income-Restricted', tagColor: 'blue', statusLabel: 'Documentation Required', statusColor: 'blue',
    description: 'State-level grant program supporting qualifying ADU projects.',
    actionItems: ['Income verification documentation required', 'Owner-occupancy confirmation required'],
    buttonLabel: 'Upload Income Documents', buttonVariant: 'primary',
  },
  sect8: {
    tag: 'Optional Rental Strategy', tagColor: 'gray', statusLabel: '', statusColor: 'gray',
    description: 'Bonus incentive for leasing to eligible voucher holders.',
    actionItems: [
      'Tenant must hold a valid Housing Choice Voucher (Section 8)',
      'Minimum 12-month lease term commitment required',
      'Unit must pass Housing Quality Standards (HQS) inspection',
      'Landlord registration with local Housing Authority required',
    ],
    buttonLabel: 'Learn More', buttonVariant: 'outline',
  },
  impact: {
    tag: 'Integrated', tagColor: 'emerald', statusLabel: '', statusColor: 'emerald',
    description: 'Local planning fee reductions integrated into your project cost where applicable.',
    actionItems: ['ADU must be under 750 sqft to qualify for full waiver', 'No outstanding code violations on the property'],
    buttonLabel: 'Learn More', buttonVariant: 'outline',
  },
};

function IncentivesSection({ incentives, toggleIncentive, selectedIncentives }: IncentivesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    { name: 'Site Survey.pdf', size: '2.4 MB', date: 'Oct 12, 2025' },
    { name: 'Property Deed.pdf', size: '1.1 MB', date: 'Oct 12, 2025' },
  ]);

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(f => ({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
    e.target.value = '';
  };

  const tagStyles = {
    blue: 'bg-[#2B7FFF]/8 text-[#2B7FFF] border-[#2B7FFF]/15',
    gray: 'bg-slate-100 text-slate-500 border-slate-200',
    slate: 'bg-slate-100 text-slate-500 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };
  const statusStyles = {
    blue: 'bg-[#2B7FFF]/8 text-[#2B7FFF]',
    emerald: 'bg-emerald-50 text-emerald-600',
    gray: 'bg-slate-50 text-slate-400',
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-white border border-slate-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-500"><FileText className="w-5 h-5" /></div>
            <div>
              <span className="text-[14px] font-medium text-slate-900">Project Documents</span>
              <p className="text-[12px] text-slate-400 mt-0.5">Supporting documents for incentive verification and compliance</p>
            </div>
          </div>
          <button onClick={handleUploadClick} className="px-4 py-2 bg-[#2B7FFF] text-white hover:bg-blue-600 rounded-lg font-medium text-[13px] transition-all flex items-center gap-2 cursor-pointer shadow-sm">
            <UploadCloud className="w-3.5 h-3.5" /> Upload
          </button>
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg" multiple onChange={handleFileChange} />
        </div>
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {uploadedFiles.map((file, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[200px]">
                <div className="p-1.5 bg-white rounded-md border border-slate-200 text-slate-400"><FileText className="w-4 h-4" /></div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400">{file.size} · {file.date}</p>
                </div>
                <button onClick={() => setUploadedFiles(prev => prev.filter(f => f.name !== file.name))} className="p-1.5 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {incentives.map((incentive) => {
          const config = INCENTIVE_REVIEW_CONFIG[incentive.id];
          if (!config) return null;
          return (
            <div key={incentive.id} className="rounded-2xl border border-slate-200 bg-white flex flex-col overflow-hidden">
              <div className="p-6 pb-0">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg shrink-0 bg-slate-50 text-slate-400">
                    {INCENTIVE_ICONS[incentive.id] || <Building2 className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[14px] font-medium text-slate-900">{incentive.title}</h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tagStyles[config.tagColor]}`}>
                        {config.tag}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider">{incentive.source} · {incentive.amount}</span>
                  </div>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-400 mb-4">{config.description}</p>
              </div>
              {config.actionItems && config.actionItems.length > 0 && (
                <div className="px-6 pb-0">
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Action Required</p>
                    <ul className="space-y-2">
                      {config.actionItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2B7FFF]/40 mt-[5px] shrink-0" />
                          <span className="text-[12px] text-slate-600 leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <div className="p-6 pt-4 mt-auto">
                {config.statusLabel && (
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusStyles[config.statusColor]}`}>
                      {config.statusColor === 'emerald' && <CheckCircle2 className="w-3 h-3" />}
                      {config.statusColor === 'blue' && <FileText className="w-3 h-3" />}
                      {config.statusLabel}
                    </span>
                  </div>
                )}
                {config.buttonLabel && config.buttonVariant === 'primary' && (
                  <button onClick={handleUploadClick} className="w-full py-2.5 rounded-xl font-medium text-[13px] transition-all cursor-pointer flex items-center justify-center gap-2 bg-[#2B7FFF] text-white hover:bg-blue-600 shadow-sm">
                    <Upload className="w-3.5 h-3.5" /> {config.buttonLabel}
                  </button>
                )}
                {config.buttonLabel && config.buttonVariant === 'outline' && (
                  <button className="w-full py-2.5 rounded-xl font-medium text-[13px] transition-all cursor-pointer flex items-center justify-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300">
                    {config.buttonLabel} <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
