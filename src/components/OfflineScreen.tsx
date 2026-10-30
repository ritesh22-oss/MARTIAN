import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Compass, ShieldCheck, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import CinematicBackground from './CinematicBackground';

interface OfflineScreenProps {
  onContinueOffline: () => void;
}

/**
 * MARSNAV Premium Cinematic Offline Experience
 * - Fullscreen 3D Mars background (Horizon Mode)
 * - Identical typography to Boot Screen
 * - Detailed telemetry status panel
 * - Real health-check retry logic
 */
export const OfflineScreen: React.FC<OfflineScreenProps> = ({ onContinueOffline }) => {
  const network = useNetworkStatus();
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryMessage('Pinging MarsNav ground station telemetry endpoint...');
    try {
      const result = await network.retry();
      if (result.isOnline) {
        setRetryMessage('Deep Space Telemetry connection restored! Reconnecting...');
        setTimeout(() => {
          onContinueOffline();
        }, 1200);
      } else {
        setRetryMessage('Ground station unreachable. Local autonomous mode remains active.');
      }
    } catch {
      setRetryMessage('Link attempt timed out. Check hardware network interface.');
    } finally {
      setTimeout(() => setRetrying(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#030105] select-none overflow-hidden font-sans">
      {/* 3D Photorealistic Mars Planet Background */}
      <CinematicBackground mode="horizon" ambientColor="rgba(239, 68, 68, 0.15)" />

      {/* Top Header: MARSNAV Branding (Same as Boot Screen) */}
      <header className={`absolute top-8 sm:top-12 left-0 right-0 flex flex-col items-center pointer-events-none z-20 px-4 text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <h1
          className="text-5xl sm:text-6xl md:text-7xl font-extralight tracking-[0.22em] text-white uppercase pl-[0.22em]"
          style={{ textShadow: '0 0 40px rgba(239, 68, 68, 0.35)' }}
        >
          MARS<span className="text-cyan-400 font-normal">NAV</span>
        </h1>
        <p className="mt-2 text-[10px] sm:text-xs font-semibold tracking-[0.34em] text-cyan-300/85 uppercase pl-[0.34em]">
          MARTIAN TERRAIN INTELLIGENCE &amp; ROVER NAVIGATION
        </p>
      </header>

      {/* Central Status Console */}
      <div className={`absolute inset-0 flex items-center justify-center p-4 z-30 transition-all duration-1000 delay-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="w-full max-w-2xl bg-slate-950/80 border border-red-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
          {/* Signal Lost Header */}
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-white/5">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <WifiOff className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <h2 className="text-sm font-mono font-bold tracking-widest text-red-500 uppercase">
                  TELEMETRY SIGNAL LOST
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-tight">Ground Station Connection Severed</p>
            </div>
          </div>

          {/* Main Message */}
          <div className="space-y-4 mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
              Operating in Autonomous Offline Mode
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
              MarsNav has lost contact with the mission telemetry backend. Your current session has transitioned to <strong>Local Autonomous Control</strong>.
            </p>
          </div>

          {/* Functional Capability Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-2xl p-4">
              <div className="flex items-center space-x-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Active Capabilities</span>
              </div>
              <ul className="space-y-2 text-[11px] text-slate-300 font-medium">
                <li className="flex items-center space-x-2 opacity-90">
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span>3D Terrain Exploration</span>
                </li>
                <li className="flex items-center space-x-2 opacity-90">
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span>A* Pathfinding & Planning</span>
                </li>
                <li className="flex items-center space-x-2 opacity-90">
                  <div className="w-1 h-1 rounded-full bg-emerald-400" />
                  <span>Risk & Hazard Simulations</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-950/10 border border-amber-500/20 rounded-2xl p-4">
              <div className="flex items-center space-x-2 text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-3">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Suspended Link</span>
              </div>
              <ul className="space-y-2 text-[11px] text-slate-400 font-medium">
                <li className="flex items-center space-x-2 opacity-60">
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  <span>Live NASA Feed Updates</span>
                </li>
                <li className="flex items-center space-x-2 opacity-60">
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  <span>Cloud Mission Sync</span>
                </li>
                <li className="flex items-center space-x-2 opacity-60">
                  <div className="w-1 h-1 rounded-full bg-amber-500" />
                  <span>External Gemini Intelligence</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Retry Feedback Indicator */}
          {retryMessage && (
            <div className="mb-6 p-3 rounded-xl bg-slate-900/50 border border-white/5 flex items-center space-x-3 text-xs font-mono">
              <div className={`w-1.5 h-1.5 rounded-full ${retrying ? 'bg-cyan-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-slate-300">{retryMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={onContinueOffline}
              className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center space-x-2 shadow-[0_10px_30px_rgba(8,145,178,0.3)] transition-all cursor-pointer active:scale-95 group"
            >
              <Compass className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              <span>Launch Offline Mission</span>
              <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
            </button>

            <button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{retrying ? 'Probing...' : 'Retry Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer System Status */}
      <footer className="absolute bottom-6 left-0 right-0 flex justify-center z-20 px-6">
        <div className="px-4 py-2 rounded-full bg-black/40 border border-white/5 backdrop-blur-md text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span>Link: SEVERED</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <span>System: Autonomous Onboard</span>
          <div className="w-px h-3 bg-white/10" />
          <span>DSN Protocol: v4.4-OFFLINE</span>
        </div>
      </footer>
    </div>
  );
};

export default OfflineScreen;
