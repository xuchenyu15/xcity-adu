import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ArrowRight, Home, TrendingUp, Check, ShieldCheck, Banknote, Search, Layout, X, Mail, Clock, AlertTriangle } from 'lucide-react';
import { SignInModal } from './SignInModal';
import { EarnModal } from '../shared/EarnModal';
import { SiteFeasibility } from '../studio/SiteFeasibility';
import usaMapBg from 'figma:asset/73c4731a32b6e0652ab16f2bc921df88ed3b255b.png';
import brandLogo from 'figma:asset/8e75cc384b46734d4f787f64b6bf7366bdf087c9.png';
import { useI18n } from '../../i18n';
import { lookupAddress, geocodeAddress, suggestAddress } from '../../api/address';

type PageState = 'initial' | 'searching' | 'locating' | 'residence-type' | 'eligible' | 'ready' | 'typology' | 'ineligible' | 'needs-review' | 'not-fitted';

// Major city coordinates (relative to viewport percentages)
const CITIES: Record<string, {name: string, x: number, y: number}> = {
  'new york': { x: 72, y: 35, name: 'New York, NY' },
  'los angeles': { x: 15, y: 60, name: 'Los Angeles, CA' },
  'san francisco': { x: 10, y: 45, name: 'San Francisco, CA' },
  'miami': { x: 78, y: 75, name: 'Miami, FL' },
  'seattle': { x: 12, y: 20, name: 'Seattle, WA' },
  'boston': { x: 75, y: 32, name: 'Boston, MA' },
  'chicago': { x: 58, y: 38, name: 'Chicago, IL' },
  'san diego': { x: 14, y: 65, name: 'San Diego, CA' },
  'dallas': { x: 44, y: 60, name: 'Dallas, TX' },
  'austin': { x: 43, y: 65, name: 'Austin, TX' },
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

export function StartPage({ onComplete, onStateChange, shouldFocusInput }: { onComplete: (goal?: string | null) => void; onStateChange?: (state: string) => void; shouldFocusInput?: boolean }) {
  const { t, language } = useI18n();
  const [state, setState] = useState<PageState>('initial');
  const [address, setAddress] = useState('');
  const [targetCity, setTargetCity] = useState<{ x: number; y: number; name: string } | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showNYWarning, setShowNYWarning] = useState(false);
  const [selectedTypology, setSelectedTypology] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showFeasibilityPreview, setShowFeasibilityPreview] = useState(false);
  const [feasibilityLookup, setFeasibilityLookup] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const suggestTimerRef = useRef<number | null>(null);
  const suggestSeqRef = useRef(0);
  type RecentEntry = { address: string; lookupId?: string; updatedAt?: number };
  type SuggestionItem = { address: string; title: string; subtitle?: string; kind: 'recent' | 'suggest'; lookupId?: string };
  const [recentAddresses, setRecentAddresses] = useState<RecentEntry[]>([]);
  const MAX_RECENTS = 5;
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeSuggestIndex, setActiveSuggestIndex] = useState<number>(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const searchSeqRef = useRef(0);
  const inFlightTimeoutRef = useRef<number | null>(null);

  const withTimeout = async <T,>(p: Promise<T>, ms: number) => {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        window.setTimeout(() => reject(new Error('timeout')), ms);
      }),
    ]);
  };

  const guessCityFromAddressText = (addr: string) => {
    const addressLower = (addr ?? '').toLowerCase();
    let foundCity = CITIES['new york'];
    for (const [key, city] of Object.entries(CITIES)) {
      if (addressLower.includes(key)) {
        foundCity = city;
        break;
      }
    }
    return foundCity;
  };

  const normalizeLookupId = (v: unknown) => {
    const s = (v ?? '').toString().trim().toLowerCase();
    return s.replace(/\s+/g, ' ');
  };

  const getCachedLookupById = (lookupId: string): null | { id: string; data: any } => {
    const id = normalizeLookupId(lookupId);
    if (!id) return null;
    try {
      const raw = localStorage.getItem(`xhomes.lookup:${id}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const data = parsed && typeof parsed === 'object' && 'data' in parsed ? (parsed as any).data : parsed;
      if (!data || typeof data !== 'object') return null;
      const fields = (data as any)?.subjectParcel?.properties?.fields ?? null;
      const derivedId = normalizeLookupId(fields?.ll_uuid);
      if (!derivedId) return null;
      if (derivedId !== id) return null;
      return { id, data };
    } catch {
      return null;
    }
  };

  const persistLookupCache = (addr: string, data: any): string | null => {
    const fields = data?.subjectParcel?.properties?.fields ?? null;
    const id = normalizeLookupId(fields?.ll_uuid);

    try {
      localStorage.setItem('xhomes.lookup', JSON.stringify(data));
    } catch {
    }
    if (!id) return null;
    try {
      localStorage.setItem(`xhomes.lookup:${id}`, JSON.stringify({ data, updatedAt: Date.now(), address: addr }));
    } catch {
    }
    return id;
  };

  const upsertRecentAddress = (addr: string, lookupId?: string) => {
    const trimmed = (addr ?? '').trim();
    if (!trimmed) return;
    const normalized = trimmed.toLowerCase();
    setRecentAddresses((prev) => {
      const existing = prev.find((x) => (x.address ?? '').trim().toLowerCase() === normalized) ?? null;
      const entry: RecentEntry = {
        address: trimmed,
        lookupId: lookupId ?? existing?.lookupId,
        updatedAt: Date.now(),
      };
      const rest = prev.filter((x) => (x.address ?? '').trim().toLowerCase() !== normalized);
      const next = [entry, ...rest].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem('xhomes.recentAddresses', JSON.stringify(next));
      } catch {
      }
      return next;
    });
  };

  const formatMenuLinesFromAddress = (raw: string) => {
    const s = (raw ?? '').trim();
    const parts = s.split(',').map((x) => x.trim()).filter((x) => x.length > 0);
    const title = parts[0] ?? s;
    if (parts.length <= 1) return { title, subtitle: '' };
    const city = parts[1] ?? '';
    const rest = parts.slice(2).join(', ');
    const subtitle = rest ? `${city}, ${rest}` : city;
    return { title, subtitle };
  };

  const buildRecentSuggestions = (maxCount: number) => {
    return recentAddresses.slice(0, maxCount).map((r) => {
      const fmt = formatMenuLinesFromAddress(r.address);
      return {
        address: r.address,
        title: fmt.title,
        subtitle: fmt.subtitle,
        kind: 'recent' as const,
        lookupId: r.lookupId,
      };
    });
  };

  const removeRecentAddress = (addr: string) => {
    const trimmed = (addr ?? '').trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    const next = recentAddresses.filter((x) => (x.address ?? '').trim().toLowerCase() !== key).slice(0, MAX_RECENTS);
    setRecentAddresses(next);
    try {
      localStorage.setItem('xhomes.recentAddresses', JSON.stringify(next));
    } catch {
    }

    setSuggestions((prev) => {
      const filtered = prev.filter((s) => !(s.kind === 'recent' && s.address.trim() === trimmed));
      return filtered.length > 0 ? filtered : buildRecentSuggestions(MAX_RECENTS);
    });
  };

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  useEffect(() => {
    // Hard reset scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('xhomes.recentAddresses');
      const arr = raw ? (JSON.parse(raw) as any) : [];
      if (Array.isArray(arr)) {
        const parsed = arr
          .map((x) => {
            const a = (x?.address ?? '').toString().trim();
            if (!a) return null;
            const id = normalizeLookupId(x?.lookupId);
            const updatedAt = Number(x?.updatedAt);
            return {
              address: a,
              lookupId: id ? id : undefined,
              updatedAt: Number.isFinite(updatedAt) ? updatedAt : undefined,
            } as RecentEntry;
          })
          .filter(Boolean) as RecentEntry[];
        setRecentAddresses(parsed.slice(0, MAX_RECENTS));
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const el = searchBoxRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setSuggestOpen(false);
        setActiveSuggestIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    if (state !== 'initial') {
      setSuggestOpen(false);
      setSuggestions([]);
      setActiveSuggestIndex(-1);
      return;
    }

    const q = address.trim();
    if (q.length < 2) {
      if (inputFocused && recentAddresses.length > 0) {
        setSuggestions(buildRecentSuggestions(MAX_RECENTS));
        setSuggestOpen(true);
        setActiveSuggestIndex(-1);
      } else {
        setSuggestions([]);
        setSuggestOpen(false);
        setActiveSuggestIndex(-1);
      }
      return;
    }

    if (suggestTimerRef.current) window.clearTimeout(suggestTimerRef.current);
    const seq = ++suggestSeqRef.current;
    suggestTimerRef.current = window.setTimeout(async () => {
      try {
        const qLower = q.toLowerCase();
        const recents = recentAddresses
          .filter((r) => (r.address ?? '').toLowerCase().includes(qLower))
          .slice(0, 2)
          .map((r) => {
            const fmt = formatMenuLinesFromAddress(r.address);
            return {
              address: r.address,
              title: fmt.title,
              subtitle: fmt.subtitle,
              kind: 'recent' as const,
              lookupId: r.lookupId,
            };
          });

        const res = await suggestAddress(q, 6);
        if (seq !== suggestSeqRef.current) return;
        const api = Array.isArray(res?.suggestions) ? res.suggestions : (Array.isArray(res?.data?.suggestions) ? res.data.suggestions : []);
        const sug = api
          .map((x: any) => ({
            address: String(x?.address ?? '').trim(),
            title: String(x?.title ?? '').trim(),
            subtitle: String(x?.subtitle ?? '').trim(),
            kind: 'suggest' as const
          }))
          .filter((x: any) => x.address.length > 0);

        const seen = new Set<string>();
        const merged = [...recents, ...sug].filter((x) => {
          const key = `${(x.address || '').toLowerCase()}|${(x.title || '').toLowerCase()}|${(x.subtitle || '').toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setSuggestions(merged.slice(0, 6));
        setSuggestOpen(merged.length > 0);
        setActiveSuggestIndex(-1);
      } catch {
        if (seq !== suggestSeqRef.current) return;
        const qLower = q.toLowerCase();
        const recents = recentAddresses
          .filter((r) => (r.address ?? '').toLowerCase().includes(qLower))
          .slice(0, 3)
          .map((r) => {
            const fmt = formatMenuLinesFromAddress(r.address);
            return {
              address: r.address,
              title: fmt.title,
              subtitle: fmt.subtitle,
              kind: 'recent' as const,
              lookupId: r.lookupId,
            };
          });
        setSuggestions(recents);
        setSuggestOpen(recents.length > 0);
        setActiveSuggestIndex(-1);
      }
    }, 220);

    return () => {
      if (suggestTimerRef.current) window.clearTimeout(suggestTimerRef.current);
    };
  }, [address, recentAddresses, state, inputFocused]);

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
    onComplete(selectedGoal);
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

  const handleSearch = async (addressOverride?: string, opts?: { preferCache?: boolean; lookupId?: string }) => {
    const addr = (addressOverride ?? address).trim();
    if (!addr) return;

    const seq = ++searchSeqRef.current;
    const isActive = () => seq === searchSeqRef.current;

    if (inFlightTimeoutRef.current) window.clearTimeout(inFlightTimeoutRef.current);
    inFlightTimeoutRef.current = window.setTimeout(() => {
      if (!isActive()) return;
      setState((prev) => (prev === 'searching' || prev === 'locating' ? 'needs-review' : prev));
    }, 30000);

    upsertRecentAddress(addr);

    setSuggestOpen(false);
    setActiveSuggestIndex(-1);
    
    // Reset any previous state for a fresh search
    setIsShrinking(false);
    
    try {
      if (opts?.preferCache) {
        if (!opts?.lookupId) {
          if (inFlightTimeoutRef.current) window.clearTimeout(inFlightTimeoutRef.current);
          setState('initial');
          alert(language === 'zh' ? '该最近地址没有缓存数据，请重新搜索一次。' : 'No cached data for this recent address. Please search again.');
          return;
        }
        const cached = getCachedLookupById(opts.lookupId);
        if (!cached?.data) {
          if (inFlightTimeoutRef.current) window.clearTimeout(inFlightTimeoutRef.current);
          setState('initial');
          alert(language === 'zh' ? '该最近地址缓存已失效或被清理，请重新搜索一次。' : 'Cached data expired or cleared. Please search again.');
          return;
        }
        if (!isActive()) return;
        setTargetCity(guessCityFromAddressText(addr));

        try {
          localStorage.setItem('xhomes.lookup', JSON.stringify(cached.data));
        } catch {
        }
        upsertRecentAddress(addr, cached.id);

        const canFitAdu =
          typeof cached.data?.plan?.canFitAdu === 'boolean'
            ? cached.data.plan.canFitAdu
            : (Array.isArray(cached.data?.computed?.aduFits) ? cached.data.computed.aduFits.some((x: any) => !!x?.canFit) : true);

        if (!canFitAdu) {
          setState('not-fitted');
        } else {
          setState('residence-type');
        }
        if (inFlightTimeoutRef.current) window.clearTimeout(inFlightTimeoutRef.current);
        return;
      }

      const cityFallback = guessCityFromAddressText(addr);
      setTargetCity(cityFallback);
      setState('searching'); // 进入 searching 阶段，显示跳跃的光点和 "Pinpointing your location" 提示

      setState('locating');
      void (async () => {
        try {
          const geoRes = await withTimeout(geocodeAddress(addr), 6000);
          if (!isActive()) return;
          if (geoRes?.x && geoRes?.y) {
            setTargetCity({
              x: geoRes.x,
              y: geoRes.y,
              name: geoRes.name || geoRes.city || addr
            });
          }
        } catch {
        }
      })();
      
      const minAnimationPromise = new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const lookupPromise = withTimeout(lookupAddress(addr, language), 25000);
        const [data] = await Promise.all([lookupPromise, minAnimationPromise]);
        if (!isActive()) return;
        
        const lookupId = persistLookupCache(addr, data);
        if (lookupId) upsertRecentAddress(addr, lookupId);

        const canFitAdu =
          typeof data?.plan?.canFitAdu === 'boolean'
            ? data.plan.canFitAdu
            : (Array.isArray(data?.computed?.aduFits) ? data.computed.aduFits.some((x: any) => !!x?.canFit) : true);

        if (!canFitAdu) {
          setState('not-fitted');
        } else {
          setState('residence-type');
        }
        if (inFlightTimeoutRef.current) window.clearTimeout(inFlightTimeoutRef.current);
      } catch (apiErr) {
        console.error('Failed to fetch detailed parcel data:', apiErr);
        await minAnimationPromise;
        if (!isActive()) return;
        setState('needs-review');
        if (inFlightTimeoutRef.current) window.clearTimeout(inFlightTimeoutRef.current);
      }
    } catch (err) {
      console.error('Error in search flow:', err);
      setState('initial');
      if (inFlightTimeoutRef.current) window.clearTimeout(inFlightTimeoutRef.current);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestOpen || suggestions.length === 0) {
      if (e.key === 'Enter') handleSearch();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestIndex((i) => Math.min(suggestions.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestIndex((i) => Math.max(-1, i - 1));
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setSuggestOpen(false);
      setActiveSuggestIndex(-1);
      return;
    }
    if (e.key === 'Enter') {
      if (activeSuggestIndex >= 0 && activeSuggestIndex < suggestions.length) {
        e.preventDefault();
        const picked = suggestions[activeSuggestIndex];
        setAddress(picked.address);
        setSuggestOpen(false);
        setActiveSuggestIndex(-1);
        handleSearch(picked.address, { preferCache: picked.kind === 'recent', lookupId: picked.lookupId });
        return;
      }
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
    if (!showFeasibilityPreview) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showFeasibilityPreview]);

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

  const openFeasibilityPreview = () => {
    try {
      const raw = localStorage.getItem('xhomes.lookup');
      if (!raw) throw new Error('missing lookup');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('bad lookup');
      setFeasibilityLookup(parsed);
      setShowFeasibilityPreview(true);
    } catch {
      alert(language === 'zh' ? '缺少地块数据缓存，请重新搜索一次。' : 'Missing parcel cache. Please search again.');
    }
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
      {state !== 'initial' && state !== 'searching' && state !== 'locating' && state !== 'ineligible' && state !== 'needs-review' && state !== 'not-fitted' && (
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
            <div className={`flex w-full text-[10px] font-bold ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-wider'}`}>
              <span className={`flex-1 text-center transition-colors duration-500 ${
                state === 'eligible' || state === 'ready' || state === 'typology' ? 'text-blue-400' : 'text-slate-600'
              }`}>{t('start.progressEligibility')}</span>
              <span className={`flex-1 text-center transition-colors duration-500 ${
                state === 'ready' || state === 'typology' ? 'text-blue-400' : 'text-slate-600'
              }`}>{t('start.progressContext')}</span>
              <span className={`flex-1 text-center transition-colors duration-500 ${
                state === 'typology' ? 'text-blue-400' : 'text-slate-600'
              }`}>{t('start.progressTypology')}</span>
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
          alt={t('start.coverageMapAlt')}
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
                repeat: Infinity, // searching 阶段让点一直跳，直到后端返回
                ease: "easeInOut"
              }}
            />
          ))}
          
          {/* Locating City Indicator */}
          <div className="absolute inset-x-0 top-80 flex justify-center z-50">
            <motion.div
              className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full border border-sky-500/50 shadow-2xl flex items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
              <p className="text-sm font-medium tracking-wide">
                {t('start.pinpointingCity')}
              </p>
            </motion.div>
          </div>
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
          <div
            className="absolute z-50 pointer-events-none flex justify-center"
            style={{
              left: `${targetCity.x}%`,
              top: `${targetCity.y}%`,
              transform: 'translate(-50%, calc(-100% - 60px))',
            }}
          >
            <motion.div
              className="bg-slate-900/90 backdrop-blur-xl text-white px-4 py-2 rounded-lg border border-sky-500/30 shadow-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <p className="text-sm font-bold whitespace-nowrap">{targetCity.name}</p>
            </motion.div>
          </div>
          
          {/* Loading Indicator */}
          <div className="absolute inset-x-0 top-80 flex justify-center z-50">
            <motion.div
              className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full border border-sky-500/50 shadow-2xl flex items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <div className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
              <p className="text-sm font-medium tracking-wide">
                {t('start.fetchingParcel')}
              </p>
            </motion.div>
          </div>
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
                  {t('start.heroLineA')}<br />
                  <span className="bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400 bg-clip-text text-transparent">
                    {t('start.heroLineB')}
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-light">
                  {t('start.heroDescA')}<br />
                  {t('start.heroDescB')}
                </p>
              </motion.div>

              {/* Search Input */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="max-w-2xl mx-auto"
              >
                <div className="relative group" ref={searchBoxRef}>
                  <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-500" />
                  <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden">
                    <div className="flex items-center p-2 gap-2">
                      <div className="flex items-center flex-1 px-4 py-2">
                        <MapPin className="h-5 w-5 text-sky-500 mr-3 shrink-0" />
                        <input
                          ref={inputRef}
                          type="text"
                          placeholder={t('start.addressPlaceholder')}
                          value={address}
                          onChange={(e) => {
                            setAddress(e.target.value);
                            setSuggestOpen(true);
                          }}
                          onKeyDown={handleInputKeyDown}
                          onFocus={() => {
                            setInputFocused(true);
                            if (address.trim().length < 2 && recentAddresses.length > 0) {
                              setSuggestions(buildRecentSuggestions(MAX_RECENTS));
                              setSuggestOpen(true);
                              setActiveSuggestIndex(-1);
                              return;
                            }
                            if (suggestions.length > 0) setSuggestOpen(true);
                          }}
                          onBlur={() => {
                            window.setTimeout(() => {
                              const el = searchBoxRef.current;
                              const ae = document.activeElement;
                              if (el && ae instanceof Node && el.contains(ae)) return;
                              setInputFocused(false);
                            }, 0);
                          }}
                          className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500 text-lg"
                        />
                      </div>
                      <motion.button
                        onClick={() => {
                          void handleSearch();
                        }}
                        disabled={!address.trim()}
                        className="shrink-0 bg-white hover:bg-slate-100 disabled:bg-slate-800 text-slate-900 disabled:text-slate-600 px-8 py-4 rounded-xl font-bold transition-all disabled:cursor-not-allowed flex items-center gap-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {t('start.start')}
                        <ArrowRight className="h-5 w-5" />
                      </motion.button>
                    </div>
                  </div>
                  {state === 'initial' && suggestOpen && suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-3 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.55)] z-40">
                      {suggestions.map((s, idx) => {
                        const active = idx === activeSuggestIndex;
                        return (
                          <div
                            key={`${s.kind}-${s.address}`}
                            onMouseEnter={() => setActiveSuggestIndex(idx)}
                            onClick={() => {
                              setAddress(s.address);
                              setSuggestOpen(false);
                              setActiveSuggestIndex(-1);
                              handleSearch(s.address, { preferCache: s.kind === 'recent', lookupId: s.lookupId });
                            }}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter' && e.key !== ' ') return;
                              e.preventDefault();
                              setAddress(s.address);
                              setSuggestOpen(false);
                              setActiveSuggestIndex(-1);
                              handleSearch(s.address, { preferCache: s.kind === 'recent', lookupId: s.lookupId });
                            }}
                            className={`w-full text-left flex items-center gap-3 px-5 py-4 transition-colors ${active ? 'bg-slate-800/70' : 'bg-transparent hover:bg-slate-800/60'}`}
                            role="button"
                            tabIndex={0}
                          >
                            {s.kind === 'recent' ? (
                              <Clock className="h-5 w-5 text-slate-400 shrink-0" />
                            ) : (
                              <MapPin className="h-5 w-5 text-sky-500 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-semibold text-base truncate">{s.title || s.address}</div>
                              <div className="text-slate-400 text-sm truncate">{s.subtitle || ''}</div>
                            </div>
                            {s.kind === 'recent' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  removeRecentAddress(s.address);
                                }}
                                className="shrink-0 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                aria-label={language === 'zh' ? '删除最近地址' : 'Remove recent address'}
                              >
                                <X className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Subtle hint */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-sm text-slate-600 mt-4"
                >
                  {t('start.hint')}
                </motion.p>
              </motion.div>

              {/* Returning User Prompt */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="flex items-center justify-center gap-4 text-sm"
              >
                <span className="text-slate-500">{t('start.alreadyHaveProject')}</span>
                <button
                  onClick={() => setShowSignInModal(true)}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium group"
                >
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  <span>{t('start.signInToStudio')}</span>
                </button>
                <span className="text-slate-700">|</span>
                <button
                  onClick={() => handleSearch()}
                  className="text-slate-400 hover:text-white transition-colors font-medium"
                >
                  {t('start.createAccount')}
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
              <span>{t('start.freeBuildEligible')}</span>
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
                  <h2 className="text-3xl font-bold text-white">{t('start.scanning')}</h2>
                  <p className="text-slate-400">{t('start.scanningDesc')}</p>
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
                  <h2 className="text-3xl font-bold text-white">{t('start.locating')}</h2>
                  <p className="text-slate-400">{t('start.locatingDesc')}</p>
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
                  {t('start.residenceType')}
                </h2>
                <p className="text-xl text-slate-400 font-light max-w-2xl mx-auto">
                  {t('start.residenceDesc')}
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
                      <h4 className="text-2xl font-bold text-white mb-2">{t('start.primaryResidence')}</h4>
                      <p className="text-slate-400 leading-relaxed text-sm">{t('start.primaryResidenceDesc')}</p>
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
                      <h4 className="text-2xl font-bold text-white mb-2">{t('start.investmentProperty')}</h4>
                      <p className="text-slate-400 leading-relaxed text-sm">{t('start.investmentPropertyDesc')}</p>
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
                   <h3 className={`text-lg font-bold ${language === 'zh' ? 'tracking-normal' : 'tracking-widest'}`}>{t('start.preQualified')}</h3>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white">
                  {t('start.congrats')}
                </h2>
                <p className="text-xl text-slate-400 font-light max-w-2xl mx-auto">
                   {t('start.eligibleDescA')}<span className="text-white font-semibold">{address}</span>{t('start.eligibleDescB')}
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
                           <h4 className="text-lg font-bold text-white mb-2">{t('start.zeroUpfrontTitle')}</h4>
                           <p className="text-slate-400 text-sm leading-relaxed">{t('start.zeroUpfrontDesc')}</p>
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
                           <h4 className="text-lg font-bold text-white mb-2">{t('start.sharedIncomeTitle')}</h4>
                           <p className="text-slate-400 text-sm leading-relaxed">{t('start.sharedIncomeDesc')}</p>
                        </div>
                     </div>
                  </div>
              </motion.div>
            </motion.div>
          )}

          {state === 'not-fitted' && (
            <motion.div
              key="not-fitted"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10 max-w-6xl mx-auto py-12 flex flex-col items-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-5 text-center"
              >
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className={`text-lg font-bold ${language === 'zh' ? 'tracking-normal' : 'tracking-widest uppercase'}`}>
                    {language === 'zh' ? '标准户型不适配' : 'STANDARD UNIT NOT FITTED'}
                  </h3>
                </div>
                <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
                  {language === 'zh' ? '该地块无法容纳标准预制 ADU' : 'This property does not fit the prefab unit'}
                </h2>
                <p className="text-xl text-slate-400 font-light max-w-3xl mx-auto leading-relaxed">
                  {language === 'zh'
                    ? '根据地块面积、退界和已有建筑情况，我们无法在该地块上找到足够的可建空间来放置标准预制模块。'
                    : 'Based on the available lot area, setbacks, and existing structures, we could not identify enough buildable space for the standard prefab module.'}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center gap-4"
              >
                <button
                  onClick={() => setState('needs-review')}
                  className="bg-white text-slate-950 px-10 py-4 rounded-2xl font-bold text-base transition-all hover:bg-slate-100 whitespace-nowrap"
                >
                  {language === 'zh' ? '申请人工复核' : 'Request Review'}
                </button>
                <button
                  onClick={openFeasibilityPreview}
                  className="bg-slate-900/60 text-white px-10 py-4 rounded-2xl font-bold text-base transition-all border border-slate-700 hover:bg-slate-900/80 whitespace-nowrap"
                >
                  {language === 'zh' ? '查看图形' : 'View Map'}
                </button>
                <button
                  onClick={handleBack}
                  className="bg-slate-900/60 text-white px-10 py-4 rounded-2xl font-bold text-base transition-all border border-slate-700 hover:bg-slate-900/80 whitespace-nowrap"
                >
                  {language === 'zh' ? '换个地址试试' : 'Try Another Address'}
                </button>
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
                   <h3 className={`text-lg font-bold ${language === 'zh' ? 'tracking-normal' : 'tracking-widest uppercase'}`}>
                     {state === 'needs-review' ? t('start.additionalReview') : t('start.notAvailableYet')}
                   </h3>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white">
                  {state === 'needs-review' ? t('start.reviewTitle') : t('start.notInAreaTitle')}
                </h2>
                <div className="text-xl text-slate-400 font-light max-w-3xl mx-auto space-y-2 mt-10">
                  {state === 'needs-review' ? (
                    <>
                      <p className="leading-tight">
                        {t('start.reviewBodyPrefix')}
                        <button 
                          onClick={() => setShowEarnModal(true)}
                          className="text-sky-500 font-bold hover:text-sky-400 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                        >
                          {t('start.freeBuildProgram')}
                          <div className="w-4 h-4 rounded-full border border-sky-500/40 flex items-center justify-center bg-sky-500/10">
                            <span className="text-[10px]">?</span>
                          </div>
                        </button>
                        {t('start.reviewBodySuffix')}
                      </p>
                      <p className="leading-tight">
                        {t('start.reviewBodyDetails')}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="leading-tight">
                        {t('start.notAvailableBodyA')}
                      </p>
                      <p className="leading-tight">
                        {t('start.notAvailableBodyB')}
                      </p>
                      <p className="text-base mt-12 text-slate-500 leading-tight">
                        {t('start.notifyBody')}
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
                          placeholder={t('start.emailPlaceholder')}
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
                        {t('start.notifyMe')}
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
                        <p className="text-xl font-bold text-white mb-1">{t('start.successTitle')}</p>
                        <p className="text-slate-400">{t('start.successDesc')}</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              <motion.button 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={handleBack}
                className={`text-slate-500 hover:text-white transition-colors text-sm font-bold pt-8 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-widest'}`}
              >
                {t('start.backToSearch')}
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
                  {t('start.chooseBuildPath')}
                </h2>
                <p className="text-xl text-slate-400 font-light max-w-2xl mx-auto">
                  {t('start.buildPathDesc')}
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
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full transition-all duration-300 flex items-center gap-1.5 ${
                            language === 'zh' ? 'tracking-normal' : 'uppercase tracking-wider'
                          } ${
                            selectedGoal === 'invest'
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                              : 'bg-blue-900/50 text-blue-200 border border-blue-500/30'
                          }`}>
                            {t('start.freeBuildProgram')}
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
     
                            <span className={`bg-white/10 text-slate-300 text-[10px] font-bold px-3 py-1 rounded-full ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-wider'}`}>
                            {t('start.recommended')}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-2xl font-bold text-white mb-4">{t('start.rentTitle')}</h4>
                      
                      <p className="text-[14px] text-slate-400 leading-relaxed mb-8 flex-grow">
                        {t('start.rentDesc')}
                      </p>

                      <div className="flex flex-wrap gap-4 mt-auto pt-6 border-t border-slate-700/50">
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                          <ShieldCheck className="w-4 h-4" />
                          <span>{t('start.riskChip')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
                          <Banknote className="w-4 h-4" />
                          <span>{t('start.revenueChip')}</span>
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
                        <span className={`bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-wider'}`}>
                          {t('start.ownerFundedBuild')}
                        </span>
                      </div>

                      <h4 className="text-2xl font-bold text-white mb-4">{t('start.personalTitle')}</h4>
                      
                      <p className="text-[14px] text-slate-400 leading-relaxed mb-8 flex-grow">
                        {t('start.personalDesc')}
                      </p>

                      <div className="mt-auto pt-6 border-t border-slate-800">
                        <span className={`text-xs font-bold text-slate-600 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-widest'}`}>
                          {t('start.traditionalPath')}
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
                      <h4 className="text-lg font-bold text-white">{t('start.stillExploring')}</h4>
                      <span className={`bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded text-xs ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-wider'}`}>
                        {t('start.exploreFirst')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {t('start.exploreDesc')}
                    </p>
                  </div>

                  <div className={`flex items-center gap-2 text-xs font-bold text-slate-500 group-hover:text-slate-300 transition-colors ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-widest'}`}>
                    <span>{t('start.noCommitment')}</span>
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
                  {t('start.back')}
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
                  <span className="tracking-tight">{t('start.nextPhase')}</span>
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
                  {t('start.aduType')}
                </h2>
                
                <p className="text-xl text-slate-400 font-light max-w-4xl mx-auto whitespace-nowrap">
                  {t('start.aduTypeDescA')} <span className="font-bold text-white">{t('start.aduTypeDescB')}</span> {t('start.aduTypeDescC')}
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
                  <div className={`absolute -top-4 left-8 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-600/40 ${language === 'zh' ? 'tracking-normal' : 'tracking-wider uppercase'}`}>
                    {t('start.bestFit')}
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
                        <h4 className="text-xl font-bold text-white mb-1">{t('start.detachedTitle')}</h4>
                        <p className="text-sm text-slate-400 font-medium">{t('start.detachedTagline')}</p>
                      </div>
                    </div>

                    {/* X-Factor section */}
                    <div className="pt-6 border-t border-slate-800 group-hover:border-slate-700 transition-colors">
                        <p className={`text-[10px] font-bold text-slate-500 mb-2 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-widest'}`}>{t('start.xFactor')}</p>
                        <p className={`text-sm font-medium text-slate-300 ${language === 'zh' ? '' : 'italic whitespace-nowrap'}`}>{t('start.detachedXFactor')}</p>
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
                        <h4 className="text-xl font-bold text-white mb-1">{t('start.attachedTitle')}</h4>
                        <p className="text-sm text-slate-400 font-medium">{t('start.attachedTagline')}</p>
                      </div>
                    </div>

                    {/* X-Factor section */}
                    <div className="pt-6 border-t border-slate-800 group-hover:border-slate-700 transition-colors">
                        <p className={`text-[10px] font-bold text-slate-500 mb-2 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-widest'}`}>{t('start.xFactor')}</p>
                        <p className={`text-sm font-medium text-slate-300 mb-4 ${language === 'zh' ? '' : 'italic whitespace-nowrap'}`}>{t('start.attachedXFactor')}</p>
                        
                        {/* Info note inside card */}
                        <div className={`flex items-center gap-1.5 text-[9px] font-bold text-slate-500 pt-2 border-t border-slate-800/50 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-widest italic'}`}>
                          <span>{t('start.reviewNote')}</span>
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
                  {t('start.back')}
                </motion.button>

                {/* Enter Design Studio Button */}
                <motion.button
                  onClick={() => onComplete(selectedGoal)}
                  disabled={!selectedTypology}
                  className={`group relative inline-flex items-center gap-3 px-12 py-5 rounded-2xl font-bold text-lg transition-all ${
                    selectedTypology
                      ? 'bg-blue-600 text-white hover:bg-white hover:text-blue-600'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                  whileHover={selectedTypology ? { scale: 1.05 } : {}}
                  whileTap={selectedTypology ? { scale: 0.95 } : {}}
                >
                  <span>{t('start.enterStudio')}</span>
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
                <h3 className="text-2xl font-bold text-white">{t('start.nycTitle')}</h3>
                <p className="text-slate-400 leading-relaxed">{t('start.nycBody')}</p>
                <p className="text-sm text-slate-500">{t('start.nycHint')}</p>
              </div>

              {/* Close Button */}
              <motion.button
                onClick={() => setShowNYWarning(false)}
                className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-xl font-bold transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {t('start.nycGotIt')}
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
                     <span className={`text-[10px] font-bold mb-1 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-widest'}`}>{t('start.footer.coverage')}</span>
                     <span className="text-xs font-bold">{t('start.footer.nationalService')}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className={`text-[10px] font-bold mb-1 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-widest'}`}>{t('start.footer.zoning')}</span>
                     <span className="text-xs font-bold">{t('start.footer.autoCheck')}</span>
                  </div>
               </div>
               
               <div className={`flex items-center gap-6 text-[10px] font-bold ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-widest'}`}>
                  <span>{t('start.footer.terms')}</span>
                  <div className="w-1 h-1 bg-slate-700 rounded-full" />
                  <span>{t('start.footer.privacy')}</span>
                  <div className="w-1 h-1 bg-slate-700 rounded-full" />
                  <span>© 2026 XHOMES.AI</span>
               </div>
            </div>
        </div>
      )}
      </div>

      {showFeasibilityPreview && (
        <div className="fixed inset-0 z-[60] bg-white">
          <button
            type="button"
            onClick={() => setShowFeasibilityPreview(false)}
            className="absolute top-4 right-4 z-[70] w-10 h-10 rounded-xl bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-full h-full">
            <SiteFeasibility lookup={feasibilityLookup} variant="viewport" showViewToggle />
          </div>
        </div>
      )}

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
