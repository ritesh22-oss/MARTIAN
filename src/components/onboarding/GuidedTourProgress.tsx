import React from 'react';

interface GuidedTourProgressProps {
  currentStepNumber: number;
  totalSteps: number;
  sectionGroup?: string;
}

export const GuidedTourProgress: React.FC<GuidedTourProgressProps> = ({
  currentStepNumber,
  totalSteps,
  sectionGroup,
}) => {
  const pct = Math.max(0, Math.min(100, (currentStepNumber / totalSteps) * 100));

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono tracking-[0.14em] uppercase">
        <span className="text-orange-400 font-bold tabular-nums">
          STEP {currentStepNumber} OF {totalSteps}
        </span>
        {sectionGroup && (
          <span className="text-cyan-400/90 font-semibold truncate">
            {sectionGroup}
          </span>
        )}
      </div>

      {/* Smooth Progress Bar */}
      <div className="h-1.5 w-full rounded-full bg-slate-800/90 border border-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(249,115,22,0.6)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default GuidedTourProgress;
