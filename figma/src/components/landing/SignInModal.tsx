import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, ArrowRight, Github, Chrome } from 'lucide-react';
import { useI18n } from '../../i18n';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

export function SignInModal({ isOpen, onClose, onSignIn }: SignInModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t, language } = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      onSignIn();
    }, 1000);
  };

  const handleSocialLogin = (provider: string) => {
    setIsLoading(true);
    // Simulate social login
    setTimeout(() => {
      setIsLoading(false);
      onSignIn();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative"
            >
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">{t('auth.welcomeBack')}</h2>
                  <p className="text-slate-400">{t('auth.signInDesc')}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className={`text-xs font-bold text-slate-500 ml-1 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-wider'}`}>{t('auth.email')}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-xs font-bold text-slate-500 ml-1 ${language === 'zh' ? 'tracking-normal' : 'uppercase tracking-wider'}`}>{t('auth.password')}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-sky-500 transition-colors" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {t('auth.signIn')} <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className={`bg-slate-900 px-2 text-slate-500 ${language === 'zh' ? '' : 'uppercase'}`}>{t('auth.orContinueWith')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-8">
                  <button 
                    onClick={() => handleSocialLogin('google')}
                    className="flex items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 hover:border-slate-600"
                  >
                    <Chrome className="w-5 h-5 text-white" />
                  </button>
                  <button 
                    onClick={() => handleSocialLogin('apple')}
                    className="flex items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 hover:border-slate-600"
                  >
                    {/* Apple Logo SVG */}
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.29-.93 3.93-.93.62 0 1.29.13 1.85.39-.77 1.13-1.35 3.04-1.35 4.87 0 3.73 3.33 4.98 3.44 5.04-.15.35-.37.95-.58 1.48-.55 1.44-1.38 2.62-2.37 3.38zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.16 2.22-1.9 4.14-3.74 4.25z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleSocialLogin('github')}
                    className="flex items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 hover:border-slate-600"
                  >
                    <Github className="w-5 h-5 text-white" />
                  </button>
                </div>

                <p className="text-center mt-8 text-xs text-slate-500">
                  {t('auth.agreePrefix')}{' '}
                  <a href="#" className="underline hover:text-slate-400">{t('auth.termsOfService')}</a>{' '}
                  {t('auth.and')}{' '}
                  <a href="#" className="underline hover:text-slate-400">{t('auth.privacyPolicy')}</a>.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
