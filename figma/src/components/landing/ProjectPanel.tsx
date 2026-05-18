import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderOpen, User, X } from 'lucide-react';

interface ProjectPanelProps {
  show: boolean;
  onClose: () => void;
  state: string;
  address: string;
  targetCity: { x: number; y: number; name: string } | null;
  isOwner: boolean | null;
  isPrimaryResidence: boolean | null;
  selectedGoal: string | null;
  selectedTypology: string | null;
}

export function ProjectPanel({
  show,
  onClose,
  state,
  address,
  targetCity,
  isOwner,
  isPrimaryResidence,
  selectedGoal,
  selectedTypology
}: ProjectPanelProps) {
  const getGoalLabel = (goal: string | null) => {
    if (!goal) return 'Not set';
    const labels: Record<string, string> = {
      rental: 'Rental Strategy',
      multigen: 'Multi-Gen Living',
      workspace: 'Work Space',
      leisure: 'Guest & Escape',
      notsure: 'Space to Imagine'
    };
    return labels[goal] || goal;
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-slate-950 border-l border-slate-800 z-50 overflow-y-auto"
          >
            <div className="p-8 space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-xl">My Project</h2>
                    <p className="text-xs text-slate-500">Live Progress Tracker</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center hover:border-slate-700 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Progress Overview */}
              <div className="space-y-4">
                <h3 className="text-sm uppercase tracking-wider text-slate-500">Project Progress</h3>
                
                {/* Progress Steps */}
                <div className="space-y-3">
                  {/* Step 1: Address */}
                  <div className="p-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">Address Verified</h4>
                        <p className="text-xs text-slate-400 mt-1 break-words">{address || 'Not set'}</p>
                        {targetCity && (
                          <p className="text-xs text-sky-400 mt-1">📍 {targetCity.name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Context */}
                  <div className={`p-4 backdrop-blur-xl border rounded-xl ${
                    state === 'ready' || state === 'typology'
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-slate-900/30 border-slate-800/50'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        state === 'ready' || state === 'typology' ? 'bg-sky-500' : 'bg-slate-800'
                      }`}>
                        {state === 'ready' || state === 'typology' ? (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-xs text-slate-600 font-bold">2</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold text-sm ${
                          state === 'ready' || state === 'typology' ? 'text-white' : 'text-slate-600'
                        }`}>Context & Identity</h4>
                        {(state === 'ready' || state === 'typology') && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-slate-400">
                              <span className="text-slate-500">Ownership:</span>{' '}
                              {isOwner === true ? (
                                <span className="text-blue-400">Owner</span>
                              ) : isOwner === false ? (
                                <span className="text-orange-400">Non-owner</span>
                              ) : (
                                <span className="text-slate-600">Not set</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400">
                              <span className="text-slate-500">Property:</span>{' '}
                              {isPrimaryResidence === true ? (
                                <span className="text-blue-400">Primary</span>
                              ) : isPrimaryResidence === false ? (
                                <span className="text-orange-400">Investment</span>
                              ) : (
                                <span className="text-slate-600">Not set</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400">
                              <span className="text-slate-500">Goal:</span>{' '}
                              {selectedGoal ? (
                                <span className="text-sky-400">{getGoalLabel(selectedGoal)}</span>
                              ) : (
                                <span className="text-slate-600">Not set</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Typology */}
                  <div className={`p-4 backdrop-blur-xl border rounded-xl ${
                    state === 'typology'
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-slate-900/30 border-slate-800/50'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        state === 'typology' && selectedTypology ? 'bg-sky-500' : state === 'typology' ? 'bg-blue-500/50' : 'bg-slate-800'
                      }`}>
                        {state === 'typology' && selectedTypology ? (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className={`text-xs font-bold ${state === 'typology' ? 'text-white' : 'text-slate-600'}`}>3</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold text-sm ${
                          state === 'typology' ? 'text-white' : 'text-slate-600'
                        }`}>Typology Selection</h4>
                        {selectedTypology && (
                          <p className="text-xs text-sky-400 mt-1 capitalize">
                            {selectedTypology === 'detached' && 'Detached ADU'}
                            {selectedTypology === 'attached' && 'Attached ADU'}
                            {selectedTypology === 'conversion' && 'Interior ADU'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Profile Section */}
              <div className="space-y-4">
                <h3 className="text-sm uppercase tracking-wider text-slate-500">Profile Information</h3>
                
                <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">Project Owner</h4>
                      <p className="text-xs text-slate-500">Active Session</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-800">
                    <div className="flex justify-between text-xs gap-4">
                      <span className="text-slate-500 shrink-0">Location</span>
                      <span className="text-slate-300 text-right">{targetCity?.name || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between text-xs gap-4">
                      <span className="text-slate-500 shrink-0">Address</span>
                      <span className="text-slate-300 text-right truncate">{address || 'Not set'}</span>
                    </div>
                    <div className="flex justify-between text-xs gap-4">
                      <span className="text-slate-500 shrink-0">Status</span>
                      <span className="text-sky-400">
                        {state === 'typology' ? 'Selecting Typology' : state === 'ready' ? 'Setting Context' : 'In Progress'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs gap-4">
                      <span className="text-slate-500 shrink-0">Completion</span>
                      <span className="text-white font-bold">
                        {state === 'typology' && selectedTypology ? '100%' : state === 'typology' ? '66%' : state === 'ready' ? '33%' : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Hint */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-slate-400 text-center">
                  💡 Complete all steps to enter the <span className="text-sky-400 font-semibold">Design Studio</span>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
