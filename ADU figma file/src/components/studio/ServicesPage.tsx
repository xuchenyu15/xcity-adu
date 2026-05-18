import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

const timelinePhases = [
  {
    time: "Day 0",
    title: "Address-Based Feasibility",
    text: "Enter your address to instantly check zoning, lot constraints, and ADU eligibility, using AI-driven analysis to replace weeks of early feasibility work with a data-backed first step.",
    image: "https://images.unsplash.com/photo-1760239037245-a372db8630f3?q=80&w=1080&auto=format&fit=crop"
  },
  {
    time: "Usually within 1 week",
    title: "On-Site Verification",
    text: "Our team visits your property to confirm site conditions, measurements, access, and utilities, ensuring everything aligns with real-world conditions before moving forward.",
    image: "https://images.unsplash.com/photo-1654643353084-10e62e05b9bf?q=80&w=1080&auto=format&fit=crop"
  },
  {
    time: "In 2 days",
    title: "Permit-Ready Drawings",
    text: "Because the building and interiors are pre-designed, permit-ready drawings are prepared within two days by adapting the system to verified site conditions without redesigning the building.",
    image: "https://images.unsplash.com/photo-1676469461876-b5d87e44bc8f?q=80&w=1080&auto=format&fit=crop"
  },
  {
    time: "A few weeks, varies by location",
    title: "Approvals and Applications",
    text: "Planning and building permit packages are prepared, submitted, and coordinated by our team. Where applicable, incentive programs are identified and applications are prepared and submitted in parallel so government processes do not slow the project down.",
    image: "https://images.unsplash.com/photo-1759553497445-3b4107a905ce?q=80&w=1080&auto=format&fit=crop"
  },
  {
    time: "Overlapping timelines",
    title: "Factory Build and Delivery",
    text: "Prefabricated components are produced off-site while approvals move forward, with logistics and delivery coordinated so everything arrives ready for installation.",
    image: "https://images.unsplash.com/photo-1766793110924-98e05b48eadc?q=80&w=1080&auto=format&fit=crop"
  },
  {
    time: "Assembled in under 4 hours",
    title: "Fast-Tracked Installation",
    text: "Prefabricated units are delivered and assembled on-site in a single fast-tracked installation window, minimizing disruption and on-site construction time.",
    image: "https://images.unsplash.com/photo-1769240534658-395ca1628c70?q=80&w=1080&auto=format&fit=crop"
  }
];

interface ServicesPageProps {
  theme?: 'dark' | 'light';
  onAction?: () => void;
}

export function ServicesPage({ theme = 'dark', onAction }: ServicesPageProps) {
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-600'} selection:bg-blue-500/30`}>
      {/* 1. Hero Section */}
      <section className="pt-40 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xl md:text-2xl text-slate-400 font-normal tracking-tight mb-2">
              As Fast As
            </p>
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold text-white tracking-tighter leading-none">
              4 Months
            </h1>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed"
          >
            Timelines shown reflect typical ranges based on a standardized prefab system and parallel workflows, and may vary by site conditions and local approvals.
          </motion.p>
        </div>
      </section>

      {/* 2. Vertical Timeline */}
      <section className="pb-32 px-6 overflow-hidden">
        <div className="max-w-[1200px] mx-auto relative">
          {/* Central Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -translate-x-1/2 hidden lg:block" />
          
          <div className="space-y-24 lg:space-y-48">
            {timelinePhases.map((phase, index) => {
              const isEven = index % 2 === 0;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-24 ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
                >
                  {/* Content Block */}
                  <div className={`flex-1 space-y-4 ${isEven ? 'lg:text-right' : 'lg:text-left'}`}>
                    <div className={`flex flex-col gap-1 ${isEven ? 'lg:items-end' : 'lg:items-start'}`}>
                      <span className="text-[11px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-1">
                        {phase.time}
                      </span>
                      <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
                        {phase.title}
                      </h3>
                    </div>

                    <p className="text-base text-slate-500 leading-relaxed max-w-lg mx-auto lg:mx-0">
                      {phase.text}
                    </p>
                  </div>

                  {/* Marker Circle (Central) */}
                  <div className="relative z-10 hidden lg:block">
                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] border-2 border-slate-950" />
                  </div>

                  {/* Image Block */}
                  <div className="flex-1 w-full">
                    <div className="relative aspect-[4/3] rounded-[40px] overflow-hidden border border-white/5 shadow-2xl group bg-slate-900">
                      <ImageWithFallback 
                        src={phase.image} 
                        alt={phase.title} 
                        className="w-full h-full object-cover transition-all duration-1000" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-60" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Closing Section */}
      <section className="py-48 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Speed comes from pre-designed systems, early verification, and parallel workflows rather than rushing decisions.
            </h2>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={onAction}
              className="group px-10 py-5 bg-white text-slate-950 rounded-full text-lg font-bold hover:bg-slate-200 transition-all active:scale-[0.98] inline-flex items-center gap-3 shadow-2xl shadow-blue-500/10"
            >
              Check if your property qualifies
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer Branding (Subtle) */}
      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-xs font-bold tracking-[0.4em] text-slate-800 uppercase">
          XHOME SYSTEM DELIVERY
        </p>
      </footer>
    </div>
  );
}
