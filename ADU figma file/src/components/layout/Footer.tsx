import React from 'react';
import { Cloud, Twitter, Instagram, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-2xl text-slate-800">
              <div className="bg-sky-50 border border-sky-100 text-sky-600 p-2 rounded-xl">
                <Cloud className="h-5 w-5" />
              </div>
              <span className="font-sans tracking-tight">X<span className="text-sky-500">Homes</span>.ai</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">
              Redefining architecture with light, air, and intelligent design.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div>
              <h4 className="font-bold text-slate-800 mb-4">Collection</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><a href="#" className="hover:text-sky-600 transition-colors">The Horizon</a></li>
                <li><a href="#" className="hover:text-sky-600 transition-colors">The Prism</a></li>
                <li><a href="#" className="hover:text-sky-600 transition-colors">The Cloud</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-slate-500">
                <li><a href="#" className="hover:text-sky-600 transition-colors">Manifesto</a></li>
                <li><a href="#" className="hover:text-sky-600 transition-colors">Technology</a></li>
                <li><a href="#" className="hover:text-sky-600 transition-colors">Careers</a></li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <h4 className="font-bold text-slate-800 mb-4">Follow Us</h4>
              <div className="flex gap-3">
                <a href="#" className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="#" className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-12 mt-12 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-medium">
          <p>
            © 2025 XHomes Inc. All rights reserved.
          </p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-slate-600">Privacy Policy</a>
            <a href="#" className="hover:text-slate-600">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
