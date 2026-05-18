import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  PenTool, 
  TrendingUp, 
  FileText, 
  Calendar, 
  Building2,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Maximize2,
  Umbrella,
  Layers,
  Save,
  PenTool as Pen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OverviewDashboard } from './OverviewDashboard';
import { SiteFeasibility } from './SiteFeasibility';
import { SiteVisualizer } from './SiteVisualizer';
import { ValuePlanner } from './ValuePlanner';
import { InteriorStudio } from './InteriorStudio';
import { ModelsPage } from './ModelsPage';
import { ServicesPage } from './ServicesPage';
import { FinanceModule } from './FinanceModule';
import { PermittingPage } from './PermittingPage';
import { TimelinePage } from './TimelinePage';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { GlobalHeader } from '../shared/GlobalHeader';
import { PageTitle, PageSubtitle, SubsectionLabel } from './Typography';

import housingGrid from 'figma:asset/f9ac516fc096db77c10923e08698a15edbe19c3d.png';
import focusPodThumbnail from 'figma:asset/eed75d012b4055aff916ca27417f2af0d0e62117.png';

import imgImageExteriorFacade from "figma:asset/117b373854101687ab4b514162b4e9f0edb44c1d.png";
import imgImageFloorPlan from "figma:asset/0c0058a44e64ce11f403316189ab318180b41b82.png";
import imgMainHero from "figma:asset/72ca51d0d812840fbb888e70863382c7f40ea1df.png";

// Interior Tour Images - Using high-quality Unsplash for variety
const imgImage = "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1000&auto=format&fit=crop"; // Modern Living 1
const imgImage1 = "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1000&auto=format&fit=crop"; // Modern Living 2
const imgImage2 = "https://images.unsplash.com/photo-1600566752355-35792bedcfea?q=80&w=1000&auto=format&fit=crop"; // Kitchen
const imgImage3 = "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?q=80&w=1000&auto=format&fit=crop"; // Bedroom
const imgImage4 = "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=1000&auto=format&fit=crop"; // Bathroom
const imgImage5 = imgMainHero;
import imgImageIndusPod from "figma:asset/4487ba8a92fba78eeb5ef7fd5507fedb5836a873.png";
import imgImageClassic from "figma:asset/f0165c20f91f0c2d29de9cc3aaf8e3bc065cc790.png";

// Floor plans for different expressions
import indusPodFloorPlan from "figma:asset/15ba7085002c63d42df318d8e971d20fc2fe2784.png";
import auraFloorPlan from "figma:asset/0c0058a44e64ce11f403316189ab318180b41b82.png";
import classicFloorPlan from "figma:asset/fc5f368be11a8203a1be0418c725bf06aca429d6.png";

const MODELS = [
  {
    id: 'focus-pod',
    name: 'Focus Pod',
    price: 22900,
    sqft: 120,
    type: 'Office',
    image: focusPodThumbnail
  },
  {
    id: 'studio-one',
    name: 'Studio One',
    price: 189000,
    sqft: 495,
    type: '1 Bedroom',
    image: housingGrid,
    bgPosition: '100% 100%'
  },
  {
    id: 'model-b1',
    name: 'Model B1',
    price: 215000,
    sqft: 600,
    type: '1 Bedroom',
    image: housingGrid,
    bgPosition: '50% 50%'
  },
  {
    id: 'model-b2',
    name: 'Model B2',
    price: 245000,
    sqft: 750,
    type: '2 Bedroom',
    image: housingGrid,
    bgPosition: '0% 50%'
  },
  {
    id: 'family-home',
    name: 'Family Home',
    price: 310000,
    sqft: 1000,
    type: '3 Bedroom',
    image: housingGrid,
    bgPosition: '0% 0%'
  }
];

