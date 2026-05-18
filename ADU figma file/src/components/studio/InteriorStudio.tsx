import React, { useState, useMemo } from 'react';
import { 
  Sofa, 
  BedDouble, 
  Bath, 
  Utensils, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Palette,
  Check,
  ChevronDown,
  Wind
} from 'lucide-react';
import { toast } from "sonner@2.0.3";
import { motion, AnimatePresence } from 'motion/react';
import livingRoomImg from 'figma:asset/28ca59e6c351f36d28d3cd04d64dd861745af86c.png';
import bathRoomImg from 'figma:asset/761d509c42fba12639177161f9c3f7fa63113673.png';
import kitchenImg from 'figma:asset/4d957f1516e553d962a926de9b62d7a4b202523e.png';
import bedroomImg from 'figma:asset/7ba2255dfa6d72360708dafd86aed5faf852b4a5.png';

// --- Types ---
type Room = 'living' | 'kitchen' | 'bedroom' | 'bathroom';
type FurnitureCategory = 'All package' | 'Outdoors' | 'Bathroom' | 'Bedroom' | 'Living Room';
type StyleFilter = 'Traditional style' | 'Modern Rustic Style' | 'Minimalist Style';

interface InteriorStudioProps {
  onSwitchView: (mode: 'exterior' | 'interior') => void;
  onConfirm: (data: { totalPrice: number; selections: any; furniture: any }) => void;
  onNext?: () => void;
}

// --- Data ---
const roomImages: Record<Room, string> = {
  living: livingRoomImg,
  kitchen: kitchenImg,
  bedroom: bedroomImg,
  bathroom: bathRoomImg
};

const hardFinishes = {
  flooring: [
    { id: 'oak', name: 'LVP Oak', price: 0, color: 'bg-[#E3D9C6]' },
    { id: 'concrete', name: 'Polished Concrete', price: 1200, color: 'bg-[#9ca3af]' },
    { id: 'walnut', name: 'Eng. Walnut', price: 2400, color: 'bg-[#5D4037]' },
  ],
  cabinets: [
    { id: 'white', name: 'Matte White', price: 0, color: 'bg-slate-100' },
    { id: 'ash', name: 'Light Ash', price: 0, color: 'bg-[#E3D9C6]' },
    { id: 'navy', name: 'Midnight Blue', price: 1500, color: 'bg-[#1e3a8a]' },
  ]
};

const furniturePackages = [
  { id: 'out-1', name: 'Patio Essence', category: 'Outdoors', style: 'Modern Rustic Style', price: 4500, image: 'https://images.unsplash.com/photo-1768527339600-3127e34acdad?auto=format&fit=crop&w=800&q=80', items: ['Lounge Sofa', 'Fire Pit', 'Teak Table'] },
  { id: 'bath-1', name: 'Spa Serenity', category: 'Bathroom', style: 'Minimalist Style', price: 3200, image: 'https://images.unsplash.com/photo-1621215058889-885f3d5a143c?auto=format&fit=crop&w=800&q=80', items: ['Floating Vanity', 'LED Mirror', 'Bamboo Shelf'] },
  { id: 'bed-1', name: 'Scandi Dream', category: 'Bedroom', style: 'Minimalist Style', price: 5800, image: 'https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fit=crop&w=800&q=80', items: ['Platform Bed', 'Nightstands', 'Minimal Rug'] },
  { id: 'liv-1', name: 'Heritage Living', category: 'Living Room', style: 'Traditional style', price: 7500, image: 'https://images.unsplash.com/photo-1768346564414-3e1ffb751e30?auto=format&fit=crop&w=800&q=80', items: ['Chesterfield Sofa', 'Oak Hutch', 'Classic Rug'] },
  { id: 'liv-2', name: 'Modern Hearth', category: 'Living Room', style: 'Modern Rustic Style', price: 6800, image: 'https://images.unsplash.com/photo-1763827657709-b1bbc3c4945b?auto=format&fit=crop&w=800&q=80', items: ['Linen Sectional', 'Reclaimed Coffee Table', 'Wool Throw'] },
  { id: 'liv-3', name: 'Zen Lounge', category: 'Living Room', style: 'Minimalist Style', price: 5200, image: 'https://images.unsplash.com/photo-1760611656233-915efdf138b1?auto=format&fit=crop&w=800&q=80', items: ['Low Profile Chair', 'Glass Side Table', 'Silent Decor'] },
];

