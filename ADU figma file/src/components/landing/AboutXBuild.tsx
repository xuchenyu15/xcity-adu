import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import heroGif from "figma:asset/402a26d501cd4dbecc6f029a56ef47f8480e7270.png";

const metrics = [
  {
    number: "75+",
    title: "Active ADU Projects",
    desc: "Projects currently under evaluation or delivery through XBuild."
  },
  {
    number: "4 Months",
    title: "Average Project Timeline",
    desc: "From feasibility confirmation to on-site installation."
  },
  {
    number: "120+",
    title: "City Coverage",
    desc: "Across 5 pilot states and expanding."
  }
];

const scenarios = [
  {
    name: "MARK S. · SAN JOSE, CA",
    quote: (
      <>
        "I wanted to build, but I <strong className="text-white font-bold">didn't have the cash</strong> to get started. 
        Every time I looked into it, the <strong className="text-white font-bold">process felt complicated</strong>, and I wasn't sure where to begin."
      </>
    ),
    helpTitle: "How FreeBuild helped",
    helpDesc: (
      <div className="space-y-4">
        <p>XBuild handled the entire process so Mark could move forward <strong className="font-bold text-[#2B7FFF]">without putting money down</strong>.</p>
        <p>Once the unit was completed, the increased property value made refinancing possible, allowing him to <strong className="font-bold text-[#2B7FFF]">buy the unit back</strong> and move forward with confidence.</p>
      </div>
    )
  },
  {
    name: "ELENA R. · SEATTLE, WA",
    quote: (
      <>
        "I had the budget, but I <strong className="text-white font-bold">didn't want to commit</strong> before knowing what was actually possible. 
        <strong className="text-white font-bold">Zoning rules and design limits</strong> made everything feel <strong className="text-white font-bold">uncertain</strong>."
      </>
    ),
    helpTitle: "How FreeBuild helped",
    helpDesc: (
      <div className="space-y-4">
        <p>XBuild evaluated the site and helped determine what type of unit made the most sense, including whether short-term or long-term rental was the right option.</p>
        <p>Elena was able to move forward <strong className="font-bold text-[#2B7FFF]">without paying construction costs upfront</strong>, while sharing in rental income and keeping her capital available for other investments.</p>
      </div>
    )
  },
  {
    name: "DAVID L. · PHILADELPHIA, PA",
    quote: (
      <>
        "I wanted the <strong className="text-white font-bold">long-term value</strong>, but I <strong className="text-white font-bold">didn't want to deal with permits or management.</strong> 
        I didn't want this to turn into a second job."
      </>
    ),
    helpTitle: "How FreeBuild helped",
    helpDesc: (
      <div className="space-y-4">
        <p>XBuild took over permitting, incentive coordination, and project management from start to finish.</p>
        <p>With a streamlined, prefab-based process, the ADU moved from planning to completion <strong className="font-bold text-[#2B7FFF]">in two months</strong>, allowing David to move forward <strong className="font-bold text-[#2B7FFF]">without having to manage any part</strong> of the process himself.</p>
      </div>
    )
  }
];

interface AboutXBuildProps {
  onAction?: () => void;
}

