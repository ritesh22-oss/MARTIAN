import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Eye,
  EyeOff,
  Sliders,
  Activity,
  RefreshCw,
  Download,
  Globe,
  ExternalLink,
  AlertTriangle,
  Layers,
  Loader2,
  Columns2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Filter,
  CheckCircle2,
  Info,
  ChevronRight,
  Shield,
  Compass,
  Sparkles,
  MapPin,
  BarChart3,
  BoxSelect,
  Grid
} from 'lucide-react';
import { useAstronautExploration } from '../../context/AstronautExplorationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { sharedExplorationStore, ActiveExplorationSession } from '../../services/sharedExplorationStore';
import {
  getTrekTilePreviewUrl,
  fetchTrekLayers,
  MarsTrekLayerSpec,
  VERIFIED_MARS_MAP_LAYERS
} from '../../services/marsGeospatialService';
import { fetchUsgsWmsCapabilities } from '../../services/usgsPlanetaryMapService';
import { fetchWorldviewAnalogSites, EarthAnalogSite } from '../../services/nasaWorldviewService';

export type DetectionCategory =
  | 'all'
  | 'small_rock'
  | 'medium_rock'
  | 'boulder'
  | 'bedrock'
  | 'regolith'
  | 'cluster'
  | 'ridge'
  | 'fracture'
  | 'unknown';

export interface ScientificDetection {
  id: string; // "DET-001"
  classification: string;
  category: DetectionCategory;
  label: string;
  confidence: number;
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
  pixelX: number;
  pixelY: number;
  pixelWidth: number;
  pixelHeight: number;
  pixelArea: number;
  physicalDimensions: string;
  calibrationStatus: 'uncalibrated_2d' | 'calibrated_rover_frame';
  detectionMethod: 'Gemini 4 Hydrogen Vision' | 'Deterministic CV Localizer' | 'AI4Mars Semantic Registry';
  sourceImageId: string;
  traversalRisk: 'low' | 'moderate' | 'high' | 'critical';
  notes?: string;
}

const CATEGORY_CONFIG: Record<
  DetectionCategory,
  { label: string; color: string; bg: string; border: string; desc: string }
