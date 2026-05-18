import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ArrowRight, Home, TrendingUp, Check, ShieldCheck, Banknote, Search, Layout, X, Mail, Clock, AlertTriangle } from 'lucide-react';
import { SignInModal } from './SignInModal';
import { EarnModal } from '../shared/EarnModal';
import usaMapBg from 'figma:asset/73c4731a32b6e0652ab16f2bc921df88ed3b255b.png';
import brandLogo from 'figma:asset/8e75cc384b46734d4f787f64b6bf7366bdf087c9.png';

type PageState = 'initial' | 'searching' | 'locating' | 'residence-type' | 'eligible' | 'ready' | 'typology' | 'ineligible' | 'needs-review';

// Major city coordinates (relative to viewport percentages)
const CITIES = {
  'new york': { x: 72, y: 35, name: 'New York, NY' },
  'los angeles': { x: 15, y: 60, name: 'Los Angeles, CA' },
  'san francisco': { x: 10, y: 45, name: 'San Francisco, CA' },
  'miami': { x: 78, y: 75, name: 'Miami, FL' },
  'seattle': { x: 12, y: 20, name: 'Seattle, WA' },
  'boston': { x: 75, y: 32, name: 'Boston, MA' },
  'chicago': { x: 58, y: 38, name: 'Chicago, IL' },
  'san diego': { x: 14, y: 65, name: 'San Diego, CA' },
};

// Random coastal city positions for jumping animation
const JUMP_POINTS = [
  { x: 72, y: 35 }, // NYC area
  { x: 15, y: 60 }, // LA area
  { x: 10, y: 45 }, // SF area
  { x: 78, y: 75 }, // Miami area
  { x: 75, y: 32 }, // Boston area
  { x: 12, y: 20 }, // Seattle area
  { x: 58, y: 38 }, // Chicago area
  { x: 14, y: 65 }, // San Diego area
];

