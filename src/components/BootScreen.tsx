import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronRight,
  Wifi,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import CinematicBackground from './CinematicBackground';
import {
  runIntelligentInitialization,
  AppInitProgress,
  INITIALIZATION_STAGES,
  InitStage
} from '../services/appInitializer';
import OfflineScreen from './OfflineScreen';
import SlowConnectionScreen from './SlowConnectionScreen';

interface BootScreenProps {
  onComplete: () => void;
}

// Stage task action headers for the live readout above the progress bar
const STAGE_ACTION_LABELS: Record<string, string> = {
  SYS_CORE_INIT: 'INITIALIZING MARSNAV SYSTEMS...',
  HW_AUDIT: 'PROFILING HARDWARE & GPU CAPABILITIES...',
  RENDER_ENGINE: 'CALIBRATING PLANETARY 3D RENDERER...',
  TEX_SYNTHESIS: 'SYNTHESIZING MARTIAN TERRAIN TEXTURES...',
  TERRAIN_INTEL: 'CALIBRATING TERRAIN INTELLIGENCE & DEM KERNELS...',
  NET_TELEMETRY: 'VERIFYING DATA & TELEMETRY CONNECTIONS...',
  NAV_ENGINE: 'INITIALIZING ROVER NAVIGATION ENGINES...',
  WORKSPACE_CACHE: 'FINALIZING MISSION WORKSPACE CACHE...'
};

/**
 * MARSNAV Premium Cinematic Intro with Realistic Animated Martian Terrain
 * - Exact typography: Centered uppercase "MARSNAV" with subtle cyan accent
 * - Subtitle: "MARTIAN TERRAIN INTELLIGENCE & ROVER NAVIGATION"
 * - Massive half-visible photorealistic Mars planet dominating lower screen
 * - Real 8-stage interactive progress bar with stage inspector & genuine telemetry
 * - Unobtrusive real-time technical status badges
 */
