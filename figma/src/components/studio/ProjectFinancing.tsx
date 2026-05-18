import React, { useState } from 'react';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  Wallet, 
  ArrowRight, 
  Info,
  Home,
  PiggyBank,
  LineChart,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';

interface ProjectFinancingProps {
  projectCost?: number;
  onSystemNavigate?: (route: 'models' | 'how-it-works' | 'earn') => void;
}

export function ProjectFinancing({ projectCost = 189000, onSystemNavigate }: ProjectFinancingProps) {
  const [scenario, setScenario] = useState<'income' | 'family'>('income');
  
  // Calculations
  // Income Scenario
  const monthlyRent = 2400; // Est
  const annualGross = monthlyRent * 12;
  const operatingCosts = annualGross * 0.15; // 15% for maintenance/vacancy
  const annualNet = annualGross - operatingCosts;
  const fiveYearCashFlow = annualNet * 5;
  const capRate = (annualNet / projectCost) * 100;
  
  // Family Scenario
  const marketRentAvoided = 2400; 
  const annualSavings = marketRentAvoided * 12;
  const fiveYearSavings = annualSavings * 5;

  // Lenders Logic
  const calculatePayment = (amount: number, rate: number, years: number) => {
    const r = rate / 100 / 12;
    const n = years * 12;
    return (amount * r * (Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  };

  const lenders = [
    { 
       id: 1, 
       name: 'RenoFi', 
       logo: 'RF', 
       type: 'Renovation HELOC', 
       rate: 7.25, 
       term: 20,
       features: ['Loans based on future value', 'No refinancing required', 'Fast approval']
    },
    { 
       id: 2, 
       name: 'SoFi', 
       logo: 'SF', 
       type: 'Personal Loan', 
       rate: 8.99, 
       term: 7,
       features: ['No collateral needed', 'Funding in days', 'Fixed rates']
    },
    { 
       id: 3, 
       name: 'Local Credit Union', 
       logo: 'CU', 
       type: 'Construction Loan', 
       rate: 6.50, 
       term: 30,
       features: ['Lowest rates', 'Local servicing', 'Interest-only during build']
    }
  ];

  // Helper for consistent card headers
  const CardHeader = ({ icon: Icon, title, badge }: any) => (
    <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-900 shadow-sm border border-slate-200/50">
                <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
        </div>
        {badge && (
            <div className={badge.className}>
                {badge.text}
            </div>
        )}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 font-sans">
        <div className="max-w-5xl mx-auto space-y-12">
            
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Project Value Planner</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <p className="text-slate-500 max-w-2xl text-sm leading-relaxed">
                        Analyze the financial impact and long-term value of your ADU project based on how you intend to use it.
                    </p>
                    <button 
                       onClick={() => onSystemNavigate?.('earn')}
                       className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                       How revenue sharing works <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* SECTION 1: VALUE PLANNING */}
            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* LEFT COLUMN: INPUTS & ANCHORS */}
                <div className="space-y-6">
                    
                    {/* 1. Project Cost Anchor */}
                    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                        <CardHeader icon={Building2} title="Project Snapshot" />
                        
                        <div className="mb-4 pl-1">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Project Cost</div>
                            <div className="text-3xl font-black text-slate-900 tracking-tight">
                                ${projectCost.toLocaleString()}
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-2 p-4 bg-slate-50 rounded-2xl text-xs text-slate-500 leading-relaxed">
                            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <p>Includes construction, selected upgrades, and furniture. This cost does not change across scenarios.</p>
                        </div>
                    </div>

                    {/* 2. Scenario Selector */}
                    <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm">
                        <CardHeader icon={SlidersHorizontal} title="Usage Assumptions" />
                        
                        <div className="space-y-3">
                            <button
                                onClick={() => setScenario('income')}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all relative group ${
                                    scenario === 'income' 
                                        ? 'border-blue-600 bg-blue-50/50' 
                                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-1">
                                    <div className={`p-1.5 rounded-lg ${scenario === 'income' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <span className={`font-bold ${scenario === 'income' ? 'text-blue-900' : 'text-slate-900'}`}>Income-Generating</span>
                                </div>
                                <p className="text-xs text-slate-500 pl-10">Long-term rental or Airbnb income.</p>
                                {scenario === 'income' && <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-blue-600" />}
                            </button>

                            <button
                                onClick={() => setScenario('family')}
                                className={`w-full p-4 rounded-2xl border-2 text-left transition-all relative group ${
                                    scenario === 'family' 
                                        ? 'border-emerald-600 bg-emerald-50/50' 
                                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3 mb-1">
                                    <div className={`p-1.5 rounded-lg ${scenario === 'family' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <span className={`font-bold ${scenario === 'family' ? 'text-emerald-900' : 'text-slate-900'}`}>Family / Personal</span>
                                </div>
                                <p className="text-xs text-slate-500 pl-10">Multi-generational living or personal space.</p>
                                {scenario === 'family' && <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-emerald-600" />}
                            </button>
                        </div>

                        <p className="mt-4 text-[10px] text-slate-400 text-center font-medium">
                            Affects value calculation only. No commitment required.
                        </p>
                    </div>

                </div>

                {/* RIGHT COLUMN: DYNAMIC RESULTS */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* 3. Value Results */}
                    <div className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-xl shadow-slate-200/50">
                        
                        <CardHeader 
                            icon={LineChart} 
                            title={scenario === 'income' ? 'Projected Rental Value' : 'Cost Avoidance Value'}
                            badge={{
                                text: scenario === 'income' ? 'Income Scenario' : 'Personal Use Scenario',
                                className: `px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                    scenario === 'income' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`
                            }}
                        />

                        {scenario === 'income' ? (
                            <div className="space-y-8">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Est. Monthly Rent</div>
                                        <div className="text-3xl font-black text-slate-900 tracking-tight">${monthlyRent.toLocaleString()}</div>
                                        <div className="text-xs font-medium text-slate-400 mt-1">Market avg. for 1BR ADU</div>
                                    </div>
                                    <div className="p-6 bg-blue-50/50 rounded-[24px] border border-blue-100">
                                        <div className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-2">Annual Net Income</div>
                                        <div className="text-3xl font-black text-blue-900 tracking-tight">${annualNet.toLocaleString()}</div>
                                        <div className="text-xs font-medium text-blue-400 mt-1">After 15% est. operating costs</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-4 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">5-Year Projection</span>
                                    </div>
                                    <div className="bg-slate-900 rounded-[24px] p-8 text-white relative overflow-hidden group">
                                        {/* Abstract background accent */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors" />

                                        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-8 relative z-10">
                                            <div>
                                                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Cumulative Cash Flow</div>
                                                <div className="text-5xl font-black text-emerald-400 tracking-tight">+${fiveYearCashFlow.toLocaleString()}</div>
                                            </div>
                                            <div className="sm:text-right">
                                                 <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">ROI (Cap Rate)</div>
                                                 <div className="text-2xl font-bold text-white">{capRate.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                        <div className="p-5 bg-white/5 rounded-2xl text-sm text-slate-300 leading-relaxed border border-white/10 backdrop-blur-sm">
                                            <span className="text-white font-bold">Insight:</span> This asset generates positive cash flow that can offset mortgage payments or build passive income. The property value also increases by adding livable square footage.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                             <div className="space-y-8">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-6 bg-slate-50 rounded-[24px] border border-slate-100">
                                        <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Market Rent Avoided</div>
                                        <div className="text-3xl font-black text-slate-900 tracking-tight">${marketRentAvoided.toLocaleString()}</div>
                                        <div className="text-xs font-medium text-slate-400 mt-1">Monthly cost for equivalent unit</div>
                                    </div>
                                    <div className="p-6 bg-emerald-50/50 rounded-[24px] border border-emerald-100">
                                        <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2">Annual Living Savings</div>
                                        <div className="text-3xl font-black text-emerald-900 tracking-tight">${annualSavings.toLocaleString()}</div>
                                        <div className="text-xs font-medium text-emerald-400 mt-1">Disposable income retained</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-4 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">5-Year Value Retention</span>
                                    </div>
                                    <div className="bg-emerald-900 rounded-[24px] p-8 text-white relative overflow-hidden group">
                                         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-400/20 transition-colors" />

                                        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 mb-8 relative z-10">
                                            <div>
                                                <div className="text-emerald-200/80 text-xs font-bold uppercase tracking-wider mb-1">Total Cost Avoidance</div>
                                                <div className="text-5xl font-black text-white tracking-tight">${fiveYearSavings.toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <div className="p-5 bg-white/5 rounded-2xl text-sm text-emerald-100/90 leading-relaxed border border-white/10 backdrop-blur-sm">
                                            <span className="text-white font-bold">Insight:</span> By housing family members or yourself in this ADU, you retain wealth that would otherwise be paid to landlords. This builds intergenerational equity while solving immediate housing needs.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 4. Unified Insight Card */}
                    <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-900 shrink-0">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-slate-900 mb-2">Construction Cost vs. Value</h4>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Regardless of use, this ADU converts a fixed construction cost into long-term value. 
                                    The difference is simply how that value is realized: through direct monthly income generation or through significant living cost avoidance.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* SECTION 2: FINANCING OPTIONS */}
            <div className="border-t border-slate-200 pt-12">
                <div className="flex items-center justify-between mb-8">
                     <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Personalized Financing Options</h2>
                        <p className="text-slate-500 text-sm mt-2 font-medium">Estimate monthly payments based on your ${projectCost.toLocaleString()} project cost.</p>
                     </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {lenders.map((lender) => {
                        const monthlyPayment = calculatePayment(projectCost, lender.rate, lender.term);
                        
                        return (
                            <div key={lender.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-900 font-black text-sm group-hover:scale-110 transition-transform">
                                        {lender.logo}
                                    </div>
                                    {lender.id === 1 && (
                                       <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase rounded-full tracking-wide">
                                          Recommended
                                       </span>
                                    )}
                                </div>
                                
                                <div className="mb-6 flex-1">
                                    <h3 className="font-bold text-slate-900 text-lg mb-1">{lender.name}</h3>
                                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">{lender.type}</p>
                                    
                                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl">
                                        <div className="flex justify-between items-end border-b border-slate-200/50 pb-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Rate</span>
                                            <span className="font-bold text-slate-900">{lender.rate.toFixed(2)}%</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-bold text-slate-400 uppercase">Term</span>
                                            <span className="font-bold text-slate-900">{lender.term} Years</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Est. Payment</div>
                                    <div className="text-3xl font-black text-slate-900 tracking-tight">${Math.round(monthlyPayment).toLocaleString()}<span className="text-sm font-bold text-slate-400 ml-1">/mo</span></div>
                                </div>

                                <button className="w-full py-3.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200">
                                    Check Eligibility
                                </button>
                                
                                <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                                    {lender.features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-2 text-[10px] text-slate-500 font-bold">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            {feature}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-[24px] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-200">
                    <div>
                        <h3 className="text-xl font-bold mb-2">Not ready to apply?</h3>
                        <p className="text-blue-100 text-sm max-w-xl font-medium">
                            You can save this financing plan to your project profile. When you're ready to move forward, our team will connect you directly with your preferred lender.
                        </p>
                    </div>
                    <button className="whitespace-nowrap px-8 py-3.5 bg-white text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg">
                        Save Financing Plan
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
}