export function StartPage({ onComplete, onStateChange, shouldFocusInput }: { onComplete: () => void; onStateChange?: (state: string) => void; shouldFocusInput?: boolean }) {
  const [state, setState] = useState<PageState>('initial');
  const [address, setAddress] = useState('');
  const [targetCity, setTargetCity] = useState<{ x: number; y: number; name: string } | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showNYWarning, setShowNYWarning] = useState(false);
  const [selectedTypology, setSelectedTypology] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  useEffect(() => {
    // Hard reset scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (shouldFocusInput && inputRef.current) {
      // Small delay to ensure render/mount completion
      setTimeout(() => {
          // Do not scroll, just focus
          inputRef.current?.focus({ preventScroll: true });
          
          // Visual highlight
          const wrapper = inputRef.current?.closest('.relative.group');
          if (wrapper) {
             // Create a highlight effect manually or toggling class if possible. 
             // Since we can't easily modify the wrapper ref directly without another ref, 
             // we can assume the focus ring on input (if styled) or rely on the scroll.
             // But the user asked for "briefly highlight or animate".
             // The input container has: className="relative group" in parent
             // and inner: className="relative bg-slate-900/90 ... border-slate-800"
             // I'll assume the focus state is enough or I can try to animate the border via direct DOM manipulation (not ideal but works for this specific visual cue).
             const innerContainer = inputRef.current?.parentElement?.parentElement;
             if (innerContainer) {
                 innerContainer.animate([
                     { borderColor: '#3b82f6', boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5)' },
                     { borderColor: 'rgba(30, 41, 59, 1)', boxShadow: 'none' }
                 ], {
                     duration: 1500,
                     easing: 'ease-out'
                 });
             }
          }
      }, 100);
    }
  }, [shouldFocusInput]);

  const [isShrinking, setIsShrinking] = useState(false);

  const [showEarnModal, setShowEarnModal] = useState(false);

  const handleSignInSuccess = () => {
    setShowSignInModal(false);
    onComplete();
  };

  useEffect(() => {
    if (state === 'eligible') {
      const timer = setTimeout(() => {
        setIsShrinking(true);
        setTimeout(() => {
          setState('ready');
          setSelectedGoal('invest');
          setIsShrinking(false);
        }, 800); // Wait for shrink animation
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const handleSearch = () => {
    if (!address.trim()) return;
    
    // Reset any previous state for a fresh search
    setIsShrinking(false);
    
    // Try to detect city from address (simple matching)
    const addressLower = address.toLowerCase();
    let foundCity = CITIES['new york']; // Default to New York
    
    for (const [key, city] of Object.entries(CITIES)) {
      if (addressLower.includes(key)) {
        foundCity = city;
        break;
      }
    }
    
    setTargetCity(foundCity);
    setState('searching');
    
    // After searching animation, move to locating
    setTimeout(() => {
      setState('locating');
      
      // After pin drops, move to appropriate state
      setTimeout(() => {
        if (addressLower.includes('texas') || addressLower.includes('tx')) {
          setState('ineligible');
        } else if (addressLower.includes('new jersey') || addressLower.includes('nj')) {
          setState('needs-review');
        } else {
          setState('residence-type');
        }
      }, 2500);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    // Only show footer on initial page
    const footer = document.querySelector('.absolute.bottom-12.left-0.right-0');
    if (footer) {
      (footer as HTMLElement).style.display = state === 'initial' ? 'block' : 'none';
    }
  }, [state]);

  useEffect(() => {
    // Only show footer on initial page
    const footer = document.querySelector('.absolute.bottom-12.left-0.right-0');
    if (footer) {
      (footer as HTMLElement).style.display = state === 'initial' ? 'block' : 'none';
    }
  }, [state]);

  const selectGoal = (goal: string) => {
    // Cannot deselect by clicking the same card
    setSelectedGoal(goal);
  };

  const handleNextPhase = () => {
    setState('typology');
    setSelectedTypology('detached');
  };

  const handleBackToContext = () => {
    setState('ready');
    setSelectedTypology(null);
  };

  const handleBack = () => {
    setState('initial');
    setAddress('');
    setTargetCity(null);
    setSelectedGoal(null);
    setUserEmail('');
    setIsSubmitted(false);
  };

  return (
    <section className={`relative min-h-screen bg-transparent ${state === 'initial' ? 'overflow-visible' : 'overflow-hidden'}`}>
      
      {/* HOME VIEW CONTAINER */}
      <div className={`w-full min-h-screen flex flex-col relative ${
        state === 'initial' || state === 'searching' || state === 'locating' 
          ? 'items-center pt-24 md:pt-32' 
          : 'items-start pt-48 pb-12'
      }`}>
      
      {/* Animated Gradient Background */}
      <motion.div 
        className="fixed inset-0 opacity-20 pointer-events-none"
        animate={{
          background: [
            'radial-gradient(circle at 20% 50%, #0ea5e9 0%, transparent 50%)',
            'radial-gradient(circle at 80% 50%, #3b82f6 0%, transparent 50%)',
            'radial-gradient(circle at 50% 80%, #0ea5e9 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, #0ea5e9 0%, transparent 50%)',
          ]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Progress Bar - Only show after initial state */}
      {state !== 'initial' && state !== 'searching' && state !== 'locating' && state !== 'ineligible' && state !== 'needs-review' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-[110px] left-1/2 -translate-x-1/2 z-20 w-full max-w-sm"
        >
          <div className="flex flex-col items-center">
            {/* Dots and Lines */}
            <div className="flex items-center w-full px-6 relative mb-3">
              {/* Connector Line 1 */}
              <div className={`absolute top-1.5 left-[23%] right-[50%] h-0.5 transition-colors duration-500 ${
                state === 'ready' || state === 'typology' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'
              }`} />
              {/* Connector Line 2 */}
              <div className={`absolute top-1.5 left-[50%] right-[23%] h-0.5 transition-colors duration-500 ${
                state === 'typology' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'
              }`} />

              {/* Dot 1: Eligibility */}
              <div className="flex-1 flex justify-center relative">
                <div className={`w-3 h-3 rounded-full transition-all duration-500 relative z-10 ${
                  state === 'eligible' || state === 'ready' || state === 'typology' 
                    ? 'bg-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.8)]' 
                    : 'bg-slate-700'
                }`} />
              </div>
              
              {/* Dot 2: Context */}
              <div className="flex-1 flex justify-center relative">
                <div className={`w-3 h-3 rounded-full transition-all duration-500 relative z-10 ${
                  state === 'ready' || state === 'typology'
                    ? 'bg-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.8)]' 
                    : 'bg-slate-700'
                }`} />
              </div>

              {/* Dot 3: Typology */}
              <div className="flex-1 flex justify-center relative">
                <div className={`w-3 h-3 rounded-full transition-all duration-500 relative z-10 ${
                  state === 'typology'
                    ? 'bg-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.8)]' 
                    : 'bg-slate-700'
                }`} />
              </div>
            </div>

            {/* Labels */}
            <div className="flex w-full text-[10px] font-bold uppercase tracking-wider">
              <span className={`flex-1 text-center transition-colors duration-500 ${
                state === 'eligible' || state === 'ready' || state === 'typology' ? 'text-blue-400' : 'text-slate-600'
              }`}>Eligibility</span>
              <span className={`flex-1 text-center transition-colors duration-500 ${
                state === 'ready' || state === 'typology' ? 'text-blue-400' : 'text-slate-600'
              }`}>Context</span>
              <span className={`flex-1 text-center transition-colors duration-500 ${
                state === 'typology' ? 'text-blue-400' : 'text-slate-600'
              }`}>Typology</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* USA Map Overlay - Enhanced during searching/locating */}
      <motion.div 
        className="fixed inset-0 pointer-events-none"
        animate={{
          opacity: state === 'searching' || state === 'locating' ? 0.4 : 0.18
        }}
        transition={{ duration: 0.5 }}
      >
        <img 
          src={usaMapBg} 
          alt="USA Coverage" 
          className="w-full h-full object-cover object-center"
        />
      </motion.div>

      {/* Grid Pattern */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      {/* Jumping Light Points Animation - Only during searching */}
      {state === 'searching' && (
        <div className="absolute inset-0 pointer-events-none">
          {JUMP_POINTS.map((point, index) => (
            <motion.div
              key={index}
              className="absolute w-3 h-3 bg-sky-400 rounded-full shadow-lg shadow-sky-500/50"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 0.6,
                delay: index * 0.15,
                repeat: 3,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}

      {/* Pin Drop Animation - Only during locating */}
      {state === 'locating' && targetCity && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Target pulse on map */}
          <motion.div
            className="absolute"
            style={{
              left: `${targetCity.x}%`,
              top: `${targetCity.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Pulsing rings */}
            {[0, 0.3, 0.6].map((delay, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-sky-400"
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{
                  scale: [0, 3],
                  opacity: [0.8, 0],
                }}
                transition={{
                  duration: 1.5,
                  delay,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            ))}
            
            {/* Pin icon dropping */}
            <motion.div
              initial={{ y: -200, scale: 0, opacity: 0 }}
              animate={{ 
                y: 0, 
                scale: 1, 
                opacity: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.3
              }}
            >
              <MapPin className="w-12 h-12 text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.5)]" fill="currentColor" />
            </motion.div>
          </motion.div>

          {/* City name label */}
          <motion.div
            className="absolute bg-slate-900/90 backdrop-blur-xl text-white px-4 py-2 rounded-lg border border-sky-500/30 shadow-xl"
            style={{
              left: `${targetCity.x}%`,
              top: `${targetCity.y}%`,
              transform: 'translate(-50%, calc(-100% - 60px))',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <p className="text-sm font-bold">{targetCity.name}</p>
          </motion.div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center max-w-6xl">
        <AnimatePresence mode="wait">
          {state === 'initial' && (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {/* Hero Text */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold text-white tracking-tight leading-none">
                  We Build.<br />
                  <span className="bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400 bg-clip-text text-transparent">
                    You Earn.
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-light">
                  Turn your underused land into rental income<br />
                  We build and manage the ADU at 0 upfront construction cost
                </p>
              </motion.div>

              {/* Search Input */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="max-w-2xl mx-auto"
              >
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
                  <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="flex items-center p-2 gap-2">
                      <div className="flex items-center flex-1 px-4 py-2">
                        <MapPin className="h-5 w-5 text-sky-500 mr-3 shrink-0" />
                        <input
                          ref={inputRef}
                          type="text"
                          placeholder="Enter your address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500 text-lg"
                          autoFocus
                        />
                      </div>
                      <motion.button
                        onClick={handleSearch}
                        disabled={!address.trim()}
                        className="shrink-0 bg-white hover:bg-slate-100 disabled:bg-slate-800 text-slate-900 disabled:text-slate-600 px-8 py-4 rounded-xl font-bold transition-all disabled:cursor-not-allowed flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Start
                        <ArrowRight className="h-5 w-5" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Subtle hint */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-sm text-slate-600 mt-4"
                >
                  Eligibility check · ADU feasibility · Free-build program match
                </motion.p>
              </motion.div>

              {/* Returning User Prompt */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="flex items-center justify-center gap-4 text-sm"
              >
                <span className="text-slate-500">Already have a project?</span>
                <button
                  onClick={() => setShowSignInModal(true)}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium group"
                >
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>SIGN IN TO STUDIO</span>
                </button>
                <span className="text-slate-700">|</span>
                <button
                  onClick={() => handleSearch()}
                  className="text-slate-400 hover:text-white transition-colors font-medium"
                >
                  CREATE ACCOUNT
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* Prefab Coverage Tag - positioned on map */}
          {state === 'initial' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute flex items-center gap-2 text-xs text-slate-400 bg-slate-900/40 backdrop-blur-sm px-2.5 py-1.5 rounded border border-slate-700/50"
              style={{
                top: '28%',
                right: '4%',
              }}
            >
              <div className="w-1.5 h-1.5 bg-white rounded-sm animate-pulse" />
              <span>Free Build Eligible</span>
            </motion.div>
          )}

          {state === 'searching' && (
            <motion.div
              key="searching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <motion.div
                className="inline-flex flex-col items-center gap-6"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-white">Scanning coverage network</h2>
                  <p className="text-slate-400">Checking service availability across regions...</p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {state === 'locating' && (
            <motion.div
              key="locating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <motion.div
                className="inline-flex flex-col items-center gap-6"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-white">Pinpointing your location</h2>
                  <p className="text-slate-400">Analyzing zoning, calculating ROI, finding matches...</p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {state === 'residence-type' && (
            <motion.div
              key="residence-type"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12 max-w-5xl mx-auto py-12 flex flex-col items-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-6 text-center"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Residence Type
                </h2>
                <p className="text-xl text-slate-400 font-light max-w-2xl mx-auto">
                  Is this property your primary residence?
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-4"
              >
                <button 
                  onClick={() => setState('eligible')}
                  className="group relative p-8 bg-slate-900/60 backdrop-blur-xl border-2 border-slate-700/50 rounded-3xl text-left hover:border-blue-500/50 hover:bg-slate-900/80 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/20"
                >
                  <div className="flex flex-col h-full gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                      <Home className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-white mb-2">Primary Residence</h4>
                      <p className="text-slate-400 leading-relaxed text-sm">I live here (or plan to) as my main home.</p>
                    </div>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    const isNYC = (targetCity?.name.toLowerCase().includes('new york') || address.toLowerCase().includes('new york') || address.toLowerCase().includes('ny')) && !address.toLowerCase().includes('albany');
                    if (isNYC) {
                      setShowNYWarning(true);
                    } else {
                      setState('eligible');
                    }
                  }}
                  className="group relative p-8 bg-slate-900/60 backdrop-blur-xl border-2 border-slate-700/50 rounded-3xl text-left hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-900/20"
                >
                  <div className="flex flex-col h-full gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-2xl font-bold text-white mb-2">Investment Property</h4>
                      <p className="text-slate-400 leading-relaxed text-sm">I rent this property out or use it as a second home.</p>
                    </div>
                  </div>
                </button>
              </motion.div>
            </motion.div>
          )}

          {state === 'eligible' && (
            <motion.div
              key="eligible"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={isShrinking ? { 
                opacity: 0, 
                scale: 0.8, 
                y: -150,
                transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
              } : { 
                opacity: 1, 
                scale: 1,
                y: 0 
              }}
              exit={{ opacity: 0 }}
              className="space-y-12 max-w-6xl mx-auto py-12 flex flex-col items-center"
            >
              {/* Header - Aligned with Step 01/02 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-center gap-2 text-sky-500 mb-2">
                   <Check className="w-5 h-5" />
                   <h3 className="text-lg tracking-widest font-bold">PRE-QUALIFIED</h3>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white">
                  Congratulations!
                </h2>
                <p className="text-xl text-slate-400 font-light max-w-2xl mx-auto">
                   Your property at <span className="text-white font-semibold">{address}</span> meets the initial criteria for the Free Build Program.
                </p>
              </motion.div>

              {/* Benefits Cards - Styled like Step 02 cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
              >
                  {/* Card 1 */}
                  <div className="bg-slate-900/60 backdrop-blur-xl border-2 border-slate-700/50 rounded-3xl p-8 text-left hover:border-sky-500/30 transition-all">
                     <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0 text-sky-400">
                           <Home className="w-6 h-6" />
                        </div>
                        <div>
                           <h4 className="text-lg font-bold text-white mb-2">Zero Upfront Cost</h4>
                           <p className="text-slate-400 text-sm leading-relaxed">We fund the entire construction process. You pay nothing out of pocket.</p>
                        </div>
                     </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-slate-900/60 backdrop-blur-xl border-2 border-slate-700/50 rounded-3xl p-8 text-left hover:border-sky-500/30 transition-all">
                     <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0 text-sky-400">
                           <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                           <h4 className="text-lg font-bold text-white mb-2">Shared Rental Income</h4>
                           <p className="text-slate-400 text-sm leading-relaxed">Earn monthly passive income from the managed ADU rental.</p>
                        </div>
                     </div>
                  </div>
              </motion.div>
            </motion.div>
          )}

          {(state === 'ineligible' || state === 'needs-review') && (
            <motion.div
              key={state}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12 max-w-6xl mx-auto py-12 flex flex-col items-center"
            >
              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 text-center"
              >
                <div className={`flex items-center justify-center gap-2 mb-2 ${state === 'needs-review' ? 'text-amber-500' : 'text-slate-500'}`}>
                   {state === 'needs-review' ? <Clock className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                   <h3 className="text-lg tracking-widest font-bold uppercase">
                     {state === 'needs-review' ? 'ADDITIONAL REVIEW' : 'NOT AVAILABLE YET'}
                   </h3>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white">
                  {state === 'needs-review' ? 'We’re taking a closer look.' : 'We’re not in your area yet'}
                </h2>
                <div className="text-xl text-slate-400 font-light max-w-3xl mx-auto space-y-2 mt-10">
                  {state === 'needs-review' ? (
                    <>
                      <p className="leading-tight">
                        Based on your address, your property meets several initial criteria for the{" "}
                        <button 
                          onClick={() => setShowEarnModal(true)}
                          className="text-sky-500 font-bold hover:text-sky-400 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                        >
                          Free Build Program
                          <div className="w-4 h-4 rounded-full border border-sky-500/40 flex items-center justify-center bg-sky-500/10">
                            <span className="text-[10px]">?</span>
                          </div>
                        </button>.
                      </p>
                      <p className="leading-tight">
                        A few site-specific details require additional review. We’ll follow up within 48 hours.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="leading-tight">
                        Based on your address, the Free Build Program isn’t currently available in your area.
                      </p>
                      <p className="leading-tight">
                        We’re actively expanding, and availability may change as markets and policies evolve.
                      </p>
                      <p className="text-base mt-12 text-slate-500 leading-tight">
                        Get notified when the Free Build Program becomes available near you.
                      </p>
                    </>
                  )}
                </div>
              </motion.div>

              {/* Email Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="w-full max-w-lg"
              >
                {!isSubmitted ? (
                  <div className="relative group">
                    <div className={`absolute -inset-1 bg-gradient-to-r rounded-2xl blur opacity-25 ${state === 'needs-review' ? 'from-amber-500 to-orange-600' : 'from-slate-500 to-slate-700'}`} />
                    <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700 overflow-hidden flex p-2 gap-2">
                      <div className="flex items-center flex-1 px-4">
                        <Mail className="w-5 h-5 text-slate-500 mr-3" />
                        <input 
                          type="email" 
                          placeholder="Enter your email" 
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-white px-0 py-3 placeholder:text-slate-500 text-lg"
                        />
                      </div>
                      <button 
                        onClick={() => setIsSubmitted(true)}
                        disabled={!userEmail.trim()}
                        className="bg-white text-slate-950 px-8 py-3 rounded-xl font-bold text-base transition-all hover:bg-slate-100 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        Notify Me
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4 text-emerald-400 bg-emerald-500/5 p-8 rounded-[32px] border border-emerald-500/20"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-bold text-white mb-1">Success!</p>
                        <p className="text-slate-400">Thank you! We'll be in touch.</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={handleBack}
                className="text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest pt-8"
              >
                Back to Search
              </motion.button>
            </motion.div>
          )}

          {state === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12 max-w-6xl mx-auto pb-12"
            >
              {/* Step Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-3 text-center"
              >
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                  Choose Your Build Path
                </h2>
                <p className="text-xl text-slate-400 font-light max-w-2xl mx-auto">
                  This choice determines whether your project is fully managed or owner-led.
                </p>
              </motion.div>

              {/* Intent Selection Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-6"
              >
                {/* Top Row: Rent (Featured) vs Personal */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
                  {/* Option 1: Rent & Generate Income - FEATURED */}
                  <button 
                    onClick={() => selectGoal('invest')}
                    className={`md:col-span-3 group relative p-8 rounded-3xl text-left transition-all duration-300 ease-out flex flex-col h-full overflow-hidden ${
                      selectedGoal === 'invest'
                        ? 'bg-blue-900/20 border-2 border-blue-500 shadow-[0_25px_60px_-12px_rgba(59,130,246,0.5)] scale-[1.03] -translate-y-2 z-10 ring-1 ring-blue-400/50'
                        : 'bg-slate-900/60 border-2 border-blue-500/30 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1'
                    }`}
                  >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full -mr-16 -mt-16 pointer-events-none" />
                    
                    <div className="flex flex-col h-full relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg ${
                          selectedGoal === 'invest' 
                            ? 'bg-blue-500 text-white scale-110 shadow-blue-500/40' 
                            : 'bg-blue-500/20 text-blue-400 group-hover:scale-110 group-hover:shadow-blue-500/20'
                        }`}>
                          <TrendingUp className="w-7 h-7" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                            selectedGoal === 'invest'
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                              : 'bg-blue-900/50 text-blue-200 border border-blue-500/30'
                          }`}>
                            Free Build Program
                            <div 
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowEarnModal(true);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                  setShowEarnModal(true);
                                }
                              }}
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors cursor-pointer hover:bg-white/20 ${
                                selectedGoal === 'invest' ? 'border-white/40 bg-white/10' : 'border-blue-400/40 bg-blue-400/10'
                            }`}>
                                <span className="text-[9px] font-bold">?</span>
                            </div>
                          </span>
     
                            <span className="bg-white/10 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            Recommended
                          </span>
                        </div>
                      </div>

                      <h4 className="text-2xl font-bold text-white mb-4">Rent & Generate Income</h4>
                      
                      <p className="text-[14px] text-slate-400 leading-relaxed mb-8 flex-grow">
                        Build an ADU as a professionally managed rental, with <span className="font-bold text-white uppercase">NO UPFRONT CONSTRUCTION COST</span>, shared rental income, and a clear buyback path to regain 100% ownership.
                      </p>

                      <div className="flex flex-wrap gap-4 mt-auto pt-6 border-t border-slate-700/50">
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                          <ShieldCheck className="w-4 h-4" />
                          <span>WE TAKE THE RISK</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                          <Banknote className="w-4 h-4" />
                          <span>REVENUE PARTICIPATION</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Personal or Family Use */}
                  <button 
                    onClick={() => selectGoal('personal')}
                    className={`md:col-span-2 group relative p-8 rounded-3xl text-left transition-all duration-300 ease-out flex flex-col h-full ${
                      selectedGoal === 'personal'
                        ? 'bg-slate-800 border-2 border-slate-300 shadow-[0_25px_60px_-12px_rgba(255,255,255,0.1)] scale-[1.03] -translate-y-2 z-10 ring-1 ring-slate-400/50'
                        : 'bg-slate-900/40 border-2 border-slate-800 hover:border-slate-600 hover:bg-slate-900/60 hover:-translate-y-1 hover:shadow-xl'
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                          selectedGoal === 'personal' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Home className="w-7 h-7" />
                        </div>
                        <span className="bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          Owner-Funded Build
                        </span>
                      </div>

                      <h4 className="text-2xl font-bold text-white mb-4">Personal or Family Use</h4>
                      
                      <p className="text-[14px] text-slate-400 leading-relaxed mb-8 flex-grow">
                        Build an ADU for personal use or family living. Designed for custom, owner-led projects
                      </p>

                      <div className="mt-auto pt-6 border-t border-slate-800">
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                          Traditional Delivery Path
                        </span>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Bottom Row: Still Exploring */}
                <button 
                  onClick={() => selectGoal('unsure')}
                  className={`w-full group relative p-6 rounded-2xl text-left transition-all duration-300 ease-out flex items-center gap-6 ${
                    selectedGoal === 'unsure'
                      ? 'bg-slate-800 border-2 border-slate-400 shadow-[0_25px_50px_-12px_rgba(148,163,184,0.15)] scale-[1.02] -translate-y-1 z-10'
                      : 'bg-slate-900/20 border border-slate-800 hover:border-slate-600 hover:bg-slate-900/40 hover:-translate-y-0.5'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedGoal === 'unsure' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Search className="w-6 h-6" />
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-bold text-white">Still Exploring</h4>
                      <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded text-xs">
                        EXPLORE FIRST
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      Not ready to decide. Explore site feasibility and exterior placement. You can change your intent later.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                    <span>NO COMMITMENT REQUIRED</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-4 pt-8"
              >
                <motion.button
                  onClick={handleBack}
                  className="px-8 py-4 rounded-xl font-bold text-slate-400 hover:text-white transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  BACK
                </motion.button>

                <motion.button
                  onClick={handleNextPhase}
                  disabled={!selectedGoal}
                  className={`group relative inline-flex items-center gap-4 px-14 py-6 rounded-2xl font-bold text-xl transition-all shadow-2xl ${
                    selectedGoal
                      ? 'bg-[#d1d5db] text-slate-950 hover:bg-white'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  whileHover={selectedGoal ? { scale: 1.02 } : {}}
                  whileTap={selectedGoal ? { scale: 0.98 } : {}}
                >
                  <span className="tracking-tight">NEXT PHASE</span>
                  <ArrowRight className="h-6 w-6" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {state === 'typology' && (
            <motion.div
              key="typology"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12 max-w-6xl mx-auto pb-12"
            >
              {/* Step Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-6 text-center"
              >
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                  ADU Type
                </h2>
                
                <p className="text-xl text-slate-400 font-light max-w-4xl mx-auto whitespace-nowrap">
                  Based on your intent and lot audit, we suggest a <span className="font-bold text-white">DETACHED ADU</span> for maximum independence.
                </p>
              </motion.div>

              {/* Typology Selection Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto"
              >
                {/* Detached */}
                <button 
                  onClick={() => setSelectedTypology('detached')}
                  className={`group relative p-6 md:p-8 text-left transition-all duration-300 rounded-[2rem] border-2 ${
                    selectedTypology === 'detached'
                      ? 'bg-slate-900/80 border-blue-500 shadow-2xl shadow-blue-900/20'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  {/* BEST FIT Badge - Always show as it's the recommendation */}
                  <div className="absolute -top-4 left-8 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold tracking-wider uppercase rounded-full shadow-lg shadow-blue-600/40">
                    Best Fit
                  </div>

                  <div className="flex flex-col h-full space-y-4">
                    {/* Icon + Header Area */}
                    <div className="space-y-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                         selectedTypology === 'detached' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'
                      }`}>
                        <Home className="w-6 h-6" />
                      </div>
                      
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">Detached ADU</h4>
                        <p className="text-sm text-slate-400 font-medium">Highest ROI & Autonomy.</p>
                      </div>
                    </div>

                    {/* X-Factor section */}
                    <div className="pt-6 border-t border-slate-800 group-hover:border-slate-700 transition-colors">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">X-Factor</p>
                        <p className="text-sm font-medium text-slate-300 italic whitespace-nowrap">
                          Maximizes privacy, rental separation, and long-term flexibility.
                        </p>
                    </div>
                  </div>
                </button>

                {/* Attached */}
                <button 
                  onClick={() => setSelectedTypology('attached')}
                  className={`group relative p-6 md:p-8 text-left transition-all duration-300 rounded-[2rem] border-2 ${
                    selectedTypology === 'attached'
                      ? 'bg-slate-800 border-slate-300 shadow-[0_25px_60px_-12px_rgba(255,255,255,0.1)] scale-[1.03] -translate-y-2 z-10 ring-1 ring-slate-400/50'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 hover:-translate-y-1'
                  }`}
                >
                  <div className="flex flex-col h-full space-y-4">
                    {/* Icon + Header Area */}
                    <div className="space-y-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                         selectedTypology === 'attached' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-white'
                      }`}>
                        <Layout className="w-6 h-6" />
                      </div>
                      
                      <div>
                        <h4 className="text-xl font-bold text-white mb-1">Attached ADU</h4>
                        <p className="text-sm text-slate-400 font-medium">Efficiency & Access.</p>
                      </div>
                    </div>

                    {/* X-Factor section */}
                    <div className="pt-6 border-t border-slate-800 group-hover:border-slate-700 transition-colors">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">X-Factor</p>
                        <p className="text-sm font-medium text-slate-300 italic whitespace-nowrap mb-4">
                          Designed for edge cases where detached placement isn’t viable.
                        </p>
                        
                        {/* Info note inside card */}
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest italic pt-2 border-t border-slate-800/50">
                          <span>ⓘ This option may require additional review</span>
                        </div>
                    </div>
                  </div>
                </button>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-4"
              >
                {/* Back Button */}
                <motion.button
                  onClick={handleBackToContext}
                  className="px-8 py-4 rounded-xl font-bold text-slate-400 hover:text-white transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  BACK
                </motion.button>

                {/* Enter Design Studio Button */}
                <motion.button
                  onClick={onComplete}
                  disabled={!selectedTypology}
                  className={`group relative inline-flex items-center gap-3 px-12 py-5 rounded-2xl font-bold text-lg transition-all ${
                    selectedTypology
                      ? 'bg-blue-600 text-white hover:bg-white hover:text-blue-600'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  whileHover={selectedTypology ? { scale: 1.05 } : {}}
                  whileTap={selectedTypology ? { scale: 0.95 } : {}}
                >
                  <span>ENTER DESIGN STUDIO</span>
                  <ArrowRight className="h-5 w-5" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New York Warning Modal */}
      <AnimatePresence>
        {showNYWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowNYWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-2 border-red-500/30 rounded-3xl p-8 max-w-md w-full space-y-6"
            >
              {/* Warning Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="text-center space-y-3">
                <h3 className="text-2xl font-bold text-white">NYC Restriction</h3>
                <p className="text-slate-400 leading-relaxed">
                  In New York City, ADU applications require that you are both the <span className="text-white font-semibold">legal property owner</span> and using it as your <span className="text-white font-semibold">primary residence</span>.
                </p>
                <p className="text-sm text-slate-500">
                  Please select both options above to proceed, or try an address elsewhere.
                </p>
              </div>

              {/* Close Button */}
              <motion.button
                onClick={() => setShowNYWarning(false)}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-xl font-bold transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Got it
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER - Only on Initial */}
      {state === 'initial' && (
        <div className="absolute bottom-12 left-0 right-0 z-20 px-12">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 opacity-40">
               <div className="flex items-center gap-12">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold uppercase tracking-widest mb-1">Coverage</span>
                     <span className="text-xs font-bold">National Service</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold uppercase tracking-widest mb-1">Zoning</span>
                     <span className="text-xs font-bold">Auto-Check</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest">
                  <span>Terms</span>
                  <div className="w-1 h-1 bg-slate-700 rounded-full" />
                  <span>Privacy</span>
                  <div className="w-1 h-1 bg-slate-700 rounded-full" />
                  <span>© 2026 XHOMES.AI</span>
               </div>
            </div>
        </div>
      )}
      </div>

      <SignInModal 
        isOpen={showSignInModal} 
        onClose={() => setShowSignInModal(false)}
        onSignIn={handleSignInSuccess}
      />

      <EarnModal 
        isOpen={showEarnModal} 
        onClose={() => setShowEarnModal(false)} 
      />
    </section>
  );
}