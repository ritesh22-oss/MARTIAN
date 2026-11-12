import React from 'react';
import { Compass, CheckCircle2, ShieldCheck, AlertTriangle, Target, Clock, Footprints, ArrowRight, Activity, MapPin, Zap } from 'lucide-react';
import { useAstronautExploration, AstronautRouteStrategy } from '../../context/AstronautExplorationContext';

export const AstronautRoutePlanner: React.FC = () => {
  const { routes, selectedRouteId, setSelectedRouteId, suitConfig, getSuitConfigDetails } = useAstronautExploration();
  const suitDetails = getSuitConfigDetails();

  const activeStrategy = routes[selectedRouteId];

  const strategyKeys: Array<'alpha' | 'beta' | 'gamma' | 'delta'> = ['alpha', 'beta', 'gamma', 'delta'];

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
              ASTRONAUT ROUTE PLANNER
            </span>
            <span className="text-xs text-slate-400 font-mono">4-Strategy A* Pathfinding Engine</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Multi-Criteria Surface Traverse Route Engine</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Terrain-aware pathfinding considering DEM slope limits ({suitDetails.maxSlopeDeg}° for active suit), boulder obstacles, hazard clearance, and science target visitation.
          </p>
        </div>

        {/* Selected Strategy Code Badge */}
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
          <Compass className="w-4 h-4 text-rose-400" />
          <span>Active Strategy: <strong className="text-cyan-300 font-bold">{activeStrategy.code}</strong></span>
        </div>
      </div>

      {/* Strategy Comparison Cards (4 Strategy Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {strategyKeys.map((key) => {
          const strat = routes[key];
          const isSelected = selectedRouteId === key;

          return (
            <div
              key={key}
              onClick={() => setSelectedRouteId(key)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 relative overflow-hidden ${
                isSelected
                  ? 'bg-rose-500/15 border-rose-500/60 shadow-xl shadow-rose-950/30'
                  : 'bg-[#0B1021] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${
                  isSelected ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {strat.code}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">{strat.safetyScorePct}% Safety</span>
              </div>

              <h3 className="text-xs font-bold text-white leading-tight">{strat.name}</h3>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed line-clamp-2">{strat.tagline}</p>

              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Distance:</span>
                  <strong className="text-cyan-300">{(strat.distanceM / 1000).toFixed(2)} km</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">EVA Time:</span>
                  <strong className="text-white">{strat.timeMins} mins</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Slope:</span>
                  <strong className="text-amber-300">{strat.maxSlopeDeg}°</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Targets Visited:</span>
                  <strong className="text-emerald-400">{strat.targetsVisitedCount} Targets</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Strategy Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Route Metrics & Safety Assessment (7 cols) */}
        <div className="lg:col-span-7 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-rose-400 uppercase font-bold block">{activeStrategy.code} SPECIFICATION</span>
              <h3 className="text-base font-bold text-white mt-0.5">{activeStrategy.name}</h3>
            </div>

            <div className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
              SAFE TRAVERSE VERIFIED
            </div>
          </div>

          <p className="text-xs text-slate-300 font-sans leading-relaxed">{activeStrategy.tagline}</p>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block">TOTAL DISTANCE</span>
              <strong className="text-cyan-300 text-sm font-bold">{(activeStrategy.distanceM / 1000).toFixed(2)} km</strong>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block">EST EVA TIME</span>
              <strong className="text-white text-sm font-bold">{activeStrategy.timeMins} mins</strong>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block">ELEVATION GAIN</span>
              <strong className="text-amber-300 text-sm font-bold">+{activeStrategy.elevationGainM} m</strong>
            </div>
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block">SAFETY RATING</span>
              <strong className="text-emerald-400 text-sm font-bold">{activeStrategy.safetyScorePct}%</strong>
            </div>
          </div>

          {/* Waypoints Geometry Coordinates */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5 font-mono text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Route Waypoints Geometry ({activeStrategy.path.length} Waypoints)</span>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {activeStrategy.path.map((pt, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                  <span className="text-slate-400">Waypoint #{i + 1}:</span>
                  <span className="text-white">{pt.lat}°N, {pt.lon}°E</span>
                  <span className="text-cyan-300">Elev {pt.elevM}m</span>
                  <span className="text-amber-300">Slope {pt.slopeDeg}°</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Side-by-Side Comparison Matrix (5 cols) */}
        <div className="lg:col-span-5 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 font-mono text-xs">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Side-by-Side Strategy Comparison</h3>
          </div>

          <div className="space-y-3">
            {strategyKeys.map(k => {
              const st = routes[k];
              return (
                <div key={k} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center font-bold text-white">
                    <span>{st.code}</span>
                    <span className="text-emerald-400">{st.safetyScorePct}% Safety</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    <div>Dist: <strong className="text-cyan-300">{(st.distanceM / 1000).toFixed(2)} km</strong></div>
                    <div>Time: <strong className="text-white">{st.timeMins} min</strong></div>
                    <div>Targets: <strong className="text-emerald-400">{st.targetsVisitedCount}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