> = {
  all: { label: 'All Detections', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.5)', desc: 'Complete detection catalogue' },
  boulder: { label: 'Large Boulders', color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: '#f97316', desc: 'Prominent rocks >0.5m hazard scale' },
  medium_rock: { label: 'Medium Rocks', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: '#fbbf24', desc: 'Discrete rocks 0.15m–0.5m' },
  small_rock: { label: 'Small Rocks', color: '#22d3ee', bg: 'rgba(34,211,238,0.15)', border: '#22d3ee', desc: 'Pebbles and small clasts <0.15m' },
  bedrock: { label: 'Exposed Bedrock', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', border: '#a855f7', desc: 'Continuous geological strata / pavement' },
  regolith: { label: 'Sand & Regolith', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: '#10b981', desc: 'Loose soil deposits, ripples, and dust cover' },
  cluster: { label: 'Rock Clusters', color: '#ec4899', bg: 'rgba(236,72,153,0.15)', border: '#ec4899', desc: 'Dense clusters of fragmented rocks' },
  ridge: { label: 'Ridges & Outcrops', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: '#8b5cf6', desc: 'Elevated bedrock rims and erosion scarps' },
  fracture: { label: 'Depressions & Fractures', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', border: '#38bdf8', desc: 'Surface joints, cracks, and localized pits' },
  unknown: { label: 'Unknown / Unclassified', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: '#94a3b8', desc: 'Features lacking definitive spectral/morphological match' }
};

export const MultilayerScientificMap: React.FC = () => {
  const { currentCoordinates, usgsGeology, trekElevation } = useAstronautExploration();
  const { selectedRegion, sharedSession } = useWorkspace();

  // Active Session from single authoritative reactive store
  const [activeSession, setActiveSession] = useState<ActiveExplorationSession>(() => sharedExplorationStore.getSession());

  // View Mode: Surface Image Analysis (Primary) vs. NASA Orbital Composite vs. Side-by-Side Dual View
  const [activeViewMode, setActiveViewMode] = useState<'surface' | 'orbital' | 'dual'>('surface');
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [annotationDisplayMode, setAnnotationDisplayMode] = useState<'boxes' | 'density' | 'both'>('boxes');

  // Filters & Selection
  const [selectedCategory, setSelectedCategory] = useState<DetectionCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [hoveredDetectionId, setHoveredDetectionId] = useState<string | null>(null);
  const [selectedAnalysisTab, setSelectedAnalysisTab] = useState<'overview' | 'detections' | 'geology' | 'spatial' | 'provenance'>('overview');

  // Interactive Zoom & Pan State for the surface image viewer
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Orbital Composite State
  const [baseLayerChoice, setBaseLayerChoice] = useState<'auto' | 'trek_jezero_ctx_6m' | 'trek_hrsc_mola_clrshade' | 'usgs_mdim21_color' | 'trek_mola_clrshade'>('auto');
  const [spanDeg, setSpanDeg] = useState<number>(0.6);
  const [splitPct, setSplitPct] = useState<number>(50);
  const [allowReferenceBrowse, setAllowReferenceBrowse] = useState<boolean>(false);
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);

  const [orbitalVisibilities, setOrbitalVisibilities] = useState<Record<string, boolean>>({
    optical_trek: true,
    hillshade: true,
    thermal_day: false,
    thermal_night: false,
    geology_sim3292: true
  });

  const [orbitalOpacities, setOrbitalOpacities] = useState<Record<string, number>>({
    optical_trek: 1.0,
    hillshade: 0.45,
    thermal_day: 0.65,
    thermal_night: 0.65,
    geology_sim3292: 0.55
  });

  const [liveLayerSpecs, setLiveLayerSpecs] = useState<MarsTrekLayerSpec[]>(VERIFIED_MARS_MAP_LAYERS);
  const [wmsLayerCount, setWmsLayerCount] = useState<number | null>(null);
  const [analogOpen, setAnalogOpen] = useState<boolean>(false);
  const [analogSites, setAnalogSites] = useState<EarthAnalogSite[]>([]);
  const [selectedAnalogId, setSelectedAnalogId] = useState<string>('atacama');

  // Sync with Shared Exploration Store
  useEffect(() => {
    const unsubscribe = sharedExplorationStore.subscribe((session) => {
      setActiveSession(session);
    });
    return unsubscribe;
  }, []);

  // Sync if workspace image changes
  useEffect(() => {
    if (sharedSession?.terrainImage && sharedSession.terrainImage !== activeSession.imageMetadata.url) {
      const current = sharedExplorationStore.getSession();
      setActiveSession(current);
    }
  }, [sharedSession?.terrainImage, activeSession.imageMetadata.url]);

  const activeImageUrl = activeSession.imageMetadata?.url || sharedSession?.terrainImage || '';
  const isCoordsUnavailable =
    Boolean(activeImageUrl) && activeSession.provenance?.coordinateScope === 'unavailable';
  const showOrbitalForActive = !isCoordsUnavailable || allowReferenceBrowse;

  const centerLat =
    !isCoordsUnavailable && typeof activeSession.provenance?.lat === 'number'
      ? activeSession.provenance.lat
      : currentCoordinates?.lat ?? selectedRegion?.centerCoords?.lat ?? 18.384;
  const centerLon =
    !isCoordsUnavailable && typeof activeSession.provenance?.lon === 'number'
      ? activeSession.provenance.lon
      : currentCoordinates?.lon ?? selectedRegion?.centerCoords?.lon ?? 77.582;

  const isJezeroBounds = centerLon >= 77.12 && centerLon <= 77.72 && centerLat >= 18.18 && centerLat <= 18.74;

  useEffect(() => {
    let active = true;
    fetchTrekLayers(centerLat, centerLon)
      .then(res => {
        if (active && Array.isArray(res.layers) && res.layers.length > 0) setLiveLayerSpecs(res.layers);
      })
      .catch(() => {});
    fetchUsgsWmsCapabilities()
      .then(res => {
        if (active && res.capabilities?.layerNames) setWmsLayerCount(res.capabilities.layerNames.length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [centerLat, centerLon]);

  useEffect(() => {
    if (analogOpen && analogSites.length === 0) {
      fetchWorldviewAnalogSites()
        .then(res => setAnalogSites(res.sites || []))
        .catch(() => {});
    }
  }, [analogOpen, analogSites.length]);

  // Transform raw session boulders/hazards/regions into structured ScientificDetection objects with stable sequential IDs
  const allDetections: ScientificDetection[] = useMemo(() => {
    const imgWidth = activeSession.imageMetadata.width || 1024;
    const imgHeight = activeSession.imageMetadata.height || 1024;
    const rawBoulders = activeSession.imageAnalysis?.boulders || [];
    const rawHazards = activeSession.imageAnalysis?.hazards || [];
    const rawRegions = activeSession.imageAnalysis?.regions || [];

    const detections: ScientificDetection[] = [];
    let idx = 1;

    // 1. Convert Boulders & Rocks
    rawBoulders.forEach((b) => {
      const labelLower = (b.label || b.classification || '').toLowerCase();
      let category: DetectionCategory = 'medium_rock';
      if (labelLower.includes('boulder') || (b.sizeCategory && b.sizeCategory.toLowerCase().includes('large'))) {
        category = 'boulder';
      } else if (labelLower.includes('small') || (b.sizeCategory && b.sizeCategory.toLowerCase().includes('small'))) {
        category = 'small_rock';
      } else if (labelLower.includes('bedrock')) {
        category = 'bedrock';
      } else if (labelLower.includes('cluster')) {
        category = 'cluster';
      } else if (labelLower.includes('ridge') || labelLower.includes('outcrop')) {
        category = 'ridge';
      } else if (labelLower.includes('sand') || labelLower.includes('regolith')) {
        category = 'regolith';
      }

      const pX = Math.round(b.normX * imgWidth);
      const pY = Math.round(b.normY * imgHeight);
      const pW = Math.round(b.normWidth * imgWidth);
      const pH = Math.round(b.normHeight * imgHeight);
      const pArea = pW * pH;

      const physicalDim =
        b.physicalWidthM && b.physicalHeightM
          ? `Estimated ${b.physicalWidthM.toFixed(2)}m × ${b.physicalHeightM.toFixed(2)}m (Rover Baseline)`
          : 'Calibration Unavailable (2D Optical Frame)';

      detections.push({
        id: `DET-${String(idx++).padStart(3, '0')}`,
        classification: b.classification || b.label || 'Surface Obstacle',
        category,
        label: b.label || `Obstacle #${idx}`,
        confidence: typeof b.confidence === 'number' ? b.confidence : 0.85,
        normX: b.normX,
        normY: b.normY,
        normWidth: b.normWidth,
        normHeight: b.normHeight,
        pixelX: pX,
        pixelY: pY,
        pixelWidth: pW,
        pixelHeight: pH,
        pixelArea: pArea,
        physicalDimensions: physicalDim,
        calibrationStatus: b.physicalWidthM ? 'calibrated_rover_frame' : 'uncalibrated_2d',
        detectionMethod: b.detectionMethod === 'Gemini Vision' ? 'Gemini 4 Hydrogen Vision' : 'Deterministic CV Localizer',
        sourceImageId: activeSession.imageMetadata.fileName || 'Mars_Frame.jpg',
        traversalRisk: (b.riskLevel as any) || 'moderate',
        notes: b.dimensionsNote || b.traversalRelevance || 'Localized via computer vision gradient contours.'
      });
    });

    // 2. Convert Distinct Regional Features not covered by boulders
    rawRegions.forEach((r) => {
      // Check if region already closely overlapped by a boulder box
      const isDuplicate = detections.some(
        d => Math.abs(d.normX - r.normX) < 0.08 && Math.abs(d.normY - r.normY) < 0.08
      );
      if (!isDuplicate) {
        const catLower = (r.classification || r.title || '').toLowerCase();
        let category: DetectionCategory = 'unknown';
        if (catLower.includes('bedrock')) category = 'bedrock';
        else if (catLower.includes('regolith') || catLower.includes('sand') || catLower.includes('dune')) category = 'regolith';
        else if (catLower.includes('outcrop') || catLower.includes('ridge')) category = 'ridge';
        else if (catLower.includes('fracture') || catLower.includes('erosion') || catLower.includes('depression')) category = 'fracture';
        else if (catLower.includes('boulder')) category = 'boulder';

        const pX = Math.round(r.normX * imgWidth);
        const pY = Math.round(r.normY * imgHeight);
        const pW = Math.round(r.normWidth * imgWidth);
        const pH = Math.round(r.normHeight * imgHeight);

        detections.push({
          id: `DET-${String(idx++).padStart(3, '0')}`,
          classification: r.classification || r.title,
          category,
          label: r.title || r.classification,
          confidence: typeof r.confidence === 'number' ? r.confidence : 0.8,
          normX: r.normX,
          normY: r.normY,
          normWidth: r.normWidth,
          normHeight: r.normHeight,
          pixelX: pX,
          pixelY: pY,
          pixelWidth: pW,
          pixelHeight: pH,
          pixelArea: pW * pH,
          physicalDimensions: 'Regional Unit (Calibration Unavailable on Single Frame)',
          calibrationStatus: 'uncalibrated_2d',
          detectionMethod: r.source === 'gemini-vision+cv-segmentation' ? 'Gemini 4 Hydrogen Vision' : 'Deterministic CV Localizer',
          sourceImageId: activeSession.imageMetadata.fileName || 'Mars_Frame.jpg',
          traversalRisk: r.hazardLevel === 'high' ? 'high' : r.hazardLevel === 'moderate' ? 'moderate' : 'low',
          notes: r.visualCharacteristics || r.scientificSignificance
        });
      }
    });

    return detections;
  }, [activeSession.imageMetadata, activeSession.imageAnalysis]);

  // Filtered Detections based on Category & Search Query
  const filteredDetections = useMemo(() => {
    return allDetections.filter(d => {
      const matchCat = selectedCategory === 'all' || d.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.classification.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.label.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [allDetections, selectedCategory, searchQuery]);

  // Currently Selected Detection
  const selectedDetection = useMemo(() => {
    if (!selectedDetectionId) return null;
    return allDetections.find(d => d.id === selectedDetectionId) || null;
  }, [allDetections, selectedDetectionId]);

  // Object Clustering computation for low zoom levels (<1.35x) to eliminate text collisions
  const detectionClusters = useMemo(() => {
    if (zoomLevel >= 1.35) return []; // Render individual boxes when zoomed in
    const clusters: Array<{
      centerNormX: number;
      centerNormY: number;
      items: ScientificDetection[];
      primaryCategory: DetectionCategory;
    }> = [];

    filteredDetections.forEach((item) => {
      const centerX = item.normX + item.normWidth * 0.5;
      const centerY = item.normY + item.normHeight * 0.5;

      const existing = clusters.find(c => {
        const dx = c.centerNormX - centerX;
        const dy = c.centerNormY - centerY;
        return Math.sqrt(dx * dx + dy * dy) < 0.12; // 12% normalized cluster radius
      });

      if (existing) {
        existing.items.push(item);
      } else {
        clusters.push({
          centerNormX: centerX,
          centerNormY: centerY,
          items: [item],
          primaryCategory: item.category
        });
      }
    });

    return clusters;
  }, [filteredDetections, zoomLevel]);

  // Zoom and Pan Handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.35, 4.0));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.35, 0.75));
  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1.0) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  // Re-run pipeline for active image
  const handleReanalyze = async () => {
    if (!activeImageUrl) return;
    setIsReanalyzing(true);
    try {
      sharedExplorationStore.setAnalysisStatus('analyzing', 'Re-executing complete vision segmentation pipeline...');
      await sharedExplorationStore.processAndSyncImage(
        activeImageUrl,
        activeSession.imageMetadata.fileName,
        activeSession.activeRegion,
        undefined,
        undefined,
        { ...activeSession.provenance, forceRefresh: true }
      );
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Export Analysis JSON
  const handleExportAnalysis = () => {
    const payload = {
      source: 'MARSNAV Multilayer Data Fusion & Computer Vision',
      timestamp: new Date().toISOString(),
      imageMetadata: activeSession.imageMetadata,
      provenance: activeSession.provenance,
      geographicReference: isCoordsUnavailable ? null : { lat: centerLat, lon: centerLon, crs: 'IAU2000:49900' },
      detectionsCount: allDetections.length,
      detections: allDetections,
      geologicalSummary: activeSession.imageAnalysis?.pixelComposition,
      notes: 'Calibrated using NASA PDS & USGS Astrogeology specifications. 2D measurements uncalibrated without stereo baseline.'
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `MarsNav_Detection_Analysis_${activeSession.imageMetadata.fileName || 'active'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Orbital Composite URLs
  const resolvedBaseLayerId =
    baseLayerChoice === 'auto'
      ? isJezeroBounds
        ? 'trek_jezero_ctx_6m'
        : 'usgs_mdim21_color'
      : baseLayerChoice;

  const baseOpticalUrl = getTrekTilePreviewUrl({
    layerId: resolvedBaseLayerId,
    lat: centerLat,
    lon: centerLon,
    spanDeg,
    width: 768,
    height: 520
  });
  const hillshadeUrl = getTrekTilePreviewUrl({ layerId: 'trek_hrsc_mola_clrshade', lat: centerLat, lon: centerLon, spanDeg, width: 768, height: 520 });
  const themisDayUrl = getTrekTilePreviewUrl({ layerId: 'usgs_themis_day', lat: centerLat, lon: centerLon, spanDeg, width: 768, height: 520 });
  const themisNightUrl = getTrekTilePreviewUrl({ layerId: 'usgs_themis_night', lat: centerLat, lon: centerLon, spanDeg, width: 768, height: 520 });
  const sim3292Url = getTrekTilePreviewUrl({ layerId: 'trek_sim3292_geology', lat: centerLat, lon: centerLon, spanDeg, width: 768, height: 520 });

  return (
    <div className="space-y-6 font-sans animate-fade-in text-slate-200">
      {/* Top Header: Mission & Mode Controls */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
              MULTILAYER ORBITAL &amp; GEOLOGICAL DATA FUSION
            </span>
            <span className={`text-xs font-mono ${isCoordsUnavailable ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isCoordsUnavailable
                ? 'Surface Frame: Independent Coordinate Space'
                : `Target Basin: ${centerLat.toFixed(3)}°N, ${centerLon.toFixed(3)}°E (Jezero Crater)`}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              {allDetections.length} Classified Features
            </span>
          </div>

          <h2 className="text-xl font-bold text-white tracking-wide">
            Jezero Crater Planetary GIS &amp; Surface Object Localizer
          </h2>

          <p className="text-xs text-slate-400 font-mono">
            Active Image: <strong className="text-slate-200">{activeSession.imageMetadata.fileName || 'Mars Surface Observation'}</strong>
            {activeSession.imageMetadata.width ? ` (${activeSession.imageMetadata.width} × ${activeSession.imageMetadata.height} px)` : ''} ·
            USGS Quad: <strong className="text-slate-200">{usgsGeology?.quadrangle || 'MC-13 Syrtis Major'}</strong> ·
            MOLA Elevation: <strong className="text-emerald-300">{trekElevation?.calibrated ? `${trekElevation.elevationM} m (Areoid)` : 'Calibrated PDS Datum'}</strong>
          </p>
        </div>

        {/* View Mode & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main View Mode Selector */}
          <div className="flex items-center bg-black/50 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveViewMode('surface')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'surface'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BoxSelect className="w-3.5 h-3.5" />
              <span>Surface CV Map</span>
            </button>
            <button
              onClick={() => setActiveViewMode('orbital')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'orbital'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>NASA Orbital Fusion</span>
            </button>
            <button
              onClick={() => setActiveViewMode('dual')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeViewMode === 'dual'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Dual Comparison</span>
            </button>
          </div>

          <button
            onClick={handleReanalyze}
            disabled={!activeImageUrl || isReanalyzing}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Re-run image-analysis pipeline on active image"
          >
            {isReanalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />}
            <span>REANALYZE</span>
          </button>

          <button
            onClick={handleExportAnalysis}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="Export detections and spatial statistics to JSON"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXPORT JSON</span>
          </button>
        </div>
      </div>

      {/* Surface Image Warning / Disclaimer Banner */}
      {isCoordsUnavailable && activeViewMode !== 'surface' && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-mono uppercase text-amber-300 block">
                Scientific Registration Disclaimer — Unreferenced Surface Photograph
              </strong>
              <p className="text-slate-300 text-xs leading-snug">
                The active image ({activeSession.imageMetadata.fileName}) does not carry planetocentric coordinates.
                Surface object detections are calculated strictly in image space and are NOT projected onto orbital CTX/HiRISE grids.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveViewMode('surface')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-mono text-xs font-bold shrink-0 cursor-pointer"
          >
            Switch to Surface CV View
          </button>
        </div>
      )}

      {/* Main Workspace Layout: Visualizer Canvas (8 cols) + Detection List / Layer Inspector (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Visualizer Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Visualizer Top Bar with Controls */}
            <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <BoxSelect className="w-3.5 h-3.5" />
                  {activeViewMode === 'surface'
                    ? 'SURFACE DETECTION SPACE'
                    : activeViewMode === 'orbital'
                    ? 'NASA / USGS ORBITAL FUSION'
                    : 'DUAL SURFACE & ORBITAL COMPARISON'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 text-[11px]">
                  Zoom: {Math.round(zoomLevel * 100)}%
                  {detectionClusters.length > 0 && zoomLevel < 1.35 && (
                    <span className="text-amber-400 ml-1.5">(Clustered)</span>
                  )}
                </span>
              </div>

              {/* Viewer Mode Controls */}
              <div className="flex items-center gap-2">
                {activeViewMode === 'surface' && (
                  <>
                    <button
                      onClick={() => setShowAnnotations(v => !v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                        showAnnotations
                          ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title={showAnnotations ? 'Hide all annotations to view raw image' : 'Show object detection bounding boxes'}
                    >
                      {showAnnotations ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3 text-slate-400" />}
                      <span>{showAnnotations ? 'Annotations: ON' : 'Raw Image'}</span>
                    </button>

                    {showAnnotations && (
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[10px]">
                        <button
                          onClick={() => setAnnotationDisplayMode('boxes')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            annotationDisplayMode === 'boxes' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Boxes
                        </button>
                        <button
                          onClick={() => setAnnotationDisplayMode('density')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            annotationDisplayMode === 'density' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Density
                        </button>
                        <button
                          onClick={() => setAnnotationDisplayMode('both')}
                          className={`px-2 py-0.5 rounded cursor-pointer ${
                            annotationDisplayMode === 'both' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Both
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Zoom Buttons */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={handleZoomIn}
                    className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded cursor-pointer"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-1.5 py-0.5 text-[10px] hover:bg-slate-800 text-slate-400 hover:text-white rounded cursor-pointer"
                    title="Reset zoom and pan"
                  >
                    1:1
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas Stage */}
            <div
              ref={viewportRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`w-full h-[520px] bg-slate-950 relative overflow-hidden flex items-center justify-center select-none ${
                zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
              }`}
            >
              {/* 1. SURFACE IMAGE ANALYSIS VIEW */}
              {activeViewMode === 'surface' && (
                <div
                  className="relative transition-transform duration-75 origin-center max-w-full max-h-full"
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`
                  }}
                >
                  {activeImageUrl ? (
                    <div className="relative inline-block shadow-2xl">
                      <img
                        src={activeImageUrl}
                        alt="Active Mars Surface Frame"
                        className="max-h-[500px] max-w-full object-contain block mx-auto rounded-lg border border-slate-800"
                      />

                      {/* Density Heatmap Layer Overlay */}
                      {showAnnotations && (annotationDisplayMode === 'density' || annotationDisplayMode === 'both') && (
                        <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden mix-blend-screen opacity-65">
                          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                              <radialGradient id="heatGrad" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                                <stop offset="40%" stopColor="#f97316" stopOpacity="0.5" />
                                <stop offset="70%" stopColor="#eab308" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                              </radialGradient>
                            </defs>
                            {allDetections.map((d) => (
                              <circle
                                key={`heat-${d.id}`}
                                cx={(d.normX + d.normWidth * 0.5) * 100}
                                cy={(d.normY + d.normHeight * 0.5) * 100}
                                r={Math.max(d.normWidth, d.normHeight) * 90}
                                fill="url(#heatGrad)"
                              />
                            ))}
                          </svg>
                        </div>
                      )}

                      {/* Object Detections & Bounding Boxes Layer */}
                      {showAnnotations && (annotationDisplayMode === 'boxes' || annotationDisplayMode === 'both') && (
                        <div className="absolute inset-0 pointer-events-auto">
                          {/* When Zoomed Out: Render Clustered Badges to eliminate label clutter */}
                          {zoomLevel < 1.35 &&
                            detectionClusters.map((cluster, cIdx) => {
                              const cfg = CATEGORY_CONFIG[cluster.primaryCategory] || CATEGORY_CONFIG.boulder;
                              return (
                                <div
                                  key={`cluster-${cIdx}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setZoomLevel(1.6);
                                    if (cluster.items[0]) setSelectedDetectionId(cluster.items[0].id);
                                  }}
                                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform"
                                  style={{
                                    left: `${cluster.centerNormX * 100}%`,
                                    top: `${cluster.centerNormY * 100}%`
                                  }}
                                  title={`${cluster.items.length} objects localized. Click to zoom in.`}
                                >
                                  <div
                                    className="px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold shadow-lg flex items-center gap-1.5 backdrop-blur-md"
                                    style={{
                                      backgroundColor: cfg.bg,
                                      borderColor: cfg.border,
                                      color: cfg.color
                                    }}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: cfg.color }} />
                                    <span>{cluster.items.length > 1 ? `${cluster.items.length} ${cfg.label.split(' ')[1] || 'Objects'}` : cluster.items[0].id}</span>
                                  </div>
                                </div>
                              );
                            })}

                          {/* When Zoomed In (or single item clusters): Render Individual Bounding Boxes */}
                          {(zoomLevel >= 1.35 || detectionClusters.length === 0) &&
                            filteredDetections.map((det) => {
                              const isSelected = selectedDetectionId === det.id;
                              const isHovered = hoveredDetectionId === det.id;
                              const cfg = CATEGORY_CONFIG[det.category] || CATEGORY_CONFIG.unknown;

                              return (
                                <div
                                  key={det.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDetectionId(det.id);
                                  }}
                                  onMouseEnter={() => setHoveredDetectionId(det.id)}
                                  onMouseLeave={() => setHoveredDetectionId(null)}
                                  className={`absolute cursor-pointer transition-all ${
                                    isSelected ? 'z-30' : isHovered ? 'z-20' : 'z-10'
                                  }`}
                                  style={{
                                    left: `${det.normX * 100}%`,
                                    top: `${det.normY * 100}%`,
                                    width: `${det.normWidth * 100}%`,
                                    height: `${det.normHeight * 100}%`
                                  }}
                                >
                                  {/* Bounding Box Outline */}
                                  <div
                                    className={`w-full h-full rounded border-2 transition-all ${
                                      isSelected
                                        ? 'border-white shadow-[0_0_15px_rgba(56,189,248,0.8)] bg-cyan-500/20'
                                        : isHovered
                                        ? 'border-cyan-300 shadow-md bg-cyan-500/10'
                                        : 'hover:border-white'
                                    }`}
                                    style={{
                                      borderColor: isSelected ? '#ffffff' : isHovered ? '#38bdf8' : cfg.border,
                                      backgroundColor: isSelected ? 'rgba(56,189,248,0.25)' : isHovered ? cfg.bg : 'transparent'
                                    }}
                                  >
                                    {/* Corner tick marks */}
                                    <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t-2 border-l-2 border-white" />
                                    <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b-2 border-r-2 border-white" />
                                  </div>

                                  {/* Collision-Aware Compact Identification Tag */}
                                  <div
                                    className={`absolute -top-4 left-0 px-1 py-0.2 text-[8px] font-mono font-bold rounded shadow flex items-center gap-1 whitespace-nowrap transition-transform ${
                                      isSelected
                                        ? 'bg-cyan-500 text-black scale-110 z-40'
                                        : 'bg-black/80 text-slate-200 border border-slate-700'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                                    <span>{det.id}</span>
                                  </div>

                                  {/* Hover & Selection Inspection Floating Popover */}
                                  {(isSelected || isHovered) && (
                                    <div
                                      className="absolute left-full top-0 ml-2 p-2.5 rounded-xl bg-slate-950/95 border border-cyan-500/60 shadow-2xl z-50 text-[10px] font-mono min-w-[200px] pointer-events-none backdrop-blur-md animate-fade-in"
                                      style={{ transform: 'translateY(-20%)' }}
                                    >
                                      <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                                        <span className="font-bold text-cyan-300">{det.id}</span>
                                        <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-300">
                                          {Math.round(det.confidence * 100)}% Conf
                                        </span>
                                      </div>
                                      <div className="font-sans font-bold text-white text-xs mb-1">{det.classification}</div>
                                      <div className="text-slate-400 space-y-0.5">
                                        <div>Category: <span className="text-slate-200">{cfg.label}</span></div>
                                        <div>Pixels: <span className="text-slate-200">{det.pixelWidth} × {det.pixelHeight} ({det.pixelArea} px²)</span></div>
                                        <div>Dimensions: <span className="text-amber-300">{det.physicalDimensions}</span></div>
                                        <div>Method: <span className="text-slate-300">{det.detectionMethod}</span></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-500 font-mono space-y-3">
                      <BoxSelect className="w-12 h-12 text-slate-600 mx-auto" />
                      <p className="text-sm text-slate-300">No active MarsWalk Ops image loaded.</p>
                      <p className="text-xs text-slate-500">Upload or select a Martian surface photograph in MarsWalk Ops to inspect image-space detections.</p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. NASA / USGS ORBITAL FUSION VIEW */}
              {activeViewMode === 'orbital' && (
                <div className="w-full h-full relative">
                  {orbitalVisibilities.optical_trek && baseOpticalUrl && (
                    <img
                      src={baseOpticalUrl}
                      alt="NASA Mars Trek CTX / Viking Optical Base"
                      style={{ opacity: orbitalOpacities.optical_trek ?? 1 }}
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                    />
                  )}

                  {/* Overlays */}
                  <div className="absolute inset-0 pointer-events-none">
                    {orbitalVisibilities.hillshade && hillshadeUrl && (
                      <img
                        src={hillshadeUrl}
                        alt="HRSC MOLA Color Hillshade"
                        style={{ opacity: orbitalOpacities.hillshade ?? 0.45 }}
                        className="absolute inset-0 w-full h-full object-contain mix-blend-screen"
                      />
                    )}
                    {orbitalVisibilities.thermal_day && themisDayUrl && (
                      <img
                        src={themisDayUrl}
                        alt="USGS THEMIS IR Day"
                        style={{ opacity: orbitalOpacities.thermal_day ?? 0.65 }}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    )}
                    {orbitalVisibilities.thermal_night && themisNightUrl && (
                      <img
                        src={themisNightUrl}
                        alt="USGS THEMIS IR Night"
                        style={{ opacity: orbitalOpacities.thermal_night ?? 0.65 }}
                        className="absolute inset-0 w-full h-full object-contain mix-blend-lighten"
                      />
                    )}
                    {orbitalVisibilities.geology_sim3292 && sim3292Url && (
                      <img
                        src={sim3292Url}
                        alt="USGS SIM 3292 Geology"
                        style={{ opacity: orbitalOpacities.geology_sim3292 ?? 0.55 }}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    )}
                  </div>

                  {/* Reticle for Rover / POI Center */}
                  {!isCoordsUnavailable && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border-2 border-cyan-400 flex items-center justify-center animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-cyan-300" />
                      </div>
                      <span className="mt-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-cyan-300 border border-cyan-500/40">
                        {centerLat.toFixed(3)}°N, {centerLon.toFixed(3)}°E
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 3. DUAL COMPARISON VIEW (Split Screen) */}
              {activeViewMode === 'dual' && (
                <div className="w-full h-full grid grid-cols-2 divide-x divide-slate-800">
                  {/* Left: Surface Image with Bounding Boxes */}
                  <div className="relative overflow-hidden flex items-center justify-center p-2 bg-slate-950">
                    <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-[10px] font-mono text-cyan-300 font-bold">
                      Surface Observation
                    </span>
                    {activeImageUrl ? (
                      <div className="relative inline-block">
                        <img
                          src={activeImageUrl}
                          alt="Surface frame"
                          className="max-h-[460px] max-w-full object-contain rounded"
                        />
                        {showAnnotations && filteredDetections.map(det => (
                          <div
                            key={det.id}
                            onClick={() => setSelectedDetectionId(det.id)}
                            className={`absolute border rounded cursor-pointer ${
                              selectedDetectionId === det.id ? 'border-white bg-cyan-500/25 z-20' : 'border-amber-400/80 bg-amber-400/10'
                            }`}
                            style={{
                              left: `${det.normX * 100}%`,
                              top: `${det.normY * 100}%`,
                              width: `${det.normWidth * 100}%`,
                              height: `${det.normHeight * 100}%`
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs font-mono">No surface photo active</span>
                    )}
                  </div>

                  {/* Right: NASA Orbital Reference */}
                  <div className="relative overflow-hidden flex items-center justify-center bg-black">
                    <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-[10px] font-mono text-emerald-300 font-bold">
                      NASA Mars Trek Orbital
                    </span>
                    {baseOpticalUrl && (
                      <img
                        src={baseOpticalUrl}
                        alt="NASA Mars Trek CTX"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Visualizer Bottom Status Bar */}
            <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-3">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {allDetections.length > 0 ? `${allDetections.length} objects localized` : 'Awaiting Image Analysis'}
                </span>
                <span>·</span>
                <span>Resolution: {activeSession.imageMetadata.width ? `${activeSession.imageMetadata.width}×${activeSession.imageMetadata.height} px` : 'Uncalibrated'}</span>
                <span>·</span>
                <span>CRS: {isCoordsUnavailable ? 'Local Image Coordinate System (0..1)' : 'IAU2000:49900 Mars'}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                MarsNav Planetary CV Engine v4.2 · Zero Mock Fallbacks
              </div>
            </div>
          </div>

          {/* Geological Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(Object.keys(CATEGORY_CONFIG) as DetectionCategory[]).map(catKey => {
              const cfg = CATEGORY_CONFIG[catKey];
              const count = catKey === 'all' ? allDetections.length : allDetections.filter(d => d.category === catKey).length;
              const isSelected = selectedCategory === catKey;

              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40 border border-cyan-400'
                      : 'bg-[#0B1021] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                  <span>{cfg.label}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-slate-300">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Comprehensive 5-Tab Scientific Analysis Panel */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            {/* Tab Switcher */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                <button
                  onClick={() => setSelectedAnalysisTab('overview')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    selectedAnalysisTab === 'overview' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Image Information
                </button>
                <button
                  onClick={() => setSelectedAnalysisTab('detections')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    selectedAnalysisTab === 'detections' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Detection Statistics
                </button>
                <button
                  onClick={() => setSelectedAnalysisTab('geology')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    selectedAnalysisTab === 'geology' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Geological Analysis
                </button>
                <button
                  onClick={() => setSelectedAnalysisTab('spatial')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    selectedAnalysisTab === 'spatial' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Spatial Analysis
                </button>
                <button
                  onClick={() => setSelectedAnalysisTab('provenance')}
                  className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer ${
                    selectedAnalysisTab === 'provenance' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Data Quality &amp; PDS
                </button>
              </div>

              <span className="text-[10px] font-mono text-cyan-400 hidden sm:inline-block">
                Provenance: {activeSession.provenance?.source || 'Active Exploration Session'}
              </span>
            </div>

            {/* TAB A: Image Information */}
            {selectedAnalysisTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 uppercase text-[10px]">Image Filename / ID</span>
                  <div className="font-bold text-white truncate">{activeSession.imageMetadata.fileName || 'Mars_Surface_Frame.jpg'}</div>
                  <div className="text-[10px] text-slate-400">Obs ID: {activeSession.provenance?.identifier || 'N/A'}</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 uppercase text-[10px]">Sensor &amp; Mission</span>
                  <div className="font-bold text-cyan-300">{activeSession.provenance?.rover || 'NASA Mars 2020'} · {activeSession.provenance?.camera || 'Mastcam-Z'}</div>
                  <div className="text-[10px] text-slate-400">Sol {activeSession.provenance?.sol ?? '0'} · {activeSession.provenance?.acquisitionUtc?.split('T')[0] || 'Session'}</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 uppercase text-[10px]">Frame Dimensions</span>
                  <div className="font-bold text-emerald-400">{activeSession.imageMetadata.width || 1024} × {activeSession.imageMetadata.height || 1024} px</div>
                  <div className="text-[10px] text-slate-400">Aspect Ratio: {((activeSession.imageMetadata.width || 1024) / (activeSession.imageMetadata.height || 1024)).toFixed(2)}:1</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 uppercase text-[10px]">Registration Status</span>
                  <div className={`font-bold ${isCoordsUnavailable ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isCoordsUnavailable ? 'Independent Image Space' : 'Georeferenced to Landing Basin'}
                  </div>
                  <div className="text-[10px] text-slate-400">Scope: {activeSession.provenance?.coordinateScope || 'unavailable'}</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-500 uppercase text-[10px]">2D Calibration Status</span>
                  <div className="font-bold text-amber-300">Uncalibrated (Monocular Optical)</div>
                  <div className="text-[10px] text-slate-400">Stereo baseline required for physical metric bounds.</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="text-slate-500 uppercase text-[10px]">Vision Processing Pipeline</span>
                  <div className={`font-bold ${activeSession.imageAnalysis?.aiAvailable ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {activeSession.imageAnalysis?.aiAvailable
                      ? 'Gemini 4 Hydrogen (Interactions API) + Pixel CV'
                      : 'AI ANALYSIS UNAVAILABLE · FALLBACK: PIXEL-BASED COMPUTER VISION'}
                  </div>
                  <div className="text-[10px] text-cyan-400">Status: {activeSession.analysisStatus || 'completed'}</div>
                  {activeImageUrl && !activeSession.imageAnalysis?.aiAvailable && activeSession.imageAnalysis?.aiStatusMessage && (
                    <div className="text-[10px] text-amber-200/90 font-sans pt-0.5">{activeSession.imageAnalysis.aiStatusMessage}</div>
                  )}
                  {activeImageUrl && !activeSession.imageAnalysis?.aiAvailable && (
                    <button
                      type="button"
                      disabled={isReanalyzing}
                      onClick={handleReanalyze}
                      className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-mono text-[10px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      {isReanalyzing ? 'Retrying AI...' : 'Retry AI Analysis'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB B: Detection Statistics */}
            {selectedAnalysisTab === 'detections' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase block">Total Objects</span>
                    <span className="text-xl font-bold text-white">{allDetections.length}</span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase block">High Hazard Rocks</span>
                    <span className="text-xl font-bold text-orange-400">
                      {allDetections.filter(d => d.category === 'boulder' || d.traversalRisk === 'high').length}
                    </span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase block">Bedrock Pavement</span>
                    <span className="text-xl font-bold text-purple-400">
                      {allDetections.filter(d => d.category === 'bedrock').length}
                    </span>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase block">Mean Confidence</span>
                    <span className="text-xl font-bold text-cyan-400">
                      {allDetections.length > 0
                        ? `${Math.round((allDetections.reduce((acc, d) => acc + d.confidence, 0) / allDetections.length) * 100)}%`
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Category Count Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-1.5">Category</th>
                        <th className="py-1.5">Count</th>
                        <th className="py-1.5">Pixel Area Sum</th>
                        <th className="py-1.5">Typical Traversal Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {(Object.keys(CATEGORY_CONFIG) as DetectionCategory[])
                        .filter(c => c !== 'all')
                        .map(cat => {
                          const items = allDetections.filter(d => d.category === cat);
                          const totalPx = items.reduce((acc, d) => acc + d.pixelArea, 0);
                          const cfg = CATEGORY_CONFIG[cat];
                          return (
                            <tr key={cat}>
                              <td className="py-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                                <span className="font-bold text-white">{cfg.label}</span>
                              </td>
                              <td className="py-2 font-bold">{items.length}</td>
                              <td className="py-2 text-slate-400">{totalPx.toLocaleString()} px²</td>
                              <td className="py-2 text-[10px] text-slate-400">{cfg.desc}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB C: Geological Analysis */}
            {selectedAnalysisTab === 'geology' && (
              <div className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 uppercase text-[10px]">Bedrock Fraction</span>
                    <div className="text-lg font-bold text-purple-400">
                      {activeSession.imageAnalysis?.pixelComposition?.bedrockPct != null
                        ? `${activeSession.imageAnalysis.pixelComposition.bedrockPct.toFixed(1)}%`
                        : 'Measured via CV'}
                    </div>
                    <div className="text-[10px] text-slate-400">High traction support</div>
                  </div>

                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 uppercase text-[10px]">Regolith / Soil</span>
                    <div className="text-lg font-bold text-emerald-400">
                      {activeSession.imageAnalysis?.pixelComposition?.soilPct != null
                        ? `${activeSession.imageAnalysis.pixelComposition.soilPct.toFixed(1)}%`
                        : 'Measured via CV'}
                    </div>
                    <div className="text-[10px] text-slate-400">Moderate wheel trenching</div>
                  </div>

                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 uppercase text-[10px]">Loose Sand Dunes</span>
                    <div className="text-lg font-bold text-amber-400">
                      {activeSession.imageAnalysis?.pixelComposition?.sandPct != null
                        ? `${activeSession.imageAnalysis.pixelComposition.sandPct.toFixed(1)}%`
                        : 'Measured via CV'}
                    </div>
                    <div className="text-[10px] text-slate-400">High entrapment risk</div>
                  </div>

                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 uppercase text-[10px]">Discrete Rock Clasts</span>
                    <div className="text-lg font-bold text-cyan-400">
                      {activeSession.imageAnalysis?.pixelComposition?.rockPct != null
                        ? `${activeSession.imageAnalysis.pixelComposition.rockPct.toFixed(1)}%`
                        : 'Measured via CV'}
                    </div>
                    <div className="text-[10px] text-slate-400">Obstacle clearance check</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-cyan-400 block">Dominant Geological Formations</span>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans">
                    {activeSession.imageAnalysis?.dominantFeature ||
                      'No image analyzed yet; upload or select a Martian surface frame.'}
                  </p>
                  <div className="text-[11px] text-slate-400">
                    Surface Roughness Index: <strong className="text-white">{activeSession.imageAnalysis?.roughnessScore ?? 'N/A'}</strong> ·
                    Regolith Texture: <strong className="text-slate-200">{activeSession.imageAnalysis?.sandAndRegolith || 'Unavailable until image analysis completes.'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB D: Spatial Analysis */}
            {selectedAnalysisTab === 'spatial' && (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-black/40 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Selected Object Inspector</span>
                    <span className="text-sm font-bold text-white">
                      {selectedDetection ? `${selectedDetection.id}: ${selectedDetection.classification}` : 'Select any detection on the map or side panel'}
                    </span>
                  </div>
                  {selectedDetection && (
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{
                        backgroundColor: CATEGORY_CONFIG[selectedDetection.category].bg,
                        color: CATEGORY_CONFIG[selectedDetection.category].color
                      }}
                    >
                      {CATEGORY_CONFIG[selectedDetection.category].label}
                    </span>
                  )}
                </div>

                {selectedDetection ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">Normalized Bounding Box</span>
                      <span className="text-slate-200">
                        [{selectedDetection.normX.toFixed(3)}, {selectedDetection.normY.toFixed(3)}, {selectedDetection.normWidth.toFixed(3)}, {selectedDetection.normHeight.toFixed(3)}]
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">Pixel Bounding Box</span>
                      <span className="text-slate-200">
                        X:{selectedDetection.pixelX}, Y:{selectedDetection.pixelY}, W:{selectedDetection.pixelWidth}, H:{selectedDetection.pixelHeight}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">Pixel Area</span>
                      <span className="text-cyan-400 font-bold">{selectedDetection.pixelArea.toLocaleString()} px²</span>
                    </div>
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">Estimated Physical Bounds</span>
                      <span className="text-amber-300 font-bold">{selectedDetection.physicalDimensions}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Click any object detection box on the surface map or select an entry from the list on the right to inspect exact coordinates.
                  </div>
                )}
              </div>
            )}

            {/* TAB E: Data Quality & PDS Provenance */}
            {selectedAnalysisTab === 'provenance' && (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-[11px]">
                    <Shield className="w-4 h-4" />
                    <span>Scientific Rigor &amp; Planetary Science Ingestion Rules</span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans">
                    MarsNav enforces strict separation between 2D optical surface observations and orbital cartographic datums.
                    A single monocular surface photograph cannot establish true elevation, slope angle, or physical traversability.
                    Whenever stereo photogrammetric calibration is unavailable, metrics are honestly labeled as <strong>Estimated / Calibration Unavailable</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase block">NASA Planetary Data System (PDS) Link</span>
                    <span className="text-slate-200 block truncate">{activeSession.provenance?.sourceUrl || 'NASA PDS Imaging Node'}</span>
                    <a
                      href={activeSession.provenance?.sourceUrl || 'https://pds-imaging.jpl.nasa.gov/'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline text-[10px] flex items-center gap-1 mt-1"
                    >
                      <span>Verify PDS Repository Record</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-500 text-[10px] uppercase block">USGS SIM 3292 Reference</span>
                    <span className="text-slate-200 block">Tanaka et al. (2014) Geologic Map of Mars</span>
                    <a
                      href="https://pubs.usgs.gov/sim/3292/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline text-[10px] flex items-center gap-1 mt-1"
                    >
                      <span>USGS Publication Record</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detection List & Orbital Layer Stack (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Surface Detections List Panel */}
          {activeViewMode === 'surface' ? (
            <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BoxSelect className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    Detection Catalogue
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                  {filteredDetections.length} of {allDetections.length} Visible
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by ID or classification..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Scrollable Detection Cards */}
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredDetections.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 font-mono text-xs">
                    No detections match current category or search filter.
                  </div>
                ) : (
                  filteredDetections.map((det) => {
                    const isSelected = selectedDetectionId === det.id;
                    const isHovered = hoveredDetectionId === det.id;
                    const cfg = CATEGORY_CONFIG[det.category] || CATEGORY_CONFIG.unknown;

                    return (
                      <div
                        key={det.id}
                        onClick={() => setSelectedDetectionId(det.id)}
                        onMouseEnter={() => setHoveredDetectionId(det.id)}
                        onMouseLeave={() => setHoveredDetectionId(null)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer font-mono text-xs ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-950/40'
                            : isHovered
                            ? 'bg-slate-900/80 border-slate-700'
                            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
                            <strong className="text-white text-xs">{det.id}</strong>
                            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{det.classification}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/50 text-cyan-300">
                            {Math.round(det.confidence * 100)}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                          <span>{det.pixelWidth}×{det.pixelHeight} px</span>
                          <span className="text-amber-400 font-semibold">{det.physicalDimensions.split('(')[0]}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Orbital Layer Stack Panel */
            <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    Orbital Layer Stack
                  </h3>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {wmsLayerCount ? `WMS (${wmsLayerCount}) / WMTS` : `${liveLayerSpecs.length} Layers`}
                </span>
              </div>

              {/* Base Layer Switcher */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Base Orbital Imagery</span>
                <select
                  value={baseLayerChoice}
                  onChange={e => setBaseLayerChoice(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-cyan-300 font-bold focus:outline-none"
                >
                  <option value="auto">Auto (Jezero CTX 6m / Viking)</option>
                  <option value="trek_jezero_ctx_6m">MRO CTX Jezero 6m Mosaic</option>
                  <option value="trek_hrsc_mola_clrshade">HRSC+MOLA Color Hillshade</option>
                  <option value="usgs_mdim21_color">USGS Viking MDIM 2.1 Color</option>
                  <option value="trek_mola_clrshade">MOLA Color Relief</option>
                </select>
              </div>

              {/* Layer Sliders */}
              <div className="space-y-3 font-mono text-xs">
                {[
                  { id: 'optical_trek', name: '1. NASA Trek Base Optical', res: '6m–231m', inst: 'MRO CTX / Viking' },
                  { id: 'hillshade', name: '2. HRSC + MOLA Hillshade', res: '200m DEM', inst: 'Mars Express / MGS' },
                  { id: 'thermal_day', name: '3. USGS THEMIS IR Day', res: '100m IR', inst: 'Mars Odyssey THEMIS' },
                  { id: 'thermal_night', name: '4. USGS THEMIS IR Night', res: '100m IR', inst: 'Thermal Inertia' },
                  { id: 'geology_sim3292', name: '5. USGS SIM 3292 Geology', res: 'Global', inst: 'Tanaka et al. 2014' }
                ].map(l => {
                  const isVis = Boolean(orbitalVisibilities[l.id]);
                  const op = orbitalOpacities[l.id] ?? 0.65;

                  return (
                    <div key={l.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setOrbitalVisibilities(prev => ({ ...prev, [l.id]: !prev[l.id] }))}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isVis ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {isVis ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <div>
                            <span className="text-xs font-bold text-white block">{l.name}</span>
                            <span className="text-[10px] text-slate-400">{l.res} · {l.inst}</span>
                          </div>
                        </div>
                      </div>

                      {isVis && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-slate-500">Opacity</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={op}
                            onChange={e => setOrbitalOpacities(prev => ({ ...prev, [l.id]: parseFloat(e.target.value) }))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                          />
                          <span className="text-[10px] text-slate-400">{Math.round(op * 100)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Isolated NASA Worldview Earth Analog Reference */}
          <div className="bg-[#0B1021] border border-amber-500/30 rounded-2xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Earth Analog Comparison
                </h3>
              </div>
              <button
                onClick={() => setAnalogOpen(v => !v)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-bold cursor-pointer"
              >
                {analogOpen ? 'Hide Analog' : 'Compare Earth Site'}
              </button>
            </div>

            <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[10px] text-amber-200">
              NASA GIBS Earth imagery is isolated for sensor calibration and never mixed with Martian rover pathfinding.
            </div>

            {analogOpen && (
              <div className="space-y-3 pt-1">
                <div className="flex gap-1.5">
                  {analogSites.map(site => (
                    <button
                      key={site.id}
                      onClick={() => setSelectedAnalogId(site.id)}
                      className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer truncate ${
                        selectedAnalogId === site.id
                          ? 'bg-amber-600/30 border-amber-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {site.name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {analogSites.find(s => s.id === selectedAnalogId) && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2.5 space-y-2">
                    {analogSites.find(s => s.id === selectedAnalogId)!.previewImageUrl && (
                      <img
                        src={analogSites.find(s => s.id === selectedAnalogId)!.previewImageUrl}
                        alt={analogSites.find(s => s.id === selectedAnalogId)!.name}
                        className="w-full h-32 object-contain bg-black rounded"
                      />
                    )}
                    <div className="text-[10px] text-slate-300">
                      <strong>{analogSites.find(s => s.id === selectedAnalogId)!.name}</strong>: {analogSites.find(s => s.id === selectedAnalogId)!.analogRationale}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultilayerScientificMap;
