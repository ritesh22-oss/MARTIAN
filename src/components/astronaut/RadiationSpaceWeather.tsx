import React from 'react';
import { Sun, Activity, AlertTriangle, ShieldCheck, Database, Info, ExternalLink, Shield } from 'lucide-react';
import { useAstronautExploration } from '../../context/AstronautExplorationContext';

export const RadiationSpaceWeather: React.FC = () => {
  const { spaceWeather } = useAstronautExploration();

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 uppercase">
              RADIATION & SPACE WEATHER MONITOR
            </span>
            <span className="text-xs text-slate-400 font-mono">MSL RAD & NASA DONKI Data Integration</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Surface Radiation Dose & Solar Event Monitor</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Real-time telemetry tracking galactic cosmic ray (GCR) background radiation, solar energetic particle (SEP) events, solar flares, CMEs, and career EVA limits.
          </p>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shrink-0 font-mono text-xs">
          <Sun className="w-4 h-4 text-yellow-400" />
          <div>
            <span className="text-slate-400 block text-[9px] uppercase">Solar Environment</span>
            <strong className="text-emerald-400 font-bold">{spaceWeather.solarActivityLevel}</strong>
          </div>
        </div>
      </div>

      {/* Main KPI Stream Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Surface Dose Rate (MSL RAD)</span>
          <div className="text-2xl font-bold text-yellow-300">{spaceWeather.mslRadSurfaceDoseRate} <span className="text-xs text-slate-400">mGy/day</span></div>
          <span className="text-[11px] text-emerald-400 block">Absorbed Dose Rate</span>
        </div>

        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Equivalent Annual Dose</span>
          <div className="text-2xl font-bold text-cyan-300">{(spaceWeather.mslRadSurfaceDoseRate * 365.25 * 0.8).toFixed(1)} <span className="text-xs text-slate-400">mSv/yr</span></div>
          <span className="text-[11px] text-slate-400 block">GCR Background Field</span>
        </div>

        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">Active Solar Flare Class</span>
          <div className="text-2xl font-bold text-amber-300">{spaceWeather.solarFlareClass}</div>
          <span className="text-[11px] text-slate-400 block">GOES Satellite Stream</span>
        </div>

        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase block">SEP Proton Flux</span>
          <div className="text-2xl font-bold text-emerald-400">{spaceWeather.sepFluxParticleCount} <span className="text-xs text-slate-400">pfu</span></div>
          <span className="text-[11px] text-emerald-400 block">SPE Event: CLEAR</span>
        </div>
      </div>

      {/* Main Grid: Historical Dose Trend & Space Weather Data Provenance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs">
        {/* Left Column: Historical Surface Radiation Trend Chart (7 cols) */}
        <div className="lg:col-span-7 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>MSL RAD Historical Surface Radiation Trend (Sol 420-428)</span>
            </h3>
            <span className="text-[10px] text-slate-400">Units: mGy/day</span>
          </div>

          {/* Simple Visual Trend Chart Bar Graph */}
          <div className="h-44 bg-slate-900/80 rounded-xl border border-slate-800 p-4 flex items-end justify-between gap-2">
            {spaceWeather.historicalTrend.map(item => {
              const heightPct = Math.min(100, Math.max(20, (item.doseMgyDay / 1.0) * 100));
              return (
                <div key={item.sol} className="flex-1 flex flex-col items-center gap-1 group">
                  <span className="text-[9px] text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity">{item.doseMgyDay}</span>
                  <div
                    className="w-full bg-gradient-to-t from-cyan-600 to-amber-400 rounded-t transition-all group-hover:brightness-125"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[9px] text-slate-500">S{item.sol}</span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
            Data reflects continuous in-situ radiation detector measurements recorded on Mars surface by the MSL Radiation Assessment Detector (RAD) sensor.
          </p>
        </div>

        {/* Right Column: Source Provenance & Career Limits (5 cols) */}
        <div className="lg:col-span-5 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Data Provenance & Career Limits</h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block uppercase">Data Source Repository</span>
              <strong className="text-white text-xs">{spaceWeather.dataSource}</strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block uppercase">Data Freshness</span>
              <strong className="text-emerald-400 text-xs">{spaceWeather.dataFreshness}</strong>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] block uppercase">NASA Career Astronaut Limit</span>
              <strong className="text-amber-300 text-xs">600 mSv Career Limit (3% Risk)</strong>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-[11px] text-slate-400 font-sans">
            <strong className="text-slate-200 font-mono text-[10px] uppercase block">Operational Disclaimer:</strong>
            Do not equate Earth or GEO satellite space weather measurements directly to surface dose on Mars without applying atmospheric shielding depth models.
          </div>
        </div>
      </div>
    </div>
  );
};
