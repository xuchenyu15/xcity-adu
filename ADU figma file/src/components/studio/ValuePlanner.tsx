import React, { useState, useRef } from 'react';
import { 
  ArrowRight,
  CheckCircle2,
  FileSignature,
  ShieldCheck,
  MessageSquare,
  ChevronDown,
  Info,
  ExternalLink,
  Check,
  Upload,
  UploadCloud,
  FileText,
  Building2,
  Landmark,
  ScrollText,
  X,
} from 'lucide-react';
import { ExitBuybackModule } from './ExitBuybackModule';
import { PageTitle, PageSubtitle, SectionTitle, SubsectionLabel, BodyMuted } from './Typography';

interface ValuePlannerProps {
  theme?: 'dark' | 'light';
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

export function ValuePlanner({ theme = 'light', onAction, onNavigate, onComplete }: ValuePlannerProps) {
  const isDark = theme === 'dark';
  
  // State
  const [buyBackYear, setBuyBackYear] = useState<number | null>(null);
  const [lockState, setLockState] = useState<'unlocked' | 'cooling' | 'final'>('unlocked');
  const [contractStatus, setContractStatus] = useState<'reviewing' | 'ready' | 'signed'>('reviewing');
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // Constants
  const CONSTRUCTION_COST = 123000;
  const MONTHLY_RENT = 2900;
  const MONTHLY_NET = MONTHLY_RENT * 0.5;
  const ANNUAL_NET = MONTHLY_NET * 12;
  const INFLATION_RATE = 0.05;
  
  const fmtCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  // Incentives as selectable rows
  const [incentives, setIncentives] = useState<Incentive[]>([
    { 
      id: 'calhfa', 
      title: 'Plus One ADU Program', 
      source: 'CalHFA', 
      amount: 'Up to $40,000', 
      impactLabel: '+$40K one-time',
      description: 'Reimburses pre-development and non-recurring closing costs for qualifying ADU projects.',
      selected: false 
    },
    { 
      id: 'sect8', 
      title: 'Section 8 Voucher Bonus', 
      source: 'Local Housing Authority', 
      amount: '$1,500', 
      impactLabel: '+$1.5K one-time',
      description: 'Bonus incentive for leasing to eligible voucher holders.',
      selected: false 
    },
    { 
      id: 'impact', 
      title: 'Development Fee Waiver', 
      source: 'City Planning', 
      amount: 'Est. $4,000–$9,000', 
      impactLabel: '+$4–9K est.',
      description: 'Local planning fee reductions integrated into your project cost where applicable.',
      selected: false 
    }
  ]);

  const toggleIncentive = (id: string) => {
    setIncentives(prev => prev.map(inc => 
      inc.id === id ? { ...inc, selected: !inc.selected } : inc
    ));
  };

  const selectedIncentives = incentives.filter(i => i.selected);

  const capitalItems = [
    { label: 'Prefab Construction & Shipping', amount: '$52,000' },
    { label: 'Site Construction & Installation', amount: '$33,000' },
    { label: 'Architectural Design & Permits', amount: '$18,000' },
    { label: 'Furniture & Delivery', amount: '$20,000' },
  ];

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto font-sans p-6 lg:p-10 bg-slate-50 text-slate-600">
      <div className="max-w-7xl mx-auto w-full pb-20">
        
        {/* PAGE HEADER */}
        <div className="mb-12">
          <PageTitle>Financial Terms</PageTitle>
          <PageSubtitle className="mt-2 max-w-2xl">
            Review the financial structure, choose your exit timing, and finalize your commitment.
          </PageSubtitle>
        </div>

        {/* ─── 1. FINANCIAL SNAPSHOT — lightweight context strip ─── */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <SubsectionLabel>Financial Snapshot</SubsectionLabel>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Upfront Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#c7d8f5]/25 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[36px] font-semibold tracking-tight text-slate-900">$0</span>
                  <span className="text-[14px] font-medium text-slate-400">Upfront</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[13px] text-slate-400">
                  <span className="line-through decoration-slate-300">$123,000</span>
                  <span>traditional cost</span>
                </div>
              </div>
            </div>

            {/* Monthly Income Card */}
            <div className="relative overflow-hidden rounded-2xl border border-[#2B7FFF]/15 bg-[#f4f7ff] p-6">
              <div className="absolute -top-12 -right-12 w-56 h-56 bg-[#2B7FFF]/[0.08] rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[36px] font-semibold tracking-tight text-[#2B7FFF]">+$1,450</span>
                  <span className="text-[14px] font-medium text-[#2B7FFF]/50">/ mo</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-slate-400">
                  <span>50/50 revenue share</span>
                  <span className="text-slate-300">·</span>
                  <span>Base rent $2,900</span>
                  <span className="text-slate-300">·</span>
                  <span>7.2% yield</span>
                </div>
              </div>
            </div>
          </div>

          {/* Expandable breakdown */}
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
                <SubsectionLabel className="mb-3">Capital Breakdown</SubsectionLabel>
                <div className="space-y-2.5">
                  {capitalItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-500">{item.label}</span>
                      <span className="text-[12px] font-semibold tabular-nums text-slate-900">{item.amount}</span>
                    </div>
                  ))}
                </div>
                <BodyMuted className="mt-3 text-[11px]">
                  Capital fully funded by XHomes. Buyback based on deployed capital.
                </BodyMuted>
              </div>

