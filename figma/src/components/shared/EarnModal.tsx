import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ClipboardCheck, Hammer, Key, TrendingUp } from 'lucide-react';
import { useI18n } from '../../i18n';

interface EarnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EarnModal({ isOpen, onClose }: EarnModalProps) {
  const { t, language } = useI18n();
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
                {t('earnModal.title')}
              </h1>
              <p className="text-lg text-slate-500 font-light mb-2">
                {t('earnModal.subA')}
              </p>
              <p className="text-lg text-slate-500 font-light">
                {t('earnModal.subB')}
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
                        <span className={`text-[10px] font-bold text-slate-500 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-[0.2em]'}`}>{t('earnModal.phase01')}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-6">{t('earnModal.p1Title')}</h3>
                      <h4 className="text-2xl font-bold text-blue-400 mb-4">{t('earnModal.p1Headline')}</h4>
                      <p className="text-slate-400 leading-relaxed font-light">
                        {t('earnModal.p1Body')}
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
                        <span className={`text-[10px] font-bold text-slate-500 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-[0.2em]'}`}>{t('earnModal.phase02')}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-6">{t('earnModal.p2Title')}</h3>
                      <h4 className="text-2xl font-bold text-blue-400 mb-4">{t('earnModal.p2Headline')}</h4>
                      <p className="text-slate-400 leading-relaxed font-light">
                        {t('earnModal.p2Body')}
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
                        <span className={`text-[10px] font-bold text-slate-500 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-[0.2em]'}`}>{t('earnModal.phase03')}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-6">{t('earnModal.p3Title')}</h3>
                      <h4 className="text-2xl font-bold text-blue-400 mb-4">{t('earnModal.p3Headline')}</h4>
                      <p className="text-slate-400 leading-relaxed font-light">
                        {t('earnModal.p3Body')}
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
            <div className={`mt-32 text-slate-600 text-sm font-bold ${language === 'zh' ? 'tracking-[0.2em]' : 'uppercase tracking-[0.3em]'}`}>
              {t('earnModal.footer')}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
