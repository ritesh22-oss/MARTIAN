import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Sun, Thermometer, Wind, Radio, MapPin, Compass, Shield } from 'lucide-react';
import { useAstronautExploration } from '../../context/AstronautExplorationContext';

export const AstronautSafetyMonitoring: React.FC = () => {
  const { spaceWeather, currentCoordinates, routes, selectedRouteId, getSuitConfigDetails } = useAstronautExploration();
  const activeRoute = routes[selectedRouteId];
  const suitDetails = getSuitConfigDetails();

  // Safety Metric Categories
  const terrainHazards = [
    { name: 'Slope Steepness', val: `${activeRoute.maxSlopeDeg}° Max`, limit: `${suitDetails.maxSlopeDeg}° Limit`, risk: activeRoute.maxSlopeDeg > suitDetails.maxSlopeDeg ? 'CRITICAL' : activeRoute.maxSlopeDeg > 12 ? 'MODERATE' : 'LOW' },
    { name: 'Boulder Field Density', val: '14 Boulders/100m²', limit: '< 20/100m²', risk: 'MODERATE' },
    { name: 'Loose Regolith & Sand Traps', val: '12% Slip Probability', limit: '< 25%', risk: 'LOW' },
    { name: 'Surface Stability & Cavities', val: 'Bedrock Indurated', limit: 'No cavities', risk: 'LOW' },
    { name: 'Passage Width Clearance', val: '4.2 meters Min', limit: '> 2.0m Clearance', risk: 'LOW' }
  ];

  const environmentalHazards = [
    { name: 'Ambient Surface Temperature', val: '-62.4 °C', limit: '-120°C to +20°C', risk: 'LOW' },
    { name: 'Atmospheric Surface Pressure', val: '612 Pa (6.12 mbar)', limit: '500 - 800 Pa', risk: 'LOW' },
    { name: 'Wind Velocity Vector', val: '6.8 m/s @ 210° SW', limit: '< 25 m/s Limit', risk: 'LOW' },
    { name: 'Dust Optical Depth (Tau)', val: '0.42 (Nominal)', limit: 'Tau < 2.5 Limit', risk: 'LOW' },
    { name: 'Optical Solar Exposure', val: '590 W/m²', limit: 'Nominal Solar', risk: 'LOW' }
  ];

  const radiationHazards = [
    { name: 'Surface Dose Rate (MSL RAD)', val: `${spaceWeather.mslRadSurfaceDoseRate} mGy/day`, limit: '< 1.2 mGy/day', risk: spaceWeather.mslRadSurfaceDoseRate > 1.2 ? 'HIGH' : 'LOW' },
    { name: 'Solar Energetic Particle Alert', val: spaceWeather.solarActivityLevel, limit: 'No SPE Event', risk: spaceWeather.solarActivityLevel.includes('SPE Alert') ? 'CRITICAL' : 'LOW' },
    { name: 'Galactic Cosmic Ray Background', val: '210 mSv/yr Equivalent', limit: '< 500 mSv/yr', risk: 'MODERATE' },
    { name: 'Natural Cliff Radiation Shelters', val: '3 Overhangs within 400m', limit: '< 15 mins run', risk: 'LOW' }
  ];

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">HIGH</span>;
      case 'MODERATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">MODERATE</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">UNKNOWN</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Header Banner */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
              ASTRONAUT SAFETY & ENVIRONMENTAL MONITORING
            </span>
            <span className="text-xs text-slate-400 font-mono">EVA Surface Operational Limits</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Human Exploration Safety & Hazard Assessment</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Real-time monitoring of terrain steepness, boulder obstacles, dust storms, solar radiation flares, and habitat emergency return feasibility.
          </p>
        </div>

        {/* Global Risk Rating Badge */}
        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div className="font-mono text-xs">
            <span className="text-slate-400 block text-[9px] uppercase">Overall Risk State</span>
            <strong className="text-emerald-400 font-bold text-sm">NOMINAL (LOW RISK)</strong>
          </div>
        </div>
      </div>

      {/* 3 Main Safety Risk Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. TERRAIN SAFETY */}
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-orange-400" />
              <span>Terrain Safety Audit</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Slope & Boulders</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {terrainHazards.map((h, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{h.name}</span>
                  {getRiskBadge(h.risk)}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Current: <strong className="text-slate-200">{h.val}</strong></span>
                  <span>Threshold: {h.limit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. ENVIRONMENTAL SAFETY */}
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              <span>Environmental Safety</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">In-Situ Sensors</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {environmentalHazards.map((h, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{h.name}</span>
                  {getRiskBadge(h.risk)}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Measured: <strong className="text-slate-200">{h.val}</strong></span>
                  <span>Safety Range: {h.limit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. RADIATION & MISSION SAFETY */}
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Radiation & Emergency Return</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">MSL RAD & Habitat</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {radiationHazards.map((h, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{h.name}</span>
                  {getRiskBadge(h.risk)}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 pt-0.5">
                  <span>Current: <strong className="text-slate-200">{h.val}</strong></span>
                  <span>Limit: {h.limit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Return Radius Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs">
        <div className="space-y-1">
          <span className="text-[10px] text-amber-400 uppercase font-bold block">Habitat Emergency Return Margin</span>
          <p className="text-slate-200 font-sans text-xs">
            Current EVA position is <strong>1.42 km</strong> from Base Camp Lander. Estimated emergency sprint time is <strong>22 minutes</strong> using {suitDetails.name}.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
            RETURN FEASIBLE (100% MARGIN)
          </div>
        </div>
      </div>
    </div>
  );
};
