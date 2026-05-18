import React from 'react';
import { FileCheck, Wallet, HardHat, Key, Layout, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: Layout,
    title: 'Online Design',
    description: 'Select your ADU model and customize finishes directly on our platform.',
  },
  {
    icon: FileCheck,
    title: 'Permit Handling',
    description: 'We handle all city permits and zoning verifications automatically.',
  },
  {
    icon: Wallet,
    title: 'Smart Financing',
    description: 'Integrated loan application with our banking partners for instant rates.',
  },
  {
    icon: HardHat,
    title: 'Precision Build',
    description: 'Off-site construction powered by XHouse tech ensures speed and quality.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-white relative overflow-hidden scroll-mt-24">
      {/* Subtle Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f9ff_1px,transparent_1px),linear-gradient(to_bottom,#f0f9ff_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="inline-block px-4 py-1.5 rounded-full bg-sky-50 text-sky-600 font-bold text-sm mb-6 border border-sky-100">
              One-Stop Service
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 leading-tight">
              We handle the complexity. <br/> You get the <span className="text-sky-500">Keys</span>.
            </h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed font-light">
              Traditional construction is fragmented and stressful. XHomes unifies the entire ADU process into a single digital dashboard. 
              Powered by our deep partnership with XHouse manufacturing.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
               {features.map((feature, idx) => (
                 <div key={idx} className="p-6 rounded-2xl bg-sky-50/50 border border-sky-100 hover:bg-white hover:shadow-lg hover:shadow-sky-100 transition-all duration-300">
                    <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-sky-600">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                 </div>
               ))}
            </div>
          </div>
          
          <div className="relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-sky-200 to-blue-200 rounded-full blur-[100px] opacity-40"></div>
             <div className="relative rounded-[2rem] overflow-hidden shadow-2xl shadow-sky-100 border-4 border-white">
                <img 
                  src="https://images.unsplash.com/photo-1641384687427-1eddc6e75b70?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMG1vZGVybiUyMGJ1aWxkaW5nJTIwYmx1ZSUyMHNreXxlbnwxfHx8fDE3NjUyMzQ0MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                  alt="Modern clean architecture"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
                
                {/* Center Badge */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-md px-8 py-6 rounded-2xl shadow-xl border border-white text-center w-64">
                   <ShieldCheck className="h-10 w-10 text-sky-500 mx-auto mb-2" />
                   <p className="text-slate-800 font-bold text-lg">10-Year Warranty</p>
                   <p className="text-slate-500 text-xs mt-1">Backed by XHouse Technology</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}
