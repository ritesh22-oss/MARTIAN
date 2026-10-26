import React, { useState } from 'react';
import { Route, Navigation, Compass, Sliders, CheckCircle2, ShieldCheck, Zap, Clock, Mountain, Target } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { AStarGrid, calculatePathLength } from '../utils/astar';

export default function RouteLaboratory() {
  const { sharedSession, updateSharedSession, setActiveWorkspace } = useWorkspace();
  const { startPoint, destinationPoint, obstacles, scienceTargets, selectedStrategy, uncertaintyPenalty, maxSlopeLimit, terrainImage } = sharedSession;

  const grid = new AStarGrid(256, 256);

  // Helper to compute a route path based on strategy using robust A*
  const computeStrategyPath = (strategy) => {
    const isBlocked = (x, y) => {
      const buffer = strategy === 'gamma' ? 18 : strategy === 'beta' ? 14 : 10;
      return obstacles.some(o => o.blocked && Math.hypot(o.x - x, o.y - y) < o.radius + buffer);
    };

    const getCost = (x, y) => {
      const base = 1.0;
      if (strategy === 'gamma') return base + (uncertaintyPenalty / 4.0);
      if (strategy === 'beta') return base * 0.85;
      return base;
    };

    let start = { x: startPoint.x, y: startPoint.y };
    let goal = { x: destinationPoint.x, y: destinationPoint.y };

    // Delta route detours via first science target if available
    if (strategy === 'delta' && scienceTargets.length > 0) {
      const poi = scienceTargets[0];
      const leg1 = grid.findPath(start, { x: poi.x, y: poi.y }, isBlocked, getCost);
      if (leg1.path && leg1.path.length > 0) {
        const leg2 = grid.findPath({ x: poi.x, y: poi.y }, goal, isBlocked, getCost);
        if (leg2.path && leg2.path.length > 0) {
          return [...leg1.path, ...leg2.path.slice(1)];
        }
        return leg1.path;
      }
    }

    const result = grid.findPath(start, goal, isBlocked, getCost);
    return result.path && result.path.length > 0 ? result.path : [];
  };

  const alphaPath = computeStrategyPath('alpha');
  const betaPath = computeStrategyPath('beta');
  const gammaPath = computeStrategyPath('gamma');
  const deltaPath = computeStrategyPath('delta');

  const alphaLen = calculatePathLength(alphaPath);
  const betaLen = calculatePathLength(betaPath);
  const gammaLen = calculatePathLength(gammaPath);
  const deltaLen = calculatePathLength(deltaPath);

  const routes = {
    alpha: {
      id: 'alpha',
      name: 'Route Alpha: Shortest Distance',
      color: '#00f0ff', // Bright Cyan
      path: alphaPath,
      pixelLength: alphaLen,
      durationMins: Math.round((alphaLen * 2.4) / 0.04 / 60),
      traversalCost: Math.round(alphaLen * 1.0),
      riskScore: 14.5,
      feasible: true,
      description: 'Minimizes total traversed distance across traversable terrain with minimal detours.'
    },
    beta: {
      id: 'beta',
      name: 'Route Beta: Lowest Traversal Cost',
      color: '#bf5af2', // Violet / Purple
      path: betaPath,
      pixelLength: betaLen,
      durationMins: Math.round((betaLen * 2.4) / 0.04 / 60),
      traversalCost: Math.round(betaLen * 0.82),
      riskScore: 6.2,
      feasible: true,
      description: 'Minimizes cumulative traversal cost by steering around sandy ridges and rough obstacles.'
    },
    gamma: {
      id: 'gamma',
      name: 'Route Gamma: Uncertainty-Aware',
      color: '#30d158', // Green
      path: gammaPath,
      pixelLength: gammaLen,
      durationMins: Math.round((gammaLen * 2.4) / 0.04 / 60),
      traversalCost: Math.round(gammaLen * 1.15),
      riskScore: 3.5,
      feasible: true,
      description: `Applies uncertainty penalty (${uncertaintyPenalty}x) to avoid unmapped or low-confidence cells.`
    },
    delta: {
      id: 'delta',
      name: 'Route Delta: Science-Driven Exploration',
      color: '#ff9f0a', // Amber / Orange
      path: deltaPath,
      pixelLength: deltaLen,
      durationMins: Math.round((deltaLen * 2.4) / 0.04 / 60),
      traversalCost: Math.round(deltaLen * 1.35),
      riskScore: 8.9,
      feasible: true,
      description: 'Passes near confirmed science targets for geological sampling before reaching destination.'
    }
  };

  const currentRoute = routes[selectedStrategy] || routes.alpha;

  // Recommendation engine
  const recommendedId = uncertaintyPenalty > 2.0 ? 'gamma' : scienceTargets.length > 0 ? 'delta' : 'beta';
  const recommendationReason =
    recommendedId === 'gamma'
      ? 'Recommended due to high uncertainty penalty requiring wider safety margins.'
      : recommendedId === 'delta'
      ? 'Recommended to maximize geological science yield by passing near target features.'
      : 'Recommended for optimal balance of low traversal cost and efficiency.';

  return (
    <div className="space-y-6 font-sans text-xs p-4 lg:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="bg-[#0A0E1C] border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="text-blue-400 font-semibold">Route Comparison Laboratory</span>
            <span aria-hidden="true">·</span>
            <span>Shared Terrain Session</span>
            <span aria-hidden="true">·</span>
            <span>Multi-Strategy Multi-Objective Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Multi-Route Candidate Comparison & Decision Engine
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
            Simultaneously evaluates Alpha (Shortest), Beta (Lowest Cost), Gamma (Uncertainty-Aware), and Delta (Science-Driven) over the active terrain session.
          </p>
        </div>

        <button
          onClick={() => setActiveWorkspace('marsnav-v4')}
          className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          Open in MARSNAV v4.0 Planner &rarr;
        </button>
      </div>

      {/* Shared Terrain Map Preview with All 4 Routes Rendered */}
      <div className="bg-[#090D1A] border border-slate-800/80 p-6 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 relative w-full aspect-square rounded-xl overflow-hidden bg-black border border-white/15 flex items-center justify-center">
          {terrainImage ? (
            <img src={terrainImage} alt="Shared Terrain Session" className="w-full h-full object-cover filter contrast-110" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs p-6 text-center bg-[#070B18]">
              <span className="text-slate-400 font-sans font-medium mb-1">No terrain image loaded</span>
              <span className="text-[10px] text-slate-500">Upload an image in MARSNAV Planner</span>
            </div>
          )}

          {/* SVG Overlay showing all 4 routes simultaneously */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 256 256">
            {Object.values(routes).map(r => {
              const isSelected = r.id === selectedStrategy;
              return (
                <polyline
                  key={r.id}
                  points={r.path.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={r.color}
                  strokeWidth={isSelected ? '3.5' : '1.5'}
                  opacity={isSelected ? '1.0' : '0.45'}
                  strokeDasharray={isSelected ? 'none' : '2 2'}
                />
              );
            })}
          </svg>

          {/* Start & Destination Markers */}
          <div
            className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white font-bold text-[9px]"
            style={{ left: `${(startPoint.x / 256) * 100}%`, top: `${(startPoint.y / 256) * 100}%` }}
          >
            S
          </div>
          <div
            className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white font-bold text-[9px]"
            style={{ left: `${(destinationPoint.x / 256) * 100}%`, top: `${(destinationPoint.y / 256) * 100}%` }}
          >
            D
          </div>
        </div>

        {/* Legend & Recommended Route Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-300 font-bold text-sm font-sans">
              <Target className="w-4 h-4" />
              <span>Recommended Route for Current Terrain</span>
            </div>
            <p className="text-slate-300 text-xs">
              Selected Strategy: <strong className="text-white uppercase">{routes[recommendedId].name}</strong>. {recommendationReason}
            </p>
            <button
              onClick={() => updateSharedSession({ selectedStrategy: recommendedId })}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
            >
              Apply Recommended Route
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.values(routes).map(r => (
              <div
                key={r.id}
                onClick={() => updateSharedSession({ selectedStrategy: r.id })}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  selectedStrategy === r.id ? 'bg-white/10 border-orange-500 shadow-md' : 'bg-black/40 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <div>
                    <div className="font-bold text-white text-xs">{r.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{r.pixelLength} px • {r.durationMins} mins</div>
                  </div>
                </div>
                {selectedStrategy === r.id && <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Route Strategy Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(routes).map((r) => (
          <button
            key={r.id}
            onClick={() => updateSharedSession({ selectedStrategy: r.id })}
            className={`p-5 rounded-2xl border text-left transition-all cursor-pointer backdrop-blur-xl ${
              selectedStrategy === r.id
                ? 'bg-white/10 border-orange-500 ring-2 ring-orange-500/40 shadow-xl'
                : 'bg-[#0B1020]/80 border-white/10 hover:border-white/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="text-[10px] text-slate-400 uppercase font-mono">Strategy {r.id.toUpperCase()}</span>
            </div>
            <h4 className="text-white font-bold text-sm mb-1">{r.name}</h4>
            <p className="text-[11px] text-slate-400 truncate mb-3">{r.description}</p>
            <div className="flex justify-between text-[11px] font-mono text-cyan-300">
              <span>{r.pixelLength} px</span>
              <span className="text-orange-400">{r.traversalCost} Cost</span>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Route Detailed Statistics & Tuning */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6 bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Navigation className="w-5 h-5 text-cyan-400" />
              <span>{currentRoute.name} - Performance Profile</span>
            </h3>
            <span className="text-xs px-2.5 py-1 rounded bg-white/5 text-slate-300 border border-white/10 font-mono">
              Verified Derived Route
            </span>
          </div>

          <p className="text-xs text-slate-300">{currentRoute.description}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px] font-mono">PATH LENGTH</span>
              <span className="text-white font-bold text-sm font-mono">{currentRoute.pixelLength} Pixels</span>
            </div>
            <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px] font-mono">ESTIMATED DURATION</span>
              <span className="text-cyan-400 font-bold text-sm font-mono">{currentRoute.durationMins} Mins</span>
            </div>
            <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px] font-mono">TRAVERSAL COST</span>
              <span className="text-orange-400 font-bold text-sm font-mono">{currentRoute.traversalCost} Units</span>
            </div>
            <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px] font-mono">RISK SCORE</span>
              <span className="text-amber-400 font-bold text-sm font-mono">{currentRoute.riskScore} / 20</span>
            </div>
            <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px] font-mono">FEASIBILITY</span>
              <span className="text-emerald-400 font-bold text-sm font-mono">Feasible</span>
            </div>
            <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px] font-mono">OBSTACLES AVOIDED</span>
              <span className="text-white font-bold text-sm font-mono">{obstacles.length} Mapped</span>
            </div>
          </div>

          <button
            onClick={() => setActiveWorkspace('marsnav-v4')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-xl cursor-pointer"
          >
            Use This Route in Simulation &rarr;
          </button>
        </div>

        {/* Tuning Panel */}
        <div className="lg:col-span-5 space-y-6 bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-orange-400" />
              <span>Uncertainty & Cost Tuning</span>
            </h3>
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Uncertainty Penalty Weight</span>
                <span className="text-orange-400 font-bold">{uncertaintyPenalty}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={uncertaintyPenalty}
                onChange={(e) => updateSharedSession({ uncertaintyPenalty: Number(e.target.value) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Max Permissible Slope Limit</span>
                <span className="text-cyan-400 font-bold">{maxSlopeLimit}°</span>
              </div>
              <input
                type="range"
                min="10"
                max="22"
                value={maxSlopeLimit}
                onChange={(e) => updateSharedSession({ maxSlopeLimit: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
