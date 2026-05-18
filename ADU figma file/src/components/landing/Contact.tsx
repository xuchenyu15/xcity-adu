import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function Contact() {
  return (
    <section className="py-24 bg-sky-900 relative overflow-hidden scroll-mt-24">
      {/* Background Image Overlay */}
      <div className="absolute inset-0 z-0">
         <img 
            src="https://images.unsplash.com/photo-1648860478702-2ad74aeffd9a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBnbGFzcyUyMGFyY2hpdGVjdHVyZSUyMGJsdWUlMjBza3l8ZW58MXx8fHwxNzY1MjM0NDEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
            alt="Background"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-sky-900 via-sky-900/80 to-sky-900/50 pointer-events-none"></div>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-5xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden shadow-2xl">
            <div className="grid md:grid-cols-2">
              <div className="p-10 md:p-14 text-white flex flex-col justify-between">
                <div>
                  <h2 className="text-4xl font-bold mb-6">Start Your Application</h2>
                  <p className="text-sky-100 text-lg leading-relaxed mb-8">
                    Ready to add an ADU to your property? Submit this preliminary form to check your zoning eligibility instantly.
                  </p>
                  
                  <ul className="space-y-4 text-sky-50">
                    <li className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300">1</div>
                      <span>Select preferred model</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300">2</div>
                      <span>Verify property address</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-300">3</div>
                      <span>Get preliminary quote</span>
                    </li>
                  </ul>
                </div>
                
                <div className="pt-12">
                   <p className="text-sm text-sky-200/60 font-medium">
                     Powered by XHouse AI Technology
                   </p>
                </div>
              </div>

              <div className="p-10 md:p-14 bg-white">
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Full Name</label>
                    <input 
                      placeholder="Enter your name" 
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-slate-800" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Email</label>
                      <input 
                        type="email" 
                        placeholder="Email address" 
                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-slate-800"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Phone</label>
                      <input 
                        type="tel" 
                        placeholder="(555) 000-0000" 
                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Property Address (for zoning check)</label>
                    <input 
                      placeholder="123 Main St, City, State" 
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-slate-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Preferred Model</label>
                    <div className="relative">
                      <select defaultValue="" className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none text-slate-800">
                        <option value="" disabled>Select a model</option>
                        <option value="studio">ADU Studio (350 sqft)</option>
                        <option value="1bed">ADU 1-Bed (600 sqft)</option>
                        <option value="2bed">ADU 2-Bed (950 sqft)</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                         <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-14 rounded-xl shadow-lg shadow-sky-200 mt-2 transition-colors active:scale-95">
                    Submit Application
                  </button>
                </form>
              </div>
            </div>
        </div>
      </div>
    </section>
  );
}
