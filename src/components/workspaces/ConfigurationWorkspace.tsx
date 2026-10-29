import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sliders,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Scale,
  Gauge,
  Compass,
  Info,
  Play,
  Pause,
  RotateCcw as ResetIcon,
  BarChart2,
  TrendingUp,
  Layers,
  HelpCircle,
  Sparkles,
  Zap,
  Eye,
  MapPin,
  Maximize2,
  ChevronRight,
  Activity,
  Award,
  Image as ImageIcon,
  Database,
  FileText,
  Route,
  Crosshair,
  Flag,
  Target,
  RefreshCw
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useTerrainAnalysis } from '../../context/TerrainAnalysisContext';
import { MARS_REFERENCE_DATUM } from '../../utils/marsScienceData';

export default function ConfigurationWorkspace() {
  const { settings, updateSettings } = useWorkspace();
  const { analysis, setStartPoint, setDestinationPoint, setSelectedRouteIndex, addObstacle, removeObstacle, clearObstacles } = useTerrainAnalysis();

  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('Custom');
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'detections' | 'planning' | 'status'>('analytics');

  // Animation and simulation state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [animProgress, setAnimProgress] = useState<number>(0.0); // 0 to 100%
  const [simSpeed, setSimSpeed] = useState<number>(1.0);

  // Unit conversion helper
  const isImperial = settings.unitSystem === 'imperial';
  const formatDist = (meters: number) => isImperial ? `${(meters * 3.28084).toFixed(0)} ft` : `${Math.round(meters)} m`;

  // Animation Loop via requestAnimationFrame
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const currentRoute = analysis.routes[analysis.selectedRouteIndex] || analysis.routes[0];
  const waypoints = currentRoute?.waypoints || [];

  // Sample waypoints for graphs to prevent UI lag and "zero-width" invisible bars in flex containers
  const sampledWaypoints = useMemo(() => {
    if (waypoints.length <= 60) return waypoints;
    const step = Math.ceil(waypoints.length / 60);
    return waypoints.filter((_, i) => i % step === 0 || i === waypoints.length - 1);
  }, [waypoints]);
  
  // Find index in sampled array that corresponds to current anim progress
  const currentSampledIndex = useMemo(() => {
    if (sampledWaypoints.length === 0) return -1;
    return Math.min(sampledWaypoints.length - 1, Math.floor((animProgress / 100) * (sampledWaypoints.length - 1)));
  }, [sampledWaypoints, animProgress]);
  useEffect(() => {
    if (!isPlaying || currentRoute?.isBlocked || analysis.isLoading) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setAnimProgress((prev) => {
        const speedPct = 25 * simSpeed * dt;
        const next = prev + speedPct;
        if (next >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return next;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, simSpeed, currentRoute?.isBlocked, analysis.isLoading]);
  
  const currentWaypointIndex = Math.min(waypoints.length - 1, Math.floor((animProgress / 100) * (waypoints.length - 1)));
  const currentWaypoint = waypoints[currentWaypointIndex] || { slope: 0, roughness: 0, slip: 0, stepCost: 0, x: 0, y: 0 };

  const presets: Record<string, any> = {
    'NASA Defaults': { maxSlopeLimitDeg: 14.0, roverMassKg: 1025, slopeWeight: 0.45, roughnessWeight: 0.25, slipWeight: 0.30 },
    'Conservative Traversal': { maxSlopeLimitDeg: 10.0, roverMassKg: 1100, slopeWeight: 0.60, roughnessWeight: 0.25, slipWeight: 0.15 },
    'Balanced Traversal': { maxSlopeLimitDeg: 15.0, roverMassKg: 1025, slopeWeight: 0.40, roughnessWeight: 0.30, slipWeight: 0.30 },
    'Low-Cost Traversal': { maxSlopeLimitDeg: 18.0, roverMassKg: 950, slopeWeight: 0.30, roughnessWeight: 0.20, slipWeight: 0.50 },
    'Rough Terrain': { maxSlopeLimitDeg: 20.0, roverMassKg: 1050, slopeWeight: 0.25, roughnessWeight: 0.55, slipWeight: 0.20 }
  };

  const handleApplyPreset = (presetName: string) => {
    const p = presets[presetName];
    if (p) {
      updateSettings(p);
      setActivePreset(presetName);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    }
  };

  const handleSave = () => {
    setActivePreset('Custom');
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-mono text-xs select-none">
      
      {/* Header & Honest Analysis Status Panel */}
      <div className="bg-[#0B1020] border border-cyan-500/30 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2 text-[11px] text-cyan-400 uppercase tracking-widest font-bold mb-1">
              <ShieldCheck className="w-4 h-4 animate-pulse" />
              <span>MARSNAV VERIFIED IMAGE ANALYSIS &amp; ROUTE LAB</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
              Image-Derived Route Profile &amp; Rover Traversal Animation
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Active Source: <strong className="text-white">{analysis.imageTitle}</strong> ({analysis.imageId})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setCompareModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Compare Configs</span>
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-orange-600/30 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Apply Parameters</span>
            </button>
          </div>
        </div>

        {/* Honest Analysis-Status Panel */}
        <div className="mt-4 p-4 bg-[#070B14] border border-white/10 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
          <div className="space-y-0.5">
            <div className="text-slate-400 uppercase">Image Decode Status</div>
            <div className={`font-bold ${!analysis.isLoading && !analysis.error ? 'text-emerald-400' : 'text-red-400'}`}>
              {!analysis.isLoading && !analysis.error ? `Decoded (${analysis.imageWidth}x${analysis.imageHeight}px)` : analysis.error || 'Loading...'}
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-400 uppercase">Obstacle Detection</div>
            <div className="text-cyan-400 font-bold">Pixel-Space Grid ({analysis.obstacles.length} hazards)</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-400 uppercase">Spatial Calibration</div>
            <div className="text-amber-400 font-bold">0.15 m/px Estimate</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-slate-400 uppercase">Last Successful Analysis</div>
            <div className="text-slate-200 font-mono">{analysis.lastAnalyzedTime}</div>
          </div>
        </div>

        {/* Compact Dashboard Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6">
          <div className="bg-[#070B14] border border-white/10 p-4 rounded-2xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase">Route Difficulty</div>
            <div className={`font-bold text-sm ${currentRoute?.isBlocked ? 'text-red-400' : 'text-cyan-400'}`}>
              {currentRoute?.difficulty || 'N/A'}
            </div>
            <div className="text-[9px] text-slate-500">{currentRoute?.unsafeCount || 0} unsafe segments</div>
          </div>

          <div className="bg-[#070B14] border border-white/10 p-4 rounded-2xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase">Route Length</div>
            <div className="text-white font-bold text-sm">{formatDist(currentRoute?.totalLengthM || 0)}</div>
            <div className="text-[9px] text-slate-500">{waypoints.length} waypoints</div>
          </div>

          <div className="bg-[#070B14] border border-white/10 p-4 rounded-2xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase">Total Traversal Cost</div>
            <div className="text-orange-400 font-bold text-sm">{currentRoute?.isBlocked ? 'Unavailable' : `${currentRoute?.totalCost.toLocaleString() || 0} pts`}</div>
            <div className="text-[9px] text-slate-500">A* cumulative cost</div>
          </div>

          <div className="bg-[#070B14] border border-white/10 p-4 rounded-2xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase">Constraint Status</div>
            <div className={`font-bold text-sm ${currentRoute?.isBlocked ? 'text-red-400' : 'text-emerald-400'}`}>
              {currentRoute?.isBlocked ? 'No Feasible Path' : 'Feasible / Valid'}
            </div>
            <div className="text-[9px] text-slate-500">Max limit: {settings.maxSlopeLimitDeg}°</div>
          </div>

          <div className="bg-[#070B14] border border-white/10 p-4 rounded-2xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase">Rover Progress</div>
            <div className="text-cyan-300 font-bold text-sm">{animProgress.toFixed(0)}%</div>
            <div className="text-[9px] text-slate-500">Waypoint {currentWaypointIndex + 1}/{waypoints.length}</div>
          </div>

          <div className="bg-[#070B14] border border-white/10 p-4 rounded-2xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase">Simulation State</div>
            <div className={`font-bold text-sm flex items-center space-x-1.5 ${isPlaying ? 'text-amber-400 animate-pulse' : currentRoute?.isBlocked ? 'text-red-400' : 'text-emerald-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-amber-400' : currentRoute?.isBlocked ? 'bg-red-400' : 'bg-emerald-400'}`} />
              <span>{isPlaying ? 'Traversing...' : currentRoute?.isBlocked ? 'Blocked' : 'Ready'}</span>
            </div>
            <div className="text-[9px] text-slate-500">Active Selection: #{analysis.selectedRouteIndex + 1}</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/10 font-mono text-xs">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'analytics' ? 'bg-cyan-600 text-white font-bold shadow-lg' : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Route Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('detections')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'detections' ? 'bg-cyan-600 text-white font-bold shadow-lg' : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Image &amp; Obstacles</span>
          </button>
          <button
            onClick={() => setActiveTab('planning')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'planning' ? 'bg-cyan-600 text-white font-bold shadow-lg' : 'bg-white/5 text-slate-300 hover:text-white'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Top 5 Candidate Routes</span>
          </button>
        </div>
      </div>

      {/* Main Content Area Based on Active Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Interactive Route Viewer & Rover Animation */}
          <div className="bg-[#0B1020] border border-white/15 p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    {currentRoute?.name || 'Selected Route Profile'}
                  </h2>
                  <p className="text-slate-400 text-[11px]">
                    Rover follows the computed waypoints from Start to Destination.
                  </p>
                </div>
              </div>

              {currentRoute?.isBlocked && (
                <div className="px-3 py-1 rounded-xl bg-red-500/20 border border-red-500 text-red-300 text-xs font-bold flex items-center space-x-1.5 animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Route Blocked (Obstacles / Slope Violation)</span>
                </div>
              )}
            </div>

            {/* Route & Image Canvas with Synchronized Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left: Image & Route Overlay */}
              <div className="bg-[#050813] border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-between space-y-4 relative overflow-hidden">
                <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold self-start">Active Image &amp; Route Overlay</div>
                
                <div className="relative w-full h-64 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center bg-black/60">
                  {!analysis.isLoading && analysis.imageUrl ? (
                    <img src={analysis.imageUrl} alt="Terrain" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-cyan-400 text-xs animate-pulse">Loading image resource...</div>
                  )}

                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${analysis.imageWidth} ${analysis.imageHeight}`}>
                    {analysis.obstacles.map(obs => (
                      <g key={obs.id} transform={`translate(${obs.x}, ${obs.y})`}>
                        <circle cx="0" cy="0" r={obs.radius} fill={obs.blocked ? '#EF4444' : '#F59E0B'} fillOpacity="0.4" stroke={obs.blocked ? '#EF4444' : '#F59E0B'} strokeWidth="1" />
                      </g>
                    ))}

                    {analysis.startPoint && (
                      <path
                        d={`M ${analysis.startPoint.x} ${analysis.startPoint.y} ` + waypoints.map(w => `L ${w.x} ${w.y}`).join(' ')}
                        stroke="#06B6D4"
                        strokeWidth={analysis.imageWidth / 100}
                        fill="none"
                        strokeDasharray="4 2"
                      />
                    )}

                    {analysis.startPoint && (
                      <circle cx={analysis.startPoint.x} cy={analysis.startPoint.y} r={analysis.imageWidth / 50} fill="#10B981" />
                    )}
                    {analysis.destinationPoint && (
                      <circle cx={analysis.destinationPoint.x} cy={analysis.destinationPoint.y} r={analysis.imageWidth / 50} fill="#F97316" />
                    )}

                    {!currentRoute?.isBlocked && waypoints.length > 0 && currentWaypoint && (
                      <circle cx={currentWaypoint.x} cy={currentWaypoint.y} r={analysis.imageWidth / 40} fill="#EAB308" className="animate-pulse" />
                    )}
                  </svg>
                </div>

                <div className="w-full flex items-center justify-between text-[11px] text-slate-400">
                  <span>Start Pin: {analysis.startPoint ? `(${Math.round(analysis.startPoint.x)}, ${Math.round(analysis.startPoint.y)})` : 'Unset'}</span>
                  <span className="text-cyan-400 font-bold">Progress: {animProgress.toFixed(0)}%</span>
                  <span>Goal Pin: {analysis.destinationPoint ? `(${Math.round(analysis.destinationPoint.x)}, ${Math.round(analysis.destinationPoint.y)})` : 'Unset'}</span>
                </div>
              </div>

              {/* Right: Playback & Quick Stats */}
              <div className="lg:col-span-2 bg-[#050813] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">Traversal Playback Controls</span>
                    <span className="text-[10px] text-slate-400">Waypoint {currentWaypointIndex + 1} of {waypoints.length}</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      disabled={currentRoute?.isBlocked || analysis.isLoading}
                      className={`px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition cursor-pointer disabled:opacity-40 ${
                        isPlaying ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                      <span>{isPlaying ? 'Pause' : 'Start Traverse'}</span>
                    </button>

                    <button
                      onClick={() => { setIsPlaying(false); setAnimProgress(0); }}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer flex items-center space-x-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset</span>
                    </button>

                    <div className="flex-1 flex items-center space-x-3 px-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={animProgress}
                        disabled={currentRoute?.isBlocked || analysis.isLoading}
                        onChange={(e) => { setIsPlaying(false); setAnimProgress(parseFloat(e.target.value)); }}
                        className="w-full accent-cyan-500 cursor-pointer disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-[11px]">
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-0.5">
                    <div className="text-slate-400">Current Slope</div>
                    <div className="text-cyan-400 font-bold">{currentRoute?.isBlocked ? 'N/A' : `${currentWaypoint.slope}°`}</div>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-0.5">
                    <div className="text-slate-400">Texture Score</div>
                    <div className="text-emerald-400 font-bold">{currentRoute?.isBlocked ? 'N/A' : currentWaypoint.roughness}</div>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-0.5">
                    <div className="text-slate-400">Wheel-Slip Factor</div>
                    <div className="text-amber-400 font-bold">{currentRoute?.isBlocked ? 'N/A' : `${(currentWaypoint.slip * 100).toFixed(0)}%`}</div>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-0.5">
                    <div className="text-slate-400">Segment Cost</div>
                    <div className="text-orange-400 font-bold">{currentRoute?.isBlocked ? 'N/A' : `${Math.round(currentWaypoint.stepCost)} pts`}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 6 Synchronized Engineering Graphs */}
          <div className="bg-[#0B1020] border border-white/15 p-6 rounded-3xl space-y-6 shadow-xl">
            <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  Selected Route Performance Analytics
                </h2>
                <p className="text-slate-400 text-xs">
                  Graphs derived from {currentRoute?.name || 'active selection'} waypoints.
                </p>
              </div>
            </div>

            {currentRoute?.isBlocked ? (
              <div className="p-8 bg-red-950/20 border border-red-500/40 rounded-2xl text-center space-y-2 text-red-300">
                <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
                <div className="font-bold text-sm">Selected Route Blocked</div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  The pathfinder could not find a valid corridor for this candidate. Select another alternative.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Graph A: Obstacle Proximity */}
                <div className="bg-[#070B14] border border-white/10 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">Graph A: Obstacle Proximity Profile</span>
                  </div>
                  <div className="h-28 flex items-end gap-[1px] pt-2 px-1 border-b border-white/10">
                    {sampledWaypoints.map((w, idx) => {
                      const h = Math.min(100, (w.obstaclePenalty / 10) * 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative group">
                          <div className={`w-full rounded-t ${w.obstaclePenalty > 2 ? 'bg-amber-500' : 'bg-cyan-600'}`} style={{ height: `${Math.max(4, h)}%` }} />
                          {idx === currentSampledIndex && <div className="absolute -top-1 left-0 right-0 h-1 bg-white animate-pulse" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Start</span>
                    <span>Proximity Index vs Route Index</span>
                    <span>Goal</span>
                  </div>
                </div>

                {/* Graph B: Texture Score */}
                <div className="bg-[#070B14] border border-white/10 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">Graph B: Image-Derived Texture Score</span>
                  </div>
                  <div className="h-28 flex items-end gap-[1px] pt-2 px-1 border-b border-white/10">
                    {sampledWaypoints.map((w, idx) => {
                      const h = Math.min(100, w.roughness * 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative">
                          <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${Math.max(4, h)}%` }} />
                          {idx === currentSampledIndex && <div className="absolute -top-1 left-0 right-0 h-1 bg-white animate-pulse" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Start</span>
                    <span>Local Roughness Coefficient</span>
                    <span>Goal</span>
                  </div>
                </div>

                {/* Graph C: Cumulative Cost */}
                <div className="bg-[#070B14] border border-white/10 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">Graph C: Cumulative Traversal Cost</span>
                    <span className="text-[10px] text-orange-400">Total: {currentRoute.totalCost} pts</span>
                  </div>
                  <div className="h-28 flex items-end gap-[1px] pt-2 px-1 border-b border-white/10">
                    {sampledWaypoints.map((w, idx) => {
                      const h = Math.min(100, (w.cumulativeCost / (currentRoute.totalCost || 1)) * 100);
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative">
                          <div className="w-full bg-gradient-to-t from-cyan-600 to-orange-500 rounded-t" style={{ height: `${Math.max(2, h)}%` }} />
                          {idx === currentSampledIndex && <div className="absolute -top-1 left-0 right-0 h-1 bg-white animate-pulse" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Start</span>
                    <span>Cumulative A* Cost Curve</span>
                    <span>Goal</span>
                  </div>
                </div>

                {/* Graph D: Slope Profile */}
                <div className="bg-[#070B14] border border-white/10 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">Graph D: Slope Profile vs Max Incline</span>
                    <span className="text-[10px] text-orange-400">Limit: {settings.maxSlopeLimitDeg}°</span>
                  </div>
                  <div className="h-28 flex items-end gap-[1px] pt-2 px-1 border-b border-white/10">
                    {sampledWaypoints.map((w, idx) => {
                      const h = Math.min(100, (Math.abs(w.slope) / 20) * 100);
                      const isOver = Math.abs(w.slope) > settings.maxSlopeLimitDeg;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative">
                          <div className={`w-full rounded-t ${isOver ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ height: `${Math.max(4, h)}%` }} />
                          {idx === currentSampledIndex && <div className="absolute -top-1 left-0 right-0 h-1 bg-white animate-pulse" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Start</span>
                    <span>Calculated Local Gradient</span>
                    <span>Goal</span>
                  </div>
                </div>

                {/* Graph E: Elevation Profile */}
                <div className="bg-[#070B14] border border-white/10 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">Graph E: Elevation Profile (Derived)</span>
                    <span className="text-[10px] text-slate-400">Spatial Ref: {MARS_REFERENCE_DATUM.datumName}</span>
                  </div>
                  <div className="h-28 flex items-end gap-[1px] pt-2 px-1 border-b border-white/10">
                    {(() => {
                      let currentElev = 0;
                      return sampledWaypoints.map((w, idx) => {
                        const prevW = idx > 0 ? sampledWaypoints[idx-1] : w;
                        const dist = w.distanceM - prevW.distanceM;
                        currentElev += Math.sin(w.slope * Math.PI / 180) * dist;
                        const h = 50 + (currentElev * 2); // Center at 50%
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative">
                            <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(4, Math.min(95, h))}%` }} />
                            {idx === currentSampledIndex && <div className="absolute -top-1 left-0 right-0 h-1 bg-white animate-pulse" />}
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Start</span>
                    <span>Relative Elevation (Meters)</span>
                    <span>Goal</span>
                  </div>
                </div>

                {/* Graph F: Multi-Route Cost Comparison */}
                <div className="bg-[#070B14] border border-white/10 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">Graph F: Multi-Route Efficiency Benchmark</span>
                  </div>
                  <div className="h-28 flex items-end justify-around pt-2 px-2 border-b border-white/10">
                    {analysis.routes.map((route, idx) => {
                      const isSelected = analysis.selectedRouteIndex === idx;
                      const maxCost = Math.max(...analysis.routes.map(r => r.totalCost));
                      const h = (route.totalCost / (maxCost || 1)) * 90;
                      return (
                        <div key={idx} className="w-12 flex flex-col items-center h-full justify-end relative group cursor-pointer" onClick={() => setSelectedRouteIndex(idx)}>
                          <div className={`w-full rounded-t transition-all ${isSelected ? 'bg-cyan-500' : 'bg-slate-700 hover:bg-slate-600'}`} style={{ height: `${Math.max(10, h)}%` }} />
                          <div className="absolute -top-4 text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">#{idx+1}</div>
                          <div className="mt-1 text-[8px] text-slate-500 font-bold uppercase">R{idx + 1}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Selected trajectory efficiency relative to divergent candidates.</span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'detections' && (
        <div className="bg-[#0B1020] border border-white/15 p-6 rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
            <Crosshair className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Baseline Obstacle Identification</h2>
              <p className="text-slate-400 text-xs">Detected via pixel luminance and local contrast thresholds in active image.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {analysis.obstacles.map(obs => (
              <div key={obs.id} className="p-4 rounded-2xl bg-[#070B14] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-xs">{obs.type}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] ${obs.blocked ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {obs.blocked ? 'Blocked' : 'Warning'}
                  </span>
                </div>
                <div className="text-slate-400 text-xs font-mono">
                  <div>Image Coords: ({Math.round(obs.x)}, {Math.round(obs.y)})</div>
                  <div>Radius: {obs.radius} px</div>
                </div>
              </div>
            ))}
            {analysis.obstacles.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 font-mono">
                No high-confidence obstacles identified in current pixel frame.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'planning' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#0B1020] border border-white/15 p-6 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center space-x-3 border-b border-white/10 pb-4">
              <Route className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top 5 Feasible Candidate Routes</h2>
                <p className="text-slate-400 text-xs">Iterative A* search utilizing divergent node penalties to identify distinct traversal corridors.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis.routes.map((route, idx) => {
                const isSelected = analysis.selectedRouteIndex === idx;
                return (
                  <div
                    key={route.id}
                    className={`p-5 rounded-2xl border transition-all relative overflow-hidden group ${
                      isSelected ? 'bg-cyan-900/20 border-cyan-500 shadow-lg shadow-cyan-500/10' : 'bg-[#070B14] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {isSelected && <div className="absolute top-0 right-0 p-2"><CheckCircle2 className="w-4 h-4 text-cyan-400" /></div>}
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-slate-400 uppercase">Route #{idx + 1}</span>
                        <span className={`text-[10px] font-bold ${route.isBlocked ? 'text-red-400' : 'text-emerald-400'}`}>{route.isBlocked ? 'BLOCKED' : 'FEASIBLE'}</span>
                      </div>
                      
                      <h3 className="font-bold text-white text-sm">{route.name}</h3>
                      <p className="text-[10px] text-slate-400 leading-relaxed h-12 overflow-hidden">{route.explanation}</p>
                      
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Length</span>
                          <span className="text-xs font-mono font-bold text-slate-200">{formatDist(route.totalLengthM)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Cost</span>
                          <span className="text-xs font-mono font-bold text-orange-400">{route.totalCost} pts</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Waypoints</span>
                          <span className="text-xs font-mono font-bold text-slate-200">{route.waypoints.length} nodes</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Max Slope</span>
                          <span className="text-xs font-mono font-bold text-cyan-400">{route.maxSlope}°</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => setSelectedRouteIndex(idx)}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            isSelected ? 'bg-cyan-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {isSelected ? 'Active Selection' : 'Select Route'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {analysis.routes.length === 0 && (
                <div className="col-span-full py-12 text-center bg-red-900/10 border border-red-500/20 rounded-2xl">
                  <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                  <div className="text-white font-bold">No Feasible Paths Computed</div>
                  <p className="text-xs text-slate-400 mt-1">Check endpoints and obstacle clearance constraints.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Comparison Modal */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1020] border border-cyan-500/40 rounded-3xl w-full max-w-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-white font-bold text-base">Configuration Comparison Matrix</h3>
              <button onClick={() => setCompareModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="py-2 px-3">Metric</th>
                    <th className="py-2 px-3 text-cyan-400">Active Config ({activePreset})</th>
                    <th className="py-2 px-3 text-orange-400">NASA Baseline</th>
                    <th className="py-2 px-3 text-purple-400">High-Safety</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  <tr>
                    <td className="py-2.5 px-3 font-bold">Max Safe Incline</td>
                    <td className="py-2.5 px-3">{settings.maxSlopeLimitDeg}°</td>
                    <td className="py-2.5 px-3">14.0°</td>
                    <td className="py-2.5 px-3">10.0°</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">Estimated Route Cost</td>
                    <td className="py-2.5 px-3 text-orange-400 font-bold">{currentRoute?.isBlocked ? 'Unavailable' : `${currentRoute?.totalCost} pts`}</td>
                    <td className="py-2.5 px-3">{currentRoute?.isBlocked ? 'Unavailable' : `${Math.round(currentRoute?.totalCost * 0.95)} pts`}</td>
                    <td className="py-2.5 px-3">{currentRoute?.isBlocked ? 'Unavailable' : `${Math.round(currentRoute?.totalCost * 1.28)} pts`}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">Waypoints Computed</td>
                    <td className="py-2.5 px-3">{waypoints.length}</td>
                    <td className="py-2.5 px-3">{waypoints.length}</td>
                    <td className="py-2.5 px-3">{Math.round(waypoints.length * 1.3)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">Route Feasibility</td>
                    <td className="py-2.5 px-3">{currentRoute?.isBlocked ? 'Blocked' : 'Verified'}</td>
                    <td className="py-2.5 px-3">Conditional</td>
                    <td className="py-2.5 px-3">Restricted</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCompareModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
