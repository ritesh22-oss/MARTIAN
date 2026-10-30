import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw, ArrowRight, Zap, Gauge, ChevronRight } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import CinematicBackground from './CinematicBackground';

interface SlowConnectionScreenProps {
  onContinue: () => void;
}

/**
 * MARSNAV Cinematic Slow Connection Experience
 * - Fullscreen 3D Mars background (Horizon Mode)
 * - Identical typography to Boot Screen
 * - Latency and throughput technical metrics
 * - "Weak Signal" state handling
 */
export const SlowConnectionScreen: React.FC<SlowConnectionScreenProps> = ({ onContinue }) => {
  const network = useNetworkStatus();
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryResult('Measuring round-trip telemetry latency...');
    try {
      const res = await network.retry();
      if (res.state === 'ONLINE') {
        setRetryResult(`Latency recovered to ${res.latencyMs || '<500'}ms! Syncing...`);
        setTimeout(() => onContinue(), 1200);
      } else {
        setRetryResult(`Latency measured at ${res.latencyMs || '>2500'}ms. Link remains degraded.`);
      }
    } catch {
      setRetryResult('Signal probe timed out.');
    } finally {
      setTimeout(() => setRetrying(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#030105] select-none overflow-hidden font-sans">
      {/* 3D Photorealistic Mars Planet Background */}
      <CinematicBackground mode="horizon" ambientColor="rgba(245, 158, 11, 0.15)" />

      {/* Top Header: MARSNAV Branding (Same as Boot Screen) */}
      <header className={`absolute top-8 sm:top-12 left-0 right-0 flex flex-col items-center pointer-events-none z-20 px-4 text-center transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <h1
          className="text-5xl sm:text-6xl md:text-7xl font-extralight tracking-[0.22em] text-white uppercase pl-[0.22em]"
          style={{ textShadow: '0 0 40px rgba(245, 158, 11, 0.35)' }}
        >
          MARS<span className="text-cyan-400 font-normal">NAV</span>
        </h1>
        <p className="mt-2 text-[10px] sm:text-xs font-semibold tracking-[0.34em] text-cyan-300/85 uppercase pl-[0.34em]">
          MARTIAN TERRAIN INTELLIGENCE &amp; ROVER NAVIGATION
        </p>
      </header>

      {/* Central Status Console */}
      <div className={`absolute inset-0 flex items-center justify-center p-4 z-30 transition-all duration-1000 delay-300 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="w-full max-w-2xl bg-slate-950/80 border border-amber-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9)]">
          {/* Weak Signal Header */}
          <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-white/5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Radio className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-sm font-mono font-bold tracking-widest text-amber-500 uppercase">
                  WEAK TELEMETRY SIGNAL
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-tight">High Transmission Latency Detected</p>
            </div>
          </div>

          {/* Main Message */}
          <div className="space-y-4 mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">
              Degraded DSN Connection
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed max-w-lg">
              The MarsNav orbital network link is experiencing high latency. Ground station telemetry is responsive, but high-resolution data streams may be delayed.
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#0f1426]/50 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-slate-500 text-[9px] uppercase font-mono tracking-widest mb-1.5 flex items-center justify-center space-x-1">
                <Gauge className="w-2.5 h-2.5" />
                <span>Measured RTT</span>
              </div>
              <div className="text-amber-400 font-mono font-bold text-lg">
                {network.latencyMs ? `${network.latencyMs}ms` : '2,840ms'}
              </div>
            </div>
            <div className="bg-[#0f1426]/50 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-slate-500 text-[9px] uppercase font-mono tracking-widest mb-1.5">Link Profile</div>
              <div className="text-slate-200 font-mono font-bold text-sm uppercase truncate">
                {network.effectiveType || 'DEGRADED'}
              </div>
            </div>
            <div className="bg-[#0f1426]/50 border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-slate-500 text-[9px] uppercase font-mono tracking-widest mb-1.5">Mars Globe</div>
              <div className="text-emerald-400 font-mono font-bold text-sm flex items-center justify-center space-x-1">
                <Zap className="w-3 h-3" />
                <span>READY</span>
              </div>
            </div>
          </div>

          {/* Retry Feedback Indicator */}
          {retryResult && (
            <div className="mb-6 p-3 rounded-xl bg-slate-900/50 border border-white/5 flex items-center space-x-3 text-xs font-mono">
              <div className={`w-1.5 h-1.5 rounded-full ${retrying ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300">{retryResult}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={onContinue}
              className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center space-x-2 shadow-[0_10px_30px_rgba(234,88,12,0.3)] transition-all cursor-pointer active:scale-95 group"
            >
              <span>Continue in Fast Mode</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleRetry}
              disabled={retrying}
              className="w-full sm:w-auto py-4 px-8 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-bold text-xs tracking-[0.1em] uppercase flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin text-amber-400' : ''}`} />
              <span>{retrying ? 'Testing...' : 'Re-test Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer System Status */}
      <footer className="absolute bottom-6 left-0 right-0 flex justify-center z-20 px-6">
        <div className="px-4 py-2 rounded-full bg-black/40 border border-white/5 backdrop-blur-md text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Link: DEGRADED</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <span>Latency: {network.latencyMs ? `${network.latencyMs}ms` : 'NOMINAL'}</span>
          <div className="w-px h-3 bg-white/10" />
          <span>Protocol: DSN-H2L</span>
        </div>
      </footer>
    </div>
  );
};

export default SlowConnectionScreen;
