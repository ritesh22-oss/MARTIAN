import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import CinematicBackground from './CinematicBackground';
import {
  runIntelligentInitialization,
  INITIALIZATION_STAGES
} from '../services/appInitializer';

interface BootScreenProps {
  onComplete: () => void;
}

/**
 * MARSNAV Full Cinematic NASA Mission Intro & Workstation Boot Sequence
 * 
 * Features:
 * - 3D WebGL Photorealistic Mars horizon & surface traversal
 * - Cinematic title reveal ("MARSNAV") & planetary subtitle
 * - Smooth 12-18 second progress interpolation tracking real asset preloading
 * - Shimmering specular reflection & orange glow inside the loading bar
 * - Single-execution keyboard/pointer entry trigger
 */
export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  // Animation Phase Steps (0: Approach, 1: Surface, 2: Reveal, 3: Cinematic Ready)
  const [hudStep, setHudStep] = useState(0);

  // Real Application Initialization Tracking
  const [realProgress, setRealProgress] = useState(0);
  const [isRealComplete, setIsRealComplete] = useState(false);

  // Displayed Progress Interpolated State (0 to 100%)
  const [displayedPercent, setDisplayedPercent] = useState(0);

  const realProgressRef = useRef(0);
  const isRealCompleteRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  const [isExiting, setIsExiting] = useState(false);
  const hasEnteredRef = useRef(false);

  // Single-Execution Entry Handler
  const enterApplication = useCallback(() => {
    if (hasEnteredRef.current) return;
    hasEnteredRef.current = true;
    setIsExiting(true);
    
    // Smooth cinematic forward transition into workstation
    setTimeout(() => {
      onComplete();
    }, 450);
  }, [onComplete]);

  // Keyboard shortcut listener attached while intro screen is active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypress if typing inside input fields
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
         target.tagName === 'TEXTAREA' ||
         target.tagName === 'SELECT' ||
         target.isContentEditable)
      ) {
        return;
      }

      // Preserve browser navigation & dev tools shortcuts
      if (e.key === 'F5' || e.key === 'F12' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        return;
      }

      e.preventDefault();
      enterApplication();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [enterApplication]);

  // Pointer/Click listener for full screen coverage
  useEffect(() => {
    const handlePointerDown = () => {
      enterApplication();
    };

    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    }, 120);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, [enterApplication]);

  // Cinematic Timeline Controller
  useEffect(() => {
    const t1 = setTimeout(() => setHudStep(1), 300);   // Surface transition
    const t2 = setTimeout(() => setHudStep(2), 800);   // Title reveal
    const t3 = setTimeout(() => setHudStep(3), 3200);  // Cinematic Ready sync

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Run Real Application Initialization Engine
  useEffect(() => {
    let cancelled = false;

    const startInit = async () => {
      try {
        await runIntelligentInitialization((p) => {
          if (!cancelled) {
            realProgressRef.current = p.percent;
            setRealProgress(p.percent);
            if (p.isComplete) {
              isRealCompleteRef.current = true;
              setIsRealComplete(true);
            }
          }
        });
      } catch (err) {
        console.warn('Initialization notice:', err);
        if (!cancelled) {
          realProgressRef.current = 100;
          isRealCompleteRef.current = true;
          setRealProgress(100);
          setIsRealComplete(true);
        }
      }
    };

    startInit();
    return () => {
      cancelled = true;
    };
  }, []);

  // Frame-Rate Independent Smooth Progress Interpolator (Fast & Smooth ~3.2 second pace)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updateProgress = (now: number) => {
      if (!startTimeRef.current) startTimeRef.current = now;
      const totalElapsedSec = (now - startTimeRef.current) / 1000;
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      // Fast cinematic floor duration: 3.2 seconds
      const CINEMATIC_DURATION = 3.2;
      const rawRatio = Math.min(1.0, totalElapsedSec / CINEMATIC_DURATION);
      
      // Smooth cubic ease-in-out curve
      const easedRatio =
        rawRatio < 0.5
          ? 2 * rawRatio * rawRatio
          : 1 - Math.pow(-2 * rawRatio + 2, 2) / 2;
      
      const cinematicCap = easedRatio * 100;

      let target: number;
      if (isRealCompleteRef.current) {
        // Real init complete: follow smooth curve up to 100%
        target = cinematicCap;
      } else {
        // Real init still running: never exceed real progress or 95% cap
        const currentReal = realProgressRef.current;
        target = Math.min(currentReal, Math.min(95, cinematicCap));
      }

      setDisplayedPercent((prev) => {
        const speed = 6.0;
        const next = prev + (target - prev) * Math.min(1.0, dt * speed);
        
        if (target >= 99.8 && next >= 99.2) {
          return 100;
        }
        return next;
      });

      animId = requestAnimationFrame(updateProgress);
    };

    animId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animId);
  }, []);

  const isWorkstationReady = (displayedPercent >= 99.5 && isRealComplete) || hudStep >= 3;

  return (
    <div
      onClick={enterApplication}
      className={`fixed inset-0 z-50 bg-[#030105] select-none overflow-hidden cursor-pointer transition-all duration-500 ease-out ${
        isExiting ? 'opacity-0 scale-[1.04] blur-xs pointer-events-none' : 'opacity-100 scale-100'
      }`}
      role="region"
      aria-label="MARSNAV Cinematic Mission Intro - Click anywhere or press any key to enter"
    >
      <style>{`
        @keyframes marsBarShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>

      {/* 1. Photorealistic 3D Mars Planet & Rover Surface Traversal */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <CinematicBackground mode="horizon" showRover={hudStep >= 1} glowOpacity={0.8} />
      </div>

      {/* 2. Scanning Lines & Vignette Contrast Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
      <div className="absolute inset-0 pointer-events-none z-10 opacity-10 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.8)_51%)] bg-[length:100%_4px]" />

      {/* 3. MARSNAV TITLE, SUBTITLE & CINEMATIC LOADING BAR (Centered) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-6 text-center pointer-events-none">
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out ${
            hudStep >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
          }`}
        >
          {/* Main MARSNAV Title */}
          <div className="relative group">
            {/* Ambient Radial Glow */}
            <div
              className="absolute -inset-12 bg-gradient-to-r from-orange-600/20 via-red-500/25 to-amber-600/20 rounded-full blur-3xl opacity-75 animate-pulse"
              style={{ animationDuration: '4s' }}
            />

            <h1 className="relative text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-[0.22em] sm:tracking-[0.28em] text-white uppercase font-sans select-none pl-[0.22em] sm:pl-[0.28em]">
              MARS
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-500 to-red-400 drop-shadow-[0_0_35px_rgba(255,90,54,0.65)] font-black">
                NAV
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="mt-3 sm:mt-5 text-xs sm:text-sm md:text-base font-semibold tracking-[0.38em] sm:tracking-[0.45em] text-orange-200/90 uppercase font-sans select-none pl-[0.38em] sm:pl-[0.45em] drop-shadow-[0_2px_12px_rgba(255,80,40,0.4)]">
            PLANETARY EXPLORATION &amp; ROVER NAVIGATION
          </p>

          {/* Decorative Laser Line */}
          <div className="mt-5 sm:mt-6 flex items-center justify-center space-x-3 w-full max-w-xs sm:max-w-sm">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-orange-500/50 to-orange-400/80" />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(255,140,50,0.9)] animate-ping" style={{ animationDuration: '2.5s' }} />
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-orange-500/50 to-orange-400/80" />
          </div>

          {/* 4. ONE SINGLE SLIM HORIZONTAL ANIMATED LOADING BAR */}
          <div className="mt-6 sm:mt-8 w-full max-w-xs sm:max-w-md flex flex-col items-center pointer-events-auto">
            <div className="relative w-full h-2 bg-slate-950/90 rounded-full border border-orange-500/35 overflow-hidden shadow-[0_0_16px_rgba(255,90,54,0.45)]">
              {/* Animated Progress Fill */}
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-orange-600 via-amber-400 to-orange-500 shadow-[0_0_12px_rgba(255,140,50,0.9)] transition-all duration-75 ease-out overflow-hidden"
                style={{ width: `${Math.min(100, Math.max(0, displayedPercent))}%` }}
              >
                {/* Moving Light Reflection / Shimmer Sweep */}
                <div
                  className="absolute inset-0 w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.65)_50%,transparent_100%)]"
                  style={{
                    animation: 'marsBarShimmer 2.2s infinite linear'
                  }}
                />
              </div>
            </div>
            
            {/* Minimal Progress Readout */}
            <div className="mt-2.5 text-[10px] font-mono tracking-[0.2em] text-slate-300/80 uppercase select-none">
              {displayedPercent >= 99.5
                ? 'SYSTEM READY • 100%'
                : `PRELOADING ASSETS • ${Math.floor(displayedPercent)}%`}
            </div>
          </div>
        </div>
      </div>

      {/* 5. WORKSTATION READY INTERACTION BUTTON & PROMPT (Bottom) */}
      <div
        className={`absolute bottom-8 sm:bottom-12 left-0 right-0 z-30 flex flex-col items-center justify-center pointer-events-auto transition-all duration-700 delay-100 ease-out ${
          isWorkstationReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            enterApplication();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              enterApplication();
            }
          }}
          aria-label="Initialize MARSNAV Workstation"
          className="group relative px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-950/90 via-slate-950/90 to-orange-950/90 hover:from-orange-600 hover:to-red-600 border border-orange-500/50 hover:border-orange-400 text-slate-100 hover:text-white font-mono text-xs sm:text-sm tracking-[0.25em] transition-all duration-300 shadow-[0_0_35px_rgba(255,90,54,0.35)] hover:shadow-[0_0_40px_rgba(255,90,54,0.7)] flex items-center space-x-3 cursor-pointer active:scale-95 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-black"
        >
          <span className="uppercase font-bold pl-1">INITIALIZE WORKSTATION</span>
          <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1.5 transition-transform" />
        </button>

        <span className="mt-3 text-[10px] font-mono tracking-[0.2em] text-orange-200/80 uppercase animate-pulse">
          PRESS ANY KEY OR CLICK TO ENTER
        </span>
      </div>
    </div>
  );
};

export default BootScreen;
