import React, { useState } from 'react';
import {
  Compass,
  Layers,
  Eye,
  Camera,
  RotateCcw,
  Maximize2,
  Minimize2,
  Info,
  Rocket,
  Navigation,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import MarsTerrain3D from '../MarsTerrain3D';
import HeroSection from '../HeroSection';
import MarsLandingSimulation from '../MarsLandingSimulation';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MARS_REFERENCE_DATUM } from '../../utils/marsScienceData';

interface Explorer3DWorkspaceProps {
  onOpenMissions: () => void;
}

export type ActiveSimulationType = 'rover_navigation' | 'lander_deployment';

export default function Explorer3DWorkspace({ onOpenMissions }: Explorer3DWorkspaceProps) {
  const { setActiveWorkspace, activeDataset, activeTerrainSource, setActiveTerrainSource } = useWorkspace();
  const [activeSimulation, setActiveSimulation] = useState<ActiveSimulationType>('rover_navigation');
  const [viewMode, setViewMode] = useState<'tactical' | 'cinematic'>('tactical');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className={`flex flex-col h-full font-sans text-xs ${isExpanded ? 'fixed inset-0 z-50 bg-[#05070E] p-0' : 'p-4 lg:p-6'}`}>
      {/* 1. PRIMARY TWO-SIMULATION SELECTION HEADER */}
      <div className="bg-[#0B1020] border border-slate-800 rounded-t-2xl p-3 sm:px-5 sm:py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-orange-400 tracking-wider font-bold">
                MARSNAV 3D PLANETARY EXPLORER
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                WebGL 2.0 Real-Time
              </span>
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
            <span className="text-slate-400 text-[10px] uppercase font-bold">Rover Nav Controls:</span>

            {/* Mode Switcher: Tactical HiRISE vs Cinematic Rover View */}
            <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode('tactical')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === 'tactical'
                    ? 'bg-orange-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tactical HiRISE DEM
              </button>
              <button
                onClick={() => setViewMode('cinematic')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  viewMode === 'cinematic'
                    ? 'bg-orange-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rover NavCam View
              </button>
            </div>

            {/* Terrain DTM Source Selector */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
              <span className="text-slate-400">DTM:</span>
              <select
                aria-label="DTM Terrain Source"
                value={activeTerrainSource}
                onChange={e => setActiveTerrainSource(e.target.value as any)}
                className="bg-transparent text-cyan-400 font-mono text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="hirise-jezero" className="bg-slate-900 text-slate-200">HiRISE Jezero Fan (PSP_001414_1780)</option>
                <option value="hirise-belva" className="bg-slate-900 text-slate-200">HiRISE Belva Basin (ESP_037166_1985)</option>
                <option value="custom" className="bg-slate-900 text-slate-200">Olympia Cavi Dunes (ESP_068294_1985)</option>
                <option value="procedural" className="bg-slate-900 text-slate-200">Procedural Synthetic Model</option>
              </select>
            </div>
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
            <span>Scale: <span className="text-emerald-400">1:1 Physical</span></span>
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
        {activeSimulation === 'rover_navigation' ? (
          /* SIMULATION 01 — ROVER NAVIGATION */
          viewMode === 'tactical' ? (
            <MarsTerrain3D onOpenMissions={onOpenMissions} />
          ) : (
            <HeroSection setActiveSection={(id: string) => setActiveWorkspace(id as any)} />
          )
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
              ? 'Simulation 01: Digital elevation reconstruction from MRO HiRISE stereo pair PSP_001414_1780 and MOLA reference datum.'
              : 'Simulation 02: Conceptual Mars Lander Simulation with articulated 4-point landing gear, hinged egress ramp & Perseverance rover deployment.'}
          </span>
        </div>
        <div className="text-slate-400">
          Jezero Crater · 18.441° N, 77.412° E
        </div>
      </div>
    </div>
  );
}
