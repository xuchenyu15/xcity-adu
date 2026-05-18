import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  Wallet, 
  TrendingUp, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Phone,
  Calendar,
  ShieldCheck,
  Lightbulb,
  Banknote,
  FileCheck,
  Info
} from 'lucide-react';

export function WebsiteFinancing() {
  const [usageMode, setUsageMode] = useState<'income' | 'personal'>('income');

  // Mock Project Data
  const project = {
    address: "123 Main Street",
    city: "Los Angeles",
    state: "CA",
    model: "Nordic Minimalist (1 Bed)",
    cost: 189000,
  };

  // Mock Financial Data
  const data = {
    income: {
      monthly: 2400,
      annualNet: 24480, // After 15% expenses
      fiveYearCumulative: 122400,
      roi: 13.0,
      breakeven: "6.2 Years",
      insight: "This asset generates positive cash flow that can offset mortgage payments or build passive income. The property value also increases by adding livable square footage."
    },
    personal: {
      monthly: 1800, // Imputed savings vs renting elsewhere
      annualNet: 21600,
      fiveYearCumulative: 108000,
      roi: 11.4,
      breakeven: "7.1 Years",
      insight: "By housing family members, you save significantly on comparable local rent or care facilities while increasing your property's resale value."
    }
  };

  const activeData = data[usageMode];

  // Mock Incentives
  const incentives = [
    { name: "ADU Grant Program", type: "Grant", value: "$40,000", status: "Likely Eligible" },
    { name: "Energy Efficiency Rebate", type: "Rebate", value: "$3,500", status: "Eligibility Depends" },
    { name: "Property Tax Exclusion", type: "Tax Relief", value: "~1% / yr", status: "Requires Review" },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 font-sans p-8 pb-32">
      
      {/* 1. HEADER */}
      <div className="max-w-6xl mx-auto mb-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Project Value Planner</h1>
        <p className="text-slate-500 max-w-2xl">
          Personalized financial insights based on your project, location, and local policies.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: Inputs & Context */}
        <div className="space-y-6">
          
          {/* 2. PROJECT SNAPSHOT */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 rounded-xl">
                   <Building2 className="w-5 h-5 text-slate-900" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Project Snapshot</h3>
             </div>

             <div className="space-y-4">
                <div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Project Cost</div>
                   <div className="text-3xl font-black text-slate-900 tracking-tight">
                      ${project.cost.toLocaleString()}
                   </div>
                </div>
                
                <div className="h-px bg-slate-100" />
                
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</div>
                      <div className="text-sm font-bold text-slate-700 flex items-center gap-1">
                         <MapPin className="w-3 h-3" /> {project.city}, {project.state}
                      </div>
                   </div>
                   <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Model</div>
                      <div className="text-sm font-bold text-slate-700">
                         {project.model}
                      </div>
                   </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 flex gap-2 items-start border border-slate-100">
                   <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                   <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                      Includes construction, selected upgrades, and furniture. This cost does not change across scenarios.
                   </p>
                </div>
             </div>
          </div>

          {/* 3. USAGE ASSUMPTION */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-slate-100 rounded-xl">
                   <Users className="w-5 h-5 text-slate-900" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Usage Assumption</h3>
             </div>

             <div className="space-y-3">
                <button 
                  onClick={() => setUsageMode('income')}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all group relative ${
                     usageMode === 'income' 
                     ? 'border-blue-600 bg-blue-50/50' 
                     : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                   <div className="flex justify-between items-start mb-1">
                      <span className={`font-bold text-sm ${usageMode === 'income' ? 'text-blue-700' : 'text-slate-700'}`}>Income-Generating</span>
                      {usageMode === 'income' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                   </div>
                   <p className="text-[10px] font-medium text-slate-500">Long-term rental or Airbnb income.</p>
                </button>

                <button 
                  onClick={() => setUsageMode('personal')}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all group relative ${
                     usageMode === 'personal' 
                     ? 'border-emerald-600 bg-emerald-50/50' 
                     : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                   <div className="flex justify-between items-start mb-1">
                      <span className={`font-bold text-sm ${usageMode === 'personal' ? 'text-emerald-700' : 'text-slate-700'}`}>Family / Personal</span>
                      {usageMode === 'personal' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                   </div>
                   <p className="text-[10px] font-medium text-slate-500">Multi-generational living or personal space.</p>
                </button>
             </div>
             
             <p className="text-[10px] font-bold text-slate-400 mt-4 text-center">
                This selection only affects value calculation.
             </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Outcomes & Analysis */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* 4. FINANCIAL VALUE OUTCOME */}
           <div className="bg-white rounded-[32px] p-8 shadow-lg shadow-slate-200/50 border border-slate-200">
              
              {/* Header - Unified with Left Column */}
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl">
                       <Wallet className="w-5 h-5 text-slate-900" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Financial Projection</h3>
                 </div>

                 <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    usageMode === 'income' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                 }`}>
                    {usageMode === 'income' ? 'Income Scenario' : 'Savings Scenario'}
                 </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                 <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 relative group hover:border-slate-200 transition-colors">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                       {usageMode === 'income' ? 'Est. Monthly Rent' : 'Est. Monthly Value'}
                    </div>
                    <div className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                       ${activeData.monthly.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">
                       Market avg. for 1BR ADU in {project.city}
                    </div>
                 </div>

                 <div className={`rounded-2xl p-6 border transition-colors ${
                    usageMode === 'income' ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'
                 }`}>
                    <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
                       usageMode === 'income' ? 'text-blue-500' : 'text-emerald-500'
                    }`}>
                       Annual Net Benefit
                    </div>
                    <div className={`text-4xl font-black tracking-tight mb-2 ${
                       usageMode === 'income' ? 'text-blue-600' : 'text-emerald-600'
                    }`}>
                       ${activeData.annualNet.toLocaleString()}
                    </div>
                    <div className={`text-[10px] font-bold ${
                       usageMode === 'income' ? 'text-blue-400' : 'text-emerald-400'
                    }`}>
                       {usageMode === 'income' ? 'After 15% est. operating costs' : 'Equivalent rent savings'}
                    </div>
                 </div>
              </div>

              {/* 5-Year Projection Dark Card */}
              <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                 
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8 opacity-80">
                       <TrendingUp className="w-4 h-4 text-emerald-400" />
                       <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">5-Year Projection</span>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between md:items-end gap-8 mb-8">
                       <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cumulative Benefit</div>
                          <div className="text-5xl font-black text-emerald-400 tracking-tight">
                             +${activeData.fiveYearCumulative.toLocaleString()}
                          </div>
                       </div>
                       <div className="md:text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Est. ROI (Cap Rate)</div>
                          <div className="text-3xl font-bold text-white tracking-tight">
                             {activeData.roi}%
                          </div>
                       </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur-md">
                       <h4 className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Lightbulb className="w-3 h-3" /> Analyst Insight
                       </h4>
                       <p className="text-sm font-medium text-slate-300 leading-relaxed">
                          {activeData.insight}
                       </p>
                    </div>
                 </div>
              </div>
           </div>
           
           {/* Insight Footer */}
           <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-start gap-4">
              <div className="p-2 bg-slate-100 rounded-xl shrink-0">
                  <Wallet className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                 <h3 className="text-sm font-bold text-slate-900 mb-1">Construction Cost vs. Long-Term Value</h3>
                 <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                    Regardless of use, this ADU converts a fixed construction cost into long-term value. The difference is simply how that value is realized: through direct monthly income generation or through significant living cost avoidance.
                 </p>
              </div>
           </div>

           {/* 5. LOCAL INCENTIVES */}
           <div>
              <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-slate-100 rounded-xl">
                      <Banknote className="w-5 h-5 text-slate-900" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      Available Incentives
                      <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold">
                          {project.city}, {project.state}
                      </span>
                  </h3>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                 {incentives.map((item, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                       <div className="mb-4">
                          <div className="flex justify-between items-start mb-3">
                             <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {item.type}
                             </span>
                             {item.status === "Likely Eligible" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                             {item.status === "Eligibility Depends" && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                             {item.status === "Requires Review" && <AlertCircle className="w-4 h-4 text-slate-400" />}
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.name}</h4>
                       </div>
                       
                       <div className="border-t border-slate-100 pt-3">
                          <div className="text-lg font-black text-emerald-600">{item.value}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-400">
                             {item.status}
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
           
           {/* 6. RECOMMENDED NEXT STEPS & SPECIALIST */}
           <div className="grid md:grid-cols-2 gap-6">
              {/* Recommendation */}
              <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-lg shadow-blue-600/20 flex flex-col justify-between relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
                 
                 <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                          <FileCheck className="w-5 h-5 text-white" />
                       </div>
                       <h3 className="text-xs font-bold uppercase tracking-wider text-blue-100">Recommended Action</h3>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Optimize Design for ROI</h3>
                    <p className="text-sm font-medium text-blue-100 leading-relaxed mb-8 opacity-90">
                       Based on your project cost and local rental data, a small increase in bedroom count could boost ROI by 15%.
                    </p>
                 </div>
                 <button className="relative z-10 w-full py-3.5 bg-white text-blue-600 font-bold rounded-xl text-xs hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 uppercase tracking-wide shadow-lg shadow-blue-900/10">
                    Review Design Options <ArrowRight className="w-3 h-3" />
                 </button>
              </div>

              {/* Specialist */}
              <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-lg flex flex-col justify-between relative overflow-hidden group">
                 <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-800 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />

                 <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                          <Phone className="w-5 h-5 text-slate-300" />
                       </div>
                       <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Expert Review</h3>
                    </div>
                    <h3 className="text-xl font-bold mb-2">Talk to a Financial Specialist</h3>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed mb-8">
                       Verify incentive eligibility and confirm your long-term strategy with a certified ADU planner.
                    </p>
                 </div>
                 <button className="relative z-10 w-full py-3.5 bg-slate-800 text-white font-bold rounded-xl text-xs hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center gap-2 uppercase tracking-wide">
                    Schedule Free Review <Calendar className="w-3 h-3" />
                 </button>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}