export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const [initProgress, setInitProgress] = useState<AppInitProgress>({
    stageIndex: 0,
    stage: INITIALIZATION_STAGES[0],
    percent: 0,
    isComplete: false,
    deviceProfile: null,
    networkStatus: null
  });

  const [isExiting, setIsExiting] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showSlowModal, setShowSlowModal] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState<InitStage | null>(null);
  const hasCompletedRef = useRef(false);

  const handleFinish = () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 600);
  };

  // Keyboard shortcut listener to bypass instantaneously
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cinematic staggered text reveals
  useEffect(() => {
    const t1 = setTimeout(() => setTitleVisible(true), 200);
    const t2 = setTimeout(() => setSubtitleVisible(true), 550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Run the genuine 8-stage initialization
  useEffect(() => {
    let cancelled = false;

    const startInit = async () => {
      try {
        const { networkStatus } = await runIntelligentInitialization((p) => {
          if (!cancelled) {
            setInitProgress(p);
          }
        });

        if (cancelled) return;

        // Inspect network health
        if (networkStatus && !networkStatus.isOnline) {
          setShowOfflineModal(true);
          return;
        }

        if (networkStatus && networkStatus.state === 'SLOW_CONNECTION' && (networkStatus.latencyMs || 0) > 3000) {
          setShowSlowModal(true);
          return;
        }

        // Nominal complete, brief pause to view completed state
        setTimeout(() => {
          if (!cancelled && !hasCompletedRef.current) {
            handleFinish();
          }
        }, 750);
      } catch (err) {
        console.error('Initialization notice:', err);
        setTimeout(() => {
          if (!cancelled) handleFinish();
        }, 800);
      }
    };

    startInit();

    return () => {
      cancelled = true;
    };
  }, []);

  // Offline fallback screen
  if (showOfflineModal) {
    return (
      <OfflineScreen
        onContinueOffline={() => {
          setShowOfflineModal(false);
          handleFinish();
        }}
      />
    );
  }

  // Slow network screen
  if (showSlowModal) {
    return (
      <SlowConnectionScreen
        onContinue={() => {
          setShowSlowModal(false);
          handleFinish();
        }}
      />
    );
  }

  const { percent, stage, stageIndex, deviceProfile, networkStatus } = initProgress;
  const currentActionLabel = STAGE_ACTION_LABELS[stage.id] || 'INITIALIZING MARSNAV SYSTEMS...';

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#030105] select-none overflow-hidden transition-all duration-700 ease-in-out ${
        isExiting ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      role="region"
      aria-label="MARSNAV Software Loading Experience"
    >
      {/* 3D Photorealistic Mars Planet & Space Background */}
      <CinematicBackground mode="horizon" />

      {/* Top Header: MARSNAV & System Subtitle */}
      <header className="absolute top-8 sm:top-12 md:top-16 left-0 right-0 flex flex-col items-center pointer-events-none z-20 px-4 text-center">
        {/* MARSNAV Heading */}
        <h1
          className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extralight tracking-[0.22em] sm:tracking-[0.28em] text-white uppercase font-sans select-none transition-all duration-1000 ease-out pl-[0.22em] sm:pl-[0.28em] ${
            titleVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-98'
          }`}
          style={{
            textShadow: '0 0 40px rgba(255, 92, 54, 0.32), 0 2px 24px rgba(255, 255, 255, 0.2)'
          }}
        >
          MARS<span className="text-cyan-400 font-normal drop-shadow-[0_0_25px_rgba(34,211,238,0.6)]">NAV</span>
        </h1>

        {/* Subtitle */}
        <p
          className={`mt-2 sm:mt-3 md:mt-3.5 text-[10px] sm:text-xs md:text-sm font-semibold tracking-[0.34em] sm:tracking-[0.42em] text-cyan-300/85 uppercase font-sans select-none transition-all duration-1000 ease-out pl-[0.34em] sm:pl-[0.42em] ${
            subtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{
            textShadow: '0 0 20px rgba(34, 211, 238, 0.4)'
          }}
        >
          MARTIAN TERRAIN INTELLIGENCE &amp; ROVER NAVIGATION
        </p>

        {/* Real Technical Status Badges */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
          <div className="px-2.5 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md text-[9px] sm:text-[10px] font-mono text-slate-300 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-300 font-semibold">MARSNAV ORBITAL SYS:</span>
            <span>v4.4 NOMINAL</span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md text-[9px] sm:text-[10px] font-mono text-slate-300 flex items-center space-x-1.5">
            <Cpu className="w-2.5 h-2.5 text-orange-400" />
            <span className="text-slate-400">RENDER:</span>
            <span>
              {deviceProfile ? `WEBGL2 • TIER ${deviceProfile.tier}` : 'PBR PIPELINE'}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md text-[9px] sm:text-[10px] font-mono text-slate-300 flex items-center space-x-1.5">
            <Layers className="w-2.5 h-2.5 text-cyan-400" />
            <span className="text-slate-400">TERRAIN:</span>
            <span>HiRISE &amp; MOLA DEM</span>
          </div>

          <div
            className={`px-2.5 py-1 rounded-full bg-black/50 border backdrop-blur-md text-[9px] sm:text-[10px] font-mono flex items-center space-x-1.5 ${
              networkStatus?.isOnline
                ? 'border-emerald-500/30 text-emerald-300'
                : 'border-amber-500/30 text-amber-300'
            }`}
          >
            <Wifi className="w-2.5 h-2.5" />
            <span>
              {networkStatus?.isOnline
                ? `NET: ${networkStatus.latencyMs ? `${networkStatus.latencyMs}ms` : 'NOMINAL'}`
                : 'OFFLINE MODE'}
            </span>
          </div>
        </div>
      </header>

      {/* Lower Interactive Loading Section */}
      <footer className="absolute bottom-6 sm:bottom-8 md:bottom-10 left-0 right-0 flex flex-col items-center pointer-events-auto z-20 px-4 sm:px-6">
        <div className="w-full max-w-xl bg-slate-950/75 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-[0_12px_45px_rgba(0,0,0,0.8)]">
          {/* Active Task Header & Large Readable Percentage */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-2 min-w-0 pr-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
              <div className="truncate">
                <span className="text-white font-mono font-semibold text-xs tracking-wider uppercase">
                  {currentActionLabel}
                </span>
              </div>
            </div>
            <div className="flex items-baseline space-x-1 shrink-0 font-mono">
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-[#FF5A36] bg-clip-text text-transparent">
                {percent}
              </span>
              <span className="text-xs text-slate-400 font-semibold">%</span>
            </div>
          </div>

          {/* Subsystem Detail Description */}
          <p className="text-[11px] text-slate-400 font-mono mb-3 truncate">
            {stage.detail}
          </p>

          {/* Wide Animated Progress Bar */}
          <div className="relative w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5 mb-3.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-[#FF5A36] transition-all duration-200 ease-out relative overflow-hidden shadow-[0_0_16px_rgba(255,90,54,0.7)]"
              style={{ width: `${percent}%` }}
            >
              {/* Animated Light Traveling Across Progress */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_2s_infinite]" />
              {/* Pulse glow on the leading edge */}
              <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/90 blur-[2px]" />
            </div>
          </div>

          {/* 8-Stage Interactive Status Indicators */}
          <div className="grid grid-cols-8 gap-1.5 mb-3">
            {INITIALIZATION_STAGES.map((s, idx) => {
              const isCompleted = idx < stageIndex || (idx === stageIndex && percent >= s.targetPercent);
              const isActive = idx === stageIndex && percent < s.targetPercent;
              const isSelected = selectedStage?.id === s.id;

              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStage(isSelected ? null : s)}
                  onMouseEnter={() => setSelectedStage(s)}
                  className={`group relative h-2 rounded-full transition-all cursor-pointer ${
                    isCompleted
                      ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                      : isActive
                      ? 'bg-gradient-to-r from-amber-400 to-[#FF5A36] animate-pulse shadow-[0_0_10px_rgba(255,90,54,0.6)]'
                      : 'bg-white/10 hover:bg-white/20'
                  } ${isSelected ? 'ring-2 ring-white/80' : ''}`}
                  title={`${s.label} (${isCompleted ? 'Completed' : isActive ? 'Active' : 'Pending'})`}
                  aria-label={`Stage ${idx + 1}: ${s.label}`}
                />
              );
            })}
          </div>

          {/* Interactive Stage Inspector Card (Revealed on Click or Hover) */}
          {selectedStage && (
            <div className="mb-3 p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs font-mono transition-all animate-fadeIn">
              <div className="flex items-center justify-between text-cyan-300 font-semibold mb-1">
                <div className="flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>{selectedStage.label}</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Target: {selectedStage.targetPercent}%
                </span>
              </div>
              <p className="text-[11px] text-slate-300">{selectedStage.detail}</p>
            </div>
          )}

          {/* Footer Controls & Real-Time Status */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400">
              <Activity className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">
                STAGE {stageIndex + 1} OF 8: {stage.id}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-mono text-slate-400/80 hidden sm:inline">
                [ESC / SPACE TO SKIP]
              </span>
              <button
                onClick={handleFinish}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white font-mono text-xs tracking-wider transition-all cursor-pointer border border-cyan-500/30 flex items-center space-x-1.5 active:scale-95 shadow-sm"
              >
                <span>ENTER MISSION</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#FF5A36]" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BootScreen;
