import React, { useEffect } from 'react';
import { Rocket, RotateCcw } from 'lucide-react';
import { OrbitRobot } from './OrbitRobot';

interface TourCompletionScreenProps {
  onStartExploring: () => void;
  onRevisitGuide: () => void;
}

export const TourCompletionScreen: React.FC<TourCompletionScreenProps> = ({
  onStartExploring,
  onRevisitGuide,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onStartExploring();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStartExploring]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#03060F]/84 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orbit-completion-heading"
    >
      <div className="relative w-full max-w-lg bg-[#0B1020]/96 border border-cyan-500/35 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden text-slate-100">
        {/* Top gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-orange-400 to-amber-500" />

        <div className="p-7 sm:p-8 flex flex-col items-center text-center space-y-5">
          <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-emerald-400 font-semibold">
            14 OF 14 MODULES BRIEFED // READY FOR OPERATIONS
          </div>

          <OrbitRobot mood="celebrating" lookDirection="center" size="lg" />

          <div className="space-y-3">
            <h2
              id="orbit-completion-heading"
              className="text-xl sm:text-2xl font-bold tracking-wide text-white uppercase"
            >
              MISSION ORIENTATION COMPLETE!
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              You&apos;re now familiar with the major MarsNav exploration systems. Your Mars
              exploration journey begins here. Explore the platform and discover the Red Planet!
            </p>
          </div>

          <div className="w-full pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onStartExploring}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-orange-950/50 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Rocket className="w-4 h-4" />
              <span>Start Exploring</span>
            </button>

            <button
              type="button"
              onClick={onRevisitGuide}
              className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Revisit Mission Guide</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourCompletionScreen;
