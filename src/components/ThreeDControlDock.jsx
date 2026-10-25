import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Layers, Sparkles, Globe2, Play, Pause } from 'lucide-react';

export default function ThreeDControlDock({
  isInfiniteMode, setIsInfiniteMode,
  isDriving, setIsDriving,
  isRealDataMode, setIsRealDataMode,
  layerDrawerOpen, setLayerDrawerOpen,
  atmosphere, setAtmosphere
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${collapsed ? 'translate-y-20' : 'translate-y-0'}`}>
      <div className="flex flex-col items-center">
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mb-2 px-3 py-1 bg-[#050813]/90 backdrop-blur-md border border-white/20 rounded-t-lg text-[10px] font-mono text-slate-300 flex items-center gap-1 hover:border-orange-500/50 transition-colors"
        >
          {collapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {collapsed ? 'SHOW CONTROLS' : 'HIDE CONTROLS'}
        </button>

        {/* Dock */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#0B1020]/90 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl">
          {/* Drive Toggle */}
          <button
            onClick={() => setIsDriving(!isDriving)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
              isDriving
                ? 'bg-blue-600 text-white border-blue-400'
                : 'bg-white/5 text-slate-300 border-white/10'
            }`}
          >
            {isDriving ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isDriving ? 'DRIVING: ON' : 'DRIVING: OFF'}</span>
          </button>

          {/* Infinite Mode Button */}
          <button
            onClick={() => setIsInfiniteMode(!isInfiniteMode)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
              isInfiniteMode
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white border-orange-400'
                : 'bg-white/5 text-slate-300 border-white/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isInfiniteMode ? 'INFINITE: ON' : 'INFINITE: OFF'}</span>
          </button>

          {/* Data Mode Badge */}
          <button
            onClick={() => setIsRealDataMode(!isRealDataMode)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
              isRealDataMode
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isRealDataMode ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span>{isRealDataMode ? 'DATA: REAL' : 'DATA: SIM'}</span>
          </button>

          {/* Atmosphere Toggles */}
          <div className="flex gap-1 border-l border-white/10 pl-2">
            {['clear', 'dust', 'sunset'].map((a) => (
              <button
                key={a}
                onClick={() => setAtmosphere(a)}
                className={`px-3 py-2 rounded-lg text-[10px] font-mono border ${
                  atmosphere === a
                    ? 'bg-orange-600 text-white border-orange-500'
                    : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
                }`}
              >
                {a.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Layers Trigger */}
          <button
            onClick={() => setLayerDrawerOpen(!layerDrawerOpen)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
              layerDrawerOpen
                ? 'bg-orange-600 text-white border-orange-400'
                : 'bg-white/5 text-slate-300 border-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>LAYERS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