const categories: {id: FurnitureCategory, label: string}[] = [
  { id: 'All package', label: 'All package' },
  { id: 'Outdoors', label: 'Outdoors' },
  { id: 'Bathroom', label: 'Bathroom' },
  { id: 'Bedroom', label: 'Bedroom' },
  { id: 'Living Room', label: 'Living Room' }
];
const stylesList: {id: StyleFilter, label: string}[] = [
  { id: 'Traditional' as any, label: 'Traditional' },
  { id: 'Modern' as any, label: 'Modern' },
  { id: 'Minimalist' as any, label: 'Minimalist' }
];

export function InteriorStudio({ onSwitchView, onConfirm, onNext }: InteriorStudioProps) {
  const [focusedRoom, setFocusedRoom] = useState<Room>('living');
  const [selections, setSelections] = useState({
    flooring: 'oak',
    cabinets: 'white',
    countertop: 'laminate'
  });
  
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('All package');
  const [activeStyle, setActiveStyle] = useState<StyleFilter | null>(null);
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const basePrice = 185000;
  const finishPrice = 
    (hardFinishes.flooring.find(f => f.id === selections.flooring)?.price || 0) +
    (hardFinishes.cabinets.find(f => f.id === selections.cabinets)?.price || 0);

  const filteredFurniture = useMemo(() => {
    return furniturePackages.filter(p => {
      const catMatch = activeCategory === 'All package' || p.category === activeCategory;
      const styleMatch = !activeStyle || p.style === activeStyle;
      return catMatch && styleMatch;
    });
  }, [activeCategory, activeStyle]);

  const furniturePrice = selectedFurniture 
    ? (furniturePackages.find(p => p.id === selectedFurniture)?.price || 0)
    : 0;

  const upgradePrice = finishPrice + furniturePrice;
  const totalPrice = basePrice + upgradePrice;

  return (
    <div className="flex w-full h-full bg-white relative font-sans overflow-hidden">
      
      {/* --- LEFT CANVAS: FIGMA REPLICA --- */}
      <div className="flex-1 relative bg-[#F1F5F9] overflow-hidden flex flex-col">
        
        {/* Figma Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-center z-20 pointer-events-none">
          {/* Back Button - Exactly as Figma */}
          <button 
            onClick={() => onSwitchView('exterior')}
            className="pointer-events-auto bg-[rgba(255,255,255,0.9)] hover:bg-white text-[#314158] px-6 py-2 rounded-[10px] text-[12px] font-bold uppercase tracking-[0.6px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] border border-[rgba(226,232,240,0.5)] flex items-center gap-2 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" /> Exterior View
          </button>

          {/* Room Indicator - Exactly as Figma */}
          <div className="pointer-events-auto bg-[rgba(15,23,43,0.8)] backdrop-blur-xl px-6 py-2 rounded-full flex items-center gap-3 border border-[rgba(255,255,255,0.1)] shadow-2xl">
            <div className="w-2 h-2 bg-[#00d492] rounded-full animate-pulse shadow-[0_0_8px_#00d492]" />
            <span className="text-white text-[12px] font-bold uppercase tracking-[1.2px]">Viewing: {focusedRoom}</span>
          </div>
        </div>

        {/* Main View Transition */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={focusedRoom}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 z-0"
          >
             <img src={roomImages[focusedRoom]} className="w-full h-full object-cover" />
             <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,23,43,0.4)] via-transparent to-transparent opacity-60" />
          </motion.div>
        </AnimatePresence>

        {/* Bottom UI Row - Exactly as Figma */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center items-end px-12 z-20">
           {/* Room Navigation Pill */}
           <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-1.5 flex items-center gap-1 shadow-2xl shadow-[#0F172B]/10">
              {[
                { id: 'living', label: 'Living', icon: Sofa },
                { id: 'kitchen', label: 'Kitchen', icon: Utensils },
                { id: 'bedroom', label: 'Bedroom', icon: BedDouble },
                { id: 'bathroom', label: 'Bath', icon: Bath }
              ].map((room) => (
                <button 
                   key={room.id}
                   onClick={() => setFocusedRoom(room.id as any)}
                   className={`px-8 py-3 rounded-[14px] text-[12px] font-bold uppercase tracking-[0.6px] flex items-center gap-2.5 transition-all ${
                      focusedRoom === room.id 
                        ? 'bg-[#2B7FFF] text-white shadow-xl shadow-blue-100' 
                        : 'text-[#62748E] hover:text-[#0F172B] hover:bg-slate-50'
                   }`}
                >
                   <room.icon className="w-4 h-4" />
                   {room.label}
                </button>
              ))}
           </div>

           {/* Minimap - Exactly as Figma */}
           <div className="absolute right-12 bottom-0 bg-white/95 backdrop-blur-xl p-4 rounded-[20px] shadow-2xl border border-[#E2E8F0] w-[146px]">
              <div className="text-[10px] font-bold text-[#90A1B9] uppercase tracking-[1.1px] mb-3 text-center">Plan Map</div>
              <div className="relative h-[80px] w-full rounded-lg overflow-hidden shadow-inner">
                  {/* Living */}
                  <div 
                    onClick={() => setFocusedRoom('living')}
                    className={`absolute left-0 top-0 w-[60%] h-full transition-colors duration-500 cursor-pointer ${focusedRoom === 'living' || focusedRoom === 'kitchen' ? 'bg-[#2B7FFF]' : 'bg-[#CBD5E1]'}`} 
                  />
                  {/* Bedroom */}
                  <div 
                    onClick={() => setFocusedRoom('bedroom')}
                    className={`absolute right-0 top-0 w-[38%] h-[62%] transition-colors duration-500 cursor-pointer ${focusedRoom === 'bedroom' ? 'bg-[#2B7FFF]' : 'bg-[#CBD5E1]'}`} 
                  />
                  {/* Bath */}
                  <div 
                    onClick={() => setFocusedRoom('bathroom')}
                    className={`absolute right-0 bottom-0 w-[38%] h-[35%] transition-colors duration-500 cursor-pointer ${focusedRoom === 'bathroom' ? 'bg-[#2B7FFF]' : 'bg-[#CBD5E1]'}`} 
                  />
              </div>
           </div>
        </div>
      </div>

      {/* --- RIGHT PANEL: CONFIGURATION --- */}
      <div className="w-[460px] bg-white border-l border-slate-100 flex flex-col z-30 shadow-2xl">
        
        {/* Header Section */}
        <div className="px-10 pt-10 pb-8 border-b border-slate-100">
           <div className="flex justify-between items-start mb-3">
              <h2 className="text-2xl font-bold text-[#0F172B] tracking-tight">Interior Studio</h2>
           </div>
           <p className="text-[14px] text-slate-500 leading-relaxed mb-6">Customize your modular interior with designer-selected finishes and furnishings.</p>
           
           {/* Price Breakdown */}
           <div className="bg-slate-50/80 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                 <span className="text-[13px] text-slate-500">Base Construction</span>
                 <span className="text-[13px] text-slate-700 font-semibold tabular-nums">${basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-[13px] text-slate-500">Selected Upgrades</span>
                 <span className={`text-[13px] font-semibold tabular-nums ${upgradePrice > 0 ? 'text-[#2B7FFF]' : 'text-slate-400'}`}>
                    {upgradePrice > 0 ? `+$${upgradePrice.toLocaleString()}` : '$0'}
                 </span>
              </div>
              <div className="border-t border-slate-200/80 pt-3 flex justify-between items-center">
                 <span className="text-[13px] text-[#0F172B] font-bold">Total</span>
                 <span className="text-[20px] text-[#0F172B] font-bold tabular-nums">${totalPrice.toLocaleString()}</span>
              </div>
           </div>
        </div>

        {/* Configuration Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
           <div className="p-10 space-y-12">
              
              {/* --- SECTION 1: MATERIALS --- */}
              <section>
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full bg-[#0F172B] text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-slate-200">1</div>
                    <div>
                       <h3 className="text-[15px] font-bold text-[#0F172B] uppercase tracking-wide">Premium Finishes</h3>
                       <div className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full inline-block mt-1.5 uppercase tracking-widest border border-emerald-100">Standard for ADU</div>
                    </div>
                 </div>

                 <div className="space-y-10 pl-5 border-l-2 border-slate-50 ml-5">
                    {/* Flooring */}
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Flooring System</label>
                          <span className="text-[12px] font-bold text-[#2B7FFF]">{hardFinishes.flooring.find(f => f.id === selections.flooring)?.name}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-3">
                          {hardFinishes.flooring.map((opt) => (
                             <button
                                key={opt.id}
                                onClick={() => setSelections({...selections, flooring: opt.id})}
                                className={`flex flex-col gap-2 p-2 rounded-[18px] border-2 transition-all ${
                                   selections.flooring === opt.id 
                                     ? 'border-[#2B7FFF] bg-blue-50/20' 
                                     : 'border-slate-50 bg-white hover:border-slate-200'
                                }`}
                             >
                                <div className={`w-full aspect-square rounded-[14px] shadow-inner ${opt.color}`} />
                                <div className="px-1 py-1">
                                    <div className="text-[10px] font-bold text-[#0F172B] truncate">{opt.name}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        {opt.price === 0 ? 'Inc' : `+$${opt.price}`}
                                    </div>
                                </div>
                             </button>
                          ))}
                       </div>
                    </div>

                    {/* Cabinets */}
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kitchen Millwork</label>
                          <span className="text-[12px] font-bold text-[#2B7FFF]">{hardFinishes.cabinets.find(f => f.id === selections.cabinets)?.name}</span>
                       </div>
                       <div className="grid grid-cols-3 gap-3">
                          {hardFinishes.cabinets.map((opt) => (
                             <button
                                key={opt.id}
                                onClick={() => setSelections({...selections, cabinets: opt.id})}
                                className={`flex flex-col gap-2 p-2 rounded-[18px] border-2 transition-all ${
                                   selections.cabinets === opt.id 
                                     ? 'border-[#2B7FFF] bg-blue-50/20' 
                                     : 'border-slate-50 bg-white hover:border-slate-200'
                                }`}
                             >
                                <div className={`w-full aspect-square rounded-[14px] shadow-inner ${opt.color}`} />
                                <div className="px-1 py-1">
                                    <div className="text-[10px] font-bold text-[#0F172B] truncate">{opt.name}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        {opt.price === 0 ? 'Inc' : `+$${opt.price}`}
                                    </div>
                                </div>
                             </button>
                          ))}
                       </div>
                    </div>
                 </div>
              </section>

              {/* --- SECTION 2: FURNITURE (XHOMES STYLE) --- */}
              <section>
                 <div className="flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center text-sm font-bold border border-slate-100">2</div>
                    <div>
                       <h3 className="text-[15px] font-bold text-[#0F172B] uppercase tracking-wide">Furniture Packages</h3>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 tracking-widest">Designer Selected · Ready to Ship</p>
                    </div>
                 </div>

                 <div className="space-y-8 pl-5 border-l-2 border-slate-50 ml-5">
                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2.5">
                       {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-6 py-2.5 rounded-full text-[12px] font-bold transition-all border ${
                                activeCategory === cat.id 
                                  ? 'bg-[#0F172B] text-white border-[#0F172B] shadow-[0_10px_20px_rgba(15,23,43,0.15)]' 
                                  : 'bg-white text-[#90A1B9] border-[#F1F5F9] hover:border-slate-200 hover:text-slate-600'
                            }`}
                          >
                             {cat.label}
                          </button>
                       ))}
                    </div>

                    {/* Style Filter buttons */}
                    <div className="relative">
                       <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Design Style</label>
                       <div className="flex flex-wrap gap-2.5">
                          {stylesList.map(style => (
                              <button 
                                key={style.id}
                                onClick={() => setActiveStyle(activeStyle === style.id ? null : style.id)}
                                className={`px-6 py-2.5 rounded-full text-[12px] font-bold transition-all border ${
                                    activeStyle === style.id 
                                    ? 'bg-[#0F172B] text-white border-[#0F172B] shadow-[0_10px_20px_rgba(15,23,43,0.15)]' 
                                    : 'bg-white text-[#90A1B9] border-[#F1F5F9] hover:border-slate-200 hover:text-slate-600'
                                }`}
                              >
                                  {style.label}
                              </button>
                          ))}
                       </div>
                    </div>

                    {/* Unfurnished Selection */}
                    <button
                        onClick={() => setSelectedFurniture(null)}
                        className={`w-full p-6 rounded-[28px] border-2 text-left transition-all relative ${
                            selectedFurniture === null
                                ? 'border-[#2B7FFF] bg-[rgba(43,127,255,0.05)] shadow-sm'
                                : 'border-slate-50 bg-white hover:border-slate-200'
                        }`}
                    >
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-[14px] text-[#0F172B]">Unfurnished Base</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Included</span>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedFurniture === null ? 'bg-[#2B7FFF] border-[#2B7FFF]' : 'border-slate-200'}`}>
                                    {selectedFurniture === null && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Dynamic Packages List */}
                    <div className="grid grid-cols-1 gap-4">
                       {filteredFurniture.map((pkg) => (
                          <button
                             key={pkg.id}
                             onClick={() => setSelectedFurniture(pkg.id)}
                             className={`group relative rounded-[32px] border-2 overflow-hidden text-left transition-all duration-500 bg-white ${
                                selectedFurniture === pkg.id 
                                  ? 'border-[#2B7FFF] shadow-2xl shadow-blue-100/50' 
                                  : 'border-slate-50 hover:border-slate-200 hover:shadow-xl'
                             }`}
                          >
                             <div className="h-[200px] w-full relative">
                                <img src={pkg.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                <div className="absolute bottom-5 left-6 right-6 flex justify-between items-end">
                                    <div>
                                        <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">{pkg.style}</div>
                                        <h4 className="font-bold text-white text-[20px] tracking-tight">{pkg.name}</h4>
                                    </div>
                                    <div className="text-white font-bold text-xl tracking-tight">+${pkg.price.toLocaleString()}</div>
                                </div>
                             </div>
                             <div className="p-6 flex flex-wrap gap-2">
                                {pkg.items.map((item, i) => (
                                   <span key={i} className="px-3.5 py-1.5 bg-slate-50 text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider border border-slate-100">
                                      {item}
                                   </span>
                                ))}
                             </div>
                             {selectedFurniture === pkg.id && (
                                <div className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#2B7FFF] text-white flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                                   <Check className="w-4 h-4 text-white stroke-[4]" />
                                </div>
                             )}
                          </button>
                       ))}
                       {filteredFurniture.length === 0 && (
                           <div className="py-12 text-center bg-slate-50 rounded-[24px] border-2 border-dashed border-slate-200">
                               <p className="text-slate-400 text-sm font-medium">No packages match your filters.</p>
                               <button onClick={() => {setActiveCategory('All package'); setActiveStyle(null);}} className="text-[#2B7FFF] text-[11px] font-bold uppercase mt-2">Clear filters</button>
                           </div>
                       )}
                    </div>
                 </div>
              </section>

           </div>
        </div>
        
        {/* Sticky Footer */}
        <div className="p-10 border-t border-slate-100 bg-white">
           <div className="flex gap-3">
             <button 
               onClick={() => {
                 setIsSaving(true);
                 onConfirm({
                   totalPrice,
                   selections: { ...selections },
                   furniture: { id: selectedFurniture }
                 });
                 setTimeout(() => {
                   setIsSaving(false);
                   toast.success("Selections saved to Dashboard");
                 }, 800);
               }}
               disabled={isSaving}
               className={`flex-1 py-5 text-white font-bold rounded-[22px] shadow-2xl transition-all active:scale-[0.98] group flex items-center justify-center gap-3 ${
                 isSaving ? 'bg-emerald-500 shadow-emerald-100' : 'bg-[#2B7FFF] hover:bg-blue-600 shadow-blue-200'
               }`}
             >
                {isSaving ? (
                  <>Saved Successfully <Check className="w-5 h-5" /></>
                ) : (
                  <>Confirm Selection <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /> </>
                )}
             </button>
             {onNext && (
               <button
                 onClick={onNext}
                 className="px-6 py-5 bg-slate-900 text-white font-bold rounded-[22px] shadow-lg transition-all active:scale-[0.98] hover:bg-slate-800 flex items-center justify-center gap-2 shrink-0"
               >
                 Next <ArrowRight className="w-4 h-4" />
               </button>
             )}
           </div>
        </div>

      </div>
    </div>
  );
}