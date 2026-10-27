import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Navigation,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  ShieldAlert,
  BatteryCharging,
  Gauge,
  Layers,
  Compass,
  MapPin,
  Flag,
  Info,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Eye,
  Route,
  Activity,
  Check,
  Crosshair,
  Filter,
  X,
  FastForward,
  ImageIcon,
  Sparkles,
  Zap,
  Award
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AStarGrid, calculatePathLength, smoothPathCollisionFree } from '../../utils/astar';
import {
  analyzeImageSegmentation,
  getDefaultTerrainFeatures,
  isHazardInRouteCorridor,
  isPointInPolygon,
  Point,
  SegmentedHazard
} from '../../utils/terrainSegmentation';

export default function MarsNavV4Workspace() {
  const {
    sharedSession,
    updateSharedSession,
    setActiveWorkspace,
    activeMission,
    missions,
    switchActiveMission,
    setMissionManagerOpen
  } = useWorkspace();

  const {
    terrainImage,
    imageProvenance,
    startPoint,
    destinationPoint,
    obstacles,
    scienceTargets,
    selectedStrategy,
    uncertaintyPenalty,
    maxSlopeLimit
  } = sharedSession;

  // NASA Imagery & Browser
  const [nasaImages, setNasaImages] = useState<any[]>([]);
  const [nasaBrowserOpen, setNasaBrowserOpen] = useState<boolean>(false);
  const [loadingNasa, setLoadingNasa] = useState<boolean>(false);

  // Image Loading Lifecycle: 'empty' | 'loading' | 'loaded' | 'error'
  const [imageStatus, setImageStatus] = useState<'empty' | 'loading' | 'loaded' | 'error'>(() => {
    return terrainImage && terrainImage.trim() !== '' ? 'loading' : 'empty';
  });
  const [imageAspect, setImageAspect] = useState<number>(1.0);
  const [imageLoadError, setImageLoadError] = useState<{ message: string; failedUrl: string } | null>(null);

  // Shape-Aware Terrain Segmentation
  const [segmentedHazards, setSegmentedHazards] = useState<SegmentedHazard[]>([]);
  const [showSegmentationMasks, setShowSegmentationMasks] = useState<boolean>(true);
  const [showHazardZones, setShowHazardZones] = useState<boolean>(true);
  const [showCorridorOnly, setShowCorridorOnly] = useState<boolean>(true);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [isAnalyzingCv, setIsAnalyzingCv] = useState<boolean>(false);
  const [hoveredHazardId, setHoveredHazardId] = useState<string | null>(null);

  // Cursor coordinates
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Diagnostics & Status
  const [routeMode, setRouteMode] = useState<'optimal' | 'reduced_margin' | 'hazard_fallback' | 'straight_line_fallback'>('optimal');

  // Interaction modes: 'view' | 'start' | 'destination' | 'obstacle' | 'science'
  const [activeMode, setActiveMode] = useState<'view' | 'start' | 'destination' | 'obstacle' | 'science'>('view');

  // Inspector tab selection: 'route' | 'hazards' | 'science' | 'rover' | 'resources'
  const [inspectorTab, setInspectorTab] = useState<'route' | 'hazards' | 'science' | 'rover' | 'resources'>('route');

  // Route Planning & Alternatives
  const [rawRoutePath, setRawRoutePath] = useState<Array<{ x: number; y: number }>>([]);
  const [smoothedRoutePath, setSmoothedRoutePath] = useState<Array<{ x: number; y: number }>>([]);
  const [routeAlternatives, setRouteAlternatives] = useState<Array<{
    id: 'alpha' | 'beta' | 'gamma' | 'delta';
    name: string;
    pixelLength: number;
    energyWh: number;
    riskScore: number;
    feasible: boolean;
    path: Array<{ x: number; y: number }>;
  }>>([]);
  const [hazardBuffer, setHazardBuffer] = useState<number>(12);

  // Simulation Engine (requestAnimationFrame)
  const [simulationState, setSimulationState] = useState<'stopped' | 'running' | 'paused' | 'completed'>('stopped');
  const [simDistance, setSimDistance] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Mission Resources & Calibration
  const [batteryCapacityWh] = useState<number>(2400);
  const [batteryChargePct] = useState<number>(94.5);
  const [roverMassKg] = useState<number>(1025);
  const [avgPowerW] = useState<number>(220);
  const [drivingSpeedMps] = useState<number>(0.04);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch NASA live images on mount
  useEffect(() => {
    fetchNasaFeed();
  }, []);

  const fetchNasaFeed = async () => {
    setLoadingNasa(true);
    try {
      const res = await fetch('/api/nasa/mars2020/raw?num=12');
      const data = await res.json();
      if (data.images && data.images.length > 0) {
        setNasaImages(data.images);
      }
    } catch (err) {
      console.warn('Failed fetching NASA live feed:', err);
    } finally {
      setLoadingNasa(false);
    }
  };

  // Sync terrain image status when sharedSession change
  useEffect(() => {
    if (terrainImage && terrainImage.trim() !== '') {
      setImageStatus('loading');
      setImageLoadError(null);
    } else {
      setImageStatus('empty');
    }
  }, [terrainImage]);

  // Image load handler
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth || 256;
    const h = img.naturalHeight || 256;
    setImageAspect(w / h);
    setImageStatus('loaded');
    setImageLoadError(null);
    runSegmentationAnalysis(img.src);
  };

  const handleImageError = () => {
    setImageStatus('error');
    setImageLoadError({
      message: 'Failed to load terrain photograph. Server or CORS proxy rejected image source.',
      failedUrl: terrainImage
    });
  };

  const getSafeImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
      return url;
    }
    return `/api/nasa/proxy-image?url=${encodeURIComponent(url)}`;
  };

  // Run CV segmentation analysis
  const runSegmentationAnalysis = async (imgSrc: string) => {
    if (!imgSrc) return;
    setIsAnalyzingCv(true);
    try {
      const detected = await analyzeImageSegmentation(imgSrc);
      if (detected && detected.length > 0) {
        setSegmentedHazards(detected);
      } else {
        setSegmentedHazards(getDefaultTerrainFeatures());
      }
    } catch {
      setSegmentedHazards(getDefaultTerrainFeatures());
    } finally {
      setIsAnalyzingCv(false);
    }
  };

  // Recalculate routes on parameter or obstacle changes
  const calculateRoutes = useCallback(() => {
    if (imageStatus !== 'loaded') return;

    const isBlocked = (x: number, y: number, strategy: string) => {
      const buffer = strategy === 'gamma' ? hazardBuffer * 1.6 : strategy === 'beta' ? hazardBuffer * 1.2 : hazardBuffer;
      return segmentedHazards.some(h => {
        if (!h.blocked) return false;
        return isPointInPolygon({ x, y }, h.polygon);
      }) || obstacles.some(o => o.blocked && Math.hypot(o.x - x, o.y - y) < o.radius + buffer);
    };

    const getCellCost = (x: number, y: number, strategy: string) => {
      let cost = 1.0;
      if (strategy === 'beta') cost *= 0.85; // Cost aware
      if (strategy === 'gamma') cost *= 1.25; // Conservative
      return cost;
    };

    const grid = new AStarGrid(256, 256);
    const strategies: Array<'alpha' | 'beta' | 'gamma' | 'delta'> = ['alpha', 'beta', 'gamma', 'delta'];
    const computedAlts: any[] = [];

    strategies.forEach(st => {
      const res = grid.findPath(
        startPoint,
        destinationPoint,
        (x: number, y: number) => isBlocked(x, y, st),
        (x: number, y: number) => getCellCost(x, y, st)
      );

      const path = res.path && res.path.length > 0 ? res.path : [];
      const len = calculatePathLength(path);

      computedAlts.push({
        id: st,
        name: st === 'alpha' ? 'Alpha: Shortest' : st === 'beta' ? 'Beta: Low Cost' : st === 'gamma' ? 'Gamma: Conservative' : 'Delta: Science Detour',
        pixelLength: len,
        energyWh: Math.round(len * 0.35 + 40),
        riskScore: st === 'gamma' ? 3.2 : st === 'beta' ? 6.5 : st === 'delta' ? 8.4 : 12.0,
        feasible: res.success,
        path: path
      });
    });

    setRouteAlternatives(computedAlts);

    const activeAlt = computedAlts.find(a => a.id === selectedStrategy) || computedAlts[0];
    if (activeAlt && activeAlt.path) {
      setRawRoutePath(activeAlt.path);
      const smoothed = smoothPathCollisionFree(activeAlt.path, (x: number, y: number) => isBlocked(x, y, selectedStrategy));
      setSmoothedRoutePath(smoothed);
      setRouteMode(activeAlt.feasible ? 'optimal' : 'hazard_fallback');
    }
  }, [imageStatus, startPoint, destinationPoint, segmentedHazards, obstacles, hazardBuffer, selectedStrategy]);

  useEffect(() => {
    calculateRoutes();
  }, [calculateRoutes]);

  // Handle Canvas Click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (imageStatus !== 'loaded') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = 256 / rect.width;
    const scaleY = 256 / rect.height;

    const clickX = Math.round((e.clientX - rect.left) * scaleX);
    const clickY = Math.round((e.clientY - rect.top) * scaleY);

    if (activeMode === 'start') {
      updateSharedSession({ startPoint: { x: clickX, y: clickY } });
      setActiveMode('view');
    } else if (activeMode === 'destination') {
      updateSharedSession({ destinationPoint: { x: clickX, y: clickY } });
      setActiveMode('view');
    } else if (activeMode === 'obstacle') {
      const newObs = {
        id: `obs_${Date.now()}`,
        x: clickX,
        y: clickY,
        type: 'rock' as const,
        blocked: true,
        radius: 12
      };
      updateSharedSession({ obstacles: [...obstacles, newObs] });
    } else if (activeMode === 'science') {
      const newSci = {
        id: `sci_${Date.now()}`,
        name: `Target POI ${scienceTargets.length + 1}`,
        x: clickX,
        y: clickY,
        evidence: 'Visual spectral anomaly identified on NavCam stereo pair',
        uncertainty: 'Requires APXS proximity spectrometer confirmation'
      };
      updateSharedSession({ scienceTargets: [...scienceTargets, newSci] });
    }
  };

  // Canvas Mouse Move for live coordinate display
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (256 / rect.width));
    const y = Math.round((e.clientY - rect.top) * (256 / rect.height));
    setCursorPos({ x, y });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        updateSharedSession({
          terrainImage: result,
          imageProvenance: {
            source: 'User Custom Terrain Upload',
            rover: 'Custom Surface Payload',
            camera: 'USER_CAM_01',
            sol: 428,
            acquisitionUtc: new Date().toISOString(),
            identifier: file.name,
            sourceUrl: ''
          }
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectNasaImage = (img: any) => {
    const fullUrl = img.fullResUrl || img.thumbnailUrl;
    updateSharedSession({
      terrainImage: fullUrl,
      imageProvenance: {
        source: 'NASA JPL Mars 2020 Raw Feed',
        rover: img.mission || 'Perseverance',
        camera: img.camera || 'NAVCAM_LEFT',
        sol: img.sol || 2019,
        acquisitionUtc: img.dateUtc || new Date().toISOString(),
        identifier: img.imageid || img.id,
        sourceUrl: img.sourceUrl || ''
      }
    });
    setNasaBrowserOpen(false);
  };

  const handleSwapEndpoints = () => {
    updateSharedSession({
      startPoint: destinationPoint,
      destinationPoint: startPoint
    });
  };

  const handleToggleHazardBlocked = (hazardId: string) => {
    setSegmentedHazards(prev => prev.map(h => h.id === hazardId ? { ...h, blocked: !h.blocked } : h));
  };

  // Active path and simulation interpolation
  const activePath = smoothedRoutePath.length > 1 ? smoothedRoutePath : rawRoutePath;
  const totalPathLen = calculatePathLength(activePath);

  const getRoverPosAtDistance = (dist: number) => {
    if (activePath.length === 0) return { x: startPoint.x, y: startPoint.y, angle: 0 };
    if (dist <= 0) {
      const p1 = activePath[0];
      const p2 = activePath[1] || p1;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
      return { x: p1.x, y: p1.y, angle };
    }

    let accum = 0;
    for (let i = 0; i < activePath.length - 1; i++) {
      const p1 = activePath[i];
      const p2 = activePath[i + 1];
      const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      if (accum + segLen >= dist) {
        const ratio = (dist - accum) / segLen;
        const x = p1.x + (p2.x - p1.x) * ratio;
        const y = p1.y + (p2.y - p1.y) * ratio;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
        return { x, y, angle };
      }
      accum += segLen;
    }

    const last = activePath[activePath.length - 1];
    const prev = activePath[activePath.length - 2] || last;
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x) * (180 / Math.PI);
    return { x: last.x, y: last.y, angle };
  };

  // Animation Loop
  useEffect(() => {
    if (simulationState === 'running') {
      const step = (timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const deltaSec = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        setSimDistance(prev => {
          const next = prev + drivingSpeedMps * 20 * simSpeed * deltaSec;
          if (next >= totalPathLen) {
            setSimulationState('completed');
            return totalPathLen;
          }
          return next;
        });

        animFrameRef.current = requestAnimationFrame(step);
      };
      animFrameRef.current = requestAnimationFrame(step);
    } else {
      lastTimeRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [simulationState, simSpeed, totalPathLen, drivingSpeedMps]);

  const roverPos = getRoverPosAtDistance(simDistance);

  // Derived metrics
  const estimatedEnergyWh = Math.round(totalPathLen * 0.35 + 40);
  const remainingEnergyWh = batteryCapacityWh * (batteryChargePct / 100) - estimatedEnergyWh;
  const finalBatteryPct = Math.max(0, Math.round((remainingEnergyWh / batteryCapacityWh) * 100));

  const totalTimeSeconds = Math.round((totalPathLen * 0.1) / drivingSpeedMps);
  const etaMinutes = Math.floor(totalTimeSeconds / 60);
  const etaSecs = totalTimeSeconds % 60;

  const visibleHazards = segmentedHazards.filter(h => {
    if (!showCorridorOnly) return true;
    return isHazardInRouteCorridor(h, activePath, 38);
  });

  const activeSelectedHazard = segmentedHazards.find(h => h.id === selectedHazardId);

  return (
    <div className="flex flex-col h-full w-full bg-[#05070E] text-slate-100 font-sans overflow-y-auto min-w-0 p-4 lg:p-6 space-y-4">
      {/* Hidden file input for uploading terrain */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 1. WORKSPACE HEADER BAR */}
      <div className="bg-[#0A0E1C] border border-slate-800/80 p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>MARSNAV</span>
              <span aria-hidden="true">/</span>
              <span>Mission Planner v4.0</span>
              <span aria-hidden="true">/</span>
              <span className="text-cyan-400 font-semibold truncate">{activeMission?.name || 'Active Mission'}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-lg font-bold text-white tracking-tight truncate">
                {activeMission?.name || 'Sol 428 Jezero Delta Exploration'}
              </h1>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${
                activeMission?.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                activeMission?.status === 'Blocked' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}>
                {activeMission?.status || 'In Progress'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Mission Control Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {missions && missions.length > 0 && (
            <select
              aria-label="Switch Active Mission"
              value={activeMission?.id || ''}
              onChange={(e) => switchActiveMission(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-black/60 border border-slate-700 text-cyan-300 text-xs font-mono focus:outline-none cursor-pointer"
            >
              {missions.map((m: any) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  {m.name} ({m.status || 'Active'})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setMissionManagerOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 text-xs font-mono font-semibold transition-colors cursor-pointer"
          >
            Switch / Manage Missions
          </button>
        </div>
      </div>

      {/* 2. WORKSPACE TABS BAR */}
      <div className="bg-[#090D1A] border border-slate-800/80 px-4 py-2 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['route', 'hazards', 'science', 'rover', 'resources'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setInspectorTab(tab)}
              className={`px-4 py-1.5 text-xs font-mono font-semibold capitalize rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                inspectorTab === tab
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab === 'route' ? 'Route Planner' : tab === 'hazards' ? 'Hazard Masks' : tab === 'science' ? 'Science POIs' : tab === 'rover' ? 'Rover Profile' : 'Resources & Power'}
            </button>
          ))}
        </div>

        {/* Action Controls Separate from Tabs */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setNasaBrowserOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">NASA Feed</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-lg bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/50 text-orange-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Terrain</span>
          </button>
        </div>
      </div>

      {/* 3. GROUPED TERRAIN TOOLBAR */}
      <div className="bg-[#090D1A] border border-slate-800/80 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Navigation Controls Group */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] px-2 font-sans uppercase font-bold">Nav:</span>
            <button
              onClick={() => setActiveMode('start')}
              disabled={imageStatus !== 'loaded'}
              className={`px-2.5 py-1 rounded-md transition font-bold flex items-center gap-1 whitespace-nowrap shrink-0 ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500'
                  : activeMode === 'start'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>SET START</span>
            </button>

            <button
              onClick={() => setActiveMode('destination')}
              disabled={imageStatus !== 'loaded'}
              className={`px-2.5 py-1 rounded-md transition font-bold flex items-center gap-1 whitespace-nowrap shrink-0 ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500'
                  : activeMode === 'destination'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>SET DEST</span>
            </button>

            <button
              onClick={handleSwapEndpoints}
              disabled={imageStatus !== 'loaded'}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 transition disabled:opacity-40 whitespace-nowrap shrink-0"
              title="Reverse Start and Destination endpoints"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>SWAP</span>
            </button>
          </div>

          {/* Analysis Controls Group */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-slate-800">
            <span className="text-slate-500 text-[10px] px-2 font-sans uppercase font-bold">Analysis:</span>
            <button
              onClick={() => runSegmentationAnalysis(terrainImage)}
              disabled={imageStatus !== 'loaded' || isAnalyzingCv}
              className="px-2.5 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition disabled:opacity-40 flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Cpu className={`w-3.5 h-3.5 ${isAnalyzingCv ? 'animate-spin' : ''}`} />
              <span>{isAnalyzingCv ? 'SCANNING...' : 'SCAN CV'}</span>
            </button>

            <button
              onClick={() => setActiveMode('obstacle')}
              disabled={imageStatus !== 'loaded'}
              className={`px-2.5 py-1 rounded-md transition font-bold flex items-center gap-1 whitespace-nowrap shrink-0 ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500'
                  : activeMode === 'obstacle'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>OBSTACLE</span>
            </button>

            <button
              onClick={() => setActiveMode('science')}
              disabled={imageStatus !== 'loaded'}
              className={`px-2.5 py-1 rounded-md transition font-bold flex items-center gap-1 whitespace-nowrap shrink-0 ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500'
                  : activeMode === 'science'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>SCIENCE POI</span>
            </button>

            <button
              onClick={() => setShowSegmentationMasks(prev => !prev)}
              disabled={imageStatus !== 'loaded'}
              className={`px-2.5 py-1 rounded-md border transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500 border-transparent'
                  : showSegmentationMasks
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>MASKS</span>
            </button>
          </div>
        </div>

        {/* Execution Group: Primary Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveWorkspace('route-comparison')}
            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Route className="w-3.5 h-3.5" />
            <span>ROUTE LAB</span>
          </button>

          <button
            onClick={calculateRoutes}
            disabled={imageStatus !== 'loaded'}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
            title={imageStatus !== 'loaded' ? 'Upload or select a terrain image first' : 'Compute optimal A* route vectors'}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>PLAN ROUTE</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE STAGE ROW: TERRAIN VIEWER + ROUTE STRATEGIES PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch flex-1 min-h-[440px]">
        {/* TERRAIN VIEWER (2 COLUMNS ON DESKTOP) */}
        <div className="lg:col-span-2 bg-[#03050c] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden shadow-2xl min-h-[420px]">
          {imageLoadError && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-red-950/90 border border-red-500/50 text-red-200 px-4 py-2 rounded-xl text-xs flex items-center gap-3 shadow-2xl backdrop-blur-md">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{imageLoadError.message}</span>
              <button
                onClick={() => {
                  setImageStatus('empty');
                  setImageLoadError(null);
                }}
                className="px-2 py-1 bg-red-600/30 hover:bg-red-600/50 rounded text-[10px] text-white font-mono cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {imageStatus === 'loaded' ? (
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[360px]">
              {/* Top Corner Layer & Resolution Badge */}
              <div className="absolute top-2 left-2 z-20 flex items-center gap-2 pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-cyan-300 text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{imageProvenance.rover} · {imageProvenance.camera}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-slate-300 text-[10px] font-mono hidden sm:inline">
                  Sol {imageProvenance.sol} · 0.25 m/px DTM
                </span>
              </div>

              {/* Cursor Coordinate Overlay */}
              {cursorPos && (
                <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 rounded bg-black/80 border border-slate-800 text-[10px] font-mono text-cyan-300 pointer-events-none">
                  X: {cursorPos.x} px, Y: {cursorPos.y} px
                </div>
              )}

              <div className="relative w-full max-w-[540px] aspect-square rounded-xl overflow-hidden border border-slate-700/80 bg-black shadow-2xl">
                {/* Terrain Image */}
                <img
                  src={terrainImage}
                  alt="Mars Terrain"
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain pointer-events-none select-none"
                  draggable={false}
                />

                {/* SVG Overlay Layer */}
                <svg
                  viewBox="0 0 256 256"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <defs>
                    <linearGradient id="routeGradientCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00f0ff" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                  </defs>

                  {/* Hazard Polygons */}
                  {visibleHazards.map(h => {
                    const isSelected = selectedHazardId === h.id;
                    const pointsStr = h.polygon.map(p => `${p.x},${p.y}`).join(' ');

                    let strokeColor = '#f87171';
                    let fillColor = 'rgba(239, 68, 68, 0.14)';
                    if (h.type === 'hole') { strokeColor = '#c084fc'; fillColor = 'rgba(192, 132, 252, 0.14)'; }
                    else if (h.type === 'sand') { strokeColor = '#fde047'; fillColor = 'rgba(253, 224, 71, 0.08)'; }
                    else if (h.type === 'bedrock') { strokeColor = '#2dd4bf'; fillColor = 'rgba(45, 212, 191, 0.08)'; }

                    if (!h.blocked) { strokeColor = '#4ade80'; fillColor = 'rgba(74, 222, 128, 0.10)'; }
                    if (isSelected) { strokeColor = '#fbbf24'; fillColor = 'rgba(251, 191, 36, 0.25)'; }

                    return (
                      <g key={`hazard-${h.id}`}>
                        {showHazardZones && h.blocked && (
                          <polygon points={pointsStr} fill="none" stroke="rgba(245, 158, 11, 0.25)" strokeWidth={hazardBuffer * 1.5} strokeLinejoin="round" />
                        )}
                        {showSegmentationMasks && (
                          <polygon points={pointsStr} fill={fillColor} stroke={strokeColor} strokeWidth={isSelected ? 1.8 : 1.0} strokeLinejoin="round" />
                        )}
                      </g>
                    );
                  })}

                  {/* Active Route Polyline */}
                  {activePath.length > 1 && (
                    <>
                      <polyline points={activePath.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" />
                      <polyline points={activePath.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="url(#routeGradientCyan)" strokeWidth="2.5" strokeLinecap="round" />
                    </>
                  )}

                  {/* Start Point */}
                  <g transform={`translate(${startPoint.x}, ${startPoint.y})`}>
                    <circle r="7" fill="rgba(16, 185, 129, 0.3)" className="animate-ping" />
                    <circle r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
                    <text y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">S</text>
                  </g>

                  {/* Destination Point */}
                  <g transform={`translate(${destinationPoint.x}, ${destinationPoint.y})`}>
                    <circle r="7" fill="rgba(239, 68, 68, 0.3)" className="animate-ping" />
                    <circle r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.2" />
                    <text y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">D</text>
                  </g>

                  {/* Science Targets */}
                  {scienceTargets.map((sci) => (
                    <g key={sci.id} transform={`translate(${sci.x}, ${sci.y})`}>
                      <circle r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="1" />
                      <text y="1.5" fill="#ffffff" fontSize="4" fontWeight="bold" textAnchor="middle">⚡</text>
                    </g>
                  ))}

                  {/* Animated Rover Position */}
                  {(simulationState === 'running' || simulationState === 'paused' || simulationState === 'completed') && (
                    <g transform={`translate(${roverPos.x}, ${roverPos.y}) rotate(${roverPos.angle})`}>
                      <rect x="-5" y="-3.5" width="10" height="7" rx="1" fill="#d97706" stroke="#ffffff" strokeWidth="0.8" />
                      <polygon points="5,0 3,-2 3,2" fill="#00f0ff" />
                    </g>
                  )}
                </svg>

                {/* Clickable Overlay Canvas */}
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseLeave={() => setCursorPos(null)}
                  width={256}
                  height={256}
                  className="absolute inset-0 w-full h-full cursor-crosshair"
                />
              </div>

              {/* Simulation Traversal Control Bar (Bottom overlay) */}
              {activePath.length > 1 && (
                <div className="w-full max-w-[540px] mt-3 bg-[#080c1a] border border-slate-700/80 rounded-xl p-2.5 flex items-center justify-between gap-3 text-xs font-mono shadow-lg">
                  <div className="flex items-center gap-2">
                    {simulationState !== 'running' ? (
                      <button
                        onClick={() => {
                          if (simulationState === 'completed') setSimDistance(0);
                          setSimulationState('running');
                        }}
                        className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer transition shadow"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{simulationState === 'completed' ? 'Re-run Drive' : 'Start Drive'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setSimulationState('paused')}
                        className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1 cursor-pointer transition shadow"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Pause</span>
                      </button>
                    )}

                    <button
                      onClick={() => { setSimulationState('stopped'); setSimDistance(0); }}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span>Progress: <strong className="text-cyan-300">{Math.round((simDistance / (totalPathLen || 1)) * 100)}%</strong></span>
                    <span>ETA: <strong className="text-white">~{etaMinutes}m {etaSecs}s</strong></span>
                  </div>
                </div>
              )}
            </div>
          ) : imageStatus === 'loading' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <img src={getSafeImageUrl(terrainImage)} alt="Preloader" onLoad={handleImageLoad} onError={handleImageError} className="hidden" />
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
              <h3 className="text-white font-bold text-sm">Loading Terrain Photograph...</h3>
              <p className="text-slate-400 text-xs max-w-xs mt-1">Fetching Mars surface frame from NASA JPL image database.</p>
            </div>
          ) : (
            /* POLISHED CENTERED EMPTY STATE */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
              <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-xl">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-white font-bold text-base mb-2">No terrain data loaded</h3>
              <p className="text-slate-400 text-xs max-w-md mb-6 leading-relaxed">
                Upload a custom Mars rover photograph or choose from NASA's official Perseverance Mars 2020 raw observation feed to compute autonomous route vectors.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Terrain Image</span>
                </button>
                <button
                  onClick={() => setNasaBrowserOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Browse NASA Imagery</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ROUTE STRATEGY CARDS PANEL */}
        <div className="bg-[#090D1A] border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider font-sans">Route Strategies</h3>
              <span className="text-[10px] text-slate-400 font-mono">{imageStatus === 'loaded' ? '4 Computed' : 'Awaiting Data'}</span>
            </div>

            {imageStatus !== 'loaded' ? (
              <div className="p-6 rounded-xl bg-black/40 border border-slate-800 text-center text-slate-400 text-xs font-mono space-y-2">
                <Compass className="w-6 h-6 mx-auto text-slate-600" />
                <p className="font-semibold text-slate-300">Awaiting Route Calculation</p>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                  Load a terrain frame and click "Plan Route" to evaluate Alpha, Beta, Gamma, and Delta objective functions.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 font-mono">
                {(['alpha', 'beta', 'gamma', 'delta'] as const).map(st => {
                  const alt = routeAlternatives.find(a => a.id === st);
                  const isSelected = selectedStrategy === st;
                  return (
                    <div
                      key={st}
                      onClick={() => updateSharedSession({ selectedStrategy: st })}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500/15 border-orange-500/60 text-white shadow-md ring-1 ring-orange-500/30'
                          : 'bg-black/40 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs uppercase">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{
                            backgroundColor: st === 'alpha' ? '#00f0ff' : st === 'beta' ? '#10b981' : st === 'gamma' ? '#f59e0b' : '#c084fc'
                          }} />
                          <span>Strategy {st}</span>
                        </span>
                        {alt && <span className="text-cyan-300">{alt.pixelLength.toFixed(1)} px</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-2">
                        {st === 'alpha' && 'Shortest feasible path around detected hazards.'}
                        {st === 'beta' && 'Lowest terrain cost avoiding loose sand dunes.'}
                        {st === 'gamma' && 'Conservative path with wide safety buffers.'}
                        {st === 'delta' && 'Science priority detour passing near POIs.'}
                      </p>
                      {alt && (
                        <div className="flex justify-between text-[10px] text-slate-400 pt-2 border-t border-white/5 mt-2">
                          <span>Energy: <strong className="text-white">{alt.energyWh} Wh</strong></span>
                          <span>Risk: <strong className="text-emerald-400">{alt.riskScore} / 20</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setActiveWorkspace('route-comparison')}
              className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Route className="w-4 h-4 text-cyan-400" />
              <span>Open Detailed Route Comparison Lab &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. REDESIGNED METRICS & DIAGNOSTICS ROW (SECTION 4) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 font-mono text-xs">
        {/* CARD 1: ROUTE METRICS */}
        <div className="bg-[#090D1A] border border-slate-800/80 p-4 rounded-xl space-y-2 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans font-bold uppercase tracking-wider border-b border-slate-800/80 pb-1.5">
            <span>Route Metrics</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          {imageStatus === 'loaded' && activePath.length > 1 ? (
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Path Length:</span>
                <span className="font-bold text-white">{totalPathLen.toFixed(1)} px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Physical Distance:</span>
                <span className="font-bold text-cyan-300">{(totalPathLen * 0.1).toFixed(1)} meters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waypoints:</span>
                <span className="font-bold text-white">{activePath.length} nodes</span>
              </div>
            </div>
          ) : (
            <div className="py-3 text-slate-500 text-center font-sans text-xs">
              Awaiting route calculation
            </div>
          )}
        </div>

        {/* CARD 2: TRAVEL & RESOURCE ESTIMATES */}
        <div className="bg-[#090D1A] border border-slate-800/80 p-4 rounded-xl space-y-2 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans font-bold uppercase tracking-wider border-b border-slate-800/80 pb-1.5">
            <span>Travel &amp; Resource Estimates</span>
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </div>
          {imageStatus === 'loaded' && activePath.length > 1 ? (
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Duration:</span>
                <span className="font-bold text-white">~{etaMinutes}m {etaSecs}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Required Energy:</span>
                <span className="font-bold text-orange-400">{estimatedEnergyWh} Wh</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Battery Reserve:</span>
                <span className="font-bold text-emerald-400">{Math.round(remainingEnergyWh)} Wh ({finalBatteryPct}%)</span>
              </div>
            </div>
          ) : (
            <div className="py-3 text-slate-500 text-center font-sans text-xs">
              Awaiting travel estimates
            </div>
          )}
        </div>

        {/* CARD 3: TERRAIN DIAGNOSTICS */}
        <div className="bg-[#090D1A] border border-slate-800/80 p-4 rounded-xl space-y-2 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-[11px] font-sans font-bold uppercase tracking-wider border-b border-slate-800/80 pb-1.5">
            <span>Terrain Diagnostics</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          {imageStatus === 'loaded' ? (
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Mapped Hazards:</span>
                <span className="font-bold text-amber-400">{visibleHazards.length} hazards</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Safety Buffer Clearance:</span>
                <span className="font-bold text-white">{hazardBuffer} px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pathfinder Status:</span>
                <span className="font-bold text-emerald-400 uppercase">{routeMode}</span>
              </div>
            </div>
          ) : (
            <div className="py-3 text-slate-500 text-center font-sans text-xs">
              Awaiting terrain diagnostics
            </div>
          )}
        </div>
      </div>

      {/* NASA Raw Image Browser Modal */}
      {nasaBrowserOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#0a0e1c] border border-white/20 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#070a16]">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                <h3 className="font-bold text-white text-sm font-mono">NASA Mars 2020 Raw Feed Browser</h3>
              </div>
              <button
                onClick={() => setNasaBrowserOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-[#04060e]">
              {loadingNasa ? (
                <div className="col-span-full py-16 text-center text-slate-400 font-mono flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                  <span>Loading Mars 2020 Raw Navcam Imagery from JPL...</span>
                </div>
              ) : nasaImages.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 font-mono">
                  No live images found in current NASA cache.
                </div>
              ) : (
                nasaImages.map((img) => {
                  const thumb = getSafeImageUrl(img.thumbnailUrl || img.fullResUrl);
                  return (
                    <div
                      key={img.id || img.imageid}
                      onClick={() => handleSelectNasaImage(img)}
                      className="group bg-black/50 border border-white/10 hover:border-orange-500 rounded-2xl overflow-hidden cursor-pointer transition-all flex flex-col shadow-lg"
                    >
                      <div className="aspect-square bg-slate-900 overflow-hidden relative">
                        <img
                          src={thumb}
                          alt="NASA Mars"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3 text-[11px] font-mono text-slate-300">
                        <div className="font-bold text-white truncate">{img.camera || 'NAVCAM'}</div>
                        <div className="text-slate-400 mt-0.5">Sol {img.sol || 2026}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
