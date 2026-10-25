import React from 'react';
import {
  Activity,
  X,
  Compass,
  Cpu,
  Layers,
  ShieldAlert,
  Navigation,
  Database,
  Info
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MARS_REFERENCE_DATUM, JEZERO_ENVIRONMENTAL_CONTEXT } from '../../utils/marsScienceData';

export default function AppInspector() {
  const {
    activeWorkspace,
    telemetry,
    settings,
    systemStatus,
    activeDataset,
    setInspectorOpen,
    recentAnalyses
  } = useWorkspace();

  return (
    <aside className="w-[300px] max-w-[85vw] h-full bg-[#080B14] border-l border-slate-800/80 flex flex-col shrink-0 text-xs font-sans select-none overflow-hidden z-30 fixed inset-y-0 right-0 lg:static lg:h-full shadow-2xl lg:shadow-none">
      {/* Inspector Header */}
      <div className="h-12 px-4 border-b border-slate-800/80 flex items-center justify-between bg-[#060812]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-400" />
          <span className="font-semibold text-slate-200 text-xs tracking-wide">Technical Inspector</span>
        </div>
        <button
          onClick={() => setInspectorOpen(false)}
          className="p-1 rounded-md hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Close Inspector"
          aria-label="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Inspector Body - Contextual based on active tool */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 1. Context for 3D Terrain Explorer */}
        {activeWorkspace === 'explorer-3d' && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-2">
                Rover Coordinates
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="bg-black/40 p-2 rounded border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block font-sans">X (East)</span>
                    <span className="text-slate-100 font-semibold">{telemetry.x.toFixed(1)}m</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block font-sans">Y (Elev)</span>
                    <span className="text-cyan-400 font-semibold">{telemetry.y.toFixed(1)}m</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block font-sans">Z (North)</span>
                    <span className="text-slate-100 font-semibold">{telemetry.z.toFixed(1)}m</span>
                  </div>
                </div>
                <div className="flex justify-between text-[11px] pt-1 text-slate-400">
                  <span>Heading: <span className="font-mono text-slate-200">{telemetry.headingDeg.toFixed(1)}°</span></span>
                  <span>Pitch: <span className="font-mono text-slate-200">4.8°</span></span>
                  <span>Roll: <span className="font-mono text-slate-200">1.2°</span></span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Digital Elevation Model
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">DEM Source</span>
                  <span className="text-slate-200 font-mono">HiRISE PSP_001414</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Resolution</span>
                  <span className="text-slate-200 font-mono">0.25 m/px</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Datum</span>
                  <span className="text-slate-200">{MARS_REFERENCE_DATUM.datumName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Surface Gravity</span>
                  <span className="text-slate-200 font-mono">{MARS_REFERENCE_DATUM.gravity} m/s²</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                MEDA Environmental Weather
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Air Temperature</span>
                  <span className="text-slate-100 font-mono font-semibold">{telemetry.ambientTempC}°C</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Atmospheric Pressure</span>
                  <span className="text-cyan-400 font-mono font-semibold">{telemetry.atmosPressurePa} Pa</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Dust Optical Depth (τ)</span>
                  <span className="text-amber-400 font-mono font-semibold">{telemetry.dustTau}</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Solar Irradiance</span>
                  <span className="text-slate-100 font-mono font-semibold">540 W/m²</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Context for Terrain Intelligence */}
        {activeWorkspace === 'terrain-intelligence' && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-2">
                Computer Vision Model
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 space-y-2">
                <div className="text-xs font-semibold text-white">ResNet-34 U-Net (AI4Mars)</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Deep convolutional semantic segmentation network trained on NASA MSL and Mars 2020 stereo NavCam datasets.
                </p>
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Model Checkpoint:</span>
                  <span className="text-emerald-400 font-medium">Ready & Verified</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Semantic Segmentation Classes
              </div>
              <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-red-500 shrink-0" />
                    <span className="text-slate-200">Soil / Regolith</span>
                  </div>
                  <span className="font-mono text-slate-400">Class 0</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0" />
                    <span className="text-slate-200">Bedrock Outcrop</span>
                  </div>
                  <span className="font-mono text-slate-400">Class 1</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500 shrink-0" />
                    <span className="text-slate-200">Sand Dunes</span>
                  </div>
                  <span className="font-mono text-slate-400">Class 2</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-amber-400 shrink-0" />
                    <span className="text-slate-200">Boulder Hazards</span>
                  </div>
                  <span className="font-mono text-slate-400">Class 3</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Context for Route Laboratory & Planning */}
        {(activeWorkspace === 'route-lab' || activeWorkspace === 'route-comparison') && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider mb-2">
                Pathfinding Configuration
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Algorithm</span>
                  <span className="text-slate-200 font-medium">Weighted A* Search</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Heuristic</span>
                  <span className="text-slate-200">Euclidean Distance</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Grid Resolution</span>
                  <span className="text-slate-200 font-mono">28 × 16 Cells</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Safety Clearance</span>
                  <span className="text-slate-200 font-mono">1.5 m Buffer</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Traversability Cost Factors
              </div>
              <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Slope Gradient Weight</span>
                  <span className="font-mono text-slate-200">{settings.slopeWeight}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Surface Roughness</span>
                  <span className="font-mono text-slate-200">{settings.roughnessWeight}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Wheel Slip Penalty</span>
                  <span className="font-mono text-slate-200">{settings.slipWeight}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Context for Risk Assessment & Hazards */}
        {(activeWorkspace === 'risk-assessment' || activeWorkspace === 'hazard-analysis') && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-2">
                Traversability Constraints
              </div>
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Max Safe Slope</span>
                  <span className="font-mono text-orange-400 font-semibold">{settings.maxSlopeLimitDeg}°</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Rocker-Bogie Limit</span>
                  <span className="font-mono text-slate-200">18.0°</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Critical Escarpment</span>
                  <span className="font-mono text-red-400">22.0°</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Rover Mass</span>
                  <span className="font-mono text-slate-200">{settings.roverMassKg} kg</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Jezero Danger Zones
              </div>
              <div className="space-y-2 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 text-xs">
                <div className="p-2 bg-black/40 rounded border border-slate-800/80">
                  <span className="font-semibold text-slate-200 block">South Séítah Megaripples</span>
                  <span className="text-[11px] text-slate-400">Loose regolith wheel entrapment risk</span>
                </div>
                <div className="p-2 bg-black/40 rounded border border-slate-800/80">
                  <span className="font-semibold text-slate-200 block">Belva Crater Slump Wall</span>
                  <span className="text-[11px] text-slate-400">22.4° slope scarp & loose scree</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Dataset Provenance Section */}
        <div>
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Active Study Region
          </div>
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Site</span>
              <span className="text-slate-200 font-medium">Jezero Crater Delta</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Coordinates</span>
              <span className="text-slate-200 font-mono">18.441° N, 77.412° E</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Target Feature</span>
              <span className="text-slate-200">Octavia E. Butler Landing</span>
            </div>
          </div>
        </div>

        {/* Recent Operations Log */}
        <div>
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Recent Analysis Log
          </div>
          <div className="space-y-2">
            {recentAnalyses.slice(0, 3).map((record, idx) => (
              <div key={idx} className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200">{record.type}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">{record.status}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed truncate">{record.details}</p>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
