import React from 'react';
import { 
  Bell,
  MessageCircle,
  FileText,
  Truck,
  Hammer,
  Flag,
  Check,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Briefcase,
  Layout,
  Palette,
  CheckCircle2,
  Info,
  Home
} from 'lucide-react';
import { motion } from 'motion/react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

// Images from assets provided in prompt
import imgMaterialBoard from 'figma:asset/4460b664d353a0c512e90b14d3d413abc0201bee.png';
import aduAsset from 'figma:asset/e6ac75cdb0069cc8bb93ffb160aac96596db5970.png';

interface OverviewDashboardProps {
  onNavigate: (tab: 'overview' | 'site' | 'design' | 'value' | 'timeline' | 'permitting') => void;
  onSystemNavigate?: (route: 'models' | 'how-it-works' | 'earn') => void;
  currentModel?: {
    id: string;
    name: string;
    category: string;
    sqft: number;
    price: string;
    image: string;
    type: string;
  };
}

export function OverviewDashboard({ onNavigate, onSystemNavigate, currentModel }: OverviewDashboardProps) {
  const today = "Monday, February 2, 2026";

  const timelineSteps = [
    { id: 'app', label: 'APPLICATION', icon: FileText, status: 'completed' },
    { id: 'permit', label: 'PERMITTING', icon: Check, status: 'completed' },
    { id: 'logistics', label: 'LOGISTICS', icon: Truck, status: 'pending' },
    { id: 'assembly', label: 'ASSEMBLY', icon: Hammer, status: 'pending' },
    { id: 'handover', label: 'HANDOVER', icon: Flag, status: 'pending' },
  ];

  return (
    <div className="relative h-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* SCROLLABLE CONTAINER */}
      <div className="relative h-full overflow-y-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto p-10 space-y-12">
          
          {/* HEADER SECTION */}
          <header className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Dashboard</h1>
              <p className="text-slate-500 mt-1 font-medium">{today}</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-3 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button className="p-3 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#2B7FFF] rounded-full border-2 border-white" />
              </button>
            </div>
          </header>

          {/* TIMELINE SECTION */}
          <div className="mb-16 flex flex-col items-center">
            <div className="relative w-full max-w-[1200px]">
                {/* Background Track (Grey) */}
                <div className="absolute top-[28px] left-[60px] right-[60px] h-[2px] bg-slate-200 z-0" />
                
                {/* Progress Track (Blue) */}
                <div 
                    className="absolute top-[28px] left-[60px] h-[2px] bg-[#2B7FFF] z-0 transition-all duration-1000" 
                    style={{ width: '31%' }} 
                />

                {/* Steps Container */}
                <div className="relative z-10 flex justify-between w-full px-12 md:px-24">
                    {timelineSteps.map((step, idx) => {
                        const Icon = step.icon;
                        const isCompleted = step.status === 'completed';
                        const isCurrentMarker = idx === 1; // Between 2nd and 3rd step
                        const textColClass = isCompleted ? 'text-[#2B7FFF]' : 'text-slate-400';

                        return (
                            <div key={step.id} className="flex flex-col items-center relative group">
                                {/* Circle Marker */}
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 relative ${
                                    isCompleted 
                                        ? 'bg-[#2B7FFF] text-white shadow-[0_0_20px_rgba(43,127,255,0.3)]' 
                                        : 'bg-white border-2 border-slate-200 text-slate-300 shadow-sm'
                                }`}>
                                    <Icon className={`w-5 h-5 ${isCompleted ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                                </div>

                                {/* Step Label */}
                                <div className="mt-5">
                                    <span className={`text-[10px] font-bold tracking-[0.15em] transition-colors uppercase ${textColClass}`}>
                                        {step.label}
                                    </span>
                                </div>
                                
                                {/* Active Progress Marker (Pure Blue Dot with Glow) */}
                                {isCurrentMarker && (
                                    <div className="absolute top-[28px] -right-[65%] md:-right-[85%] translate-x-1/2 -translate-y-1/2 z-20">
                                        <div className="relative flex items-center justify-center">
                                            <div className="absolute inset-0 rounded-full bg-[#2B7FFF]/30 animate-[ping_2s_ease-in-out_infinite]" />
                                            <div className="w-5 h-5 rounded-full bg-white border-2 border-[#2B7FFF] flex items-center justify-center shadow-[0_0_15px_rgba(43,127,255,0.4)]">
                                                <div className="w-2 h-2 bg-[#2B7FFF] rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>

          {/* MAIN GRID (64/36) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-10 items-stretch">
            
            {/* LEFT MAIN PANEL: ADU VISUAL */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-[40px] overflow-hidden bg-slate-200 shadow-2xl group min-h-[900px] flex items-center justify-center"
            >
              <ImageWithFallback 
                src={aduAsset}
                alt="ADU Visualization"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              {/* VIGNETTE & GRADIENT */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
              
              {/* UNIFIED HEADER (Top Left) - No Icon */}
              <div className="absolute top-10 left-10 z-20">
                <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-md">Project Visualization</h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-[#2B7FFF] rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest">Active Project</span>
                </div>
              </div>

              {/* ASSET DETAILS OVERLAY (Bottom Left) */}
              <div className="absolute bottom-10 left-10">
                <div className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-wide">Aura 1B1B</span>
                    <span className="w-1 h-1 bg-white/40 rounded-full" />
                    <span className="text-sm font-medium text-white/80">Interior: 600sqft</span>
                    <span className="w-1 h-1 bg-white/40 rounded-full" />
                    <span className="text-sm font-medium text-white/80">Exterior: 240sqft</span>
                </div>
              </div>
            </motion.div>

            {/* RIGHT COLUMN: ADJUSTED HEIGHT RATIO */}
            <div className="flex flex-col gap-10 h-full">
              
              {/* INTERIOR DIRECTION / MATERIAL BOARD (Card 1) - TALLER */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-[1.2] rounded-[40px] overflow-hidden border border-slate-200 bg-white shadow-xl flex flex-col relative group cursor-pointer h-full"
                onClick={() => onNavigate('design')}
              >
                {/* Mood Board Image */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src={imgMaterialBoard} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                    alt="Interior Material Board" 
                  />
                  <div className="absolute inset-0 bg-black/10 transition-colors duration-500" />
                </div>

                {/* UNIFIED HEADER (Top Left) - No Icon */}
                <div className="absolute top-10 left-10 z-20">
                  <h3 className="text-xl font-bold text-white tracking-tight drop-shadow-md">Interior Direction</h3>
                </div>

                {/* Hover Details */}
                <div className="relative z-10 p-10 flex flex-col h-full bg-gradient-to-b from-black/40 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="mt-auto space-y-4">
                    <p className="text-sm text-white/80 font-medium italic">Aura Collection Concept</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-white uppercase tracking-[0.2em]">
                      VIEW DETAILS <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* FINANCIAL SUMMARY (Card 2) - COMPRESSED */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="flex-[0.8] rounded-[40px] p-10 border border-slate-200 bg-white shadow-xl flex flex-col justify-between h-full"
              >
                <div className="space-y-6">
                  {/* UNIFIED HEADER - No Icon */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Investment Overview</h3>
                  </div>

                  {/* FINANCIAL DATA */}
                  <div className="space-y-4">
                    <div className="space-y-0.5">
                      <p className="text-2xl font-bold text-slate-300 line-through decoration-slate-300/60 decoration-2">$215,000</p>
                      <div className="flex items-center gap-3">
                        <span className="text-6xl font-black text-slate-900 tracking-tighter">$0</span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-3">Upfront Cost</span>
                      </div>
                    </div>

                    {/* FUNDED PILL */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#E6F9F0] border border-[#CCF2E1] rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#008A5D]" />
                      <span className="text-[10px] font-black text-[#008A5D] uppercase tracking-wider">Funded by XHomes</span>
                    </div>

                    {/* INCENTIVES SECTION */}
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Applicable Incentives</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center group/item">
                          <span className="text-[13px] font-bold text-slate-600">Federal Tax Credit (ITC)</span>
                          <span className="text-sm font-black text-slate-900">$12,400</span>
                        </div>
                        <div className="flex justify-between items-center group/item">
                          <span className="text-[13px] font-bold text-slate-600">Local Housing Grant</span>
                          <span className="text-sm font-black text-slate-900">$8,500</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onNavigate('value')}
                  className="mt-6 w-full py-4 bg-slate-900 text-white rounded-[18px] text-[9px] font-black uppercase tracking-[0.25em] transition-all hover:bg-slate-800 active:scale-[0.98] shadow-lg shadow-slate-900/10"
                >
                  Statement Details
                </button>
              </motion.div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