              <div>
                <SubsectionLabel className="mb-3">Income Assumptions</SubsectionLabel>
                <div className="space-y-2.5">
                  {[
                    { label: 'Base Rent', value: '$2,900 / mo' },
                    { label: 'Rent Growth', value: '3% / yr (est.)' },
                    { label: 'Vacancy', value: '5% (est.)' },
                    { label: 'Asset Appreciation', value: '2–3% / yr (ref.)' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-500">{item.label}</span>
                      <span className="text-[12px] font-semibold tabular-nums text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
                <BodyMuted className="mt-3 text-[11px]">
                  Yield calculated as net annual income ÷ total capital deployed.
                </BodyMuted>
              </div>
            </div>
          )}

          {/* Thin separator */}
          <div className="h-px bg-slate-200/60 mt-8" />
        </div>

        {/* ─── 2. CHOOSE YOUR EXIT TIMING — primary decision block ─── */}
        <div className="mb-12">
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
            onLock={() => {
              if (lockState === 'unlocked') setLockState('cooling');
              else if (lockState === 'cooling') setLockState('final');
            }}
            fmtCurrency={fmtCurrency}
            ANNUAL_NET={ANNUAL_NET}
            CONSTRUCTION_COST={CONSTRUCTION_COST}
            INFLATION_RATE={INFLATION_RATE}
            selectedAdjustments={selectedIncentives.map(i => ({
              label: i.title,
              impact: i.impactLabel
            }))}
          />
        </div>

        {/* ─── 3. INCENTIVE REVIEW SUMMARY ─── */}
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

        {/* ─── 4. FINALIZE COMMITMENT ─── */}
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
                      else if (contractStatus === 'ready') {
                        setContractStatus('signed');
                        onComplete?.();
                      }
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

interface UploadedFile {
  name: string;
  size: string;
  date: string;
}

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

// --- Incentive Review Summary Configuration ---
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
    tag: 'Income-Restricted',
    tagColor: 'blue',
    statusLabel: 'Documentation Required',
    statusColor: 'blue',
    description: 'State-level grant program supporting qualifying ADU projects.',
    actionItems: [
      'Income verification documentation required',
      'Owner-occupancy confirmation required',
    ],
    buttonLabel: 'Upload Income Documents',
    buttonVariant: 'primary',
  },
  sect8: {
    tag: 'Optional Rental Strategy',
    tagColor: 'gray',
    statusLabel: '',
    statusColor: 'gray',
    description: 'Bonus incentive for leasing to eligible voucher holders.',
    actionItems: [
      'Tenant must hold a valid Housing Choice Voucher (Section 8)',
      'Minimum 12-month lease term commitment required',
      'Unit must pass Housing Quality Standards (HQS) inspection',
      'Landlord registration with local Housing Authority required',
    ],
    buttonLabel: 'Learn More',
    buttonVariant: 'outline',
  },
  impact: {
    tag: 'Integrated',
    tagColor: 'emerald',
    statusLabel: '',
    statusColor: 'emerald',
    description: 'Local planning fee reductions integrated into your project cost where applicable.',
    actionItems: [
      'ADU must be under 750 sqft to qualify for full waiver',
      'No outstanding code violations on the property',
    ],
    buttonLabel: 'Learn More',
    buttonVariant: 'outline',
  },
};

function IncentivesSection({ incentives, toggleIncentive, selectedIncentives }: IncentivesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    { name: 'Site Survey.pdf', size: '2.4 MB', date: 'Oct 12, 2025' },
    { name: 'Property Deed.pdf', size: '1.1 MB', date: 'Oct 12, 2025' },
  ]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
      {/* Project Documents Card */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[14px] font-medium text-slate-900">Project Documents</span>
              <p className="text-[12px] text-slate-400 mt-0.5">Supporting documents for incentive verification and compliance</p>
            </div>
          </div>
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 bg-[#2B7FFF] text-white hover:bg-blue-600 rounded-lg font-medium text-[13px] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg"
            multiple
            onChange={handleFileChange}
          />
        </div>

        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {uploadedFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 min-w-[200px]"
              >
                <div className="p-1.5 bg-white rounded-md border border-slate-200 text-slate-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400">{file.size} · {file.date}</p>
                </div>
                <button
                  onClick={() => setUploadedFiles(prev => prev.filter(f => f.name !== file.name))}
                  className="p-1.5 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incentive Review Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {incentives.map((incentive) => {
          const config = INCENTIVE_REVIEW_CONFIG[incentive.id];
          if (!config) return null;

          return (
            <div
              key={incentive.id}
              className="rounded-2xl border border-slate-200 bg-white flex flex-col overflow-hidden"
            >
              {/* Card Header */}
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

                <p className="text-[12px] leading-relaxed text-slate-400 mb-4">
                  {config.description}
                </p>
              </div>

              {/* Action Required Section */}
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

              {/* Footer: Status + Action */}
              <div className="p-6 pt-4 mt-auto">
                {/* Status Badge */}
                {config.statusLabel && (
                  <div className="mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusStyles[config.statusColor]}`}>
                      {config.statusColor === 'emerald' && <CheckCircle2 className="w-3 h-3" />}
                      {config.statusColor === 'blue' && <FileText className="w-3 h-3" />}
                      {config.statusLabel}
                    </span>
                  </div>
                )}
                {/* Action Button */}
                {config.buttonLabel && config.buttonVariant === 'primary' && (
                  <button
                    onClick={handleUploadClick}
                    className="w-full py-2.5 rounded-xl font-medium text-[13px] transition-all cursor-pointer flex items-center justify-center gap-2 bg-[#2B7FFF] text-white hover:bg-blue-600 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {config.buttonLabel}
                  </button>
                )}
                {config.buttonLabel && config.buttonVariant === 'outline' && (
                  <button
                    className="w-full py-2.5 rounded-xl font-medium text-[13px] transition-all cursor-pointer flex items-center justify-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  >
                    {config.buttonLabel}
                    <ExternalLink className="w-3 h-3" />
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