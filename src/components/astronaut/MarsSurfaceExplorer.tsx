import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  MapPin,
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
  RefreshCw,
  User,
  Globe,
  Mountain,
  Loader2,
  Eye
} from 'lucide-react';
import { useAstronautExploration } from '../../context/AstronautExplorationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  sharedExplorationStore,
  ExplorationWaypoint,
  ActiveExplorationSession,
  DetectedBoulder
} from '../../services/sharedExplorationStore';
import { TerrainRegionItem } from '../../services/terrainIntelligenceService';
import {
  VERIFIED_MARS_MAP_LAYERS,
  MarsTrekLayerSpec,
  getTrekTilePreviewUrl,
  fetchTrekElevationPoint,
  TrekElevationSample
} from '../../services/marsGeospatialService';
import { fetchTrekLayers } from '../../services/nasaMarsTrekService';
import { getAllCandidateRegions } from '../../services/regionTerrainService';

function getSafeImgSrc(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;
  return `/api/nasa/proxy-image?url=${encodeURIComponent(url)}`;
}

export const MarsSurfaceExplorer: React.FC = () => {
  const { currentCoordinates, setCurrentCoordinates, trekElevation, usgsGeology } = useAstronautExploration();
  const { activeMission, selectedRegion, loadRegionIntoWorkspace, setSelectedRegion } = useWorkspace();

  const [activeSession, setActiveSession] = useState<ActiveExplorationSession>(() => sharedExplorationStore.getSession());
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [selectedWaypoint, setSelectedWaypoint] = useState<ExplorationWaypoint | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<
    | { kind: 'boulder'; data: DetectedBoulder }
    | { kind: 'region'; data: TerrainRegionItem }
    | null
  >(null);
  const [showSegMask, setShowSegMask] = useState<boolean>(false);
  const [showRegionsOverlay, setShowRegionsOverlay] = useState<boolean>(false);
  const [showObstaclesOverlay, setShowObstaclesOverlay] = useState<boolean>(false);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simProgressIdx, setSimProgressIdx] = useState<number>(0);
  const [measuringMode, setMeasuringMode] = useState<boolean>(false);
  const [measurePointA, setMeasurePointA] = useState<{ x: number; y: number } | null>(null);
  const [measurePointB, setMeasurePointB] = useState<{ x: number; y: number } | null>(null);
  const [hoverCoord, setHoverCoord] = useState<{ xPct: number; yPct: number } | null>(null);

  // Live NASA Mars Trek / USGS Layer Catalog & Switcher State
  const [liveLayers, setLiveLayers] = useState<MarsTrekLayerSpec[]>(VERIFIED_MARS_MAP_LAYERS);
  const [activeLayerId, setActiveLayerId] = useState<string>(() =>
    sharedExplorationStore.getSession().imageMetadata.url ? 'active_photo' : 'trek_hrsc_mola_clrshade'
  );
  const [mapSpanDeg, setMapSpanDeg] = useState<number>(0.45);
  const [orbitalImageLoading, setOrbitalImageLoading] = useState<boolean>(false);
  const [orbitalImageError, setOrbitalImageError] = useState<string | null>(null);
  const [pointElevation, setPointElevation] = useState<TrekElevationSample | null>(null);
  const [isSamplingElev, setIsSamplingElev] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const prevUrlRef = useRef<string>(sharedExplorationStore.getSession().imageMetadata.url);
  const candidateRegions = getAllCandidateRegions();

  const hasCoords =
    activeSession.provenance?.coordinateScope !== 'unavailable' &&
    typeof activeSession.provenance?.lat === 'number' &&
    typeof activeSession.provenance?.lon === 'number';
  const centerLat = hasCoords
    ? (activeSession.provenance.lat as number)
    : currentCoordinates?.lat ?? selectedRegion?.centerCoords?.lat ?? 18.38;
  const centerLon = hasCoords
    ? (activeSession.provenance.lon as number)
    : currentCoordinates?.lon ?? selectedRegion?.centerCoords?.lon ?? 77.58;

  useEffect(() => {
    let active = true;
    fetchTrekLayers(centerLat, centerLon)
      .then(res => {
        if (active && Array.isArray(res.layers) && res.layers.length > 0) {
          setLiveLayers(res.layers);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [centerLat, centerLon]);

  // Subscribe to shared exploration store & auto-default to 'active_photo' when a new active image arrives
  useEffect(() => {
    const unsubscribe = sharedExplorationStore.subscribe((session) => {
      setActiveSession(session);
      setSelectedWaypoint(session.waypoints[0] || null);
      if (session.imageMetadata.url && session.imageMetadata.url !== prevUrlRef.current) {
        prevUrlRef.current = session.imageMetadata.url;
        setActiveLayerId('active_photo');
        setSelectedFeature(null);
        setZoomLevel(1.0);
        setPanOffset({ x: 0, y: 0 });
        setSimProgressIdx(0);
        setIsSimulating(false);
      }
    });
    return unsubscribe;
  }, []);

  const activeLayerSpec: MarsTrekLayerSpec | null =
    activeLayerId === 'active_photo'
      ? null
      : liveLayers.find(l => l.id === activeLayerId) || liveLayers[0];

  const orbitalImageUrl =
    activeLayerId !== 'active_photo'
      ? getTrekTilePreviewUrl({
          layerId: activeLayerId,
          lat: centerLat,
          lon: centerLon,
          spanDeg: mapSpanDeg,
          width: 768,
          height: 540
        })
      : getSafeImgSrc(activeSession.imageMetadata.url);

  const displayImageUrl = orbitalImageUrl || '';

  useEffect(() => {
    if (activeLayerId !== 'active_photo') {
      setOrbitalImageLoading(true);
      setOrbitalImageError(null);
    } else {
      setOrbitalImageLoading(false);
      setOrbitalImageError(null);
    }
  }, [activeLayerId, centerLat, centerLon, mapSpanDeg]);

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
      }, 380);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSimulating, activeSession.automatedRoute]);

  const pctToPlanetocentric = (xPct: number, yPct: number) => {
    const lonMin = centerLon - mapSpanDeg / 2;
    const latMax = centerLat + mapSpanDeg / 2;
    const lon = lonMin + (xPct / 100) * mapSpanDeg;
    const lat = latMax - (yPct / 100) * mapSpanDeg;
    return { lat, lon };
  };

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
        xPct: Number(((relX / Math.max(1, rect.width)) * 100).toFixed(1)),
        yPct: Number(((relY / Math.max(1, rect.height)) * 100).toFixed(1))
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleCanvasClick = async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.waypoint-marker') || (e.target as HTMLElement).closest('.control-panel')) return;
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const relY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    if (measuringMode) {
      const clickPos = { x: relX, y: relY };
      if (!measurePointA) setMeasurePointA(clickPos);
      else if (!measurePointB) setMeasurePointB(clickPos);
      else {
        setMeasurePointA(clickPos);
        setMeasurePointB(null);
      }
      return;
    }

    if (activeLayerId !== 'active_photo') {
      const xPct = (relX / Math.max(1, rect.width)) * 100;
      const yPct = (relY / Math.max(1, rect.height)) * 100;
      const geo = pctToPlanetocentric(xPct, yPct);
      setIsSamplingElev(true);
      const sample = await fetchTrekElevationPoint(geo.lat, geo.lon);
      setPointElevation(sample);
      setIsSamplingElev(false);
    }
  };

  const handleAnalyzeTerrain = async () => {
    if (!activeSession.imageMetadata.url) return;
    sharedExplorationStore.setAnalysisStatus('analyzing', 'Re-running complete-frame CV + Gemini Vision analysis...');
    await sharedExplorationStore.processAndSyncImage(
      activeSession.imageMetadata.url,
      activeSession.imageMetadata.fileName,
      activeSession.activeRegion,
      undefined,
      undefined,
      { ...activeSession.provenance, forceRefresh: true }
    );
  };

  const handleGenerateWaypoints = () => {
    if (!activeSession.imageMetadata.url) return;
    const start = activeSession.waypoints.find(wp => wp.type === 'start');
    const dest = activeSession.waypoints.find(wp => wp.type === 'destination');
    const plan = sharedExplorationStore.generateAutomatedNavigationPlan(
      activeSession.imageAnalysis.boulders,
      start ? { xPct: start.xPct, yPct: start.yPct } : undefined,
      dest ? { xPct: dest.xPct, yPct: dest.yPct } : undefined
    );
    sharedExplorationStore.updateSession({ waypoints: plan.waypoints, automatedRoute: plan.automatedRoute });
  };

  const handleGenerateOptimalRoute = () => {
    if (!activeSession.imageMetadata.url) return;
    const start = activeSession.waypoints.find(wp => wp.type === 'start');
    const dest = activeSession.waypoints.find(wp => wp.type === 'destination');
    const plan = sharedExplorationStore.generateAutomatedNavigationPlan(
      activeSession.imageAnalysis.boulders,
      start ? { xPct: start.xPct, yPct: start.yPct } : undefined,
      dest ? { xPct: dest.xPct, yPct: dest.yPct } : undefined
    );
    sharedExplorationStore.updateSession({ automatedRoute: plan.automatedRoute });
  };

  const waypoints = activeSession.waypoints || [];
  const automatedRoute = activeSession.automatedRoute;
  const footprints = automatedRoute?.footprints || [];
  const currentAstronautPos = footprints[simProgressIdx] || footprints[0] || waypoints[0] || null;
  const isCoordsUnavailable =
    Boolean(activeSession.imageMetadata.url) && activeSession.provenance?.coordinateScope === 'unavailable';

  const imgW = activeSession.imageMetadata.width || 4;
  const imgH = activeSession.imageMetadata.height || 3;
  const hoverGeo = hoverCoord && activeLayerId !== 'active_photo' ? pctToPlanetocentric(hoverCoord.xPct, hoverCoord.yPct) : null;

  const measurePxDist =
    measurePointA && measurePointB
      ? Math.round(Math.hypot(measurePointB.x - measurePointA.x, measurePointB.y - measurePointA.y))
      : null;

  return (
    <div className="space-y-5 font-sans animate-fade-in">
      {/* Top Banner & Control Actions Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl control-panel">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/35 uppercase">
              MARS SURFACE EXPLORER &amp; TREK VIEWER
            </span>
            <span className={`text-xs font-mono ${isCoordsUnavailable ? 'text-amber-300' : 'text-cyan-400'}`}>
              {isCoordsUnavailable
                ? 'Active Image Coordinates: Unavailable (2D Optical Frame)'
                : `${centerLat.toFixed(3)}°N, ${centerLon.toFixed(3)}°E · IAU2000:49900`}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            {activeMission?.name || 'Human Surface Exploration Mission'}
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Active View:{' '}
            <strong className="text-orange-300">
              {activeLayerSpec ? activeLayerSpec.name : activeSession.imageMetadata.fileName || 'No Surface Photo Selected'}
            </strong>
            {' · '}
            MOLA Elevation:{' '}
            <strong className={isCoordsUnavailable ? 'text-amber-300' : 'text-emerald-300'}>
              {isCoordsUnavailable && activeLayerId === 'active_photo'
                ? 'Calibrated depth/elevation unavailable'
                : trekElevation?.calibrated && trekElevation.elevationM !== null
                  ? `${trekElevation.elevationM} m (${trekElevation.resolutionMeters}m/px)`
                  : 'Click orbital map to sample'}
            </strong>
          </p>
          {activeLayerId === 'active_photo' && activeSession.imageMetadata.url && activeSession.analysisStatus === 'completed' && !activeSession.imageAnalysis?.aiAvailable && (
            <div className="mt-1.5 inline-flex flex-wrap items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-950/35 border border-amber-500/40 text-[10px] font-mono">
              <span className="font-bold text-amber-300">AI ANALYSIS UNAVAILABLE</span>
              <span className="text-slate-500">·</span>
              <span className="font-bold text-cyan-300">FALLBACK: PIXEL-BASED COMPUTER VISION</span>
              {activeSession.imageAnalysis?.aiStatusMessage && (
                <span className="text-amber-200/90 font-sans">({activeSession.imageAnalysis.aiStatusMessage})</span>
              )}
              <button
                type="button"
                onClick={() =>
                  sharedExplorationStore.processAndSyncImage(
                    activeSession.imageMetadata.url,
                    activeSession.imageMetadata.fileName,
                    activeSession.activeRegion,
                    undefined,
                    undefined,
                    { ...activeSession.provenance, forceRefresh: true }
                  )
                }
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-bold cursor-pointer"
              >
                Retry AI Analysis
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons Control Panel */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 mr-1">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">NAV STATUS</span>
              <div className="flex items-center gap-1.5">
                {activeSession.analysisStatus === 'completed' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : activeSession.analysisStatus === 'failed' ? (
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                ) : (
                  <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                )}
                <span
                  className={`text-[10px] font-mono font-bold ${
                    activeSession.analysisStatus === 'completed'
                      ? 'text-emerald-400'
                      : activeSession.analysisStatus === 'failed'
                        ? 'text-rose-400'
                        : 'text-cyan-400'
                  }`}
                >
                  {activeSession.analysisStatus === 'completed'
                    ? automatedRoute?.status || 'ANALYZED'
                    : activeSession.analysisStatus.toUpperCase().replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleAnalyzeTerrain}
            disabled={!activeSession.imageMetadata.url}
            className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-cyan-950/40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RE-ANALYZE</span>
          </button>
          <button
            onClick={handleGenerateWaypoints}
            disabled={!activeSession.imageMetadata.url}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>WAYPOINTS</span>
          </button>
          <button
            onClick={handleGenerateOptimalRoute}
            disabled={!activeSession.imageMetadata.url}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5 text-orange-400" />
            <span>OPTIMIZE ROUTE</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          {isSimulating ? (
            <button
              onClick={() => setIsSimulating(false)}
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE</span>
            </button>
          ) : (
            <button
              onClick={() => footprints.length > 0 && setIsSimulating(true)}
              disabled={footprints.length === 0}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>SIMULATE EVA</span>
            </button>
          )}
          <button
            onClick={() => {
              setIsSimulating(false);
              setSimProgressIdx(0);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Layer Switcher Bar: Active Image + Mars Trek / USGS Orbital Layers */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 control-panel">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 flex items-center gap-1.5 mr-1">
            <Layers className="w-3.5 h-3.5" />
            View Mode &amp; Layers:
          </span>
          {[
            ...(activeSession.imageMetadata.url ? [{ id: 'active_photo', label: 'Active Rover / Uploaded Photo' }] : []),
            { id: 'trek_hrsc_mola_clrshade', label: 'HRSC+MOLA 200m' },
            { id: 'trek_jezero_ctx_6m', label: 'Jezero CTX 6m' },
            { id: 'trek_viking_mdim21', label: 'Viking WMTS' },
            { id: 'trek_mola_clrshade', label: 'MOLA Color WMTS' },
            { id: 'usgs_mola_themis_blend', label: 'MOLA+THEMIS' },
            { id: 'usgs_themis_day', label: 'THEMIS IR Day' },
            { id: 'usgs_themis_night', label: 'THEMIS IR Night' },
            { id: 'usgs_hrsc_mola_hillshade', label: 'Hillshade DEM' },
            { id: 'trek_sim3292_geology', label: 'SIM 3292 Geology' }
          ].map(item => {
            const spec = liveLayers.find(l => l.id === item.id);
            const outOfFootprint = spec?.coversPoint === false;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveLayerId(item.id);
                  setZoomLevel(1.0);
                  setPanOffset({ x: 0, y: 0 });
                }}
                title={
                  outOfFootprint
                    ? `Regional footprint [${spec?.bbox?.join(', ')}] does not cover ${centerLat.toFixed(2)}°N, ${centerLon.toFixed(2)}°E`
                    : spec?.name
                }
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border ${
                  activeLayerId === item.id
                    ? 'bg-cyan-600/25 border-cyan-400 text-cyan-200 shadow-sm'
                    : outOfFootprint
                      ? 'bg-slate-900/50 border-slate-800/70 text-slate-500 hover:text-slate-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
                {outOfFootprint ? ' (Regional)' : ''}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {activeLayerId === 'active_photo' ? (
            <>
              <button
                onClick={() => setShowObstaclesOverlay(v => !v)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                  showObstaclesOverlay
                    ? 'bg-yellow-500/20 border-yellow-400/60 text-yellow-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Obstacles ({activeSession.imageAnalysis.boulders.length})
              </button>
              <button
                onClick={() => setShowRegionsOverlay(v => !v)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                  showRegionsOverlay
                    ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Regions ({activeSession.imageAnalysis.regions?.length || 0})
              </button>
              {activeSession.imageAnalysis.segmentationMaskUrl && (
                <button
                  onClick={() => setShowSegMask(v => !v)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer flex items-center gap-1 ${
                    showSegMask
                      ? 'bg-purple-500/25 border-purple-400 text-purple-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>CV Mask</span>
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <Globe className="w-3.5 h-3.5 text-orange-400" />
                <select
                  aria-label="Mars Target Region"
                  value={selectedRegion?.id || 'jezero'}
                  onChange={e => {
                    const region = candidateRegions.find(r => r.id === e.target.value);
                    if (region) {
                      setSelectedRegion(region);
                      setCurrentCoordinates({
                        lat: region.centerCoords.lat,
                        lon: region.centerCoords.lon,
                        name: region.name,
                        elevM: currentCoordinates.elevM
                      });
                    }
                  }}
                  className="bg-transparent text-slate-200 text-[11px] focus:outline-none cursor-pointer"
                >
                  {candidateRegions.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                      {r.name} ({r.latitude}, {r.longitude})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400">Span:</span>
                {[0.2, 0.45, 1.2, 3.0].map(sp => (
                  <button
                    key={sp}
                    onClick={() => setMapSpanDeg(sp)}
                    className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${
                      mapSpanDeg === sp ? 'bg-orange-500/30 text-orange-200 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sp}°
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Explicit Calibration & Coordinate Honesty Notice */}
      {activeLayerId === 'active_photo' && activeSession.imageMetadata.url && (
        <div className="bg-amber-950/25 border border-amber-500/35 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-amber-200">
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Visual estimate only — calibrated depth/elevation data unavailable from single 2D optical imagery.
            </span>
          </span>
          <span className="text-[11px] text-slate-300">
            {activeSession.imageMetadata.width > 0
              ? `${activeSession.imageMetadata.width}×${activeSession.imageMetadata.height} px`
              : 'Native Aspect'}
            {' · '}Click any yellow obstacle box or cyan region to inspect.
          </span>
        </div>
      )}

      {/* Main Map Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Uncropped Aspect-Locked Viewport (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Map Toolbar HUD Overlay */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setZoomLevel(z => Math.min(3.5, z + 0.25))}
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
                onClick={() => {
                  setZoomLevel(1.0);
                  setPanOffset({ x: 0, y: 0 });
                }}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                title="Reset View"
              >
                <Crosshair className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-800 mx-1" />
              <button
                onClick={() => {
                  setMeasuringMode(!measuringMode);
                  setMeasurePointA(null);
                  setMeasurePointB(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  measuringMode ? 'bg-orange-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>{measuringMode ? (measurePxDist !== null ? `${measurePxDist} px` : 'Click 2 pts') : 'Measure'}</span>
              </button>
            </div>

            {orbitalImageLoading && (
              <div className="absolute top-3 right-3 z-20 bg-slate-950/90 border border-cyan-500/40 px-3 py-1.5 rounded-xl text-[11px] font-mono text-cyan-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Streaming {activeLayerSpec?.shortName || 'Trek Tile'}...</span>
              </div>
            )}

            {orbitalImageError && (
              <div className="absolute top-14 left-3 right-3 z-20 bg-rose-950/90 border border-rose-500/50 px-3 py-2 rounded-xl text-[11px] font-mono text-rose-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{orbitalImageError}</span>
                </span>
                <button
                  onClick={() => setActiveLayerId('trek_hrsc_mola_clrshade')}
                  className="px-2 py-0.5 bg-rose-800/60 hover:bg-rose-700 rounded text-[10px] cursor-pointer"
                >
                  Switch to Global HRSC+MOLA
                </button>
              </div>
            )}

            {/* Outer Viewport Stage */}
            <div className="w-full min-h-[420px] max-h-[620px] bg-[#050813] flex items-center justify-center overflow-hidden p-3">
              {/* Exact Aspect-Locked Container so overlays align pixel-for-pixel with uncropped object-contain image */}
              <div
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={handleCanvasClick}
                className="relative w-full max-h-[580px] overflow-hidden cursor-grab active:cursor-grabbing select-none rounded-lg border border-slate-800/80 bg-black"
                style={{
                  aspectRatio: activeLayerId === 'active_photo' ? `${imgW} / ${imgH}` : '768 / 540'
                }}
              >
                <div
                  className="absolute inset-0 w-full h-full transition-transform duration-75"
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                    transformOrigin: 'center center'
                  }}
                >
                  {displayImageUrl ? (
                    <img
                      src={displayImageUrl}
                      alt={activeLayerSpec ? activeLayerSpec.name : activeSession.imageMetadata.fileName}
                      onLoad={() => {
                        setOrbitalImageLoading(false);
                        setOrbitalImageError(null);
                      }}
                      onError={() => {
                        setOrbitalImageLoading(false);
                        if (activeLayerId === 'trek_jezero_ctx_6m') {
                          setOrbitalImageError(
                            'Jezero CTX 6m WMTS covers Jezero Crater only (18.21°N–18.72°N, 77.16°E–77.70°E).'
                          );
                        } else if (activeLayerId !== 'active_photo') {
                          setOrbitalImageError(
                            `Unable to fetch ${activeLayerSpec?.shortName || activeLayerId} from upstream NASA/USGS service.`
                          );
                        }
                      }}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-mono text-xs p-6 text-center">
                      Upload a terrain image or pick a NASA rover photograph in MARSWALK OPS to render full-frame overlays.
                    </div>
                  )}

                  {/* Optional CV Pixel Segmentation Mask Overlay */}
                  {activeLayerId === 'active_photo' &&
                    showSegMask &&
                    activeSession.imageAnalysis.segmentationMaskUrl && (
                      <img
                        src={activeSession.imageAnalysis.segmentationMaskUrl}
                        alt="CV Segmentation Mask"
                        className="absolute inset-0 w-full h-full object-contain opacity-65 pointer-events-none"
                      />
                    )}

                  {/* AI + CV Terrain Regions Overlay */}
                  {activeLayerId === 'active_photo' &&
                    showRegionsOverlay &&
                    (activeSession.imageAnalysis.regions || []).map(reg => {
                      const isSel = selectedFeature?.kind === 'region' && selectedFeature.data.id === reg.id;
                      return (
                        <button
                          key={reg.id}
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedFeature({ kind: 'region', data: reg });
                          }}
                          className={`waypoint-marker absolute border border-dashed transition-all cursor-pointer text-left ${
                            isSel
                              ? 'border-cyan-300 bg-cyan-400/20 z-20 ring-2 ring-cyan-400/60'
                              : 'border-cyan-400/65 bg-cyan-500/5 hover:bg-cyan-500/15 z-10'
                          }`}
                          style={{
                            left: `${reg.normX * 100}%`,
                            top: `${reg.normY * 100}%`,
                            width: `${reg.normWidth * 100}%`,
                            height: `${reg.normHeight * 100}%`
                          }}
                        >
                          <span className="inline-block px-1 py-0.5 bg-slate-950/85 text-cyan-200 font-mono text-[9px] font-bold rounded-br border-r border-b border-cyan-500/40 max-w-full truncate">
                            {reg.title}
                          </span>
                        </button>
                      );
                    })}

                  {/* Crisp Yellow Bounding Boxes for Detected Boulders / Rocks */}
                  {activeLayerId === 'active_photo' &&
                    showObstaclesOverlay &&
                    activeSession.imageAnalysis.boulders.map(b => {
                      const isSel = selectedFeature?.kind === 'boulder' && selectedFeature.data.id === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedFeature({ kind: 'boulder', data: b });
                          }}
                          className={`waypoint-marker absolute border-2 transition-all cursor-pointer ${
                            isSel
                              ? 'border-yellow-300 bg-yellow-400/25 z-30 shadow-[0_0_12px_rgba(250,204,21,0.7)]'
                              : 'border-[#facc15] bg-yellow-400/10 hover:bg-yellow-400/20 z-20'
                          }`}
                          style={{
                            left: `${b.normX * 100}%`,
                            top: `${b.normY * 100}%`,
                            width: `${b.normWidth * 100}%`,
                            height: `${b.normHeight * 100}%`
                          }}
                        >
                          <span className="absolute -top-4 left-0 px-1 py-0.2 bg-yellow-400 text-black font-mono text-[8px] font-bold rounded-t whitespace-nowrap">
                            {b.label} ({Math.round(b.confidence * 100)}%)
                          </span>
                        </button>
                      );
                    })}

                  {/* Simulated Route Polyline + Footprints + Waypoints (Active Photo Mode) */}
                  {activeLayerId === 'active_photo' && automatedRoute?.isComputable && automatedRoute.path.length > 1 && (
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-20">
                      <polyline
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="0.65"
                        strokeDasharray="1.4 0.9"
                        points={automatedRoute.path.map(p => `${p.xPct},${p.yPct}`).join(' ')}
                      />
                    </svg>
                  )}

                  {activeLayerId === 'active_photo' &&
                    footprints.map((fp, idx) => {
                      const isPassed = idx <= simProgressIdx;
                      return (
                        <div
                          key={idx}
                          className="absolute z-20 pointer-events-none transition-opacity duration-300"
                          style={{
                            left: `${fp.xPct}%`,
                            top: `${fp.yPct}%`,
                            transform: `translate(-50%, -50%) rotate(${fp.angleDeg}deg)`,
                            opacity: isPassed ? 0.9 : 0.45
                          }}
                        >
                          <div
                            className={`w-3 h-4 rounded-full border border-orange-500/70 flex items-center justify-center ${
                              isPassed ? 'bg-orange-500/60 text-white' : 'bg-slate-800/60 text-slate-300'
                            }`}
                          >
                            <Footprints className="w-2 h-2" />
                          </div>
                        </div>
                      );
                    })}

                  {activeLayerId === 'active_photo' && currentAstronautPos && (
                    <div
                      className="absolute z-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-300"
                      style={{ left: `${currentAstronautPos.xPct}%`, top: `${currentAstronautPos.yPct}%` }}
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-600/50 border-2 border-orange-400 flex items-center justify-center text-white shadow-xl">
                        <User className="w-4 h-4 text-orange-100" />
                      </div>
                    </div>
                  )}

                  {activeLayerId === 'active_photo' &&
                    waypoints.map(wp => {
                      const isSelected = selectedWaypoint?.id === wp.id;
                      const isStart = wp.type === 'start';
                      const isDest = wp.type === 'destination';

                      if (isStart) {
                        return (
                          <div
                            key={wp.id}
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedWaypoint(wp);
                            }}
                            className={`absolute z-30 cursor-pointer waypoint-marker transition-transform -translate-x-1/2 -translate-y-full ${
                              isSelected ? 'scale-115' : 'hover:scale-105'
                            }`}
                            style={{ left: `${wp.xPct}%`, top: `${wp.yPct}%` }}
                          >
                            <svg width="44" height="54" viewBox="-22 -44 44 54" className="overflow-visible pointer-events-none drop-shadow-lg">
                              <defs>
                                <linearGradient id="startDropletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#60a5fa" />
                                  <stop offset="45%" stopColor="#2563eb" />
                                  <stop offset="100%" stopColor="#1e3a8a" />
                                </linearGradient>
                                <filter id="startShadow" x="-50%" y="-50%" width="200%" height="200%">
                                  <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                                  <feOffset dx="0" dy="2" />
                                  <feComponentTransfer><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
                                  <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                              </defs>
                              {/* Ground contact shadow ellipse */}
                              <ellipse cx="0" cy="2" rx="9" ry="3.5" fill="rgba(15, 23, 42, 0.7)" filter="blur(1px)" />
                              {/* 3D Inverted-Droplet Body */}
                              <path
                                d="M 0 0 C -5 -8, -11 -13, -11 -19 C -11 -25, -6 -30, 0 -30 C 6 -30, 11 -25, 11 -19 C 11 -13, 5 -8, 0 0 Z"
                                fill="url(#startDropletGrad)"
                                stroke="#ffffff"
                                strokeWidth="1.6"
                                filter="url(#startShadow)"
                              />
                              {/* White circular center ring with blue core */}
                              <circle cx="0" cy="-19" r="4.5" fill="#ffffff" />
                              <circle cx="0" cy="-19" r="2.2" fill="#1d4ed8" />
                              {/* Crisp aerospace label badge */}
                              <rect x="-18" y="-43" width="36" height="11" rx="3" fill="#0B1021" stroke="#38bdf8" strokeWidth="0.9" />
                              <text x="0" y="-35" textAnchor="middle" fill="#38bdf8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">START</text>
                            </svg>
                          </div>
                        );
                      }

                      if (isDest) {
                        return (
                          <div
                            key={wp.id}
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedWaypoint(wp);
                            }}
                            className={`absolute z-30 cursor-pointer waypoint-marker transition-transform -translate-x-1/2 -translate-y-full ${
                              isSelected ? 'scale-115' : 'hover:scale-105'
                            }`}
                            style={{ left: `${wp.xPct}%`, top: `${wp.yPct}%` }}
                          >
                            <svg width="52" height="54" viewBox="-26 -44 52 54" className="overflow-visible pointer-events-none drop-shadow-lg">
                              <defs>
                                <linearGradient id="destDropletGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#f87171" />
                                  <stop offset="45%" stopColor="#dc2626" />
                                  <stop offset="100%" stopColor="#7f1d1d" />
                                </linearGradient>
                                <filter id="destShadow" x="-50%" y="-50%" width="200%" height="200%">
                                  <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                                  <feOffset dx="0" dy="2" />
                                  <feComponentTransfer><feFuncA type="linear" slope="0.6" /></feComponentTransfer>
                                  <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                              </defs>
                              {/* Ground contact shadow ellipse */}
                              <ellipse cx="0" cy="2" rx="9" ry="3.5" fill="rgba(15, 23, 42, 0.7)" filter="blur(1px)" />
                              {/* 3D Inverted-Droplet Body */}
                              <path
                                d="M 0 0 C -5 -8, -11 -13, -11 -19 C -11 -25, -6 -30, 0 -30 C 6 -30, 11 -25, 11 -19 C 11 -13, 5 -8, 0 0 Z"
                                fill="url(#destDropletGrad)"
                                stroke="#ffffff"
                                strokeWidth="1.6"
                                filter="url(#destShadow)"
                              />
                              {/* White circular center ring with deep red core */}
                              <circle cx="0" cy="-19" r="4.5" fill="#ffffff" />
                              <circle cx="0" cy="-19" r="2.2" fill="#991b1b" />
                              {/* Crisp aerospace label badge */}
                              <rect x="-24" y="-43" width="48" height="11" rx="3" fill="#0B1021" stroke="#f87171" strokeWidth="0.9" />
                              <text x="0" y="-35" textAnchor="middle" fill="#f87171" fontSize="7" fontFamily="monospace" fontWeight="bold">DESTINATION</text>
                            </svg>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={wp.id}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedWaypoint(wp);
                          }}
                          className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer waypoint-marker transition-transform ${
                            isSelected ? 'scale-125' : 'hover:scale-110'
                          }`}
                          style={{ left: `${wp.xPct}%`, top: `${wp.yPct}%` }}
                        >
                          <div className="w-6 h-6 rounded-full bg-emerald-500/30 border-2 border-emerald-400 text-emerald-100 flex items-center justify-center shadow-lg font-mono text-[9px] font-bold">
                            <Target className="w-3 h-3 text-emerald-300" />
                          </div>
                        </div>
                      );
                    })}

                  {/* Measuring Line Overlay */}
                  {measuringMode && measurePointA && measurePointB && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
                      <line
                        x1={measurePointA.x}
                        y1={measurePointA.y}
                        x2={measurePointB.x}
                        y2={measurePointB.y}
                        stroke="#fb923c"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom HUD Coordinate & Elevation Bar */}
            <div className="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 text-[11px] font-mono text-slate-300 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 text-cyan-400">
                  <MapPin className="w-3.5 h-3.5" />
                  {hoverGeo
                    ? `${hoverGeo.lat.toFixed(4)}°N, ${hoverGeo.lon.toFixed(4)}°E`
                    : hoverCoord
                      ? `Frame X: ${hoverCoord.xPct}%, Y: ${hoverCoord.yPct}%`
                      : 'Hover or click viewport'}
                </span>
                <span>·</span>
                <span>Zoom: {(zoomLevel * 100).toFixed(0)}%</span>
                {activeLayerSpec && (
                  <>
                    <span>·</span>
                    <span className="text-amber-300">{activeLayerSpec.resolutionLabel}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isSamplingElev ? (
                  <span className="text-cyan-300 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Sampling MOLA...
                  </span>
                ) : activeLayerId !== 'active_photo' && pointElevation?.calibrated ? (
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <Mountain className="w-3.5 h-3.5" />
                    {pointElevation.elevationM} m ({pointElevation.datum}) at {pointElevation.lat}°N, {pointElevation.lon}°E
                  </span>
                ) : (
                  <span className="text-slate-400">
                    {activeLayerId !== 'active_photo'
                      ? 'Click orbital map to sample NASA MOLA DEM elevation'
                      : 'Pixel coordinates only (Visual estimate — no calibrated DEM attached)'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Provenance & Calibration Footer */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-mono text-slate-300">
            <div className="flex items-start sm:items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                {activeLayerSpec
                  ? `${activeLayerSpec.provider} · ${activeLayerSpec.instrument} · ${activeLayerSpec.crs}`
                  : `Surface Photo: ${activeSession.imageMetadata.source} · ${activeSession.provenance.rover} (${activeSession.provenance.camera})`}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] shrink-0">
              {activeLayerSpec ? activeLayerSpec.calibrationStatus : '2D Optical Frame (Visual Estimate)'}
            </span>
          </div>
        </div>

        {/* Right Column: Selected Feature Inspector, Regional Context & Route Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Interactive Selected Obstacle / Region Inspector */}
          {selectedFeature && (
            <div className="bg-[#0B1021] border border-yellow-400/50 rounded-2xl p-4 space-y-3 font-mono text-xs shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] font-bold text-yellow-300 uppercase tracking-wider">
                  {selectedFeature.kind === 'boulder' ? 'Obstacle Inspection' : 'Terrain Region Inspection'}
                </span>
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {selectedFeature.kind === 'boulder' ? (
                <div className="space-y-2">
                  <strong className="text-white text-sm block">{selectedFeature.data.label}</strong>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[9px] block">CATEGORY</span>
                      <span className="text-yellow-300">{selectedFeature.data.sizeCategory?.replace('_', ' ') || selectedFeature.data.classification}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[9px] block">METHOD</span>
                      <span className="text-cyan-300">{selectedFeature.data.detectionMethod || 'CV Localizer'}</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[9px] block">CONFIDENCE</span>
                      <span className="text-white">{(selectedFeature.data.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-400 text-[9px] block">HAZARD STATUS</span>
                      <span className="text-amber-300">{selectedFeature.data.hazardStatus || 'Obstacle'}</span>
                    </div>
                  </div>
                  <p className="text-[11px] font-sans text-slate-300">
                    {selectedFeature.data.traversalRelevance || selectedFeature.data.dimensionsNote}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <strong className="text-white text-sm block">{selectedFeature.data.title}</strong>
                  <span className="text-cyan-300 text-[11px] block">
                    {selectedFeature.data.classification} · {selectedFeature.data.locationDescription}
                  </span>
                  <p className="text-[11px] font-sans text-slate-300">{selectedFeature.data.visualCharacteristics}</p>
                  <p className="text-[11px] font-sans text-emerald-300">{selectedFeature.data.scientificSignificance}</p>
                  <p className="text-[11px] font-sans text-amber-300">{selectedFeature.data.roverTraversalConcerns}</p>
                </div>
              )}
            </div>
          )}

          {/* Geologic Context Card */}
          <div className="bg-[#0B1021] border border-cyan-500/30 rounded-2xl p-4 space-y-3 font-mono text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                USGS Regional Context
              </span>
              <span className="text-[10px] text-slate-400">
                {isCoordsUnavailable ? 'Coordinates Unavailable' : usgsGeology?.quadrangle || 'USGS SIM 3292'}
              </span>
            </div>

            {isCoordsUnavailable ? (
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 font-sans">
                No verified geological classification available for this location. Upload lacks planetocentric coordinates.
              </div>
            ) : usgsGeology?.units && usgsGeology.units.length > 0 ? (
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    Unit {usgsGeology.units[0].unitSymbol}
                  </span>
                  <span className="text-[10px] text-slate-400">{usgsGeology.units[0].epoch}</span>
                </div>
                <strong className="text-white text-xs block">{usgsGeology.units[0].unitName}</strong>
                <p className="text-[11px] font-sans text-slate-300 leading-snug">{usgsGeology.units[0].lithology}</p>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                {usgsGeology?.note || 'No verified geological classification available for this location.'}
              </div>
            )}

            <button
              onClick={() => selectedRegion && loadRegionIntoWorkspace(selectedRegion.id)}
              className="w-full py-2 rounded-xl bg-orange-600/25 hover:bg-orange-600/40 border border-orange-500/50 text-orange-200 font-bold text-[11px] transition-colors cursor-pointer"
            >
              Load Region Reference into MARSWALK OPS
            </button>
          </div>

          {/* Dynamic Route Intelligence & Waypoint Card */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                Simulated / Planned Route
              </h3>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Simulated / Planned
              </span>
            </div>

            {automatedRoute?.isComputable ? (
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Estimated Distance:</span>
                  <strong className="text-cyan-300">{automatedRoute.distanceMeters} m</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Est. EVA Time:</span>
                  <strong className="text-emerald-400">{automatedRoute.estimatedMins} mins</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Safety Score:</span>
                  <strong className="text-orange-300">
                    {automatedRoute.safetyScore !== null ? `${automatedRoute.safetyScore}%` : 'Unavailable'}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Max Slope:</span>
                  <strong className="text-slate-400">
                    {automatedRoute.maxSlopeDeg !== null ? `${automatedRoute.maxSlopeDeg}°` : 'Unavailable (No DEM)'}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs font-mono text-slate-400">
                {automatedRoute?.unavailableReason || 'Safety score unavailable — insufficient terrain data.'}
              </div>
            )}

            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {waypoints.length === 0 ? (
                <p className="text-xs font-mono text-slate-500">No waypoints generated yet.</p>
              ) : (
                waypoints.map(wp => (
                  <div
                    key={wp.id}
                    onClick={() => setSelectedWaypoint(wp)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      selectedWaypoint?.id === wp.id
                        ? 'bg-cyan-950/30 border-cyan-500/60'
                        : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/40'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300">
                          {wp.type}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">{wp.name}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 block">
                        X: {wp.xPct}%, Y: {wp.yPct}%
                      </span>
                    </div>
                    <Target className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