const EXPRESSIONS = [
  { 
    id: 'IndusPod', 
    name: 'IndusPod',
    subtitle: 'Industrial Minimalism',
    description: 'Industrial minimalism with exposed steel and panoramic glazing.',
    image: imgImageIndusPod,
    floorPlan: indusPodFloorPlan,
    features: ['Clean Lines', 'Modern Minimal', 'Explicit Structure']
  },
  { 
    id: 'Aura', 
    name: 'Aura',
    subtitle: 'Organic Modern',
    description: 'Soft contemporary design focusing on natural light and organic materials.',
    image: imgImageExteriorFacade,
    floorPlan: auraFloorPlan,
    features: ['Soft Shape', 'Light-Filled', 'Contemporary Style']
  },
  { 
    id: 'Classic', 
    name: 'Classic',
    subtitle: 'Timeless Modular',
    description: 'Timeless modern aesthetic that fits into any neighborhood context.',
    image: imgImageClassic,
    floorPlan: classicFloorPlan,
    features: ['Classic Form', 'Neighborhood Fit', 'Timeless Look']
  }
];

interface DesignStudioProps {
  onSignOut: () => void;
}

export function DesignStudio({ onSignOut }: DesignStudioProps) {
  const [viewContext, setViewContext] = useState<'project' | 'models' | 'services' | 'financing'>('project');
  const [activeTab, setActiveTab] = useState<'overview' | 'site' | 'design' | 'value' | 'permitting' | 'timeline'>('site');
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  
  // Design Mode State
  const [designView, setDesignView] = useState<'exterior' | 'interior'>('exterior');
  const [selectedModel, setSelectedModel] = useState('focus-pod');
  const [exteriorMaterial, setExteriorMaterial] = useState<'timber' | 'siding-grey' | 'stucco-white' | 'siding-white'>('timber');
  
  // Track completed tabs
  const [completedTabs, setCompletedTabs] = useState<Set<string>>(new Set());
  
  // Expression State
  const [selectedExpression, setSelectedExpression] = useState<string | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(['layout', 'finish']));
  
  // Selection States for Dashboard
  const [interiorSelections, setInteriorSelections] = useState<any>(null);
  
  // Configuration State (Shared between Detail View and Studio Panel)
  const [config, setConfig] = useState<{
    layout: '1B1B' | '2B1B' | '2B2B' | null;
    balconies: ('left' | 'right')[];
    finish: string;
  }>({
    layout: '1B1B',
    balconies: [],
    finish: 'siding-white'
  });

  const getDashboardModel = () => {
    const model = MODELS.find(m => m.id === selectedModel);
    if (!model) return undefined;
    
    return {
        ...model,
        category: model.type,
        price: model.price.toString(),
        image: model.id === 'focus-pod' ? focusPodThumbnail : model.image
    };
  };

  const renderContent = () => {
    // --- Detail View Component (64/36 Split, Independent Sticky Scrolling) ---
    const ExpressionDetailView = ({ expId, onClose }: { expId: string, onClose: () => void }) => {
        const exp = EXPRESSIONS.find(e => e.id === expId);
        if (!exp) return null;

        // LOCAL DRAFT STATE: Prevent parent re-renders and flickering
        const [draftConfig, setDraftConfig] = useState({
            layout: config.layout,
            balconies: config.balconies,
            finish: config.finish
        });

        const [showGallery, setShowGallery] = useState(false);
        const [galleryIndex, setGalleryIndex] = useState(0);

        const handleConfirm = () => {
            setSelectedExpression(exp.id);
            setConfig({
                layout: draftConfig.layout,
                balconies: draftConfig.balconies,
                finish: draftConfig.finish
            });
            onClose();
        };

        const toggleBalcony = (side: 'left' | 'right') => {
            setDraftConfig(prev => ({
                ...prev,
                balconies: prev.balconies.includes(side) ? prev.balconies.filter(s => s !== side) : [...prev.balconies, side]
            }));
        };

        const galleryImages = [
            exp.image,
            imgImage5, imgImage, imgImage1, imgImage2, imgImage3, imgImage4,
            exp.floorPlan
        ];

        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] bg-white overflow-y-auto no-scrollbar selection:bg-[#2B7FFF]/10"
            >
                <div className="max-w-[1200px] mx-auto min-h-screen relative pt-20">
                    {/* Fixed Header */}
                    <div className="fixed top-0 left-0 right-0 z-[160] px-16 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-xl font-bold text-slate-900 tracking-tight">{exp.name}</span>
                            <div className="px-2.5 py-1 bg-blue-50 text-[#2B7FFF] text-[10px] font-bold rounded-full uppercase tracking-wider">Drafting Configuration</div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2.5 rounded-full bg-slate-100/50 hover:bg-slate-100 text-slate-500 transition-all active:scale-95"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* TWO-COLUMN SYSTEM (64/36) - Use items-start for sticky functionality */}
                    <div className="flex gap-10 items-start mb-0">
                        {/* Left Column (64% - ~768px) */}
                        <div className="w-[64%] space-y-20 pb-0">
                            {/* Section 1: Hero Media */}
                            <div className="relative aspect-[16/9.5] rounded-[32px] overflow-hidden bg-slate-50">
                                <img src={exp.image} alt={exp.name} className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => {
                                        setGalleryIndex(0);
                                        setShowGallery(true);
                                    }}
                                    className="absolute bottom-6 right-6 px-5 py-2.5 bg-black/60 backdrop-blur-md rounded-full text-white text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-black/80 transition-all shadow-lg active:scale-95"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    See all photos
                                </button>
                            </div>

                            {/* Section 2: Floor Plan Specifications */}
                            <div className="grid grid-cols-[1.2fr_1fr] gap-12 items-start pt-12 border-t border-slate-100">
                                <div className="bg-slate-50 rounded-[24px] p-10 flex items-center justify-center min-h-[400px]">
                                    <img src={exp.floorPlan} alt="Floor Plan" className="w-full h-auto object-contain" />
                                </div>
                                <div className="space-y-8">
                                    <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Floor Plan Specifications</h3>
                                    <div className="space-y-1">
                                        {[
                                            { label: 'Interior Area', value: '600 sqft' },
                                            { label: 'Configuration', value: '1 Bed / 1 Bath' },
                                            { label: 'Dimensions', value: "16' × 37.5'" }
                                        ].map((spec, i) => (
                                            <div key={i} className="flex items-center justify-between py-5 border-b border-slate-100 last:border-0">
                                                <p className="text-slate-400 text-sm font-medium">{spec.label}</p>
                                                <p className="text-slate-900 font-bold text-lg">{spec.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Tour Grid - Exactly as image 2 (No Stretching) */}
                            <div className="space-y-10 pt-16 border-t border-slate-100 pb-0">
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Tour Your Modular Home</h3>
                                <div className="space-y-5">
                                    {/* Top Row: Hero Left + Stack Right */}
                                    <div className="grid grid-cols-3 gap-5">
                                        <div className="col-span-2 rounded-[32px] overflow-hidden bg-slate-100 aspect-[1.35/1]">
                                            <img src={exp.image} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-col gap-5">
                                            <div className="flex-1 rounded-[24px] overflow-hidden bg-slate-100 aspect-[1.3/1]">
                                                <img src={imgImage} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 rounded-[24px] overflow-hidden bg-slate-100 aspect-[1.3/1]">
                                                <img src={imgImage1} className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    </div>
                                    {/* Bottom Row: 3 Equal Images */}
                                    <div className="grid grid-cols-3 gap-5">
                                        <div className="rounded-[24px] overflow-hidden bg-slate-100 aspect-[1.3/1]">
                                            <img src={imgImage2} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="rounded-[24px] overflow-hidden bg-slate-100 aspect-[1.3/1]">
                                            <img src={imgImage3} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="rounded-[24px] overflow-hidden bg-slate-100 aspect-[1.3/1]">
                                            <img src={imgImage4} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column (36% - ~432px) STICKY */}
                        <div className="w-[36%] sticky top-24 space-y-12 pb-0">
                            <div className="space-y-4">
                                <h2 className="text-4xl font-bold text-slate-900 tracking-tight leading-[44px]">{exp.name}</h2>
                                <p className="text-slate-500 text-sm leading-[24px]">{exp.description}</p>
                            </div>

                            {/* Interior Layout */}
                            <div className="space-y-5">
                                <SubsectionLabel>Interior Layout</SubsectionLabel>
                                <div className="space-y-3">
                                    {(['1B1B', '2B1B', '2B2B'] as const).map(l => (
                                        <button 
                                            key={l}
                                            onClick={() => setDraftConfig(prev => ({ ...prev, layout: l }))}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                                draftConfig.layout === l 
                                                    ? 'border-[#2B7FFF] bg-[rgba(43,127,255,0.05)] text-[#2B7FFF]' 
                                                    : 'border-slate-100 bg-white hover:border-slate-200 text-slate-600'
                                            }`}
                                        >
                                            <span className="text-sm font-bold">{l} Suite</span>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                draftConfig.layout === l ? 'border-[#2B7FFF]' : 'border-slate-200'
                                            }`}>
                                                {draftConfig.layout === l && <div className="w-2.5 h-2.5 bg-[#2B7FFF] rounded-full" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Extensions */}
                            <div className="space-y-5">
                                <SubsectionLabel>Extensions</SubsectionLabel>
                                <div className="flex gap-3">
                                    {[
                                        { id: 'left' as const, label: 'Left Balcony' },
                                        { id: 'right' as const, label: 'Right Balcony' }
                                    ].map(ext => (
                                        <button 
                                            key={ext.id}
                                            onClick={() => toggleBalcony(ext.id)}
                                            className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                                draftConfig.balconies.includes(ext.id) 
                                                    ? 'border-[#2B7FFF] bg-[rgba(43,127,255,0.05)] text-[#2B7FFF]' 
                                                    : 'border-slate-100 bg-white hover:border-slate-200 text-slate-600'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                draftConfig.balconies.includes(ext.id) ? 'bg-[#2B7FFF] border-[#2B7FFF]' : 'border-slate-300'
                                            }`}>
                                                {draftConfig.balconies.includes(ext.id) && <Check className="w-3 h-3 text-white stroke-[4]" />}
                                            </div>
                                            <span className="text-xs font-bold">{ext.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sticky Bottom Actions */}
                            <div className="space-y-6 pt-4">
                                <div className="p-8 bg-slate-50/80 backdrop-blur-sm rounded-[32px] border border-slate-100">
                                    <p className="text-[12px] text-slate-400 leading-relaxed font-medium italic text-center">
                                        Exterior finishes, interior colors, and furniture packages are customizable later in Design Studio.
                                    </p>
                                </div>

                                <button 
                                    onClick={handleConfirm}
                                    className="w-full h-14 bg-[#2B7FFF] text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-[0.98]"
                                >
                                    Confirm & Select Style <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Symmetrical Spacing around Divider (mt-24 mb-24) */}
                    <div className="h-px bg-slate-100 w-full mt-24 mb-24" />

                    {/* Browse other options */}
                    <div className="space-y-12 pb-32">
                        <h4 className="text-2xl font-bold text-slate-900 tracking-tight">Browse other options</h4>
                        <div className="grid grid-cols-2 gap-8">
                            {EXPRESSIONS.filter(e => e.id !== expId).map(other => (
                                <div 
                                    key={other.id}
                                    onClick={() => setSelectedDetailId(other.id)}
                                    className="group cursor-pointer p-6 rounded-[32px] bg-slate-50 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-xl transition-all duration-500 flex items-center gap-8"
                                >
                                    <div className="w-32 h-24 rounded-2xl overflow-hidden bg-slate-200 shrink-0">
                                        <img src={other.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    </div>
                                    <div className="flex-1">
                                        <h5 className="font-bold text-slate-900 text-2xl tracking-tight">{other.name}</h5>
                                        <p className="text-sm text-slate-400 font-medium">{other.subtitle}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-400 group-hover:bg-[#2B7FFF] group-hover:text-white transition-all flex items-center justify-center shrink-0">
                                        <ArrowRight className="w-5 h-5" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Gallery Modal (Thumbnail Carousel) */}
                <AnimatePresence>
                    {showGallery && (
                        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
                            <button 
                                onClick={() => setShowGallery(false)}
                                className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors z-[210] p-4"
                            >
                                <X className="w-10 h-10" />
                            </button>

                            <div className="relative w-full flex-1 flex items-center justify-center px-24 overflow-hidden">
                                <button 
                                    onClick={() => setGalleryIndex(prev => (prev - 1 + galleryImages.length) % galleryImages.length)}
                                    className="absolute left-10 p-5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all"
                                >
                                    <ChevronRight className="w-10 h-10 rotate-180" />
                                </button>
                                
                                <div className="max-w-[1200px] max-h-[75vh] w-full h-full flex items-center justify-center">
                                    <AnimatePresence mode="wait">
                                        <motion.img 
                                            key={galleryIndex}
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 1.02 }}
                                            src={galleryImages[galleryIndex]} 
                                            className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.5)]" 
                                            alt={`Gallery ${galleryIndex}`}
                                        />
                                    </AnimatePresence>
                                </div>

                                <button 
                                    onClick={() => setGalleryIndex(prev => (prev + 1) % galleryImages.length)}
                                    className="absolute right-10 p-5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all"
                                >
                                    <ChevronRight className="w-10 h-10" />
                                </button>
                            </div>

                            <div className="w-full bg-black/80 backdrop-blur-xl border-t border-white/10 h-36 flex items-center justify-center">
                                <div className="flex gap-4 px-12 overflow-x-auto no-scrollbar py-6">
                                    {galleryImages.map((img, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setGalleryIndex(i)}
                                            className={`relative w-28 h-20 rounded-xl overflow-hidden shrink-0 transition-all duration-500 border-2 ${
                                                i === galleryIndex ? 'border-white scale-110 shadow-2xl shadow-white/20' : 'border-transparent opacity-40 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={img} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    // Project Views
    switch (activeTab) {
      case 'overview':
        return (
            <OverviewDashboard 
                onNavigate={setActiveTab} 
                onSystemNavigate={(route) => {
                    if (route === 'models') setViewContext('models');
                    if (route === 'how-it-works') setViewContext('services');
                    if (route === 'earn') setViewContext('financing');
                }}
                currentModel={getDashboardModel()} 
                selections={interiorSelections}
            />
        );
      case 'site':
        return <SiteFeasibility onNavigate={(tab) => {
          setCompletedTabs(prev => new Set(prev).add('site'));
          setActiveTab(tab);
        }} />;
      case 'value':
        return (
            <ValuePlanner 
                onNavigate={(route) => {
                    if (route === 'models') setViewContext('models');
                    if (route === 'how-it-works') setViewContext('services');
                    if (route === 'earn') setViewContext('financing');
                    if (route === 'timeline') setActiveTab('timeline');
                }}
                onComplete={() => {
                    setCompletedTabs(prev => new Set(prev).add('value'));
                }}
            />
        );
      case 'timeline':
        return <TimelinePage />;
      case 'design':
        if (designView === 'interior') {
          return (
            <InteriorStudio 
              onSwitchView={setDesignView}
              onConfirm={(data) => {
                // UPDATE SHARED STATE
                setInteriorSelections(data);
                // Mark design as completed
                setCompletedTabs(prev => new Set(prev).add('design'));
                // DO NOT NAVIGATE OR SWITCH VIEW - User stays here to see 'Saved' feedback
              }}
              onNext={() => {
                setCompletedTabs(prev => new Set(prev).add('design'));
                setActiveTab('value');
              }}
            />
          );
        }

        return (
          <div className="flex-1 flex overflow-hidden bg-white">
            {/* Left Side: 3D Preview */}
            <div className="flex-1 relative bg-slate-50 border-r border-slate-100">
              <SiteVisualizer 
                projectType="detached"
                constraints={{
                  maxCoverage: 1200,
                  setbacks: { side: 4, rear: 10 }
                }}
                mode="design"
                selectedModel={selectedExpression?.toLowerCase() || 'induspod'}
                exteriorMaterial={config.finish}
                // Mock extensions passing
                balconies={config.balconies}
                styleSelected={!!selectedExpression}
                floorPlanSrc={selectedExpression ? EXPRESSIONS.find(e => e.id === selectedExpression)?.floorPlan : undefined}
              />
              
              <div className="absolute top-8 left-8">
                <button 
                  onClick={() => setActiveTab('site')}
                  className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute top-8 right-8">
                <div className="px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-100 rounded-full shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Status</span>
                  <span className="text-xs font-bold text-slate-900">
                    {selectedExpression ? `${selectedExpression} Configuration` : 'Select a Style'}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-[420px] shrink-0 flex flex-col relative h-full bg-white border-l border-slate-200">
              <div className="flex-1 overflow-y-auto no-scrollbar px-8 pt-10 pb-72">
                <header className="mb-8">
                  <PageTitle>Design Studio</PageTitle>
                  <PageSubtitle className="mt-2">Architectural Configuration</PageSubtitle>
                </header>

                <div className="space-y-4">
                  {EXPRESSIONS.map((exp) => {
                    const isActive = selectedExpression === exp.id;
                    return (
                      <div key={exp.id} className="flex flex-col">
                        {/* Redesigned Card with Two Zones */}
                        <div 
                          className={`group w-full rounded-[40px] border-2 transition-all duration-500 overflow-hidden text-left relative bg-white flex flex-col ${
                            isActive 
                              ? 'border-[#2B7FFF] shadow-[0_32px_64px_-12px_rgba(43,127,255,0.15)] scale-[1.01]' 
                              : 'border-transparent shadow-sm hover:border-slate-200'
                          }`}
                        >
                          {/* Zone 1: Main Body (Selection) */}
                          <div 
                            onClick={() => {
                                if (selectedExpression === exp.id) {
                                    setSelectedExpression(null);
                                } else {
                                    setSelectedExpression(exp.id);
                                }
                            }}
                            className="flex flex-col cursor-pointer"
                          >
                            <div className="w-full h-[229px] relative overflow-hidden bg-[#F1F5F9]">
                                <img 
                                  src={exp.image} 
                                  alt={exp.name} 
                                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                                />
                            </div>

                            <div className="p-6 flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[20px] font-bold text-[#0F172B] tracking-[-0.3545px]">{exp.name}</h3>
                                    
                                    {/* Zone 2: Action Icon (Detail View) */}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation(); // Don't trigger selection
                                            setSelectedDetailId(exp.id);
                                        }}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 relative group/btn ${
                                            isActive 
                                              ? 'bg-[#2B7FFF] text-white shadow-[0_4px_12px_rgba(43,127,255,0.3)]' 
                                              : 'bg-[#F8FAFC] text-[#90A1B9] hover:bg-[#2B7FFF] hover:text-white'
                                        }`}
                                    >
                                        {isActive ? (
                                            <Check className="w-4 h-4 stroke-[3]" />
                                        ) : (
                                            <ArrowRight className="w-4 h-4" />
                                        )}
                                        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0F172B] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold uppercase tracking-wider">
                                            View Detail
                                        </span>
                                    </button>
                                </div>

                                <p className="text-[#62748E] text-[14px] leading-[24px] tracking-[-0.2344px] line-clamp-2">
                                    {exp.description}
                                </p>

                                <div className="flex flex-row gap-2 overflow-x-auto no-scrollbar">
                                    {exp.features.map((feat, i) => (
                                        <span key={i} className="inline-flex items-center justify-center text-[10px] font-bold px-4 py-2 rounded-full bg-[#F1F5F9] text-[#62748E] uppercase tracking-[1.3172px] shrink-0">
                                            {feat}
                                        </span>
                                    ))}
                                </div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Configuration (Accordion Behavior) */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-white"
                            >
                              <div className="px-6 py-10 space-y-8">
                                {/* Step 1: Interior Layout */}
                                <div className="space-y-6">
                                  <button 
                                    onClick={() => setExpandedRows(prev => {
                                      const next = new Set(prev);
                                      if (next.has('layout')) next.delete('layout');
                                      else next.add('layout');
                                      return next;
                                    })}
                                    className="w-full flex items-center justify-between py-2 group"
                                  >
                                    <span className="text-[14px] font-bold text-[#0F172B] group-hover:text-[#2B7FFF] transition-colors uppercase tracking-wider">1. Interior Layout</span>
                                    <ChevronRight className={`w-4 h-4 text-[#90A1B9] transition-transform duration-300 ${expandedRows.has('layout') ? 'rotate-90' : ''}`} />
                                  </button>
                                  
                                  <AnimatePresence>
                                    {expandedRows.has('layout') && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-6"
                                      >
                                        <div className="flex gap-2">
                                          {(['1B1B', '2B1B', '2B2B'] as const).map(l => (
                                            <button 
                                              key={l}
                                              onClick={() => setConfig(prev => ({ ...prev, layout: l }))}
                                              className={`flex-1 h-[54px] rounded-[16px] border-2 transition-all font-bold text-[12px] ${
                                                config.layout === l 
                                                  ? 'border-[#2B7FFF] bg-[rgba(43,127,255,0.05)] text-[#2B7FFF]' 
                                                  : 'border-[#F1F5F9] bg-[#F8FAFC] text-[#90A1B9] hover:border-slate-200'
                                              }`}
                                            >
                                              {l} Suite
                                            </button>
                                          ))}
                                        </div>
                                        
                                        {/* Balconies - Reveal only if a layout is selected (it's always selected by default here) */}
                                        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                                          {(['left', 'right'] as const).map(side => (
                                            <button 
                                              key={side}
                                              onClick={() => setConfig(prev => ({
                                                ...prev,
                                                balconies: prev.balconies.includes(side) ? prev.balconies.filter(s => s !== side) : [...prev.balconies, side]
                                              }))}
                                              className={`flex-1 h-[54px] rounded-[16px] border-2 transition-all font-bold text-[11px] flex items-center justify-center gap-2 ${
                                                config.balconies.includes(side) 
                                                  ? 'border-[#2B7FFF] bg-[rgba(43,127,255,0.05)] text-[#2B7FFF]' 
                                                  : 'border-[#F1F5F9] bg-[#F8FAFC] text-[#90A1B9] hover:border-slate-200'
                                              }`}
                                            >
                                              {config.balconies.includes(side) ? (
                                                <div className="w-4 h-4 rounded-full bg-[#2B7FFF] flex items-center justify-center">
                                                    <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
                                                </div>
                                              ) : (
                                                <div className="w-4 h-4 rounded-full border border-[#90A1B9]" />
                                              )}
                                              {side === 'left' ? 'Left Balcony' : 'Right Balcony'}
                                            </button>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                <div className="h-px bg-[#F1F5F9] w-full" />

                                {/* Step 2: Exterior Finish */}
                                <div className="space-y-6">
                                  <button 
                                    onClick={() => setExpandedRows(prev => {
                                      const next = new Set(prev);
                                      if (next.has('finish')) next.delete('finish');
                                      else next.add('finish');
                                      return next;
                                    })}
                                    className="w-full flex items-center justify-between py-2 group"
                                  >
                                    <span className="text-[14px] font-bold text-[#0F172B] group-hover:text-[#2B7FFF] transition-colors uppercase tracking-wider">2. Exterior Finish</span>
                                    <ChevronRight className={`w-4 h-4 text-[#90A1B9] transition-transform duration-300 ${expandedRows.has('finish') ? 'rotate-90' : ''}`} />
                                  </button>

                                  <AnimatePresence>
                                    {expandedRows.has('finish') && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="grid grid-cols-2 gap-4 pb-2">
                                            {[
                                                { id: 'siding-white', name: 'Classic Siding', color: '#ffffff' },
                                                { id: 'timber', name: 'Nordic Timber', color: '#d4c5b1' },
                                                { id: 'siding-grey', name: 'Slate Siding', color: '#64748b' },
                                                { id: 'stucco-white', name: 'Modern Stucco', color: '#f1f5f9' },
                                            ].map((f) => (
                                                <button
                                                    key={f.id}
                                                    onClick={() => setConfig(prev => ({ ...prev, finish: f.id }))}
                                                    className={`p-4 rounded-[20px] border-2 transition-all flex items-center gap-3 ${
                                                        config.finish === f.id 
                                                            ? 'border-[#2B7FFF] bg-[rgba(43,127,255,0.05)] text-[#2B7FFF]' 
                                                            : 'border-[#F1F5F9] bg-[#F8FAFC] text-[#90A1B9] hover:border-slate-200'
                                                    }`}
                                                >
                                                    <div 
                                                        className="w-10 h-10 rounded-full border border-slate-200 shadow-sm shrink-0" 
                                                        style={{ backgroundColor: f.color }} 
                                                    />
                                                    <span className={`text-[12px] font-bold ${config.finish === f.id ? 'text-[#2B7FFF]' : 'text-[#62748E]'}`}>
                                                        {f.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Persistent CTAs */}
              <div className="absolute bottom-0 left-0 right-0 px-8 py-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 space-y-3">
                <button 
                  onClick={() => setDesignView('interior')}
                  className="w-full h-12 bg-[#2B7FFF] text-white rounded-xl font-medium text-[14px] flex items-center justify-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
                >
                  Continue to Interior <ArrowRight className="w-4 h-4" />
                </button>
                <button className="w-full h-10 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-[0.98]">
                  <Save className="w-3.5 h-3.5" /> Save Progress
                </button>
              </div>
            </div>

            {/* Detail View Overlay */}
            <AnimatePresence>
                {selectedDetailId && (
                    <ExpressionDetailView 
                        expId={selectedDetailId} 
                        onClose={() => setSelectedDetailId(null)} 
                    />
                )}
            </AnimatePresence>
          </div>
        );
      default:
        return null;
    }
  };

  const projectTabs = [
    { id: 'site', label: 'Site & Feasibility', status: completedTabs.has('site') ? 'completed' : 'empty' },
    { id: 'design', label: 'Design', status: completedTabs.has('design') ? 'completed' : completedTabs.has('site') ? 'empty' : 'disabled' },
    { id: 'value', label: 'Financial Terms', status: completedTabs.has('value') ? 'completed' : completedTabs.has('design') ? 'empty' : 'disabled' },
    { id: 'timeline', label: 'Project Execution', status: completedTabs.has('value') ? 'empty' : 'disabled' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
       {/* Global Header */}
       <GlobalHeader 
         mode="studio"
         theme="light"
         activeTab={viewContext === 'project' ? activeTab : ''}
         projectTabs={viewContext === 'project' ? (projectTabs as any) : undefined}
         onTabChange={(tab) => {
           // Handle Project Tabs
           if (['overview', 'site', 'design', 'value', 'permitting', 'timeline'].includes(tab)) {
             setViewContext('project');
             setActiveTab(tab as any);
             return;
           }
           
           // Handle System Tabs (from Avatar Menu)
           if (tab === 'models') setViewContext('models');
           if (tab === 'how-it-works') setViewContext('services');
           if (tab === 'earn') setViewContext('financing'); 
           if (tab === 'project') setViewContext('project'); // Back to Project
           if (tab === 'overview') {
               setViewContext('project');
               setActiveTab('overview');
           }
         }}
         isAuthenticated={true}
         onSignOut={onSignOut}
         user={{ name: 'Alex Chen', initials: 'AC' }}
         language={language}
         onLanguageChange={setLanguage}
         onLogoClick={() => {
             setViewContext('project');
             setActiveTab('overview');
         }}
         className="shrink-0"
       />
       
       {/* Main Content Area */}
       <div className="flex-1 overflow-hidden relative flex flex-col pt-[72px]">
           {renderContent()}
       </div>
    </div>
  );
}