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
import { SelfFundedSection } from './SelfFundedSection';
import { getIncentivesForAddress, resolveJurisdiction, mapAiIncentive, type IncentiveProgram } from './aduIncentives';
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

  const [incentives, setIncentives] = useState<IncentiveProgram[]>(
    () => getIncentivesForAddress(address).programs,
  );
  React.useEffect(() => {
    const { jurisdiction, programs } = getIncentivesForAddress(address);
    setIncentives(programs);
    // For jurisdictions not in the curated table, ask the backend AI research
    // layer for real financial incentives (no-op until an AI key is configured).
    const uncovered = !jurisdiction.state;
    if (!uncovered) return;
    let cancelled = false;
    const j = resolveJurisdiction(null, address);
    const qs = new URLSearchParams();
    if (j.state) qs.set('state', j.state);
    if (j.county) qs.set('county', j.county);
    if (j.city) qs.set('city', j.city);
    if (j.zip) qs.set('zip', j.zip);
    const base = (import.meta as any).env?.VITE_API_BASE_URL ?? '';
    fetch(`${base}/api/incentives?${qs.toString()}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data || data.source !== 'ai' || !Array.isArray(data.programs) || data.programs.length === 0) return;
        const aiCards = data.programs.map(mapAiIncentive);
        setIncentives((prev) => {
          const generic = new Set(['local-fee']);
          const kept = prev.filter((p) => !generic.has(p.id));
          return [...aiCards, ...kept];
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [address]);

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
        {/* SECTION 1: DETACHED ADU ROI CALCULATOR */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <SectionTitle>Detached ADU Financial Terms</SectionTitle>
            <span className="px-2.5 py-0.5 rounded-full bg-[#2B7FFF]/10 text-[#2B7FFF] text-[11px] font-semibold border border-[#2B7FFF]/20 flex items-center gap-1">
              <Home className="w-3 h-3" /> Detached ADU Only
            </span>
          </div>
          <BodyMuted className="mt-1 mb-6">
            Your financing path, projected income, and available incentives — derived from your address and design.
            All figures are for a Detached ADU / DADU.
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
              breakdownOpen={breakdownOpen}
              setBreakdownOpen={setBreakdownOpen}
              buyBackYear={buyBackYear}
              setBuyBackYear={setBuyBackYear}
              lockState={lockState}
              onLock={() => {
                if (lockState === 'unlocked') setLockState('cooling');
                else if (lockState === 'cooling') setLockState('final');
              }}
              selectedAdjustments={selectedIncentives.map(i => ({ label: i.title, impact: i.impactLabel }))}
            />
          )}

          {buildPath === 'buyout' && (
            <SelfFundedSection
              address={address}
              bedroomType={fbBedroom}
              sqft={fbSqft}
              rentEstimate={fbRentEstimate}
              vacancyRatePct={vacancyRatePct}
              managementFeePct={managementFeePct}
              monthlyInsurance={monthlyInsurance}
              monthlyMaintenance={monthlyMaintenance}
              rentGrowthRatePct={rentGrowthRatePct}
              formatCurrency={formatCurrency}
              breakdownOpen={breakdownOpen}
              setBreakdownOpen={setBreakdownOpen}
            />
          )}
        </div>

        <div className="h-px bg-slate-200/60 mb-12" />

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
  incentives: IncentiveProgram[];
  toggleIncentive: (id: string) => void;
  selectedIncentives: IncentiveProgram[];
}

const INCENTIVE_ICON_NODE: Record<string, React.ReactNode> = {
  building: <Building2 className="w-5 h-5" />,
  landmark: <Landmark className="w-5 h-5" />,
  scroll: <ScrollText className="w-5 h-5" />,
  file: <FileText className="w-5 h-5" />,
};

function IncentivesSection({ incentives }: IncentivesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filesById, setFilesById] = useState<Record<string, UploadedFile[]>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const pendingUploadId = useRef<string | null>(null);

  const triggerUpload = (id: string) => { pendingUploadId.current = id; fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = pendingUploadId.current;
    const files = e.target.files;
    if (id && files) {
      const added = Array.from(files).map(f => ({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      }));
      setFilesById(prev => ({ ...prev, [id]: [...(prev[id] || []), ...added] }));
    }
    e.target.value = '';
  };
  const removeFile = (id: string, name: string) =>
    setFilesById(prev => ({ ...prev, [id]: (prev[id] || []).filter(f => f.name !== name) }));

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
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg" multiple onChange={handleFileChange} />

      {renderGroup(incentives.filter((i) => i.kind === 'financial'), 'row')}

      {incentives.some((i) => i.kind === 'program') && (
        <div className="mt-8">
          <p className="text-[13px] font-semibold text-slate-500 mb-1">Programs & Resources</p>
          <p className="text-[12px] text-slate-400 mb-4">Not cash incentives, but laws, design programs, and rental options that lower your cost or risk.</p>
          {renderGroup(incentives.filter((i) => i.kind === 'program'), 'row')}
        </div>
      )}
    </div>
  );

  function renderGroup(items: IncentiveProgram[], _layout: 'grid' | 'row') {
    if (items.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-5">
          <p className="text-[13px] font-medium text-slate-600">No cash incentives confirmed for this address yet.</p>
          <p className="text-[12px] text-slate-400 mt-0.5">Programs &amp; Resources below may still lower your cost — we’ll follow up if a grant or rebate applies.</p>
        </div>
      );
    }
    return <div className="space-y-4">{items.map(Card)}</div>;
  }

  function Card(incentive: IncentiveProgram) {
    const isOpen = openId === incentive.id;
    // Financial programs always open an eligibility form (upload at minimum);
    // laws / resources open an info panel.
    const hasIntake = incentive.kind === 'financial' || !!incentive.intake;
    const files = filesById[incentive.id] || [];
    const isSubmitted = !!submitted[incentive.id];

    const actionBlock = incentive.actionItems && incentive.actionItems.length > 0 ? (
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Action Required</p>
        <ul className="space-y-2">
          {incentive.actionItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2B7FFF]/40 mt-[5px] shrink-0" />
              <span className="text-[12px] text-slate-600 leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

    const statusChip = incentive.statusLabel ? (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusStyles[incentive.statusColor]}`}>
        {incentive.statusColor === 'emerald' && <CheckCircle2 className="w-3 h-3" />}
        {incentive.statusColor === 'blue' && <FileText className="w-3 h-3" />}
        {incentive.statusLabel}
      </span>
    ) : null;

    // Every card toggles an inline panel — no button navigates straight to a
    // third-party site. Financial programs open an eligibility form; laws /
    // resources open an info panel that keeps the official link contained inside.
    const button = (
      <button
        onClick={() => setOpenId(isOpen ? null : incentive.id)}
        className={`py-2.5 px-4 rounded-xl font-medium text-[13px] transition-all cursor-pointer flex items-center justify-center gap-2 ${
          isOpen
            ? 'bg-slate-100 text-slate-600 border border-slate-200'
            : hasIntake
              ? 'bg-[#2B7FFF] text-white hover:bg-blue-600 shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        {isOpen ? 'Close' : incentive.buttonLabel} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
    );

    return (
      <div key={incentive.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row md:items-start gap-5">
          <div className="md:flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg shrink-0 bg-slate-50 text-slate-400">
                {INCENTIVE_ICON_NODE[incentive.icon] || <Building2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-[14px] font-medium text-slate-900">{incentive.title}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tagStyles[incentive.tagColor]}`}>{incentive.tag}</span>
                </div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">{incentive.source} · {incentive.amount}</span>
              </div>
            </div>
            <p className="text-[12px] leading-relaxed text-slate-400 mt-3">{incentive.description}</p>
          </div>
          {actionBlock && <div className="md:w-72 md:border-l md:border-slate-100 md:pl-5">{actionBlock}</div>}
          <div className="md:w-48 flex flex-col gap-3 md:items-end shrink-0">
            {statusChip}
            {button}
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-slate-100 p-6 bg-slate-50/50">
            {hasIntake ? (
              isSubmitted ? (
                <div className="flex items-center gap-2 text-[13px] text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Submitted for review — we’ll confirm your eligibility for {incentive.title}.
                </div>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-slate-700 mb-1">Check eligibility for {incentive.title}</p>
                  <p className="text-[12px] text-slate-400 mb-4">
                    Provide the details and documents this program requires. {incentive.url && (
                      <a href={incentive.url} target="_blank" rel="noopener noreferrer" className="text-[#2B7FFF] no-underline">View official program ↗</a>
                    )}
                  </p>

                  {incentive.intake?.fields && incentive.intake.fields.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {incentive.intake.fields.map((f, idx) => (
                        <div key={idx}>
                          <label className="block text-[12px] text-slate-500 mb-1">{f.label}</label>
                          <input type={f.type || 'text'} className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-700" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[12px] text-slate-500">{incentive.intake?.uploadLabel || 'Upload supporting documents'}</label>
                      <button onClick={() => triggerUpload(incentive.id)} className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
                        <UploadCloud className="w-3.5 h-3.5" /> Upload
                      </button>
                    </div>
                    {files.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {files.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 min-w-[180px]">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-slate-700 truncate">{file.name}</p>
                              <p className="text-[10px] text-slate-400">{file.size} · {file.date}</p>
                            </div>
                            <button onClick={() => removeFile(incentive.id, file.name)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-slate-400">No documents uploaded yet.</p>
                    )}
                  </div>

                  <button
                    onClick={() => setSubmitted(prev => ({ ...prev, [incentive.id]: true }))}
                    className="py-2.5 px-5 rounded-xl font-medium text-[13px] bg-[#2B7FFF] text-white hover:bg-blue-600 shadow-sm cursor-pointer"
                  >
                    Submit for Review
                  </button>
                </>
              )
            ) : (
              <div>
                <p className="text-[13px] font-semibold text-slate-700 mb-1">About {incentive.title}</p>
                <p className="text-[12px] text-slate-500 leading-relaxed mb-3">{incentive.description}</p>
                {incentive.actionItems && incentive.actionItems.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Key points</p>
                    <ul className="space-y-1.5 mb-3">
                      {incentive.actionItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2B7FFF]/40 mt-[5px] shrink-0" />
                          <span className="text-[12px] text-slate-600 leading-snug">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {incentive.url && (
                  <a href={incentive.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] font-medium text-[#2B7FFF] no-underline">
                    View official program page <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
