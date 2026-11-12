import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Search,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Ruler,
  Target,
  Footprints,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Check,
  RefreshCw,
  Cpu,
  Activity,
  User
} from 'lucide-react';
import { useAstronautExploration } from '../../context/AstronautExplorationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { sharedExplorationStore, ExplorationWaypoint, ActiveExplorationSession } from '../../services/sharedExplorationStore';

export const MarsSurfaceExplorer: React.FC = () => {
  const { currentCoordinates, setCurrentCoordinates } = useAstronautExploration();
  const { activeMission } = useWorkspace();

  const [activeSession, setActiveSession] = useState<ActiveExplorationSession>(() => sharedExplorationStore.getSession());
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [selectedWaypoint, setSelectedWaypoint] = useState<ExplorationWaypoint | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simProgressIdx, setSimProgressIdx] = useState<number>(0);
  const [measuringMode, setMeasuringMode] = useState<boolean>(false);
  const [measurePointA, setMeasurePointA] = useState<{ x: number; y: number } | null>(null);
  const [measurePointB, setMeasurePointB] = useState<{ x: number; y: number } | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ xPct: number; yPct: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Subscribe to shared exploration store
  useEffect(() => {
    const unsubscribe = sharedExplorationStore.subscribe((session) => {
      setActiveSession(session);
      setSelectedWaypoint(session.waypoints[0] || null);
    });
    return unsubscribe;
  }, []);

  // EVA Simulation Animation Loop
  useEffect(() => {
    let timer: any = null;
    if (isSimulating && activeSession.automatedRoute?.footprints?.length > 0) {
      timer = setInterval(() => {
        setSimProgressIdx(prev => {
          if (prev >= activeSession.automatedRoute.footprints.length - 1) {
            setIsSimulating(false);
            return prev;
          }
          return prev + 1;
        });
      }, 400);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSimulating, activeSession.automatedRoute]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.waypoint-marker') || (e.target as HTMLElement).closest('.control-panel')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const relY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      setHoverCoord({
        xPct: Number(((relX / rect.width) * 100).toFixed(1)),
        yPct: Number(((relY / rect.height) * 100).toFixed(1))
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.waypoint-marker') || (e.target as HTMLElement).closest('.control-panel')) return;
    if (measuringMode && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const clickPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (!measurePointA) setMeasurePointA(clickPos);
      else if (!measurePointB) setMeasurePointB(clickPos);
      else {
        setMeasurePointA(clickPos);
        setMeasurePointB(null);
      }
    }
  };

  // Automated Action Handlers
  const handleAnalyzeTerrain = async () => {
    sharedExplorationStore.setAnalysisStatus('analyzing', 'Running automated Gemini AI terrain analysis...');
    await sharedExplorationStore.processAndSyncImage(
      activeSession.imageMetadata.url,
      activeSession.imageMetadata.fileName,
      activeSession.activeRegion
    );
  };

  const handleGenerateWaypoints = () => {
    const start = activeSession.waypoints.find(wp => wp.type === 'start');
    const dest = activeSession.waypoints.find(wp => wp.type === 'destination');
    const plan = sharedExplorationStore.generateAutomatedNavigationPlan(
      activeSession.imageAnalysis.boulders,
      start ? { xPct: start.xPct, yPct: start.yPct } : undefined,
      dest ? { xPct: dest.xPct, yPct: dest.yPct } : undefined
    );
    sharedExplorationStore.updateSession({ waypoints: plan.waypoints });
  };

  const handleGenerateOptimalRoute = () => {
    const start = activeSession.waypoints.find(wp => wp.type === 'start');
    const dest = activeSession.waypoints.find(wp => wp.type === 'destination');
    const plan = sharedExplorationStore.generateAutomatedNavigationPlan(
      activeSession.imageAnalysis.boulders,
      start ? { xPct: start.xPct, yPct: start.yPct } : undefined,
      dest ? { xPct: dest.xPct, yPct: dest.yPct } : undefined
    );
    sharedExplorationStore.updateSession({ automatedRoute: plan.automatedRoute });
  };

  const handleStartSimulation = () => {
    setIsSimulating(true);
  };

  const handlePauseSimulation = () => {
    setIsSimulating(false);
  };

  const handleResetSimulation = () => {
    setIsSimulating(false);
    setSimProgressIdx(0);
  };

  const waypoints = activeSession.waypoints || [];
  const automatedRoute = activeSession.automatedRoute || { path: [], footprints: [], distanceMeters: 1120, estimatedMins: 28, maxSlopeDeg: 9.8, safetyScore: 86, status: 'GENERATED' };
  const currentAstronautPos = automatedRoute.footprints[simProgressIdx] || automatedRoute.footprints[0] || { xPct: 15, yPct: 82 };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Top Banner & Control Actions Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl control-panel">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/35 uppercase">
              ADVANCED AUTONOMOUS EVA NAVIGATION SYSTEM
            </span>
            <span className="text-xs text-cyan-400 font-mono">OBSTACLE-AWARE A* PATHFINDING</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            {activeMission?.name || 'Human Surface Exploration Mission'}
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Active Photograph: <strong className="text-orange-300">{activeSession.imageMetadata.fileName}</strong> · Source: {activeSession.imageMetadata.source}
          </p>
        </div>

        {/* Action Buttons Control Panel */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Navigation Validation Status Panel (Mini) */}
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 mr-2">
             <div className="flex flex-col">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">NAV VALIDATION</span>
                <div className="flex items-center gap-1.5">
                  {activeSession.analysisStatus === 'completed' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : activeSession.analysisStatus === 'failed' ? (
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                  ) : (
                    <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                  )}
                  <span className={`text-[10px] font-mono font-bold ${
                    activeSession.analysisStatus === 'completed' ? 'text-emerald-400' : 
                    activeSession.analysisStatus === 'failed' ? 'text-rose-400' : 'text-cyan-400'
                  }`}>
                    {activeSession.analysisStatus === 'processing_terrain' ? 'GENERATING OBSTACLE MAP' :
                     activeSession.analysisStatus === 'updating_dashboard' ? 'VALIDATING ROUTE' :
                     activeSession.analysisStatus === 'completed' ? 'ROUTE VERIFIED' : 
                     activeSession.analysisStatus.toUpperCase().replace('_', ' ')}
                  </span>
                </div>
             </div>
          </div>

          <button
            onClick={handleAnalyzeTerrain}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-cyan-950/40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RE-ANALYZE TERRAIN</span>
          </button>
          <button
            onClick={handleGenerateWaypoints}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>GENERATE WAYPOINTS</span>
          </button>
          <button
            onClick={handleGenerateOptimalRoute}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5 text-orange-400" />
            <span>OPTIMIZE ROUTE</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          {isSimulating ? (
            <button
              onClick={handlePauseSimulation}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE EVA</span>
            </button>
          ) : (
            <button
              onClick={handleStartSimulation}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
            >
              <Play className="w-3.5 h-3.5" />
              <span>START SIMULATION</span>
            </button>
          )}
          <button
            onClick={handleResetSimulation}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Map Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Map Viewport with Automated Footprint Trail & Astronaut Marker (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Map Toolbar HUD Overlay */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setZoomLevel(z => Math.min(3.0, z + 0.25))}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.25))}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setZoomLevel(1.0); setPanOffset({ x: 0, y: 0 }); }}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                title="Reset View"
              >
                <Crosshair className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-800 mx-1" />
              <button
                onClick={() => setMeasuringMode(!measuringMode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  measuringMode ? 'bg-orange-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>{measuringMode ? 'Measuring Active' : 'Measure Tool'}</span>
              </button>
            </div>

            {/* Bottom HUD Coordinate Overlay */}
            <div className="absolute bottom-3 left-3 z-20 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-3">
              <span className="flex items-center gap-1 text-cyan-400">
                <MapPin className="w-3.5 h-3.5" />
                Coordinates: {hoverCoord ? `X: ${hoverCoord.xPct}%, Y: ${hoverCoord.yPct}%` : 'Hover map'}
              </span>
              <span>·</span>
              <span>Zoom: {(zoomLevel * 100).toFixed(0)}%</span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">Route Status: {automatedRoute.status}</span>
            </div>

            {/* Canvas Surface Element */}
            <div
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleCanvasClick}
              className="w-full h-[540px] bg-[#050813] relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
            >
              <div
                className="absolute inset-0 w-full h-full transition-transform duration-75"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: 'center center'
                }}
              >
                {/* Background Active Photograph */}
                <img
                  src={activeSession.imageMetadata.url}
                  alt={activeSession.imageMetadata.fileName}
                  className="w-full h-full object-cover filter brightness-95 contrast-105"
                />

                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                {/* AI Detected Boulder Boxes & Obstacle Masks */}
                {activeSession.imageAnalysis.boulders.map((b, i) => (
                  <div
                    key={b.id || i}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${b.normX * 100}%`, top: `${b.normY * 100}%` }}
                  >
                    <div className="w-12 h-12 rounded-lg border border-amber-500/60 bg-amber-500/10 flex items-center justify-center text-[8px] font-mono text-amber-300 shadow">
                      OBSTACLE
                    </div>
                  </div>
                ))}

                {/* Automatically Rendered Astronaut Footprints Trail */}
                {automatedRoute.footprints.map((fp, idx) => {
                  const isPassed = idx <= simProgressIdx;
                  if (!isPassed && isSimulating) return null; // Reveal progressively during simulation

                  return (
                    <div
                      key={idx}
                      className="absolute z-15 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-300"
                      style={{
                        left: `${fp.xPct}%`,
                        top: `${fp.yPct}%`,
                        transform: `translate(-50%, -50%) rotate(${fp.angleDeg}deg)`,
                        opacity: isPassed ? 0.9 : 0.4
                      }}
                    >
                      <div className={`w-3.5 h-5 rounded-full border border-orange-500/60 flex items-center justify-center shadow ${
                        isPassed ? 'bg-orange-500/50 text-white' : 'bg-slate-800/40 text-slate-400'
                      }`}>
                        <Footprints className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  );
                })}

                {/* Live Simulated Astronaut Position Marker */}
                <div
                  className="absolute z-25 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300"
                  style={{ left: `${currentAstronautPos.xPct}%`, top: `${currentAstronautPos.yPct}%` }}
                >
                  <div className="w-10 h-10 rounded-full bg-orange-600/40 border-2 border-orange-400 flex items-center justify-center text-white shadow-2xl shadow-orange-950 animate-pulse">
                    <User className="w-5 h-5 text-orange-200" />
                  </div>
                  <span className="bg-orange-600 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap shadow">
                    ASTRONAUT EVA
                  </span>
                </div>

                {/* Automatically Generated Waypoint Markers */}
                {waypoints.map((wp) => {
                  const isSelected = selectedWaypoint?.id === wp.id;
                  const isStart = wp.type === 'start';
                  const isDest = wp.type === 'destination';

                  return (
                    <div
                      key={wp.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedWaypoint(wp); }}
                      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer group waypoint-marker transition-transform ${
                        isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                      }`}
                      style={{ left: `${wp.xPct}%`, top: `${wp.yPct}%` }}
                    >
                      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-xl backdrop-blur-md ${
                        isStart
                          ? 'bg-orange-500/30 border-orange-400 text-orange-200 shadow-orange-950/60'
                          : isDest
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-cyan-950/60'
                          : 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                      }`}>
                        <Target className="w-4 h-4" />
                      </div>
                      <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-md ${
                        isStart ? 'bg-orange-600 text-white border border-orange-400' :
                        isDest ? 'bg-cyan-600 text-white border border-cyan-400' :
                        'bg-emerald-700 text-white border border-emerald-500'
                      }`}>
                        {wp.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Waypoints &amp; footprint trail generated automatically via obstacle-aware A* pathfinding. No manual clicking required.</span>
            </div>
            <span className="text-[10px] text-slate-500 shrink-0">Automated Navigation Engine</span>
          </div>
        </div>

        {/* Right Column: Selected Waypoint Inspector & Navigation Dashboard (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedWaypoint ? (
            <div className="bg-[#0B1021] border border-cyan-500/40 rounded-2xl p-5 space-y-4 shadow-2xl relative animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Waypoint &amp; Science Target</h3>
                </div>
                <button
                  onClick={() => setSelectedWaypoint(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase">Waypoint Name</span>
                  <strong className="text-white text-sm block">{selectedWaypoint.name}</strong>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase block">Position</span>
                    <strong className="text-cyan-300">X: {selectedWaypoint.xPct}%, Y: {selectedWaypoint.yPct}%</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase block">Waypoint Type</span>
                    <strong className="text-amber-300 uppercase">{selectedWaypoint.type}</strong>
                  </div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[9px] text-slate-400 uppercase block">Scientific Objective / Notes</span>
                  <p className="text-slate-300 font-sans text-xs">{selectedWaypoint.notes}</p>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[9px] text-slate-400 uppercase block">Route Intelligence</span>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Total Distance:</span>
                    <strong className="text-cyan-300">{automatedRoute.distanceMeters} m</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Est. EVA Time:</span>
                    <strong className="text-emerald-400">{automatedRoute.estimatedMins} mins</strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Safety Score:</span>
                    <strong className="text-orange-400">{automatedRoute.safetyScore}%</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Automated Waypoints ({waypoints.length})
                </h3>
                <span className="text-[10px] text-cyan-400 font-mono">OBSTACLE AWARE</span>
              </div>

              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {waypoints.map((wp) => (
                  <div
                    key={wp.id}
                    onClick={() => setSelectedWaypoint(wp)}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {wp.type}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">{wp.name}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block">X: {wp.xPct}%, Y: {wp.yPct}%</span>
                    </div>
                    <Target className="w-4 h-4 text-slate-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
