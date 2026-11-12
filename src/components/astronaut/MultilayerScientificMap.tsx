import React, { useState } from 'react';
import { Layers, Eye, EyeOff, Sliders, Info, Database, ShieldAlert, Sparkles, Activity, Check, Sun, Thermometer } from 'lucide-react';
import { useAstronautExploration, MapLayerDefinition } from '../../context/AstronautExplorationContext';

export const MultilayerScientificMap: React.FC = () => {
  const { layers, toggleLayerVisibility, setLayerOpacity } = useAstronautExploration();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedInspectLayerId, setSelectedInspectLayerId] = useState<string>(layers[0]?.id || '');

  const categories = [
    { id: 'all', label: 'ALL LAYERS' },
    { id: 'optical', label: 'OPTICAL' },
    { id: 'thermal', label: 'THERMAL' },
    { id: 'spectral', label: 'SPECTRAL' },
    { id: 'topographic', label: 'TOPO & DEM' },
    { id: 'geophysical', label: 'GEOPHYSICAL' },
    { id: 'atmospheric', label: 'ATMOSPHERIC' },
    { id: 'radiation', label: 'RADIATION' },
    { id: 'chemical', label: 'CHEMICAL' }
  ];

  const filteredLayers = layers.filter(l => selectedCategory === 'all' || l.category === selectedCategory);
  const activeInspectLayer = layers.find(l => l.id === selectedInspectLayerId) || layers[0];

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
              MULTILAYER SCIENTIFIC MAP STACK
            </span>
            <span className="text-xs text-slate-400 font-mono">8 Data Categories · Multi-Spectral Fusion</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Planetary Multi-Sensor Overlay & Layer Controls</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Overlay optical imagery, thermal inertia, CRISM mineral spectra, MOLA DEM elevation contours, RIMFAX subsurface radar profiles, MEDA weather fields, and RAD radiation observations.
          </p>
        </div>

        {/* Active Layers Counter Badge */}
        <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300">Active Layers:</span>
          <strong className="text-cyan-300 font-bold text-sm">
            {layers.filter(l => l.visible).length} / {layers.length}
          </strong>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
                : 'bg-[#0B1021] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Layer Stack Control List + Interactive Layer Preview Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Layer Controls List (7 cols) */}
        <div className="lg:col-span-7 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Layer Visibility & Opacity Controls ({filteredLayers.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Independent Blend Sliders</span>
          </div>

          <div className="space-y-3">
            {filteredLayers.map((layer) => {
              const isInspected = activeInspectLayer.id === layer.id;

              return (
                <div
                  key={layer.id}
                  onClick={() => setSelectedInspectLayerId(layer.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                    isInspected
                      ? 'bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-950/20'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                        className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                          layer.visible
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                        title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                      >
                        {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{layer.name}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                            layer.nature === 'Observed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            layer.nature === 'Derived' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {layer.nature}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">{layer.source}</p>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-300 shrink-0">
                      {Math.round(layer.opacity * 100)}% Opacity
                    </span>
                  </div>

                  {/* Opacity Slider Rail */}
                  <div className="flex items-center gap-3 pt-1" onClick={e => e.stopPropagation()}>
                    <span className="text-[10px] font-mono text-slate-500">0%</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={layer.opacity}
                      onChange={e => setLayerOpacity(layer.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <span className="text-[10px] font-mono text-slate-500">100%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Layer Provenance & Metadata Inspector (5 cols) */}
        <div className="lg:col-span-5 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">SPECIFICATION & PROVENANCE</span>
            <h3 className="text-base font-bold text-white mt-0.5">{activeInspectLayer.name}</h3>
          </div>

          <p className="text-xs text-slate-300 font-sans leading-relaxed">{activeInspectLayer.description}</p>

          {/* Interactive Legend Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 font-mono text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Legend & Dynamic Ramp ({activeInspectLayer.legendUnits})</span>
            <div className="h-4 w-full rounded bg-gradient-to-r from-indigo-600 via-cyan-400 via-amber-400 to-rose-500 border border-slate-700" />
            <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
              <span>Min: {activeInspectLayer.legendMinMax[0]}</span>
              <span>Ramp: {activeInspectLayer.colorRamp}</span>
              <span>Max: {activeInspectLayer.legendMinMax[1]}</span>
            </div>
          </div>

          {/* Provenance Metadata Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Data Source:</span>
              <span className="text-slate-200 font-semibold text-right max-w-[200px] truncate">{activeInspectLayer.source}</span>
            </div>

            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Acquisition Date:</span>
              <span className="text-cyan-300 font-semibold">{activeInspectLayer.acquisitionDate}</span>
            </div>

            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Spatial Resolution:</span>
              <span className="text-white font-semibold">{activeInspectLayer.resolution}</span>
            </div>

            <div className="flex justify-between pb-2 border-b border-slate-800">
              <span className="text-slate-400">Spatial Coverage:</span>
              <span className="text-slate-200 font-semibold">{activeInspectLayer.coverage}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Uncertainty Status:</span>
              <span className="text-emerald-400 font-semibold">{activeInspectLayer.uncertainty}</span>
            </div>
          </div>

          {/* Science Notice Disclaimer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 space-y-1 font-sans">
            <strong className="text-slate-200 font-mono text-[10px] uppercase block">Data Provenance Protocol:</strong>
            <p>
              Orbital sensor measurements (HiRISE, CRISM, THEMIS, MOLA) are processed via USGS Astrogeology pipelines. In-situ streams (MEDA, RAD, RIMFAX, SuperCam) represent direct rover observations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
