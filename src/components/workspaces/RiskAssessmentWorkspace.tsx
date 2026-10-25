import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  BarChart3,
  Layers,
  Info,
  Scale
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export default function RiskAssessmentWorkspace() {
  const { settings, updateSettings } = useWorkspace();
  const [selectedSlope, setSelectedSlope] = useState<number>(6.5);
  const [selectedRoughness, setSelectedRoughness] = useState<number>(0.3);
  const [selectedSlip, setSelectedSlip] = useState<number>(0.2);

  // Computed Traversal Cost using the actual formula
  // C = w_s * (slope/15) + w_r * roughness + w_slip * slip
  const normalizedSlope = Math.min(selectedSlope / settings.maxSlopeLimitDeg, 2.0);
  const computedCost = (
    settings.slopeWeight * normalizedSlope +
    settings.roughnessWeight * selectedRoughness +
    settings.slipWeight * selectedSlip
  ).toFixed(3);

  const isExceedingSlope = selectedSlope > settings.maxSlopeLimitDeg;

  // Comparison profiles
  const sampleTerrains = [
    { name: 'Compacted Regolith Plains', slope: 3.2, roughness: 0.15, slip: 0.05, desc: 'Firm dust and small pebbles. Optimal traversal.' },
    { name: 'Sedimentary Delta Bench', slope: 8.5, roughness: 0.40, slip: 0.20, desc: 'Layered bedrock with minor steps. Moderate cost.' },
    { name: 'Active Sand Megaripple', slope: 11.2, roughness: 0.10, slip: 0.85, desc: 'High sinkage risk. Low traction, potential wheel trenching.' },
    { name: 'Belva Crater Slump Escarpment', slope: 19.4, roughness: 0.75, slip: 0.60, desc: 'Exceeds rover flight rule limit. Unsafe for traversal.' }
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="bg-[#0B1020] border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-amber-400 uppercase tracking-widest font-bold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>RISK & TRAVERSABILITY COST ENGINE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans tracking-tight">
            Multi-Attribute Hazard Evaluation Matrix
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Evaluate composite traversal cost surfaces using continuous slope gradients, surface roughness indices, and unconsolidated wheel slip coefficients.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-black/50 border border-slate-800 text-[11px]">
          <span className="text-slate-400">FLIGHT RULE LIMIT: </span>
          <span className="text-amber-400 font-bold">{settings.maxSlopeLimitDeg}° Max Incline</span>
        </div>
      </div>

      {/* Main Grid: Interactive Calculator + Cost Formula */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Parameter Sliders */}
        <div className="lg:col-span-7 bg-[#090E1C] border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-orange-400" />
              <span>Interactive Local Terrain Simulation</span>
            </h2>
            <span className="text-[10px] text-cyan-400">Live Compute</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Local Slope Gradient:</span>
                <span className={`font-bold ${isExceedingSlope ? 'text-red-400' : 'text-orange-400'}`}>
                  {selectedSlope}° {isExceedingSlope ? '(EXCEEDS LIMIT)' : ''}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.2"
                value={selectedSlope}
                onChange={(e) => setSelectedSlope(parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0° Flat</span>
                <span>{settings.maxSlopeLimitDeg}° Safe Limit</span>
                <span>25° Extreme</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Surface Roughness Index (0.0 to 1.0):</span>
                <span className="text-emerald-400 font-bold">{selectedRoughness}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={selectedRoughness}
                onChange={(e) => setSelectedRoughness(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Wheel Slip Ratio (0.0 to 1.0):</span>
                <span className="text-amber-400 font-bold">{selectedSlip}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={selectedSlip}
                onChange={(e) => setSelectedSlip(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Preset Benchmark Scenarios */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Load Terrain Profile Preset:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {sampleTerrains.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedSlope(t.slope);
                    setSelectedRoughness(t.roughness);
                    setSelectedSlip(t.slip);
                  }}
                  className="p-2 rounded-lg bg-black/40 hover:bg-black/80 border border-slate-800 text-left transition-all cursor-pointer"
                >
                  <div className="font-bold text-white text-[11px] truncate">{t.name}</div>
                  <div className="text-[10px] text-slate-400">{t.slope}° • R:{t.roughness} • S:{t.slip}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Computed Output & Cost Breakdown */}
        <div className="lg:col-span-5 bg-[#090E1C] border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              <span>Calculated Traversability Cost</span>
            </h2>
          </div>

          <div className={`p-4 rounded-xl border text-center space-y-1 ${
            isExceedingSlope
              ? 'bg-red-950/30 border-red-500/50 text-red-300'
              : parseFloat(computedCost) > 0.5
              ? 'bg-amber-950/30 border-amber-500/50 text-amber-300'
              : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
          }`}>
            <span className="text-[10px] uppercase font-bold tracking-wider block">
              {isExceedingSlope ? 'CRITICAL HAZARD (BLOCKED VECTOR)' : 'COMPUTED NORM COST (0.0 to 1.0)'}
            </span>
            <div className="text-3xl font-extrabold font-mono tracking-tight">
              {isExceedingSlope ? '∞ (UNSAFE)' : computedCost}
            </div>
            <p className="text-[10px] text-slate-400">
              {isExceedingSlope
                ? 'Slope exceeds 14° safe rover stability limit. Cost set to infinity.'
                : parseFloat(computedCost) > 0.5
                ? 'High traversal cost. Rover will seek alternate detour if available.'
                : 'Nominal traversability. Minimal energy expenditure.'}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Formula Breakdown
            </span>
            <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Slope Component (w_s · S/S_max):</span>
                <span className="text-orange-400 font-bold">
                  {(settings.slopeWeight * normalizedSlope).toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Roughness Component (w_r · R):</span>
                <span className="text-emerald-400 font-bold">
                  {(settings.roughnessWeight * selectedRoughness).toFixed(3)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slip Component (w_l · L):</span>
                <span className="text-amber-400 font-bold">
                  {(settings.slipWeight * selectedSlip).toFixed(3)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-white">
                <span>Summed Traversal Cost:</span>
                <span className="text-cyan-400">{computedCost}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[10px] text-slate-400 leading-relaxed space-y-1">
            <div className="text-slate-200 font-semibold flex items-center space-x-1">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Scientific Distinction</span>
            </div>
            <p>
              This cost score is a relative dimensionless heuristic factor used by the A* pathfinder to compare alternative edges. It does not claim to represent a verified empirical probability of mechanical hardware failure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
