import React from 'react';
import { MousePointer, ClipboardCheck, Truck, Key } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Select Online',
    description: 'Browse our ADU catalog and choose the model that fits your backyard and budget.',
    icon: MousePointer,
  },
  {
    id: 2,
    title: 'Submit Application',
    description: 'Fill out our simple online form. We instantly check zoning and financing eligibility.',
    icon: ClipboardCheck,
  },
  {
    id: 3,
    title: 'Build & Deliver',
    description: 'Your ADU is built off-site by XHouse while we handle site prep and permits.',
    icon: Truck,
  },
  {
    id: 4,
    title: 'Move In',
    description: 'Installation takes just 1-2 days. You get the keys to your new space.',
    icon: Key,
  }
];

export function Process() {
  return (
    <section id="process" className="py-24 bg-sky-50/50 scroll-mt-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Online Application Process</h2>
          <p className="text-lg text-slate-500 font-light">
            We've digitized the construction process. Go from selection to installation in 4 easy steps.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.id} className="relative group">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-14 left-1/2 w-full h-0.5 bg-sky-100 z-0"></div>
              )}
              
              <div className="relative z-10 h-full bg-white rounded-3xl p-8 shadow-sm border border-sky-50 hover:shadow-xl hover:shadow-sky-100 hover:-translate-y-1 transition-all duration-300">
                <div className="h-14 w-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-sky-500 group-hover:text-white transition-colors duration-300">
                  <step.icon className="h-7 w-7" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-3 relative z-10">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed relative z-10">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
