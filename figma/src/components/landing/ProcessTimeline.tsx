import React from 'react';
import { motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';

interface TimelineItemProps {
  side: 'left' | 'right';
  timeframe: string;
  title: string;
  description: string;
  image: string;
  subnote?: string;
}

const TimelineItem = ({ side, timeframe, title, description, image, subnote }: TimelineItemProps) => {
  const isLeft = side === 'left';
  
  return (
    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 items-center group">
      {/* Center Line logic - visible on desktop */}
      <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-slate-800 -translate-x-1/2 hidden md:block" />
      
      {/* Mobile Line */}
      <div className="absolute left-8 top-0 bottom-0 w-px bg-slate-800 -translate-x-1/2 md:hidden" />

      {/* X Marker */}
      <div className="absolute left-8 md:left-1/2 top-0 -translate-x-1/2 w-6 h-6 flex items-center justify-center bg-slate-950 z-10 border border-slate-800">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3 text-white stroke-2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </div>

      {/* Left Side Content (Text if Left, Image if Right) */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className={`pl-20 md:pl-0 ${isLeft ? 'md:text-right md:pr-16 order-2 md:order-1' : 'md:pr-16 hidden md:block order-1'}`}
      >
        {isLeft ? (
          <div className="space-y-4">
            <span className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase block">
              {timeframe}
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-white">
              {title}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed uppercase tracking-wide max-w-lg ml-auto">
              {description}
            </p>
            {subnote && (
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-2">
                {subnote}
              </p>
            )}
          </div>
        ) : (
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-800/50 group-hover:border-slate-700 transition-colors">
            <img src={image} alt={title} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
            <div className="absolute inset-0 bg-slate-950/20" />
          </div>
        )}
      </motion.div>

      {/* Right Side Content (Image if Left, Text if Right) */}
      <motion.div 
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className={`pl-20 md:pl-0 ${!isLeft ? 'md:text-left md:pl-16 order-2' : 'md:pl-16 hidden md:block order-2'}`}
      >
        {!isLeft ? (
          <div className="space-y-4">
            <span className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase block">
              {timeframe}
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-white">
              {title}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed uppercase tracking-wide max-w-lg mr-auto">
              {description}
            </p>
            {subnote && (
              <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-2">
                {subnote}
              </p>
            )}
          </div>
        ) : (
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-800/50 group-hover:border-slate-700 transition-colors">
            <img src={image} alt={title} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
             <div className="absolute inset-0 bg-slate-950/20" />
          </div>
        )}
      </motion.div>
      
      {/* Mobile Image (Always show below text on mobile) */}
      <div className="md:hidden pl-20 pr-4 -mt-4 order-3 w-full">
         <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-800/50">
            <img src={image} alt={title} className="w-full h-full object-cover grayscale" />
          </div>
      </div>

    </div>
  );
};

export function ProcessTimeline() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="bg-slate-950 py-32 overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-32 space-y-6"
        >
          <span className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase block mb-8">
            How it works
          </span>
          <h2 className="text-6xl md:text-8xl font-light text-white tracking-tighter leading-none">
            As Fast
          </h2>
          <h2 className="text-6xl md:text-8xl font-bold text-white tracking-tighter leading-none">
            As 4 Months
          </h2>
          <p className="max-w-2xl mx-auto text-xs text-slate-500 mt-12 uppercase tracking-wide leading-relaxed">
            Please note that timelines are estimates and can vary based on project complexity and scale. 
            We are committed to keeping you informed and engaged throughout the process.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative space-y-24 md:space-y-32 mb-40">
           {/* Continuous Line */}
           <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-slate-800 -translate-x-1/2" />

           {/* Line extender for header */}
           <div className="absolute left-8 md:left-1/2 -top-32 h-32 w-px bg-slate-800 -translate-x-1/2" />

          <TimelineItem 
            side="left"
            timeframe="Two Weeks Later"
            title="Architectural Drawings"
            description="The initial proposal, including the site plan, conceptual design, and floor plans, will be ready for review within two weeks after project commencement."
            image="https://images.unsplash.com/photo-1637054767518-b6f3e16cf8e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwaG91c2UlMjBob2xvZ3JhbSUyMGJsdWUlMjBkaWdpdGFsJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc2NzQwMTc5NXww&ixlib=rb-4.1.0&q=80&w=1080"
          />

          <TimelineItem 
            side="right"
            timeframe="Four Weeks Later"
            title="Planning Permit"
            description="We'll prepare and submit a formal permit package to your local planning department."
            subnote="*The duration may vary depending on your location."
            image="https://images.unsplash.com/photo-1765729003706-355ca161736d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaXR5JTIwcGxhbm5pbmclMjBhcmNoaXRlY3R1cmUlMjBtZWV0aW5nJTIwbW9kZXJufGVufDF8fHx8MTc2NzQwMTIwM3ww&ixlib=rb-4.1.0&q=80&w=1080"
          />

          <TimelineItem 
            side="left"
            timeframe="Three Weeks Later"
            title="Construction Drawings"
            description="Construction drawings will be prepared and ready for review within three weeks following approval of the architectural design."
            image="https://images.unsplash.com/photo-1568057373106-63057e421d1c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbmdpbmVlcmluZyUyMGJsdWVwcmludCUyMHRlY2huaWNhbCUyMHNjaGVtYXRpYyUyMGNsb3NlJTIwdXB8ZW58MXx8fHwxNzY3NDAxNzk1fDA&ixlib=rb-4.1.0&q=80&w=1080"
          />

          <TimelineItem 
            side="right"
            timeframe="Four Weeks Later"
            title="Building Permit"
            description="A detailed building permit package will be prepared and submitted to your local planning department."
            subnote="*The duration may vary depending on your location."
            image="https://images.unsplash.com/photo-1760009436767-d154e930e55c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb25zdHJ1Y3Rpb24lMjBzaXRlJTIwc2FmZXR5JTIwaGVsbWV0JTIwbW9kZXJufGVufDF8fHx8MTc2NzQwMTIwM3ww&ixlib=rb-4.1.0&q=80&w=1080"
          />

          <TimelineItem 
            side="left"
            timeframe="Six Weeks Later"
            title="Production, Foundation Work, and Transportation"
            description="Prefabrication begins at the factory while site preparation and foundation work proceed simultaneously. Components are then transported to the site for immediate installation."
            image="https://images.unsplash.com/photo-1621986191859-a88d73c6ed0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2R1bGFyJTIwaG9tZSUyMGZhY3RvcnklMjBtYW51ZmFjdHVyaW5nJTIwaGlnaCUyMHRlY2h8ZW58MXx8fHwxNzY3NDAxMjA4fDA&ixlib=rb-4.1.0&q=80&w=1080"
          />

          <TimelineItem 
            side="right"
            timeframe="Two Weeks Later"
            title="On-Site Installation"
            description="Commence the on-site assembly of all building components and proceed with a meticulous installation process."
            image="https://images.unsplash.com/photo-1698154014645-dd32da3303af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVmYWIlMjBob3VzZSUyMGFzc2VtYmx5JTIwc3RlZWwlMjBmcmFtZSUyMG1vZGVybiUyMGNvbnN0cnVjdGlvbnxlbnwxfHx8fDE3Njc0MDE4MDJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
          />

          <TimelineItem 
            side="left"
            timeframe="Two Weeks Later"
            title="Project Completion and Final Inspections"
            description="Final city inspections are conducted, followed by project completion, making your new home ready for you to move in."
            subnote="*The duration may vary depending on your location."
             image="https://images.unsplash.com/photo-1765767056681-9583b29007cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBob21lJTIwaW50ZXJpb3IlMjBsaXZpbmclMjByb29tJTIwbHV4dXJ5JTIwZGFya3xlbnwxfHx8fDE3Njc0MDEyMDh8MA&ixlib=rb-4.1.0&q=80&w=1080"
          />
          
           {/* Line extender for footer */}
           <div className="absolute left-8 md:left-1/2 bottom-[-100px] h-[100px] w-px bg-slate-800 -translate-x-1/2" />
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center relative z-10 bg-slate-950 pt-20"
        >
          <div className="mb-16">
            <h2 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-4">
              Welcome To Your
            </h2>
            <h2 className="text-5xl md:text-7xl font-light text-white tracking-tight">
              Dream Home
            </h2>
          </div>

          <motion.button
            onClick={scrollToTop}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-full font-bold text-lg tracking-wide hover:bg-slate-200 transition-colors"
          >
            <span>Start to build your dream home</span>
            <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        </motion.div>

      </div>
    </section>
  );
}