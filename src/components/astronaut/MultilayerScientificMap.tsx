import React, { useState, useEffect } from 'react';
import {
  Layers,
  Eye,
  EyeOff,
  Sliders,
  Info,
  Database,
  ShieldAlert,
  Sparkles,
  Activity,
  Check,
  Sun,
  Thermometer,
  RefreshCw,
  Search,
  Maximize2,
  Download,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAstronautExploration } from '../../context/AstronautExplorationContext';
import { sharedExplorationStore, ActiveExplorationSession } from '../../services/sharedExplorationStore';

export const MultilayerScientificMap: React.FC = () => {
  const [activeSession, setActiveSession] = useState<ActiveExplorationSession>(() => sharedExplorationStore.getSession());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeViewMode, setActiveViewMode] = useState<'overlay' | 'original' | 'compare'>('overlay');
  
  // Layer opacities
  const [layerVisibilities, setLayerVisibilities] = useState<Record<string, boolean>>({
    optical: true,
    features: true,
    segmentation: true,
    thermal: false,
    spectral: false,
    topography: true,
    geophysical: false,
    atmospheric: false,
    radiation: true,
    chemical: false
  });

  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({
    optical: 1.0,
    features: 0.85,
    segmentation: 0.55,
    thermal: 0.6,
    spectral: 0.6,
    topography: 0.5,
    geophysical: 0.6,
    atmospheric: 0.4,
    radiation: 0.45,
    chemical: 0.5
  });

  const [selectedFeatureIdx, setSelectedFeatureIdx] = useState<number | null>(null);

  // Subscribe to live shared exploration session
  useEffect(() => {
    const unsubscribe = sharedExplorationStore.subscribe((session) => {
      setActiveSession(session);
    });
    return unsubscribe;
  }, []);

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

  const handleToggleVis = (key: string) => {
    setLayerVisibilities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpacityChange = (key: string, val: number) => {
    setLayerOpacities(prev => ({ ...prev, [key]: val }));
  };

  const handleReanalyze = async () => {
    sharedExplorationStore.setAnalysisStatus('analyzing', 'Re-analyzing active photograph with Gemini Vision AI...');
    await sharedExplorationStore.processAndSyncImage(
      activeSession.imageMetadata.url,
      activeSession.imageMetadata.fileName,
      activeSession.activeRegion
    );
  };

  const handleExportAnalysis = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeSession, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `MarsNav_Scientific_Analysis_${activeSession.activeImageId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const boulders = activeSession.imageAnalysis?.boulders || [];
  const visibleFeatures = activeSession.imageAnalysis?.visibleFeatures || [];

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
              MULTILAYER SCIENTIFIC TERRAIN ANALYSIS
            </span>
            <span className="text-xs text-cyan-400 font-mono">IMAGE-DRIVEN PLANETARY INTELLIGENCE</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Multilayer Map &amp; AI Feature Fusion ({activeSession.imageMetadata.fileName})
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl font-mono">
            Source: <strong className="text-slate-200">{activeSession.imageMetadata.source}</strong> · Resolution: {activeSession.imageMetadata.width}×{activeSession.imageMetadata.height}px
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReanalyze}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-cyan-950/40"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>REANALYZE TERRAIN</span>
          </button>
          <button
            onClick={() => setActiveViewMode(activeViewMode === 'original' ? 'overlay' : 'original')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeViewMode === 'original' ? 'Show Overlays' : 'Show Original'}</span>
          </button>
          <button
            onClick={handleExportAnalysis}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXPORT JSON</span>
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
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

      {/* Main Grid: Interactive Map Preview Stage (7 cols) + Layer Controls & Provenance (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map Preview Stage (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative group">
            {/* Stage HUD Top Bar */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
              <span className="text-cyan-400 font-bold">ACTIVE STAGE</span>
              <span>·</span>
              <span>{activeSession.imageMetadata.fileName}</span>
            </div>

            {/* Stage Canvas Viewport */}
            <div className="w-full h-[480px] bg-slate-950 relative overflow-hidden flex items-center justify-center">
              <img
                src={activeSession.imageMetadata.url}
                alt={activeSession.imageMetadata.fileName}
                className="w-full h-full object-cover filter contrast-105"
              />

              {/* Grid Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

              {/* Geological Boulders & Feature Overlays */}
              {layerVisibilities.features && activeViewMode !== 'original' && boulders.map((b, i) => {
                const isSelected = selectedFeatureIdx === i;

                return (
                  <div
                    key={b.id || i}
                    onClick={() => setSelectedFeatureIdx(i)}
                    className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                      isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                    }`}
                    style={{
                      left: `${b.normX * 100}%`,
                      top: `${b.normY * 100}%`,
                      opacity: layerOpacities.features
                    }}
                  >
                    <div className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold shadow-lg whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-600 text-white border-cyan-300'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/60 backdrop-blur-sm'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>{b.label}</span>
                    </div>
                  </div>
                );
              })}

              {/* Segmentation Heatmap Overlay */}
              {layerVisibilities.segmentation && activeViewMode !== 'original' && (
                <div
                  className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-cyan-500/10 via-transparent to-amber-500/10 mix-blend-overlay"
                  style={{ opacity: layerOpacities.segmentation }}
                />
              )}
            </div>

            {/* Stage Bottom Provenance Footer */}
            <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="truncate">Source: <strong className="text-white">{activeSession.imageMetadata.source}</strong></span>
              <span className="text-cyan-400 font-bold shrink-0">AI Vision Analyzed</span>
            </div>
          </div>

          {/* Detected Features Quick List */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>AI-Detected Geological Features ({boulders.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 font-mono text-xs">
              {boulders.map((b, idx) => (
                <div
                  key={b.id || idx}
                  onClick={() => setSelectedFeatureIdx(idx)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    selectedFeatureIdx === idx
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="truncate">
                    <strong className="text-amber-300 block truncate">{b.label}</strong>
                    <span className="text-[10px] text-slate-400">{b.dimensionsNote || 'Detected Outcrop'}</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px] shrink-0">
                    {Math.round(b.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Layer Controls & Data Availability Stack (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Multilayer Data Availability &amp; Opacity</span>
              </h3>
              <span className="text-[10px] text-cyan-400 font-mono">8 CATEGORIES</span>
            </div>

            <div className="space-y-3">
              {[
                { id: 'optical', name: '1. Optical Imagery (Active Photo)', cat: 'optical', available: true, nature: 'Observed' },
                { id: 'features', name: 'AI Geological Feature Overlays', cat: 'optical', available: true, nature: 'Derived' },
                { id: 'segmentation', name: 'Terrain Classification Heatmap', cat: 'optical', available: true, nature: 'Derived' },
                { id: 'thermal', name: '2. THEMIS Thermal Infrared', cat: 'thermal', available: false, nature: 'Unavailable' },
                { id: 'spectral', name: '3. CRISM Mineral Spectra', cat: 'spectral', available: false, nature: 'Unavailable' },
                { id: 'topography', name: '4. MOLA Topography & DEM', cat: 'topographic', available: true, nature: 'Observed' },
                { id: 'geophysical', name: '5. RIMFAX Subsurface Radar', cat: 'geophysical', available: false, nature: 'Unavailable' },
                { id: 'atmospheric', name: '6. MEDA Atmospheric Dynamics', cat: 'atmospheric', available: activeSession.environmentalObservations.isAvailable, nature: activeSession.environmentalObservations.isAvailable ? 'Observed' : 'Unavailable' },
                { id: 'radiation', name: '7. MSL RAD Surface Radiation', cat: 'radiation', available: true, nature: 'Observed' },
                { id: 'chemical', name: '8. SuperCam / PIXL Chemistry', cat: 'chemical', available: false, nature: 'Unavailable' }
              ]
                .filter(l => selectedCategory === 'all' || l.cat === selectedCategory)
                .map(layer => {
                  const isVis = layerVisibilities[layer.id];
                  const op = layerOpacities[layer.id] ?? 0.8;

                  return (
                    <div key={layer.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            onClick={() => handleToggleVis(layer.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                              isVis ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {isVis ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <span className="text-xs font-bold text-white truncate">{layer.name}</span>
                        </div>

                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                          layer.available
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-950/50 text-rose-300 border border-rose-500/40'
                        }`}>
                          {layer.available ? layer.nature : 'DATA UNAVAILABLE'}
                        </span>
                      </div>

                      {layer.available && (
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] font-mono text-slate-500">Opacity</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={op}
                            onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                          />
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">{Math.round(op * 100)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
