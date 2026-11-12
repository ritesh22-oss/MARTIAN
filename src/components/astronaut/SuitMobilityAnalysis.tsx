import React from 'react';
import { Footprints, ShieldAlert, Cpu, Zap, Activity, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAstronautExploration, SuitConfigType, SUIT_CONFIGS } from '../../context/AstronautExplorationContext';

export const SuitMobilityAnalysis: React.FC = () => {
  const { suitConfig, setSuitConfig, getSuitConfigDetails } = useAstronautExploration();
  const currentDetails = getSuitConfigDetails();

  const configs: SuitConfigType[] = ['standard', 'science-payload', 'heavy-sample-collection'];

  // Mars Gravity Constant: g = 3.721 m/s²
  const marsGravity = 3.721;
  const marsWeightN = currentDetails.totalMassKg * marsGravity;
  const marsWeightKgf = marsWeightN / 9.80665; // Earth equivalent weight feeling

  // Energy expenditure formula: P = P_base + 3.8 * m * v + 12.5 * m * v * sin(theta)
  const calcMetabolicWatts = (slopeDeg: number) => {
    const rad = (slopeDeg * Math.PI) / 180;
    const p = currentDetails.metabolicBaseWatts + (3.8 * currentDetails.totalMassKg * currentDetails.maxSpeedMs) + (12.5 * currentDetails.totalMassKg * currentDetails.maxSpeedMs * Math.sin(rad));
    return Math.round(p);
  };

  const wattsFlat = calcMetabolicWatts(0);
  const wattsSlope10 = calcMetabolicWatts(10);
  const wattsSlope15 = calcMetabolicWatts(15);

  const kcalPerHrFlat = Math.round(wattsFlat * 0.86);

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
              SPACESUIT MOBILITY & TRAVERSABILITY MODEL
            </span>
            <span className="text-xs text-slate-400 font-mono">Bio-Mechanical Kinematic Calculations</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Human Spacesuit Mobility & Load Payload Configuration</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Evaluate suit mass, life-support consumables, carried instrument payload, walking speed limits, metabolic heat generation, and slope traversal limits under Martian surface gravity (0.38g).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
          <Footprints className="w-4 h-4 text-purple-400" />
          <span>Active Weight: <strong className="text-purple-300 font-bold">{marsWeightKgf.toFixed(1)} kg_f</strong> (Mars)</span>
        </div>
      </div>

      {/* Configuration Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {configs.map((cfgKey) => {
          const cfg = SUIT_CONFIGS[cfgKey];
          const isSelected = suitConfig === cfgKey;

          return (
            <div
              key={cfgKey}
              onClick={() => setSuitConfig(cfgKey)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                isSelected
                  ? 'bg-purple-500/15 border-purple-500/60 shadow-xl shadow-purple-950/30'
                  : 'bg-[#0B1021] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  isSelected ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {cfg.id.toUpperCase()}
                </span>
                <span className="text-xs font-mono font-bold text-purple-300">{cfg.totalMassKg} kg Total Mass</span>
              </div>

              <h3 className="text-sm font-bold text-white">{cfg.name}</h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-2">{cfg.description}</p>

              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[9px]">Max Walking Speed</span>
                  <strong className="text-white">{cfg.maxSpeedMs} m/s</strong> ({(cfg.maxSpeedMs * 3.6).toFixed(1)} km/h)
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">Slope Limit</span>
                  <strong className="text-amber-300">{cfg.maxSlopeDeg}° Slope</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Kinematic & Metabolic Physics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Mass Distribution & Gravity Calculations (6 cols) */}
        <div className="lg:col-span-6 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Mass & Gravity Physics Breakdown</span>
            </h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Astronaut Body Mass:</span>
              <span className="text-white font-bold">80.0 kg</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Pressure Suit Assembly Mass:</span>
              <span className="text-white font-bold">{currentDetails.suitMassKg}.0 kg</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Primary Life-Support Backpack (PLSS):</span>
              <span className="text-white font-bold">{currentDetails.backpackMassKg}.0 kg</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Carried Instrument & Scientific Payload:</span>
              <span className="text-amber-300 font-bold">{currentDetails.payloadMassKg}.0 kg</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200">
              <span className="font-bold">Total Earth Equivalent Mass:</span>
              <span className="font-bold text-sm">{currentDetails.totalMassKg}.0 kg</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Mars Gravity Force (g = 3.721 m/s²):</span>
              <span className="text-purple-300 font-bold">{marsWeightN.toFixed(1)} N ({marsWeightKgf.toFixed(1)} kg_f)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Metabolic Expenditure & Slope Performance (6 cols) */}
        <div className="lg:col-span-6 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Metabolic Expenditure & Slope Limits</span>
            </h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Base Rest Metabolic Rate:</span>
              <span className="text-white font-bold">{currentDetails.metabolicBaseWatts} Watts</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Flat Terrain Walking Metabolic Power:</span>
              <span className="text-cyan-300 font-bold">{wattsFlat} Watts ({kcalPerHrFlat} kcal/hr)</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Incline Traversal (10° Slope):</span>
              <span className="text-amber-300 font-bold">{wattsSlope10} Watts</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Incline Traversal (15° Slope):</span>
              <span className="text-rose-400 font-bold">{wattsSlope15} Watts</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">PLSS Life Support Consumable Reserve:</span>
              <span className="text-emerald-400 font-bold">{currentDetails.lifeSupportHours} Hours Maximum</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Disclaimer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 font-mono flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200 uppercase block text-[10px]">Modeled Physics Estimate Notice:</strong>
          <span>
            All suit mobility, metabolic rates, and speed limits are theoretical bio-mechanical estimates modeled under 0.38g gravity using NASA EVA mobility reference standards.
          </span>
        </div>
      </div>
    </div>
  );
};