export function AboutXBuild({ onAction }: AboutXBuildProps) {
  const [hoveredScenario, setHoveredScenario] = useState<number | null>(null);

  return (
    <div className="bg-slate-950 text-slate-300 min-h-screen selection:bg-blue-500/30 overflow-x-hidden font-sans">
      
      {/* HERO SECTION */}
      <section className="py-24 px-6 max-w-[1200px] mx-auto">
        <div className="space-y-16">
          {/* Full Width Italic Title */}
          <div className="w-full">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl md:text-6xl lg:text-7xl font-medium italic text-white leading-[1.1] tracking-tighter"
            >
              Build first, Decide later.<br />
              A smarter way to build an ADU.
            </motion.h1>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-stretch">
            {/* Left: Text Content */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="flex flex-col"
            >
              <div className="space-y-10">
                <p className="text-xl md:text-2xl text-white font-bold leading-relaxed">
                  XBuild is an AI-powered platform built to streamline the entire ADU development process.
                </p>
                
                <div className="space-y-8 text-lg md:text-xl text-slate-400 leading-relaxed">
                  <p>
                    Built on{' '}
                    <span className="inline-flex">
                      <a 
                        href="https://xhome.ai" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="italic border-b border-dotted border-slate-500 hover:text-white transition-colors"
                      >
                        XHome
                      </a>
                      's
                    </span>
                    {' '}prefab system and powered by{' '}
                    <span className="inline-flex">
                      <a 
                        href="https://xworks.ai" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="italic border-b border-dotted border-slate-500 hover:text-white transition-colors"
                      >
                        XWorks
                      </a>
                      '
                    </span>
                    {' '}AI infrastructure, XBuild operates as a vertically integrated platform for modern ADU delivery.
                  </p>
                  <p>
                    We transform underused residential land into functional living space by funding, building, and managing ADUs, allowing homeowners to move forward without upfront construction costs, long-term commitments, or operational burden.
                  </p>
                </div>
              </div>

              {/* Bullet Points */}
              <div className="mt-16 space-y-4">
                {[
                  "AI-assisted site and zoning feasibility",
                  "Prefab design standardization",
                  "Permitting and incentives handled end-to-end",
                  "Construction and rental operations integrated",
                  "Investment and ownership paths designed into the system"
                ].map((bullet, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80" />
                    <span className="text-sm text-slate-500 font-medium">{bullet}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right: GIF Visual Module */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="relative rounded-[40px] overflow-hidden bg-slate-900 shadow-2xl border border-white/5 min-h-[400px]"
            >
              <img 
                src={heroGif} 
                alt="XHome Prefab Architecture" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* METRICS SECTION */}
      <section className="py-24 border-y border-white/5 bg-slate-900/20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-16 md:gap-8">
            {metrics.map((metric, i) => (
              <div key={i} className="text-center md:text-left space-y-3">
                <span className="text-5xl md:text-6xl font-bold text-white tracking-tighter">
                  {metric.number}
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">{metric.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto md:mx-0">
                    {metric.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CASE STUDY SECTION */}
      <section className="py-24 px-6 max-w-[1200px] mx-auto">
        <div className="mb-12">
          <span className="text-xs font-bold text-[#2B7FFF] uppercase tracking-[0.4em]">
            CASE STUDIES
          </span>
        </div>

        {/* Interactive Cards */}
        <div className="flex flex-col lg:flex-row gap-6 w-full h-auto lg:h-[460px] min-h-[400px]">
          {scenarios.map((scenario, i) => {
            const isCollapsed = hoveredScenario !== null && hoveredScenario !== i;
            
            return (
              <motion.div
                key={i}
                onMouseEnter={() => setHoveredScenario(i)}
                onMouseLeave={() => setHoveredScenario(null)}
                animate={{ 
                  flex: hoveredScenario === null ? 1 : hoveredScenario === i ? 3 : 0.45
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 180, 
                  damping: 24,
                  mass: 0.6
                }}
                className={`relative h-full rounded-[40px] border border-white/10 bg-slate-900/30 overflow-hidden flex flex-col p-10 cursor-default transition-colors duration-500 ${isCollapsed ? 'bg-slate-950/50' : ''}`}
              >
                <div className="flex flex-col h-full justify-between gap-8 relative">
                  <div className="space-y-6 flex flex-col h-full">
                    {/* Graceful Truncation Container */}
                    <div className="relative flex-1 overflow-hidden">
                      <div className={`text-lg md:text-xl text-slate-400 font-medium leading-relaxed tracking-tight italic transition-all duration-500 ${isCollapsed ? 'opacity-80' : ''}`}>
                        {scenario.quote}
                        {isCollapsed && <span className="inline opacity-50 ml-1">...</span>}
                      </div>

                      {/* Name placed at bottom right of quote area */}
                      {!isCollapsed && (
                        <div className="mt-6 flex justify-end">
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
                            {scenario.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Gradient Fade for Collapsed State */}
                      <AnimatePresence>
                        {isCollapsed && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent pointer-events-none"
                            style={{ bottom: '-10px' }}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  {/* Expanded Content Area */}
                  <AnimatePresence>
                    {(hoveredScenario === i) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="space-y-4 pt-6 border-t border-white/10 mt-auto shrink-0"
                      >
                        <h4 className="text-lg font-bold text-[#2B7FFF] uppercase tracking-[0.2em]">
                          {scenario.helpTitle}
                        </h4>
                        <div className="text-base text-[#2B7FFF]/80 leading-relaxed font-medium">
                          {scenario.helpDesc}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Collapsed State Name */}
                  {isCollapsed && (
                    <div className="mt-auto pt-4 flex justify-center opacity-0 transition-opacity group-hover:opacity-100">
                       <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap">
                        {scenario.name.split('·')[0]}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="py-24 px-6 text-center border-t border-white/5">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white tracking-tight">
              See what your site can do.
            </h2>
            <p className="text-lg text-slate-500">
              Enter your address to understand feasibility, timing, and options — instantly.
            </p>
          </div>
          
          <div className="pt-8">
            <button 
              onClick={onAction}
              className="px-12 py-5 bg-white text-slate-950 rounded-full text-lg font-bold hover:bg-slate-200 transition-all active:scale-[0.98] shadow-2xl shadow-white/5"
            >
              Enter Your Address
            </button>
          </div>
        </div>
      </section>

      <footer className="py-12 text-center opacity-20 border-t border-white/5">
        <p className="text-[10px] font-bold tracking-[0.5em] text-slate-500 uppercase">
          XBUILD OPERATING SYSTEM · 2026
        </p>
      </footer>
    </div>
  );
}
