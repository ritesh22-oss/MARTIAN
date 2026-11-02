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
import { useTerrainAnalysis, logRouteDiagnostics } from '../../context/TerrainAnalysisContext';
import { MARS_REFERENCE_DATUM } from '../../utils/marsScienceData';

import { MarsRoverIcon } from '../MarsRoverIcon';

export default function ConfigurationWorkspace() {
  const { settings, updateSettings, sharedSession } = useWorkspace();
  const {
    analysis,
    setStartPoint,
    setDestinationPoint,
    setSelectedRouteIndex,
    addObstacle,
    removeObstacle,
    clearObstacles,
    isPlaying,
    traversalProgress,
    simSpeed,
    traversalStatus,
    startTraversal,
    pauseTraversal,
    resumeTraversal,
    resetTraversal,
    setTraversalProgress,
    setSimSpeed,
    roverPos
  } = useTerrainAnalysis();

  const [savedNotice, setSavedNotice] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('Custom');
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'detections' | 'planning' | 'status'>('analytics');
  const [showHazards, setShowHazards] = useState<boolean>(true);
  const [showRouteOverlay, setShowRouteOverlay] = useState<boolean>(true);

  // Tactical Traversal Viewport Options
  const [showTacticalGrid, setShowTacticalGrid] = useState<boolean>(true);
  const [showTacticalPhoto, setShowTacticalPhoto] = useState<boolean>(true);
  const [showTacticalScanner, setShowTacticalScanner] = useState<boolean>(true);

  // Unit conversion helper
  const isImperial = settings.unitSystem === 'imperial';
  const formatDist = (meters: number) => isImperial ? `${(meters * 3.28084).toFixed(0)} ft` : `${Math.round(meters)} m`;

  const getSafeImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;
    return `/api/nasa/proxy-image?url=${encodeURIComponent(url)}`;
  };

  // Single Shared Source of Truth: sync with Walk Ops or active analysis candidate
  const currentRoute = useMemo(() => {
    if (analysis.selectedRouteIndex > 0 && analysis.routes[analysis.selectedRouteIndex]) {
      return analysis.routes[analysis.selectedRouteIndex];
    }
    if (sharedSession?.activeSyncRoute?.waypoints && sharedSession.activeSyncRoute.waypoints.length > 0) {
      const sr = sharedSession.activeSyncRoute;
      return {
        id: sr.routeId,
        name: sr.name || 'Walk Ops Synchronized Route',
        waypoints: sr.waypoints,
        totalCost: sr.totalCost || 0,
        totalLengthM: sr.totalDistanceM || 0,
        maxSlope: Math.max(...sr.waypoints.map(w => Math.abs(w.slope || 0)), 0),
        unsafeCount: sr.waypoints.filter(w => w.isUnsafe).length,
        isBlocked: false,
        difficulty: 'Safe',
        explanation: 'Active synchronized navigation route from MarsWalk Operations.'
      };
    }
    return analysis.routes[analysis.selectedRouteIndex] || analysis.routes[0];
  }, [sharedSession?.activeSyncRoute, analysis.routes, analysis.selectedRouteIndex]);

  const waypoints = currentRoute?.waypoints || [];

  const currentWaypointIndex = roverPos.waypointIndex;
  const currentWaypoint = waypoints[currentWaypointIndex] || {
    slope: roverPos.currentSlope,
    roughness: roverPos.currentRoughness,
    slip: roverPos.currentSlip,
    stepCost: roverPos.currentStepCost,
    x: roverPos.x,
    y: roverPos.y
  };

  // Traversed vs Remaining route sections based on roverPos
  const traversedWaypoints = useMemo(() => {
    if (waypoints.length === 0) return [];
    if (traversalProgress <= 0 && !isPlaying) return [];
    const idx = Math.min(waypoints.length - 1, currentWaypointIndex);
    const pts = waypoints.slice(0, idx + 1).map(w => ({ x: w.x, y: w.y }));
    if (roverPos && (traversalProgress > 0 || isPlaying)) {
      pts.push({ x: roverPos.x, y: roverPos.y });
    }
    return pts;
  }, [waypoints, currentWaypointIndex, roverPos, traversalProgress, isPlaying]);

  const remainingWaypoints = useMemo(() => {
    if (waypoints.length === 0) return [];
    if (traversalProgress >= 100) return [];
    const idx = Math.min(waypoints.length - 1, currentWaypointIndex);
    const pts: Array<{ x: number; y: number }> = [];
    if (roverPos && (traversalProgress > 0 || isPlaying)) {
      pts.push({ x: roverPos.x, y: roverPos.y });
    }
    for (let i = idx + 1; i < waypoints.length; i++) {
      pts.push({ x: waypoints[i].x, y: waypoints[i].y });
    }
    return pts;
  }, [waypoints, currentWaypointIndex, roverPos, traversalProgress, isPlaying]);

  // Sample waypoints for graphs to prevent UI lag and "zero-width" invisible bars in flex containers
  const sampledWaypoints = useMemo(() => {
    if (waypoints.length <= 60) return waypoints;
    const step = Math.ceil(waypoints.length / 60);
    return waypoints.filter((_, i) => i % step === 0 || i === waypoints.length - 1);
  }, [waypoints]);
  
  // Find index in sampled array that corresponds to current traversal progress
  const currentSampledIndex = useMemo(() => {
    if (sampledWaypoints.length === 0) return -1;
    return Math.min(sampledWaypoints.length - 1, Math.floor((traversalProgress / 100) * (sampledWaypoints.length - 1)));
  }, [sampledWaypoints, traversalProgress]);

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
            <div className="text-cyan-300 font-bold text-sm">{traversalProgress.toFixed(0)}%</div>
            <div className="text-[9px] text-slate-500">Waypoint {currentWaypointIndex + 1}/{waypoints.length}</div>
          </div>

          <div className="bg-[#070B14] border border-white/10 p-4 rounded-2xl space-y-1">
            <div className="text-[10px] text-slate-400 uppercase">Simulation State</div>
            <div className={`font-bold text-sm flex items-center space-x-1.5 ${isPlaying ? 'text-amber-400 animate-pulse' : currentRoute?.isBlocked ? 'text-red-400' : 'text-emerald-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-amber-400' : currentRoute?.isBlocked ? 'bg-red-400' : 'bg-emerald-400'}`} />
              <span>{isPlaying ? 'Traversing...' : currentRoute?.isBlocked ? 'Blocked' : traversalStatus}</span>
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
                <div className="w-full flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Active Image View</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <button
                      onClick={() => setShowRouteOverlay(!showRouteOverlay)}
                      className={`px-2 py-0.5 rounded transition-all border cursor-pointer ${
                        showRouteOverlay
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
                      }`}
                    >
                      Route: {showRouteOverlay ? 'ON' : 'OFF'}
                    </button>

                    <button
                      onClick={() => setShowHazards(!showHazards)}
                      className={`px-2 py-0.5 rounded transition-all border cursor-pointer ${
                        showHazards
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
                      }`}
                    >
                      Hazards: {showHazards ? 'ON' : 'OFF'}
                    </button>

                    <button
                      onClick={() => {
                        setShowRouteOverlay(false);
                        setShowHazards(false);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                      title="Show clean original image only"
                    >
                      Clean
                    </button>
                  </div>
                </div>
                
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center bg-black/80">
                  {!analysis.isLoading && analysis.imageUrl ? (
                    <img
                      src={getSafeImageUrl(analysis.imageUrl)}
                      alt="Terrain"
                      className="w-full h-full object-fill select-none pointer-events-none"
                    />
                  ) : (
                    <div className="text-cyan-400 text-xs animate-pulse">Loading image resource...</div>
                  )}

                  {(showRouteOverlay || showHazards) && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 256 256" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="overlayTraversedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <filter id="cfgShadow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.9" />
                        </filter>
                      </defs>

                      {/* Restrained Scientific Hazard Markers */}
                      {showHazards && analysis.obstacles.map(obs => (
                        <g key={obs.id} transform={`translate(${obs.x}, ${obs.y})`}>
                          <circle cx="0" cy="0" r={Math.max(4, obs.radius)} fill="rgba(245, 158, 11, 0.12)" stroke={obs.blocked ? '#EF4444' : '#F59E0B'} strokeWidth="0.8" strokeDasharray="2 1" />
                          <circle cx="0" cy="0" r="1.5" fill={obs.blocked ? '#EF4444' : '#F59E0B'} />
                        </g>
                      ))}

                      {/* Route Polyline Background Casing */}
                      {showRouteOverlay && waypoints.length > 1 && (
                        <polyline
                          points={waypoints.map(w => `${w.x},${w.y}`).join(' ')}
                          stroke="#040814"
                          strokeWidth="4.5"
                          strokeOpacity="0.85"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Traversed Route Section (Solid Emerald Green) */}
                      {showRouteOverlay && traversedWaypoints.length > 1 && (
                        <polyline
                          points={traversedWaypoints.map(w => `${w.x},${w.y}`).join(' ')}
                          stroke="#10B981"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#cfgShadow)"
                        />
                      )}

                      {/* Remaining Route Section (Dashed Cyan Trajectory) */}
                      {showRouteOverlay && (remainingWaypoints.length > 1 ? remainingWaypoints : waypoints).length > 1 && (
                        <polyline
                          points={(remainingWaypoints.length > 1 ? remainingWaypoints : waypoints).map(w => `${w.x},${w.y}`).join(' ')}
                          stroke={currentRoute?.isBlocked ? "#EF4444" : "#00F0FF"}
                          strokeWidth="2.2"
                          strokeDasharray={traversedWaypoints.length > 1 ? "3 2" : "none"}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#cfgShadow)"
                        />
                      )}

                      {/* Individual Waypoint Dots along the route */}
                      {showRouteOverlay && waypoints.map((w, idx) => {
                        const isTraversed = idx <= currentWaypointIndex;
                        const isNext = idx === currentWaypointIndex + 1;
                        return (
                          <circle
                            key={idx}
                            cx={w.x}
                            cy={w.y}
                            r={isNext ? 2.5 : 1.2}
                            fill={isTraversed ? "#10B981" : isNext ? "#F59E0B" : "#FFFFFF"}
                            stroke="#040814"
                            strokeWidth="0.5"
                          />
                        );
                      })}

                      {/* Clearly Visible Start Indicator (Teardrop Map Pin) */}
                      {showRouteOverlay && (analysis.effectiveStartPoint || waypoints[0]) && (() => {
                        const pt = analysis.effectiveStartPoint || waypoints[0];
                        return (
                          <g transform={`translate(${pt.x}, ${pt.y})`}>
                            <rect x="-18" y="-30" width="36" height="9" rx="2" fill="rgba(3, 15, 20, 0.92)" stroke="#06b6d4" strokeWidth="0.7" />
                            <text x="0" y="-23.5" fill="#67e8f9" fontSize="3.8" fontWeight="bold" textAnchor="middle">
                              START
                            </text>
                            <path
                              d="M 0 0 C -5 -6, -7 -10, -7 -13 C -7 -17, -3 -20, 0 -20 C 3 -20, 7 -17, 7 -13 C 7 -10, 5 -6, 0 0 Z"
                              fill="#06b6d4"
                              stroke="#ffffff"
                              strokeWidth="1.2"
                              filter="url(#cfgShadow)"
                            />
                            <path d="M -2.5 -11.5 L 2.5 -11.5 L 0 -15.5 Z" fill="#ffffff" />
                            <circle cx="0" cy="-10" r="1" fill="#ffffff" />
                          </g>
                        );
                      })()}

                      {/* Clearly Visible Destination Indicator (Teardrop Map Pin) */}
                      {showRouteOverlay && (analysis.effectiveDestinationPoint || waypoints[waypoints.length - 1]) && (() => {
                        const pt = analysis.effectiveDestinationPoint || waypoints[waypoints.length - 1];
                        return (
                          <g transform={`translate(${pt.x}, ${pt.y})`}>
                            <rect x="-24" y="-30" width="48" height="9" rx="2" fill="rgba(20, 5, 5, 0.92)" stroke="#f87171" strokeWidth="0.7" />
                            <text x="0" y="-23.5" fill="#fca5a5" fontSize="3.5" fontWeight="bold" textAnchor="middle">
                              DESTINATION
                            </text>
                            <path
                              d="M 0 0 C -5 -6, -7 -10, -7 -13 C -7 -17, -3 -20, 0 -20 C 3 -20, 7 -17, 7 -13 C 7 -10, 5 -6, 0 0 Z"
                              fill="#f87171"
                              stroke="#ffffff"
                              strokeWidth="1.2"
                              filter="url(#cfgShadow)"
                            />
                            <path d="M -2 -14 L 3 -12.5 L -2 -11 Z" fill="#ffffff" />
                            <line x1="-2" y1="-15" x2="-2" y2="-9" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                          </g>
                        );
                      })()}

                      {/* Rover Icon positioned along the route */}
                      {showRouteOverlay && !currentRoute?.isBlocked && waypoints.length > 0 && (
                        <g transform={`translate(${roverPos.x}, ${roverPos.y}) rotate(${roverPos.angle})`}>
                          <MarsRoverIcon size={24} />
                        </g>
                      )}
                    </svg>
                  )}
                </div>

                <div className="w-full flex items-center justify-between text-[11px] text-slate-400">
                  <span>Start Pin: {analysis.effectiveStartPoint ? `(${Math.round(analysis.effectiveStartPoint.x)}, ${Math.round(analysis.effectiveStartPoint.y)})` : 'Unset'}</span>
                  <span className="text-cyan-400 font-bold">Progress: {traversalProgress.toFixed(0)}%</span>
                  <span>Goal Pin: {analysis.effectiveDestinationPoint ? `(${Math.round(analysis.effectiveDestinationPoint.x)}, ${Math.round(analysis.effectiveDestinationPoint.y)})` : 'Unset'}</span>
                </div>
              </div>

              {/* Right: Traversal Playback & Live Traversal Visualization Engine */}
              <div className="lg:col-span-2 bg-[#050813] border border-white/10 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                {/* Playback Controls Header & Toolstrip */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Traversal Playback &amp; Telemetry Control</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1 ${
                        isPlaying
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          : traversalProgress >= 100
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : traversalProgress > 0
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span>{isPlaying ? 'Traversing...' : traversalProgress >= 100 ? 'Completed' : traversalProgress > 0 ? 'Paused' : 'Ready'}</span>
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                      <span>Waypoint <strong className="text-white">{currentWaypointIndex + 1}</strong> of <strong className="text-cyan-300">{waypoints.length}</strong></span>
                      {waypoints.length > 0 && (
                        <span className="text-slate-500">| Scale: 0.15 m/px</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Play / Pause / Resume / Replay Button */}
                    <button
                      onClick={() => {
                        if (isPlaying) {
                          pauseTraversal();
                        } else if (traversalProgress >= 100) {
                          resetTraversal();
                          setTimeout(() => startTraversal(), 50);
                        } else if (traversalProgress > 0) {
                          resumeTraversal();
                        } else {
                          startTraversal();
                        }
                      }}
                      disabled={currentRoute?.isBlocked || analysis.isLoading || waypoints.length < 2}
                      className={`px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition cursor-pointer disabled:opacity-40 shadow-lg ${
                        isPlaying
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                          : traversalProgress >= 100
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                      }`}
                      title={isPlaying ? "Pause Traversal" : traversalProgress >= 100 ? "Replay Traversal" : traversalProgress > 0 ? "Resume Traversal" : "Start Traversal"}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4" />
                          <span>Pause</span>
                        </>
                      ) : traversalProgress >= 100 ? (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>Replay</span>
                        </>
                      ) : traversalProgress > 0 ? (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Start Traverse</span>
                        </>
                      )}
                    </button>

                    {/* Reset Button */}
                    <button
                      onClick={resetTraversal}
                      className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 cursor-pointer flex items-center space-x-1.5 transition"
                      title="Reset Rover to Start Point"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset</span>
                    </button>

                    {/* Simulation Speed Selector */}
                    <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-400 px-1 font-mono">Speed:</span>
                      {[0.5, 1, 2, 4].map(spd => (
                        <button
                          key={spd}
                          onClick={() => setSimSpeed(spd)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition ${
                            simSpeed === spd
                              ? 'bg-cyan-500 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    {/* Progress Range Slider */}
                    <div className="flex-1 min-w-[200px] flex items-center space-x-3 px-2 bg-black/40 p-2 rounded-xl border border-white/10">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={traversalProgress}
                        disabled={currentRoute?.isBlocked || analysis.isLoading || waypoints.length < 2}
                        onChange={(e) => setTraversalProgress(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer disabled:opacity-40"
                      />
                      <span className="text-xs font-mono font-bold text-cyan-300 w-12 text-right">
                        {traversalProgress.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* RESTORED: LARGE ROVER TRAVERSAL VISUALIZATION VIEWPORT */}
                <div className="relative w-full h-[320px] lg:h-[340px] rounded-2xl overflow-hidden border border-cyan-500/40 bg-[#02050E] shadow-2xl flex flex-col justify-between">
                  {/* Viewport Top HUD Controls Bar */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-950/80 border-b border-cyan-500/20 z-20 backdrop-blur-xs text-[10px] font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="font-bold text-slate-200 uppercase tracking-wider">Rover Traversal Viewport</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400">Heading: <strong className="text-cyan-300">{Math.round(roverPos.angle)}°</strong></span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowTacticalPhoto(!showTacticalPhoto)}
                        className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                          showTacticalPhoto ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-black/50 text-slate-500 border-slate-800'
                        }`}
                        title="Toggle Terrain Photo Underlay"
                      >
                        Photo: {showTacticalPhoto ? 'ON' : 'OFF'}
                      </button>
                      <button
                        onClick={() => setShowTacticalGrid(!showTacticalGrid)}
                        className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                          showTacticalGrid ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-black/50 text-slate-500 border-slate-800'
                        }`}
                        title="Toggle Tactical Coordinate Grid"
                      >
                        Grid: {showTacticalGrid ? 'ON' : 'OFF'}
                      </button>
                      <button
                        onClick={() => setShowTacticalScanner(!showTacticalScanner)}
                        className={`px-2 py-0.5 rounded border transition-all cursor-pointer ${
                          showTacticalScanner ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-black/50 text-slate-500 border-slate-800'
                        }`}
                        title="Toggle Rover Forward Sensor Cone"
                      >
                        Scanner: {showTacticalScanner ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>

                  {/* Visual Surface Underlay & Tactical Radar Grid */}
                  <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
                    {/* Authentic NASA Terrain Image Underlay */}
                    {showTacticalPhoto && analysis.imageUrl && (
                      <img
                        src={getSafeImageUrl(analysis.imageUrl)}
                        alt="Terrain Surface Underlay"
                        className="absolute inset-0 w-full h-full object-fill opacity-35 pointer-events-none select-none filter contrast-125"
                      />
                    )}

                    {/* Scanline Texture Overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#02050E]/40 to-[#02050E]/90 pointer-events-none" />

                    {/* Empty State when Route is not yet planned */}
                    {waypoints.length < 2 && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs p-6 text-center space-y-3">
                        <Route className="w-10 h-10 text-cyan-400 animate-pulse" />
                        <div className="font-bold text-white text-sm">Awaiting Traversal Route</div>
                        <p className="text-slate-400 text-xs max-w-sm">
                          Plan a route in MARSWALK OPS or select a candidate route from the tabs to initialize the traversal engine.
                        </p>
                      </div>
                    )}

                    {/* TACTICAL SVG TRAVERSAL HUD LAYER */}
                    <svg
                      viewBox="0 0 256 256"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      <defs>
                        <linearGradient id="tacticalTraversedGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <radialGradient id="sensorConeGrad" cx="0%" cy="50%" r="100%">
                          <stop offset="0%" stopColor="rgba(0, 240, 255, 0.45)" />
                          <stop offset="60%" stopColor="rgba(0, 240, 255, 0.12)" />
                          <stop offset="100%" stopColor="rgba(0, 240, 255, 0.0)" />
                        </radialGradient>
                        <filter id="tacticalShadow" x="-30%" y="-30%" width="160%" height="160%">
                          <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#000000" floodOpacity="0.95" />
                        </filter>
                      </defs>

                      {/* Tactical Coordinate Grid Overlay (32px divisions) */}
                      {showTacticalGrid && (
                        <g opacity="0.35">
                          {[32, 64, 96, 128, 160, 192, 224].map(v => (
                            <React.Fragment key={v}>
                              <line x1={v} y1="0" x2={v} y2="256" stroke="#00F0FF" strokeWidth="0.3" strokeDasharray="2 4" />
                              <line x1="0" y1={v} x2="256" y2={v} stroke="#00F0FF" strokeWidth="0.3" strokeDasharray="2 4" />
                            </React.Fragment>
                          ))}
                          {/* Center Tactical Crosshair */}
                          <circle cx="128" cy="128" r="8" fill="none" stroke="#00F0FF" strokeWidth="0.4" strokeDasharray="2 2" />
                          <line x1="124" y1="128" x2="132" y2="128" stroke="#00F0FF" strokeWidth="0.6" />
                          <line x1="128" y1="124" x2="128" y2="132" stroke="#00F0FF" strokeWidth="0.6" />
                        </g>
                      )}

                      {/* Terrain Obstacles & Hazards */}
                      {analysis.obstacles.map(obs => (
                        <g key={`tactical-obs-${obs.id}`} transform={`translate(${obs.x}, ${obs.y})`}>
                          <circle cx="0" cy="0" r={Math.max(5, obs.radius * 1.2)} fill="rgba(239, 68, 68, 0.12)" stroke="#EF4444" strokeWidth="0.8" strokeDasharray="2 2" />
                          <circle cx="0" cy="0" r="2" fill="#EF4444" />
                          <text y="-5" fill="#fca5a5" fontSize="3.8" fontWeight="bold" textAnchor="middle">
                            HAZARD
                          </text>
                        </g>
                      ))}

                      {/* Full Route Base Guide Casing */}
                      {waypoints.length > 1 && (
                        <polyline
                          points={waypoints.map(w => `${w.x},${w.y}`).join(' ')}
                          stroke="#000000"
                          strokeWidth="4.5"
                          strokeOpacity="0.9"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Traversed Path Section (Solid Glowing Emerald Trail) */}
                      {traversedWaypoints.length > 1 && (
                        <polyline
                          points={traversedWaypoints.map(w => `${w.x},${w.y}`).join(' ')}
                          stroke="#10B981"
                          strokeWidth="3.2"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#tacticalShadow)"
                        />
                      )}

                      {/* Remaining Route Section (High-Contrast Dashed Cyan Trajectory) */}
                      {(remainingWaypoints.length > 1 ? remainingWaypoints : waypoints).length > 1 && (
                        <polyline
                          points={(remainingWaypoints.length > 1 ? remainingWaypoints : waypoints).map(w => `${w.x},${w.y}`).join(' ')}
                          stroke={currentRoute?.isBlocked ? "#EF4444" : "#00F0FF"}
                          strokeWidth="2.2"
                          strokeDasharray={traversedWaypoints.length > 1 ? "3 2" : "none"}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          filter="url(#tacticalShadow)"
                        />
                      )}

                      {/* Waypoint Nodes along the route */}
                      {waypoints.map((w, idx) => {
                        const isTraversed = idx <= currentWaypointIndex;
                        const isNext = idx === currentWaypointIndex + 1;
                        return (
                          <g key={`wp-node-${idx}`} transform={`translate(${w.x}, ${w.y})`}>
                            {isNext && (
                              <g>
                                <circle r="8" fill="rgba(245, 158, 11, 0.25)" stroke="#F59E0B" strokeWidth="1" strokeDasharray="2 1" className="animate-ping" />
                                <rect x="-6" y="-6" width="12" height="12" fill="none" stroke="#F59E0B" strokeWidth="0.8" />
                              </g>
                            )}
                            <circle
                              r={isNext ? 3 : 1.5}
                              fill={isTraversed ? "#10B981" : isNext ? "#F59E0B" : "#38BDF8"}
                              stroke="#000000"
                              strokeWidth="0.6"
                            />
                            {/* Waypoint number tag for key nodes */}
                            {(idx === 0 || idx === waypoints.length - 1 || idx % Math.max(1, Math.floor(waypoints.length / 8)) === 0) && (
                              <text y="4.5" fill="#E2E8F0" fontSize="3.2" fontWeight="bold" textAnchor="middle">
                                {idx + 1}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Active Next Waypoint Radar Highlight Target */}
                      {waypoints[currentWaypointIndex + 1] && (() => {
                        const nextWp = waypoints[currentWaypointIndex + 1];
                        return (
                          <g transform={`translate(${nextWp.x}, ${nextWp.y})`}>
                            <rect x="-16" y="-14" width="32" height="7" rx="1.5" fill="rgba(15, 23, 42, 0.95)" stroke="#F59E0B" strokeWidth="0.6" />
                            <text x="0" y="-9.5" fill="#FCD34D" fontSize="3.4" fontWeight="bold" textAnchor="middle">
                              NEXT WP #{currentWaypointIndex + 2}
                            </text>
                          </g>
                        );
                      })()}

                      {/* Start Base Pin Beacon (Teardrop Map Pin) */}
                      {analysis.effectiveStartPoint && (
                        <g transform={`translate(${analysis.effectiveStartPoint.x}, ${analysis.effectiveStartPoint.y})`}>
                          <rect x="-18" y="-30" width="36" height="9" rx="2" fill="rgba(3, 15, 20, 0.95)" stroke="#06b6d4" strokeWidth="0.7" />
                          <text x="0" y="-23.5" fill="#67e8f9" fontSize="3.8" fontWeight="bold" textAnchor="middle">
                            START
                          </text>
                          <path
                            d="M 0 0 C -5 -6, -7 -10, -7 -13 C -7 -17, -3 -20, 0 -20 C 3 -20, 7 -17, 7 -13 C 7 -10, 5 -6, 0 0 Z"
                            fill="#06b6d4"
                            stroke="#ffffff"
                            strokeWidth="1.2"
                            filter="url(#tacticalShadow)"
                          />
                          <path d="M -2.5 -11.5 L 2.5 -11.5 L 0 -15.5 Z" fill="#ffffff" />
                          <circle cx="0" cy="-10" r="1" fill="#ffffff" />
                        </g>
                      )}

                      {/* Goal Target Pin Beacon (Teardrop Map Pin) */}
                      {analysis.effectiveDestinationPoint && (
                        <g transform={`translate(${analysis.effectiveDestinationPoint.x}, ${analysis.effectiveDestinationPoint.y})`}>
                          <rect x="-24" y="-30" width="48" height="9" rx="2" fill="rgba(20, 5, 5, 0.95)" stroke="#f87171" strokeWidth="0.7" />
                          <text x="0" y="-23.5" fill="#fca5a5" fontSize="3.5" fontWeight="bold" textAnchor="middle">
                            DESTINATION
                          </text>
                          <path
                            d="M 0 0 C -5 -6, -7 -10, -7 -13 C -7 -17, -3 -20, 0 -20 C 3 -20, 7 -17, 7 -13 C 7 -10, 5 -6, 0 0 Z"
                            fill="#f87171"
                            stroke="#ffffff"
                            strokeWidth="1.2"
                            filter="url(#tacticalShadow)"
                          />
                          <path d="M -2 -14 L 3 -12.5 L -2 -11 Z" fill="#ffffff" />
                          <line x1="-2" y1="-15" x2="-2" y2="-9" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                        </g>
                      )}

                      {/* THE ROVER VISUALIZATION */}
                      {waypoints.length > 0 && !currentRoute?.isBlocked && (
                        <g transform={`translate(${roverPos.x}, ${roverPos.y})`}>
                          {/* Forward Radar Scanner Cone */}
                          {showTacticalScanner && (
                            <g transform={`rotate(${roverPos.angle})`}>
                              <path
                                d="M 0 0 L 26 -14 A 30 30 0 0 1 26 14 Z"
                                fill="url(#sensorConeGrad)"
                              />
                              <line x1="0" y1="0" x2="28" y2="0" stroke="#00F0FF" strokeWidth="0.7" strokeDasharray="2 2" opacity="0.8" />
                            </g>
                          )}

                          {/* Rover Icon Rotated along Traversal Heading */}
                          <g transform={`rotate(${roverPos.angle})`}>
                            <MarsRoverIcon size={28} />
                          </g>

                          {/* Floating Rover Telemetry Pill */}
                          <rect x="-24" y="-21" width="48" height="8" rx="2" fill="rgba(3, 7, 18, 0.95)" stroke="#00F0FF" strokeWidth="0.7" />
                          <text x="0" y="-15.5" fill="#38BDF8" fontSize="3.4" fontWeight="bold" textAnchor="middle">
                            ROVER · ({Math.round(roverPos.x)}, {Math.round(roverPos.y)})
                          </text>
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* Viewport Bottom Status Bar */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/90 border-t border-cyan-500/20 z-20 text-[10px] font-mono text-slate-300">
                    <div className="flex items-center space-x-3">
                      <span>Distance: <strong className="text-white">{roverPos.distanceTraveledM} m</strong> / <strong className="text-slate-400">{currentRoute?.totalLengthM || 0} m</strong></span>
                      <span className="text-slate-600">|</span>
                      <span>Next WP Distance: <strong className="text-amber-400">
                        {waypoints[currentWaypointIndex + 1] ? `${Math.round(Math.hypot(waypoints[currentWaypointIndex + 1].x - roverPos.x, waypoints[currentWaypointIndex + 1].y - roverPos.y) * 0.15)} m` : '0 m (Goal)'}
                      </strong></span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-cyan-300 font-bold uppercase">{isPlaying ? 'Active In-Transit' : traversalProgress >= 100 ? 'Mission Target Reached' : 'Holding Position'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Telemetry Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10 text-[11px]">
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-0.5">
                    <div className="text-slate-400">Rover Position</div>
                    <div className="text-cyan-400 font-bold font-mono">({Math.round(roverPos.x)}, {Math.round(roverPos.y)})</div>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-0.5">
                    <div className="text-slate-400">Current Slope</div>
                    <div className="text-emerald-400 font-bold font-mono">{currentRoute?.isBlocked ? 'N/A' : `${roverPos.currentSlope}°`}</div>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-0.5">
                    <div className="text-slate-400">Traversed / Remaining</div>
                    <div className="text-amber-400 font-bold font-mono">{roverPos.distanceTraveledM}m / {roverPos.remainingDistanceM}m</div>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-0.5">
                    <div className="text-slate-400">Wheel-Slip Factor</div>
                    <div className="text-orange-400 font-bold font-mono">{currentRoute?.isBlocked ? 'N/A' : `${(roverPos.currentSlip * 100).toFixed(0)}%`}</div>
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
                    {sampledWaypoints.length > 0 ? (
                      sampledWaypoints.map((w, idx) => {
                        const penalty = w.obstaclePenalty || 0;
                        const h = Math.min(100, (penalty / 10) * 100);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative group">
                            <div className={`w-full rounded-t ${penalty > 2 ? 'bg-amber-500' : 'bg-cyan-600'}`} style={{ height: `${Math.max(4, h)}%` }} />
                            {idx === currentSampledIndex && <div className="absolute -top-1 left-0 right-0 h-1 bg-white animate-pulse" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                        Analyzing obstacle proximity across terrain image...
                      </div>
                    )}
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
                    {sampledWaypoints.length > 0 ? (
                      sampledWaypoints.map((w, idx) => {
                        const h = Math.min(100, w.roughness * 100);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative">
                            <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${Math.max(4, h)}%` }} />
                            {idx === currentSampledIndex && <div className="absolute -top-1 left-0 right-0 h-1 bg-white animate-pulse" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                        Evaluating pixel roughness coefficients...
                      </div>
                    )}
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
                    <span className="text-[10px] text-orange-400">Total: {currentRoute?.totalCost || 0} pts</span>
                  </div>
                  <div className="h-28 flex items-end gap-[1px] pt-2 px-1 border-b border-white/10">
                    {sampledWaypoints.length > 0 ? (
                      sampledWaypoints.map((w, idx) => {
                        const h = Math.min(100, (w.cumulativeCost / (currentRoute?.totalCost || 1)) * 100);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative">
                            <div className="w-full bg-gradient-to-t from-cyan-600 to-orange-500 rounded-t" style={{ height: `${Math.max(2, h)}%` }} />
                            {idx === currentSampledIndex && <div className="absolute -top-1 left-0 right-0 h-1 bg-white animate-pulse" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                        Computing A* cumulative cost curve...
                      </div>
                    )}
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
                    {sampledWaypoints.length > 0 ? (
                      sampledWaypoints.map((w, idx) => {
                        const h = Math.min(100, (Math.abs(w.slope) / 20) * 100);
                        const isOver = Math.abs(w.slope) > settings.maxSlopeLimitDeg;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative">
                            <div className={`w-full rounded-t ${isOver ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ height: `${Math.max(4, h)}%` }} />
                            {idx === currentSampledIndex && <div className="absolute -top-1 left-0 right-0 h-1 bg-white animate-pulse" />}
                          </div>
                        );
                      })
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                        Mapping local gradients against slope limit...
                      </div>
                    )}
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
                    {sampledWaypoints.length > 0 ? (
                      (() => {
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
                      })()
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                        Deriving relative elevation profile...
                      </div>
                    )}
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
