import React, { useState, useEffect } from 'react';
import { Compass, Rocket, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BootScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('INITIALIZING SYSTEMS...');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setReady(true);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 15) + 8;
        if (next > 35 && next < 70) {
          setStage('LOADING HI-RISE DIGITAL ELEVATION MODELS...');
        } else if (next >= 70 && next < 95) {
          setStage('INITIALIZING PYTORCH SEGMENTATION & A* PATHFINDER...');
        } else if (next >= 95) {
          setStage('MISSION CONTROL READY.');
        }
        return Math.min(next, 100);
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#050813] flex flex-col items-center justify-center p-4 text-slate-100 select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-600/10 via-[#050813] to-[#050813] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-[#0B1020]/90 border border-white/15 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl space-y-8 text-center">
        {/* Logo Icon */}
        <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center shadow-2xl shadow-orange-600/40 border border-orange-400/40">
          <Compass className="w-10 h-10 text-white animate-spin-slow" />
          <div className="absolute -inset-1 rounded-2xl bg-orange-500/20 blur-md -z-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-white via-orange-100 to-orange-400 bg-clip-text text-transparent">
            MARSNAV SYSTEMS
          </h1>
          <p className="text-xs font-mono text-slate-400 tracking-widest uppercase">
            AI-Powered Terrain Analysis & Rover Navigation
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-orange-400 animate-pulse">{stage}</span>
            <span className="text-slate-300">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-red-500 transition-all duration-200 shadow-lg shadow-orange-600/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Enter Button */}
        {ready ? (
          <button
            onClick={onComplete}
            className="w-full flex items-center justify-center space-x-3 py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-sm tracking-wider uppercase shadow-xl shadow-orange-600/40 hover:scale-105 active:scale-95 transition-all border border-orange-400/40 animate-fade-in"
          >
            <Rocket className="w-4 h-4" />
            <span>Enter Mission Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="text-[11px] font-mono text-slate-500">
            Establishing secure orbital telemetry link...
          </div>
        )}
      </div>
    </div>
  );
}
