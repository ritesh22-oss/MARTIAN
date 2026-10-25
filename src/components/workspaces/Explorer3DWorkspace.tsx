import React, { useState } from 'react';
import {
  Compass,
  Layers,
  Eye,
  Camera,
  RotateCcw,
  Maximize2,
  Minimize2,
  Info
} from 'lucide-react';
import MarsTerrain3D from '../MarsTerrain3D';
import HeroSection from '../HeroSection';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MARS_REFERENCE_DATUM } from '../../utils/marsScienceData';

interface Explorer3DWorkspaceProps {
  onOpenMissions: () => void;
}

export default function Explorer3DWorkspace({ onOpenMissions }: Explorer3DWorkspaceProps) {
  const { setActiveWorkspace, activeDataset, activeTerrainSource, setActiveTerrainSource } = useWorkspace();
  const [viewMode, setViewMode] = useState<'tactical' | 'cinematic'>('tactical');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className={`flex flex-col h-full font-sans text-xs ${isExpanded ? 'fixed inset-0 z-50 bg-[#05070E] p-0' : 'p-4 lg:p-6'}`}>
      {/* 3D Viewport Toolbar */}
      <div className="bg-[#090D1A] border border-slate-800/80 rounded-t-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-orange-400 font-semibold tracking-wide">
            <Compass className="w-4 h-4" />
            <span className="text-white text-xs">Planetary 3D Viewport</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Mode Switcher: Tactical HiRISE vs Cinematic Rover View */}
          <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('tactical')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'tactical'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tactical HiRISE DEM
            </button>
            <button
              onClick={() => setViewMode('cinematic')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'cinematic'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rover NavCam View
            </button>
          </div>

          {/* Terrain DTM Source Selector */}
          <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 text-[10px]">DTM:</span>
            <select
              aria-label="DTM Terrain Source"
              value={activeTerrainSource}
              onChange={e => setActiveTerrainSource(e.target.value as any)}
              className="bg-transparent text-cyan-400 font-mono text-xs focus:outline-none cursor-pointer"
            >
              <option value="hirise-jezero" className="bg-slate-900 text-slate-200">HiRISE Jezero Fan (PSP_001414_1780)</option>
              <option value="hirise-belva" className="bg-slate-900 text-slate-200">HiRISE Belva Basin (ESP_037166_1985)</option>
              <option value="custom" className="bg-slate-900 text-slate-200">Olympia Cavi Dunes (ESP_068294_1985)</option>
              <option value="procedural" className="bg-slate-900 text-slate-200">Procedural Synthetic Model</option>
            </select>
          </div>
        </div>

        {/* Viewport Metadata & Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveWorkspace('live-mission-data')}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono text-[11px] border border-slate-700 transition"
            title="Browse NASA PDS & raw rover observations"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live NASA Stream
          </button>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Datum: <span className="text-slate-200">MOLA Areoid</span></span>
            <span className="text-slate-600">·</span>
            <span>Res: <span className="text-emerald-400">0.25 m/px</span></span>
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

      {/* Main 3D Canvas Area */}
      <div className="flex-1 min-h-[580px] bg-[#05070E] border-x border-b border-slate-800/80 rounded-b-xl overflow-hidden relative shadow-xl">
        {viewMode === 'tactical' ? (
          <MarsTerrain3D onOpenMissions={onOpenMissions} />
        ) : (
          <HeroSection setActiveSection={(id: string) => setActiveWorkspace(id as any)} />
        )}
      </div>

      {/* Scene Attribution & Provenance Notice Footer */}
      <div className="mt-2.5 px-1 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Digital elevation reconstruction from MRO HiRISE stereo pair <code className="text-slate-300 font-mono">PSP_001414_1780</code> and MOLA reference datum.
          </span>
        </div>
        <div className="text-slate-400 font-mono">
          Jezero Crater · 18.441° N, 77.412° E
        </div>
      </div>
    </div>
  );
}
