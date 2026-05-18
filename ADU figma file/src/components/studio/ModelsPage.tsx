import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check,
  ArrowRight, 
  X, 
  ArrowDown,
  CheckCircle2,
  Umbrella,
  Layers,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';

import indusPodDoubleBalcony from 'figma:asset/ebdfaa8ca0523791b9bcb6ce5c7f954695bb07b2.png'; // Was indusPodImg
import indusPodMain from 'figma:asset/4487ba8a92fba78eeb5ef7fd5507fedb5836a873.png';
import indusPodLeftOnly from 'figma:asset/385ad695d0b9a3938de6cb482c301f307e4c80aa.png';
import indusPodRightOnly from 'figma:asset/216c01f7a24474a1ae2b2fa8862545fbc6b11945.png';
import auraImg from 'figma:asset/117b373854101687ab4b514162b4e9f0edb44c1d.png';
import classicImg from 'figma:asset/f0165c20f91f0c2d29de9cc3aaf8e3bc065cc790.png';

// Interior tour photos
import tourInterior1 from 'figma:asset/28ca59e6c351f36d28d3cd04d64dd861745af86c.png';
import tourInterior2 from 'figma:asset/e807ea9d06f728bbc2569288140646ed2413e6d5.png';
import tourInterior3 from 'figma:asset/7ba2255dfa6d72360708dafd86aed5faf852b4a5.png';
import tourKitchen from 'figma:asset/4d957f1516e553d962a926de9b62d7a4b202523e.png';
import tourBathroom from 'figma:asset/9773750901b7039dcfae912e26b962b9556a247e.png';

// Floor Plans
import indusPod1B1B from 'figma:asset/15ba7085002c63d42df318d8e971d20fc2fe2784.png';
import indusPod1B1BLeftOnly from 'figma:asset/6885ef949c179f0d1bd5e3a08d11fbb787917a16.png';
import indusPod1B1BRightOnly from 'figma:asset/40f6b94852e8766c95b0700423faf128a55ba8fd.png';
import indusPod1B1BExtended from 'figma:asset/5fca40691f8f5d48ee3e8587e16a6d524dc0e2c9.png';
import indusPod2B1B from 'figma:asset/0a8e0258df474478a2e83b3bbff3bc4dbc0ad6ea.png';
import indusPod2B1BLeftOnly from 'figma:asset/38fa19593a21b06848aa1aa19f476ef1012645a8.png';
import indusPod2B1BRightOnly from 'figma:asset/0a923b8a99bd1e626d32e25fbe8b703571210843.png';
import indusPod2B1BExtended from 'figma:asset/967d7c70292ea3af6bfaaad8fa9e134abe35c200.png';
import indusPod2B2BPlan from 'figma:asset/8112753e26940b2fb8f7bb4c11167397c97382ed.png';
import indusPod2B2BLeftOnly from 'figma:asset/316cb4451cd57151898c7eec7cd3bdcba240767c.png';
import indusPod2B2BRightOnly from 'figma:asset/c038019f058a737e01feecd9d6a6feab60cf2089.png';
import indusPod2B2BExtended from 'figma:asset/c834bf6169a514845c4bd3f8383b09aaa3ce0733.png';
import aura1B1B from 'figma:asset/0c0058a44e64ce11f403316189ab318180b41b82.png';
import aura1B1BLeftOnly from 'figma:asset/6dff364264718de328f1f6c3d390791217c2a9d0.png';
import aura1B1BRightOnly from 'figma:asset/3a1bc86e4288dc84c25704dd7f484603f5f4f281.png';
import aura2B1B from 'figma:asset/c8c79c5e6d1c12e22224edcd306f8db1fc7c4f54.png';
import aura2B2B from 'figma:asset/713479ff9bb516fcdcdeb2e6a5c03de93d0f0754.png';
import classic1B1B from 'figma:asset/fc5f368be11a8203a1be0418c725bf06aca429d6.png';

interface ModelsPageProps {
  isAuthenticated?: boolean;
  theme?: 'dark' | 'light';
  onNavigateToDesign?: (modelId: string) => void;
  onAction?: () => void;
}

