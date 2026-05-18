import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ClipboardCheck, Hammer, Key, TrendingUp } from 'lucide-react';

interface EarnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EarnModal({ isOpen, onClose }: EarnModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-[#020618] overflow-y-auto"
        >
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="fixed top-8 right-8 z-[210] w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="min-h-screen py-24 px-8 flex flex-col items-center">
            {/* Header */}
            <div className="text-center mb-24 max-w-3xl">
              <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white tracking-tight">
                Shared Investment Model
              </h1>
              <p className="text-lg text-slate-500 font-light mb-2">
                A zero-upfront path to ownership.
              </p>
              <p className="text-lg text-slate-500 font-light">
                We build it. You earn from it. You decide when to own it.
              </p>
            </div>

            {/* Timeline Container */}
            <div className="relative max-w-5xl w-full">
              {/* Central Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />

              <div className="space-y-32">
                {/* Phase 01 */}
                <div className="relative flex items-center justify-start md:justify-start">
                  <div className="w-full md:w-[45%]">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-[#0a1229] border border-white/10 rounded-[2rem] p-10 shadow-2xl relative"
                    >
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Phase 01</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-6">Project Setup</h3>
                      <h4 className="text-2xl font-bold text-blue-400 mb-4">Zero-upfront entry.</h4>
                      <p className="text-slate-400 leading-relaxed font-light">
                        Property is approved and enters the XHomes Rental ADU program. Construction, design, and setup are fully funded by XHomes.
                      </p>
                    </motion.div>
                  </div>
                  {/* Central Icon */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-[#1d293d] border border-white/10 flex items-center justify-center text-blue-400 z-10">
                    <ClipboardCheck className="w-6 h-6" />
                  </div>
                </div>

                {/* Phase 02 */}
                <div className="relative flex items-center justify-end">
                  <div className="w-full md:w-[45%]">
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-[#0a1229] border border-white/10 rounded-[2rem] p-10 shadow-2xl relative"
                    >
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Phase 02</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-6">Construction & Delivery</h3>
                      <h4 className="text-2xl font-bold text-blue-400 mb-4">ADU is built and prepared for rental.</h4>
                      <p className="text-slate-400 leading-relaxed font-light">
                        No rental income is generated during this phase.
                      </p>
                    </motion.div>
                  </div>
                  {/* Central Icon */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-[#1d293d] border border-white/10 flex items-center justify-center text-blue-400 z-10">
                    <Hammer className="w-6 h-6" />
                  </div>
                </div>

                {/* Phase 03 - Optional addition for completeness if logic requires, but Figure 1 shows two cards clearly visible */}
                 <div className="relative flex items-center justify-start">
                  <div className="w-full md:w-[45%]">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                      className="bg-[#0a1229] border border-white/10 rounded-[2rem] p-10 shadow-2xl relative opacity-40"
                    >
                      <div className="flex justify-between items-center mb-8">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Phase 03</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-6">Rental & Revenue</h3>
                      <h4 className="text-2xl font-bold text-blue-400 mb-4">Start earning monthly income.</h4>
                      <p className="text-slate-400 leading-relaxed font-light">
                        ADU is leased to professional tenants. You receive a share of net monthly revenue.
                      </p>
                    </motion.div>
                  </div>
                  {/* Central Icon */}
                  <div className="absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-[#1d293d] border border-white/10 flex items-center justify-center text-slate-600 z-10">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Note */}
            <div className="mt-32 text-slate-600 text-sm font-bold uppercase tracking-[0.3em]">
              XHomes Rental ADU Lifecycle
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
