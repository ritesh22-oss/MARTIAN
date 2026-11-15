import React, { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import type { OrbitTourStep } from '../../config/orbitTourConfig';
import type { OrbitMood } from '../../context/OnboardingContext';
import { OrbitRobot } from './OrbitRobot';
import { GuidedTourProgress } from './GuidedTourProgress';

interface OrbitDialogueProps {
  step: OrbitTourStep;
  currentStepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  robotMood: OrbitMood;
  isTransitioning: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export const OrbitDialogue: React.FC<OrbitDialogueProps> = ({
  step,
  currentStepIndex,
  totalSteps,
  targetRect,
  robotMood,
  isTransitioning,
  onPrev,
  onNext,
  onSkip,
  onClose,
}) => {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;

  // Compute non-overlapping floating position beside the highlighted sidebar element
  const cardPositionStyle = useMemo<React.CSSProperties>(() => {
    const isNarrow = viewport.width < 680;
    const cardWidth = Math.min(410, viewport.width - 24);
    const estimatedCardHeight = 310;

    if (isNarrow || !targetRect || targetRect.width === 0) {
      // On narrow mobile screens, anchor cleanly at bottom-right/center away from top/mid sidebar highlight if needed
      const highlightInBottomHalf = targetRect ? targetRect.top > viewport.height * 0.52 : false;
      return highlightInBottomHalf
        ? {
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${cardWidth}px`,
          }
        : {
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${cardWidth}px`,
          };
    }

    const desiredLeft = targetRect.right + 22;
    const maxLeft = Math.max(16, viewport.width - cardWidth - 20);
    const left = Math.min(desiredLeft, maxLeft);

    const targetCenterY = targetRect.top + targetRect.height / 2;
    const rawTop = targetCenterY - estimatedCardHeight / 2;
    const clampedTop = Math.max(16, Math.min(rawTop, viewport.height - estimatedCardHeight - 16));

    return {
      left: `${left}px`,
      top: `${clampedTop}px`,
      width: `${cardWidth}px`,
    };
  }, [targetRect, viewport]);

  const formattedStepNum = String(step.stepNumber).padStart(2, '0');

  return (
    <div
      className="fixed z-[85] transition-all duration-200 ease-out pointer-events-auto"
      style={cardPositionStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="orbit-dialogue-title"
    >
      <div className="relative bg-[#0B1020]/96 backdrop-blur-xl border border-orange-500/40 rounded-2xl shadow-[0_20px_70px_rgba(0,0,0,0.8)] text-slate-100 overflow-hidden">
        {/* Top calibrated accent strip */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400" />

        {/* Pointer chevron on desktop pointing toward sidebar highlight */}
        {viewport.width >= 680 && targetRect && (
          <div
            className="hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rotate-45 bg-[#0B1020] border-l border-b border-orange-500/40"
            aria-hidden="true"
          />
        )}

        <div className="p-5 space-y-4">
          {/* Header: Animated ORBIT + Progress + Close */}
          <div className="flex items-start gap-3">
            <OrbitRobot
              mood={isTransitioning ? 'thinking' : robotMood}
              lookDirection="left"
              size="sm"
            />

            <div className="flex-1 min-w-0 pt-0.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-cyan-400 uppercase">
                  ORBIT // MISSION GUIDE
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  title="Close Guided Tour"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <GuidedTourProgress
                currentStepNumber={step.stepNumber}
                totalSteps={totalSteps}
                sectionGroup={step.sectionGroup}
              />
            </div>
          </div>

          {/* Step Heading & Dialogue Copy */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <h3
              id="orbit-dialogue-title"
              className="text-sm sm:text-base font-bold tracking-wide text-white flex items-center gap-2"
            >
              <span className="text-orange-400 font-mono text-xs">STEP {formattedStepNum}</span>
              <span className="text-slate-600">—</span>
              <span className="truncate">{step.title}</span>
            </h3>

            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              {step.dialogue}
            </p>
          </div>

          {/* Footer Controls */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800/70">
            <button
              type="button"
              onClick={onSkip}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-200 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={isFirst}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-colors ${
                  isFirst
                    ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={onNext}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-orange-950/40 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span>{isLast ? 'Finish' : 'Next'}</span>
                {isLast ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrbitDialogue;
