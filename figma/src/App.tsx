import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { GlobalHeader } from './components/shared/GlobalHeader';
import { StartPage } from './components/landing/StartPage';
import { BrandFeatures } from './components/landing/BrandFeatures';
import { DesignStudio } from './components/studio/DesignStudio';
import { ModelsPage } from './components/studio/ModelsPage';
import { ServicesPage } from './components/studio/ServicesPage';
import { FinanceModule } from './components/studio/FinanceModule';
import { AboutXBuild } from './components/landing/AboutXBuild';
import { useI18n } from './i18n';

export default function App() {
  const { t } = useI18n();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('home');
  const [focusInput, setFocusInput] = useState(false);
  const [startPageState, setStartPageState] = useState('initial');
  const [resetKey, setResetKey] = useState(0);

  const handleSignIn = () => {
    setIsAuthenticated(true);
    // Reset to default studio view
    setCurrentRoute('project'); 
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setCurrentRoute('home');
    setFocusInput(false);
  };

  const handleEducationCTA = () => {
    setCurrentRoute('home');
    // Force reset to trigger effect in StartPage
    setFocusInput(false);
    setTimeout(() => {
        setFocusInput(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 10);
  };

  // Authenticated State (Product Mode)
  if (isAuthenticated) {
     return <DesignStudio onSignOut={handleSignOut} />;
  }

  // Unauthenticated State (Marketing Mode)
  return (
    <div className="min-h-screen font-sans bg-slate-950 text-slate-300 selection:bg-blue-500/30 relative">
      <GlobalHeader
        mode="marketing"
        theme="dark"
        activeTab={currentRoute}
        className="fixed top-0 left-0 w-full z-50"
        onTabChange={(tab) => {
            // Map header clicks to routes
            if (['models', 'how-it-works', 'earn', 'about'].includes(tab)) {
                setCurrentRoute(tab);
            } else if (tab === 'home') {
                setCurrentRoute('home');
                setFocusInput(false);
                setResetKey(prev => prev + 1);
                setStartPageState('initial');
            }
        }}
        isAuthenticated={false}
        onSignIn={handleSignIn}
        onLogoClick={() => {
            setCurrentRoute('home');
            setFocusInput(false);
            setResetKey(prev => prev + 1);
            setStartPageState('initial');
        }}
      />

      <main>
        {currentRoute === 'home' && (
          <div className="animate-in fade-in duration-500">
            <StartPage 
              key={resetKey}
              onComplete={handleSignIn} 
              onStateChange={setStartPageState}
              shouldFocusInput={focusInput} 
            />
            {startPageState === 'initial' && (
              <>
                <BrandFeatures />
                <section className="py-32 bg-slate-950 text-center border-t border-white/5">
                    <div className="max-w-4xl mx-auto px-6 flex flex-col items-center">
                        <h2 className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tight">
                        {t('marketing.welcomeA')}
                        </h2>
                        <h2 className="text-5xl md:text-7xl font-light text-white mb-12 tracking-tight">
                        {t('marketing.welcomeB')}
                        </h2>
                        <button 
                        onClick={handleEducationCTA}
                        className="bg-white text-slate-950 px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-200 transition-colors inline-flex items-center gap-2"
                        >
                        {t('marketing.startBuild')} <ArrowUp className="w-5 h-5" />
                        </button>
                    </div>
                </section>
              </>
            )}
          </div>
        )}
        {currentRoute === 'models' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <ModelsPage theme="dark" isAuthenticated={false} onAction={handleEducationCTA} />
            </div>
        )}
        {currentRoute === 'how-it-works' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <ServicesPage theme="dark" onAction={handleEducationCTA} />
            </div>
        )}
        {currentRoute === 'earn' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <FinanceModule theme="dark" onAction={handleEducationCTA} />
            </div>
        )}
        {currentRoute === 'about' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
                <AboutXBuild onAction={handleEducationCTA} />
            </div>
        )}
      </main>
    </div>
  );
}
