import React from 'react';
import { 
  Building2, 
  TrendingUp, 
  ShieldCheck,
  ClipboardList,
  Hammer,
  PlayCircle,
  RefreshCcw,
  Info,
  CircleDot,
  ArrowRight,
  MousePointerClick
} from 'lucide-react';

interface FinanceModuleProps {
  theme?: 'dark' | 'light';
  onAction?: () => void;
}

export function FinanceModule({ theme = 'light', onAction }: FinanceModuleProps) {
  const isDark = theme === 'dark';

  return (
    <div className={`w-full h-full overflow-y-auto font-sans ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
      <div className="max-w-5xl mx-auto px-6 py-20">
        
        {/* Header */}
        <div className="text-center mb-24">
           <h1 className={`text-4xl md:text-5xl font-bold mb-6 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Shared Investment Model
           </h1>
           <p className={`text-xl max-w-2xl mx-auto leading-relaxed font-light ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              A zero-upfront path to ownership. 
              <br className="hidden md:block" />
              We build it. You earn from it. You decide when to own it.
           </p>
        </div>

        {/* Timeline Journey */}
        <div className="relative mb-32">
           {/* Continuous Line */}
           <div className={`absolute left-8 md:left-1/2 top-0 bottom-0 w-px transform md:-translate-x-1/2 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

           <div className="space-y-16 md:space-y-24">

              {/* PHASE 1 · Project Setup (HERO) */}
              <TimelinePhase 
                 phase="01"
                 title="Project Setup"
                 type="hero"
                 side="left"
                 icon={ClipboardList}
                 isDark={isDark}
              >
                 <p className={`text-xl font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Zero-upfront entry.
                 </p>
                 <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                    Property is approved and enters the XHomes Rental ADU program. 
                    Construction, design, and setup are fully funded by XHomes.
                 </p>
              </TimelinePhase>

              {/* PHASE 2 · Construction (SUPPORT) */}
              <TimelinePhase 
                 phase="02"
                 title="Construction & Delivery"
                 type="support"
                 side="right"
                 icon={Hammer}
                 isDark={isDark}
              >
                 <p className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    ADU is built and prepared for rental.
                 </p>
                 <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    No rental income is generated during this phase.
                 </p>
              </TimelinePhase>

              {/* PHASE 3 · Managed Rental Begins (HERO) */}
              <TimelinePhase 
                 phase="03"
                 title="Managed Rental Begins"
                 type="hero"
                 side="left"
                 icon={PlayCircle}
                 isDark={isDark}
              >
                 <div className="mb-6">
                    <p className={`text-xl font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                       Cash flow turns on.
                    </p>
                    <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                       Rental income begins. XHomes manages tenant placement, leasing, and day-to-day operations.
                    </p>
                 </div>

                 {/* System Note */}
                 <div className={`rounded-xl p-4 border flex gap-4 items-start ${
                     isDark ? 'bg-blue-900/20 border-blue-900/50' : 'bg-blue-50/50 border-blue-100'
                 }`}>
                    <Info className={`w-5 h-5 mt-0.5 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    <div className="space-y-1">
                        <p className={`text-sm font-bold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>
                           Profit Sharing Activation
                        </p>
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-blue-300/80' : 'text-blue-800/80'}`}>
                           Approved incentives and early rental returns are applied to the homeowner’s benefit first. 
                           Revenue sharing begins once cumulative returns reach the agreed activation point.
                        </p>
                    </div>
                 </div>
              </TimelinePhase>

              {/* PHASE 4 · Ongoing Shared Performance (SUPPORT) */}
              <TimelinePhase 
                 phase="04"
                 title="Ongoing Shared Performance"
                 type="support"
                 side="right"
                 icon={TrendingUp}
                 isDark={isDark}
              >
                 <p className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Full management.
                 </p>
                 <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Rental operates under full management with stable shared income.
                 </p>
              </TimelinePhase>

              {/* PHASE 5 · Optional Buyback Path (HERO/DECISION) */}
              <TimelinePhase 
                 phase="05"
                 title="Optional Buyback Path"
                 type="hero"
                 side="left"
                 icon={MousePointerClick}
                 isDark={isDark}
              >
                 <p className={`text-xl font-medium mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    The decision is yours.
                 </p>
                 <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} leading-relaxed mb-6`}>
                    Homeowners may choose to buy back the ADU at any time. 
                    Pricing is calculated based on construction cost, time, and returns already shared.
                 </p>
                 
                 <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                     isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'
                 }`}>
                    <RefreshCcw className="w-3 h-3" />
                    Terms viewable in dashboard
                 </div>
              </TimelinePhase>

              {/* PHASE 6 · Full Ownership (FINAL) */}
              <TimelinePhase 
                 phase="06"
                 title="Full Ownership"
                 type="final"
                 side="right"
                 icon={ShieldCheck}
                 isDark={isDark}
              >
                 <p className="text-2xl font-bold text-white mb-2">
                    Complete Control.
                 </p>
                 <p className="text-slate-400 leading-relaxed mb-6">
                    All rental income belongs to the homeowner. 
                    XHomes exits the investment or continues only as an optional management partner.
                 </p>
                 <div className="h-1 w-20 bg-emerald-500 rounded-full" />
              </TimelinePhase>

           </div>
        </div>

        {/* Footer CTA */}
        {onAction && (
          <div className="text-center max-w-xl mx-auto py-12">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-8">Ready to start?</p>
              <button 
                onClick={onAction}
                className={`px-10 py-5 rounded-full font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 ${
                  isDark 
                    ? 'bg-white text-slate-900 hover:bg-slate-200' 
                    : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}>
                Check if your property qualifies
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelinePhase({ 
  phase, 
  title, 
  icon: Icon,
  children, 
  side = 'left',
  type = 'support',
  isDark = false
}: { 
  phase: string; 
  title: string; 
  icon: any;
  children: React.ReactNode; 
  side: 'left' | 'right';
  type: 'hero' | 'support' | 'final';
  isDark: boolean;
}) {
  const isHero = type === 'hero';
  const isFinal = type === 'final';
  const isSupport = type === 'support';

  const getBgClass = () => {
      if (isHero) return isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
      if (isFinal) return 'bg-slate-900 shadow-slate-900/20'; // Keep final dark always? Or maybe slate-800 in dark mode
      return ''; // Support doesn't have bg
  };

  const getShadowClass = () => {
      if (isHero) return isDark ? 'shadow-black/50' : 'shadow-slate-200/50';
      return '';
  };

  return (
    <div className={`flex flex-col md:flex-row items-center gap-8 md:gap-0 ${side === 'right' ? 'md:flex-row-reverse' : ''}`}>
       
       {/* Content Side */}
       <div className={`flex-1 w-full md:w-auto ${side === 'left' ? 'md:pr-16 md:text-right' : 'md:pl-16 md:text-left'} pl-16 md:pl-0`}>
          
          <div className={`relative transition-all duration-500 ${getBgClass()} ${getShadowClass()} ${
              isHero ? 'p-8 rounded-3xl shadow-xl border' : 
              isFinal ? 'p-8 rounded-3xl shadow-2xl' :
              'py-4 opacity-75 hover:opacity-100'
          }`}>
             {/* Mobile-only connector for support phases to keep flow visible */}
             
             <div className="flex flex-col h-full justify-center">
                 <div className={`flex items-center gap-3 mb-4 ${side === 'left' ? 'md:flex-row-reverse' : ''}`}>
                    <span className={`text-xs font-bold tracking-widest uppercase ${isFinal ? 'text-slate-500' : 'text-slate-400'}`}>Phase {phase}</span>
                    <div className={`h-px flex-1 ${isFinal ? 'bg-slate-700' : (isDark ? 'bg-slate-800' : 'bg-slate-200')}`} />
                 </div>
                 
                 <h3 className={`font-bold mb-4 ${
                     isHero ? (isDark ? 'text-white' : 'text-slate-900') : 
                     isFinal ? 'text-white' :
                     (isDark ? 'text-slate-400' : 'text-slate-700')
                 }`}>{title}</h3>
                 
                 <div className={`text-left ${side === 'left' ? 'md:text-right' : ''}`}>
                    {children}
                 </div>
             </div>
          </div>
       </div>

       {/* Center Line/Icon */}
       <div className="absolute left-8 md:left-1/2 transform -translate-x-1/2 flex flex-col items-center">
          <div className={`rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
             isHero ? `w-16 h-16 border-4 shadow-lg ${isDark ? 'bg-slate-900 border-slate-950 text-blue-400' : 'bg-white border-slate-50 text-blue-600'}` : 
             isFinal ? 'w-16 h-16 bg-slate-900 border-4 border-white shadow-xl text-white' :
             `w-10 h-10 border-4 ${isDark ? 'bg-slate-800 border-slate-950 text-slate-500' : 'bg-slate-100 border-white text-slate-400'}`
          }`}>
             <Icon className={`${isSupport ? 'w-4 h-4' : 'w-6 h-6'}`} />
          </div>
       </div>

       {/* Empty Side (Spacer) */}
       <div className="flex-1 hidden md:block" />
    </div>
  );
}