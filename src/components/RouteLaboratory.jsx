import React, { useState, useEffect, useRef } from 'react';
import {
  Route,
  Navigation,
  Compass,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Clock,
  Mountain,
  Target,
  Eye,
  Layers,
  MapPin,
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useMissionRecord } from '../context/MissionRecordContext';
import { useTerrainAnalysis } from '../context/TerrainAnalysisContext';

export default function RouteLaboratory() {
  const { sharedSession, updateSharedSession, setActiveWorkspace } = useWorkspace();
  const { activeMission, saveRouteResult } = useMissionRecord();
  const {
    analysis,
    safetyClearancePx,
    setSafetyClearancePx,
    setStartPoint,
    setDestinationPoint,
    setSelectedRouteIndex
  } = useTerrainAnalysis();

  const session = sharedSession || {};
  const activeStrategy = session.selectedStrategy || 'alpha';

  // Route Visibility Selector: 'all' | 'alpha' | 'beta' | 'gamma' | 'delta'
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  // Interactive Marker Placement Mode: null | 'start' | 'dest'
  const [placementMode, setPlacementMode] = useState(null);

  // Aspect ratio tracker for true image proportions
  const [imageAspect, setImageAspect] = useState(4 / 3);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const safeUncertaintyPenalty = typeof session.uncertaintyPenalty === 'number' ? session.uncertaintyPenalty : 1.5;
  const safeMaxSlope = typeof session.maxSlopeLimit === 'number' ? session.maxSlopeLimit : 15;

  // Extract the 4 routes calculated by TerrainAnalysisContext
  const candidatesList = analysis?.routes || [];
  const alphaRoute = candidatesList.find(r => r.strategyId === 'alpha') || candidatesList[0];
  const betaRoute = candidatesList.find(r => r.strategyId === 'beta') || candidatesList[1];
  const gammaRoute = candidatesList.find(r => r.strategyId === 'gamma') || candidatesList[2];
  const deltaRoute = candidatesList.find(r => r.strategyId === 'delta') || candidatesList[3];

  const routes = {
    alpha: alphaRoute || {
      id: 'alpha',
      strategyId: 'alpha',
      name: 'Route Alpha: Shortest Safe Distance',
      color: '#00f0ff',
      waypoints: [],
      totalLengthM: 0,
      totalLengthPx: 0,
      estimatedDurationMins: 0,
      totalCost: 0,
      isBlocked: true,
      validationStatus: 'NO_SAFE_ROUTE',
      explanation: 'Calculating collision-free path...'
    },
    beta: betaRoute || {
      id: 'beta',
      strategyId: 'beta',
      name: 'Route Beta: Lowest Traversal Cost',
      color: '#bf5af2',
      waypoints: [],
      totalLengthM: 0,
      totalLengthPx: 0,
      estimatedDurationMins: 0,
      totalCost: 0,
      isBlocked: true,
      validationStatus: 'NO_SAFE_ROUTE',
      explanation: 'Calculating low-energy path...'
    },
    gamma: gammaRoute || {
      id: 'gamma',
      strategyId: 'gamma',
      name: 'Route Gamma: Uncertainty-Aware',
      color: '#30d158',
      waypoints: [],
      totalLengthM: 0,
      totalLengthPx: 0,
      estimatedDurationMins: 0,
      totalCost: 0,
      isBlocked: true,
      validationStatus: 'NO_SAFE_ROUTE',
      explanation: 'Calculating high-clearance path...'
    },
    delta: deltaRoute || {
      id: 'delta',
      strategyId: 'delta',
      name: 'Route Delta: Science-Driven Exploration',
      color: '#ff9f0a',
      waypoints: [],
      totalLengthM: 0,
      totalLengthPx: 0,
      estimatedDurationMins: 0,
      totalCost: 0,
      isBlocked: true,
      validationStatus: 'NO_SAFE_ROUTE',
      explanation: 'Calculating science detour path...'
    }
  };

  const currentRoute = routes[activeStrategy] || routes.alpha;

  // Sync active route to mission record
  useEffect(() => {
    if (activeMission && currentRoute && !currentRoute.isBlocked) {
      saveRouteResult(activeMission.id, currentRoute);
    }
  }, [activeMission?.id, currentRoute]);

  // Keep image aspect ratio accurate
  const handleImageLoad = (e) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setImageAspect(img.naturalWidth / img.naturalHeight);
    }
  };

  // Click on terrain image to set start or destination
  const handleTerrainClick = (e) => {
    if (!placementMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normX = Math.round(Math.max(4, Math.min(251, (clickX / rect.width) * 256)));
    const normY = Math.round(Math.max(4, Math.min(251, (clickY / rect.height) * 256)));

    if (placementMode === 'start') {
      setStartPoint({ x: normX, y: normY });
      setPlacementMode(null);
    } else if (placementMode === 'dest') {
      setDestinationPoint({ x: normX, y: normY });
      setPlacementMode(null);
    }
  };

  // Test Scenarios (Section 8 of specification)
  const applyTestScenario = (scenarioKey) => {
    setPlacementMode(null);
    if (scenarioKey === 'scattered_boulders') {
      updateSharedSession({
        terrainImage: '/assets/aistudio/vis_0_f6a9756b.png',
        imageProvenance: {
          source: 'Jezero Delta Western Fan',
          identifier: 'TEST_SCENARIO_1_SCATTERED',
          rover: 'Perseverance',
          camera: 'NAVCAM_LEFT'
        },
        startPoint: { x: 38, y: 218 },
        destinationPoint: { x: 218, y: 42 }
      });
      setSafetyClearancePx(12);
    } else if (scenarioKey === 'large_obstacle') {
      updateSharedSession({
        terrainImage: '/assets/aistudio/vis_1_84d26681.png',
        imageProvenance: {
          source: 'Direct Boulder Blockade',
          identifier: 'TEST_SCENARIO_2_LARGE_OBSTACLE',
          rover: 'Perseverance',
          camera: 'MASTCAM_Z'
        },
        startPoint: { x: 42, y: 130 },
        destinationPoint: { x: 216, y: 130 }
      });
      setSafetyClearancePx(12);
    } else if (scenarioKey === 'narrow_passage') {
      updateSharedSession({
        terrainImage: '/assets/aistudio/vis_2_9c24860c.png',
        imageProvenance: {
          source: 'Rocky Corridor Choke Point',
          identifier: 'TEST_SCENARIO_3_NARROW_PASSAGE',
          rover: 'Perseverance',
          camera: 'FRONT_HAZCAM'
        },
        startPoint: { x: 35, y: 215 },
        destinationPoint: { x: 220, y: 40 }
      });
      setSafetyClearancePx(8);
    } else if (scenarioKey === 'no_safe_route') {
      // Intentionally placing start or destination directly inside an impassable obstacle to verify safe rejection
      updateSharedSession({
        terrainImage: '/assets/aistudio/vis_1_84d26681.png',
        imageProvenance: {
          source: 'Impassable Hazard Trap',
          identifier: 'TEST_SCENARIO_4_IMPASSABLE',
          rover: 'Perseverance',
          camera: 'NAVCAM_LEFT'
        },
        startPoint: { x: 128, y: 128 }, // Direct core center of boulder
        destinationPoint: { x: 220, y: 40 }
      });
    }
  };

  // Recommendation engine based on validated route performance
  const recommendedId = (() => {
    if (safeUncertaintyPenalty > 2.0 && !routes.gamma.isBlocked) return 'gamma';
    if (session.scienceTargets && session.scienceTargets.length > 0 && !routes.delta.isBlocked) return 'delta';
    if (!routes.beta.isBlocked && routes.beta.totalCost < routes.alpha.totalCost * 0.9) return 'beta';
    if (!routes.alpha.isBlocked) return 'alpha';
    if (!routes.beta.isBlocked) return 'beta';
    if (!routes.gamma.isBlocked) return 'gamma';
    if (!routes.delta.isBlocked) return 'delta';
    return 'alpha';
  })();

  const recommendationReason = (() => {
    if (routes[recommendedId]?.isBlocked) {
      return 'No safe collision-free path exists with current clearance constraints. Please reposition markers or reduce safety clearance.';
    }
    if (recommendedId === 'gamma') {
      return 'Recommended due to elevated terrain uncertainty requiring expanded obstacle buffers.';
    }
    if (recommendedId === 'delta') {
      return 'Recommended to maximise geological science yield by passing near confirmed targets.';
    }
    if (recommendedId === 'beta') {
      return 'Recommended for lowest cumulative terrain cost and reduced wheel slip along smoother regolith.';
    }
    return 'Recommended for shortest safe distance with minimal travel time.';
  })();

  const handleApplyRecommended = () => {
    updateSharedSession({ selectedStrategy: recommendedId });
    const idx = recommendedId === 'alpha' ? 0 : recommendedId === 'beta' ? 1 : recommendedId === 'gamma' ? 2 : 3;
    setSelectedRouteIndex(idx);
  };

  const handleSelectStrategy = (stratId) => {
    updateSharedSession({ selectedStrategy: stratId });
    const idx = stratId === 'alpha' ? 0 : stratId === 'beta' ? 1 : stratId === 'gamma' ? 2 : 3;
    setSelectedRouteIndex(idx);
  };

  // Marker positions
  const startPt = analysis?.effectiveStartPoint || { x: 38, y: 218 };
  const destPt = analysis?.effectiveDestinationPoint || { x: 218, y: 42 };

  return (
    <div className="space-y-6 font-sans text-xs p-4 lg:p-6 max-w-[1700px] mx-auto">
      {/* Header Bar */}
      <div className="bg-[#0A0E1C] border border-slate-800/80 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5" />
              Route Comparison Engine
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-300">Unified Obstacle-Aware Navigation</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono text-emerald-400 text-[10px]">100% COLLISION-FREE ASSURANCE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Multi-Strategy Rover Route Comparison
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-3xl leading-relaxed">
            Evaluates Alpha (Shortest Distance), Beta (Lowest Cost), Gamma (Uncertainty-Aware), and Delta (Science-Driven). Every route independently navigates around detected terrain obstacles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveWorkspace('marsnav-v4')}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg transition cursor-pointer flex items-center gap-2"
          >
            <span>Open in MARSWALK OPS</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Preset Test Scenarios Bar (Requirement 8) */}
      <div className="bg-[#080C18] border border-slate-800/80 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Compass className="w-4 h-4 text-orange-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">Verification Test Scenarios:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => applyTestScenario('scattered_boulders')}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-500 text-[11px] font-mono transition"
            title="Standard Jezero crater delta with scattered boulders"
          >
            1. Scattered Boulders
          </button>
          <button
            onClick={() => applyTestScenario('large_obstacle')}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-500 text-[11px] font-mono transition"
            title="Large boulder located directly on straight line between endpoints"
          >
            2. Large Obstacle in Path
          </button>
          <button
            onClick={() => applyTestScenario('narrow_passage')}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 hover:border-slate-500 text-[11px] font-mono transition"
            title="Tight corridor between dense rock groupings"
          >
            3. Narrow Passage
          </button>
          <button
            onClick={() => applyTestScenario('no_safe_route')}
            className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 hover:border-rose-600 text-[11px] font-mono transition"
            title="Impassable obstacle trapping endpoint, verifying 'No Safe Route Found'"
          >
            4. Impassable / Blocked Trap
          </button>
        </div>
      </div>

      {/* Main Comparison Workspace */}
      <div className="bg-[#090D1A] border border-slate-800/80 p-5 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start shadow-xl">
        {/* Left Column: Authentic NASA Image + True Aspect Ratio Viewport */}
        <div className="lg:col-span-7 space-y-3">
          {/* Viewport Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#060A14] border border-slate-800/80 rounded-xl text-xs">
            {/* Route Visibility Selector */}
            <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-lg border border-white/5">
              <Eye className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <span className="text-[10px] text-slate-400 font-mono mr-1">Display:</span>
              <button
                onClick={() => setVisibilityFilter('all')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                  visibilityFilter === 'all'
                    ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All 4 Routes
              </button>
              <button
                onClick={() => setVisibilityFilter('alpha')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                  visibilityFilter === 'alpha'
                    ? 'bg-[#00f0ff]/20 text-[#00f0ff] font-bold border border-[#00f0ff]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Alpha
              </button>
              <button
                onClick={() => setVisibilityFilter('beta')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                  visibilityFilter === 'beta'
                    ? 'bg-[#bf5af2]/20 text-[#bf5af2] font-bold border border-[#bf5af2]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Beta
              </button>
              <button
                onClick={() => setVisibilityFilter('gamma')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                  visibilityFilter === 'gamma'
                    ? 'bg-[#30d158]/20 text-[#30d158] font-bold border border-[#30d158]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gamma
              </button>
              <button
                onClick={() => setVisibilityFilter('delta')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition cursor-pointer ${
                  visibilityFilter === 'delta'
                    ? 'bg-[#ff9f0a]/20 text-[#ff9f0a] font-bold border border-[#ff9f0a]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Delta
              </button>
            </div>

            {/* Interactive Placement Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPlacementMode(placementMode === 'start' ? null : 'start')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1.5 cursor-pointer ${
                  placementMode === 'start'
                    ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400 shadow-md animate-pulse'
                    : 'bg-blue-950/40 text-blue-300 border border-blue-800/60 hover:bg-blue-900/40'
                }`}
              >
                <MapPin className="w-3 h-3 text-blue-400" />
                <span>{placementMode === 'start' ? 'Click Image to Move Start' : 'Move Start (S)'}</span>
              </button>
              <button
                onClick={() => setPlacementMode(placementMode === 'dest' ? null : 'dest')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition flex items-center gap-1.5 cursor-pointer ${
                  placementMode === 'dest'
                    ? 'bg-orange-600 text-white font-bold ring-2 ring-orange-400 shadow-md animate-pulse'
                    : 'bg-orange-950/40 text-orange-300 border border-orange-800/60 hover:bg-orange-900/40'
                }`}
              >
                <Target className="w-3 h-3 text-orange-400" />
                <span>{placementMode === 'dest' ? 'Click Image to Move Dest' : 'Move Dest (D)'}</span>
              </button>
            </div>
          </div>

          {/* NASA Surface Image Viewport with 4 Route Overlays */}
          <div
            ref={containerRef}
            onClick={handleTerrainClick}
            className={`relative w-full rounded-2xl overflow-hidden bg-black border border-slate-700/80 flex items-center justify-center shadow-2xl transition-all ${
              placementMode ? 'cursor-crosshair ring-2 ring-orange-500' : 'cursor-default'
            }`}
            style={{ aspectRatio: `${imageAspect}` }}
          >
            {/* Raw NASA Surface Image - Pristine and Unobstructed */}
            {analysis?.imageUrl ? (
              <img
                ref={imageRef}
                src={analysis.imageUrl}
                alt="Active Terrain Session"
                onLoad={handleImageLoad}
                className="w-full h-full object-contain filter contrast-105 select-none pointer-events-none"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs p-6 text-center bg-[#070B18]">
                <span className="text-slate-400 font-sans font-medium mb-1">No terrain image loaded</span>
                <span className="text-[10px] text-slate-500">Upload or select an image in MarsNav</span>
              </div>
            )}

            {/* High-Definition SVG Route Overlay */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 256 256"
              preserveAspectRatio="none"
            >
              <defs>
                <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.9" />
                </filter>
              </defs>

              {/* Render the 4 Route Trajectories */}
              {Object.values(routes).map((r) => {
                if (!r.waypoints || r.waypoints.length < 2 || r.isBlocked) return null;

                const isVisible = visibilityFilter === 'all' || visibilityFilter === r.id;
                if (!isVisible) return null;

                const isSelected = activeStrategy === r.id;
                const pointsStr = r.waypoints.map(p => `${p.x},${p.y}`).join(' ');

                return (
                  <g key={r.id}>
                    {/* Dark drop casing for high contrast on Martian rock */}
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke="#000000"
                      strokeWidth={isSelected ? '5.5' : '3.5'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={isSelected ? '0.95' : '0.6'}
                    />
                    {/* Distinct Route Color Polyline */}
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke={r.color}
                      strokeWidth={isSelected ? '3.2' : '1.8'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={isSelected ? '1.0' : '0.65'}
                      strokeDasharray={isSelected ? 'none' : '3 2'}
                      filter="url(#routeGlow)"
                    />
                    {/* Waypoint nodes for selected route */}
                    {isSelected && r.waypoints.filter((_, idx) => idx % Math.max(1, Math.floor(r.waypoints.length / 10)) === 0).map((w, idx) => (
                      <circle
                        key={idx}
                        cx={w.x}
                        cy={w.y}
                        r="2.2"
                        fill={r.color}
                        stroke="#000000"
                        strokeWidth="0.8"
                      />
                    ))}
                  </g>
                );
              })}
            </svg>

            {/* Start Pin (Blue) */}
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col items-center"
              style={{ left: `${(startPt.x / 256) * 100}%`, top: `${(startPt.y / 256) * 100}%` }}
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white font-bold text-[9px] shadow-[0_0_10px_rgba(37,99,235,0.8)]">
                S
              </div>
              <div className="w-1 h-1.5 bg-blue-600 -mt-0.5 rounded-b-sm" />
            </div>

            {/* Destination Pin (Orange) */}
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col items-center"
              style={{ left: `${(destPt.x / 256) * 100}%`, top: `${(destPt.y / 256) * 100}%` }}
            >
              <div className="w-5 h-5 rounded-full bg-orange-600 border-2 border-white flex items-center justify-center text-white font-bold text-[9px] shadow-[0_0_10px_rgba(234,88,12,0.8)]">
                D
              </div>
              <div className="w-1 h-1.5 bg-orange-600 -mt-0.5 rounded-b-sm" />
            </div>

            {/* "No Safe Route Found" Alert Overlay when obstacles block path */}
            {currentRoute.isBlocked && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-none">
                <div className="p-4 bg-slate-900/95 border border-rose-500/80 rounded-2xl max-w-sm text-center shadow-2xl space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h4 className="text-white font-bold text-sm tracking-wide uppercase">No Safe Route Found</h4>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {currentRoute.explanation || 'Impassable obstacles or boulder field completely block traversal. Please choose clear terrain.'}
                  </p>
                  <p className="text-[10px] text-amber-400 font-mono">
                    Rover safety clearance ({safetyClearancePx}px) strictly enforced. No hazardous paths permitted.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Image & Rover Telemetry Status Strip */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 px-1 pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Image Space: {analysis?.imageWidth || 256} × {analysis?.imageHeight || 256} px</span>
            </span>
            <span>Safety Margin: {safetyClearancePx} px buffer</span>
            <span>Obstacles Mapped: {analysis?.segmentedHazards?.length || 0}</span>
          </div>
        </div>

        {/* Right Column: Recommended Strategy & Dynamic Comparison Cards */}
        <div className="lg:col-span-5 space-y-4">
          {/* Recommended Route Card */}
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs uppercase tracking-wider font-sans">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Recommended Strategy for Current Terrain</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono font-bold">
                AUTO-SELECTED
              </span>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Selected Strategy: <strong className="text-white">{routes[recommendedId]?.name}</strong>. {recommendationReason}
            </p>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-[11px] font-mono text-indigo-200">
                <span>{routes[recommendedId]?.totalLengthM} m</span>
                <span>•</span>
                <span>{routes[recommendedId]?.estimatedDurationMins} mins</span>
              </div>
              <button
                onClick={handleApplyRecommended}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Apply Recommended Route
              </button>
            </div>
          </div>

          {/* Four Route Strategies Interactive List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                Four Independent Path Candidates
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Click any route to inspect
              </span>
            </div>

            {Object.values(routes).map((r) => {
              const isSelected = activeStrategy === r.id;
              const isCollisionFree = !r.isBlocked && r.validationStatus === 'VALIDATED_COLLISION_FREE';

              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectStrategy(r.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-orange-500 shadow-xl ring-1 ring-orange-500/50'
                      : 'bg-black/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 shadow-sm"
                        style={{ backgroundColor: r.color }}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-xs">{r.name}</h4>
                          {isSelected && (
                            <span className="px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-mono font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {r.explanation}
                        </p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />}
                  </div>

                  {/* Metrics Bar */}
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-300 font-bold">
                        {r.isBlocked ? '--- m' : `${r.totalLengthM} m`}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-300">
                        {r.isBlocked ? '--- px' : `${r.totalLengthPx} px`}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-amber-300">
                        {r.isBlocked ? '---' : `${r.totalCost} Cost`}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">
                        {r.isBlocked ? '0' : `${r.waypointsCount || r.waypoints?.length || 0}`} Wpts
                      </span>
                    </div>

                    {/* Safety Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCollisionFree
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isCollisionFree ? '✓ 100% COLLISION-FREE' : '⚠ NO SAFE ROUTE'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Route Performance Profile */}
          <div className="bg-[#0B1020] border border-slate-800/80 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentRoute.name} - Performance Profile</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Rover Speed ~0.04 m/s
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-black/50 p-2.5 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-slate-500 block text-[9px]">TOTAL DISTANCE</span>
                <span className="text-white font-bold text-xs">
                  {currentRoute.isBlocked ? '0 m' : `${currentRoute.totalLengthM} m`}
                </span>
                <span className="text-[9px] text-slate-500 block">{currentRoute.totalLengthPx || 0} px</span>
              </div>
              <div className="bg-black/50 p-2.5 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-slate-500 block text-[9px]">TRAVEL TIME</span>
                <span className="text-cyan-400 font-bold text-xs">
                  {currentRoute.isBlocked ? '0 min' : `${currentRoute.estimatedDurationMins} min`}
                </span>
                <span className="text-[9px] text-slate-500 block">{(currentRoute.estimatedTravelTimeHours || 0)} hrs</span>
              </div>
              <div className="bg-black/50 p-2.5 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-slate-500 block text-[9px]">TRAVERSAL COST</span>
                <span className="text-orange-400 font-bold text-xs">
                  {currentRoute.isBlocked ? 'Infinity' : `${currentRoute.totalCost} Units`}
                </span>
                <span className="text-[9px] text-slate-500 block">Terrain friction</span>
              </div>
              <div className="bg-black/50 p-2.5 rounded-lg border border-white/5 space-y-0.5">
                <span className="text-slate-500 block text-[9px]">COLLISION VALIDATION</span>
                <span
                  className={`font-bold text-xs ${
                    !currentRoute.isBlocked ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {!currentRoute.isBlocked ? 'VALIDATED' : 'BLOCKED'}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  {!currentRoute.isBlocked ? 'Zero hazards crossed' : 'Obstacles block path'}
                </span>
              </div>
            </div>

            {/* Terrain Breakdown Bar */}
            {currentRoute.terrainBreakdown && !currentRoute.isBlocked && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Terrain Composition:</span>
                  <span>
                    Soil: {currentRoute.terrainBreakdown.soilPct}% • Bedrock: {currentRoute.terrainBreakdown.bedrockPct}% • Sand: {currentRoute.terrainBreakdown.sandPct}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-black/60">
                  <div style={{ width: `${currentRoute.terrainBreakdown.soilPct}%` }} className="bg-amber-600" title="Soil / Regolith" />
                  <div style={{ width: `${currentRoute.terrainBreakdown.bedrockPct}%` }} className="bg-slate-400" title="Bedrock Outcrop" />
                  <div style={{ width: `${currentRoute.terrainBreakdown.sandPct}%` }} className="bg-yellow-500" title="Sand Ripples" />
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveWorkspace('marsnav-v4')}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-lg transition cursor-pointer"
            >
              Use This Route in MARSWALK OPS Simulator &rarr;
            </button>
          </div>

          {/* Safety & Cost Tuning Controls */}
          <div className="bg-[#0B1020] border border-slate-800/80 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
                <span>Rover Safety & Clearance Tuning</span>
              </span>
              <span className="text-[10px] font-mono text-orange-400">Live Recalculation</span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Rover Safety Clearance Margin</span>
                  <span className="text-cyan-400 font-bold">{safetyClearancePx} px</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="24"
                  step="1"
                  value={safetyClearancePx}
                  onChange={(e) => setSafetyClearancePx(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300">Uncertainty Penalty Weight</span>
                  <span className="text-orange-400 font-bold">{safeUncertaintyPenalty}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={safeUncertaintyPenalty}
                  onChange={(e) => updateSharedSession({ uncertaintyPenalty: Number(e.target.value) })}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
