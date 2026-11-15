import React, { useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { OrbitRobot } from './OrbitRobot';

interface OrbitWelcomeScreenProps {
  onStart: () => void;
  onSkip: () => void;
}

export const OrbitWelcomeScreen: React.FC<OrbitWelcomeScreenProps> = ({
  onStart,
  onSkip,
}) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onSkip]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[#03060F]/82 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orbit-welcome-heading"
    >
      <div className="relative w-full max-w-lg bg-[#0B1020]/95 border border-orange-500/35 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.75)] overflow-hidden text-slate-100">
        {/* Top Mars-orange to cyan telemetry hairline */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400" />

        {/* Subtle close / skip top-right */}
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip Introduction"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-7 sm:p-8 flex flex-col items-center text-center space-y-5">
          {/* Telemetry eyebrow */}
          <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-cyan-400/90 font-semibold">
            ORBIT // MISSION ORIENTATION SYSTEM
          </div>

          {/* Animated ORBIT Character */}
          <OrbitRobot mood="happy" lookDirection="center" size="lg" />

          {/* Heading & Copy */}
          <div className="space-y-3">
            <h2
              id="orbit-welcome-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
            >
              Welcome to MarsNav, Explorer!
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
              Your journey across the Red Planet starts here. I&apos;m ORBIT, your mission guide.
              I&apos;ll introduce you to the tools that help explore Martian terrain, investigate
              scientific data, assess risks and plan safer exploration missions.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onStart}
              className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-orange-950/50 transition-all cursor-pointer active:scale-[0.98]"
            >
              <span>Start Mission Orientation</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Skip Introduction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrbitWelcomeScreen;
