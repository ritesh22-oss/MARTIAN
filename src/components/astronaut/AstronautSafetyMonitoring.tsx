import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Sun, Thermometer, Wind, Radio, MapPin, Compass, Shield, Eye, Info, Activity } from 'lucide-react';
import { useAstronautExploration } from '../../context/AstronautExplorationContext';

export const AstronautSafetyMonitoring: React.FC = () => {
  const { activeSession, getSuitConfigDetails } = useAstronautExploration();
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  
  const suitDetails = getSuitConfigDetails();
  const env = activeSession.environmentalObservations;
  const analysis = activeSession.imageAnalysis;
  const terrain = activeSession.terrainAnalysis;
  const route = activeSession.activeRoute;

  const selectedHazard = analysis.hazards.find(h => h.id === selectedHazardId);

  // Dynamic Hazard Metric Categories
  const terrainHazards = [
    { 
      name: 'Slope Steepness', 
      val: `${terrain.slopeMaxDeg.toFixed(1)}° Max`, 
      limit: `${suitDetails.maxSlopeDeg}° Limit`, 
      risk: terrain.slopeMaxDeg > suitDetails.maxSlopeDeg ? 'CRITICAL' : terrain.slopeMaxDeg > 12 ? 'MODERATE' : 'LOW',
      nature: activeSession.imageAnalysis.dataNature
    },
    { 
      name: 'Boulder Field Density', 
      val: `${terrain.boulderDensityPct}% Area`, 
      limit: '< 20% Limit', 
      risk: terrain.boulderDensityPct > 20 ? 'HIGH' : terrain.boulderDensityPct > 10 ? 'MODERATE' : 'LOW',
      nature: 'Derived'
    },
    { 
      name: 'Regolith Traversability', 
      val: `${terrain.regolithTraversabilityIndex}/100`, 
      limit: '> 40 Index', 
      risk: terrain.regolithTraversabilityIndex < 40 ? 'HIGH' : terrain.regolithTraversabilityIndex < 60 ? 'MODERATE' : 'LOW',
      nature: 'Derived'
    },
    { 
      name: 'Passage Width Clearance', 
      val: terrain.passageWidthM ? `${terrain.passageWidthM} meters` : 'UNAVAILABLE', 
      limit: '> 2.0m Clearance', 
      risk: (terrain.passageWidthM && terrain.passageWidthM < 2.0) ? 'HIGH' : 'LOW',
      nature: terrain.passageWidthM ? 'Derived' : 'Unavailable'
    }
  ];

  const environmentalHazards = [
    { 
      name: 'Ambient Surface Temp', 
      val: env.ambientTempC.value !== null ? `${env.ambientTempC.value} ${env.ambientTempC.unit}` : 'UNAVAILABLE', 
      limit: '-120°C to +20°C', 
      risk: 'LOW',
      nature: env.ambientTempC.nature,
      instrument: env.ambientTempC.instrument
    },
    { 
      name: 'Atmospheric Pressure', 
      val: env.atmosPressurePa.value !== null ? `${env.atmosPressurePa.value} ${env.atmosPressurePa.unit}` : 'UNAVAILABLE', 
      limit: '500 - 800 Pa', 
      risk: 'LOW',
      nature: env.atmosPressurePa.nature,
      instrument: env.atmosPressurePa.instrument
    },
    { 
      name: 'Wind Velocity Vector', 
      val: env.windSpeedMs.value !== null ? `${env.windSpeedMs.value} m/s @ ${env.windDirectionDeg.value}°` : 'UNAVAILABLE', 
      limit: '< 25 m/s Limit', 
      risk: 'LOW',
      nature: env.windSpeedMs.nature,
      instrument: env.windSpeedMs.instrument
    },
    { 
      name: 'Dust Optical Depth (Tau)', 
      val: env.dustTau.value !== null ? `${env.dustTau.value} (Tau)` : 'UNAVAILABLE', 
      limit: 'Tau < 2.5 Limit', 
      risk: (env.dustTau.value && (env.dustTau.value as number) > 2.5) ? 'HIGH' : 'LOW',
      nature: env.dustTau.nature,
      instrument: env.dustTau.instrument
    }
  ];

  const radiationHazards = [
    { 
      name: 'Surface Dose Rate', 
      val: env.radiationDoseMgyDay.value !== null ? `${env.radiationDoseMgyDay.value} mGy/day` : 'UNAVAILABLE', 
      limit: '< 1.2 mGy/day', 
      risk: (env.radiationDoseMgyDay.value && (env.radiationDoseMgyDay.value as number) > 1.2) ? 'HIGH' : 'LOW',
      nature: env.radiationDoseMgyDay.nature,
      instrument: env.radiationDoseMgyDay.instrument
    },
    { 
      name: 'Solar Flare Activity', 
      val: env.solarFlareStatus.value || 'UNKNOWN', 
      limit: 'No SPE Event', 
      risk: env.solarFlareStatus.value === 'Severe (SPE Alert)' ? 'CRITICAL' : 'LOW',
      nature: env.solarFlareStatus.nature,
      instrument: env.solarFlareStatus.instrument
    },
    { 
      name: 'Galactic Cosmic Ray', 
      val: env.galacticCosmicRayMsvYr.value !== null ? `${env.galacticCosmicRayMsvYr.value} mSv/yr` : 'UNAVAILABLE', 
      limit: '< 500 mSv/yr', 
      risk: 'MODERATE',
      nature: env.galacticCosmicRayMsvYr.nature,
      instrument: env.galacticCosmicRayMsvYr.instrument
    }
  ];

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">CRITICAL</span>;
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

  const getNatureTag = (nature: string) => {
    const baseClass = "px-1.5 py-0.5 rounded-[2px] text-[8px] font-mono font-bold border uppercase";
    switch (nature) {
      case 'Observed':
        return <span className={`${baseClass} bg-cyan-500/10 text-cyan-300 border-cyan-500/30`}>OBSERVED</span>;
      case 'Derived':
        return <span className={`${baseClass} bg-purple-500/10 text-purple-300 border-purple-500/30`}>IMAGE-DERIVED</span>;
      case 'Modeled':
        return <span className={`${baseClass} bg-blue-500/10 text-blue-300 border-blue-500/30`}>MODELED</span>;
      default:
        return <span className={`${baseClass} bg-slate-800 text-slate-500 border-slate-700`}>UNAVAILABLE</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* 1. INTERACTIVE HAZARD MAP */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative group">
        <div className="absolute top-4 left-4 z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500 text-white shadow-lg uppercase">
              LIVE HAZARD SCAN
            </span>
            <span className="text-xs text-white/80 font-mono drop-shadow-md">Active ROI: {activeSession.activeRegion.toUpperCase()} Sector</span>
          </div>
          <h2 className="text-lg font-bold text-white drop-shadow-lg">Dynamic Terrain Risk Overlay</h2>
        </div>

        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-lg px-3 py-1.5 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-mono text-white font-bold">{analysis.hazards.length} DETECTED HAZARDS</span>
          </div>
        </div>

        <div className="relative aspect-video w-full bg-slate-900">
          <img 
            src={activeSession.imageMetadata.url} 
            className="w-full h-full object-cover opacity-80"
            alt="Terrain Hazard Map"
          />
          
          {/* SVG Overlay for Hazards */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {analysis.hazards.map((h) => (
              <g key={h.id} className="pointer-events-auto cursor-help" onClick={() => setSelectedHazardId(h.id)}>
                <rect 
                  x={`${h.normX * 100}%`} 
                  y={`${h.normY * 100}%`} 
                  width={`${h.normWidth * 100}%`} 
                  height={`${h.normHeight * 100}%`}
                  fill={h.riskLevel === 'HIGH' || h.riskLevel === 'CRITICAL' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(251, 191, 36, 0.1)'}
                  stroke={h.riskLevel === 'HIGH' || h.riskLevel === 'CRITICAL' ? '#f43f5e' : '#fbbf24'}
                  strokeWidth="2"
                  className={`transition-all duration-300 ${selectedHazardId === h.id ? 'stroke-[3] filter drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'opacity-60 group-hover:opacity-100'}`}
                />
                <circle 
                  cx={`${(h.normX + h.normWidth) * 100}%`} 
                  cy={`${h.normY * 100}%`} 
                  r="4" 
                  fill={h.riskLevel === 'HIGH' || h.riskLevel === 'CRITICAL' ? '#f43f5e' : '#fbbf24'}
                />
              </g>
            ))}
          </svg>

          {/* Hazard Inspector Sidebar (Overlay) */}
          {selectedHazard && (
            <div className="absolute right-4 bottom-4 top-16 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl p-4 shadow-2xl animate-slide-in-right z-20">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Hazard Detail</div>
                  <h4 className="text-sm font-bold text-white">{selectedHazard.label}</h4>
                </div>
                <button onClick={() => setSelectedHazardId(null)} className="text-slate-500 hover:text-white transition-colors">
                  <Shield className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                    <div className="text-[9px] text-slate-400 uppercase">Risk Level</div>
                    <div className="mt-1">{getRiskBadge(selectedHazard.riskLevel)}</div>
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                    <div className="text-[9px] text-slate-400 uppercase">Confidence</div>
                    <div className="text-xs font-mono text-white">{(selectedHazard.confidence * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] text-slate-400 uppercase">Impact Assessment</div>
                  <p className="text-[11px] text-slate-200 leading-relaxed bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    {selectedHazard.mobilityImpact}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="text-[9px] text-slate-400 uppercase">Geological Context</div>
                  <div className="text-[11px] text-slate-400 italic">
                    {selectedHazard.reason}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 font-mono">ID: {selectedHazard.id}</span>
                  <div className="flex gap-1">
                    <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Class: {selectedHazard.classification}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. SAFETY STATUS HEADER */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
              ASTRONAUT SAFETY & OPERATIONAL LIMITS
            </span>
            <span className="text-xs text-slate-400 font-mono">Source: {env.statusLabel}</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Integrated Planetary Hazard Assessment</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Real-time multi-source data fusion: In-situ sensor telemetry, orbital DTM processing, and Gemini AI Vision obstacle detection.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shrink-0">
          <ShieldCheck className={`w-5 h-5 ${activeSession.terrainAnalysis.regolithTraversabilityIndex > 60 ? 'text-emerald-400' : 'text-amber-400'}`} />
          <div className="font-mono text-xs">
            <span className="text-slate-400 block text-[9px] uppercase">Overall Risk State</span>
            <strong className={`${activeSession.terrainAnalysis.regolithTraversabilityIndex > 60 ? 'text-emerald-400' : 'text-amber-400'} font-bold text-sm`}>
              {activeSession.terrainAnalysis.regolithTraversabilityIndex > 70 ? 'NOMINAL (LOW)' : activeSession.terrainAnalysis.regolithTraversabilityIndex > 40 ? 'CAUTION (MODERATE)' : 'ALERT (HIGH)'}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. SAFETY RISK COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TERRAIN SAFETY */}
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-orange-400" />
              <span>Terrain Safety Audit</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">CV Image Analysis</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {terrainHazards.map((h, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{h.name}</span>
                  {getRiskBadge(h.risk)}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Val: <strong className="text-slate-200">{h.val}</strong></span>
                  <span>Limit: {h.limit}</span>
                </div>
                <div className="flex justify-end pt-1">
                  {getNatureTag(h.nature)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ENVIRONMENTAL SAFETY */}
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              <span>Environmental Safety</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Station Telemetry</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {environmentalHazards.map((h, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{h.name}</span>
                  {getRiskBadge(h.risk)}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Measured: <strong className="text-slate-200">{h.val}</strong></span>
                  <span>Safety Range: {h.limit}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[8px] text-slate-500 uppercase">{h.instrument}</span>
                  {getNatureTag(h.nature)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RADIATION & MISSION SAFETY */}
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Radiation & Emergency</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">MSL RAD Baseline</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {radiationHazards.map((h, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{h.name}</span>
                  {getRiskBadge(h.risk)}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Current: <strong className="text-slate-200">{h.val}</strong></span>
                  <span>Limit: {h.limit}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                   <span className="text-[8px] text-slate-500 uppercase">{h.instrument}</span>
                   {getNatureTag(h.nature)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Return Margin Box */}
      <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs ${route.returnFeasible ? 'border-emerald-500/20' : 'border-rose-500/20'}`}>
        <div className="space-y-1">
          <span className={`text-[10px] ${route.returnFeasible ? 'text-emerald-400' : 'text-rose-400'} uppercase font-bold block`}>Habitat Emergency Return Margin</span>
          <p className="text-slate-200 font-sans text-xs">
            Current EVA position is <strong>{(route.distanceM / 1000).toFixed(2)} km</strong> from Base Camp egress. 
            Estimated emergency sprint time is <strong>{route.returnDurationMins} minutes</strong> using {suitDetails.name}.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className={`p-2.5 rounded-xl border font-bold ${route.returnFeasible ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            {route.returnFeasible ? 'RETURN FEASIBLE (NOMINAL)' : 'RETURN CRITICAL (LOW MARGIN)'}
          </div>
        </div>
      </div>
    </div>
  );
};

