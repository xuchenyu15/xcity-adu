import React from 'react';
import { LogOut, User, Check } from 'lucide-react';
import logoImg from 'figma:asset/40642cc6a915787d4cd7d335bd5735be4239edc1.png';
import logoDark from 'figma:asset/40642cc6a915787d4cd7d335bd5735be4239edc1.png';
import studioLogo from 'figma:asset/927801a58617e03a2b71d9dc329dc83b38939418.png';
import { useI18n } from '../../i18n';

export interface Tab {
  id: string;
  label: string;
  status?: 'empty' | 'completed' | 'disabled';
}

interface GlobalHeaderProps {
  mode?: 'marketing' | 'studio';
  theme?: 'dark' | 'light';
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAuthenticated: boolean;
  onSignIn?: () => void;
  onSignOut?: () => void;
  user?: { name: string; initials: string };
  language?: 'en' | 'zh';
  onLanguageChange?: (lang: 'en' | 'zh') => void;
  onLogoClick?: () => void;
  className?: string;
  projectTabs?: Tab[];
}

export function GlobalHeader({
  mode = 'marketing',
  theme = 'light',
  activeTab,
  onTabChange,
  isAuthenticated,
  onSignIn,
  onSignOut,
  user,
  language = 'en',
  onLanguageChange,
  onLogoClick,
  className = '',
  projectTabs
}: GlobalHeaderProps) {
  const i18n = useI18n();
  const currentLanguage = onLanguageChange ? language : i18n.language;
  const setLanguage = onLanguageChange ?? i18n.setLanguage;
  const t = i18n.t;
  const isDark = theme === 'dark';
  
  // Base Header Style
  const headerBg = isDark ? 'bg-[#020618]/90 backdrop-blur-md' : 'bg-white border-b border-slate-200';
  
  // Render Marketing Nav (Pill Style)
  const renderMarketingNav = () => (
    <nav className="flex items-center gap-1 p-1 rounded-full transition-all border shadow-sm backdrop-blur-md bg-white/10 border-white/5">
      {['models', 'how-it-works', 'earn', 'about'].map((tab) => {
         const labelKey = tab === 'models'
           ? 'header.models'
           : tab === 'how-it-works'
             ? 'header.howItWorks'
             : tab === 'earn'
               ? 'header.earn'
               : 'header.about';
         const isActive = activeTab === tab;
         
         return (
           <button
             key={tab}
             onClick={() => onTabChange(tab)}
             className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all duration-200 whitespace-nowrap outline-none focus:ring-2 focus:ring-slate-400/50 ${
               isActive 
                 ? (isDark ? "bg-white text-slate-900 shadow-lg" : "bg-slate-900 text-white shadow-md")
                 : (isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-white/60")
             }`}
           >
             {t(labelKey)}
           </button>
         );
      })}
    </nav>
  );

  // Render Studio Nav (Right-Aligned Decision Nav)
  const renderStudioNav = () => (
    <nav className="flex-1 flex justify-center items-center">
       <div className="flex items-center h-full">
          {projectTabs?.map((tab, idx) => {
             const isActive = activeTab === tab.id;
             const isCompleted = tab.status === 'completed';
             const isDisabled = tab.status === 'disabled';

             return (
               <div key={tab.id} className="flex items-center h-full">
                 {/* Connector line between tabs */}
                 {idx > 0 && (
                   <div className="w-8 h-px mx-1">
                     <div className={`h-full transition-colors ${
                       projectTabs[idx - 1]?.status === 'completed' 
                         ? 'bg-slate-900' 
                         : 'bg-slate-200'
                     }`} />
                   </div>
                 )}
                 <button
                   onClick={() => !isDisabled && onTabChange(tab.id)}
                   disabled={isDisabled}
                   className={`group relative h-full text-[13px] transition-all outline-none flex items-center gap-2.5 whitespace-nowrap ${
                      isDisabled 
                        ? 'text-slate-300 cursor-not-allowed' 
                        : isActive 
                          ? 'text-slate-900 cursor-pointer' 
                          : 'text-slate-400 hover:text-slate-600 cursor-pointer'
                   }`}
                 >
                   {/* Status Circle */}
                   <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all border shrink-0 ${
                       isCompleted 
                          ? 'bg-slate-900 border-slate-900' 
                          : isActive
                              ? 'bg-white border-slate-900 ring-1 ring-slate-900 ring-offset-0' 
                              : isDisabled
                                  ? 'bg-transparent border-slate-200' 
                                  : 'bg-transparent border-slate-300 group-hover:border-slate-400' 
                   }`}>
                       {isCompleted ? (
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                       ) : isActive ? (
                          <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                       ) : null}
                   </div>

                   <span className={`font-bold tracking-tight ${
                     isDisabled ? 'text-slate-300' : isActive ? 'text-slate-900' : ''
                   }`}>
                      {tab.label}
                   </span>
                 </button>
               </div>
             );
          })}
       </div>
    </nav>
  );

  return (
    <header className={`h-[72px] w-full grid grid-cols-3 items-center px-6 md:px-8 z-50 transition-colors fixed top-0 left-0 ${headerBg} ${className.replace('fixed top-0 left-0 w-full', '')}`}>
        {/* Left: Logo */}
        <div className="flex items-center justify-self-start">
            <button onClick={onLogoClick} className="flex items-center gap-3 hover:opacity-80 transition-opacity outline-none">
               <img 
                 src={isAuthenticated ? studioLogo : (isDark ? logoImg : logoDark)} 
                 alt="XHOMES" 
                 className="h-8 w-auto object-contain" 
               />
            </button>
        </div>

        {/* Center: Navigation */}
        <div className="justify-self-center flex justify-center w-full">
            {mode === 'marketing' ? renderMarketingNav() : renderStudioNav()}
        </div>

        {/* Far Right: Actions */}
        <div className="flex items-center gap-4 justify-self-end">
             {/* Language Toggle */}
             <div className={`flex rounded-lg p-1 gap-1 border transition-colors ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                 <button onClick={() => setLanguage('en')} className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${currentLanguage === 'en' ? (isDark ? 'bg-blue-600 text-white' : 'bg-white text-slate-900 shadow-sm') : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}>En</button>
                 <button onClick={() => setLanguage('zh')} className={`px-2 py-1 text-[10px] font-bold rounded transition-all ${currentLanguage === 'zh' ? (isDark ? 'bg-blue-600 text-white' : 'bg-white text-slate-900 shadow-sm') : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}`}>中</button>
             </div>
             
             <div className={`h-6 w-px mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />

             {!isAuthenticated ? (
                 <button onClick={onSignIn} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${isDark ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>{t('header.signIn')}</button>
             ) : (
                 <div className="relative group">
                    <button className={`flex items-center gap-3 pl-1 pr-1 py-1 rounded-full border transition-all outline-none ${isDark ? 'border-slate-700 bg-slate-900/60 text-white' : 'border-transparent hover:bg-slate-50'}`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white transition-all ${isDark ? 'bg-blue-600' : 'bg-slate-900 text-white'}`}>
                            {user?.initials || 'AC'}
                        </div>
                    </button>
                    {/* Avatar Menu */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 transform origin-top-right scale-95 group-hover:scale-100">
                        <div className="px-3 py-2 border-b border-slate-100 mb-1">
                            <p className="text-xs font-bold text-slate-900">{user?.name || 'User'}</p>
                            <p className="text-[10px] text-slate-500">Pro Account</p>
                        </div>
                        <div className="py-1">
                             <button onClick={() => onTabChange('overview')} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                {t('header.dashboard')}
                             </button>
                             <button onClick={() => onTabChange('settings')} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                                {t('header.accountSettings')}
                             </button>
                             <button onClick={onSignOut} className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors">
                                <LogOut className="w-3 h-3"/> {t('header.signOut')}
                             </button>
                        </div>
                    </div>
                 </div>
             )}
        </div>
    </header>
  );
}
