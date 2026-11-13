import React, { useState } from 'react';
import {
  Compass,
  Layers,
  Eye,
  RotateCcw,
  Maximize2,
  Minimize2,
  Info,
  Rocket,
  Navigation,
  Sparkles,
  ShieldCheck,
  Activity
} from 'lucide-react';
import MarsTerrain3D from '../MarsTerrain3D';
import MarsLandingSimulation from '../MarsLandingSimulation';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MARS_REFERENCE_DATUM } from '../../utils/marsScienceData';

interface Explorer3DWorkspaceProps {
  onOpenMissions: () => void;
}

export type ActiveSimulationType = 'rover_navigation' | 'lander_deployment';

export default function Explorer3DWorkspace({ onOpenMissions }: Explorer3DWorkspaceProps) {
  const {
    activeTerrainSource,
    setActiveTerrainSource,
    selectedDtmData,
    selectAndLoadDtm,
    isProcessingDtm,
    selectedRegion
  } = useWorkspace();
  const [activeSimulation, setActiveSimulation] = useState<ActiveSimulationType>('rover_navigation');
  const [slopeHeatmapOn, setSlopeHeatmapOn] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [overlayLayerId, setOverlayLayerId] = useState<string>('trek_hrsc_mola_clrshade');
  const [overlayNotice, setOverlayNotice] = useState<{ status: string; message: string } | null>(null);

  const handleTerrainSourceChange = async (val: 'hirise-jezero' | 'hirise-belva' | 'custom' | 'procedural') => {
    setActiveTerrainSource(val);
    if (val === 'hirise-jezero') {
      selectAndLoadDtm({
        id: 'DTEEC_048842_1985_048908_1985_U01',
        title: 'MRO HiRISE Jezero Crater Delta DTM (PSP_001414_1780 / ESP_048842)',
        collection: 'mro_hirise_socet_dtms',
        dtmUrl: 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_048842_1985_ESP_048908_1985/DTEEC_048842_1985_048908_1985_U01.tif'
      }, 36).catch(() => {});
    } else if (val === 'hirise-belva') {
      selectAndLoadDtm({
        id: 'DTEEC_069151_1985_069296_1985_U01',
        title: 'MRO HiRISE Belva Crater Slump Escarpment (ESP_069151_1985)',
        collection: 'mro_hirise_socet_dtms',
        dtmUrl: 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_069151_1985_ESP_069296_1985/DTEEC_069151_1985_069296_1985_U01.tif'
      }, 36).catch(() => {});
    }
  };

  const handleOverlayChange = (layerId: string) => {
    setOverlayLayerId(layerId);
    const lat = selectedRegion?.centerCoords?.lat ?? 18.3842;
    const lon = selectedRegion?.centerCoords?.lon ?? 77.5819;
    (window as any).MarsSimulator?.setSurfaceOverlay?.(layerId, lat, lon);
  };

  return (
    <div className={`flex flex-col h-full font-sans text-xs ${isExpanded ? 'fixed inset-0 z-50 bg-[#05070E] p-0' : 'p-4 lg:p-6'}`}>
      {/* 1. PRIMARY TWO-SIMULATION SELECTION HEADER */}
      <div className="bg-[#0B1020] border border-slate-800 rounded-t-2xl p-3 sm:px-5 sm:py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase text-orange-400 tracking-wider font-bold">
                MARSNAV 3D PLANETARY EXPLORER
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                WebGL 2.0 · NASA Trek + USGS STAC
              </span>
              {isProcessingDtm && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-amber-950 text-amber-300 border border-amber-500/40">
                  Streaming GeoTIFF DEM...
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
              Interactive 3D Simulation Lab
            </h1>
          </div>
        </div>

        {/* Two-Simulation Selection Interface */}
        <div className="flex items-center bg-black/60 p-1 rounded-xl border border-slate-700/80 text-xs font-mono w-full md:w-auto">
          {/* SIMULATION 01: ROVER NAVIGATION */}
          <button
            onClick={() => setActiveSimulation('rover_navigation')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeSimulation === 'rover_navigation'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/30 border border-orange-400/50'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>SIM 01: ROVER NAVIGATION</span>
          </button>

          {/* SIMULATION 02: LANDER & ROVER DEPLOYMENT */}
          <button
            onClick={() => setActiveSimulation('lander_deployment')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              activeSimulation === 'lander_deployment'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-600/30 border border-cyan-400/50'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>SIM 02: LANDER &amp; DEPLOYMENT</span>
          </button>
        </div>
      </div>

      {/* 2. SECONDARY VIEWPORT TOOLBAR (Contextual to active simulation) */}
      <div className="bg-[#090D1A] border-x border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
        {activeSimulation === 'rover_navigation' ? (
          /* Simulation 01 Controls */
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-slate-400 text-[10px] uppercase font-bold">Terrain &amp; Trek Drape:</span>

            {/* Terrain DTM Source Selector */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
              <span className="text-slate-400">DTM:</span>
              <select
                aria-label="DTM Terrain Source"
                value={activeTerrainSource}
                onChange={e => handleTerrainSourceChange(e.target.value as any)}
                className="bg-transparent text-cyan-400 font-mono text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="hirise-jezero" className="bg-slate-900 text-slate-200">HiRISE Jezero Delta (ESP_048842)</option>
                <option value="hirise-belva" className="bg-slate-900 text-slate-200">HiRISE Belva Crater (ESP_069151)</option>
                <option value="custom" className="bg-slate-900 text-slate-200">
                  {selectedDtmData ? `Loaded STAC: ${selectedDtmData.id}` : 'Active STAC DTM'}
                </option>
                <option value="procedural" className="bg-slate-900 text-slate-200">Procedural Synthetic Model</option>
              </select>
            </div>

            {/* NASA Mars Trek / USGS Surface Overlay Selector */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-slate-400">Texture:</span>
              <select
                aria-label="Mars Trek Surface Overlay"
                value={overlayLayerId}
                onChange={e => handleOverlayChange(e.target.value)}
                className="bg-transparent text-orange-300 font-mono text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="trek_hrsc_mola_clrshade" className="bg-slate-900 text-slate-200">NASA Trek: HRSC+MOLA Color Shade (200m)</option>
                <option value="trek_jezero_ctx_6m" className="bg-slate-900 text-slate-200">NASA Trek: Jezero CTX 6m WMTS</option>
                <option value="usgs_themis_day" className="bg-slate-900 text-slate-200">USGS: THEMIS IR Day (100m)</option>
                <option value="usgs_themis_night" className="bg-slate-900 text-slate-200">USGS: THEMIS IR Night Thermal (100m)</option>
                <option value="trek_sim3292_geology" className="bg-slate-900 text-slate-200">USGS–NASA: SIM 3292 Geologic Map</option>
                <option value="usgs_mdim21_color" className="bg-slate-900 text-slate-200">USGS: Viking MDIM 2.1 Color</option>
                <option value="hypsometric" className="bg-slate-900 text-slate-200">Hypsometric DEM Shading Only</option>
              </select>
            </div>

            {/* Slope Gradient Heatmap Toggle */}
            <button
              onClick={() => {
                const nextActive = !slopeHeatmapOn;
                (window as any).MarsSimulator?.toggleSlopeHeatmap?.(nextActive);
                setSlopeHeatmapOn(nextActive);
              }}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                slopeHeatmapOn
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20'
                  : 'bg-black/40 border-slate-700 text-slate-300 hover:text-white hover:bg-black/60'
              }`}
              title="Toggle real-time slope gradient traversability heatmap overlay"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>{slopeHeatmapOn ? 'Slope Heatmap: ON' : 'Slope Heatmap: OFF'}</span>
            </button>
          </div>
        ) : (
          /* Simulation 02 Controls */
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-cyan-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Lander Simulation:</span>
            </span>
            <span className="text-slate-300 text-[11px]">
              Multi-Stage Spacecraft Powered Descent, Touchdown Dynamics &amp; Rover Ramp Egress
            </span>
          </div>
        )}

        {/* Viewport Actions & Fullscreen */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>Datum: <span className="text-slate-200">MOLA Areoid</span></span>
            <span className="text-slate-600">·</span>
            <span>
              Relief:{' '}
              <span className="text-emerald-400">
                {activeTerrainSource !== 'procedural' && selectedDtmData
                  ? `${Math.round(selectedDtmData.minElevation)}..${Math.round(selectedDtmData.maxElevation)} m (${selectedDtmData.resolutionMeters}m/px)`
                  : 'Synthetic Preview'}
              </span>
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title={isExpanded ? "Exit Fullscreen" : "Maximize Viewport"}
            aria-label={isExpanded ? "Exit Fullscreen" : "Maximize Viewport"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4 text-orange-400" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. MAIN 3D SIMULATION CANVAS CONTAINER */}
      <div className="flex-1 min-h-[580px] bg-[#05070E] border-x border-b border-slate-800/80 rounded-b-2xl overflow-hidden relative shadow-2xl">
        {slopeHeatmapOn && activeSimulation === 'rover_navigation' && (
          <div className="absolute top-4 left-4 z-25 bg-[#0b0e14]/95 border border-emerald-500/40 p-2.5 rounded-xl shadow-2xl text-[10px] font-mono flex items-center gap-3 pointer-events-none">
            <span className="text-emerald-400 font-bold">SLOPE GRADIENT:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#10b981]" />
              <span className="text-slate-300">Safe (&lt;5°)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#f59e0b]" />
              <span className="text-slate-300">Moderate (5-15°)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#ef4444]" />
              <span className="text-slate-300">Hazard (&gt;15°)</span>
            </div>
          </div>
        )}

        {overlayNotice && activeSimulation === 'rover_navigation' && overlayNotice.status === 'error' && (
          <div className="absolute top-4 right-4 z-25 bg-amber-950/95 border border-amber-500/50 px-3 py-1.5 rounded-lg text-[10px] font-mono text-amber-200 pointer-events-none">
            {overlayNotice.message}
          </div>
        )}

        {activeSimulation === 'rover_navigation' ? (
          /* SIMULATION 01 — ROVER NAVIGATION */
          <MarsTerrain3D
            onOpenMissions={onOpenMissions}
            selectedDtmData={selectedDtmData}
            activeTerrainSource={activeTerrainSource}
            selectedRegion={selectedRegion}
            overlayLayerId={overlayLayerId}
            onOverlayStatus={setOverlayNotice}
          />
        ) : (
          /* SIMULATION 02 — SPACECRAFT LANDING & ROVER DEPLOYMENT */
          <MarsLandingSimulation onSwitchToNavigation={() => setActiveSimulation('rover_navigation')} />
        )}
      </div>

      {/* 4. SCENE ATTRIBUTION & PROVENANCE NOTICE FOOTER */}
      <div className="mt-2.5 px-1 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 gap-2 font-mono">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {activeSimulation === 'rover_navigation'
              ? activeTerrainSource !== 'procedural' && selectedDtmData
                ? `Simulation 01: Real ${selectedDtmData.title} (${selectedDtmData.sourceOrg}) + ${overlayLayerId} orbital surface drape.`
                : `Simulation 01: Synthetic procedural relief preview (${overlayLayerId} surface texture).`
              : 'Simulation 02: Conceptual Mars Lander Simulation with articulated 4-point landing gear, hinged egress ramp & Perseverance rover deployment.'}
          </span>
        </div>
        <div className="text-slate-400">
          {selectedRegion?.name || 'Jezero Crater'} · {selectedRegion?.latitude || '18.44° N'}, {selectedRegion?.longitude || '77.41° E'}
        </div>
      </div>
    </div>
  );
}
