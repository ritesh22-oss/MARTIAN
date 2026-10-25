import React, { useState } from 'react';
import {
  Compass,
  Cpu,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Navigation,
  CheckCircle2,
  Clock,
  ArrowRight,
  Database,
  Terminal,
  Activity,
  Sliders,
  FileSpreadsheet
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MARS_REFERENCE_DATUM } from '../../utils/marsScienceData';
import TerrainIntelligenceVerifyModal from '../TerrainIntelligenceVerifyModal';
import RiskAwareNavVerifyModal from '../RiskAwareNavVerifyModal';
import RouteOptimizationVerifyModal from '../RouteOptimizationVerifyModal';

export default function OverviewWorkspace() {
  const {
    setActiveWorkspace,
    activeDataset,
    systemStatus,
    telemetry,
    settings,
    recentAnalyses
  } = useWorkspace();

  const [activeVerifyModal, setActiveVerifyModal] = useState<'terrain' | 'risk' | 'route' | null>(null);

  // Pre-flight engineering verification checklist
  const [checklist, setChecklist] = useState([
    { id: 'dtm', label: 'Verify HiRISE Digital Elevation Model (DEM) datum and resolution (0.25 m/px)', done: true },
    { id: 'ai4mars', label: 'Confirm AI4Mars semantic segmentation weights checkpoint', done: true },
    { id: 'slope', label: 'Set traversability slope threshold (14.0° max limit)', done: true },
    { id: 'waypoints', label: 'Define start position and target science waypoint on Jezero grid', done: false },
    { id: 'harness', label: 'Execute unit validation test harness before route dispatch', done: false }
  ]);

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const technicalModules = [
    {
      id: 'terrain' as const,
      workspaceTarget: 'terrain-intelligence' as const,
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      title: "Terrain Intelligence",
      category: "Computer Vision",
      description: "Classifies rover camera imagery into 4 ground classes (Soil, Bedrock, Sand, Boulders) using the NASA AI4Mars ResNet-34 U-Net network.",
      specs: [
        { label: "Architecture", val: "ResNet-34 U-Net" },
        { label: "Classes", val: "4 Ground Classes" },
        { label: "Data Source", val: "NavCam Stereo Pairs" }
      ]
    },
    {
      id: 'risk' as const,
      workspaceTarget: 'risk-assessment' as const,
      icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
      title: "Risk-Aware Navigation",
      category: "Traversability Modeling",
      description: "Computes traversability cost surfaces using local topographical gradients, regolith sinkage risk, and rocker-bogie stability envelopes.",
      specs: [
        { label: "Max Safe Slope", val: `${settings.maxSlopeLimitDeg}° Limit` },
        { label: "Slip Risk Matrix", val: "Wheel Trenching Model" },
        { label: "Roughness Weight", val: `${settings.roughnessWeight} Coeff` }
      ]
    },
    {
      id: 'route' as const,
      workspaceTarget: 'route-lab' as const,
      icon: <Navigation className="w-5 h-5 text-orange-400" />,
      title: "Route Optimization",
      category: "Heuristic Search",
      description: "Applies heuristic A* pathfinding across digital elevation models to compute energy-efficient, collision-free rover traversal vectors.",
      specs: [
        { label: "Algorithm", val: "Weighted A* Graph Search" },
        { label: "Heuristic", val: "Euclidean + Cost Factor" },
        { label: "Clearance Buffer", val: "1.5 m Rover Hull" }
      ]
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-xs font-sans w-full">
      {/* 1. Header & Quick Actions */}
      <div className="overview-hero-card bg-[#0A0E1C] border border-slate-800/80 p-5 sm:p-6 lg:p-7 rounded-xl shadow-lg">
        <div className="overview-hero-grid">
          {/* Left Region: Text & Content (flex: 1, min-width: 0, max-width: 650px) */}
          <div className="min-w-0 max-w-[650px] space-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
              <span className="text-orange-400 font-semibold">Jezero Crater Study Region</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Sol 428 Telemetry</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="font-mono">Datum: {MARS_REFERENCE_DATUM.datumName}</span>
            </div>

            <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold text-white tracking-tight leading-snug">
              Mars Terrain Intelligence &amp; Robotic Navigation
            </h1>

            <p className="text-slate-300 text-sm sm:text-[15px] leading-relaxed">
              Mission workstation integrating semantic terrain segmentation, digital elevation grids, and multi-objective autonomous path planning.
            </p>
          </div>

          {/* Right Region: Dedicated Action Buttons (Centered, Aligned Vertically on Desktop) */}
          <div className="overview-hero-actions shrink-0">
            <button
              type="button"
              onClick={() => setActiveWorkspace('explorer-3d')}
              className="h-11 px-5 rounded-lg bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm shadow-orange-950/40"
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>Launch 3D Explorer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveWorkspace('route-lab')}
              className="h-11 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white border border-slate-700/80 font-semibold text-xs tracking-wide flex items-center justify-center gap-2.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Navigation className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Route Laboratory</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Compact Status Strip (4 Balanced Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#090D1A] border border-slate-800/80 p-3.5 rounded-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Active Dataset</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 truncate">HiRISE Jezero Fan</div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">PSP_001414 · 0.25 m/px</div>
          </div>
          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex justify-between">
            <span>Datum:</span>
            <span className="text-slate-200 font-mono">MOLA Areoid</span>
          </div>
        </div>

        <div className="bg-[#090D1A] border border-slate-800/80 p-3.5 rounded-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Computer Vision</span>
            <Cpu className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">AI4Mars ResNet-34</div>
            <div className="text-[11px] text-slate-400 mt-0.5">4 Semantic Ground Classes</div>
          </div>
          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex justify-between">
            <span>Status:</span>
            <span className="text-emerald-400 font-medium">Model Checkpoint Verified</span>
          </div>
        </div>

        <div className="bg-[#090D1A] border border-slate-800/80 p-3.5 rounded-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Safety Envelope</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 font-mono">{settings.maxSlopeLimitDeg}° Max Slope</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Rocker-Bogie Dynamics (1,025 kg)</div>
          </div>
          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex justify-between">
            <span>Critical Scree:</span>
            <span className="text-amber-400 font-mono">22.0° Escarpment</span>
          </div>
        </div>

        <div className="bg-[#090D1A] border border-slate-800/80 p-3.5 rounded-lg flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Compute Pipeline</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">
              {systemStatus.backend === 'connected' ? 'Online Server' : 'Autonomous Core'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {systemStatus.backend === 'connected' ? `Latency: ${systemStatus.backendLatencyMs || 12} ms` : 'Local deterministic fallback'}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex justify-between">
            <span>ORBIT Assistant:</span>
            <span className="text-emerald-400 font-medium">Ready</span>
          </div>
        </div>
      </div>

      {/* 3. Three Core Technical Modules (Balanced Height & Specs) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
            Core Analytical Modules
          </h2>
          <span className="text-[11px] text-slate-400">Desktop-First Planetary Robotics Pipeline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          {technicalModules.map((module) => (
            <div
              key={module.id}
              className="bg-[#090D1A] border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    {module.icon}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{module.category}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{module.title}</h3>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    {module.description}
                  </p>
                </div>

                {/* Specs list with quiet styling */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-[11px]">
                  {module.specs.map((spec, i) => (
                    <div key={i} className="flex justify-between text-slate-400">
                      <span>{spec.label}:</span>
                      <span className="text-slate-200 font-medium font-mono">{spec.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/60 flex items-center gap-2">
                <button
                  onClick={() => setActiveWorkspace(module.workspaceTarget)}
                  className="flex-1 py-2 px-3 rounded-md bg-orange-600/15 hover:bg-orange-600/25 border border-orange-500/30 text-orange-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Open Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveVerifyModal(module.id)}
                  className="py-2 px-3 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-medium text-xs transition-colors cursor-pointer"
                  title="View technical specification and verification rubric"
                >
                  Verify
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Operations Checklist & Recent Analysis Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Pre-Flight Engineering Checklist */}
        <div className="bg-[#090D1A] border border-slate-800/80 p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Pre-Flight Traversal Verification
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {checklist.filter(c => c.done).length} / {checklist.length} Complete
            </span>
          </div>

          <div className="space-y-2">
            {checklist.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-2.5 p-2 rounded-md hover:bg-slate-900/60 transition-colors cursor-pointer text-xs"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleChecklistItem(item.id)}
                  className="mt-0.5 rounded border-slate-700 text-orange-500 focus:ring-0 cursor-pointer"
                />
                <span className={item.done ? 'text-slate-300 line-through' : 'text-slate-200'}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Real Activity & Execution Log */}
        <div className="bg-[#090D1A] border border-slate-800/80 p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Recent Traversal & Analysis Log
              </h3>
            </div>
            <button
              onClick={() => setActiveWorkspace('audit')}
              className="text-[11px] text-orange-400 hover:text-orange-300 font-medium transition-colors cursor-pointer"
            >
              Full Mission Log →
            </button>
          </div>

          <div className="space-y-2">
            {recentAnalyses.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-md bg-slate-900/40 border border-slate-800/60 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{item.type}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">{item.status}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.details}</p>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verification Modals */}
      {activeVerifyModal === 'terrain' && (
        <TerrainIntelligenceVerifyModal isOpen={true} onClose={() => setActiveVerifyModal(null)} />
      )}
      {activeVerifyModal === 'risk' && (
        <RiskAwareNavVerifyModal isOpen={true} onClose={() => setActiveVerifyModal(null)} />
      )}
      {activeVerifyModal === 'route' && (
        <RouteOptimizationVerifyModal isOpen={true} onClose={() => setActiveVerifyModal(null)} />
      )}
    </div>
  );
}
