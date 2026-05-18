import React, { useState, useEffect } from 'react';
import { Menu, X, Home } from 'lucide-react';

export function Navbar({ onLogoClick }: { onLogoClick?: () => void }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'ADU Models', href: '#models' },
    { name: 'One-Stop Service', href: '#features' },
    { name: 'How It Works', href: '#process' },
    { name: 'Investment Calculator', href: '#calculator' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-xl border-b border-white/50 py-4 shadow-sm shadow-sky-100/50'
            : 'bg-white/50 backdrop-blur-sm py-6 border-b border-transparent'
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <button 
            onClick={onLogoClick}
            className="flex items-center gap-2 font-bold text-2xl text-slate-800 relative z-50 hover:scale-105 transition-transform active:scale-95"
          >
            <div className="bg-sky-100/50 border border-white text-sky-600 p-2 rounded-xl shadow-sm backdrop-blur-sm">
              <Home className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-sans tracking-tight">XHomes<span className="text-sky-500">.ai</span></span>
              <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Premier ADU Platform</span>
            </div>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors tracking-wide"
              >
                {link.name}
              </a>
            ))}
            <button className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-2.5 rounded-full shadow-lg shadow-sky-200 font-medium transition-all text-sm active:scale-95">
              Start Application
            </button>
          </nav>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-slate-700 hover:bg-white/50 rounded-md transition-colors relative z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[90] bg-white md:hidden pt-28 px-6 flex flex-col gap-6 animate-in fade-in duration-200 overflow-y-auto">
           {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-2xl font-medium text-slate-800 hover:text-sky-600 py-4 border-b border-slate-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <button className="w-full bg-sky-600 hover:bg-sky-500 text-white rounded-xl h-14 text-lg font-bold shadow-xl shadow-sky-200 mt-4 active:scale-95 transition-transform">
              Start Application
            </button>
        </div>
      )}
    </>
  );
}