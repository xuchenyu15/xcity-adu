import React, { useState } from 'react';
import { DollarSign, Zap, TrendingUp, Battery, Sun, Home, Calculator, Sparkles, ChevronRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

type CalculatorMode = 'simple' | 'advanced';

export function UnifiedCalculator({ embedded = false }: { embedded?: boolean }) {
  const [mode, setMode] = useState<CalculatorMode>('simple');

  // Simple mode parameters
  const [simpleRent, setSimpleRent] = useState(2500);
  
  // Advanced mode parameters
  const [aduPrice, setAduPrice] = useState(110000);
  const [downPayment, setDownPayment] = useState(20);
  const [loanTerm, setLoanTerm] = useState(15);
  const [interestRate, setInterestRate] = useState(6.5);
  const [monthlyRent, setMonthlyRent] = useState(2500);
  const [solarCapacity, setSolarCapacity] = useState(8);
  const [batteryStorage, setBatteryStorage] = useState(13.5);

  // Simple mode calculations
  const simpleAnnualIncome = simpleRent * 12;
  const simpleFiveYearValue = simpleAnnualIncome * 5;

  // Advanced mode calculations
  const downPaymentAmount = (aduPrice * downPayment) / 100;
  const loanAmount = aduPrice - downPaymentAmount;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

  const solarMonthlyGeneration = solarCapacity * 150;
  const electricityRate = 0.32;
  const solarMonthlySavings = solarMonthlyGeneration * electricityRate;
  
  const peakOffPeakDiff = 0.25;
  const dailyCycles = 0.8;
  const batteryMonthlyArbitrage = batteryStorage * dailyCycles * 30 * peakOffPeakDiff;

  const totalEnergyIncome = solarMonthlySavings + batteryMonthlyArbitrage;
  const totalMonthlyIncome = monthlyRent + totalEnergyIncome;
  const netCashFlow = totalMonthlyIncome - monthlyPayment;

  // Chart data
  const chartData = Array.from({ length: 10 }, (_, i) => {
    const year = i + 1;
    const remainingBalance = loanAmount * Math.pow(1 + monthlyRate, year * 12) - monthlyPayment * ((Math.pow(1 + monthlyRate, year * 12) - 1) / monthlyRate);
    const cumulativeRent = monthlyRent * 12 * year;
    const cumulativeEnergy = totalEnergyIncome * 12 * year;
    
    return {
      year: `Y${year}`,
      loanBalance: Math.max(0, remainingBalance),
      cumulativeIncome: cumulativeRent + cumulativeEnergy,
      netEquity: cumulativeRent + cumulativeEnergy - (loanAmount - Math.max(0, remainingBalance)),
    };
  });

  const monthlyBreakdown = [
    { name: 'Rent', value: monthlyRent, color: '#3b82f6' }, // blue-500
    { name: 'Solar', value: solarMonthlySavings, color: '#f59e0b' }, // amber-500
    { name: 'Battery', value: batteryMonthlyArbitrage, color: '#10b981' }, // green-500
  ];

  return (
    <div id="calculator" className={`${embedded ? 'h-full' : 'py-32'} bg-slate-950 relative overflow-hidden`}>
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className={`container mx-auto px-4 max-w-7xl relative z-10 ${embedded ? 'py-8' : ''}`}>
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block bg-slate-900 text-slate-400 border border-slate-800 px-3 py-1 mb-6 text-xs font-bold tracking-widest uppercase rounded-full">
            Financial Modeling
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Calculate Your <span className="text-blue-500">ROI</span>
          </h2>
          <p className="text-lg text-slate-400 font-light">
            Real-time projections for rental yield, energy arbitrage, and asset appreciation.
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-full p-1.5 gap-1">
            <button
              onClick={() => setMode('simple')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all
                ${mode === 'simple' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-500 hover:text-slate-300'
                }
              `}
            >
              <Calculator className="h-4 w-4" />
              Quick View
            </button>
            <button
              onClick={() => setMode('advanced')}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all
                ${mode === 'advanced' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-500 hover:text-slate-300'
                }
              `}
            >
              <Sparkles className="h-4 w-4" />
              Advanced
            </button>
          </div>
        </div>

        {/* Simple Mode */}
        {mode === 'simple' && (
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h3 className="text-3xl font-bold text-white">
                Turn your backyard into a <br/> <span className="text-blue-500">Revenue Engine</span>.
              </h3>
              <p className="text-slate-400 text-lg leading-relaxed">
                XHomes units are high-precision hardware designed for performance. 
                Whether for rental income or increased property valuation, the numbers speak for themselves.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4 items-start p-4 border border-slate-800 rounded-2xl bg-slate-900/30">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-500 border border-blue-500/20">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">High Yield Asset</h4>
                    <p className="text-slate-500 text-sm">Premium modern design commands 30% higher rental rates than traditional ADUs.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-4 border border-slate-800 rounded-2xl bg-slate-900/30">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-500 border border-amber-500/20">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1">Energy Independent</h4>
                    <p className="text-slate-500 text-sm">Integrated solar and battery systems can eliminate utility costs entirely.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 lg:p-10 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
               
              <div className="relative z-10 space-y-10">
                <div className="text-center">
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">Estimated Monthly Revenue</p>
                  <p className="text-6xl font-bold text-white tracking-tight">${simpleRent.toLocaleString()}</p>
                </div>

                <div className="space-y-4">
                  <input 
                    type="range"
                    min="1000"
                    max="6000"
                    step="100"
                    value={simpleRent}
                    onChange={(e) => setSimpleRent(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 font-medium uppercase tracking-wider">
                    <span>Conservative</span>
                    <span>Aggressive</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center group hover:border-slate-700 transition-colors">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Annual Income</p>
                    <p className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">${simpleAnnualIncome.toLocaleString()}</p>
                  </div>
                  <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center group hover:border-slate-700 transition-colors">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">5-Year Value</p>
                    <p className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">${simpleFiveYearValue.toLocaleString()}</p>
                  </div>
                </div>

                <button 
                  onClick={() => setMode('advanced')}
                  className="w-full py-4 bg-white text-slate-950 hover:bg-slate-200 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Launch Advanced Simulator
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Mode */}
        {mode === 'advanced' && (
          <div className="space-y-12">
            
            <div className="grid lg:grid-cols-12 gap-8">
              {/* Left Panel: Controls */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Financing Control */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Financing</h4>
                  </div>

                  <div className="space-y-6">
                    <div>
                       <div className="flex justify-between mb-2">
                        <label className="text-xs text-slate-500 uppercase font-bold">Unit Price</label>
                        <span className="text-sm font-bold text-white">${aduPrice.toLocaleString()}</span>
                       </div>
                       <input 
                          type="range"
                          min="65000"
                          max="175000"
                          step="5000"
                          value={aduPrice}
                          onChange={(e) => setAduPrice(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <div>
                       <div className="flex justify-between mb-2">
                        <label className="text-xs text-slate-500 uppercase font-bold">Down Payment</label>
                        <span className="text-sm font-bold text-white">{downPayment}%</span>
                       </div>
                       <input 
                          type="range"
                          min="10"
                          max="50"
                          step="5"
                          value={downPayment}
                          onChange={(e) => setDownPayment(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500 uppercase font-bold block mb-2">Term</label>
                        <select 
                          value={loanTerm}
                          onChange={(e) => setLoanTerm(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-lg p-2.5 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="15">15 Years</option>
                          <option value="30">30 Years</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 uppercase font-bold block mb-2">Rate (%)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            value={interestRate}
                            onChange={(e) => setInterestRate(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-lg p-2.5 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operations Control */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Operations</h4>
                  </div>

                  <div className="space-y-6">
                    <div>
                       <div className="flex justify-between mb-2">
                        <label className="text-xs text-slate-500 uppercase font-bold">Monthly Rent</label>
                        <span className="text-sm font-bold text-white">${monthlyRent.toLocaleString()}</span>
                       </div>
                       <input 
                          type="range"
                          min="1000"
                          max="5000"
                          step="100"
                          value={monthlyRent}
                          onChange={(e) => setMonthlyRent(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                    </div>

                    <div>
                       <div className="flex justify-between mb-2">
                        <label className="text-xs text-slate-500 uppercase font-bold">Solar (kW)</label>
                        <span className="text-sm font-bold text-white">{solarCapacity} kW</span>
                       </div>
                       <input 
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          value={solarCapacity}
                          onChange={(e) => setSolarCapacity(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                    </div>

                    <div>
                       <div className="flex justify-between mb-2">
                        <label className="text-xs text-slate-500 uppercase font-bold">Battery (kWh)</label>
                        <span className="text-sm font-bold text-white">{batteryStorage} kWh</span>
                       </div>
                       <input 
                          type="range"
                          min="0"
                          max="20"
                          step="0.5"
                          value={batteryStorage}
                          onChange={(e) => setBatteryStorage(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                    </div>
                  </div>
                </div>

              </div>

              {/* Center/Right: Data Viz */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Cashflow Summary Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Gross Income</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-green-400">+${totalMonthlyIncome.toFixed(0)}</span>
                          <span className="text-xs text-slate-500">/mo</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Loan Payment</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-red-400">-${monthlyPayment.toFixed(0)}</span>
                          <span className="text-xs text-slate-500">/mo</span>
                        </div>
                      </div>
                      <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 flex justify-between items-center">
                         <div>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Net Cash Flow</span>
                            <span className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                               {netCashFlow >= 0 ? '+' : ''}${netCashFlow.toFixed(0)}
                            </span>
                         </div>
                         <div className={`h-2 w-2 rounded-full ${netCashFlow >= 0 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-red-500'}`} />
                      </div>
                   </div>
                </div>

                {/* Charts */}
                <div className="grid md:grid-cols-2 gap-6 h-[400px]">
                   <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Income Sources</h4>
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                              itemStyle={{ color: '#fff' }}
                              cursor={{ fill: '#1e293b' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {monthlyBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                   </div>

                   <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">10-Year Growth</h4>
                      <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                            <Tooltip 
                               contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                               itemStyle={{ color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="netEquity" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Equity" />
                            <Line type="monotone" dataKey="cumulativeIncome" stroke="#3b82f6" strokeWidth={2} dot={false} name="Income" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                   </div>
                </div>

              </div>
            </div>

            {/* CTA */}
            <div className="flex justify-center pt-8">
              <button className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-full font-bold text-lg hover:bg-slate-200 transition-colors">
                <span>Apply for Financing</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
