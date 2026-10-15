import React, { useState } from 'react';
import { Layers, Eye, EyeOff, Sliders, MapPin, Mountain, AlertTriangle, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function MapLayerControls({
  layerOpacities = {
    elevation: 1.0,
    slope: 0.0,
    labels: 1.0,
    contours: 0.6,
    grid: 0.4
  },
  onOpacityChange,
  onPresetApply
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Quick preset configurations
  const presets = [
    {
      id: 'elevation',
      label: 'MOLA Elevation',
      icon: <Mountain className="w-3.5 h-3.5 text-cyan-400" />,
      values: { elevation: 1.0, slope: 0.0, labels: 0.8, contours: 0.6 }
    },
    {
      id: 'slope',
      label: 'Slope Hazards',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
      values: { elevation: 0.25, slope: 0.95, labels: 0.85, contours: 0.3 }
    },
    {
      id: 'geology',
      label: 'Geology & POIs',
      icon: <MapPin className="w-3.5 h-3.5 text-red-400" />,
      values: { elevation: 0.7, slope: 0.2, labels: 1.0, contours: 0.4 }
    },
    {
      id: 'composite',
      label: 'Composite Scientific',
      icon: <Sparkles className="w-3.5 h-3.5 text-orange-400" />,
      values: { elevation: 0.85, slope: 0.65, labels: 1.0, contours: 0.5 }
    }
  ];

  return (
    <div className="bg-[#0B1020]/90 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl transition-all duration-300 max-w-sm w-full select-none text-left">
      {/* Header with expand/collapse */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              MapLayerControls
            </h4>
            <span className="text-[10px] font-mono text-slate-400">
              Multi-Layer Opacity Blender
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          aria-label={isExpanded ? "Collapse controls" : "Expand controls"}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-3 text-xs font-mono animate-fade-in">
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
              Layer Presets:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onPresetApply(preset.values)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-200 hover:text-white transition-all text-[11px] text-left"
                >
                  {preset.icon}
                  <span className="truncate">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Three Primary Smooth Opacity Sliders */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            {/* 1. Elevation Map Layer */}
            <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center justify-between text-slate-200">
                <span className="flex items-center space-x-1.5">
                  <Mountain className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Elevation Colormap</span>
                </span>
                <span className="text-cyan-400 font-bold">
                  {Math.round(layerOpacities.elevation * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={layerOpacities.elevation}
                onChange={(e) => onOpacityChange('elevation', parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Natural Regolith</span>
                <span>MOLA Hypsometric Tint</span>
              </div>
            </div>

            {/* 2. Slope Overlay Layer */}
            <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center justify-between text-slate-200">
                <span className="flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Slope Hazard Overlay</span>
                </span>
                <span className="text-amber-400 font-bold">
                  {Math.round(layerOpacities.slope * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={layerOpacities.slope}
                onChange={(e) => onOpacityChange('slope', parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Off (0°)</span>
                <span>Hazard Heatmap (0°–25°+)</span>
              </div>
            </div>

            {/* 3. Geological Feature Labels & Beacons */}
            <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
              <div className="flex items-center justify-between text-slate-200">
                <span className="flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>Geological Feature Labels</span>
                </span>
                <span className="text-red-400 font-bold">
                  {Math.round(layerOpacities.labels * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={layerOpacities.labels}
                onChange={(e) => onOpacityChange('labels', parseFloat(e.target.value))}
                className="w-full accent-red-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>Hidden</span>
                <span>Visible Targets & POIs</span>
              </div>
            </div>
          </div>

          {/* Quick Toggle Overlays */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layerOpacities.contours > 0.05}
                onChange={(e) => onOpacityChange('contours', e.target.checked ? 0.6 : 0)}
                className="accent-orange-500 rounded"
              />
              <span>Contours</span>
            </label>
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={layerOpacities.grid > 0.05}
                onChange={(e) => onOpacityChange('grid', e.target.checked ? 0.4 : 0)}
                className="accent-orange-500 rounded"
              />
              <span>Coord Grid</span>
            </label>
            <span className="text-[10px] text-orange-400/90 font-mono">Smooth Blend</span>
          </div>
        </div>
      )}
    </div>
  );
}
