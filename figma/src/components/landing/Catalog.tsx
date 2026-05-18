import React, { useState } from 'react';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../../i18n';

const models = [
  {
    id: 'a495',
    name: 'Model A495',
    specs: [
      { labelKey: 'catalog.spec.footprint', valueKey: 'catalog.models.a495.spec.footprint' },
      { labelKey: 'catalog.spec.config', valueKey: 'catalog.models.a495.spec.config' },
      { labelKey: 'catalog.spec.install', valueKey: 'catalog.models.a495.spec.install' },
    ],
    price: '$125,000',
    image: 'https://images.unsplash.com/photo-1615284114808-bf439f965d4a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkYXJrJTIwY29udGFpbmVyJTIwaG9tZSUyMG5pZ2h0JTIwZXh0ZXJpb3J8ZW58MXx8fHwxNzY3NDAyNTc0fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 'a955',
    name: 'Model A955',
    specs: [
      { labelKey: 'catalog.spec.footprint', valueKey: 'catalog.models.a955.spec.footprint' },
      { labelKey: 'catalog.spec.config', valueKey: 'catalog.models.a955.spec.config' },
      { labelKey: 'catalog.spec.install', valueKey: 'catalog.models.a955.spec.install' },
    ],
    price: '$210,000',
    image: 'https://images.unsplash.com/photo-1703782997454-8eb0d4d94e9c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcmNoaXRlY3R1cmFsJTIwY2FiaW4lMjBzdGVlbCUyMGdsYXNzJTIwZGFyayUyMGZvcmVzdHxlbnwxfHx8fDE3Njc0MDI1NzR8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

export function Catalog({ embedded = false }: { embedded?: boolean }) {
  const [selectedId, setSelectedId] = useState<string>('a495');
  const [filter, setFilter] = useState<'all' | 'studio' | '1bed' | '2bed'>('all');
  const { t, language } = useI18n();
  
  const selectedModel = models.find(m => m.id === selectedId) || models[0];

  return (
    <div id="models" className={`${embedded ? 'h-full' : 'py-24 border-t border-slate-900'} bg-slate-950 overflow-hidden`}>
      <div className={`container mx-auto px-4 ${embedded ? 'h-full py-8' : ''} max-w-7xl`}>
        
        <div className={`flex flex-col md:flex-row gap-12 lg:gap-24 ${embedded ? 'h-full' : ''}`}>
          
          {/* Left Column: List & Details */}
          <div className="w-full md:w-1/3 flex flex-col justify-between">
            <div className="flex flex-col h-full">
              <span className="inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 mb-6 text-xs font-bold tracking-widest uppercase rounded-full w-fit">
                {t('catalog.badge')}
              </span>
              <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">
                {t('catalog.titleA')} <span className="text-blue-500">{t('catalog.titleB')}</span>
              </h2>
              
              {/* Filter Tabs */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                {[
                  { id: 'all', label: t('catalog.filter.all') },
                  { id: 'studio', label: t('catalog.filter.studio') },
                  { id: '1bed', label: t('catalog.filter.1bed') },
                  { id: '2bed', label: t('catalog.filter.2bed') },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id as any)}
                    className={`
                      px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border
                      ${filter === f.id 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30' 
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'}
                    `}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              
              <div className="space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedId(model.id)}
                    className={`
                      w-full text-left p-6 border-l-2 transition-all duration-300 group
                      ${selectedId === model.id 
                        ? 'border-white bg-slate-900/50' 
                        : 'border-slate-800 hover:border-slate-600 hover:bg-slate-900/20'}
                    `}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`text-2xl font-bold tracking-tight ${selectedId === model.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`}>
                        {model.name}
                      </span>
                      {selectedId === model.id && (
                        <motion.div layoutId="active-indicator">
                          <ChevronRight className="w-5 h-5 text-white" />
                        </motion.div>
                      )}
                    </div>
                    <p className={`mt-2 text-sm ${selectedId === model.id ? 'text-slate-400' : 'text-slate-600'}`}>
                      {t(`catalog.models.${model.id}.short`)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Specs Panel (Desktop only - moves to right on mobile? No, keeping it here is fine) */}
            <div className="hidden md:block mt-8 space-y-8">
               <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedModel.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-slate-400 leading-relaxed mb-8">
                      {t(`catalog.models.${selectedModel.id}.desc`)}
                    </p>

                    <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-6 mb-8">
                      {selectedModel.specs.map((spec) => (
                        <div key={spec.labelKey}>
                          <div className={`text-xs text-slate-500 mb-1 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-wider'}`}>{t(spec.labelKey)}</div>
                          <div className="text-white font-mono">{t(spec.valueKey)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`text-xs text-slate-500 mb-1 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-wider'}`}>{t('catalog.startingAt')}</div>
                        <div className="text-2xl font-bold text-white tracking-tight">{selectedModel.price}</div>
                      </div>
                      <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-950 font-bold hover:bg-slate-200 transition-colors">
                        {t('catalog.configure')}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
               </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Visual */}
          <div className="w-full md:w-2/3">
             <div className="relative aspect-[4/3] md:aspect-[16/9] bg-slate-900 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={selectedModel.id}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                  >
                    <img 
                      src={selectedModel.image} 
                      alt={selectedModel.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                  </motion.div>
                </AnimatePresence>
                
                {/* Mobile Details Overlay (only visible on mobile) */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 to-transparent md:hidden">
                    <h3 className="text-3xl font-bold text-white mb-2">{selectedModel.name}</h3>
                     <p className="text-slate-300 text-sm mb-4 line-clamp-2">{t(`catalog.models.${selectedModel.id}.desc`)}</p>
                     <div className="flex items-center justify-between">
                        <span className="text-white font-bold">{selectedModel.price}</span>
                        <button className="p-2 bg-white text-slate-950 rounded-full">
                          <ArrowRight className="w-5 h-5" />
                        </button>
                     </div>
                </div>
             </div>
             
             {/* Tech Specs Decoration */}
             <div className="mt-4 flex justify-between items-center text-[10px] text-slate-600 font-mono uppercase tracking-widest">
                <span>Ref: {selectedModel.id.toUpperCase()}-v2.0</span>
                <span className={language === 'zh' ? 'tracking-normal' : undefined}>{t('catalog.statusProductionReady')}</span>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
