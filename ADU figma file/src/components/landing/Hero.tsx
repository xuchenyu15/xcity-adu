import React from 'react';
import { ArrowRight, CheckCircle, MousePointer, Zap } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-sky-50">
      {/* Dynamic Sky Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-sky-50 to-white pointer-events-none"></div>
      
      {/* Clouds / Blur Effects */}
      <div className="absolute top-20 left-20 w-[600px] h-[600px] bg-white/60 rounded-full blur-[100px] mix-blend-overlay pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-sky-200/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className="space-y-8 relative z-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-sky-100 text-sky-800 text-sm font-medium backdrop-blur-md shadow-sm">
            <CheckCircle className="h-4 w-4 text-sky-500" />
            Official Partner of XHouse & Home
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-800 leading-[1.1]">
            One-Stop <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">
              ADU Solutions.
            </span>
          </h1>
          
          <p className="text-xl text-slate-600 max-w-lg leading-relaxed font-light">
            The premier platform for Accessory Dwelling Units. 
            Select, customize, and apply for your permit online. We handle everything from design to key delivery.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button className="h-14 px-8 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-sm font-medium shadow-lg shadow-sky-500/30 transition-transform hover:-translate-y-0.5 flex items-center justify-center active:scale-95">
              Start Online Application
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <button className="h-14 px-8 rounded-full border border-sky-200 text-sky-700 hover:text-sky-800 hover:bg-sky-50 text-sm font-medium bg-white/50 backdrop-blur-sm transition-colors active:scale-95">
              View ADU Models
            </button>
          </div>

          <div className="flex items-center gap-6 pt-6 border-t border-sky-100/50">
            <div className="flex items-center gap-3 text-slate-600">
              <div className="p-2 bg-white/60 rounded-full shadow-sm">
                <MousePointer className="h-5 w-5 text-sky-500" />
              </div>
              <span className="text-sm font-medium">Click to Select</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <div className="p-2 bg-white/60 rounded-full shadow-sm">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <span className="text-sm font-medium">Instant Quote</span>
            </div>
          </div>
        </div>

        <div className="relative mt-12 lg:mt-0 flex items-center justify-center">
          {/* Main Glass Morphism Container */}
          <div className="relative w-full aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl shadow-sky-900/10 border-8 border-white/40 backdrop-blur-sm z-10 group">
             <img 
              src="https://images.unsplash.com/photo-1648860478702-2ad74aeffd9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBnbGFzcyUyMGFyY2hpdGVjdHVyZSUyMGJsdWUlMjBza3l8ZW58MXx8fHwxNzY1MjM0NDEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
              alt="Transparent Modern Architecture"
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            
            {/* Online Selection UI Mockup Overlay */}
            <div className="absolute bottom-6 left-6 right-6 lg:bottom-8 lg:left-8 lg:right-8 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-lg p-1 transition-transform hover:scale-[1.02]">
               <div className="flex flex-col sm:flex-row items-center gap-4 p-4">
                 <div className="h-12 w-12 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600 shrink-0">
                    <CheckCircle className="h-6 w-6" />
                 </div>
                 <div className="flex-1 text-center sm:text-left">
                   <p className="text-xs text-sky-800 font-bold uppercase tracking-widest mb-1">Application Status</p>
                   <p className="text-lg font-bold text-slate-800">Pre-Approved</p>
                 </div>
                 <button className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-full transition-colors shadow-md">
                   Continue
                 </button>
               </div>
            </div>
          </div>

          {/* Floating Decorative Elements */}
          <div className="absolute -top-10 -right-10 h-32 w-32 bg-sky-200/40 rounded-full blur-2xl animate-pulse pointer-events-none"></div>
          <div className="absolute bottom-20 -left-10 h-24 w-24 bg-blue-200/40 rounded-full blur-xl pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
}
