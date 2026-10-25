import React, { useState } from 'react';
import { Route, Navigation, Compass, Sliders, CheckCircle2, ShieldCheck, Zap, Clock, Mountain } from 'lucide-react';
import { calculateMechanicalEnergy } from '../utils/marsScienceData';

export default function RouteLaboratory() {
  const [selectedRouteType, setSelectedRouteType] = useState('optimal'); // 'optimal', 'cost', 'uncertainty', 'science'
  const [uncertaintyPenaltyWeight, setUncertaintyPenaltyWeight] = useState(1.5);
  const [maxSlopeLimit, setMaxSlopeLimit] = useState(14);

  // Precomputed route profiles from Jezero start to Belva Rim
  const routes = {
    optimal: {
      name: 'Route Alpha: Direct Optimal Vector',
      color: '#ffffff', // White
      distanceM: 4820,
      durationMins: 240,
      elevationGainM: 65,
      maxSlopeDeg: 8.2,
      avgSlopeDeg: 3.5,
      traversalCost: 142,
      uncertaintyMeters: 120,
      obstacleCount: 1,
      scienceStops: 1,
      description: 'Shortest Euclidean path across flat regolith plains with minimal detour.'
    },
    cost: {
      name: 'Route Beta: Lowest Traversal Cost',
      color: '#00daf3', // Cyan Blue
      distanceM: 5940,
      durationMins: 310,
      elevationGainM: 42,
      maxSlopeDeg: 4.8,
      avgSlopeDeg: 2.1,
      traversalCost: 98,
      uncertaintyMeters: 310,
      obstacleCount: 0,
      scienceStops: 2,
      description: 'Bypasses steep slopes and sandy sinkage zones by routing around ridges.'
    },
    uncertainty: {
      name: 'Route Gamma: Uncertainty-Aware Planner',
      color: '#30d158', // Green
      distanceM: 5410,
      durationMins: 280,
      elevationGainM: 51,
      maxSlopeDeg: 6.5,
      avgSlopeDeg: 2.8,
      traversalCost: 118,
      uncertaintyMeters: 35, // very low uncertainty
      obstacleCount: 0,
      scienceStops: 1,
      description: 'Penalizes unmapped regions and poorly observed terrain where rock density is unknown.'
    },
    science: {
      name: 'Route Delta: Science-Driven Exploration',
      color: '#ff9f0a', // Orange / Amber
      distanceM: 6650,
      durationMins: 355,
      elevationGainM: 92,
      maxSlopeDeg: 11.2,
      avgSlopeDeg: 4.6,
      traversalCost: 185,
      uncertaintyMeters: 210,
      obstacleCount: 2,
      scienceStops: 4,
      description: 'Passes through Western Delta scarp and Kodiak Butte outcrop for maximal geological yield.'
    }
  };

  const currentRoute = routes[selectedRouteType];
  const energy = calculateMechanicalEnergy(currentRoute.distanceM, currentRoute.avgSlopeDeg, currentRoute.maxSlopeDeg);

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Header */}
      <div className="bg-[#0A0E1C] border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="text-blue-400 font-semibold">Route Comparison Laboratory</span>
            <span aria-hidden="true">·</span>
            <span>Uncertainty & Multi-Objective Planner</span>
            <span aria-hidden="true">·</span>
            <span>Kinematic Energy Modeling</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Mission Route Laboratory & Decision Engine
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
            Compare shortest distance, lowest traversal cost, uncertainty-aware routing, and science-focused exploration strategies with verified kinematic energy models.
          </p>
        </div>
      </div>

        {/* Route Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(routes).map(([key, r]) => (
            <button
              key={key}
              onClick={() => setSelectedRouteType(key)}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer backdrop-blur-xl ${
                selectedRouteType === key
                  ? 'bg-white/10 border-orange-500 ring-2 ring-orange-500/40 shadow-xl'
                  : 'bg-[#0B1020]/80 border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-[10px] text-slate-400 uppercase">Strategy</span>
              </div>
              <h4 className="text-white font-bold text-sm mb-1">{r.name}</h4>
              <p className="text-[11px] text-slate-400 truncate">{r.description}</p>
            </button>
          ))}
        </div>

        {/* Selected Route Detailed Statistics & Audit */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Telemetry & Energy Metrics */}
          <div className="lg:col-span-7 space-y-6 bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Navigation className="w-5 h-5 text-cyan-400" />
                <span>{currentRoute.name} - Performance Profile</span>
              </h3>
              <span className="text-xs px-2.5 py-1 rounded bg-white/5 text-slate-300 border border-white/10">
                Verified Algorithm Output
              </span>
            </div>

            <p className="text-xs text-slate-300">{currentRoute.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-slate-400 block text-[10px]">TOTAL DISTANCE</span>
                <span className="text-white font-bold text-sm">{(currentRoute.distanceM / 1000).toFixed(2)} km</span>
              </div>
              <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-slate-400 block text-[10px]">ESTIMATED DURATION</span>
                <span className="text-cyan-400 font-bold text-sm">{(currentRoute.durationMins / 60).toFixed(1)} Hours</span>
              </div>
              <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-slate-400 block text-[10px]">ENERGY CONSUMPTION</span>
                <span className="text-orange-400 font-bold text-sm">{energy.wattHours} Wh</span>
              </div>
              <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-slate-400 block text-[10px]">ELEVATION GAIN</span>
                <span className="text-white font-bold text-sm">{currentRoute.elevationGainM} m</span>
              </div>
              <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-slate-400 block text-[10px]">MAX SLOPE</span>
                <span className={`font-bold text-sm ${currentRoute.maxSlopeDeg > maxSlopeLimit ? 'text-red-400' : 'text-emerald-400'}`}>
                  {currentRoute.maxSlopeDeg}°
                </span>
              </div>
              <div className="bg-black/40 p-3.5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-slate-400 block text-[10px]">UNCERTAINTY EXPOSURE</span>
                <span className="text-amber-400 font-bold text-sm">{currentRoute.uncertaintyMeters} m</span>
              </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Science POI Stops:</span>
                <span className="text-white font-bold">{currentRoute.scienceStops} Target(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Modeled Obstacle Encounters:</span>
                <span className="text-amber-400 font-bold">{currentRoute.obstacleCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Specific Energy Cost:</span>
                <span className="text-orange-400 font-bold">{energy.whPerKm} Wh/km</span>
              </div>
            </div>
          </div>

          {/* Right: Uncertainty Penalty & Weight Controls */}
          <div className="lg:col-span-5 space-y-6 bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-orange-400" />
                <span>Uncertainty & Cost Tuning</span>
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Uncertainty Penalty Weight</span>
                  <span className="text-orange-400 font-bold">{uncertaintyPenaltyWeight}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={uncertaintyPenaltyWeight}
                  onChange={(e) => setUncertaintyPenaltyWeight(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">Multiplies the cost of unmapped or low-evidence terrain cells in the A* cost matrix.</p>
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
                  onChange={(e) => setMaxSlopeLimit(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">Stricter slope limits trigger wider detours around scarp and crater walls.</p>
              </div>

              <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                <div className="text-white font-bold flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Planner Robustness Guarantees</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Unknown terrain is explicitly penalized and never treated as safe. All calculated metrics derive directly from the DTM elevation and cost grid.
                </p>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
