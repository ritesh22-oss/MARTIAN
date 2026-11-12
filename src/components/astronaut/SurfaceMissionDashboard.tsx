import React, { useState } from 'react';
import {
  Compass,
  Target,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Activity,
  Footprints,
  MapPin,
  Clock,
  Radio,
  FileText,
  ChevronRight,
  Sun,
  ShieldAlert,
  Layers,
  Thermometer,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Bug,
  Eye,
  Info
} from 'lucide-react';
import { useAstronautExploration, AstronautSubmodule } from '../../context/AstronautExplorationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { sharedExplorationStore } from '../../services/sharedExplorationStore';

export const SurfaceMissionDashboard: React.FC = () => {
  const {
    activeSession,
    setActiveSubmodule,
    currentCoordinates,
    objectives,
    geologicalTargets,
    getSuitConfigDetails,
    routes,
    selectedRouteId,
    spaceWeather
  } = useAstronautExploration();

  const { activeMission, setActiveWorkspace } = useWorkspace();
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Reset image error state whenever active image changes
  React.useEffect(() => {
    setImageError(false);
  }, [activeSession.imageMetadata.url, activeSession.activeImageId]);

  const suitDetails = getSuitConfigDetails();
  const currentRoute = routes[selectedRouteId];

  const pendingTargets = geologicalTargets.filter(t => t.status === 'Planned' || t.status === 'Not Investigated').length;
  const completedTargets = geologicalTargets.filter(t => t.status === 'Completed' || t.status === 'Sample Collected').length;

  const isProcessing = activeSession.analysisStatus !== 'completed' && activeSession.analysisStatus !== 'waiting' && activeSession.analysisStatus !== 'failed';

  const diagnosticLogs = sharedExplorationStore.getDiagnosticLogs();

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Active Processing Lifecycle Status Banner */}
      {isProcessing && (
        <div className="bg-gradient-to-r from-cyan-950 via-blue-950 to-slate-950 border border-cyan-500/50 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  LIVE ANALYSIS PIPELINE: {activeSession.analysisStatus.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-cyan-300">ID: {activeSession.activeImageId}</span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">{activeSession.statusMessage}</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold shrink-0">
            PROCESSING
          </span>
        </div>
      )}

      {/* Error Alert Banner */}
      {activeSession.analysisStatus === 'failed' && (
        <div className="bg-rose-950/40 border border-rose-500/50 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-rose-300 uppercase font-mono">Image Analysis Warning</h4>
              <p className="text-xs text-slate-300">{activeSession.lastError || activeSession.statusMessage}</p>
            </div>
          </div>
          <button
            onClick={() => sharedExplorationStore.processAndSyncImage(activeSession.imageMetadata.url, activeSession.imageMetadata.fileName, activeSession.activeRegion)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {/* Top Banner / Hero Overview Header */}
      <div className="bg-gradient-to-r from-[#0A1022] via-[#0F172A] to-[#0A1022] border border-cyan-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ASTRONAUT EVA MISSION CONTROL
              </span>
              <span className="text-xs text-slate-400 font-mono">SOL 428 · EVA RUN #04</span>
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                  showDiagnostics
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Bug className="w-3 h-3" />
                <span>Dev Diagnostics</span>
              </button>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {activeMission?.name || 'Human Surface Exploration Mission'}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
              <span className="flex items-center gap-1 text-orange-400">
                <MapPin className="w-3.5 h-3.5" />
                {currentCoordinates.name} ({currentCoordinates.lat.toFixed(4)}°N, {currentCoordinates.lon.toFixed(4)}°E)
              </span>
              <span>·</span>
              <span className="text-slate-400">Elevation: {currentCoordinates.elevM}m MOLA</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveSubmodule('astronaut-route-planner');
                setActiveWorkspace('astronaut-route-planner');
              }}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40"
            >
              <Compass className="w-4 h-4" />
              <span>Launch Route Planner</span>
            </button>
            <button
              onClick={() => {
                setActiveSubmodule('safety-monitoring');
                setActiveWorkspace('safety-monitoring');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Safety & Risk Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Developer Diagnostic Panel */}
      {showDiagnostics && (
        <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-4 space-y-3 font-mono text-xs text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>MARSWALK OPS &rarr; DASHBOARD LIVE DIAGNOSTIC PANEL</span>
            </div>
            <span className="text-[10px] text-slate-400">Updated: {new Date(activeSession.lastUpdated).toLocaleTimeString()}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[9px] uppercase">Active Image ID</span>
              <strong className="text-cyan-300 truncate block">{activeSession.activeImageId}</strong>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[9px] uppercase">Active Analysis ID</span>
              <strong className="text-emerald-300 truncate block">{activeSession.activeAnalysisId}</strong>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[9px] uppercase">Status</span>
              <strong className="text-amber-300 uppercase block">{activeSession.analysisStatus}</strong>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[9px] uppercase">Sync Status</span>
              <strong className="text-blue-300 block">NOMINAL &amp; LIVE</strong>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Recent Diagnostic Events ({diagnosticLogs.length})</span>
            <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-900/90 p-2 rounded-lg border border-slate-800 text-[10px] scrollbar-thin">
              {diagnosticLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-slate-500 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={`font-bold shrink-0 uppercase ${
                    log.level === 'error' ? 'text-rose-400' :
                    log.level === 'success' ? 'text-emerald-400' :
                    log.level === 'warn' ? 'text-amber-400' : 'text-cyan-400'
                  }`}>[{log.stage}]</span>
                  <span className="text-slate-300 truncate">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Primary Active Terrain Intelligence Preview Banner */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              ACTIVE EXPLORATION PHOTOGRAPH
            </span>
            <span className="text-xs text-slate-300 font-mono font-bold truncate">
              {activeSession.imageMetadata.fileName}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Source: <strong className="text-slate-200">{activeSession.imageMetadata.source}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Active Image Canvas Frame */}
          <div className="lg:col-span-5 relative h-56 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
            {imageError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900/90 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-rose-400" />
                <span className="text-xs font-mono text-rose-300 font-bold uppercase">Image Decode Error</span>
                <span className="text-[10px] text-slate-400 font-mono truncate max-w-full px-2">
                  {activeSession.imageMetadata.fileName}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  No fallback displayed. Preserved active image binding.
                </span>
              </div>
            ) : (
              <img
                src={activeSession.imageMetadata.url}
                alt={activeSession.imageMetadata.fileName}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] font-mono text-slate-300 bg-black/70 backdrop-blur-md p-2 rounded-lg border border-white/10">
              <span>Dominant: <strong className="text-amber-300">{activeSession.imageAnalysis.dominantFeature}</strong></span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 uppercase">
                {activeSession.imageAnalysis.dataNature}
              </span>
            </div>
          </div>

          {/* Extracted AI Vision & CV Features List */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 font-sans">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider block mb-1">
                Extracted Geological &amp; Terrain Features ({activeSession.imageAnalysis.visibleFeatures.length})
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-200 font-mono">
                {activeSession.imageAnalysis.visibleFeatures.map((feat, i) => (
                  <li key={i} className="flex items-center gap-1.5 bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 font-mono text-xs">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                <span className="text-[9px] text-slate-400 uppercase block">Surface Roughness</span>
                <strong className="text-cyan-300 font-bold">{activeSession.imageAnalysis.roughnessScore}</strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                <span className="text-[9px] text-slate-400 uppercase block">Obstacle Count</span>
                <strong className="text-amber-300 font-bold">{activeSession.imageAnalysis.boulders.length}</strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                <span className="text-[9px] text-slate-400 uppercase block">Traversability</span>
                <strong className="text-emerald-400 font-bold">{activeSession.terrainAnalysis.regolithTraversabilityIndex} / 100</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-mono text-[10px]">Active EVA Config</span>
            <Footprints className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-lg font-bold text-white truncate">{suitDetails.name}</div>
          <div className="text-xs font-mono text-slate-400">
            Mass: <strong className="text-slate-200">{suitDetails.totalMassKg} kg</strong> · Speed: <strong className="text-slate-200">{suitDetails.maxSpeedMs} m/s</strong>
          </div>
        </div>

        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-mono text-[10px]">Active Route ({activeSession.activeRoute?.code || currentRoute.code})</span>
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {((activeSession.activeRoute?.distanceM || currentRoute.distanceM) / 1000).toFixed(2)} km
          </div>
          <div className="text-xs font-mono text-slate-400">
            Est Time: <strong className="text-slate-200">{activeSession.activeRoute?.timeMins || currentRoute.timeMins} mins</strong> · Slope Max: <strong className="text-slate-200">{activeSession.terrainAnalysis?.slopeMaxDeg || currentRoute.maxSlopeDeg}°</strong>
          </div>
        </div>

        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-mono text-[10px]">Surface Radiation Rate</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300">
            {activeSession.environmentalObservations?.isAvailable !== false && activeSession.environmentalObservations?.radiationDoseMgyDay !== null ? (
              <>
                {activeSession.environmentalObservations?.radiationDoseMgyDay ?? spaceWeather.mslRadSurfaceDoseRate}{' '}
                <span className="text-xs text-amber-400 font-normal">mGy/day</span>
              </>
            ) : (
              <span className="text-amber-400 text-sm font-bold">NO SENSOR LINK</span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-400">
            {activeSession.environmentalObservations?.isAvailable !== false ? (
              <>
                Status: <strong className="text-emerald-400">{spaceWeather.solarActivityLevel}</strong> · SPE Alert:{' '}
                <strong className="text-emerald-400">Clear</strong>
              </>
            ) : (
              <span className="text-slate-400 text-[10px]">Requires verified in-situ coordinates</span>
            )}
          </div>
        </div>

        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-mono text-[10px]">Geological Targets</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {completedTargets} / {activeSession.geologicalTargets.length}{' '}
            <span className="text-xs text-slate-400 font-normal">Investigated</span>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Pending Queue:{' '}
            <strong className="text-cyan-300">
              {activeSession.geologicalTargets.filter(t => t.status === 'Planned' || t.status === 'Not Investigated').length} targets
            </strong>
          </div>
        </div>
      </div>

      {/* Main Grid: Mission Overview Submodules Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Cols: Submodule Quick Access & Science Objectives */}
        <div className="lg:col-span-2 space-y-6">
          {/* Submodule Navigation Cards Grid */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Surface Exploration Submodules</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">10 Interconnected Tools</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'science-planner', title: 'Mission Science Planner', desc: 'Define & prioritize scientific objectives', icon: <Target className="w-4 h-4 text-cyan-400" /> },
                { id: 'surface-explorer', title: 'Mars Surface Explorer', desc: 'Interactive geographic coordinates map', icon: <Compass className="w-4 h-4 text-orange-400" /> },
                { id: 'multilayer-map', title: 'Multilayer Scientific Map', desc: 'Overlay optical, thermal, spectral & DEM data', icon: <Layers className="w-4 h-4 text-blue-400" /> },
                { id: 'safety-monitoring', title: 'Safety & Environmental Monitoring', desc: 'Terrain, radiation & environmental hazards', icon: <ShieldAlert className="w-4 h-4 text-amber-400" /> },
                { id: 'geological-targets', title: 'Geological Target Explorer', desc: 'Outcrop identification & sample status', icon: <Activity className="w-4 h-4 text-emerald-400" /> },
                { id: 'suit-mobility', title: 'Suit Mobility Analysis', desc: 'Spacesuit mass, speed & slope limits', icon: <Footprints className="w-4 h-4 text-purple-400" /> },
                { id: 'astronaut-route-planner', title: 'Astronaut Route Planner', desc: '4 Strategy terrain-aware A* pathfinding', icon: <Compass className="w-4 h-4 text-rose-400" /> },
                { id: 'radiation-monitor', title: 'Radiation & Space Weather', desc: 'MSL RAD & NASA DONKI space weather', icon: <Sun className="w-4 h-4 text-yellow-400" /> },
                { id: 'mission-notebook', title: 'Mission Field Notebook', desc: 'Record field observations & export PDF', icon: <FileText className="w-4 h-4 text-teal-400" /> }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => {
                    setActiveSubmodule(sub.id as AstronautSubmodule);
                    setActiveWorkspace(sub.id as any);
                  }}
                  className="p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                      {sub.icon}
                      <span className="truncate">{sub.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{sub.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Active Scientific Objectives Summary */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Primary Scientific Objectives</span>
              </h3>
              <button
                onClick={() => setActiveSubmodule('science-planner')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-mono hover:underline cursor-pointer"
              >
                Manage All Objectives &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {objectives.slice(0, 3).map(obj => (
                <div key={obj.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white">{obj.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                      obj.status === 'Achieved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      obj.status === 'In Progress' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {obj.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-sans italic">{obj.question}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span>Target: <strong className="text-slate-200">{obj.targetFormation}</strong></span>
                    <span>·</span>
                    <span>Value: <strong className="text-amber-300">{obj.expectedValue}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Environmental & Environmental Safety Widget */}
        <div className="space-y-6">
          {/* Surface Environment Snapshot */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" />
              <span>In-Situ Environmental Sensor Data</span>
            </h3>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">Ambient Surface Temp:</span>
                {activeSession.environmentalObservations?.ambientTempC?.value !== null && activeSession.environmentalObservations?.isAvailable !== false ? (
                  <span className="text-white font-bold">{activeSession.environmentalObservations.ambientTempC.value} °C</span>
                ) : (
                  <span className="text-amber-400 font-bold text-[11px]">DATA UNAVAILABLE</span>
                )}
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">Atmospheric Pressure:</span>
                {activeSession.environmentalObservations?.atmosPressurePa?.value !== null && activeSession.environmentalObservations?.isAvailable !== false ? (
                  <span className="text-white font-bold">{activeSession.environmentalObservations.atmosPressurePa.value} Pa</span>
                ) : (
                  <span className="text-amber-400 font-bold text-[11px]">DATA UNAVAILABLE</span>
                )}
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">Solar Activity Level:</span>
                <span className="text-cyan-300 font-bold">{activeSession.environmentalObservations.solarFlareStatus.value}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400">Dust Optical Depth (Tau):</span>
                {activeSession.environmentalObservations?.dustTau?.value !== null && activeSession.environmentalObservations?.isAvailable !== false ? (
                  <span className="text-emerald-400 font-bold">{activeSession.environmentalObservations.dustTau.value} (Nominal)</span>
                ) : (
                  <span className="text-amber-400 font-bold text-[11px]">DATA UNAVAILABLE</span>
                )}
              </div>
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 shrink-0">Data Source:</span>
                <span className={`font-bold truncate text-[10px] max-w-[170px] ${
                  activeSession.environmentalObservations?.isAvailable === false ? 'text-amber-400' : 'text-slate-200'
                }`} title={activeSession.environmentalObservations?.ambientTempC?.source || 'N/A'}>
                  {activeSession.environmentalObservations?.ambientTempC?.source || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Radiation & Space Weather Card */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
                <Sun className="w-4 h-4 text-yellow-400" />
                <span>Space Weather &amp; RAD Data</span>
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">LIVE API</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Solar Activity Level:</span>
                <span className="text-emerald-400 font-bold">{spaceWeather.solarActivityLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Solar Flare Class:</span>
                <span className="text-amber-300 font-bold">{spaceWeather.solarFlareClass}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">MSL RAD Surface Dose:</span>
                <span className="text-white font-bold">{spaceWeather.mslRadSurfaceDoseRate} mGy/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Equivalent Yearly Dose:</span>
                <span className="text-cyan-300 font-bold">{(spaceWeather.mslRadSurfaceDoseRate * 365.25 * 0.8).toFixed(1)} mSv/yr</span>
              </div>
            </div>

            <button
              onClick={() => setActiveSubmodule('radiation-monitor')}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              Open Full Space Weather Monitor &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