// Mock Data for Models
const MODELS = [
  {
    id: 'indus-pod',
    name: 'IndusPod',
    description: 'Industrial minimalism with exposed steel and panoramic glazing.',
    image: indusPodMain,
    features: ['Clean Lines', 'Modern Minimal', 'Explicit Structure']
  },
  {
    id: 'aura',
    name: 'Aura',
    description: 'Soft contemporary design focusing on natural light and organic materials.',
    image: auraImg,
    features: ['Soft Shape', 'Light-Filled', 'Contemporary Style']
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless modern aesthetic that fits into any neighborhood context.',
    image: classicImg,
    features: ['Classic Form', 'Neighborhood Fit', 'Timeless Look']
  }
];

export function ModelsPage({ isAuthenticated = false, theme = 'light', onNavigateToDesign, onAction }: ModelsPageProps) {
  const isDark = theme === 'dark';
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const selectedModel = MODELS.find(m => m.id === selectedModelId);

  const scrollToModels = () => {
    const element = document.getElementById('model-selection');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* SECTION A: HERO (Brand Only) */}
      <section className="relative h-[90vh] flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-slate-950">
        {/* Background Image - Very subtle to ensure solid dark feel */}
        <div className="absolute inset-0">
           <img 
             src="https://images.unsplash.com/photo-1765872396322-2d0597b4b9fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcmNoaXRlY3R1cmFsJTIwc3RydWN0dXJhbCUyMGZyYW1lJTIwbWluaW1hbGlzbSUyMGJsdWVwcmludCUyMGFic3RyYWN0fGVufDF8fHx8MTc2Nzk3NDM3NXww&ixlib=rb-4.1.0&q=80&w=1080" 
             alt="System Core" 
             className="w-full h-full object-cover opacity-[0.05] blur-sm"
           />
           {/* Strong gradient to ensure seamless blend with page background */}
           <div className={`absolute inset-0 bg-gradient-to-t ${
             isDark 
               ? 'from-slate-950 via-slate-950/90 to-slate-950/40' 
               : 'from-slate-50 via-slate-50/90 to-slate-50/40'
           }`} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          {/* System Tag */}
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-slate-900/50 backdrop-blur-md border border-slate-700/50 mb-2 shadow-xl shadow-black/20">
             <Layers className="w-5 h-5 text-blue-500" />
             <span className="text-blue-500 text-sm font-bold tracking-[0.2em] uppercase">
                XHOME Flex Series
             </span>
          </div>
          
          <h1 className={`text-6xl md:text-8xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            One system. <br />
            <span className="text-blue-500">Three expressions.</span>
          </h1>

          {/* Subtitle Text */}
          <div className="mt-8 flex flex-col items-center justify-center gap-2">
             <p className={`text-lg md:text-xl font-medium tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
               Powered by the 600 sqft core —
             </p>
             <p className={`text-lg md:text-xl font-medium tracking-wide ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
               3 interior layouts, optional 120 sqft outdoor extension.
             </p>
          </div>
        </div>

        {/* Mouse Scroll Indicator */}
        <motion.div
          onClick={scrollToModels}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`w-6 h-10 rounded-full border-2 flex items-start justify-center p-2 ${isDark ? 'border-slate-600' : 'border-slate-400'}`}
          >
            <motion.div
              className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-slate-500' : 'bg-slate-400'}`}
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* SECTION B: CORE LOGIC */}
      <section className={`py-24 px-6 border-y ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest uppercase text-blue-500 mb-4 block">The System Logic</span>
            <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Fixed Core. Flexible Living.
            </h2>
            <p className={`max-w-4xl mx-auto whitespace-nowrap overflow-hidden text-ellipsis ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
               We solved the complex parts, so you can focus on how you live.
            </p>
          </div>

            <div className="grid md:grid-cols-3 gap-12">
            {/* Diagram 1: Fixed Core (Static, 16x37.5 ratio) */}
            <div className="space-y-6 text-center group">
              <div className={`aspect-[4/3] rounded-2xl flex items-center justify-center border transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                {/* 
                    Core Dimensions: 16' x 37.5'
                    Scale: 1 unit = 16px (Grid) = 2.5'
                    Width: 37.5' / 2.5' = 15 units = 240px (w-60)
                    Height: 16' / 2.5' = 6.4 units = 102.4px ~ 104px (h-26)
                */}
                <div className="relative">
                   {/* Core Box */}
                   <div className="relative w-60 h-26 border-2 border-white/50 bg-white/10 backdrop-blur-sm flex items-center justify-center z-10">
                      <div className="absolute inset-0 bg-blue-500/20" />
                      <span className="font-mono text-xs font-bold z-10 tracking-widest text-white">600 SF CORE</span>
                   </div>
                   
                   {/* Dimension Lines */}
                   {/* Top: 37.5' */}
                   <div className="absolute -top-6 left-0 w-full flex items-center justify-center gap-2">
                      <div className="h-px bg-white/30 flex-1 relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-1.5 bg-white/30" />
                      </div>
                      <span className="text-[10px] font-mono font-bold opacity-60">37.5'</span>
                      <div className="h-px bg-white/30 flex-1 relative">
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-1.5 bg-white/30" />
                      </div>
                   </div>

                   {/* Left: 16' */}
                   <div className="absolute -left-6 top-0 h-full flex flex-col items-center justify-center gap-2">
                      <div className="w-px bg-white/30 flex-1 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-px bg-white/30" />
                      </div>
                      <span className="text-[10px] font-mono font-bold opacity-60 -rotate-90">16'</span>
                      <div className="w-px bg-white/30 flex-1 relative">
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-px bg-white/30" />
                      </div>
                   </div>
                </div>
              </div>
              <div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>1. The Core</h3>
                <p className="text-sm text-slate-500">A standardized structural core designed for residential lots.</p>
              </div>
            </div>

            {/* Diagram 2: Interior Flex (Grow Animations from Boundary) */}
            <div className="space-y-6 text-center group">
              <div className={`aspect-[4/3] rounded-2xl flex items-center justify-center border transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                 <div className="relative w-60 h-26 border-2 border-white/50 flex overflow-hidden">
                    {/* Background Grid (16px) - 240/16=15 cols */}
                    <div className="absolute inset-0 opacity-10" 
                         style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} 
                    />

                    {/* Animated Partition 1: Vertical split (grows from TOP) 
                        Moved right by 1 grid from roughly 2/3 position.
                        Col 11/15 = 73.33%
                    */}
                    <motion.div 
                       animate={{ 
                         height: ["0%", "100%", "100%", "0%"]
                       }}
                       transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.8, 1] }}
                       className="absolute top-0 left-[73.33%] w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] origin-top"
                    />

                    {/* Animated Partition 3: Vertical split (grows from BOTTOM) 
                        Moved left by 1 grid from roughly 1/3 position.
                        Col 4/15 = 26.66%
                    */}
                    <motion.div 
                       animate={{ 
                         height: ["0%", "100%", "100%", "0%"]
                       }}
                       transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.8, 1], delay: 0.5 }}
                       className="absolute bottom-0 left-[26.66%] w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] origin-bottom"
                    />

                    {/* Animated Partition 2: Horizontal split (grows from RIGHT) 
                        Aligned to grid line.
                        Stops at the right vertical line (Col 11/15).
                        Distance from right edge = 4/15 = 26.66%
                    */}
                    <motion.div 
                       animate={{ 
                         width: ["0%", "0%", "26.66%", "0%"]
                       }}
                       transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", times: [0, 0.3, 0.6, 1] }}
                       className="absolute top-[50%] right-0 h-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] origin-right"
                    />
                 </div>
              </div>
              <div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>2. Interior Flex</h3>
                <p className="text-sm text-slate-500">Supports 1B1B, 2B1B, or 2B2B interior layouts.</p>
              </div>
            </div>

            {/* Diagram 3: Outdoor Extension (Drawer Animation) */}
            <div className="space-y-6 text-center group">
              <div className={`aspect-[4/3] rounded-2xl flex items-center justify-center border transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                 <div className="relative flex items-center justify-center w-full">
                    {/* Left Extension - Slides out like a drawer to the left */}
                    <div className="relative flex justify-end overflow-visible">
                        <motion.div 
                           initial={{ width: 0, opacity: 0 }}
                           animate={{ width: 48, opacity: 1 }} // Reduced max width to 48px
                           transition={{ duration: 3, repeat: Infinity, repeatDelay: 1, ease: "easeInOut", repeatType: "reverse" }}
                           className="h-26 border-y-2 border-l-2 border-white/40 border-dashed bg-blue-500/5 rounded-l-md overflow-hidden relative"
                           style={{ marginRight: -2 }} // Overlap border slightly
                        >
                            {/* Inner Dashes to prevent squishing */}
                            <div className="w-12 h-full" /> 
                        </motion.div>
                    </div>

                    {/* Core (Solid - Matches Diagram 1 Size) */}
                    <div className="w-60 h-26 border-2 border-white/50 bg-white/5 z-20 relative flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-mono opacity-30">CORE</span>
                    </div>

                    {/* Right Extension - Slides out like a drawer to the right */}
                    <div className="relative flex justify-start overflow-visible">
                         <motion.div 
                           initial={{ width: 0, opacity: 0 }}
                           animate={{ width: 48, opacity: 1 }} // Reduced max width to 48px
                           transition={{ duration: 3, repeat: Infinity, repeatDelay: 1, ease: "easeInOut", repeatType: "reverse" }}
                           className="h-26 border-y-2 border-r-2 border-white/40 border-dashed bg-blue-500/5 rounded-r-md overflow-hidden relative"
                           style={{ marginLeft: -2 }} // Overlap border slightly
                        >
                             {/* Inner Dashes to prevent squishing */}
                             <div className="w-12 h-full" />
                        </motion.div>
                    </div>
                 </div>
              </div>
              <div>
                <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>3. Outdoor Extension</h3>
                <p className="text-sm text-slate-500">Add optional 120 sqft attached terraces for indoor-outdoor living.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C: MODEL SELECTION (Cards) */}
      <section id="model-selection" className="py-24 px-6 min-h-screen flex flex-col justify-center">
        <div className="max-w-7xl mx-auto w-full">
           <div className="text-center mb-16">
              <h2 className={`text-4xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>Select your expression</h2>
              <p className={`max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Same core performance. Three distinct architectural languages.
              </p>
           </div>

           <div className="grid md:grid-cols-3 gap-8 items-stretch">
             {MODELS.map((model) => {
               const isSelected = selectedModelId === model.id;
               return (
                 <div 
                   key={model.id}
                   onClick={() => setSelectedModelId(model.id)}
                   className={`group cursor-pointer rounded-[40px] border-2 transition-all duration-500 flex flex-col overflow-hidden text-left relative pt-0 pb-6 h-auto ${
                     isSelected
                       ? 'border-[#2B7FFF] shadow-2xl ring-1 ring-[#2B7FFF]/10 scale-[1.01]' 
                       : 'border-transparent shadow-sm hover:border-slate-200 hover:shadow-xl hover:-translate-y-1'
                   } ${isDark ? 'bg-slate-900' : 'bg-white'}`}
                 >
                   {/* Image Container: Flush top, no fixed height, no bars */}
                   <div className="w-full relative overflow-hidden bg-slate-800 shrink-0">
                      <img 
                        src={model.image} 
                        alt={model.name} 
                        className="w-full h-auto block transition-transform duration-1000 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                   </div>
                   <div className="p-6 flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                         <h3 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{model.name}</h3>
                         
                         {/* Selection state: Arrow replaced by Checkmark */}
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                            isSelected 
                            ? 'bg-[#2B7FFF] text-white' 
                            : isDark ? 'bg-slate-800 text-slate-400 group-hover:bg-blue-500 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-[#2B7FFF] group-hover:text-white'
                         }`}>
                            {isSelected ? (
                                <Check className="w-5 h-5 stroke-[3]" />
                            ) : (
                                <ArrowRight className="w-5 h-5" />
                            )}
                         </div>
                      </div>
                      
                      <p className={`text-[15px] leading-[24px] line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                         {model.description}
                      </p>

                      {/* Tags: AUTO LAYOUT HORIZONTAL, NO WRAP (A3) - 8px GAP */}
                      <div 
                          className="flex flex-row gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide no-scrollbar" 
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                          {model.features.map((feat, i) => (
                              <span 
                                  key={i} 
                                  className={`inline-flex items-center justify-center text-[10px] font-bold px-4 py-2.5 rounded-full uppercase tracking-[0.12em] shrink-0 ${
                                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                                  }`}
                              >
                                  {feat}
                              </span>
                          ))}
                      </div>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      </section>

      {/* SECTION D: FINAL CTA (POST-EXPRESSION) */}
      <section className="py-32 px-6 bg-slate-950 text-center border-t border-slate-900">
         <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Ready to see what works on your lot?
            </h2>
            <p className="text-lg text-slate-400">
              Check zoning, placement, and feasibility in minutes.
            </p>
            <button 
              onClick={onAction}
              className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-200 transition-colors"
            >
              Start Your Project
            </button>
         </div>
      </section>

      {/* DETAIL MODAL (Full Screen) */}
      <AnimatePresence>
        {selectedModel && (
          <FullPageModelDetail 
            key={selectedModel.id}
            model={selectedModel} 
            onClose={() => setSelectedModelId(null)} 
            onSwitchModel={(id: string) => setSelectedModelId(id)}
            isDark={isDark}
            isAuthenticated={isAuthenticated}
            onAction={onAction}
            onNavigateToDesign={onNavigateToDesign}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- NEW COMPONENT: FULL PAGE MODEL DETAIL ---

const TOUR_IMAGES = [
  tourKitchen,
  tourBathroom,
  tourInterior1,
  tourInterior2,
  tourInterior3
];

const FLOOR_PLAN_IMG = "https://images.unsplash.com/photo-1742415106102-77bbfe14b872?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

function getFloorPlan(modelId: string, layout: string, extensions: { left: boolean; right: boolean }) {
    const hasExtension = extensions.left || extensions.right;

    if (modelId === 'indus-pod') {
        if (layout === '2B2B') {
             if (extensions.left && extensions.right) return indusPod2B2BExtended;
             if (extensions.left && !extensions.right) return indusPod2B2BLeftOnly;
             if (!extensions.left && extensions.right) return indusPod2B2BRightOnly;
             return indusPod2B2BPlan;
        }
        
        if (layout === '2B1B') {
            if (extensions.left && !extensions.right) return indusPod2B1BLeftOnly;
            if (!extensions.left && extensions.right) return indusPod2B1BRightOnly;
            return hasExtension ? indusPod2B1BExtended : indusPod2B1B;
        }

        if (layout === '1B1B') {
            if (extensions.left && !extensions.right) return indusPod1B1BLeftOnly;
            if (!extensions.left && extensions.right) return indusPod1B1BRightOnly;
            return hasExtension ? indusPod1B1BExtended : indusPod1B1B;
        }
    }
    if (layout === '1B1B') {
        switch(modelId) {
            case 'aura': 
                if (extensions.left && !extensions.right) return aura1B1BLeftOnly;
                if (!extensions.left && extensions.right) return aura1B1BRightOnly;
                return aura1B1B;
            case 'classic': return classic1B1B;
        }
    }
    if (modelId === 'aura') {
        if (layout === '2B1B') return aura2B1B;
        if (layout === '2B2B') return aura2B2B;
    }
    return FLOOR_PLAN_IMG;
}

function FullPageModelDetail({ model, onClose, isDark, isAuthenticated, onAction, onNavigateToDesign, onSwitchModel }: any) {
    // State
    const [layout, setLayout] = useState<'1B1B' | '2B1B' | '2B2B'>('1B1B');
    const [extensions, setExtensions] = useState({ left: false, right: false });
    
    // Viewing States
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
    const [floorPlanOpen, setFloorPlanOpen] = useState(false);

    const openGallery = (index: number) => {
        setGalleryInitialIndex(index);
        setGalleryOpen(true);
    };

    // Reset extensions when layout changes
    React.useEffect(() => {
        setExtensions({ left: false, right: false });
    }, [layout]);

    // Derived Data
    // Prompt: "Exterior Area: +120 sqft (per balcony)"
    const exteriorArea = (extensions.left ? 120 : 0) + (extensions.right ? 120 : 0);
    
    // Calculate Total Length
    // Base: 37.5'
    // Each extension (120 sqft / 16' width) adds 7.5'
    const totalLength = 37.5 + (extensions.left ? 7.5 : 0) + (extensions.right ? 7.5 : 0);

    // Dynamic Image Logic
    let displayImage = model.image;
    if (model.id === 'indus-pod') {
        if (extensions.left && extensions.right) {
            displayImage = indusPodDoubleBalcony;
        } else if (extensions.left && !extensions.right) {
            displayImage = indusPodLeftOnly;
        } else if (!extensions.left && extensions.right) {
            displayImage = indusPodRightOnly;
        }
    }
    
    // Configuration Label
    const configLabel = {
        '1B1B': '1 Bed / 1 Bath',
        '2B1B': '2 Bed / 1 Bath',
        '2B2B': '2 Bed / 2 Bath'
    }[layout];
    
    // Prepare Images for Gallery (Exterior + Interiors + Plan)
    const currentFloorPlan = getFloorPlan(model.id, layout, extensions);
    const galleryImages = [
        displayImage, // Main exterior (index 0) - dynamic
        ...TOUR_IMAGES, // Tour images (index 1 to 6)
        currentFloorPlan // (index 7)
    ];

    // Handlers
    const toggleExtension = (side: 'left' | 'right') => {
        setExtensions(prev => ({ ...prev, [side]: !prev[side] }));
    };

    const otherModels = MODELS.filter(m => m.id !== model.id);
    
    // Switch Model Handler
    const handleSwitchModel = (id: string) => {
        if (onSwitchModel) {
            onSwitchModel(id);
        } else {
            // Fallback if no switcher provided (e.g. initial render without wrapper)
            onClose();
        }
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed inset-0 z-50 overflow-y-auto ${isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}
        >
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="fixed top-6 right-6 z-[60] p-2 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-md transition-colors text-current"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="max-w-[1600px] mx-auto px-6 py-12 md:py-20">
                
                {/* GRID LAYOUT */}
                <div className="grid md:grid-cols-[3fr_1fr] gap-12 lg:gap-24 mb-24 items-start">
                    
                    {/* --- LEFT COLUMN: VIEWING AREA --- */}
                    <div className="space-y-16">
                        
                        {/* SECTION 1: EXTERIOR IMAGE (Inline) */}
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-200">
                             <img 
                                 src={displayImage}
                                 className="w-full h-full object-cover"
                                 alt="Exterior Facade"
                             />
                             {/* See all photos tag */}
                             <button 
                                 onClick={() => openGallery(0)}
                                 className="absolute bottom-4 right-4 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-bold hover:bg-black/70 transition-colors flex items-center gap-2"
                             >
                                 <Layers className="w-3 h-3" />
                                 See all photos
                             </button>
                        </div>

                        {/* FLOOR PLAN SECTION */}
                        <div className="grid md:grid-cols-2 gap-12 items-stretch pt-20 pb-10 border-t border-slate-200/10">
                            {/* Plan Preview */}
                            <div 
                                className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 p-6 flex items-center justify-center bg-white cursor-pointer hover:border-blue-500 transition-all shadow-sm hover:shadow-md relative group"
                                onClick={() => setFloorPlanOpen(true)}
                            >
                                <img 
                                    src={currentFloorPlan}
                                    alt="Floor Plan"
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Maximize2 className="w-4 h-4 text-slate-600" />
                                </div>
                            </div>

                            {/* Plan Specs */}
                            <div className="flex flex-col h-full">
                                <h3 className={`text-2xl font-bold mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>Floor Plan Specifications</h3>
                                
                                <div className="flex-1 flex flex-col justify-between">
                                    {/* Interior Area */}
                                    <div className={`flex justify-between items-center py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <span className={`font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Interior Area</span>
                                        <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>600 sqft</span>
                                    </div>

                                    {/* Configuration */}
                                    <div className={`flex justify-between items-center py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <span className={`font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Configuration</span>
                                        <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>{configLabel}</span>
                                    </div>

                                    {/* Dimensions */}
                                    <div className={`flex justify-between items-center py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                        <span className={`font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Dimensions</span>
                                        <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>16' × {totalLength}'</span>
                                    </div>

                                    {/* Exterior Area */}
                                    <div className={`flex justify-between items-center py-4 ${exteriorArea > 0 ? 'visible' : 'invisible'}`}>
                                        <span className="font-medium text-blue-500">Exterior Area</span>
                                        <span className="font-bold text-xl text-blue-500">{exteriorArea} sqft</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION: TOUR YOUR MODULAR HOME */}
                        <div className="pt-8 border-t border-slate-200/10">
                            <h3 className="text-xl font-bold mb-8">Tour Your Modular Home</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* First Image (Large 2x2) - Spans 2 cols and 2 rows */}
                                <div 
                                    className="md:col-span-2 md:row-span-2 rounded-2xl overflow-hidden bg-slate-200 cursor-pointer hover:opacity-95 transition-opacity relative min-h-[300px] md:min-h-0"
                                    onClick={() => openGallery(0)}
                                >
                                    <img src={displayImage} alt="" className="w-full h-full object-cover md:absolute md:inset-0" />
                                </div>

                                {/* Top Right (1x1) */}
                                <div 
                                    className="aspect-video rounded-2xl overflow-hidden bg-slate-200 cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => openGallery(1)}
                                >
                                    <img src={tourKitchen} alt="" className="w-full h-full object-cover" />
                                </div>

                                {/* Middle Right (1x1) */}
                                <div 
                                    className="aspect-video rounded-2xl overflow-hidden bg-slate-200 cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => openGallery(2)}
                                >
                                    <img src={tourBathroom} alt="" className="w-full h-full object-cover" />
                                </div>

                                {/* Bottom Row (3 images) */}
                                <div 
                                    className="aspect-video rounded-2xl overflow-hidden bg-slate-200 cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => openGallery(3)}
                                >
                                    <img src={tourInterior1} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div 
                                    className="aspect-video rounded-2xl overflow-hidden bg-slate-200 cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => openGallery(4)}
                                >
                                    <img src={tourInterior2} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div 
                                    className="aspect-video rounded-2xl overflow-hidden bg-slate-200 cursor-pointer hover:opacity-95 transition-opacity"
                                    onClick={() => openGallery(5)}
                                >
                                    <img src={tourInterior3} alt="" className="w-full h-full object-cover" />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* --- RIGHT COLUMN: CONFIGURATION PANEL (Sticky) --- */}
                    <div className="sticky top-12 h-fit space-y-10">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold mb-2">{model.name}</h2>
                            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {model.description}
                            </p>
                        </div>

                        {/* A. Interior Layout */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-4 opacity-70">Interior Layout</h4>
                            <div className="space-y-3">
                                {['1B1B', '2B1B', '2B2B'].map((opt) => (
                                    <label 
                                        key={opt}
                                        className={`flex items-center p-4 rounded-xl border cursor-pointer transition-all ${
                                            layout === opt 
                                                ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500' 
                                                : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <input 
                                            type="radio" 
                                            name="layout" 
                                            value={opt}
                                            checked={layout === opt}
                                            onChange={() => setLayout(opt as any)}
                                            className="hidden" 
                                        />
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 ${layout === opt ? 'border-blue-500' : 'border-slate-400'}`}>
                                            {layout === opt && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                        </div>
                                        <span className="font-bold text-sm">{opt} Suite</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* B. Extensions */}
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider mb-4 opacity-70">Extensions</h4>
                            <div className="space-y-3">
                                <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                                    extensions.left ? 'border-blue-500 bg-blue-500/5' : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                                }`}>
                                    <span className="font-bold text-sm">Left Balcony</span>
                                    <div className={`relative w-10 h-6 rounded-full transition-colors ${extensions.left ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${extensions.left ? 'translate-x-4' : ''}`} />
                                        <input type="checkbox" className="hidden" checked={extensions.left} onChange={() => toggleExtension('left')} />
                                    </div>
                                </label>

                                <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                                    extensions.right ? 'border-blue-500 bg-blue-500/5' : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                                }`}>
                                    <span className="font-bold text-sm">Right Balcony</span>
                                    <div className={`relative w-10 h-6 rounded-full transition-colors ${extensions.right ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${extensions.right ? 'translate-x-4' : ''}`} />
                                        <input type="checkbox" className="hidden" checked={extensions.right} onChange={() => toggleExtension('right')} />
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* C. Customization */}
                        <div className={`p-6 rounded-xl ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                            <p className={`text-sm text-center opacity-70 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                Exterior finishes, interior colors, and furniture packages are customizable later.
                            </p>
                        </div>

                        {/* Action Button */}
                        <button 
                            onClick={isAuthenticated ? () => onNavigateToDesign?.(model.id) : onAction}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
                        >
                            {isAuthenticated ? 'Configure This Build' : 'Check Availability'}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* BOTTOM: BROWSE OTHER OPTIONS */}
                <div className="border-t border-slate-200/10 pt-16 pb-12">
                    <h3 className="text-2xl font-bold mb-8">Browse other options</h3>
                    <div className="grid md:grid-cols-2 gap-8">
                        {otherModels.map((m) => (
                            <div 
                                key={m.id}
                                onClick={() => handleSwitchModel(m.id)}
                                className={`group cursor-pointer flex items-center p-6 pr-8 rounded-[2rem] border transition-all duration-300 ${
                                    isDark 
                                        ? 'border-slate-800 bg-slate-900 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                                        : 'border-slate-200 bg-white hover:border-blue-500 hover:shadow-xl'
                                }`}
                            > 
                                {/* Image - Left (Rounded Rect) */}
                                <div className="w-40 h-28 shrink-0 rounded-2xl overflow-hidden bg-slate-200 mr-8">
                                    <img src={m.image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt={m.name} />
                                </div>

                                {/* Text - Center Block */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center h-28">
                                    <h4 className={`font-bold text-3xl mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.name}</h4>
                                    <p className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                        {m.id === 'indus-pod' ? 'Industrial Minimalism' : m.id === 'aura' ? 'Organic Modern' : 'Timeless Modular'}
                                    </p>
                                </div>

                                {/* Arrow Button - Right (Circle) */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                                    isDark 
                                        ? 'bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white' 
                                        : 'bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white'
                                }`}>
                                     <ArrowRight className="w-5 h-5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* --- GALLERY MODE MODAL --- */}
            <AnimatePresence>
                {galleryOpen && (
                    <GalleryModal 
                        images={galleryImages} 
                        initialIndex={galleryInitialIndex}
                        onClose={() => setGalleryOpen(false)}
                        floorPlanIndex={galleryImages.length - 1}
                    />
                )}
            </AnimatePresence>

            {/* --- STANDALONE FLOOR PLAN MODAL --- */}
            <AnimatePresence>
                {floorPlanOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6"
                        onClick={() => setFloorPlanOpen(false)}
                    >
                        <button className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                        <motion.div 
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-white p-4 rounded-xl max-w-4xl w-full aspect-[4/3] flex items-center justify-center overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <img 
                                src={currentFloorPlan}
                                className="w-full h-full object-contain"
                                alt="Floor Plan Full View"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function GalleryModal({ images, initialIndex = 0, onClose, floorPlanIndex }: { images: string[], initialIndex?: number, onClose: () => void, floorPlanIndex?: number }) {
    const [index, setIndex] = useState(initialIndex);

    const next = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIndex(prev => (prev + 1) % images.length);
    };

    const prev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIndex(prev => (prev - 1 + images.length) % images.length);
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') next();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
        >
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
                <X className="w-8 h-8" />
            </button>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden w-full">
                <button onClick={prev} className="absolute left-4 md:left-8 z-20 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                    <ChevronLeft className="w-8 h-8" />
                </button>
                <button onClick={next} className="absolute right-4 md:right-8 z-20 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors">
                    <ChevronRight className="w-8 h-8" />
                </button>

                <div className="relative w-full h-full flex items-center justify-center px-12 md:px-24 py-12">
                     <AnimatePresence initial={false} mode="popLayout">
                         <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className={`w-full h-full flex items-center justify-center ${index === floorPlanIndex ? 'bg-white rounded-xl p-6' : ''}`}
                         >
                            <img 
                                src={images[index]} 
                                className={`max-w-full max-h-full object-contain rounded-sm shadow-2xl ${index === floorPlanIndex ? 'shadow-none' : ''}`}
                                alt={`Gallery image ${index + 1}`}
                            />
                         </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="h-20 md:h-24 bg-black/80 backdrop-blur-md border-t border-white/10 flex items-center justify-center z-20">
                 <div className="flex gap-2 overflow-x-auto px-6 py-2 max-w-full no-scrollbar">
                     {images.map((img, i) => (
                         <button 
                            key={i}
                            onClick={() => setIndex(i)}
                            className={`relative h-12 w-16 md:h-16 md:w-24 shrink-0 rounded overflow-hidden transition-all ${
                                i === index ? 'ring-2 ring-white opacity-100' : 'opacity-40 hover:opacity-70'
                            } ${i === floorPlanIndex ? 'bg-white' : ''}`}
                         >
                             <img src={img} className={`w-full h-full ${i === floorPlanIndex ? 'object-contain p-1' : 'object-cover'}`} alt="" />
                         </button>
                     ))}
                 </div>
            </div>
        </motion.div>
    );
}