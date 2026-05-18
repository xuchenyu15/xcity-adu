import React, { useState } from 'react';
import { Check, ArrowRight, Info, Package, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const furniturePackages = [
  {
    id: 'minimal',
    name: 'Essence',
    tagline: 'Pure function. Zero noise.',
    price: '$12,500',
    description: 'A curated collection of essential pieces. Clean lines, neutral tones, and space-saving utility. Designed for the modern minimalist.',
    items: ['Modular Sofa System', 'Floating Media Unit', 'Compact Dining Set', 'Queen Memory Foam Bed'],
    image: 'https://images.unsplash.com/photo-1585865173329-2d15a94195b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FuZGluYXZpYW4lMjBpbnRlcmlvciUyMGRlc2lnbiUyMGJyaWdodCUyMHdvb2QlMjBmdXJuaXR1cmV8ZW58MXx8fHwxNzY3NDA2MTYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    colors: ['#F5F5F5', '#D4D4D4', '#A3A3A3']
  },
  {
    id: 'executive',
    name: 'Carbon',
    tagline: 'Dark tones. Premium textures.',
    price: '$18,500',
    description: 'High-contrast design with matte black finishes, walnut accents, and premium leather. The ultimate executive suite aesthetic.',
    items: ['Leather Lounge Chair', 'Walnut Workstation', 'Smart Lighting Integration', 'King Hybrid Mattress'],
    image: 'https://images.unsplash.com/photo-1765766601592-ac2936aa87e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBkYXJrJTIwbWluaW1hbGlzdCUyMGxpdmluZyUyMHJvb20lMjBmdXJuaXR1cmV8ZW58MXx8fHwxNzY3NDA2MTYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    colors: ['#171717', '#404040', '#737373']
  },
  {
    id: 'industrial',
    name: 'Foundry',
    tagline: 'Raw materials. Urban edge.',
    price: '$15,000',
    description: 'An industrial blend of raw steel, concrete textures, and distressed textiles. Built for durability and character.',
    items: ['Steel Frame Bed', 'Concrete Coffee Table', 'Canvas Sectional', 'Industrial Shelving'],
    image: 'https://images.unsplash.com/photo-1583764819324-faadb5e3acb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwbG9mdCUyMGludGVyaW9yJTIwZGVzaWduJTIwZGFyayUyMGNvbmNyZXRlJTIwZnVybml0dXJlfGVufDF8fHx8MTc2NzQwNjE2M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    colors: ['#525252', '#78716C', '#A8A29E']
  }
];

export function FurnitureSelector({ embedded = false }: { embedded?: boolean }) {
  const [selectedPkg, setSelectedPkg] = useState<string>('executive');
  const [category, setCategory] = useState<string>('packages');

  const categories = [
    { id: 'packages', label: 'Packages' },
    { id: 'living', label: 'Living' },
    { id: 'bedroom', label: 'Bedroom' },
    { id: 'workspace', label: 'Workspace' }
  ];

  return (
    <div className={`${embedded ? 'h-full' : 'py-24'} bg-slate-950 relative overflow-hidden flex flex-col`}>
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className={`container mx-auto px-4 max-w-7xl flex-1 flex flex-col ${embedded ? 'py-8' : ''}`}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="max-w-2xl">
            <span className="inline-block bg-slate-900 text-slate-400 border border-slate-800 px-3 py-1 mb-6 text-xs font-bold tracking-widest uppercase rounded-full">
              Interior Config
            </span>
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
              Furniture <span className="text-blue-500">Selection</span>
            </h2>
            <p className="text-slate-400 text-lg font-light">
              Turn-key interior solutions. Delivered and installed on day one.
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
             <Package className="w-4 h-4" />
             <span>All packages include delivery & assembly</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-12 gap-8 flex-1">
          
          {/* Selection List */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar mask-gradient-right">
              {categories.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`
                    px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border
                    ${category === cat.id 
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30' 
                      : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'}
                  `}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar max-h-[600px]">
            {furniturePackages.map((pkg) => {
              // Simple mock filtering logic - in a real app this would filter by category
              if (category !== 'packages' && category !== 'living') return null;
              
              return (
              <button
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg.id)}
                className={`w-full group relative overflow-hidden rounded-2xl border transition-all duration-300 text-left p-6
                  ${selectedPkg === pkg.id 
                    ? 'bg-slate-900 border-blue-500/50 shadow-xl shadow-blue-900/10' 
                    : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'
                  }
                `}
              >
                <div className="relative z-10 flex justify-between items-start mb-2">
                  <div>
                    <h3 className={`text-xl font-bold mb-1 ${selectedPkg === pkg.id ? 'text-white' : 'text-slate-300'}`}>
                      {pkg.name}
                    </h3>
                    <p className="text-xs font-mono text-blue-500 uppercase tracking-wider">{pkg.tagline}</p>
                  </div>
                  <div className={`text-lg font-bold ${selectedPkg === pkg.id ? 'text-white' : 'text-slate-500'}`}>
                    {pkg.price}
                  </div>
                </div>
                
                <div className="relative z-10 mt-4 flex items-center gap-2">
                   {pkg.colors.map((color, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-slate-700" style={{ backgroundColor: color }} />
                   ))}
                </div>

                {/* Active Indicator */}
                {selectedPkg === pkg.id && (
                  <motion.div 
                    layoutId="active-pkg-glow"
                    className="absolute inset-0 bg-blue-500/5"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </button>
              );
            })}
            
            {category !== 'packages' && (
               <div className="p-8 text-center border border-slate-800 border-dashed rounded-2xl">
                  <p className="text-slate-500 text-sm mb-2">More {category} items coming soon.</p>
                  <button onClick={() => setCategory('packages')} className="text-blue-500 hover:text-blue-400 text-sm font-bold">
                    Back to Packages
                  </button>
               </div>
            )}

            <div className="p-6 rounded-2xl border border-slate-800 border-dashed bg-slate-900/20 text-center">
              <p className="text-slate-500 text-sm mb-2">Want to bring your own?</p>
              <button className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
                Skip Furniture Selection
              </button>
            </div>
          </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-8 relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800">
             <AnimatePresence mode="wait">
                {(() => {
                   const pkg = furniturePackages.find(p => p.id === selectedPkg);
                   if (!pkg) return null;
                   return (
                      <motion.div 
                        key={pkg.id}
                        className="absolute inset-0 flex flex-col"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                         {/* Image */}
                         <div className="relative h-2/3 w-full overflow-hidden">
                            <img 
                              src={pkg.image} 
                              alt={pkg.name} 
                              className="w-full h-full object-cover transition-transform duration-10000 ease-linear hover:scale-110" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90" />
                            
                            <div className="absolute bottom-6 left-6 right-6">
                               <p className="text-lg text-slate-200 max-w-xl leading-relaxed">
                                  {pkg.description}
                               </p>
                            </div>
                         </div>

                         {/* Items List */}
                         <div className="flex-1 p-8 bg-slate-900">
                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Package Includes</h4>
                            <div className="grid grid-cols-2 gap-4">
                               {pkg.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                                     <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Check className="w-3 h-3 text-blue-500" />
                                     </div>
                                     <span className="text-slate-300 text-sm">{item}</span>
                                  </div>
                               ))}
                            </div>
                            
                            <div className="mt-8 flex justify-end">
                               <button className="flex items-center gap-2 px-8 py-3 bg-white text-slate-950 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95">
                                  Add Package
                                  <ArrowRight className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                      </motion.div>
                   );
                })()}
             </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}