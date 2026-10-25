import React, { useState } from 'react';
import {
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Scale,
  Gauge,
  Compass,
  Info
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MARS_REFERENCE_DATUM } from '../../utils/marsScienceData';

export default function ConfigurationWorkspace() {
  const { settings, updateSettings } = useWorkspace();
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleResetDefaults = () => {
    updateSettings({
      maxSlopeLimitDeg: 14.0,
      roverMassKg: 1025,
      slopeWeight: 0.45,
      roughnessWeight: 0.25,
      slipWeight: 0.30,
      unitSystem: 'metric'
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="bg-[#0B1020] border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-orange-400 uppercase tracking-widest font-bold mb-1">
            <Sliders className="w-4 h-4" />
            <span>MISSION PARAMETERS & CONSTRAINTS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans tracking-tight">
            Rover Kinematics & Traversal Weights Configuration
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Configure vehicle physical envelopes, slope tipping thresholds, and deterministic A* cost-matrix multipliers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>NASA Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-orange-600/30 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Apply Parameters</span>
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Configuration applied to active simulation and route-planning engines.</span>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Rover Physical & Incline Limits */}
        <div className="bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Gauge className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              1. Kinematic Slope Envelope
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-slate-300 font-semibold">Maximum Safe Incline Angle:</span>
                <span className="text-orange-400 font-bold text-sm">{settings.maxSlopeLimitDeg}°</span>
              </div>
              <input
                type="range"
                min="8"
                max="25"
                step="0.5"
                value={settings.maxSlopeLimitDeg}
                onChange={(e) => updateSettings({ maxSlopeLimitDeg: parseFloat(e.target.value) })}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>8° (Conservative)</span>
                <span>14° (JPL Standard)</span>
                <span>25° (Severe Slip Hazard)</span>
              </div>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="text-slate-200 font-semibold flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-orange-400" />
                <span>Rocker-Bogie Physical Limit: 45.0°</span>
              </div>
              <p>
                While the mechanical rocker-bogie chassis can climb 45° slopes without rolling over, loose sand drift causes wheel trenching at &gt;15°. MarsNav caps autonomous planning at your configured angle.
              </p>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Rover Vehicle Mass (Earth Equivalent):</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={settings.roverMassKg}
                  onChange={(e) => updateSettings({ roverMassKg: parseInt(e.target.value, 10) || 1025 })}
                  className="bg-black/50 border border-slate-700 rounded-lg px-3 py-1.5 text-white w-32 focus:outline-none focus:border-orange-500 font-mono"
                />
                <span className="text-slate-400">kg (Weight on Mars: {(settings.roverMassKg * 0.379).toFixed(0)} kg)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Cost Function Weights */}
        <div className="bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Scale className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              2. Traversal Cost Multipliers
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Slope Gradient Weight (w_s):</span>
                <span className="text-cyan-400 font-bold">{settings.slopeWeight}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.slopeWeight}
                onChange={(e) => updateSettings({ slopeWeight: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Surface Roughness Weight (w_r):</span>
                <span className="text-emerald-400 font-bold">{settings.roughnessWeight}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.roughnessWeight}
                onChange={(e) => updateSettings({ roughnessWeight: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Sand Wheel-Slip Weight (w_l):</span>
                <span className="text-amber-400 font-bold">{settings.slipWeight}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.slipWeight}
                onChange={(e) => updateSettings({ slipWeight: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-slate-800 text-[10px] text-slate-400">
              <span className="text-slate-300 font-bold block mb-1">Active Cost Equation:</span>
              <code>C = {settings.slopeWeight}·Slope + {settings.roughnessWeight}·Rough + {settings.slipWeight}·Slip</code>
            </div>
          </div>
        </div>

        {/* Section 3: Reference Datum & Coordinate System */}
        <div className="bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              3. Geodesy & Reference Datum
            </h2>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Topographic Datum:</span>
              <span className="text-white font-bold">{MARS_REFERENCE_DATUM.datumName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Mean Mars Radius:</span>
              <span className="text-slate-200">{MARS_REFERENCE_DATUM.meanRadiusKm} km</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Coordinate Convention:</span>
              <span className="text-slate-200">{MARS_REFERENCE_DATUM.coordinateSystem}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Study Quadrangle:</span>
              <span className="text-cyan-400">{MARS_REFERENCE_DATUM.quadrangle}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Unit System & Display Options */}
        <div className="bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              4. Units & Visualization Quality
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-slate-300 block mb-1.5">Measurement System:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => updateSettings({ unitSystem: 'metric' })}
                  className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                    settings.unitSystem === 'metric'
                      ? 'bg-orange-600/30 border-orange-500 text-orange-300 font-bold'
                      : 'bg-black/40 border-slate-800 text-slate-400'
                  }`}
                >
                  Metric (Meters, km/h, kg, °C)
                </button>
                <button
                  onClick={() => updateSettings({ unitSystem: 'imperial' })}
                  className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                    settings.unitSystem === 'imperial'
                      ? 'bg-orange-600/30 border-orange-500 text-orange-300 font-bold'
                      : 'bg-black/40 border-slate-800 text-slate-400'
                  }`}
                >
                  Imperial (Feet, mph, lbs, °F)
                </button>
              </div>
            </div>

            <div>
              <span className="text-slate-300 block mb-1.5">3D Render Quality:</span>
              <div className="flex space-x-2 text-[11px]">
                <button
                  onClick={() => updateSettings({ renderQuality: 'high' })}
                  className={`px-3 py-1 rounded-lg border cursor-pointer ${
                    settings.renderQuality === 'high'
                      ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-black/40 border-slate-800 text-slate-400'
                  }`}
                >
                  High (2K Shadows, PBR)
                </button>
                <button
                  onClick={() => updateSettings({ renderQuality: 'balanced' })}
                  className={`px-3 py-1 rounded-lg border cursor-pointer ${
                    settings.renderQuality === 'balanced'
                      ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-black/40 border-slate-800 text-slate-400'
                  }`}
                >
                  Balanced (1K Shadows)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
