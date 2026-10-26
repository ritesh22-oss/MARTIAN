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
  ImageIcon
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AStarGrid, calculatePathLength, smoothPathCollisionFree, generateStraightLinePath } from '../../utils/astar';
import {
  analyzeImageSegmentation,
  getDefaultTerrainFeatures,
  isPointInPolygon,
  distanceToPolygon,
  isHazardInRouteCorridor,
  createIrregularHazardPolygon,
  SegmentedHazard
} from '../../utils/terrainSegmentation';

export default function MarsNavV4Workspace() {
  const { sharedSession, updateSharedSession, setActiveWorkspace } = useWorkspace();
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
  const [imageNaturalWidth, setImageNaturalWidth] = useState<number>(256);
  const [imageNaturalHeight, setImageNaturalHeight] = useState<number>(256);
  const [imageLoadError, setImageLoadError] = useState<{
    message: string;
    failedUrl: string;
  } | null>(null);

  // Shape-Aware Terrain Segmentation
  const [segmentedHazards, setSegmentedHazards] = useState<SegmentedHazard[]>([]);
  const [showSegmentationMasks, setShowSegmentationMasks] = useState<boolean>(true);
  const [showHazardZones, setShowHazardZones] = useState<boolean>(true);
  const [showCorridorOnly, setShowCorridorOnly] = useState<boolean>(true);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [isAnalyzingCv, setIsAnalyzingCv] = useState<boolean>(false);
  const [hoveredHazardId, setHoveredHazardId] = useState<string | null>(null);

  // Diagnostics & Status
  const [planningDiagnostics, setPlanningDiagnostics] = useState<any>(null);
  const [routeStatusLabel, setRouteStatusLabel] = useState<string>('OPTIMAL ROUTE FOUND');
  const [routeMode, setRouteMode] = useState<'optimal' | 'reduced_margin' | 'hazard_fallback' | 'straight_line_fallback'>('optimal');
  const [endpointAdvisory, setEndpointAdvisory] = useState<{
    type: 'start' | 'goal';
    title: string;
    description: string;
    nearestCell: { x: number; y: number };
  } | null>(null);
  const [showDiagnosticsPanel, setShowDiagnosticsPanel] = useState<boolean>(false);

  // Interaction modes: 'view' | 'start' | 'destination' | 'obstacle' | 'science'
  const [activeMode, setActiveMode] = useState<'view' | 'start' | 'destination' | 'obstacle' | 'science'>('view');

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
  const [batteryCapacityWh, setBatteryCapacityWh] = useState<number>(2400);
  const [batteryChargePct, setBatteryChargePct] = useState<number>(94.5);
  const [roverMassKg, setRoverMassKg] = useState<number>(1025);
  const [avgPowerW, setAvgPowerW] = useState<number>(220);
  const [drivingSpeedMps, setDrivingSpeedMps] = useState<number>(0.04);
  const [inspectorTab, setInspectorTab] = useState<'route' | 'hazards' | 'science' | 'rover' | 'resources'>('route');

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

  const getSafeImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('/') || url.startsWith('blob:')) {
      return url;
    }
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageLoadError(null);
        setImageStatus('loading');
        updateSharedSession({
          terrainImage: result,
          imageProvenance: {
            source: 'Local File Upload',
            rover: 'Custom Upload',
            camera: 'USER UPLOAD',
            sol: 1,
            acquisitionUtc: new Date().toISOString(),
            identifier: 'local-upload',
            sourceUrl: result
          }
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectNasaImage = (img: any) => {
    const rawUrl = img.fullResUrl || img.thumbnailUrl;
    const safeUrl = getSafeImageUrl(rawUrl);
    setImageLoadError(null);
    setImageStatus('loading');
    setNasaBrowserOpen(false);
    updateSharedSession({
      terrainImage: safeUrl,
      imageProvenance: {
        source: img.source || 'NASA JPL Archive',
        rover: img.rover || 'Perseverance',
        camera: img.camera || 'NAVCAM',
        sol: img.sol || 2026,
        acquisitionUtc: img.acquisitionUtc || new Date().toISOString(),
        identifier: img.identifier || 'mars-2020-raw',
        sourceUrl: rawUrl
      }
    });
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const natW = img.naturalWidth || 256;
    const natH = img.naturalHeight || 256;
    setImageNaturalWidth(natW);
    setImageNaturalHeight(natH);
    const aspect = natW / natH;
    setImageAspect(aspect);
    setImageStatus('loaded');
    runSegmentationAnalysis(terrainImage);
  };

  const handleImageError = () => {
    console.warn('Failed to load terrain image URL:', terrainImage);
    setImageLoadError({
      message: 'Terrain imagery load failed. Network CORS restriction or expired NASA URL.',
      failedUrl: terrainImage
    });
    setImageStatus('error');
    setSegmentedHazards([]);
    setRawRoutePath([]);
    setSmoothedRoutePath([]);
  };

  const runSegmentationAnalysis = async (imgUrl: string) => {
    setIsAnalyzingCv(true);
    try {
      const detected = await analyzeImageSegmentation(imgUrl, 256, 256, startPoint, destinationPoint);
      setSegmentedHazards(detected);
    } catch (err) {
      console.warn('Segmentation analysis error:', err);
      setSegmentedHazards(getDefaultTerrainFeatures(startPoint, destinationPoint));
    } finally {
      setIsAnalyzingCv(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (imageStatus !== 'loaded') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const normX = Math.max(0, Math.min(256, Math.round((clickX / rect.width) * 256)));
    const normY = Math.max(0, Math.min(256, Math.round((clickY / rect.height) * 256)));

    if (activeMode === 'start') {
      updateSharedSession({ startPoint: { x: normX, y: normY } });
      setActiveMode('view');
    } else if (activeMode === 'destination') {
      updateSharedSession({ destinationPoint: { x: normX, y: normY } });
      setActiveMode('view');
    } else if (activeMode === 'obstacle') {
      const poly = createIrregularHazardPolygon({ x: normX, y: normY }, 14, 8, 0.35);
      const newHazard: SegmentedHazard = {
        id: `user-hazard-${Date.now()}`,
        name: `User Marked Obstacle`,
        type: 'rock',
        polygon: poly,
        centroid: { x: normX, y: normY },
        boundingBox: { minX: normX - 14, minY: normY - 14, maxX: normX + 14, maxY: normY + 14 },
        areaPx: Math.round(Math.PI * 14 * 14),
        blocked: true,
        userStatus: 'confirmed',
        uncertainty: 'Low',
        inRouteCorridor: true,
        roughness: 40.0,
        method: 'manual-annotation'
      };
      setSegmentedHazards(prev => [newHazard, ...prev]);
      setActiveMode('view');
    } else if (activeMode === 'science') {
      const newPoi = {
        id: `poi-${Date.now()}`,
        name: `Target Sol-${Math.round(Math.random() * 50)}`,
        x: normX,
        y: normY,
        evidence: 'High silica outcrop detected by spectral analysis.',
        uncertainty: 'Low'
      };
      updateSharedSession({ scienceTargets: [...scienceTargets, newPoi] });
      setActiveMode('view');
    } else {
      const clickedHazard = segmentedHazards.find(h => isPointInPolygon({ x: normX, y: normY }, h.polygon));
      if (clickedHazard) {
        setSelectedHazardId(clickedHazard.id);
      } else {
        setSelectedHazardId(null);
      }
    }
  };

  const handleSwapEndpoints = () => {
    const temp = startPoint;
    updateSharedSession({
      startPoint: destinationPoint,
      destinationPoint: temp
    });
  };

  const visibleHazards = segmentedHazards.filter(h => {
    if (showCorridorOnly) {
      return isHazardInRouteCorridor(h, startPoint, destinationPoint, 38);
    }
    return true;
  });

  const handlePlanRoute = useCallback(() => {
    if (imageStatus !== 'loaded') return;

    const grid = new AStarGrid(256, 256);
    const activeHazards = visibleHazards;

    const isCoreBlocked = (x: number, y: number) => {
      const pt = { x, y };
      for (const h of activeHazards) {
        if (h.blocked && isPointInPolygon(pt, h.polygon)) return true;
      }
      return false;
    };

    const isBufferBlocked = (x: number, y: number) => {
      const pt = { x, y };
      for (const h of activeHazards) {
        if (h.blocked && distanceToPolygon(pt, h.polygon) < hazardBuffer) return true;
      }
      return false;
    };

    const getCost = (x: number, y: number) => {
      const pt = { x, y };
      let cost = 1.0;
      for (const h of activeHazards) {
        if (h.type === 'sand' && isPointInPolygon(pt, h.polygon)) {
          cost += 2.5;
        } else if (h.type === 'uncertain' && isPointInPolygon(pt, h.polygon)) {
          cost += 3.0;
        }
      }
      return cost;
    };

    const result: any = grid.findPath(startPoint, destinationPoint, isBufferBlocked, getCost, { isCoreBlocked });

    let raw = result.path && result.path.length >= 2 ? result.path : generateStraightLinePath(startPoint, destinationPoint);
    let smoothed = raw.length >= 2 ? smoothPathCollisionFree(raw, isBufferBlocked) : raw;

    if (smoothed.length >= 2) {
      smoothed[0] = { x: startPoint.x, y: startPoint.y };
      smoothed[smoothed.length - 1] = { x: destinationPoint.x, y: destinationPoint.y };
    }

    setRawRoutePath(raw);
    setSmoothedRoutePath(smoothed);

    const realPixelLength = calculatePathLength(smoothed);
    setRouteMode(result.mode || 'optimal');
    setPlanningDiagnostics(result.diagnostics || {
      gridWidth: 256,
      gridHeight: 256,
      start: startPoint,
      goal: destinationPoint,
      mode: result.mode,
      iterations: result.iterations || 1,
      exploredCount: result.exploredCount || 0
    });

    const baseEnergy = Math.round(realPixelLength * 1.85);

    const betaCost = (x: number, y: number) => {
      const pt = { x, y };
      let c = 1.0;
      for (const h of activeHazards) {
        if (h.type === 'sand' && isPointInPolygon(pt, h.polygon)) {
          c += 3.5;
        } else if (h.type === 'uncertain' && isPointInPolygon(pt, h.polygon)) {
          c += 4.5;
        }
      }
      return c;
    };
    const betaRes: any = grid.findPath(startPoint, destinationPoint, isBufferBlocked, betaCost, { isCoreBlocked });
    let betaPath = betaRes.path && betaRes.path.length >= 2 ? smoothPathCollisionFree(betaRes.path, isBufferBlocked) : smoothed;
    if (betaPath.length >= 2) {
      betaPath[0] = { x: startPoint.x, y: startPoint.y };
      betaPath[betaPath.length - 1] = { x: destinationPoint.x, y: destinationPoint.y };
    } else {
      betaPath = smoothed;
    }
    const betaLength = calculatePathLength(betaPath);

    const gammaBlocked = (x: number, y: number) => {
      const pt = { x, y };
      for (const h of activeHazards) {
        if (h.blocked && distanceToPolygon(pt, h.polygon) < hazardBuffer + 6) return true;
      }
      return false;
    };
    const gammaRes: any = grid.findPath(startPoint, destinationPoint, gammaBlocked, getCost, { isCoreBlocked });
    let gammaPath = gammaRes.path && gammaRes.path.length >= 2 ? smoothPathCollisionFree(gammaRes.path, isBufferBlocked) : smoothed;
    if (gammaPath.length >= 2) {
      gammaPath[0] = { x: startPoint.x, y: startPoint.y };
      gammaPath[gammaPath.length - 1] = { x: destinationPoint.x, y: destinationPoint.y };
    } else {
      gammaPath = smoothed;
    }
    const gammaLength = calculatePathLength(gammaPath);

    let deltaPath = smoothed;
    if (scienceTargets.length > 0) {
      const poi = scienceTargets[0];
      const leg1: any = grid.findPath(startPoint, { x: poi.x, y: poi.y }, isBufferBlocked, getCost, { isCoreBlocked });
      const leg2: any = grid.findPath({ x: poi.x, y: poi.y }, destinationPoint, isBufferBlocked, getCost, { isCoreBlocked });
      if (leg1.path && leg2.path && leg1.path.length >= 2 && leg2.path.length >= 2) {
        const combined = [...leg1.path, ...leg2.path.slice(1)];
        deltaPath = smoothPathCollisionFree(combined, isCoreBlocked);
      }
    }
    if (deltaPath.length >= 2) {
      deltaPath[0] = { x: startPoint.x, y: startPoint.y };
      deltaPath[deltaPath.length - 1] = { x: destinationPoint.x, y: destinationPoint.y };
    } else {
      deltaPath = smoothed;
    }
    const deltaLength = calculatePathLength(deltaPath);

    setRouteAlternatives([
      {
        id: 'alpha',
        name: 'Route Alpha: Shortest Distance',
        pixelLength: realPixelLength,
        energyWh: baseEnergy,
        riskScore: result.mode === 'optimal' ? 3.2 : 14.5,
        feasible: true,
        path: smoothed
      },
      {
        id: 'beta',
        name: 'Route Beta: Lowest Traversal Cost',
        pixelLength: betaLength,
        energyWh: Math.round(baseEnergy * 1.08),
        riskScore: 2.1,
        feasible: true,
        path: betaPath
      },
      {
        id: 'gamma',
        name: 'Route Gamma: High Clearance',
        pixelLength: gammaLength,
        energyWh: Math.round(baseEnergy * 1.15),
        riskScore: 1.4,
        feasible: true,
        path: gammaPath
      },
      {
        id: 'delta',
        name: 'Route Delta: Science Detour',
        pixelLength: deltaLength,
        energyWh: Math.round(baseEnergy * 1.25),
        riskScore: 4.8,
        feasible: true,
        path: deltaPath
      }
    ]);
  }, [
    imageStatus,
    startPoint,
    destinationPoint,
    obstacles,
    segmentedHazards,
    showCorridorOnly,
    hazardBuffer,
    uncertaintyPenalty,
    scienceTargets
  ]);

  useEffect(() => {
    if (imageStatus === 'loaded') {
      handlePlanRoute();
    }
  }, [imageStatus, handlePlanRoute]);

  const activeAlt = routeAlternatives.find(a => a.id === selectedStrategy) || routeAlternatives[0];
  const activePath = activeAlt ? activeAlt.path : smoothedRoutePath;
  const totalPathLen = calculatePathLength(activePath);

  const directionArrows = (() => {
    if (!activePath || activePath.length < 2) return [];
    const arrows: Array<{ x: number; y: number; angle: number }> = [];
    let accumulated = 0;
    const minSpacing = 32;

    for (let i = 0; i < activePath.length - 1; i++) {
      const p1 = activePath[i];
      const p2 = activePath[i + 1];
      const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      accumulated += segLen;

      if (accumulated >= minSpacing) {
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
        arrows.push({
          x: Number(((p1.x + p2.x) / 2).toFixed(1)),
          y: Number(((p1.y + p2.y) / 2).toFixed(1)),
          angle: Number(angle.toFixed(1))
        });
        accumulated = 0;
      }
    }
    return arrows;
  })();

  useEffect(() => {
    if (simulationState === 'running' && totalPathLen > 0) {
      lastTimeRef.current = performance.now();

      const animate = (time: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = time;
        const deltaSec = (time - lastTimeRef.current) / 1000;
        lastTimeRef.current = time;

        const step = deltaSec * 35 * simSpeed;

        setSimDistance(prev => {
          const next = prev + step;
          if (next >= totalPathLen) {
            setSimulationState('completed');
            return totalPathLen;
          }
          return next;
        });

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [simulationState, totalPathLen, simSpeed]);

  const getPositionAtDistance = (path: Array<{ x: number; y: number }>, dist: number) => {
    if (path.length === 0) return { x: startPoint.x, y: startPoint.y, angle: 0 };
    if (dist <= 0) {
      const angle = path.length >= 2 ? Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x) * (180 / Math.PI) : 0;
      return { x: path[0].x, y: path[0].y, angle };
    }

    let accumulated = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (accumulated + segLen >= dist) {
        const t = (dist - accumulated) / segLen;
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
        return { x, y, angle };
      }
      accumulated += segLen;
    }
    const last = path[path.length - 1];
    const prev = path[Math.max(0, path.length - 2)];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x) * (180 / Math.PI);
    return { x: last.x, y: last.y, angle };
  };

  const roverPos = getPositionAtDistance(activePath, simDistance);
  const travelSeconds = (totalPathLen * 0.1) / drivingSpeedMps;
  const remainingSeconds = Math.max(0, travelSeconds * (1 - (simDistance / (totalPathLen || 1))));
  const etaMinutes = Math.floor(remainingSeconds / 60);
  const etaSecs = Math.round(remainingSeconds % 60);

  const travelHours = travelSeconds / 3600;
  const estimatedEnergyWh = Math.round(avgPowerW * travelHours);
  const availableEnergyWh = batteryCapacityWh * (batteryChargePct / 100);
  const remainingEnergyWh = availableEnergyWh - estimatedEnergyWh;
  const finalBatteryPct = Number(((remainingEnergyWh / batteryCapacityWh) * 100).toFixed(1));

  const handleToggleHazardBlocked = (hazardId: string) => {
    setSegmentedHazards(prev =>
      prev.map(h => (h.id === hazardId ? { ...h, blocked: !h.blocked, userStatus: 'confirmed' } : h))
    );
  };

  const activeSelectedHazard = segmentedHazards.find(h => h.id === selectedHazardId);

  const stageWidth = imageAspect >= 1 ? 520 : Math.round(520 * imageAspect);
  const stageHeight = imageAspect >= 1 ? Math.round(520 / imageAspect) : 520;

  return (
    <div className="flex h-full w-full bg-[#04060e] text-xs font-sans overflow-hidden">
      {/* Hidden file input for uploading terrain */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* LEFT WORKSPACE: MAP & INTERACTIVE CANVAS */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/10 relative bg-[#060812]">
        {/* Top Primary Action Toolbar */}
        <div className="h-16 bg-[#090d19]/95 backdrop-blur-xl border-b border-white/10 px-5 flex items-center justify-between gap-4 shrink-0 shadow-lg">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-inner shrink-0">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-white text-sm tracking-wide font-sans truncate">
                  MARSNAV v4.0 Mission Command
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                  Perseverance AI
                </span>
              </div>
              <p className="text-slate-400 text-[11px] font-mono tracking-wider truncate">
                Autonomous Terrain Segmentation &amp; Hazard Routing
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Masks Layer Toggle */}
            <button
              onClick={() => setShowSegmentationMasks(prev => !prev)}
              disabled={imageStatus !== 'loaded'}
              className={`px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-1.5 transition ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500 border-white/5 bg-transparent'
                  : showSegmentationMasks
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(0,218,243,0.3)] cursor-pointer'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 cursor-pointer'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Masks {showSegmentationMasks ? 'ON' : 'OFF'}</span>
            </button>

            {/* Hazard Zones Toggle */}
            <button
              onClick={() => setShowHazardZones(prev => !prev)}
              disabled={imageStatus !== 'loaded'}
              className={`px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-1.5 transition ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500 border-white/5 bg-transparent'
                  : showHazardZones
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 cursor-pointer'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Hazards {showHazardZones ? 'ON' : 'OFF'}</span>
            </button>

            {/* Route Comparison Lab */}
            <button
              onClick={() => setActiveWorkspace('route-comparison')}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-300 font-mono text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
            >
              <Route className="w-3.5 h-3.5" />
              <span>Route Lab</span>
            </button>

            {/* NASA Raw Imagery */}
            <button
              onClick={() => setNasaBrowserOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>NASA Feed</span>
            </button>

            {/* Upload Terrain */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-mono text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-600/30 transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Terrain</span>
            </button>
          </div>
        </div>

        {/* Sub-toolbar for Interactive Modes & Endpoints */}
        <div className="h-13 bg-[#070a16] border-b border-white/10 px-5 flex items-center justify-between gap-3 shrink-0 font-mono text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 text-[11px] font-sans font-semibold uppercase tracking-wider mr-1">
              Interaction Mode:
            </span>
            <button
              onClick={() => setActiveMode('start')}
              disabled={imageStatus !== 'loaded'}
              className={`px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500 bg-black/40 border border-white/5'
                  : activeMode === 'start'
                  ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] cursor-pointer'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>SET START</span>
            </button>

            <button
              onClick={() => setActiveMode('destination')}
              disabled={imageStatus !== 'loaded'}
              className={`px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500 bg-black/40 border border-white/5'
                  : activeMode === 'destination'
                  ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] cursor-pointer'
                  : 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 cursor-pointer'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>SET DESTINATION</span>
            </button>

            <button
              onClick={handleSwapEndpoints}
              disabled={imageStatus !== 'loaded'}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/30 text-xs flex items-center gap-1.5 cursor-pointer transition disabled:opacity-40"
              title="Reverse Start and Destination endpoints"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>SWAP ENDPOINTS</span>
            </button>

            <button
              onClick={() => runSegmentationAnalysis(terrainImage)}
              disabled={imageStatus !== 'loaded' || isAnalyzingCv}
              className={`px-3.5 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500 bg-black/40 border border-white/5'
                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer shadow-sm'
              }`}
            >
              <Cpu className={`w-3.5 h-3.5 ${isAnalyzingCv ? 'animate-spin' : ''}`} />
              <span>{isAnalyzingCv ? 'SEGMENTING...' : 'RE-SCAN TERRAIN'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveMode('obstacle')}
              disabled={imageStatus !== 'loaded'}
              className={`px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500 bg-black/40 border border-white/5'
                  : activeMode === 'obstacle'
                  ? 'bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)] cursor-pointer'
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 cursor-pointer'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>MARK OBSTACLE</span>
            </button>

            <button
              onClick={() => setActiveMode('science')}
              disabled={imageStatus !== 'loaded'}
              className={`px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 ${
                imageStatus !== 'loaded'
                  ? 'opacity-40 cursor-not-allowed text-slate-500 bg-black/40 border border-white/5'
                  : activeMode === 'science'
                  ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)] cursor-pointer'
                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 cursor-pointer'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>SCIENCE POI</span>
            </button>
          </div>
        </div>

        {/* Main Terrain Canvas Viewport */}
        <div className="flex-1 relative flex items-center justify-center p-6 overflow-hidden bg-radial from-[#090d1a] via-[#04060e] to-[#020307]">
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
            <div
              className="relative rounded-2xl overflow-hidden border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] bg-black"
              style={{
                width: `${stageWidth}px`,
                height: `${stageHeight}px`
              }}
            >
              {/* Underlying Terrain Photograph */}
              <img
                src={terrainImage}
                alt="Mars Terrain"
                crossOrigin="anonymous"
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
              />

              {/* SVG Interactive Overlay Layer */}
              <svg
                viewBox="0 0 256 256"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                <defs>
                  <linearGradient id="routeGradientCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>

                  <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  <linearGradient id="roverChassisDeck" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="35%" stopColor="#fbbf24" />
                    <stop offset="70%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>

                  <linearGradient id="roverTitanium" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#64748b" />
                    <stop offset="50%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>

                  <linearGradient id="roverWheelTread" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="30%" stopColor="#475569" />
                    <stop offset="70%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>

                  <radialGradient id="roverWheelHub" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="55%" stopColor="#475569" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </radialGradient>

                  <radialGradient id="roverCameraLens" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="45%" stopColor="#0284c7" />
                    <stop offset="85%" stopColor="#0369a1" />
                    <stop offset="100%" stopColor="#082f49" />
                  </radialGradient>

                  <linearGradient id="roverSensorCone" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="rgba(0, 240, 255, 0.45)" />
                    <stop offset="70%" stopColor="rgba(0, 240, 255, 0.12)" />
                    <stop offset="100%" stopColor="rgba(0, 240, 255, 0.0)" />
                  </linearGradient>

                  <filter id="roverDropShadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="0.8" result="shadowBlur" />
                  </filter>
                </defs>

                {/* Segmented Terrain Hazard Polygons */}
                {visibleHazards.map(h => {
                  const isSelected = selectedHazardId === h.id;
                  const isHovered = hoveredHazardId === h.id;
                  const pointsStr = h.polygon.map(p => `${p.x},${p.y}`).join(' ');

                  let strokeColor = '#f87171';
                  let fillColor = 'rgba(239, 68, 68, 0.14)';
                  let strokeDash = 'none';

                  if (h.type === 'hole') {
                    strokeColor = '#c084fc';
                    fillColor = 'rgba(192, 132, 252, 0.14)';
                  } else if (h.type === 'sand') {
                    strokeColor = '#fde047';
                    fillColor = 'rgba(253, 224, 71, 0.08)';
                    strokeDash = '2 2';
                  } else if (h.type === 'bedrock') {
                    strokeColor = '#2dd4bf';
                    fillColor = 'rgba(45, 212, 191, 0.08)';
                  } else if (h.type === 'uncertain') {
                    strokeColor = '#94a3b8';
                    fillColor = 'rgba(148, 163, 184, 0.07)';
                    strokeDash = '3 2';
                  }

                  if (!h.blocked) {
                    strokeColor = '#4ade80';
                    fillColor = 'rgba(74, 222, 128, 0.10)';
                  }

                  if (isSelected) {
                    strokeColor = '#fbbf24';
                    fillColor = 'rgba(251, 191, 36, 0.25)';
                  }

                  const dynamicBuffer = hazardBuffer * (h.uncertainty === 'High' ? 2.2 : h.uncertainty === 'Moderate' ? 1.9 : 1.7);

                  return (
                    <g key={`hazard-poly-${h.id}`}>
                      {showHazardZones && h.blocked && hazardBuffer > 0 && (
                        <polygon
                          points={pointsStr}
                          fill="none"
                          stroke="rgba(245, 158, 11, 0.25)"
                          strokeWidth={dynamicBuffer}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      )}

                      {showSegmentationMasks && (
                        <polygon
                          points={pointsStr}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={isSelected || isHovered ? 1.6 : 1.0}
                          strokeDasharray={strokeDash}
                          strokeLinejoin="round"
                          className="transition-all"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Alternative Routes */}
                {routeAlternatives.map(alt => {
                  if (alt.id === selectedStrategy || !alt.path || alt.path.length < 2) return null;
                  return (
                    <polyline
                      key={`alt-${alt.id}`}
                      points={alt.path.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="rgba(148, 163, 184, 0.3)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                  );
                })}

                {/* Active Selected Route */}
                {activePath.length > 1 && (
                  <>
                    <polyline
                      points={activePath.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#020617"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={activePath.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="url(#routeGradientCyan)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#routeGlow)"
                    />
                    {directionArrows.map((arrow, idx) => (
                      <g key={`arrow-${idx}`} transform={`translate(${arrow.x}, ${arrow.y}) rotate(${arrow.angle})`}>
                        <polygon points="-3,-2 2.5,0 -3,2 -1.2,0" fill="#00f0ff" stroke="#020617" strokeWidth="0.5" />
                      </g>
                    ))}
                  </>
                )}

                {/* START MARKER */}
                <g transform={`translate(${startPoint.x}, ${startPoint.y})`}>
                  <circle r="7.5" fill="rgba(16, 185, 129, 0.3)" className="animate-ping" />
                  <circle r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.2" />
                  <text y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">S</text>
                </g>

                {/* DESTINATION MARKER */}
                <g transform={`translate(${destinationPoint.x}, ${destinationPoint.y})`}>
                  <circle r="7.5" fill="rgba(239, 68, 68, 0.3)" className="animate-ping" />
                  <circle r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="1.2" />
                  <text y="2" fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">D</text>
                </g>

                {/* SCIENCE TARGETS */}
                {scienceTargets.map((sci) => (
                  <g key={sci.id} transform={`translate(${sci.x}, ${sci.y})`}>
                    <circle r="4.5" fill="#6366f1" stroke="#ffffff" strokeWidth="1" />
                    <text y="1.8" fill="#ffffff" fontSize="4.5" fontWeight="bold" textAnchor="middle">⚡</text>
                  </g>
                ))}

                {/* 3D ROVER ICON */}
                {(simulationState === 'running' || simulationState === 'paused' || simulationState === 'completed') && (
                  <g transform={`translate(${roverPos.x}, ${roverPos.y}) rotate(${roverPos.angle})`}>
                    <polygon points="5,-3.5 24,-9 24,9 5,3.5" fill="url(#roverSensorCone)" />
                    <ellipse cx="0" cy="0" rx="9" ry="6" fill="#000000" opacity="0.6" filter="url(#roverDropShadow)" />
                    <rect x="-5.5" y="-4" width="11" height="8" rx="1.5" fill="url(#roverTitanium)" stroke="#94a3b8" strokeWidth="0.5" />
                    <rect x="-4.5" y="-3.2" width="8.5" height="6.4" rx="1" fill="url(#roverChassisDeck)" stroke="#d97706" strokeWidth="0.4" />
                    <polygon points="6.8,0 5.2,-1.2 5.5,0 5.2,1.2" fill="#00f0ff" />
                  </g>
                )}
              </svg>

              {/* Clickable Overlay Canvas */}
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                width={256}
                height={256}
                className="absolute inset-0 w-full h-full cursor-crosshair"
              />

              {/* Compact Rover Status Bar (Top) */}
              <div className="absolute top-3 inset-x-3 pointer-events-none flex justify-center">
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-200 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-xl">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <strong className="text-white font-sans">{imageProvenance.rover}</strong>
                  </span>
                  <span className="text-slate-600">|</span>
                  <span>Sol <strong className="text-cyan-300">{imageProvenance.sol}</strong></span>
                  <span className="text-slate-600">|</span>
                  <span className="text-emerald-400 text-[10px] bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                    CV Edge Baseline Active
                  </span>
                </div>
              </div>

              {/* Compact Simulation Control Dock (Bottom) */}
              <div className="absolute bottom-3 inset-x-3 pointer-events-auto">
                <div className="bg-slate-950/90 backdrop-blur-xl rounded-2xl border border-white/20 p-3.5 shadow-2xl flex flex-col gap-2 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                        <Navigation className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Mission ETA</div>
                        <div className="text-white font-bold text-xs">
                          {simulationState === 'completed' ? (
                            <span className="text-emerald-400">Destination Reached</span>
                          ) : (
                            <span>~{etaMinutes}m {etaSecs}s <span className="text-slate-400 font-normal">({drivingSpeedMps} m/s)</span></span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Distance Remaining</div>
                      <div className="text-cyan-400 font-bold text-xs">
                        {Math.max(0, totalPathLen - simDistance).toFixed(1)} px <span className="text-slate-400 font-normal font-sans">({((totalPathLen - simDistance) * 0.1).toFixed(1)}m)</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 via-cyan-400 to-emerald-400 transition-all duration-75"
                      style={{ width: `${Math.min(100, (simDistance / (totalPathLen || 1)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      {simulationState !== 'running' ? (
                        <button
                          onClick={() => {
                            if (simulationState === 'completed') setSimDistance(0);
                            setSimulationState('running');
                          }}
                          disabled={activePath.length === 0}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-lg shadow-emerald-600/30 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{simulationState === 'completed' ? 'Re-run Mission' : 'Start Drive'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setSimulationState('paused')}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-600/30 transition-all"
                        >
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause Drive</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setSimulationState('stopped');
                          setSimDistance(0);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-1 bg-black/60 p-1 rounded-xl border border-white/10 text-[11px]">
                      {[1, 2, 5].map(multiplier => (
                        <button
                          key={multiplier}
                          onClick={() => setSimSpeed(multiplier)}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                            simSpeed === multiplier ? 'bg-orange-500 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {multiplier}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : imageStatus === 'loading' ? (
            <div className="w-[500px] h-[500px] max-w-full rounded-2xl border border-white/10 bg-[#070b18] shadow-2xl flex flex-col items-center justify-center p-8 text-center select-none">
              <img
                src={getSafeImageUrl(terrainImage)}
                alt="Preloader"
                onLoad={handleImageLoad}
                onError={handleImageError}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/15 flex items-center justify-center mb-4 text-cyan-400 shadow-lg">
                <RefreshCw className="w-7 h-7 animate-spin text-cyan-400" />
              </div>
              <h3 className="text-white font-bold text-base mb-1 font-sans">
                Loading Terrain Imagery...
              </h3>
              <p className="text-slate-400 text-xs font-sans">
                Fetching high-resolution Mars rover photographic frame from JPL archive.
              </p>
            </div>
          ) : (
            <div className="w-[500px] h-[500px] max-w-full rounded-2xl border border-white/10 bg-[#070b18] shadow-2xl flex flex-col items-center justify-center p-8 text-center select-none">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/15 flex items-center justify-center mb-4 text-slate-400 shadow-lg">
                <Layers className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-white font-bold text-base mb-2 font-sans">
                No terrain image loaded
              </h3>
              <p className="text-slate-400 text-xs max-w-xs mb-6 font-sans leading-relaxed">
                Upload a custom rover image or select a verified NASA Mars 2020 photograph to begin autonomous path planning.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs tracking-wide flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-600/30 transition-all active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Terrain Image</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Diagnostics Footer Panel */}
        <div className="h-36 bg-[#070a16] border-t border-white/10 p-4 grid grid-cols-1 md:grid-cols-3 gap-3.5 shrink-0 font-mono">
          <div className="bg-[#04060e] border border-white/10 p-3.5 rounded-2xl space-y-1.5 shadow-inner">
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[11px]">Route Metrics</span>
            <div className="text-xs space-y-1 text-slate-300">
              <div>Path Length: <strong className="text-white font-mono">{imageStatus === 'loaded' ? `${totalPathLen.toFixed(1)} px` : '—'}</strong> <span className="text-slate-400 text-[10px]">({imageStatus === 'loaded' ? `${activePath.length} nodes` : 'idle'})</span></div>
              <div>Estimated Distance: <span className="text-cyan-300 text-[11px]">{imageStatus === 'loaded' ? `${(totalPathLen * 0.1).toFixed(1)} meters` : '—'}</span> <span className="text-slate-400 text-[10px]">(0.10m/px)</span></div>
              <div>Selected Strategy: <strong className="text-orange-400 uppercase">{selectedStrategy}</strong></div>
            </div>
          </div>

          <div className="bg-[#04060e] border border-white/10 p-3.5 rounded-2xl space-y-1.5 shadow-inner">
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[11px]">Mission Energy Budget</span>
            <div className="text-xs space-y-1 text-slate-300">
              <div>Configured Speed: <span className="text-cyan-400">{drivingSpeedMps} m/s</span></div>
              <div>Required Energy: <strong className="text-orange-400">{imageStatus === 'loaded' ? `${estimatedEnergyWh} Wh` : '—'}</strong> <span className="text-slate-400 text-[10px]">({avgPowerW}W nominal)</span></div>
              <div>Battery Reserve: <strong className="text-emerald-400">{Math.round(remainingEnergyWh)} Wh ({finalBatteryPct}%)</strong></div>
            </div>
          </div>

          <div className="bg-[#04060e] border border-white/10 p-3.5 rounded-2xl space-y-1.5 shadow-inner">
            <span className="text-slate-400 font-bold uppercase tracking-wider block text-[11px]">Terrain &amp; A* Diagnostics</span>
            <div className="text-xs space-y-1 text-slate-300">
              <div>Mapped Hazards: <span className="text-amber-400">{imageStatus === 'loaded' ? visibleHazards.length : 0}</span> ({showCorridorOnly ? 'corridor' : 'all'})</div>
              <div>Buffer Clearance: <strong className="text-amber-400">{hazardBuffer} px</strong></div>
              <div>Path Status: <span className="text-emerald-300 font-bold uppercase">{imageStatus === 'loaded' ? routeMode : 'Awaiting Terrain'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT MISSION INSPECTOR SIDEBAR */}
      <div className="w-[380px] bg-[#070a16] border-l border-white/10 flex flex-col shrink-0">
        <div className="flex border-b border-white/10 bg-[#050710]">
          {(['route', 'hazards', 'science', 'rover', 'resources'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setInspectorTab(tab)}
              className={`flex-1 py-3 text-[11px] font-mono capitalize transition-all border-b-2 cursor-pointer ${
                inspectorTab === tab
                  ? 'border-orange-500 text-orange-400 font-bold bg-white/[0.03]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 font-mono text-xs">
          {/* TAB: ROUTE STRATEGIES */}
          {inspectorTab === 'route' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-sm font-sans">Route Strategies</h3>
                <span className="text-slate-400 text-[10px]">{imageStatus === 'loaded' ? '4 active paths' : 'Awaiting image'}</span>
              </div>

              {imageStatus !== 'loaded' ? (
                <div className="p-5 rounded-2xl bg-black/50 border border-white/10 text-center text-slate-400">
                  <p className="text-xs">No terrain image active.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Upload an image or choose from NASA raw feeds to compute path alternatives.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(['alpha', 'beta', 'gamma', 'delta'] as const).map(st => {
                    const alt = routeAlternatives.find(a => a.id === st);
                    return (
                      <div
                        key={st}
                        onClick={() => updateSharedSession({ selectedStrategy: st })}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer shadow-sm ${
                          selectedStrategy === st
                            ? 'bg-orange-500/15 border-orange-500/60 text-white shadow-orange-500/10'
                            : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1 uppercase">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shadow-sm"
                              style={{
                                backgroundColor: st === 'alpha' ? '#00f0ff' : st === 'beta' ? '#10b981' : st === 'gamma' ? '#f59e0b' : '#c084fc'
                              }}
                            />
                            <span>Strategy {st}</span>
                          </span>
                          {alt && <span className="text-cyan-400 font-mono text-xs">{alt.pixelLength.toFixed(1)} px</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 mb-2.5">
                          {st === 'alpha' && 'Shortest Euclidean path around detected rock polygons'}
                          {st === 'beta' && 'Lowest traversal cost / sand slip avoidance'}
                          {st === 'gamma' && 'Maximum obstacle clearance buffer (widest safety zone)'}
                          {st === 'delta' && 'Geological science waypoint detour for core sampling'}
                        </div>
                        {alt && (
                          <div className="flex justify-between text-[10px] text-slate-400 border-t border-white/10 pt-2">
                            <span>Est Energy: <strong className="text-white">{alt.energyWh} Wh</strong></span>
                            <span>Risk Score: <strong className="text-emerald-400">{alt.riskScore} / 20</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: HAZARDS & SHAPE-AWARE SEGMENTATION */}
          {inspectorTab === 'hazards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-sm font-sans">Detected Terrain Features</h3>
                  <div className="text-[10px] text-slate-400">Classical CV Edge &amp; Contour Baseline</div>
                </div>
                <span className="text-[10px] text-amber-400 font-mono font-bold">{imageStatus === 'loaded' ? `${visibleHazards.length} features` : '0'}</span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between">
                <span className="text-slate-300 text-[11px]">Route Corridor Scope:</span>
                <button
                  onClick={() => setShowCorridorOnly(prev => !prev)}
                  disabled={imageStatus !== 'loaded'}
                  className="px-2.5 py-1 rounded-lg text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer disabled:opacity-40 transition"
                >
                  {showCorridorOnly ? 'Corridor (38px)' : 'Full Image'}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-500/30 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">Safety Buffer Clearance</span>
                  <span className="text-amber-400 font-bold font-mono">{hazardBuffer} px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="28"
                  value={hazardBuffer}
                  onChange={(e) => setHazardBuffer(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Tight (2px)</span>
                  <span>Wide (28px)</span>
                </div>
              </div>

              {activeSelectedHazard && (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/60 space-y-2.5 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white uppercase text-xs">{activeSelectedHazard.name}</span>
                    <button onClick={() => setSelectedHazardId(null)} className="text-slate-400 hover:text-white cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                    <div>Type: <strong className="text-amber-400 uppercase">{activeSelectedHazard.type}</strong></div>
                    <div>Area: <strong className="text-white">{activeSelectedHazard.areaPx} px²</strong></div>
                    <div>Roughness: <strong className="text-white">{activeSelectedHazard.roughness}</strong></div>
                    <div>In Corridor: <strong className={activeSelectedHazard.inRouteCorridor ? 'text-emerald-400' : 'text-slate-400'}>{activeSelectedHazard.inRouteCorridor ? 'Yes' : 'No'}</strong></div>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[11px] text-slate-300">Traversability:</span>
                    <button
                      onClick={() => handleToggleHazardBlocked(activeSelectedHazard.id)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-sm ${
                        activeSelectedHazard.blocked
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                    >
                      {activeSelectedHazard.blocked ? 'BLOCKED (Hazard)' : 'TRAVERSABLE (Clear)'}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {visibleHazards.length === 0 ? (
                  <div className="text-slate-500 text-center py-6 text-xs font-mono">
                    {imageStatus === 'loaded' ? 'No hazards detected in current scope' : 'No terrain image loaded'}
                  </div>
                ) : (
                  visibleHazards.map((h) => {
                    const isSelected = selectedHazardId === h.id;
                    return (
                      <div
                        key={h.id}
                        onClick={() => setSelectedHazardId(h.id)}
                        onMouseEnter={() => setHoveredHazardId(h.id)}
                        onMouseLeave={() => setHoveredHazardId(null)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center text-[11px] ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500/60 text-white shadow-md'
                            : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: h.type === 'rock' ? '#ef4444' : h.type === 'hole' ? '#c084fc' : h.type === 'sand' ? '#fde047' : '#2dd4bf'
                            }}
                          />
                          <span className="font-bold text-white">{h.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="text-slate-400">{h.areaPx} px²</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${h.blocked ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                            {h.blocked ? 'BLOCKED' : 'PASS'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: SCIENCE TARGETS */}
          {inspectorTab === 'science' && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-sm font-sans">Geological Science Targets</h3>
              <div className="space-y-3">
                {scienceTargets.map(sci => (
                  <div key={sci.id} className="p-3.5 rounded-2xl bg-black/40 border border-indigo-500/30 space-y-1.5 shadow-sm">
                    <div className="font-bold text-indigo-300 flex items-center justify-between">
                      <span>{sci.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({sci.x}, {sci.y})</span>
                    </div>
                    <div className="text-[11px] text-slate-300">{sci.evidence}</div>
                    <div className="text-[10px] text-slate-400 italic">Uncertainty: {sci.uncertainty}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ROVER PROFILE */}
          {inspectorTab === 'rover' && (
            <div className="space-y-4 text-slate-300">
              <h3 className="text-white font-bold text-sm font-sans">Rover Platform Specification</h3>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 text-xs shadow-inner">
                <div>Rover: <strong className="text-white">Perseverance (Mars 2020)</strong></div>
                <div>Mass: <strong className="text-white">{roverMassKg} kg</strong></div>
                <div>Suspension: <strong className="text-cyan-400">Rocker-Bogie 6-Wheel Drive</strong></div>
                <div>Max Incline Limit: <strong className="text-amber-400">{maxSlopeLimit}°</strong></div>
                <div>Driving Speed: <strong className="text-white">{drivingSpeedMps} m/s</strong> (0.144 km/h)</div>
                <div>Power Source: <strong className="text-white">MMRTG Radioisotope Generator</strong></div>
              </div>
            </div>
          )}

          {/* TAB: MISSION RESOURCES */}
          {inspectorTab === 'resources' && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-sm font-sans">Mission Power &amp; Battery</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-slate-400 block mb-1">Battery Capacity (Wh)</label>
                  <input
                    type="number"
                    value={batteryCapacityWh}
                    onChange={e => setBatteryCapacityWh(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Initial State of Charge (%)</label>
                  <input
                    type="number"
                    value={batteryChargePct}
                    onChange={e => setBatteryChargePct(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Rover Driving Speed (m/s)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={drivingSpeedMps}
                    onChange={e => setDrivingSpeedMps(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
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
