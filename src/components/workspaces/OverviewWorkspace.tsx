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
  FileSpreadsheet,
  Check,
  Edit2,
  Plus,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  FileText,
  Rocket,
  MapPin,
  Calendar,
  Layers3,
  HardDrive
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { MARS_REFERENCE_DATUM } from '../../utils/marsScienceData';
import TerrainIntelligenceVerifyModal from '../TerrainIntelligenceVerifyModal';
import RiskAwareNavVerifyModal from '../RiskAwareNavVerifyModal';
import RouteOptimizationVerifyModal from '../RouteOptimizationVerifyModal';

export default function OverviewWorkspace() {
  const { user, login } = useAuth();
  const {
    setActiveWorkspace,
    activeDataset,
    systemStatus,
    settings,
    activeMission,
    activeMissionId,
    setMissionManagerOpen,
    createNewMission,
    renameMission,
    runMissionValidation,
    updateActiveMission
  } = useWorkspace();

  const [activeVerifyModal, setActiveVerifyModal] = useState<'terrain' | 'risk' | 'route' | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [showFullLogModal, setShowFullLogModal] = useState(false);

  // Fallback defaults if activeMission is loading
  const currentMission = activeMission || {
    id: activeMissionId || 'msn_default',
    name: 'Sol 428 Jezero Delta Exploration',
    status: 'In Progress',
    roverProfile: 'Perseverance (Mars 2020)',
    createdAt: new Date().toISOString(),
    startPoint: { x: 35, y: 220 },
    destinationPoint: { x: 220, y: 45 },
    checkpoints: [],
    traversalLog: [],
    segmentedHazards: [],
    selectedStrategy: 'alpha'
  };

  const checkpoints = currentMission.checkpoints || [];
  const completedCheckpointsCount = checkpoints.filter((c: any) => c.status === 'Completed').length;
  const traversalLog = currentMission.traversalLog || [];

  const handleStartRename = () => {
    setTempTitle(currentMission.name);
    setEditingTitle(true);
  };

  const handleSaveRename = async () => {
    if (tempTitle.trim() && currentMission.id) {
      await renameMission(currentMission.id, tempTitle.trim());
    }
    setEditingTitle(false);
  };

  const handleCheckpointClick = (cp: any) => {
    if (cp.id === 'dtm' || cp.id === 'ai4mars') {
      setActiveWorkspace('terrain-intelligence');
    } else if (cp.id === 'waypoints') {
      setActiveWorkspace('route-lab');
    } else if (cp.id === 'slope') {
      setActiveWorkspace('risk-assessment');
    } else if (cp.id === 'harness') {
      setActiveWorkspace('validation-harness');
    }
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
        { label: "Detected Hazards", val: `${Array.isArray(currentMission.segmentedHazards) ? currentMission.segmentedHazards.length : 0} Hazards` },
        { label: "Data Source", val: currentMission.imageProvenance?.identifier || "HiRISE Jezero Fan" }
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
        { label: "Strategy", val: `${(currentMission.selectedStrategy || 'alpha').toUpperCase()} Profile` },
        { label: "Rover Profile", val: currentMission.roverProfile || "Perseverance" }
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
        { label: "Start Coordinate", val: `(${currentMission.startPoint?.x || 35}, ${currentMission.startPoint?.y || 220})` },
        { label: "Dest Coordinate", val: `(${currentMission.destinationPoint?.x || 220}, ${currentMission.destinationPoint?.y || 45})` }
      ]
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-xs font-sans w-full">
      {/* 1. Header & Active Mission Controls */}
      <div className="overview-hero-card bg-[#0A0E1C] border border-slate-800/80 p-5 sm:p-6 lg:p-7 rounded-2xl shadow-xl">
        <div className="overview-hero-grid">
          {/* Left Region: Mission Identity */}
          <div className="min-w-0 max-w-[700px] space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[10px] uppercase tracking-wider font-bold">
                ACTIVE MSN ID: {currentMission.id}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] border ${
                currentMission.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                currentMission.status === 'Blocked' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                currentMission.status === 'In Progress' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {currentMission.status || 'Not Started'}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-orange-400">{currentMission.roverProfile || 'Perseverance (Mars 2020)'}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="flex items-center gap-1">
                {user ? <Database className="w-3 h-3 text-emerald-400" /> : <HardDrive className="w-3 h-3 text-amber-400" />}
                <span>{user ? 'Cloud Sync (Firestore)' : 'Local Persistence'}</span>
              </span>
            </div>

            {/* Title with edit mode */}
            {editingTitle ? (
              <div className="flex items-center gap-2 max-w-lg">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black border border-cyan-400 text-white font-bold text-lg w-full focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveRename}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white font-semibold text-xs shrink-0 cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold text-white tracking-tight leading-snug">
                  {currentMission.name}
                </h1>
                <button
                  onClick={handleStartRename}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Rename active mission"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <p className="text-slate-300 text-sm sm:text-[15px] leading-relaxed">
              {currentMission.description || 'Isolated mission workspace for Mars Jezero Crater traverse planning, terrain hazard masks, and path telemetry.'}
            </p>

            {/* Quick telemetry summary bar */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1 text-slate-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                <span>Start: ({currentMission.startPoint?.x || 35}, {currentMission.startPoint?.y || 220})</span>
              </span>
              <span>&rarr;</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dest: ({currentMission.destinationPoint?.x || 220}, {currentMission.destinationPoint?.y || 45})</span>
              </span>
              <span>·</span>
              <span className="text-slate-300">
                Created: {new Date(currentMission.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Right Region: Mission Control Actions */}
          <div className="overview-hero-actions shrink-0 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => setMissionManagerOpen(true)}
              className="h-11 px-4 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Rocket className="w-4 h-4 text-cyan-400" />
              <span>Switch / Manage Missions</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveWorkspace('explorer-3d')}
              className="h-11 px-5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap shadow-md shadow-orange-950/40"
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>Launch 3D Explorer</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Compact Status Strip (4 Balanced Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#090D1A] border border-slate-800/80 p-3.5 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Active Dataset &amp; DEM</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 truncate">
              {currentMission.imageProvenance?.source || activeDataset}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              {currentMission.imageProvenance?.identifier || 'PSP_001414_1780'} · 0.25 m/px
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex justify-between">
            <span>Datum:</span>
            <span className="text-slate-200 font-mono">MOLA Areoid</span>
          </div>
        </div>

        <div className="bg-[#090D1A] border border-slate-800/80 p-3.5 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Computer Vision</span>
            <Cpu className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">
              {currentMission.detectionMethod || 'Classical Computer Vision'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {Array.isArray(currentMission.segmentedHazards) ? currentMission.segmentedHazards.length : 0} Hazards Segmented
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex justify-between">
            <span>Weights:</span>
            <span className="text-emerald-400 font-medium">ResNet-34 Checkpoint</span>
          </div>
        </div>

        <div className="bg-[#090D1A] border border-slate-800/80 p-3.5 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Safety Envelope</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100 font-mono">
              {currentMission.maxSlopeLimit || settings.maxSlopeLimitDeg}° Max Slope
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Strategy: {(currentMission.selectedStrategy || 'alpha').toUpperCase()} Profile
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex justify-between">
            <span>Checkpoints:</span>
            <span className="text-cyan-300 font-mono font-bold">{completedCheckpointsCount} / {checkpoints.length} Passed</span>
          </div>
        </div>

        <div className="bg-[#090D1A] border border-slate-800/80 p-3.5 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span className="font-semibold uppercase tracking-wider">Compute Backend</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-100">
              {systemStatus.backend === 'connected' ? 'Online Server' : 'Autonomous Core'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {user ? `User: ${(user as any)?.displayName || (user as any)?.email || 'Authenticated'}` : 'Local Workspace Session'}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex justify-between">
            <span>Validation:</span>
            <span className={currentMission.validationPassed ? "text-emerald-400 font-bold" : "text-amber-400"}>
              {currentMission.validationPassed ? 'Harness Passed' : 'Pending Harness Execution'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Core Technical Modules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
            Core Analytical Modules
          </h2>
          <span className="text-[11px] text-slate-400 font-mono">Mission: {currentMission.name}</span>
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

      {/* 4. Pre-Flight Traversal Verification & Genuine Mission Traversal Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Automatic Pre-Flight Checklist */}
        <div className="bg-[#090D1A] border border-slate-800/80 p-6 rounded-2xl space-y-5 flex flex-col h-full shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white uppercase tracking-wider">
                    Pre-Flight Traversal Verification
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Auto-evaluates active mission telemetry &amp; DEM state
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-cyan-300 font-mono bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30 font-bold">
                {completedCheckpointsCount} / {checkpoints.length} Passed
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                  style={{ width: `${checkpoints.length > 0 ? (completedCheckpointsCount / checkpoints.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {checkpoints.map((cp: any) => {
              const isCompleted = cp.status === 'Completed';
              return (
                <div
                  key={cp.id}
                  onClick={() => handleCheckpointClick(cp)}
                  className={`w-full p-3.5 rounded-xl transition-all duration-200 border cursor-pointer ${
                    isCompleted 
                      ? 'bg-emerald-500/[0.04] border-emerald-500/30 hover:bg-emerald-500/[0.08]' 
                      : 'bg-[#060912] border-white/10 hover:border-cyan-500/40 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isCompleted 
                          ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                          : 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                      }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : <Clock className="w-3 h-3" />}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[12px] font-bold leading-tight ${isCompleted ? 'text-slate-200' : 'text-amber-200'}`}>
                          {cp.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 border ${
                          isCompleted ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {cp.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono leading-relaxed">
                        {cp.reason}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!currentMission.validationPassed && (
            <div className="pt-2">
              <button
                onClick={() => {
                  runMissionValidation();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Execute Unit Validation Test Harness Now</span>
              </button>
            </div>
          )}
        </div>

        {/* Genuine Active Mission Traversal Log */}
        <div className="bg-[#090D1A] border border-slate-800/80 p-5 rounded-2xl space-y-4 shadow-lg flex flex-col h-full">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Active Mission Traversal Log
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Event history isolated to "{currentMission.name}"
                </p>
              </div>
            </div>
            {traversalLog.length > 0 && (
              <button
                onClick={() => setShowFullLogModal(true)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono font-medium transition-colors cursor-pointer"
              >
                Full History ({traversalLog.length}) &rarr;
              </button>
            )}
          </div>

          {traversalLog.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 bg-black/20 rounded-xl border border-white/5">
              <Terminal className="w-8 h-8 text-slate-600" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-300">No Events Logged For This Mission</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Run terrain detection, pathfinding, or validation harness to generate real analysis events for this mission.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
              {traversalLog.slice(0, 6).map((item: any) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        item.status === 'Success' ? 'bg-emerald-400' :
                        item.status === 'Warning' ? 'bg-amber-400' :
                        item.status === 'Error' ? 'bg-rose-400' : 'bg-cyan-400'
                      }`} />
                      {item.type}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recent'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {item.details}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                    <span>Source: {item.method || 'MARSNAV Core'}</span>
                    <span className="text-slate-400 font-mono">MSN: {item.missionId || currentMission.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Full Traversal Log Modal */}
      {showFullLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl bg-[#0B1020] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Full Mission Traversal Log: {currentMission.name}</h3>
              </div>
              <button onClick={() => setShowFullLogModal(false)} className="text-slate-400 hover:text-white">
                <Check className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 font-mono">
              {traversalLog.map((item: any) => (
                <div key={item.id} className="p-3 bg-black/40 border border-white/10 rounded-xl space-y-1">
                  <div className="flex justify-between text-xs font-bold text-cyan-300">
                    <span>{item.type}</span>
                    <span className="text-slate-500">{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-200 font-sans">{item.details}</p>
                  <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-white/5">
                    <span>Method: {item.method || 'System'}</span>
                    <span>Status: {item.status}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-white/10 bg-slate-950 flex justify-end">
              <button
                onClick={() => setShowFullLogModal(false)}
                className="px-4 py-1.5 rounded-lg bg-white/10 text-white text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
