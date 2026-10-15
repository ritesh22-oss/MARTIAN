import React from 'react';
import { X, Navigation, Zap, AlertTriangle, Sliders, Layers, TrendingUp, Compass, ArrowRight } from 'lucide-react';

export default function RouteInspectorModal({
  route,
  userWeights,
  onWeightChange,
  onClose,
  isRealDataMode
}) {
  if (!route) return null;

  const { metrics } = route;
  const profile = metrics.elevationProfile || [];

  // Find min and max elevation for SVG scaling
  const elevs = profile.map(p => p.elevationM);
  const minElev = Math.min(...elevs, -2500);
  const maxElev = Math.max(...elevs, -2400);
  const elevRange = maxElev - minElev || 1;

  // Build SVG path for elevation profile
  const svgWidth = 520;
  const svgHeight = 120;
  const pointsString = profile.map((p, i) => {
    const x = (i / Math.max(1, profile.length - 1)) * svgWidth;
    const y = svgHeight - ((p.elevationM - minElev) / elevRange) * (svgHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-2xl w-full bg-[#0B1020] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          aria-label="Close inspector"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                Scientific Route Inspector
              </span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${isRealDataMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                {isRealDataMode ? 'NASA Datum Calibrated' : 'Simulation Model'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">{route.name}</h3>
            <p className="text-xs font-mono text-slate-400">{metrics.algorithmName}</p>
          </div>
        </div>

        {/* Physical & Algorithmic Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Path Length</span>
            <span className="text-base font-bold text-white font-mono">{metrics.totalDistanceM.toLocaleString()} m</span>
            <span className="text-[10px] text-slate-500 block">3D ground distance</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Max / Avg Slope</span>
            <span className="text-base font-bold text-orange-400 font-mono">{metrics.maxSlopeDeg}° / {metrics.avgSlopeDeg}°</span>
            <span className="text-[10px] text-slate-500 block">Ground inclination</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Estimated Energy</span>
            <span className="text-base font-bold text-cyan-400 font-mono">{metrics.wattHours} Wh</span>
            <span className="text-[10px] text-slate-500 block">({metrics.whPerKm} Wh/km)</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[10px] font-mono text-slate-400 block uppercase">Traversability Cost</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{metrics.cumulativeCost}</span>
            <span className="text-[10px] text-slate-500 block">Configured cost sum</span>
          </div>
        </div>

        {/* Route Elevation Profile (Plotting Elevation against Distance) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <span className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-slate-200">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Elevation Profile (MOLA Aeroid Datum)</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Range: {minElev}m to {maxElev}m
            </span>
          </div>
          
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 relative overflow-hidden">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-28 overflow-visible">
              {/* Reference Grid lines */}
              <line x1="0" y1="20" x2={svgWidth} y2="20" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              <line x1="0" y1="60" x2={svgWidth} y2="60" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2={svgWidth} y2="100" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />

              {/* Area fill */}
              <polygon
                points={`0,${svgHeight} ${pointsString} ${svgWidth},${svgHeight}`}
                fill="url(#elevationGrad)"
                opacity="0.35"
              />

              {/* Line */}
              <polyline
                fill="none"
                stroke="#00f0ff"
                strokeWidth="2.5"
                points={pointsString}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <defs>
                <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#050813" stopOpacity="0.0" />
                </linearGradient>
              </defs>
            </svg>

            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pt-2 border-t border-white/5">
              <span>Start: Jezero Western Fan (0 m)</span>
              <span>Midpoint: Kodiak Gap</span>
              <span>Goal: Belva Rim ({metrics.totalDistanceM} m)</span>
            </div>
          </div>
        </div>

        {/* Cost Weight Tuning Sliders (Actually affects the calculation!) */}
        <div className="space-y-4 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase font-bold text-slate-200 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              <span>Multi-Objective Cost Weights</span>
            </h4>
            <span className="text-[11px] font-mono text-orange-400">Live Recalculation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            {/* Distance Weight */}
            <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex justify-between text-slate-300">
                <span>Distance Penalty</span>
                <span className="text-cyan-400 font-bold">{userWeights.distanceWeight.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={userWeights.distanceWeight}
                onChange={(e) => onWeightChange('distanceWeight', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Penalizes long traverses</span>
            </div>

            {/* Slope Weight */}
            <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex justify-between text-slate-300">
                <span>Slope Steepness Penalty</span>
                <span className="text-orange-400 font-bold">{userWeights.slopeWeight.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.2"
                value={userWeights.slopeWeight}
                onChange={(e) => onWeightChange('slopeWeight', parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Reroutes around steep climbs</span>
            </div>

            {/* Boulder Penalty */}
            <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex justify-between text-slate-300">
                <span>Boulder Field Avoidance</span>
                <span className="text-red-400 font-bold">{userWeights.obstaclePenalty.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.5"
                value={userWeights.obstaclePenalty}
                onChange={(e) => onWeightChange('obstaclePenalty', parseFloat(e.target.value))}
                className="w-full accent-red-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Safety margin around rocks</span>
            </div>

            {/* Loose Sand Penalty */}
            <div className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex justify-between text-slate-300">
                <span>Loose Sand Slip Penalty</span>
                <span className="text-amber-400 font-bold">{userWeights.looseSandPenalty.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.2"
                value={userWeights.looseSandPenalty}
                onChange={(e) => onWeightChange('looseSandPenalty', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">Avoids wheel entrapment dunes</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-white/10 text-xs font-mono">
          <span className="text-slate-400">
            Source: NASA MOLA / HiRISE Topography DTM
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold tracking-wider uppercase shadow-lg shadow-orange-600/30 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
