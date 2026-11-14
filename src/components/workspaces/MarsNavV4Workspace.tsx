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
  EyeOff,
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
  Award,
  Download,
  Trash2,
  Target,
  User,
  HeartPulse,
  Flame,
  Clock,
  Siren,
  FileSpreadsheet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  PieChart,
  BarChart3,
  CheckSquare,
  Ruler,
  Undo2,
  Redo2,
  Move,
  MousePointer,
  Split,
  ShieldCheck,
  Layers3,
  ExternalLink,
  HelpCircle,
  History,
  FileJson,
  Plus,
  Edit3,
  AlertCircle,
  Loader2,
  Search,
  ArrowLeftRight,
  Hand,
  Rocket
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { sharedExplorationStore } from '../../services/sharedExplorationStore';
import { useTerrainAnalysis } from '../../context/TerrainAnalysisContext';
import {
  analyzeCompleteTerrainImage,
  getCachedTerrainIntelligence,
  CompleteTerrainIntelligenceReport,
  TerrainRegionItem
} from '../../services/terrainIntelligenceService';
import { AStarGrid, calculatePathLength, smoothPathCollisionFree } from '../../utils/astar';
import {
  getSavedNotes,
  saveNote,
  deleteNote as deleteSavedNote,
  clearAllNotes,
  getSavedMeasurements,
  saveMeasurement,
  deleteMeasurement as deleteSavedMeasurement,
  clearAllMeasurements,
  toggleMeasurementVisibility,
  SavedNote,
  SavedMeasurement
} from '../../services/notesAndMeasurementsStorage';

export interface CheckpointNode {
  id: string;
  name: string;
  x: number;
  y: number;
  dwellMins: number;
}

export interface ScienceStop {
  id: string;
  name: string;
  category: 'outcrop' | 'sedimentary' | 'regolith' | 'sampling';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Unvisited' | 'Active' | 'Sampled';
  scientificObjective: string;
  description: string;
  x: number;
  y: number;
  dwellMins: number;
  notes: string;
}

export interface ManualHazard {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  blocked: boolean;
}

export interface RestrictedPolygon {
  id: string;
  label: string;
  reason: string;
  vertices: Array<{ x: number; y: number }>;
  closed: boolean;
  blocked: boolean;
}

// Geometry Helpers for Polygon Intersection & Point-in-Polygon Checks
function doSegmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const ccw = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) => {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  };
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

function isPointInPolygon(
  pt: { x: number; y: number },
  vertices: Array<{ x: number; y: number }>
): boolean {
  if (vertices.length < 3) return false;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) && (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function routeIntersectsPolygon(
  route: Array<{ x: number; y: number }>,
  vertices: Array<{ x: number; y: number }>
): boolean {
  if (vertices.length < 3 || route.length === 0) return false;
  for (const pt of route) {
    if (isPointInPolygon(pt, vertices)) return true;
  }
  for (let i = 0; i < route.length - 1; i++) {
    const r1 = route[i];
    const r2 = route[i + 1];
    for (let j = 0; j < vertices.length; j++) {
      const v1 = vertices[j];
      const v2 = vertices[(j + 1) % vertices.length];
      if (doSegmentsIntersect(r1, r2, v1, v2)) return true;
    }
  }
  return false;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  simTime: string;
  type: 'image' | 'analysis' | 'checkpoint' | 'route' | 'hazard' | 'emergency' | 'simulation';
  title: string;
  detail: string;
}

export interface SpatialDataLayer {
  id: string;
  name: string;
  type: string;
  sourceOrg: string;
  sourceUrl?: string;
  solDate: string;
  resolution: string;
  alignment: 'Observed' | 'Derived' | 'Simulated' | 'Manual';
  isAligned: boolean;
  missingMetadata?: string;
}

const MASK_CLASS_DEFS = [
  { name: 'Soil / Regolith', color: '#FF0000', hex: '#FF0000', key: 'soil' as const },
  { name: 'Bedrock Outcrop', color: '#00FF00', hex: '#00FF00', key: 'bedrock' as const },
  { name: 'Sand / Dunes', color: '#0000FF', hex: '#0000FF', key: 'sand' as const },
  { name: 'Big Rock / Hazard', color: '#FFFF00', hex: '#FFFF00', key: 'rock' as const }
];

import { MarsRoverIcon } from '../MarsRoverIcon';
import ImageAcquisitionPanel from '../ImageAcquisitionPanel';

export default function MarsNavV4Workspace() {
  const {
    sharedSession,
    updateSharedSession,
    activeMission,
    selectedRegion,
    setActiveWorkspace,
    rightInspectorOpen,
    toggleRightInspector,
    selectedDtmData,
    settings
  } = useWorkspace();

  const {
    terrainImage,
    imageProvenance,
    startPoint,
    destinationPoint
  } = sharedSession;

  const {
    analysis,
    setStartPoint,
    setDestinationPoint,
    clearStartPoint,
    clearDestinationPoint,
    swapStartAndDestination,
    recalculateAnalysis,
    setSelectedRouteIndex,
    safetyClearancePx: contextSafetyClearancePx,
    setSafetyClearancePx: setContextSafetyClearancePx,
    validateCoordinateTraversability,
    addObstacle: addContextObstacle,
    removeObstacle: removeContextObstacle,
    clearObstacles: clearContextObstacles,
    isPlaying,
    traversalProgress,
    simSpeed: contextSimSpeed,
    traversalStatus,
    startTraversal,
    pauseTraversal,
    resumeTraversal,
    resetTraversal,
    setTraversalProgress,
    setSimSpeed: setContextSimSpeed,
    roverPos
  } = useTerrainAnalysis();

  // Active Tool Selection (Section 1)
  // 'select' (IDLE) | 'start' | 'destination' | 'checkpoint' | 'science' | 'hazard' | 'measure' | 'note' | 'inspect' | 'pan'
  const [activeTool, setActiveTool] = useState<
    'select' | 'start' | 'destination' | 'checkpoint' | 'science' | 'hazard' | 'measure' | 'note' | 'inspect' | 'pan'
  >('select');
  const [inspectedCoords, setInspectedCoords] = useState<{ x: number; y: number } | null>(null);


  // Image Loading & Status
  const [imageStatus, setImageStatus] = useState<'empty' | 'loading' | 'loaded' | 'error'>(() => {
    return terrainImage && terrainImage.trim() !== '' ? 'loading' : 'empty';
  });
  const [imageLoadError, setImageLoadError] = useState<{ message: string; failedUrl: string } | null>(null);

  // Natural Image Dimensions (Sync with Analysis Context)
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ 
    width: analysis.imageWidth || 256, 
    height: analysis.imageHeight || 256 
  });

  // Display Mode Selection (Clean Original Image by default)
  const [displayMode, setDisplayMode] = useState<'original' | 'route' | 'annotations' | 'analysis' | 'split_comparison'>('original');
  const [showMetadataStrip, setShowMetadataStrip] = useState<boolean>(true);

  // Zoom & Pan View Controls (Section 1 & 7)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomLevelRef = useRef<number>(zoomLevel);
  zoomLevelRef.current = zoomLevel;
  const panOffsetRef = useRef<{ x: number; y: number }>(panOffset);
  panOffsetRef.current = panOffset;
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);

  // Navigation Overlay Layer Visibility Controls
  const [showSelectedRoute, setShowSelectedRoute] = useState<boolean>(true);
  const [showAltRoutes, setShowAltRoutes] = useState<boolean>(false);
  const [showEmergencyPath, setShowEmergencyPath] = useState<boolean>(false);
  const [showWaypoints, setShowWaypoints] = useState<boolean>(false);
  const [showRestrictedZones, setShowRestrictedZones] = useState<boolean>(false);
  const [showDirectionArrows, setShowDirectionArrows] = useState<boolean>(false);
  const [showSquareTargetBoxes, setShowSquareTargetBoxes] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [routeMenuOpen, setRouteMenuOpen] = useState<boolean>(false);
  const [obstaclePlacementWarning, setObstaclePlacementWarning] = useState<string | null>(null);

  // Multi-waypoint nodes & annotations
  const [checkpointsList, setCheckpointsList] = useState<CheckpointNode[]>([]);
  const [scienceStopsList, setScienceStopsList] = useState<ScienceStop[]>([]);
  const [manualHazards, setManualHazards] = useState<ManualHazard[]>([]);
  const [restrictedPolygons, setRestrictedPolygons] = useState<RestrictedPolygon[]>([]);
  const [activeDrawingPolygon, setActiveDrawingPolygon] = useState<Array<{ x: number; y: number }>>([]);
  const [measurementsList, setMeasurementsList] = useState<SavedMeasurement[]>(() => getSavedMeasurements());
  const [activeMeasureStart, setActiveMeasureStart] = useState<{ x: number; y: number } | null>(null);
  const [notesList, setNotesList] = useState<SavedNote[]>(() => getSavedNotes());
  const [safetyBufferPx, setSafetyBufferPx] = useState<number>(analysis.safetyClearancePx || 12);

  // Sync safety buffer with context
  const handleClearanceChange = useCallback((px: number) => {
    setSafetyBufferPx(px);
    setContextSafetyClearancePx(px);
  }, [setContextSafetyClearancePx]);

  // Workspace Note Creator / Editor Modal State
  const [noteModalOpen, setNoteModalOpen] = useState<boolean>(false);
  const [editingNoteData, setEditingNoteData] = useState<SavedNote | null>(null);
  const [noteFormTitle, setNoteFormTitle] = useState<string>('');
  const [noteFormDesc, setNoteFormDesc] = useState<string>('');
  const [noteFormCategory, setNoteFormCategory] = useState<SavedNote['category']>('Geology');
  const [noteFormPriority, setNoteFormPriority] = useState<SavedNote['priority']>('Medium');
  const [noteFormTags, setNoteFormTags] = useState<string>('Surface, Delta');
  const [noteFormCoords, setNoteFormCoords] = useState<{ x: number; y: number }>({ x: 128, y: 128 });

  // Right Side Contextual Panel Tabs
  const [rightPanelTab, setRightPanelTab] = useState<'context' | 'measurements' | 'field_notes'>('context');
  const [notesSearch, setNotesSearch] = useState<string>('');
  const [notesCategoryFilter, setNotesCategoryFilter] = useState<string>('ALL');

  // Pulse ring for locate on image
  const [locatedTarget, setLocatedTarget] = useState<{ id: string; x: number; y: number } | null>(null);

  // Waypoint Dragging State
  const [draggingWaypoint, setDraggingWaypoint] = useState<{ type: 'start' | 'dest' | 'checkpoint' | 'science' | 'hazard' | 'polygon' | 'note'; id: string } | null>(null);

  // Undo / Redo History Stack (Section 1)
  const [historyStack, setHistoryStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Selected item inspection
  const [selectedItem, setSelectedItem] = useState<{ type: 'start' | 'dest' | 'checkpoint' | 'science' | 'hazard' | 'polygon' | 'note' | 'measure'; id: string } | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState<boolean>(false);

  // Route Comparison Options
  const [selectedRouteStrategy, setSelectedRouteStrategy] = useState<string>('alpha');

  // AI & Complete-Frame Terrain Intelligence State
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<any>(null);
  const [segmentationMetrics, setSegmentationMetrics] = useState<any>(null);
  const [inferenceTimeMs, setInferenceTimeMs] = useState<number | null>(null);
  const [terrainIntelligence, setTerrainIntelligence] = useState<CompleteTerrainIntelligenceReport | null>(null);
  const [selectedTerrainRegionId, setSelectedTerrainRegionId] = useState<string | null>(null);
  const [hoveredTerrainRegionId, setHoveredTerrainRegionId] = useState<string | null>(null);
  const [showRegionOverlays, setShowRegionOverlays] = useState<boolean>(true);
  const intelSeqRef = useRef<number>(0);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const splitMaskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Route Planning State (Synced with TerrainAnalysisContext)
  const [activePath, setActivePath] = useState<any[]>([]);
  const [altSafetyPath, setAltSafetyPath] = useState<any[]>([]);
  const [returnPath, setReturnPath] = useState<any[]>([]);
  const [routeFeasible, setRouteFeasible] = useState<boolean>(true);
  const [pathfindingReason, setPathfindingReason] = useState<string>('Initializing...');
  const [spatialScaleMetersPerPx] = useState<number>(0.15);

  const activeRoute = analysis.routes[analysis.selectedRouteIndex] || null;

  // Sync selectedRouteStrategy with active analysis route index
  useEffect(() => {
    if (analysis.selectedRouteIndex === 0) setSelectedRouteStrategy('alpha');
    else if (analysis.selectedRouteIndex === 1) setSelectedRouteStrategy('beta');
    else if (analysis.selectedRouteIndex === 2) setSelectedRouteStrategy('gamma');
    else if (analysis.selectedRouteIndex === 3) setSelectedRouteStrategy('delta');
  }, [analysis.selectedRouteIndex]);

  const lastLocalRouteSyncRef = useRef<string>('');
  useEffect(() => {
    const altWaypoints = analysis.routes[1]?.waypoints || [];
    const routeFingerprint = activeRoute && !activeRoute.isBlocked && activeRoute.waypoints && activeRoute.waypoints.length > 1
      ? `ok_${activeRoute.id}_${activeRoute.waypoints.length}_${activeRoute.totalLengthM}_${altWaypoints.length}_${activeRoute.explanation}`
      : `blocked_${activeRoute?.explanation || 'none'}`;

    if (lastLocalRouteSyncRef.current === routeFingerprint) {
      return;
    }
    lastLocalRouteSyncRef.current = routeFingerprint;

    if (activeRoute && !activeRoute.isBlocked && activeRoute.waypoints && activeRoute.waypoints.length > 1) {
      setActivePath(activeRoute.waypoints);
      setRouteFeasible(true);
      setPathfindingReason(activeRoute.explanation);
      // Derive return path from current selection if context doesn't provide it
      setReturnPath([...activeRoute.waypoints].reverse());
      // Alt safety can be the second best candidate
      setAltSafetyPath(altWaypoints);
    } else {
      setActivePath([]);
      setRouteFeasible(false);
      setPathfindingReason(activeRoute?.explanation || 'No safe route found around detected terrain obstacles.');
      setReturnPath([]);
      setAltSafetyPath([]);
    }
  }, [activeRoute, analysis.routes]);

  // Editable Human Mission Assumptions
  const [walkingSpeedKmh, setWalkingSpeedKmh] = useState<number>(1.2);
  const [maxMissionDurationHours, setMaxMissionDurationHours] = useState<number>(4.5);
  const [oxygenReserveLitres, setOxygenReserveLitres] = useState<number>(1200);
  const [oxygenBurnRateLph, setOxygenBurnRateLph] = useState<number>(180);
  const [suitEnergyWh, setSuitEnergyWh] = useState<number>(2400);
  const [energyPowerWatts, setEnergyPowerWatts] = useState<number>(220);
  const [safetyReservePct, setSafetyReservePct] = useState<number>(15);
  const [numAstronauts, setNumAstronauts] = useState<number>(2);

  // Failure & Emergency Injections
  const [emergencyMode, setEmergencyMode] = useState<'nominal' | 'emergency_return' | 'segment_blocked' | 'resource_shortage'>('nominal');
  const [resourceShortageFactor, setResourceShortageFactor] = useState<number>(1.0);
  const [blockedSegmentCoords, setBlockedSegmentCoords] = useState<{ x: number; y: number } | null>(null);

  // Timeline Events Audit Log
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);

  // Simulation Controller State
  const [simulationState, setSimulationState] = useState<'stopped' | 'running' | 'paused' | 'completed'>('stopped');
  const [simDistance, setSimDistance] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [pulsatingProgressRatio, setPulsatingProgressRatio] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Mouse cursor position
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Data Provenance Panel State
  const [provenanceExpanded, setProvenanceExpanded] = useState<boolean>(false);
  const [spatialLayers, setSpatialLayers] = useState<SpatialDataLayer[]>([
    {
      id: 'layer_1',
      name: 'Base Surface Terrain Imagery',
      type: 'Raw Optical Frame (RGB)',
      sourceOrg: 'NASA JPL / Mars 2020 Mission Ops',
      solDate: 'Sol 2026',
      resolution: '0.10 m/pixel',
      alignment: 'Observed',
      isAligned: true
    },
    {
      id: 'layer_2',
      name: 'AI4Mars ResNet-34 Terrain Segmentation',
      type: 'Semantic Class Map (4-Class)',
      sourceOrg: 'AI4Mars Open Benchmark / Local Inference',
      solDate: 'Derived Runtime',
      resolution: '256 x 256 pixel grid',
      alignment: 'Derived',
      isAligned: true
    },
    {
      id: 'layer_3',
      name: 'Human Traverse Annotations & Waypoints',
      type: 'Vector Layer (Points & Polygons)',
      sourceOrg: 'MARSWALK Mission Controller',
      solDate: 'Active Session',
      resolution: 'Exact Pixel Coords',
      alignment: 'Manual',
      isAligned: true
    }
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const uploadSeqRef = useRef<number>(0);
  const simDistanceRef = useRef(simDistance);

  useEffect(() => {
    simDistanceRef.current = simDistance;
  }, [simDistance]);

  // Log Timeline Event helper
  const addTimelineEvent = useCallback((type: TimelineEvent['type'], title: string, detail: string) => {
    const wallClock = new Date().toLocaleTimeString('en-US', { hour12: false });
    const simTime = `${Math.floor(simDistanceRef.current / 10)}m`;
    setTimelineEvents(prev => [
      {
        id: `evt_${Date.now()}_${Math.random()}`,
        timestamp: wallClock,
        simTime,
        type,
        title,
        detail
      },
      ...prev.slice(0, 49)
    ]);
  }, []);

  // Push state to history for undo
  const saveStateToHistory = () => {
    const snap = {
      checkpointsList,
      scienceStopsList,
      manualHazards,
      restrictedPolygons,
      measurementsList,
      notesList,
      startPoint,
      destinationPoint
    };
    setHistoryStack(prev => [...prev, snap]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const lastSnap = historyStack[historyStack.length - 1];
    setHistoryStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [
      ...prev,
      { checkpointsList, scienceStopsList, manualHazards, restrictedPolygons, measurementsList, notesList, startPoint, destinationPoint }
    ]);
    setCheckpointsList(lastSnap.checkpointsList || []);
    setScienceStopsList(lastSnap.scienceStopsList || []);
    setManualHazards(lastSnap.manualHazards || []);
    setRestrictedPolygons(lastSnap.restrictedPolygons || []);
    setMeasurementsList(lastSnap.measurementsList || []);
    setNotesList(lastSnap.notesList || []);
    setActiveDrawingPolygon([]);
    updateSharedSession({
      startPoint: lastSnap.startPoint,
      destinationPoint: lastSnap.destinationPoint
    });
    addTimelineEvent('checkpoint', 'Undo Action', 'Reverted previous annotation edit.');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextSnap = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setHistoryStack(prev => [
      ...prev,
      { checkpointsList, scienceStopsList, manualHazards, restrictedPolygons, measurementsList, notesList, startPoint, destinationPoint }
    ]);
    setCheckpointsList(nextSnap.checkpointsList || []);
    setScienceStopsList(nextSnap.scienceStopsList || []);
    setManualHazards(nextSnap.manualHazards || []);
    setRestrictedPolygons(nextSnap.restrictedPolygons || []);
    setMeasurementsList(nextSnap.measurementsList || []);
    setNotesList(nextSnap.notesList || []);
    setActiveDrawingPolygon([]);
    updateSharedSession({
      startPoint: nextSnap.startPoint,
      destinationPoint: nextSnap.destinationPoint
    });
    addTimelineEvent('checkpoint', 'Redo Action', 'Re-applied annotation edit.');
  };

  const handleConfirmClearAll = () => {
    saveStateToHistory();
    setCheckpointsList([]);
    setScienceStopsList([]);
    setManualHazards([]);
    setRestrictedPolygons([]);
    setActiveDrawingPolygon([]);
    setMeasurementsList([]);
    setNotesList([]);
    setSelectedItem(null);
    setClearConfirmOpen(false);
    addTimelineEvent('checkpoint', 'Cleared Annotations', 'Cleared all custom waypoints and restricted zones.');
  };

  // Sync notes & measurements with central storage service
  useEffect(() => {
    const syncNotes = () => setNotesList(getSavedNotes());
    const syncMeas = () => setMeasurementsList(getSavedMeasurements());

    window.addEventListener('marsnav_notes_updated', syncNotes);
    window.addEventListener('marsnav_measurements_updated', syncMeas);

    const handleLocateNote = (e: any) => {
      const detail = e.detail;
      if (detail && typeof detail.x === 'number' && typeof detail.y === 'number') {
        setZoomLevel(2.0);
        const scaleFactor = (naturalDimensions.width / 256) * 2.0; // 2.0 is the zoomLevel set above
        setPanOffset({
          x: (128 - detail.x) * scaleFactor,
          y: (128 - detail.y) * scaleFactor
        });
        setLocatedTarget({ id: detail.noteId, x: detail.x, y: detail.y });
        setDisplayMode('annotations');
        setTimeout(() => setLocatedTarget(null), 3000);
      }
    };
    window.addEventListener('marsnav_locate_note', handleLocateNote);

    return () => {
      window.removeEventListener('marsnav_notes_updated', syncNotes);
      window.removeEventListener('marsnav_measurements_updated', syncMeas);
      window.removeEventListener('marsnav_locate_note', handleLocateNote);
    };
  }, []);

  // Keyboard shortcut listener (ESC to cancel active tool/drawing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveTool('select');
        setDraggingWaypoint(null);
        setInspectedCoords(null);
        if (activeMeasureStart) {
          setActiveMeasureStart(null);
          addTimelineEvent('checkpoint', 'Ruler Cancelled', 'Cancelled active ruler measurement.');
        }
        if (activeDrawingPolygon.length > 0) {
          setActiveDrawingPolygon([]);
          addTimelineEvent('checkpoint', 'Polygon Cancelled', 'Cancelled active restricted zone drawing.');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMeasureStart, activeDrawingPolygon]);

  // Note Modal Save Handler
  const handleSaveWorkspaceNote = () => {
    if (!noteFormTitle.trim()) return;
    const tagArray = noteFormTags.split(',').map(t => t.trim()).filter(Boolean);

    if (editingNoteData) {
      saveNote({
        ...editingNoteData,
        title: noteFormTitle,
        description: noteFormDesc,
        category: noteFormCategory,
        priority: noteFormPriority,
        tags: tagArray
      });
    } else {
      const newNote = saveNote({
        id: `note_${Date.now()}`,
        title: noteFormTitle,
        description: noteFormDesc,
        category: noteFormCategory,
        priority: noteFormPriority,
        x: noteFormCoords.x,
        y: noteFormCoords.y,
        imageUrl: terrainImage || '',
        imageIdentifier: imageProvenance?.identifier || 'IMAGE_1',
        createdAt: new Date().toISOString(),
        tags: tagArray
      });
      setSelectedItem({ type: 'note', id: newNote.id });
    }

    setNoteModalOpen(false);
    setEditingNoteData(null);
    setActiveTool('select');
    setRightPanelTab('field_notes');
    addTimelineEvent('checkpoint', 'Field Note Saved', `Saved note "${noteFormTitle}" at X:${noteFormCoords.x}, Y:${noteFormCoords.y}`);
  };



  const getSafeImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;
    return `/api/nasa/proxy-image?url=${encodeURIComponent(url)}`;
  };

  // NOTE: No auto-initialization of terrain image — workspace starts empty until user provides input.

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        try { URL.revokeObjectURL(activeBlobUrlRef.current); } catch {}
      }
    };
  }, []);

  // Sync image status & reset stale analysis on image replace (STRICT RULE: Clean Original Image by default)
  useEffect(() => {
    if (terrainImage && terrainImage.trim() !== '') {
      setImageStatus('loading');
      setImageLoadError(null);
      setHasAnalyzed(false);
      setAnalysisError(null);
      setImageStats(null);
      setSegmentationMetrics(null);
      setInferenceTimeMs(null);
      setTerrainIntelligence(null);
      setSelectedTerrainRegionId(null);
      setHoveredTerrainRegionId(null);

      // Reset display mode and all overlays on image change to ensure a clean default image view
      setDisplayMode('original');
      setShowSelectedRoute(false);
      setShowAltRoutes(false);
      setShowEmergencyPath(false);
      setShowWaypoints(false);
      setShowRestrictedZones(false);
      setManualHazards([]);
      setRestrictedPolygons([]);
      setCheckpointsList([]);
      setScienceStopsList([]);
      setActiveDrawingPolygon([]);
      setActiveMeasureStart(null);
      setSelectedItem(null);

      const targetUrl = getSafeImageUrl(terrainImage);
      const img = new Image();
      if (!targetUrl.startsWith('data:') && !targetUrl.startsWith('blob:') && !targetUrl.startsWith('/')) {
        img.crossOrigin = 'anonymous';
      }

      let isMounted = true;

      const onImageSuccess = () => {
        if (!isMounted) return;
        setImageStatus('loaded');
        setImageLoadError(null);
        const nw = img.naturalWidth || 256;
        const nh = img.naturalHeight || 256;
        setNaturalDimensions({ width: nw, height: nh });
        computeCanvasStats(img);
        addTimelineEvent('image', 'Image Loaded', `${imageProvenance.source || 'Terrain Image'} (${nw}x${nh} px)`);
      };

      img.onload = onImageSuccess;

      img.onerror = () => {
        if (!isMounted) return;
        setImageStatus('error');
        setImageLoadError({
          message: 'Failed to load terrain image. Please check format or CORS header.',
          failedUrl: terrainImage
        });
        addTimelineEvent('image', 'Image Load Error', 'Could not load requested image URL.');
      };

      img.src = targetUrl;

      // Handle cases where image is already cached or immediate
      if (img.complete && img.naturalWidth > 0) {
        onImageSuccess();
      } else if (typeof img.decode === 'function') {
        img.decode().then(() => {
          onImageSuccess();
        }).catch(() => {
          // If decode fails, fallback to img.onerror handler
        });
      }

      return () => {
        isMounted = false;
      };
    } else {
      setImageStatus('empty');
    }
  }, [terrainImage]);

  // Image load handler & Canvas Stats computation
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageStatus('loaded');
    setImageLoadError(null);
    const nw = img.naturalWidth || 256;
    const nh = img.naturalHeight || 256;
    
    setNaturalDimensions({ width: nw, height: nh });

    // Explicitly call fit with new dimensions to avoid stale state in callback
    setTimeout(() => {
      handleFitToWorkspace({ width: nw, height: nh });
    }, 50);

    computeCanvasStats(img);
  };

  const handleImageError = () => {
    setImageStatus('error');
    setImageLoadError({
      message: 'Failed to load terrain image. Please check CORS or select a different frame.',
      failedUrl: terrainImage
    });
  };

  // Compute real image canvas statistics (Brightness, RMS Contrast, Sharpness Index)
  const computeCanvasStats = (img: HTMLImageElement) => {
    try {
      const canvas = document.createElement('canvas');
      const w = img.naturalWidth || 256;
      const h = img.naturalHeight || 256;
      canvas.width = Math.min(256, w);
      canvas.height = Math.min(256, h);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      let totalLum = 0;
      let totalSqDiff = 0;
      let rSum = 0, gSum = 0, bSum = 0;
      const count = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalLum += lum;
      }

      const meanLum = totalLum / count;

      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalSqDiff += Math.pow(lum - meanLum, 2);
      }

      const contrast = Math.sqrt(totalSqDiff / count);
      const rgbTotal = (rSum + gSum + bSum) || 1;

      setImageStats({
        width: w,
        height: h,
        aspectRatio: (w / h).toFixed(2),
        meanBrightness: Math.round(meanLum),
        contrast: Math.round(contrast),
        sharpnessIndex: Math.round(Math.min(100, contrast * 1.8)),
        rPct: Math.round((rSum / rgbTotal) * 100),
        gPct: Math.round((gSum / rgbTotal) * 100),
        bPct: Math.round((bSum / rgbTotal) * 100),
        totalPixels: w * h,
        format: terrainImage.startsWith('data:image/png') ? 'PNG' : terrainImage.startsWith('data:image/jpeg') ? 'JPEG' : 'NASA Raw Stream'
      });
    } catch {
      setImageStats({
        width: naturalDimensions.width,
        height: naturalDimensions.height,
        aspectRatio: (naturalDimensions.width / naturalDimensions.height).toFixed(2),
        meanBrightness: 128,
        contrast: 45,
        sharpnessIndex: 78,
        rPct: 48,
        gPct: 32,
        bPct: 20,
        totalPixels: naturalDimensions.width * naturalDimensions.height,
        format: 'JPEG'
      });
    }
  };

  // Complete-Frame Automatic & Manual Terrain Intelligence Pipeline
  const runTerrainIntelligenceAnalysis = useCallback(async (forceRefresh = false) => {
    if (!terrainImage || imageStatus !== 'loaded') return;
    const seq = ++intelSeqRef.current;
    const identifier = imageProvenance.identifier || imageProvenance.source || terrainImage;

    if (!forceRefresh) {
      const cached = getCachedTerrainIntelligence(identifier, terrainImage);
      if (cached) {
        setTerrainIntelligence(cached);
        setSegmentationMetrics({
          status: 'success',
          classDistribution: cached.pixelComposition,
          modelArchitecture: cached.aiAvailable ? 'Gemini 4 Hydrogen (Interactions API) + Pixel CV' : 'FALLBACK: PIXEL-BASED COMPUTER VISION'
        });
        setInferenceTimeMs(cached.processingTimeMs);
        setHasAnalyzed(true);
        setAnalysisError(null);
        return;
      }
    }

    setIsAnalyzingImage(true);
    setAnalysisError(null);
    addTimelineEvent('analysis', 'Terrain Region Analysis Started', `Inspecting complete ${naturalDimensions.width}×${naturalDimensions.height} px Martian frame...`);
    try {
      const report = await analyzeCompleteTerrainImage({
        imageUrl: terrainImage,
        imageIdentifier: identifier,
        mission: imageProvenance.rover,
        camera: imageProvenance.camera,
        sol: imageProvenance.sol,
        source: imageProvenance.source,
        lat: imageProvenance.lat,
        lon: imageProvenance.lon,
        coordinateScope: imageProvenance.coordinateScope || 'unavailable',
        locationLabel: imageProvenance.locationLabel,
        regionId: selectedRegion?.id,
        forceRefresh
      });

      if (intelSeqRef.current !== seq) return;

      setTerrainIntelligence(report);
      setInferenceTimeMs(report.processingTimeMs);
      setSegmentationMetrics({
        status: 'success',
        classDistribution: report.pixelComposition,
        modelArchitecture: report.aiAvailable ? 'Gemini 4 Hydrogen (Interactions API) + Pixel CV' : 'FALLBACK: PIXEL-BASED COMPUTER VISION'
      });
      setHasAnalyzed(true);
      addTimelineEvent(
        'analysis',
        'Terrain Region Identification Complete',
        `Identified ${report.regions.length} terrain region(s) across full frame in ${report.processingTimeMs} ms (${report.aiAvailable ? 'Gemini 4 Hydrogen + Pixel CV' : 'FALLBACK: PIXEL-BASED COMPUTER VISION'}).`
      );
    } catch (e: any) {
      if (intelSeqRef.current !== seq) return;
      console.warn('Terrain intelligence analysis exception:', e);
      setAnalysisError(e?.message || 'Unable to complete terrain region analysis.');
      addTimelineEvent('analysis', 'Analysis Error', e?.message || 'Terrain analysis exception.');
    } finally {
      if (intelSeqRef.current === seq) {
        setIsAnalyzingImage(false);
      }
    }
  }, [
    terrainImage,
    imageStatus,
    imageProvenance.identifier,
    imageProvenance.source,
    imageProvenance.rover,
    imageProvenance.camera,
    imageProvenance.sol,
    imageProvenance.lat,
    imageProvenance.lon,
    imageProvenance.coordinateScope,
    imageProvenance.locationLabel,
    naturalDimensions.width,
    naturalDimensions.height,
    selectedRegion?.id,
    addTimelineEvent
  ]);

  // Auto-trigger complete-image terrain analysis whenever an image loads
  useEffect(() => {
    if (terrainImage && imageStatus === 'loaded') {
      runTerrainIntelligenceAnalysis(false);
    }
  }, [terrainImage, imageStatus, runTerrainIntelligenceAnalysis]);

  const handleAnalyzeImage = async () => {
    await runTerrainIntelligenceAnalysis(true);
  };

  // Render real 256x256 terrain segmentation mask onto overlay canvases
  useEffect(() => {
    const drawMaskToCanvas = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const grid = analysis.terrainClassGrid;
      if (!grid || grid.length < 256 * 256) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      const imgData = ctx.createImageData(256, 256);
      const out = imgData.data;
      for (let i = 0; i < 256 * 256; i++) {
        const cls = grid[i];
        const p = i * 4;
        if (cls === 1) {
          // Bedrock (#00FF00)
          out[p] = 16; out[p + 1] = 220; out[p + 2] = 120; out[p + 3] = 150;
        } else if (cls === 2) {
          // Sand / Dunes (#0000FF -> cyan/blue)
          out[p] = 56; out[p + 1] = 140; out[p + 2] = 255; out[p + 3] = 160;
        } else if (cls === 3) {
          // Rock / Hazard (#FFFF00)
          out[p] = 255; out[p + 1] = 210; out[p + 2] = 0; out[p + 3] = 210;
        } else {
          // Soil / Regolith (transparent tint so original surface remains clearly visible)
          out[p] = 220; out[p + 1] = 60; out[p + 2] = 40; out[p + 3] = 75;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };

    if (displayMode === 'analysis') {
      drawMaskToCanvas(maskCanvasRef.current);
    }
    if (displayMode === 'split_comparison') {
      drawMaskToCanvas(splitMaskCanvasRef.current);
    }
  }, [analysis.terrainClassGrid, displayMode, imageStatus, hasAnalyzed]);

  // Local pathfinding logic removed in favor of TerrainAnalysisContext

  // Mouse Wheel Zoom Centered Around Cursor
  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = viewportRef.current;
    if (!container || imageStatus !== 'loaded') return;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = container.getBoundingClientRect();
    
    // Mouse position relative to viewport center
    const mouseX = e.clientX - (rect.left + rect.width / 2);
    const mouseY = e.clientY - (rect.top + rect.height / 2);

    setZoomLevel(prevZoom => {
      const nextZoom = Math.min(10.0, Math.max(0.05, Number((prevZoom * zoomFactor).toFixed(4))));
      const scaleChange = nextZoom / prevZoom;

      // Adjust panOffset to keep the point under the cursor stable
      setPanOffset(prevPan => ({
        x: mouseX - (mouseX - prevPan.x) * scaleChange,
        y: mouseY - (mouseY - prevPan.y) * scaleChange
      }));

      return nextZoom;
    });
  };

  // Finish Drawing Polygon Action
  const finishActivePolygon = () => {
    if (activeDrawingPolygon.length < 3) return;
    saveStateToHistory();
    const newPoly: RestrictedPolygon = {
      id: `poly_${Date.now()}`,
      label: `Restricted Zone ${restrictedPolygons.length + 1}`,
      reason: 'User marked terrain hazard boundary',
      vertices: [...activeDrawingPolygon],
      closed: true,
      blocked: true
    };
    setRestrictedPolygons(prev => [...prev, newPoly]);
    setActiveDrawingPolygon([]);
    setSelectedItem({ type: 'polygon', id: newPoly.id });
    setActiveTool('select');
    addTimelineEvent('hazard', 'Restricted Polygon Completed', `Enclosed polygon hazard with ${newPoly.vertices.length} vertices.`);
  };

  // Navigation Action Handlers (Sections 2, 4, 5)
  const handleClearStart = () => {
    saveStateToHistory();
    clearStartPoint();
    setActivePath([]);
    setShowSelectedRoute(false);
    addTimelineEvent('checkpoint', 'Start Point Cleared', 'Removed Start Base location.');
  };

  const handleClearDestination = () => {
    saveStateToHistory();
    clearDestinationPoint();
    setActivePath([]);
    setShowSelectedRoute(false);
    addTimelineEvent('checkpoint', 'Destination Cleared', 'Removed Destination target location.');
  };

  const handleSwapPoints = () => {
    if (!startPoint && !destinationPoint) return;
    saveStateToHistory();
    swapStartAndDestination();
    addTimelineEvent('checkpoint', 'Swapped Start and Destination', 'Inverted navigation route direction.');
  };

  const handleGenerateRoute = () => {
    if (!startPoint || !destinationPoint) {
      if (!startPoint && !destinationPoint) {
        setActiveTool('start');
        addTimelineEvent('route', 'Select Start Point', 'Click on the terrain image to place Start Base.');
      } else if (!destinationPoint) {
        setActiveTool('destination');
        addTimelineEvent('route', 'Select Destination Point', 'Click on the terrain image to place Destination target.');
      } else {
        setActiveTool('start');
        addTimelineEvent('route', 'Select Start Point', 'Click on the terrain image to place Start Base.');
      }
      return;
    }
    setDisplayMode('route');
    setShowSelectedRoute(true);
    setShowWaypoints(true);
    recalculateAnalysis();
    addTimelineEvent('route', 'Route Generated', 'Calculated optimal navigation traverse between Start and Destination.');
  };

  const handleRecalculateRoute = () => {
    recalculateAnalysis();
    setShowSelectedRoute(true);
    addTimelineEvent('route', 'Route Recalculated', 'Re-executed A* pathfinding solver with current terrain data.');
  };

  const handleClearRoute = () => {
    setShowSelectedRoute(false);
    setActivePath([]);
    addTimelineEvent('route', 'Route Cleared', 'Cleared active computed route overlay.');
  };

  const handleZoomAction = useCallback((factor: number) => {
    setZoomLevel(prevZoom => {
      const safePrevZoom = prevZoom || 1.0;
      const nextZoom = Math.min(10.0, Math.max(0.05, Number((safePrevZoom * factor).toFixed(4))));
      const scaleChange = nextZoom / safePrevZoom;
      
      // Zoom toward center of viewport
      setPanOffset(prevPan => ({
        x: (prevPan.x || 0) * scaleChange,
        y: (prevPan.y || 0) * scaleChange
      }));
      
      return nextZoom;
    });
  }, []);

  const handleResetView = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
    addTimelineEvent('image', 'View Reset', 'Reset zoom to 100% and centered viewport.');
  };

  const handleFitToWorkspace = useCallback((explicitDims?: { width: number; height: number }) => {
    const container = viewportRef.current;
    if (!container) return;

    const nw = explicitDims?.width || naturalDimensions.width || 256;
    const nh = explicitDims?.height || naturalDimensions.height || 256;
    
    const rect = container.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;

    if (cw > 0 && ch > 0) {
      const margin = 60;
      const scaleX = (cw - margin) / nw;
      const scaleY = (ch - margin) / nh;
      const fitScale = Math.min(scaleX, scaleY);
      
      const finalScale = Math.min(8.0, Math.max(0.01, Number(fitScale.toFixed(4))));
      const isAlreadyFitted =
        Math.abs(zoomLevelRef.current - finalScale) < 0.001 &&
        Math.abs(panOffsetRef.current.x) < 0.5 &&
        Math.abs(panOffsetRef.current.y) < 0.5;

      if (isAlreadyFitted) return;

      setZoomLevel(finalScale);
      setPanOffset({ x: 0, y: 0 });
      
      addTimelineEvent('image', 'Fit to Workspace', `Fitted image (${nw}x${nh} px) to viewport at ${(finalScale * 100).toFixed(1)}% zoom.`);
    }
  }, [naturalDimensions.width, naturalDimensions.height, addTimelineEvent]);

  // Auto-fit image to workspace when dimensions update or image loads
  useEffect(() => {
    if (imageStatus === 'loaded') {
      handleFitToWorkspace();
    }
  }, [naturalDimensions, imageStatus, handleFitToWorkspace]);

  // Automatically fit image to workspace on container resize or UI layout shifts
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    let timerId: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => handleFitToWorkspace(), 16);
    });

    observer.observe(container);
    return () => {
      if (timerId) clearTimeout(timerId);
      observer.disconnect();
    };
  }, [handleFitToWorkspace, isFullscreen, rightInspectorOpen]);

  // Cursor style matching active tool
  const getCursorClass = () => {
    if (isPanning) return 'cursor-grabbing';
    if (draggingWaypoint) return 'cursor-grabbing';
    switch (activeTool) {
      case 'start':
      case 'destination':
      case 'checkpoint':
      case 'science':
      case 'hazard':
      case 'measure':
        return 'cursor-crosshair';
      case 'inspect':
        return 'cursor-help';
      case 'pan':
        return 'cursor-grab';
      case 'select':
      default:
        return 'cursor-default';
    }
  };

  // Canvas Mouse Click & Dragging Tools (Section 1 & 2)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (imageStatus !== 'loaded') return;

    // Secondary click (right click) cancels active tool
    if (e.button === 2) {
      e.preventDefault();
      setActiveTool('select');
      setActiveMeasureStart(null);
      setActiveDrawingPolygon([]);
      setDraggingWaypoint(null);
      return;
    }

    // Middle click or Pan tool: initiate viewport pan
    if (e.button === 1 || activeTool === 'pan') {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (e.button !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const clickX = Math.max(0, Math.min(256, Math.round((e.clientX - rect.left) * (256 / rect.width))));
    const clickY = Math.max(0, Math.min(256, Math.round((e.clientY - rect.top) * (256 / rect.height))));

    // Select mode: check if clicking directly on a waypoint/marker for dragging
    if (activeTool === 'select') {
      if (startPoint && Math.hypot(startPoint.x - clickX, startPoint.y - clickY) < 14) {
        setDraggingWaypoint({ type: 'start', id: 'start' });
        setSelectedItem({ type: 'start', id: 'start' });
        return;
      }
      if (destinationPoint && Math.hypot(destinationPoint.x - clickX, destinationPoint.y - clickY) < 14) {
        setDraggingWaypoint({ type: 'dest', id: 'dest' });
        setSelectedItem({ type: 'dest', id: 'dest' });
        return;
      }

      const hitCp = checkpointsList.find(c => Math.hypot(c.x - clickX, c.y - clickY) < 12);
      if (hitCp) {
        setDraggingWaypoint({ type: 'checkpoint', id: hitCp.id });
        setSelectedItem({ type: 'checkpoint', id: hitCp.id });
        return;
      }

      const hitSci = scienceStopsList.find(s => Math.hypot(s.x - clickX, s.y - clickY) < 12);
      if (hitSci) {
        setDraggingWaypoint({ type: 'science', id: hitSci.id });
        setSelectedItem({ type: 'science', id: hitSci.id });
        return;
      }

      const hitHaz = manualHazards.find(h => Math.hypot(h.x - clickX, h.y - clickY) < h.radius + 6);
      if (hitHaz) {
        setDraggingWaypoint({ type: 'hazard', id: hitHaz.id });
        setSelectedItem({ type: 'hazard', id: hitHaz.id });
        return;
      }

      const hitNote = notesList.find(n => Math.hypot(n.x - clickX, n.y - clickY) < 14);
      if (hitNote) {
        setSelectedItem({ type: 'note', id: hitNote.id });
        return;
      }

      const hitPoly = restrictedPolygons.find(p => isPointInPolygon({ x: clickX, y: clickY }, p.vertices));
      if (hitPoly) {
        setSelectedItem({ type: 'polygon', id: hitPoly.id });
        return;
      }

      // If clicked on empty space, initiate panning
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    // Standard Tool Placement Logic
    if (activeTool === 'start') {
      const check = validateCoordinateTraversability(clickX, clickY);
      if (!check.traversable && check.isCore) {
        setObstaclePlacementWarning(`Cannot place START on an obstacle (${check.reason}). Please select clear traversable terrain.`);
        addTimelineEvent('checkpoint', 'Start Placement Rejected', `Point X:${clickX}, Y:${clickY} rejected: on ${check.reason}`);
        return;
      }
      setObstaclePlacementWarning(null);
      saveStateToHistory();
      setStartPoint({ x: clickX, y: clickY });
      setShowWaypoints(true);
      setShowSelectedRoute(true);
      setActiveTool('select');
      addTimelineEvent('checkpoint', 'Start Base Placed', `Set Start Base at X:${clickX}, Y:${clickY}`);
      return;
    }

    if (activeTool === 'destination') {
      const check = validateCoordinateTraversability(clickX, clickY);
      if (!check.traversable && check.isCore) {
        setObstaclePlacementWarning(`Cannot place DESTINATION on an obstacle (${check.reason}). Please select clear traversable terrain.`);
        addTimelineEvent('checkpoint', 'Destination Placement Rejected', `Point X:${clickX}, Y:${clickY} rejected: on ${check.reason}`);
        return;
      }
      setObstaclePlacementWarning(null);
      saveStateToHistory();
      setDestinationPoint({ x: clickX, y: clickY });
      setShowWaypoints(true);
      setShowSelectedRoute(true);
      setActiveTool('select');
      addTimelineEvent('checkpoint', 'Destination Placed', `Set Destination target at X:${clickX}, Y:${clickY}`);
      return;
    }

    if (activeTool === 'inspect') {
      setInspectedCoords({ x: clickX, y: clickY });
      addTimelineEvent('analysis', 'Terrain Inspected', `Inspected coordinate X:${clickX}, Y:${clickY}`);
      return;
    }

    if (activeTool === 'checkpoint') {
      saveStateToHistory();
      const newCp: CheckpointNode = {
        id: `cp_${Date.now()}`,
        name: `Checkpoint ${checkpointsList.length + 1}`,
        x: clickX,
        y: clickY,
        dwellMins: 10
      };
      setCheckpointsList(prev => [...prev, newCp]);
      setSelectedItem({ type: 'checkpoint', id: newCp.id });
      setShowWaypoints(true);
      addTimelineEvent('checkpoint', 'Checkpoint Added', `Added ${newCp.name} at X:${clickX}, Y:${clickY}`);
      return;
    }

    if (activeTool === 'science') {
      saveStateToHistory();
      const newSci: ScienceStop = {
        id: `sci_${Date.now()}`,
        name: `Science POI ${scienceStopsList.length + 1}`,
        scientificObjective: 'Geological surface composition sampling',
        description: 'Spectroscopic observation and sample collection.',
        category: 'outcrop',
        priority: 'High',
        status: 'Unvisited',
        x: clickX,
        y: clickY,
        dwellMins: 15,
        notes: ''
      };
      setScienceStopsList(prev => [...prev, newSci]);
      setSelectedItem({ type: 'science', id: newSci.id });
      setShowWaypoints(true);
      setActiveTool('select');
      addTimelineEvent('checkpoint', 'Science POI Added', `Added ${newSci.name} at X:${clickX}, Y:${clickY}`);
      return;
    }

    if (activeTool === 'hazard') {
      // Multi-vertex polygon drawing logic
      if (activeDrawingPolygon.length >= 3) {
        const startV = activeDrawingPolygon[0];
        if (Math.hypot(startV.x - clickX, startV.y - clickY) < 12) {
          finishActivePolygon();
          return;
        }
      }
      setActiveDrawingPolygon(prev => [...prev, { x: clickX, y: clickY }]);
      setShowRestrictedZones(true);
      return;
    }

    if (activeTool === 'measure') {
      if (!activeMeasureStart) {
        setActiveMeasureStart({ x: clickX, y: clickY });
        addTimelineEvent('analysis', 'Ruler Measurement Started', `Anchor 1 set at X:${clickX}, Y:${clickY}. Click second point to measure.`);
      } else {
        saveStateToHistory();
        const distPx = Math.round(Math.hypot(clickX - activeMeasureStart.x, clickY - activeMeasureStart.y));
        const isCalibrated = Boolean(imageProvenance && (imageProvenance.source?.includes('NASA') || imageProvenance.source?.includes('HiRISE')));
        const physicalDistM = isCalibrated ? Number((distPx * spatialScaleMetersPerPx).toFixed(1)) : null;

        const newMeas = saveMeasurement({
          id: `meas_${Date.now()}`,
          name: `Vector ${measurementsList.length + 1}`,
          startX: activeMeasureStart.x,
          startY: activeMeasureStart.y,
          endX: clickX,
          endY: clickY,
          distPx,
          isPhysicalCalibrated: isCalibrated,
          physicalDistM,
          imageUrl: terrainImage || '',
          imageIdentifier: imageProvenance?.identifier || 'IMAGE_1',
          visible: true
        });

        setActiveMeasureStart(null);
        setSelectedItem({ type: 'measure', id: newMeas.id });
        setActiveTool('select');
        setRightPanelTab('measurements');
        addTimelineEvent('analysis', 'Ruler Distance Measured', `Measured ${distPx} px (${physicalDistM !== null ? `${physicalDistM} m` : 'Scale unavailable'}).`);
      }
      return;
    }

    if (activeTool === 'note') {
      saveStateToHistory();
      setNoteFormCoords({ x: clickX, y: clickY });
      setEditingNoteData(null);
      setNoteFormTitle(`Field Note #${notesList.length + 1}`);
      setNoteFormDesc('Geological surface observation or feature note.');
      setNoteFormCategory('Geology');
      setNoteFormPriority('Medium');
      setNoteFormTags('Surface, Outcrop');
      setNoteModalOpen(true);
      setActiveTool('select');
      return;
    }

    setSelectedItem(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const clickX = Math.max(0, Math.min(256, Math.round((e.clientX - rect.left) * (256 / rect.width))));
    const clickY = Math.max(0, Math.min(256, Math.round((e.clientY - rect.top) * (256 / rect.height))));
    setCursorPos({ x: clickX, y: clickY });

    if (isPanning) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    if (draggingWaypoint) {
      if (draggingWaypoint.type === 'start') {
        const check = validateCoordinateTraversability(clickX, clickY);
        if (check.traversable || !check.isCore) {
          setStartPoint({ x: clickX, y: clickY });
          setObstaclePlacementWarning(null);
        } else {
          setObstaclePlacementWarning(`Warning: Dragging START over obstacle (${check.reason}).`);
        }
      } else if (draggingWaypoint.type === 'dest') {
        const check = validateCoordinateTraversability(clickX, clickY);
        if (check.traversable || !check.isCore) {
          setDestinationPoint({ x: clickX, y: clickY });
          setObstaclePlacementWarning(null);
        } else {
          setObstaclePlacementWarning(`Warning: Dragging DESTINATION over obstacle (${check.reason}).`);
        }
      } else if (draggingWaypoint.type === 'checkpoint') {
        setCheckpointsList(prev => prev.map(c => c.id === draggingWaypoint.id ? { ...c, x: clickX, y: clickY } : c));
      } else if (draggingWaypoint.type === 'science') {
        setScienceStopsList(prev => prev.map(s => s.id === draggingWaypoint.id ? { ...s, x: clickX, y: clickY } : s));
      } else if (draggingWaypoint.type === 'hazard') {
        setManualHazards(prev => prev.map(h => h.id === draggingWaypoint.id ? { ...h, x: clickX, y: clickY } : h));
      } else if (draggingWaypoint.type === 'note') {
        setNotesList(prev => prev.map(n => n.id === draggingWaypoint.id ? { ...n, x: clickX, y: clickY } : n));
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggingWaypoint) {
      addTimelineEvent('route', 'Waypoint Moved', `Relocated ${draggingWaypoint.type} marker. Recalculated route.`);
      setDraggingWaypoint(null);
      if (obstaclePlacementWarning) {
        setTimeout(() => setObstaclePlacementWarning(null), 3500);
      }
    }
  };

  const removeHazard = (id: string) => {
    saveStateToHistory();
    setManualHazards(prev => prev.filter(h => h.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  const removePolygon = (id: string) => {
    saveStateToHistory();
    setRestrictedPolygons(prev => prev.filter(p => p.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  const removeScienceStop = (id: string) => {
    saveStateToHistory();
    setScienceStopsList(prev => prev.filter(s => s.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  const removeCheckpoint = (id: string) => {
    saveStateToHistory();
    setCheckpointsList(prev => prev.filter(c => c.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  const removeMeasurement = (id: string) => {
    saveStateToHistory();
    setMeasurementsList(prev => prev.filter(m => m.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  const removeNote = (id: string) => {
    saveStateToHistory();
    setNotesList(prev => prev.filter(n => n.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  // Convert Finding to Hazard Zone or Science Stop
  const convertFindingToHazard = (label: string, x = 130, y = 130) => {
    saveStateToHistory();
    const newHaz: ManualHazard = {
      id: `haz_${Date.now()}`,
      label: `Restricted: ${label}`,
      x,
      y,
      radius: safetyBufferPx,
      blocked: true
    };
    setManualHazards(prev => [...prev, newHaz]);
    addTimelineEvent('hazard', 'Finding Converted to Hazard', `Converted AI finding ${label} to Restricted Zone.`);
  };

  const convertFindingToScienceStop = (label: string, x = 120, y = 150) => {
    saveStateToHistory();
    const newSci: ScienceStop = {
      id: `sci_${Date.now()}`,
      name: label,
      scientificObjective: 'Geological surface composition sampling',
      description: 'Converted from AI image finding',
      category: 'outcrop',
      priority: 'High',
      status: 'Unvisited',
      x,
      y,
      dwellMins: 15,
      notes: 'Converted from AI image finding'
    };
    setScienceStopsList(prev => [...prev, newSci]);
    addTimelineEvent('checkpoint', 'Finding Converted to Science POI', `Converted AI finding ${label} to Science Stop.`);
  };

  // Consolidated View mouse handlers
  const handleMouseDownView = (e: React.MouseEvent) => {
    if (e.button === 0 && !draggingWaypoint && (activeTool === 'select' || activeTool === 'pan')) {
      setIsPanning(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMoveView = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUpView = () => {
    setIsPanning(false);
  };

  // Robust Image Upload Handler & Drag-and-Drop (Section 6)
  const processUploadedFile = (file: File) => {
    if (!file) return;

    // Reset file input value right away so the user can re-select the exact same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate MIME type & file extension (JPEG, JPG, PNG, WebP)
    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExts = /\.(jpe?g|png|webp)$/i;
    const fileMime = (file.type || '').toLowerCase();
    const isValidFormat = validMimes.includes(fileMime) || validExts.test(file.name);

    if (!isValidFormat) {
      setImageLoadError({
        message: `Unsupported file format (${file.type || file.name}). Please select a JPEG, PNG, or WebP image.`,
        failedUrl: file.name
      });
      addTimelineEvent('image', 'Upload Error', 'Unsupported file type selection.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setImageLoadError({
        message: 'File size exceeds 25MB limit. Please upload an image under 25MB.',
        failedUrl: file.name
      });
      addTimelineEvent('image', 'Upload Error', 'File size exceeds 25MB.');
      return;
    }

    // Race-condition counter
    uploadSeqRef.current += 1;
    const currentSeq = uploadSeqRef.current;

    setImageStatus('loading');
    setImageLoadError(null);

    // Create immediate local blob URL
    const blobUrl = URL.createObjectURL(file);

    // Pre-decode and validate natural dimensions before state replacement
    const preloader = new Image();
    
    const handleSuccess = () => {
      if (uploadSeqRef.current !== currentSeq) {
        // Discard stale out-of-order upload
        try { URL.revokeObjectURL(blobUrl); } catch {}
        return;
      }

      // Revoke obsolete previous object URL
      if (activeBlobUrlRef.current && activeBlobUrlRef.current !== blobUrl) {
        try { URL.revokeObjectURL(activeBlobUrlRef.current); } catch {}
      }
      activeBlobUrlRef.current = blobUrl;

      const nw = preloader.naturalWidth || 256;
      const nh = preloader.naturalHeight || 256;
      setNaturalDimensions({ width: nw, height: nh });

      setTimeout(() => {
        handleFitToWorkspace();
      }, 10);

      // Reset stale analysis results, overlays, and error states from previous image
      setHasAnalyzed(false);
      setSegmentationMetrics(null);
      setInferenceTimeMs(null);
      setAnalysisError(null);
      setTerrainIntelligence(null);
      setSelectedTerrainRegionId(null);
      setHoveredTerrainRegionId(null);
      setImageStatus('loaded');
      setImageLoadError(null);

      // Store in shared session & trigger central terrain vision analysis
      updateSharedSession({
        terrainImage: blobUrl,
        imageProvenance: {
          source: `User Custom Terrain Upload (${file.name})`,
          rover: 'Custom Surface Payload',
          camera: 'USER_CAM_01',
          sol: 0,
          acquisitionUtc: new Date().toISOString(),
          identifier: file.name,
          sourceUrl: blobUrl,
          coordinateScope: 'unavailable',
          selectionOrigin: 'upload'
        }
      });

      // Automatically trigger live AI vision analysis & dashboard synchronization
      sharedExplorationStore.processAndSyncImage(file, file.name, selectedRegion?.id || 'jezero').catch(err => {
        console.error('[MARSWALK_OPS] Vision analysis sync error:', err);
      });

      computeCanvasStats(preloader);
      addTimelineEvent('image', 'Image Uploaded & Loaded', `Uploaded ${file.name} (${nw}x${nh} px)`);
    };

    const handleFailure = () => {
      if (uploadSeqRef.current !== currentSeq) {
        try { URL.revokeObjectURL(blobUrl); } catch {}
        return;
      }
      try { URL.revokeObjectURL(blobUrl); } catch {}
      // Keep previous image if load fails
      setImageStatus(terrainImage && terrainImage.trim() !== '' ? 'loaded' : 'error');
      setImageLoadError({
        message: `Failed to decode ${file.name}. The image may be corrupted or in an incompatible format.`,
        failedUrl: file.name
      });
      addTimelineEvent('image', 'Upload Error', `Decoding failed for ${file.name}`);
    };

    preloader.onload = handleSuccess;
    preloader.onerror = handleFailure;
    preloader.src = blobUrl;

    if (preloader.complete && preloader.naturalWidth > 0) {
      handleSuccess();
    } else if (typeof preloader.decode === 'function') {
      preloader.decode().then(handleSuccess).catch(() => {
        // Fall back to onerror event
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDropUpload = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  // Export JSON Report
  const handleExportReport = () => {
    const liveDist = terrainIntelligence?.pixelComposition || {
      soilPct: analysis.classStats?.classes?.[0]?.percentage ?? 0,
      bedrockPct: analysis.classStats?.classes?.[1]?.percentage ?? 0,
      sandPct: analysis.classStats?.classes?.[2]?.percentage ?? 0,
      rockPct: analysis.classStats?.classes?.[3]?.percentage ?? 0
    };
    const reportData = {
      title: 'MARSWALK OPS 3.0: Mission & Terrain Intelligence Report',
      version: '3.00',
      timestamp: new Date().toISOString(),
      activeMission: activeMission ? { id: activeMission.id, name: activeMission.name } : null,
      provenance: imageProvenance,
      imageStats: imageStats || { width: naturalDimensions.width, height: naturalDimensions.height, format: 'JPEG' },
      segmentationMetrics: segmentationMetrics || {
        classDistribution: liveDist,
        modelArchitecture: terrainIntelligence?.aiAvailable ? 'Gemini 4 Hydrogen (Interactions API) + Pixel CV' : 'FALLBACK: PIXEL-BASED COMPUTER VISION'
      },
      terrainIntelligence,
      parameters: {
        walkingSpeedKmh,
        maxMissionDurationHours,
        oxygenReserveLitres,
        suitEnergyWh,
        numAstronauts
      },
      routeAnalytics: {
        strategy: selectedRouteStrategy,
        totalOutboundPx,
        totalTraverseKm: Number(totalTraverseKm.toFixed(3)),
        totalMissionHours: Number(totalMissionHours.toFixed(2)),
        totalOxygenBurnedL,
        remainingOxygenPct,
        totalEnergyConsumedWh,
        remainingEnergyPct,
        isFeasible,
        routeFeasible,
        pathfindingReason
      },
      checkpointsCount: checkpointsList.length,
      scienceStopsCount: scienceStopsList.length,
      restrictedZonesCount: manualHazards.length,
      notesCount: notesList.length,
      timelineEvents
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `marswalk_ops_3_0_report_${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    addTimelineEvent('simulation', 'Exported Mission Report', 'Downloaded JSON mission analysis document.');
  };

  // Emergency Actions
  const handleTriggerEmergencyReturn = () => {
    setEmergencyMode('emergency_return');
    const grid = new AStarGrid(256, 256);
    const curP = { x: Math.round(astronautPos.x), y: Math.round(astronautPos.y) };
    
    // Honest Emergency Return: Respect hard obstacles, but ignore safety buffers if needed
    const isBlocked = (x: number, y: number) => {
      return analysis.obstacles.some(o => o.blocked && Math.hypot(o.x - (x / 255) * analysis.imageWidth, o.y - (y / 255) * analysis.imageHeight) < o.radius);
    };

    const res = grid.findPath(curP, startPoint, isBlocked, () => 1.0);
    if (res.success && res.path) {
      setActivePath(smoothPathCollisionFree(res.path, isBlocked));
      setSimDistance(0);
      setSimulationState('running');
      addTimelineEvent('emergency', 'EMERGENCY RETURN INITIATED', 'Aborted EVA mission. Returning directly to Start Base.');
    }
  };

  const handleInjectSegmentBlock = () => {
    setEmergencyMode('segment_blocked');
    if (activePath.length > 2) {
      const midP = activePath[Math.floor(activePath.length / 2)];
      setBlockedSegmentCoords(midP);
      addTimelineEvent('emergency', 'Route Segment Blocked', `Injected emergency blockage at X:${midP.x}, Y:${midP.y}`);
    } else {
      setBlockedSegmentCoords({ x: 128, y: 128 });
      addTimelineEvent('emergency', 'Route Segment Blocked', 'Injected emergency blockage at center terrain.');
    }
  };

  // Simulation calculations
  const totalOutboundPx = calculatePathLength(activePath);
  const totalReturnPx = calculatePathLength(returnPath);

  const totalOutboundMeters = totalOutboundPx * spatialScaleMetersPerPx;
  const totalReturnMeters = totalReturnPx * spatialScaleMetersPerPx;
  const totalTraverseMeters = totalOutboundMeters + totalReturnMeters;
  const totalTraverseKm = totalTraverseMeters / 1000;

  const walkingSpeedMps = (walkingSpeedKmh * 1000) / 3600;
  const walkingDurationSecs = walkingSpeedMps > 0 ? totalTraverseMeters / walkingSpeedMps : 0;
  const walkingDurationHours = walkingDurationSecs / 3600;

  const totalCheckpointDwellMins = checkpointsList.reduce((acc, c) => acc + (c.dwellMins || 10), 0);
  const totalScienceDwellMins = scienceStopsList.reduce((acc, s) => acc + (s.dwellMins || 15), 0);
  const totalDwellHours = (totalCheckpointDwellMins + totalScienceDwellMins) / 60;

  const totalMissionHours = walkingDurationHours + totalDwellHours;

  const totalOxygenBurnedL = Math.round(totalMissionHours * oxygenBurnRateLph * numAstronauts * resourceShortageFactor);
  const remainingOxygenL = Math.max(0, oxygenReserveLitres - totalOxygenBurnedL);
  const remainingOxygenPct = Math.round((remainingOxygenL / (oxygenReserveLitres || 1)) * 100);

  const totalEnergyConsumedWh = Math.round(totalMissionHours * energyPowerWatts * numAstronauts * resourceShortageFactor);
  const remainingEnergyWh = Math.max(0, suitEnergyWh - totalEnergyConsumedWh);
  const remainingEnergyPct = Math.round((remainingEnergyWh / (suitEnergyWh || 1)) * 100);

  const isFeasible = routeFeasible && totalMissionHours <= maxMissionDurationHours && remainingOxygenPct >= safetyReservePct && remainingEnergyPct >= safetyReservePct;

  // Simulation Loop & Pulsating Progress Loop
  useEffect(() => {
    let animId: number;
    const animatePulse = (t: number) => {
      setPulsatingProgressRatio((Math.sin(t / 400) + 1) / 2);
      animId = requestAnimationFrame(animatePulse);
    };
    animId = requestAnimationFrame(animatePulse);
    return () => cancelAnimationFrame(animId);
  }, []);

  useEffect(() => {
    if (simulationState !== 'running') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimeRef.current = null;
      return;
    }

    const updateSim = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const increment = dt * 20 * simSpeed;
      setSimDistance(prev => {
        const next = prev + increment;
        if (next >= totalOutboundPx) {
          setSimulationState('completed');
          addTimelineEvent('simulation', 'EVA Simulation Completed', 'Astronaut traversed entire planned route to Destination.');
          return totalOutboundPx;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(updateSim);
    };

    animFrameRef.current = requestAnimationFrame(updateSim);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [simulationState, simSpeed, totalOutboundPx]);

  const getAstronautPosOnPath = (): { x: number; y: number; angle: number } => {
    if (activePath.length < 2) return { x: startPoint?.x || 0, y: startPoint?.y || 0, angle: 0 };
    let accumulated = 0;
    for (let i = 0; i < activePath.length - 1; i++) {
      const p1 = activePath[i];
      const p2 = activePath[i + 1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (accumulated + dist >= simDistance) {
        const remain = simDistance - accumulated;
        const ratio = dist > 0 ? remain / dist : 0;
        const rx = p1.x + (p2.x - p1.x) * ratio;
        const ry = p1.y + (p2.y - p1.y) * ratio;
        const angleDeg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
        return { x: rx, y: ry, angle: angleDeg };
      }
      accumulated += dist;
    }
    const lastP = activePath[activePath.length - 1];
    return { x: lastP.x, y: lastP.y, angle: 0 };
  };

  const astronautPos = getAstronautPosOnPath();

  const getRouteDirectionNodes = (path: Array<{ x: number; y: number }>, stepDist = 14) => {
    if (!path || path.length < 2) return [];
    const nodes: Array<{ x: number; y: number; angle: number }> = [];
    let accumulated = 0;
    let target = stepDist;

    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      while (accumulated + segLen >= target) {
        const remain = target - accumulated;
        const ratio = segLen > 0 ? remain / segLen : 0;
        const nx = p1.x + (p2.x - p1.x) * ratio;
        const ny = p1.y + (p2.y - p1.y) * ratio;
        const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
        nodes.push({ x: nx, y: ny, angle });
        target += stepDist;
      }
      accumulated += segLen;
    }
    return nodes;
  };

  const routeNodes = getRouteDirectionNodes(activePath, 16);

  // Detail for Selected Annotation Property Inspector (Section 1)
  const getSelectedItemDetail = () => {
    if (!selectedItem) return null;
    if (selectedItem.type === 'start') return { type: 'start', name: 'Start Base Location', coords: startPoint ? `X:${startPoint.x}, Y:${startPoint.y}` : 'Unset' };
    if (selectedItem.type === 'dest') return { type: 'dest', name: 'Destination Target', coords: destinationPoint ? `X:${destinationPoint.x}, Y:${destinationPoint.y}` : 'Unset' };
    if (selectedItem.type === 'checkpoint') {
      const cp = checkpointsList.find(c => c.id === selectedItem.id);
      return cp ? { type: 'checkpoint', ...cp } : null;
    }
    if (selectedItem.type === 'science') {
      const sc = scienceStopsList.find(s => s.id === selectedItem.id);
      return sc ? { type: 'science', ...sc } : null;
    }
    if (selectedItem.type === 'hazard') {
      const hz = manualHazards.find(h => h.id === selectedItem.id);
      return hz ? { type: 'hazard', ...hz } : null;
    }
    if (selectedItem.type === 'polygon') {
      const poly = restrictedPolygons.find(p => p.id === selectedItem.id);
      return poly ? { type: 'polygon', ...poly } : null;
    }
    if (selectedItem.type === 'measure') {
      const ms = measurementsList.find(m => m.id === selectedItem.id);
      return ms ? { type: 'measure', ...ms } : null;
    }
    if (selectedItem.type === 'note') {
      const nt = notesList.find(n => n.id === selectedItem.id);
      return nt ? { type: 'note', ...nt } : null;
    }
    return null;
  };

  const selectedDetail: any = getSelectedItemDetail();

  const nw = naturalDimensions.width || 256;
  const nh = naturalDimensions.height || 256;
  const sx = (x: number) => (x / 256) * nw;
  const sy = (y: number) => (y / 256) * nh;
  const markerScale = Math.max(1, Math.min(nw, nh) / 256);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1920px] mx-auto text-xs font-sans w-full bg-[#05070E]">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" />

      {/* 1. TOP MISSION TITLE BAR */}
      <div className="bg-[#090D1A] border border-slate-800/80 px-5 py-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-600 to-emerald-600 text-white shadow-md shrink-0">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight font-sans truncate">
                MARSWALK OPS: Intelligent Traverse &amp; Terrain Analytics
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 border ${
                isFeasible
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {isFeasible ? 'EVA FEASIBLE' : 'LIMIT VIOLATION'}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 border ${
                analysis.isDemCalibrated
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              }`}>
                {analysis.isDemCalibrated && analysis.demElevationRange
                  ? `DEM CALIBRATED (${Math.round(analysis.demElevationRange[0])}..${Math.round(analysis.demElevationRange[1])}m)`
                  : '2D OPTICAL FRAME · UNCALIBRATED ELEVATION'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] font-mono mt-0.5 truncate">
              {imageProvenance.source || 'NASA Surface Optical Frame'} · Sol {imageProvenance.sol} ·{' '}
              {analysis.isDemCalibrated && analysis.demResolutionMeters
                ? `Calibrated DEM (${analysis.demResolutionMeters} m/px · ${analysis.demCalibrationSource})`
                : `2D Pixel Scale (~${spatialScaleMetersPerPx} m/px est.) — Elevation/Slope require orbital or stereo DEM`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.value = '';
              fileInputRef.current?.click();
            }}
            className="px-3 py-1.5 rounded-lg bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/50 text-orange-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>



          <button
            onClick={() => {
              setDisplayMode('route');
              setShowSelectedRoute(true);
              setShowWaypoints(true);
              addTimelineEvent('route', 'Route Plotted', 'Calculated and displayed primary navigation trajectory overlay.');
            }}
            disabled={imageStatus !== 'loaded'}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
            title="Explicitly plot and display calculated navigation route"
          >
            <Route className="w-3.5 h-3.5 text-cyan-200" />
            <span>PLOT ROUTE</span>
          </button>

          <button
            onClick={handleAnalyzeImage}
            disabled={imageStatus !== 'loaded' || isAnalyzingImage}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-mono font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-all"
            title="Explicitly run AI hazard detection and display results"
          >
            <Cpu className={`w-3.5 h-3.5 ${isAnalyzingImage ? 'animate-spin' : ''}`} />
            <span>{isAnalyzingImage ? 'DETECTING...' : 'DETECT HAZARDS'}</span>
          </button>

          <button
            onClick={() => {
              setDisplayMode('original');
              setShowSelectedRoute(false);
              setShowWaypoints(false);
              setShowRestrictedZones(false);
              addTimelineEvent('image', 'Clean Original View', 'Hidden all graphical overlays.');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
              displayMode === 'original' && !showSelectedRoute && !showRestrictedZones
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Hide all overlays and show clean original terrain image"
          >
            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
            <span>CLEAN ORIGINAL</span>
          </button>
        </div>
      </div>

      {/* REGION CONTEXT BANNER */}
      {selectedRegion && (
        <div className="bg-gradient-to-r from-[#0a1128] via-[#0d1838] to-[#0a1128] border border-cyan-500/40 rounded-2xl px-5 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xl relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-full bg-cyan-500/5 blur-xl pointer-events-none" />
          <div className="flex items-center gap-3 min-w-0 z-10">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shrink-0 shadow-inner">
              <MapPin className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold tracking-wider">Active Base Camp Region:</span>
                <strong className="text-sm font-bold text-white tracking-tight">{selectedRegion.name}</strong>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono">
                  {selectedRegion.latitude}, {selectedRegion.longitude} ({selectedRegion.elevation})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-mono">
                  {selectedRegion.quadrangle}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 truncate max-w-3xl font-sans">
                {selectedRegion.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 z-10 font-mono text-[10px]">
            <div className="px-2.5 py-1 rounded-lg bg-black/50 border border-slate-800 text-center">
              <span className="text-slate-400 block text-[9px]">WATER ICE</span>
              <strong className="text-cyan-300 font-bold">{selectedRegion.waterIceScore}%</strong>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-black/50 border border-slate-800 text-center">
              <span className="text-slate-400 block text-[9px]">FLATNESS</span>
              <strong className="text-emerald-300 font-bold">{selectedRegion.flatnessScore}%</strong>
            </div>
            <button
              onClick={() => setActiveWorkspace('base-camp-intel')}
              className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-200 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Explore all Base Camp Regions"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Change Region</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN WORKSPACE TWO-COLUMN LAYOUT: LEFT TERRAIN WORKSPACE + RIGHT PERSISTENT MISSION CONTROL TOOLBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start flex-1 min-h-[560px]">
        
        {/* LEFT COLUMN: TERRAIN WORKSPACE & DISPLAY MODES (lg:col-span-9 ~75%) */}
        <div className="lg:col-span-9 space-y-3 flex flex-col min-h-[560px]">
          {/* Display-Mode Switcher Bar & Viewport Actions */}
          <div className="bg-[#090D1A] border border-slate-800/80 px-4 py-2 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-md">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] px-1 font-sans uppercase font-bold">Display Mode:</span>
                {(['original', 'route', 'annotations', 'analysis', 'split_comparison'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setDisplayMode(m)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all cursor-pointer ${
                      displayMode === m
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {m === 'split_comparison' ? 'Split View' : m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-slate-800">
              <button onClick={() => handleZoomAction(1.25)} className="p-1 rounded hover:bg-white/10 text-slate-300 cursor-pointer" title="Zoom In">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-cyan-300 px-1 font-mono font-bold">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => handleZoomAction(0.8)} className="p-1 rounded hover:bg-white/10 text-slate-300 cursor-pointer" title="Zoom Out">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleFitToWorkspace()}
                className="px-2.5 py-1 rounded-md bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Fit image to workspace"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Fit to Workspace</span>
              </button>
              <button onClick={() => { setZoomLevel(1.0); setPanOffset({ x: 0, y: 0 }); }} className="p-1.5 rounded hover:bg-white/10 text-slate-400 cursor-pointer" title="Reset 100%">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CONFIRM CLEAR ANNOTATIONS MODAL */}
          {clearConfirmOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0a0e1c] border border-red-500/40 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>Confirm Clear All Annotations</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Are you sure you want to delete all custom checkpoints, science POIs, restricted hazard zones, distance rulers, and notes?
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setClearConfirmOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmClearAll}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer shadow"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* TERRAIN VIEWER CONTAINER */}
      <div
        ref={viewerContainerRef}
        onWheel={handleWheelZoom}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDropUpload}
        className={`bg-[#03050C] border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between relative overflow-hidden shadow-2xl transition-all ${
          isFullscreen ? 'fixed inset-4 z-50 bg-[#03050C] border-cyan-500/50' : 'min-h-[520px]'
        }`}
      >
          {/* Top Metadata Bar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 z-20 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-slate-200">
                {imageProvenance.rover} · {imageProvenance.camera}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">Sol {imageProvenance.sol}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleRightInspector}
                className={`px-2 py-0.5 rounded border text-[10px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  rightInspectorOpen
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                    : 'bg-black/40 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Toggle Right Inspector Panel (Shortcut: I)"
              >
                <Sliders className="w-3 h-3" />
                <span>{rightInspectorOpen ? 'Hide Inspector' : 'Show Inspector'}</span>
                <kbd className="px-1 py-0.2 rounded bg-black/60 text-[9px] text-cyan-300 border border-cyan-500/30">I</kbd>
              </button>
              <button onClick={() => setShowMetadataStrip(prev => !prev)} className="px-2 py-0.5 rounded bg-black/40 border border-slate-800 text-slate-400 hover:text-white cursor-pointer">
                {showMetadataStrip ? 'Hide Strip' : 'Show Strip'}
              </button>
              <button onClick={() => setIsFullscreen(prev => !prev)} className="p-1 rounded bg-black/40 border border-slate-800 text-slate-300 hover:text-white cursor-pointer" title="Toggle Fullscreen">
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE METADATA STRIP */}
          {showMetadataStrip && imageStatus === 'loaded' && (
            <div className="mt-2 p-2.5 bg-[#070A15] border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-300 shrink-0">
              <div>
                <span className="text-slate-500 block">Identifier:</span>
                <strong className="text-white truncate block">{imageProvenance.identifier || 'NASA_OPTICAL'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Dimensions:</span>
                <strong className="text-cyan-300 block">{naturalDimensions.width} × {naturalDimensions.height} px</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Source:</span>
                <strong className="text-emerald-400 truncate block">{imageProvenance.source || 'NASA JPL Raw'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Spatial Scale:</span>
                <strong className="text-amber-300 block">{spatialScaleMetersPerPx} m/px (Calibrated)</strong>
              </div>
            </div>
          )}

          {/* MAIN TERRAIN CANVAS WORKSPACE */}
          {imageStatus === 'loaded' ? (
            <div className="flex-1 flex flex-col items-center justify-center relative my-2 min-h-[400px]">
              {/* Image Load Error Banner */}
              {imageLoadError && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-red-950/90 border border-red-500/60 text-red-200 px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xl">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{imageLoadError.message}</span>
                  <button onClick={() => setImageLoadError(null)} className="ml-2 text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Exact Cursor Coordinates Display */}
              {cursorPos && (
                <div className="absolute top-2 left-2 z-20 px-2.5 py-1 rounded bg-black/85 border border-slate-800 text-[10px] font-mono text-cyan-300 pointer-events-none shadow-md">
                  Cursor X: {cursorPos.x} px, Y: {cursorPos.y} px
                </div>
              )}

              {/* ANNOTATION PROPERTY INSPECTOR MODAL/DRAWER (SECTION 1) */}
              {selectedDetail && (
                <div className="absolute top-2 right-2 z-20 p-3 bg-[#0a0e1c]/95 border border-cyan-500/60 rounded-xl text-[11px] font-mono shadow-2xl space-y-2 w-64 backdrop-blur-md max-h-[90%] overflow-y-auto">
                  <div className="flex items-center justify-between font-bold text-cyan-300 border-b border-slate-800 pb-1">
                    <span className="truncate max-w-[160px]">{selectedDetail.name || selectedDetail.label || selectedDetail.title || 'Selected Item'}</span>
                    <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {selectedDetail.type === 'checkpoint' && (
                    <div className="space-y-1.5 text-[10px] text-slate-300">
                      <div>
                        <label className="text-slate-400 block">Name:</label>
                        <input
                          type="text"
                          value={selectedDetail.name}
                          onChange={e => setCheckpointsList(prev => prev.map(c => c.id === selectedDetail.id ? { ...c, name: e.target.value } : c))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block">Dwell Time (mins):</label>
                        <input
                          type="number"
                          value={selectedDetail.dwellMins || 10}
                          onChange={e => setCheckpointsList(prev => prev.map(c => c.id === selectedDetail.id ? { ...c, dwellMins: Number(e.target.value) } : c))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300"
                        />
                      </div>
                      <button
                        onClick={() => removeCheckpoint(selectedDetail.id!)}
                        className="w-full py-1 bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded font-bold mt-1 cursor-pointer"
                      >
                        Delete Checkpoint
                      </button>
                    </div>
                  )}

                  {selectedDetail.type === 'science' && (
                    <div className="space-y-1.5 text-[10px] text-slate-300">
                      <div>
                        <label className="text-slate-400 block">POI Name:</label>
                        <input
                          type="text"
                          value={selectedDetail.name || ''}
                          onChange={e => setScienceStopsList(prev => prev.map(s => s.id === selectedDetail.id ? { ...s, name: e.target.value } : s))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block">Scientific Objective:</label>
                        <input
                          type="text"
                          value={selectedDetail.scientificObjective || ''}
                          onChange={e => setScienceStopsList(prev => prev.map(s => s.id === selectedDetail.id ? { ...s, scientificObjective: e.target.value } : s))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-indigo-300"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block">Description / Context:</label>
                        <textarea
                          rows={2}
                          value={selectedDetail.description || ''}
                          onChange={e => setScienceStopsList(prev => prev.map(s => s.id === selectedDetail.id ? { ...s, description: e.target.value } : s))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-[10px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="text-slate-400 block">Priority:</label>
                          <select
                            value={selectedDetail.priority || 'High'}
                            onChange={e => setScienceStopsList(prev => prev.map(s => s.id === selectedDetail.id ? { ...s, priority: e.target.value as any } : s))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-cyan-300"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-400 block">Status:</label>
                          <select
                            value={selectedDetail.status || 'Unvisited'}
                            onChange={e => setScienceStopsList(prev => prev.map(s => s.id === selectedDetail.id ? { ...s, status: e.target.value as any } : s))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-emerald-300"
                          >
                            <option value="Unvisited">Unvisited</option>
                            <option value="Active">Active</option>
                            <option value="Sampled">Sampled</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 block">Dwell Time (mins):</label>
                        <input
                          type="number"
                          value={selectedDetail.dwellMins || 15}
                          onChange={e => setScienceStopsList(prev => prev.map(s => s.id === selectedDetail.id ? { ...s, dwellMins: Number(e.target.value) } : s))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-amber-300"
                        />
                      </div>
                      <button
                        onClick={() => removeScienceStop(selectedDetail.id!)}
                        className="w-full py-1 bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded font-bold mt-1 cursor-pointer"
                      >
                        Delete Science POI
                      </button>
                    </div>
                  )}

                  {selectedDetail.type === 'polygon' && (
                    <div className="space-y-1.5 text-[10px] text-slate-300">
                      <div>
                        <label className="text-slate-400 block">Zone Label:</label>
                        <input
                          type="text"
                          value={selectedDetail.label || ''}
                          onChange={e => setRestrictedPolygons(prev => prev.map(p => p.id === selectedDetail.id ? { ...p, label: e.target.value } : p))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block">Hazard Reason:</label>
                        <input
                          type="text"
                          value={selectedDetail.reason || ''}
                          onChange={e => setRestrictedPolygons(prev => prev.map(p => p.id === selectedDetail.id ? { ...p, reason: e.target.value } : p))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-amber-300"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-400">Vertices Count:</span>
                        <strong className="text-white">{selectedDetail.vertices?.length || 0} pts</strong>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="blockedChk"
                          checked={selectedDetail.blocked !== false}
                          onChange={e => setRestrictedPolygons(prev => prev.map(p => p.id === selectedDetail.id ? { ...p, blocked: e.target.checked } : p))}
                          className="rounded bg-slate-900 border-slate-700 text-amber-500"
                        />
                        <label htmlFor="blockedChk" className="text-amber-300 font-bold">Enforce Path Avoidance</label>
                      </div>
                      <button
                        onClick={() => removePolygon(selectedDetail.id!)}
                        className="w-full py-1 bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded font-bold mt-1 cursor-pointer"
                      >
                        Delete Restricted Zone
                      </button>
                    </div>
                  )}

                  {selectedDetail.type === 'measure' && (
                    <div className="space-y-1.5 text-[10px] text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Distance Px:</span>
                        <strong className="text-teal-300">{selectedDetail.distPx} px</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Physical Scale:</span>
                        <strong className={selectedDetail.isPhysicalCalibrated ? "text-emerald-400" : "text-amber-400"}>
                          {selectedDetail.isPhysicalCalibrated && selectedDetail.physicalDistM !== null
                            ? `${selectedDetail.physicalDistM} m`
                            : "___ px | Physical scale unavailable"}
                        </strong>
                      </div>
                      <button
                        onClick={() => removeMeasurement(selectedDetail.id!)}
                        className="w-full py-1 bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded font-bold mt-1 cursor-pointer"
                      >
                        Delete Measurement
                      </button>
                    </div>
                  )}

                  {selectedDetail.type === 'note' && (
                    <div className="space-y-1.5 text-[10px] text-slate-300">
                      <div>
                        <label className="text-slate-400 block">Note Title:</label>
                        <input
                          type="text"
                          value={selectedDetail.title || ''}
                          onChange={e => setNotesList(prev => prev.map(n => n.id === selectedDetail.id ? { ...n, title: e.target.value } : n))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-purple-300 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block">Text Content:</label>
                        <textarea
                          rows={3}
                          value={selectedDetail.text || ''}
                          onChange={e => setNotesList(prev => prev.map(n => n.id === selectedDetail.id ? { ...n, text: e.target.value } : n))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                        />
                      </div>
                      <button
                        onClick={() => removeNote(selectedDetail.id!)}
                        className="w-full py-1 bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded font-bold mt-1 cursor-pointer"
                      >
                        Delete Note
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVE NAVIGATION STATUS STRIP & VISUAL LAYER TOGGLES */}
              <div className="w-full mb-2 p-2 rounded-xl bg-[#070b18] border border-slate-800 flex flex-col gap-2 text-[10px] font-mono text-slate-300 shadow-inner shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Active Tool Guide Badge */}
                    <div className={`px-2 py-0.5 rounded-full border font-bold flex items-center gap-1.5 ${
                      activeTool === 'start'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 animate-pulse'
                        : activeTool === 'destination'
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 animate-pulse'
                        : activeTool === 'inspect'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : activeTool === 'measure'
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                        : activeTool === 'pan'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>
                        {activeTool === 'start'
                          ? 'SELECT START: Click terrain to set Start Base (Blue)'
                          : activeTool === 'destination'
                          ? 'SELECT DESTINATION: Click terrain to set Destination Target (Orange)'
                          : activeTool === 'inspect'
                          ? 'INSPECT MODE: Hover over terrain to inspect elevation & slope'
                          : activeTool === 'measure'
                          ? 'MEASURE MODE: Click two points to measure distance'
                          : activeTool === 'pan'
                          ? 'PAN MODE: Click and drag to pan terrain view'
                          : 'IDLE: Click a tool to activate, or drag markers'}
                      </span>
                    </div>

                    {/* Start Point Badge */}
                    <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded border border-slate-800">
                      <span className="text-blue-400 font-bold">Start:</span>
                      <span className={startPoint ? "text-blue-300 font-bold" : "text-slate-500"}>
                        {startPoint ? `(${startPoint.x}, ${startPoint.y})` : 'Unset'}
                      </span>
                      {startPoint && (
                        <button onClick={handleClearStart} className="text-slate-500 hover:text-red-400 ml-0.5 cursor-pointer" title="Clear Start">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    {/* Destination Point Badge */}
                    <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded border border-slate-800">
                      <span className="text-orange-400 font-bold">Dest:</span>
                      <span className={destinationPoint ? "text-orange-300 font-bold" : "text-slate-500"}>
                        {destinationPoint ? `(${destinationPoint.x}, ${destinationPoint.y})` : 'Unset'}
                      </span>
                      {destinationPoint && (
                        <button onClick={handleClearDestination} className="text-slate-500 hover:text-red-400 ml-0.5 cursor-pointer" title="Clear Destination">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    {/* Cursor Coordinates */}
                    <div className="bg-black/60 px-2 py-0.5 rounded border border-slate-800 text-cyan-300">
                      Cursor: {cursorPos ? `X:${cursorPos.x}, Y:${cursorPos.y}` : '--'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeRoute && (
                      <span className={`px-2 py-0.5 rounded font-bold border text-[10px] ${
                        activeRoute.isBlocked
                          ? 'bg-red-500/20 text-red-400 border-red-500/50'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      }`}>
                        {activeRoute.isBlocked ? '⚠️ NO SAFE ROUTE' : `SAFE ROUTE · ${(activeRoute.totalLengthM || totalOutboundPx * spatialScaleMetersPerPx).toFixed(1)} m`}
                      </span>
                    )}
                    {(!startPoint || !destinationPoint) && (
                      <span className="text-amber-400/90 text-[10px]">
                        {!startPoint && !destinationPoint ? 'Set Start & Dest to plan route' : !startPoint ? 'Set Start Base' : 'Set Destination Target'}
                      </span>
                    )}
                  </div>
                </div>

                {/* WORKSPACE VIEW CONTROLS & SIMULATION */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5 border-t border-slate-800/80 text-[10px]">
                  {/* Clean Display Toggles */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold">Display:</span>

                    {/* Planned Route Toggle (Cyan) */}
                    <button
                      onClick={() => setShowSelectedRoute(p => !p)}
                      className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 cursor-pointer font-bold transition ${
                        showSelectedRoute
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                          : 'bg-black/40 text-slate-500 border-slate-800 line-through'
                      }`}
                      title="Toggle planned rover route overlay"
                    >
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Planned Route</span>
                    </button>

                    {/* Waypoints Toggle */}
                    <button
                      onClick={() => setShowWaypoints(p => !p)}
                      className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 cursor-pointer font-bold transition ${
                        showWaypoints
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-xs'
                          : 'bg-black/40 text-slate-500 border-slate-800 line-through'
                      }`}
                      title="Toggle intermediate waypoint nodes"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>Waypoints</span>
                    </button>
                  </div>

                  {/* Quick Simulation Trigger */}
                  {activeRoute && !activeRoute.isBlocked && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => isPlaying ? pauseTraversal() : startTraversal()}
                        className="px-3 py-1 rounded-md bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5 text-cyan-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
                        <span>{isPlaying ? 'Pause' : 'Simulate Rover'}</span>
                      </button>
                      {(isPlaying || traversalProgress > 0) && (
                        <button
                          onClick={resetTraversal}
                          className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                          title="Reset Rover Traversal"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* NATURAL ADAPTIVE VIEWPORT CONTAINER */}
              <div
                ref={viewportRef}
                onMouseDown={handleMouseDownView}
                onMouseMove={handleMouseMoveView}
                onMouseUp={handleMouseUpView}
                className="relative w-full flex-1 overflow-hidden rounded-xl border border-slate-700/80 bg-[#070A14] flex items-center justify-center transition-all shadow-2xl"
                style={{ minHeight: '480px', maxHeight: isFullscreen ? '85vh' : '640px' }}
              >
                {/* DISPLAY MODES RENDERING (SECTION 2) */}
                {displayMode === 'split_comparison' ? (
                  /* SPLIT VIEW MODE: Original vs Genuine Analysis Output */
                  <div className="w-full h-full grid grid-cols-2 gap-1 p-1 bg-black">
                    <div className="relative overflow-hidden flex items-center justify-center border-r border-slate-800">
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-black/80 text-[9px] text-slate-300 font-mono">Original Unmodified Surface</span>
                      {getSafeImageUrl(terrainImage) && (
                        <img src={getSafeImageUrl(terrainImage)} alt="Original" className="w-full h-full object-contain select-none" />
                      )}
                    </div>
                    <div className="relative overflow-hidden flex items-center justify-center bg-slate-950 p-2">
                      <span className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[9px] text-cyan-300 font-mono">
                        Segmentation &amp; Region Output
                      </span>
                      {hasAnalyzed ? (
                        <div
                          className="relative flex items-center justify-center"
                          style={{ aspectRatio: `${nw} / ${nh}`, maxHeight: '100%', maxWidth: '100%' }}
                        >
                          {getSafeImageUrl(terrainImage) && (
                            <img src={getSafeImageUrl(terrainImage)} alt="Analysis Result" className="w-full h-full object-contain select-none" />
                          )}
                          <canvas
                            ref={splitMaskCanvasRef}
                            width={256}
                            height={256}
                            className="absolute inset-0 w-full h-full pointer-events-none opacity-60"
                          />
                          {terrainIntelligence && showRegionOverlays && (
                            <svg
                              viewBox={`0 0 ${nw} ${nh}`}
                              preserveAspectRatio="xMidYMid meet"
                              className="absolute inset-0 w-full h-full pointer-events-none"
                            >
                              {terrainIntelligence.regions.map((reg) => {
                                const rx = reg.normX * nw;
                                const ry = reg.normY * nh;
                                const rw = reg.normWidth * nw;
                                const rh = reg.normHeight * nh;
                                const strokeColor = reg.hazardLevel === 'high' ? '#f43f5e' : reg.hazardLevel === 'moderate' ? '#f59e0b' : '#22d3ee';
                                return (
                                  <g key={reg.id}>
                                    <rect
                                      x={rx}
                                      y={ry}
                                      width={rw}
                                      height={rh}
                                      fill="none"
                                      stroke={strokeColor}
                                      strokeWidth={1.6 * markerScale}
                                      strokeDasharray={`${4 * markerScale} ${2 * markerScale}`}
                                    />
                                    <rect
                                      x={rx}
                                      y={Math.max(0, ry - 13 * markerScale)}
                                      width={Math.min(rw, 110 * markerScale)}
                                      height={13 * markerScale}
                                      rx={2 * markerScale}
                                      fill="rgba(3, 7, 18, 0.85)"
                                    />
                                    <text
                                      x={rx + 3 * markerScale}
                                      y={Math.max(9 * markerScale, ry - 3.5 * markerScale)}
                                      fill={strokeColor}
                                      fontSize={8 * markerScale}
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                    >
                                      {reg.id} · {reg.classification.slice(0, 14)}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-slate-400 font-mono text-[11px] space-y-2">
                          <Cpu className="w-6 h-6 text-slate-600 mx-auto" />
                          <p className="font-bold text-slate-300">Model Inference Required</p>
                          <p className="text-[10px] text-slate-500 max-w-xs">Run &apos;DETECT HAZARDS&apos; to execute segmentation and render real predicted outputs.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* UNIFIED HIGH-PRECISION INTERACTIVE VIEWPORT (ORIGINAL, ROUTE, ANNOTATIONS, ANALYSIS) */
                  <div
                    className="relative transition-transform duration-75 ease-out select-none will-change-transform shrink-0"
                    style={{
                      transform: `translate(${panOffset.x || 0}px, ${panOffset.y || 0}px) scale(${zoomLevel || 1.0})`,
                      width: `${nw}px`,
                      height: `${nh}px`,
                      transformOrigin: 'center center'
                    }}
                  >
                    {getSafeImageUrl(terrainImage) && (
                      <img
                        ref={imageRef}
                        src={getSafeImageUrl(terrainImage)}
                        alt="Mars Terrain Surface"
                        crossOrigin={terrainImage && terrainImage.startsWith('http') ? "anonymous" : undefined}
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        className="absolute inset-0 w-full h-full block object-contain rounded-lg shadow-lg select-none pointer-events-none"
                        draggable={false}
                      />
                    )}

                    {/* REAL PIXEL SEGMENTATION MASK OVERLAY (ONLY IN 'analysis' MODE) */}
                    {displayMode === 'analysis' && hasAnalyzed && (
                      <canvas
                        ref={maskCanvasRef}
                        width={256}
                        height={256}
                        className="absolute inset-0 w-full h-full pointer-events-none opacity-55 rounded-lg"
                      />
                    )}

                    {/* HIGH-PRECISION SVG ROUTE, TERRAIN REGIONS & ANNOTATIONS LAYER */}
                    <svg
                      viewBox={`0 0 ${nw} ${nh}`}
                      preserveAspectRatio="xMidYMid meet"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      <defs>
                        <linearGradient id="routeCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#00f0ff" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                        <linearGradient id="startPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="50%" stopColor="#2563eb" />
                          <stop offset="100%" stopColor="#1e40af" />
                        </linearGradient>
                        <linearGradient id="destPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f87171" />
                          <stop offset="50%" stopColor="#dc2626" />
                          <stop offset="100%" stopColor="#991b1b" />
                        </linearGradient>
                        <filter id="shadowOutline" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="0" stdDeviation={1.2 * markerScale} floodColor="#000000" floodOpacity="0.9" />
                        </filter>
                        <filter id="startGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="0" stdDeviation={2.2 * markerScale} floodColor="#2563eb" floodOpacity="0.9" />
                        </filter>
                        <filter id="destGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="0" stdDeviation={2.2 * markerScale} floodColor="#dc2626" floodOpacity="0.9" />
                        </filter>
                        <filter id="start3DGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="2" stdDeviation={2.5 * markerScale} floodColor="#38bdf8" floodOpacity="0.8" />
                        </filter>
                        <filter id="dest3DGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="2" stdDeviation={2.5 * markerScale} floodColor="#f87171" floodOpacity="0.8" />
                        </filter>
                      </defs>

                      {/* DETECTED TERRAIN REGION BOUNDING-BOX OVERLAYS */}
                      {terrainIntelligence && (showRegionOverlays || selectedTerrainRegionId || hoveredTerrainRegionId) && (displayMode === 'analysis' || Boolean(selectedTerrainRegionId) || Boolean(hoveredTerrainRegionId)) && (
                        <g pointerEvents="none">
                          {terrainIntelligence.regions.map((reg) => {
                            const isSelected = selectedTerrainRegionId === reg.id;
                            const isHovered = hoveredTerrainRegionId === reg.id;
                            const isActive = isSelected || isHovered;
                            if (!showRegionOverlays && !isActive) return null;
                            if (displayMode !== 'analysis' && !isActive) return null;

                            const rx = reg.normX * nw;
                            const ry = reg.normY * nh;
                            const rw = reg.normWidth * nw;
                            const rh = reg.normHeight * nh;
                            const baseColor =
                              reg.hazardLevel === 'high' ? '#f43f5e'
                              : reg.hazardLevel === 'moderate' ? '#f59e0b'
                              : '#22d3ee';
                            const fillColor =
                              reg.hazardLevel === 'high' ? 'rgba(244, 63, 94, 0.14)'
                              : reg.hazardLevel === 'moderate' ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(34, 211, 238, 0.12)';
                            const tick = Math.min(12 * markerScale, rw * 0.2, rh * 0.2);

                            return (
                              <g key={reg.id} opacity={selectedTerrainRegionId || hoveredTerrainRegionId ? (isActive ? 1 : 0.35) : 0.92}>
                                <rect
                                  x={rx}
                                  y={ry}
                                  width={rw}
                                  height={rh}
                                  fill={isActive ? fillColor : 'transparent'}
                                  stroke={baseColor}
                                  strokeWidth={(isActive ? 2.4 : 1.4) * markerScale}
                                  strokeDasharray={isActive ? undefined : `${5 * markerScale} ${3 * markerScale}`}
                                  rx={3 * markerScale}
                                />
                                {/* Crisp corner brackets */}
                                <path
                                  d={`M ${rx} ${ry + tick} L ${rx} ${ry} L ${rx + tick} ${ry} M ${rx + rw - tick} ${ry} L ${rx + rw} ${ry} L ${rx + rw} ${ry + tick} M ${rx} ${ry + rh - tick} L ${rx} ${ry + rh} L ${rx + tick} ${ry + rh} M ${rx + rw - tick} ${ry + rh} L ${rx + rw} ${ry + rh} L ${rx + rw} ${ry + rh - tick}`}
                                  fill="none"
                                  stroke={baseColor}
                                  strokeWidth={(isActive ? 3 : 2) * markerScale}
                                  strokeLinecap="round"
                                />
                                {(isActive || displayMode === 'analysis') && (
                                  <g>
                                    <rect
                                      x={rx}
                                      y={Math.max(0, ry - 15 * markerScale)}
                                      width={Math.min(Math.max(76 * markerScale, rw * 0.72), 195 * markerScale)}
                                      height={14 * markerScale}
                                      rx={3 * markerScale}
                                      fill="rgba(5, 8, 20, 0.9)"
                                      stroke={baseColor}
                                      strokeWidth={0.8 * markerScale}
                                    />
                                    <text
                                      x={rx + 4 * markerScale}
                                      y={Math.max(10 * markerScale, ry - 4.5 * markerScale)}
                                      fill="#ffffff"
                                      fontSize={8.5 * markerScale}
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                    >
                                      {reg.id}: {reg.classification} ({reg.areaPct ?? 0}% area)
                                    </text>
                                  </g>
                                )}
                              </g>
                            );
                          })}
                        </g>
                      )}

                      {/* Restricted Zones / Manual Hazards & Science Stops Overlay */}
                      {(displayMode === 'annotations' || displayMode === 'route' || showRestrictedZones) && manualHazards.map((haz) => (
                        <g key={haz.id} transform={`translate(${sx(haz.x)}, ${sy(haz.y)})`}>
                          <circle
                            r={haz.radius * markerScale}
                            fill="rgba(245, 158, 11, 0.16)"
                            stroke="#f59e0b"
                            strokeWidth={1.5 * markerScale}
                            strokeDasharray={`${3 * markerScale} ${2 * markerScale}`}
                          />
                          <circle r={3.5 * markerScale} fill="#f59e0b" stroke="#ffffff" strokeWidth={markerScale} />
                        </g>
                      ))}

                      {(displayMode === 'annotations' || displayMode === 'route' || showWaypoints) && scienceStopsList.map((sci) => (
                        <g key={sci.id} transform={`translate(${sx(sci.x)}, ${sy(sci.y)})`}>
                          <circle r={6 * markerScale} fill="rgba(99, 102, 241, 0.25)" stroke="#818cf8" strokeWidth={1.5 * markerScale} />
                          <circle r={3 * markerScale} fill="#818cf8" stroke="#ffffff" strokeWidth={markerScale} />
                        </g>
                      ))}

                      {(displayMode === 'annotations' || showWaypoints) && checkpointsList.map((cp) => (
                        <g key={cp.id} transform={`translate(${sx(cp.x)}, ${sy(cp.y)})`}>
                          <circle r={4.5 * markerScale} fill="#38bdf8" stroke="#ffffff" strokeWidth={1.2 * markerScale} />
                        </g>
                      ))}

                      {displayMode === 'annotations' && restrictedPolygons.map((poly) => (
                        <polygon
                          key={poly.id}
                          points={poly.vertices.map(v => `${sx(v.x)},${sy(v.y)}`).join(' ')}
                          fill="rgba(239, 68, 68, 0.18)"
                          stroke="#ef4444"
                          strokeWidth={1.5 * markerScale}
                        />
                      ))}

                      {displayMode === 'annotations' && measurementsList.filter(m => m.visible).map((m) => (
                        <g key={m.id}>
                          <line
                            x1={sx(m.startX)}
                            y1={sy(m.startY)}
                            x2={sx(m.endX)}
                            y2={sy(m.endY)}
                            stroke="#2dd4bf"
                            strokeWidth={1.8 * markerScale}
                            strokeDasharray={`${3 * markerScale} ${2 * markerScale}`}
                          />
                          <circle cx={sx(m.startX)} cy={sy(m.startY)} r={2.5 * markerScale} fill="#2dd4bf" />
                          <circle cx={sx(m.endX)} cy={sy(m.endY)} r={2.5 * markerScale} fill="#2dd4bf" />
                        </g>
                      ))}

                      {/* Active Drawing Polygon Preview */}
                      {displayMode === 'annotations' && activeDrawingPolygon.length > 0 && (
                        <g>
                          <polyline
                            points={activeDrawingPolygon.map(v => `${sx(v.x)},${sy(v.y)}`).join(' ')}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth={1.5 * markerScale}
                            strokeDasharray={`${2 * markerScale} ${2 * markerScale}`}
                          />
                          {activeDrawingPolygon.map((v, idx) => (
                            <circle key={idx} cx={sx(v.x)} cy={sy(v.y)} r={2.5 * markerScale} fill="#f59e0b" stroke="#ffffff" strokeWidth={markerScale} />
                          ))}
                          {cursorPos && (
                            <line
                              x1={sx(activeDrawingPolygon[activeDrawingPolygon.length - 1].x)}
                              y1={sy(activeDrawingPolygon[activeDrawingPolygon.length - 1].y)}
                              x2={sx(cursorPos.x)}
                              y2={sy(cursorPos.y)}
                              stroke="#f59e0b"
                              strokeWidth={markerScale}
                              strokeDasharray={`${2 * markerScale} ${2 * markerScale}`}
                            />
                          )}
                        </g>
                      )}

                      {/* Target pulse location ring */}
                      {displayMode === 'annotations' && locatedTarget && (
                        <g transform={`translate(${sx(locatedTarget.x)}, ${sy(locatedTarget.y)})`}>
                          <circle r={14 * markerScale} fill="rgba(0, 240, 255, 0.2)" stroke="#00F0FF" strokeWidth={2 * markerScale} className="animate-ping" />
                          <circle r={6 * markerScale} fill="#00F0FF" stroke="#ffffff" strokeWidth={1.5 * markerScale} />
                        </g>
                      )}

                      {/* 4. PLANNED ROVER ROUTE LAYER (SMOOTH CURVED CYAN) */}
                      {displayMode === 'route' && showSelectedRoute && Boolean(startPoint) && Boolean(destinationPoint) && !activeRoute?.isBlocked && activePath.length > 1 && (
                        <g pointerEvents="none">
                          <path
                            d={activePath.reduce((acc, p, idx, arr) => {
                              const x = sx(p.x);
                              const y = sy(p.y);
                              if (idx === 0) return `M ${x} ${y}`;
                              const prev = arr[idx - 1];
                              const prevX = sx(prev.x);
                              const prevY = sy(prev.y);
                              const midX = (prevX + x) / 2;
                              const midY = (prevY + y) / 2;
                              return `${acc} Q ${prevX} ${prevY}, ${midX} ${midY} T ${x} ${y}`;
                            }, '')}
                            fill="none"
                            stroke="#000000"
                            strokeWidth={4.8 * markerScale}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.85}
                          />
                          <path
                            d={activePath.reduce((acc, p, idx, arr) => {
                              const x = sx(p.x);
                              const y = sy(p.y);
                              if (idx === 0) return `M ${x} ${y}`;
                              const prev = arr[idx - 1];
                              const prevX = sx(prev.x);
                              const prevY = sy(prev.y);
                              const midX = (prevX + x) / 2;
                              const midY = (prevY + y) / 2;
                              return `${acc} Q ${prevX} ${prevY}, ${midX} ${midY} T ${x} ${y}`;
                            }, '')}
                            fill="none"
                            stroke="#00f0ff"
                            strokeWidth={3 * markerScale}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={0.6}
                            filter="url(#shadowOutline)"
                          />
                          <path
                            d={activePath.reduce((acc, p, idx, arr) => {
                              const x = sx(p.x);
                              const y = sy(p.y);
                              if (idx === 0) return `M ${x} ${y}`;
                              const prev = arr[idx - 1];
                              const prevX = sx(prev.x);
                              const prevY = sy(prev.y);
                              const midX = (prevX + x) / 2;
                              const midY = (prevY + y) / 2;
                              return `${acc} Q ${prevX} ${prevY}, ${midX} ${midY} T ${x} ${y}`;
                            }, '')}
                            fill="none"
                            stroke="url(#routeCyanGrad)"
                            strokeWidth={2.2 * markerScale}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Animated Miniature 2D Mars Rover Marker */}
                          {(isPlaying || traversalProgress > 0) && (
                            <g transform={`translate(${sx(roverPos.x)}, ${sy(roverPos.y)}) rotate(${roverPos.angle}) scale(${markerScale})`}>
                              <MarsRoverIcon size={24} />
                            </g>
                          )}
                        </g>
                      )}

                      {/* 5. PROFESSIONAL 3D INVERTED-DROPLET START PIN */}
                      {startPoint && (
                        <g transform={`translate(${sx(startPoint.x)}, ${sy(startPoint.y)}) scale(${markerScale})`} className="cursor-grab">
                          <ellipse cx="0" cy="2" rx="9" ry="3.5" fill="rgba(37, 99, 235, 0.4)" filter="blur(1px)" />
                          <path
                            d="M 0 0 C -6 -10, -11 -15, -11 -21 C -11 -27, -6 -32, 0 -32 C 6 -32, 11 -27, 11 -21 C 11 -15, 6 -10, 0 0 Z"
                            fill="url(#startPinGrad)"
                            stroke="#ffffff"
                            strokeWidth="1.6"
                            filter="url(#start3DGlow)"
                          />
                          <circle cx="0" cy="-21" r="4.5" fill="#ffffff" />
                          <circle cx="0" cy="-21" r="2" fill="#1d4ed8" />
                          <rect x="-22" y="-46" width="44" height="13" rx="3.5" fill="#0B1021" stroke="#38bdf8" strokeWidth="1" />
                          <text x="0" y="-37" textAnchor="middle" fill="#38bdf8" fontSize="8" fontFamily="monospace" fontWeight="bold">START</text>
                        </g>
                      )}

                      {/* 6. PROFESSIONAL 3D INVERTED-DROPLET DESTINATION PIN */}
                      {destinationPoint && (
                        <g transform={`translate(${sx(destinationPoint.x)}, ${sy(destinationPoint.y)}) scale(${markerScale})`} className="cursor-grab">
                          <ellipse cx="0" cy="2" rx="9" ry="3.5" fill="rgba(220, 38, 38, 0.4)" filter="blur(1px)" />
                          <path
                            d="M 0 0 C -6 -10, -11 -15, -11 -21 C -11 -27, -6 -32, 0 -32 C 6 -32, 11 -27, 11 -21 C 11 -15, 6 -10, 0 0 Z"
                            fill="url(#destPinGrad)"
                            stroke="#ffffff"
                            strokeWidth="1.6"
                            filter="url(#dest3DGlow)"
                          />
                          <circle cx="0" cy="-21" r="4.5" fill="#ffffff" />
                          <circle cx="0" cy="-21" r="2" fill="#991b1b" />
                          <rect x="-26" y="-46" width="52" height="13" rx="3.5" fill="#0B1021" stroke="#f87171" strokeWidth="1" />
                          <text x="0" y="-37" textAnchor="middle" fill="#f87171" fontSize="8" fontFamily="monospace" fontWeight="bold">DESTINATION</text>
                        </g>
                      )}
                    </svg>

                    {/* FULLY TRANSPARENT INTERACTIVE CANVAS OVERLAY (ALWAYS ACTIVE FOR CLICKS & DRAGGING) */}
                    <canvas
                      ref={canvasRef}
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={() => setCursorPos(null)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setActiveTool('select');
                        setActiveMeasureStart(null);
                        setActiveDrawingPolygon([]);
                        setDraggingWaypoint(null);
                      }}
                      width={256}
                      height={256}
                      className={`absolute inset-0 w-full h-full ${getCursorClass()}`}
                    />

                    {/* FLOATING "NO SAFE ROUTE FOUND" BANNER */}
                    {activeRoute?.isBlocked && Boolean(startPoint) && Boolean(destinationPoint) && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-red-950/95 border-2 border-red-500 text-white px-4 py-2.5 rounded-xl shadow-2xl flex flex-col items-center gap-1 max-w-sm text-center pointer-events-auto backdrop-blur-md animate-bounce-short">
                        <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>NO SAFE ROUTE FOUND</span>
                        </div>
                        <p className="text-[10px] text-red-200 leading-tight">
                          {activeRoute.explanation || 'All corridors are blocked by detected obstacles or safety clearance margins. Straight-line penetration is strictly prevented.'}
                        </p>
                        <span className="text-[9px] text-slate-400 pt-0.5">
                          Try lowering clearance margin ({safetyBufferPx}px) or repositioning markers.
                        </span>
                      </div>
                    )}

                    {/* FLOATING OBSTACLE PLACEMENT WARNING TOAST */}
                    {obstaclePlacementWarning && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-950/95 border border-amber-500 text-amber-100 px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{obstaclePlacementWarning}</span>
                        <button onClick={() => setObstaclePlacementWarning(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* FLOATING TERRAIN INSPECTOR TOOLTIP */}
                    {activeTool === 'inspect' && cursorPos && (() => {
                      const cx = Math.max(0, Math.min(255, Math.round(cursorPos.x)));
                      const cy = Math.max(0, Math.min(255, Math.round(cursorPos.y)));
                      const idx256 = cy * 256 + cx;
                      const classId = analysis.terrainClassGrid ? analysis.terrainClassGrid[idx256] : null;
                      const surfaceLabel =
                        classId === 0 ? 'Soil / Regolith'
                        : classId === 1 ? 'Bedrock Outcrop'
                        : classId === 2 ? 'Sand / Dunes'
                        : classId === 3 ? 'Big Rock / Hazard'
                        : 'Unclassified (Run Detect Hazards)';
                      const isBlockedCell = analysis.occupancyGrid ? analysis.occupancyGrid[idx256] === 1 : false;

                      let realElevM: number | null = null;
                      let realSlopeDeg: number | null = null;
                      if (analysis.isDemCalibrated && selectedDtmData?.elevationGrid?.length) {
                        const gh = selectedDtmData.elevationGrid.length;
                        const gw = selectedDtmData.elevationGrid[0]?.length || 1;
                        const r = Math.min(gh - 1, Math.max(0, Math.floor((cy / 256) * gh)));
                        const c = Math.min(gw - 1, Math.max(0, Math.floor((cx / 256) * gw)));
                        const eVal = selectedDtmData.elevationGrid[r]?.[c];
                        const sVal = selectedDtmData.slopeGrid?.[r]?.[c];
                        if (typeof eVal === 'number' && Number.isFinite(eVal)) realElevM = eVal;
                        if (typeof sVal === 'number' && Number.isFinite(sVal)) realSlopeDeg = sVal;
                      }

                      return (
                        <div
                          className="absolute z-30 p-2.5 rounded-xl bg-slate-950/95 border border-cyan-500/70 text-[10px] font-mono text-slate-200 shadow-2xl pointer-events-none space-y-1 max-w-[230px]"
                          style={{
                            left: `${Math.min(72, Math.max(2, (cursorPos.x / 256) * 100))}%`,
                            top: `${Math.min(72, Math.max(2, (cursorPos.y / 256) * 100))}%`
                          }}
                        >
                          <div className="flex items-center gap-1.5 text-cyan-400 font-bold border-b border-cyan-500/30 pb-0.5">
                            <Search className="w-3 h-3" />
                            <span>Terrain Inspector</span>
                          </div>
                          <div>Coords: <strong className="text-white">X:{cursorPos.x}, Y:{cursorPos.y}</strong></div>
                          <div>
                            Elevation:{' '}
                            {realElevM !== null ? (
                              <strong className="text-cyan-300">{realElevM.toFixed(1)} m (STAC DEM)</strong>
                            ) : (
                              <strong className="text-amber-300">Requires Calibrated DEM</strong>
                            )}
                          </div>
                          <div>
                            Local Slope:{' '}
                            {realSlopeDeg !== null ? (
                              <strong className={realSlopeDeg > settings.maxSlopeLimitDeg ? 'text-rose-400' : 'text-emerald-400'}>
                                {realSlopeDeg.toFixed(1)}°
                              </strong>
                            ) : (
                              <strong className="text-amber-300">2D Optical Only (No 3D angle)</strong>
                            )}
                          </div>
                          <div>Surface: <strong className="text-slate-100">{surfaceLabel}</strong></div>
                          <div>
                            Traversability:{' '}
                            <strong className={isBlockedCell ? 'text-rose-400' : 'text-emerald-300'}>
                              {isBlockedCell ? 'Blocked / Hazard Zone' : 'Traversable'}
                            </strong>
                          </div>
                          {startPoint && (
                            <div>Dist to Start: <strong className="text-slate-300">{(Math.hypot(cursorPos.x - startPoint.x, cursorPos.y - startPoint.y) * spatialScaleMetersPerPx).toFixed(1)} m</strong></div>
                          )}
                          {destinationPoint && (
                            <div>Dist to Dest: <strong className="text-slate-300">{(Math.hypot(cursorPos.x - destinationPoint.x, cursorPos.y - destinationPoint.y) * spatialScaleMetersPerPx).toFixed(1)} m</strong></div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* MINIMAP VIEWPORT */}
              {showMinimap && displayMode !== 'original' && (
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickRatioX = (e.clientX - rect.left) / rect.width;
                    const clickRatioY = (e.clientY - rect.top) / rect.height;
                    setPanOffset({
                      x: -(clickRatioX - 0.5) * 200,
                      y: -(clickRatioY - 0.5) * 200
                    });
                  }}
                  className="absolute bottom-2 right-2 z-20 w-24 h-24 bg-black/90 border border-cyan-500/50 rounded-xl overflow-hidden shadow-2xl cursor-pointer"
                >
                  {getSafeImageUrl(terrainImage) && (
                    <img src={getSafeImageUrl(terrainImage)} alt="Minimap" className="w-full h-full object-cover opacity-60" />
                  )}
                  <div
                    className="absolute border-2 border-cyan-400 bg-cyan-500/20 pointer-events-none"
                    style={{
                      width: `${Math.max(20, 100 / zoomLevel)}%`,
                      height: `${Math.max(20, 100 / zoomLevel)}%`,
                      top: `${Math.min(80, Math.max(0, 40 - panOffset.y / 5))}%`,
                      left: `${Math.min(80, Math.max(0, 40 - panOffset.x / 5))}%`
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto min-h-[400px]">
              {imageStatus === 'loading' ? (
                <div className="space-y-3 flex flex-col items-center">
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
                  <h3 className="text-white font-bold text-sm">Loading terrain map image...</h3>
                  <p className="text-slate-400 text-xs font-mono">Decoding optical surface matrix</p>
                </div>
              ) : imageStatus === 'error' ? (
                <div className="space-y-3 flex flex-col items-center max-w-sm">
                  <AlertCircle className="w-10 h-10 text-rose-500" />
                  <h3 className="text-white font-bold text-sm">Failed to load terrain image</h3>
                  <p className="text-slate-400 text-xs font-mono">{imageLoadError?.message || 'Check network connection or file format.'}</p>
                  <button
                    onClick={() => {
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      fileInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-orange-600/40 hover:bg-orange-600/60 border border-orange-500/50 text-orange-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Different Image</span>
                  </button>
                </div>
              ) : (
                <ImageAcquisitionPanel onImageSelected={() => {}} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: PERSISTENT MISSION CONTROL TOOLBAR & INSPECTOR (lg:col-span-3 ~25%, sticky) */}
      <div className="lg:col-span-3 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto space-y-4 bg-[#090D1A] border border-slate-800/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Rocket className="w-4 h-4 text-cyan-400" />
              <span>Mission Control</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-slate-800">
              Toolbar &amp; Inspector
            </span>
          </div>

          {/* VERTICAL MISSION CONTROL TOOLBAR */}
          <div className="space-y-3 font-mono text-xs">
            {/* 1. START & DESTINATION NAVIGATION POINTS */}
            <div className="space-y-2 bg-black/50 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Navigation Points</span>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <button
                    onClick={() => setActiveTool(activeTool === 'start' ? 'select' : 'start')}
                    disabled={imageStatus !== 'loaded'}
                    className={`flex-1 px-2.5 py-1.5 rounded-lg transition font-bold flex items-center justify-between cursor-pointer text-[11px] ${
                      activeTool === 'start'
                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-400 shadow-md animate-pulse'
                        : startPoint
                        ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                    }`}
                    title="Select & Place Start Base on Terrain (Click image)"
                  >
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>START</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-80 bg-black/40 px-1.5 py-0.5 rounded">
                      {startPoint ? `${startPoint.x},${startPoint.y}` : 'Unset'}
                    </span>
                  </button>
                  <button
                    onClick={handleClearStart}
                    disabled={!startPoint}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 disabled:opacity-20 cursor-pointer transition border border-slate-800"
                    title="Clear Start Point"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-1">
                  <button
                    onClick={() => setActiveTool(activeTool === 'destination' ? 'select' : 'destination')}
                    disabled={imageStatus !== 'loaded'}
                    className={`flex-1 px-2.5 py-1.5 rounded-lg transition font-bold flex items-center justify-between cursor-pointer text-[11px] ${
                      activeTool === 'destination'
                        ? 'bg-rose-500 text-white ring-2 ring-rose-400 shadow-md animate-pulse'
                        : destinationPoint
                        ? 'bg-rose-950/60 border border-rose-500/50 text-rose-300 hover:bg-rose-900/60'
                        : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                    }`}
                    title="Select & Place Destination Target on Terrain (Click image)"
                  >
                    <div className="flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-rose-400" />
                      <span>DEST</span>
                    </div>
                    <span className="text-[9px] font-mono opacity-80 bg-black/40 px-1.5 py-0.5 rounded">
                      {destinationPoint ? `${destinationPoint.x},${destinationPoint.y}` : 'Unset'}
                    </span>
                  </button>
                  <button
                    onClick={handleClearDestination}
                    disabled={!destinationPoint}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 disabled:opacity-20 cursor-pointer transition border border-slate-800"
                    title="Clear Destination Point"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleSwapPoints}
                  disabled={!startPoint && !destinationPoint}
                  className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 disabled:opacity-30 cursor-pointer font-bold flex items-center justify-center gap-1.5 text-[11px] transition shadow-sm"
                  title="Swap Start Base and Destination Target"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                  <span>SWAP LOCATIONS</span>
                </button>
              </div>
            </div>

            {/* 2. ROUTE PLANNING CONTROLS */}
            <div className="space-y-2 bg-black/50 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Route Operations</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={handleGenerateRoute}
                  disabled={imageStatus !== 'loaded'}
                  className={`col-span-3 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer text-xs transition shadow-md ${
                    startPoint && destinationPoint
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                  title="Generate / Plan Navigation Route between Start and Destination"
                >
                  <Route className="w-4 h-4 text-cyan-200" />
                  <span>PLAN ROUTE</span>
                </button>
                <button
                  onClick={handleRecalculateRoute}
                  disabled={imageStatus !== 'loaded'}
                  className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 hover:text-white disabled:opacity-30 cursor-pointer font-bold flex items-center justify-center gap-1 text-[11px]"
                  title="Recalculate Route"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recalc</span>
                </button>
                <button
                  onClick={handleClearRoute}
                  disabled={activePath.length <= 1}
                  className="col-span-2 py-1.5 rounded-lg bg-slate-900 hover:bg-red-500/20 border border-slate-700 text-slate-400 hover:text-red-300 disabled:opacity-20 cursor-pointer font-bold flex items-center justify-center gap-1 text-[11px]"
                  title="Clear Route Line from Viewport"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Hide / Reset Route</span>
                </button>
              </div>
            </div>

            {/* 3. INTERACTIVE ANNOTATION & INSPECTION TOOLS */}
            <div className="space-y-2 bg-black/50 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Interactive Tools</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setActiveTool('select')}
                  className={`py-1.5 px-2 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer text-[11px] ${
                    activeTool === 'select' ? 'bg-cyan-500 text-white ring-1 ring-cyan-400' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select Tool</span>
                </button>
                <button
                  onClick={() => setActiveTool('pan')}
                  className={`py-1.5 px-2 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer text-[11px] ${
                    activeTool === 'pan' ? 'bg-cyan-500 text-white ring-1 ring-cyan-400' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Hand className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pan Tool</span>
                </button>
                <button
                  onClick={() => setActiveTool('inspect')}
                  className={`py-1.5 px-2 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer text-[11px] ${
                    activeTool === 'inspect' ? 'bg-cyan-500 text-white ring-1 ring-cyan-400' : 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  <span>INSPECT</span>
                </button>
                <button
                  onClick={() => setActiveTool('measure')}
                  disabled={imageStatus !== 'loaded'}
                  className={`py-1.5 px-2 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer text-[11px] ${
                    activeTool === 'measure' ? 'bg-teal-500 text-white ring-1 ring-teal-400' : 'bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 border border-teal-500/30'
                  }`}
                >
                  <Ruler className="w-3.5 h-3.5 text-teal-400" />
                  <span>MEASURE</span>
                </button>
                <button
                  onClick={() => setActiveTool('checkpoint')}
                  disabled={imageStatus !== 'loaded'}
                  className={`py-1.5 px-2 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer text-[11px] ${
                    activeTool === 'checkpoint' ? 'bg-blue-500 text-white ring-1 ring-blue-400' : 'bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 border border-blue-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>CHECKPOINT</span>
                </button>
                <button
                  onClick={() => setActiveTool('science')}
                  disabled={imageStatus !== 'loaded'}
                  className={`py-1.5 px-2 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer text-[11px] ${
                    activeTool === 'science' ? 'bg-indigo-500 text-white ring-1 ring-indigo-400' : 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-indigo-400" />
                  <span>SCIENCE POI</span>
                </button>
                <button
                  onClick={() => setActiveTool('hazard')}
                  disabled={imageStatus !== 'loaded'}
                  className={`py-1.5 px-2 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer text-[11px] ${
                    activeTool === 'hazard' ? 'bg-amber-500 text-white ring-1 ring-amber-400' : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>RESTRICT ZONE</span>
                </button>
                <button
                  onClick={() => setActiveTool('note')}
                  disabled={imageStatus !== 'loaded'}
                  className={`py-1.5 px-2 rounded-lg transition font-bold flex items-center gap-1.5 cursor-pointer text-[11px] ${
                    activeTool === 'note' ? 'bg-purple-500 text-white ring-1 ring-purple-400' : 'bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  <span>NOTE</span>
                </button>
              </div>

              {/* Active Polygon Actions */}
              {activeDrawingPolygon.length > 0 && (
                <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 space-y-1.5">
                  <div className="text-[10px] text-amber-300 font-bold">Polygon: {activeDrawingPolygon.length} pts</div>
                  <div className="flex gap-1.5">
                    {activeDrawingPolygon.length >= 3 && (
                      <button
                        onClick={finishActivePolygon}
                        className="flex-1 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] cursor-pointer"
                      >
                        Finish Polygon
                      </button>
                    )}
                    <button
                      onClick={() => setActiveDrawingPolygon([])}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. HISTORY & EDIT ACTIONS */}
            <div className="space-y-2 bg-black/50 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Edit History &amp; Actions</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={handleUndo}
                  disabled={historyStack.length === 0}
                  className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer font-bold flex items-center justify-center gap-1 text-[11px]"
                  title="Undo Edit"
                >
                  <Undo2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Undo</span>
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0}
                  className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer font-bold flex items-center justify-center gap-1 text-[11px]"
                  title="Redo Edit"
                >
                  <Redo2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Redo</span>
                </button>
                <button
                  onClick={() => setClearConfirmOpen(true)}
                  className="py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-300 cursor-pointer font-bold flex items-center justify-center gap-1 text-[11px]"
                  title="Clear All Custom Annotations"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          {/* INSPECTOR TABS & CONTENT (MISSION TELEMETRY, RULERS, NOTES) */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 shrink-0">
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-slate-800 flex-wrap">
                <button
                  onClick={() => setRightPanelTab('context')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    rightPanelTab === 'context'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>Telemetry</span>
                </button>
                <button
                  onClick={() => setRightPanelTab('measurements')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    rightPanelTab === 'measurements'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Ruler className="w-3 h-3" />
                  <span>Rulers ({measurementsList.length})</span>
                </button>
                <button
                  onClick={() => setRightPanelTab('field_notes')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    rightPanelTab === 'field_notes'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Notes ({notesList.length})</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT PANELS */}
            <div className="space-y-3 font-mono text-xs max-h-[360px] overflow-y-auto pr-1 text-slate-300">
              {rightPanelTab === 'context' && (
                <>
                  {selectedRegion && (
                    <div className="p-3 bg-[#080d1e]/90 border border-cyan-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Compass className="w-3 h-3" />
                          Regional Base Camp
                        </span>
                        <span className="text-[10px] font-mono text-cyan-300 font-bold truncate max-w-[100px]">{selectedRegion.name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-mono">
                        <div className="p-1 bg-black/50 rounded border border-slate-800">
                          <span className="text-slate-400 text-[8px] block">WATER</span>
                          <strong className="text-cyan-300">{selectedRegion.waterIceScore}%</strong>
                        </div>
                        <div className="p-1 bg-black/50 rounded border border-slate-800">
                          <span className="text-slate-400 text-[8px] block">FLAT</span>
                          <strong className="text-emerald-300">{selectedRegion.flatnessScore}%</strong>
                        </div>
                        <div className="p-1 bg-black/50 rounded border border-slate-800">
                          <span className="text-slate-400 text-[8px] block">SOLAR</span>
                          <strong className="text-amber-300">{selectedRegion.solarPowerScore}%</strong>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-[10px] font-sans text-slate-300 pt-2 border-t border-slate-800">
                        <div className="bg-cyan-950/30 border border-cyan-500/20 p-2 rounded-lg">
                          <strong className="text-cyan-300 block mb-0.5 font-mono">Scientific Priority:</strong>
                          <p className="leading-snug text-slate-300">{selectedRegion.scientificReasoning}</p>
                        </div>
                        <div className="bg-amber-950/30 border border-amber-500/20 p-2 rounded-lg">
                          <strong className="text-amber-300 block mb-0.5 font-mono">Primary Operational Risk:</strong>
                          <p className="leading-snug text-slate-300">{selectedRegion.primaryRisk}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ORIGINAL MODE ANALYSIS */}
                  {displayMode === 'original' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-black/40 border border-slate-800 rounded-xl space-y-2">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                          Source Image Identity &amp; Provenance
                        </span>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Source:</span>
                            <strong className="text-white truncate max-w-[170px]">{imageProvenance.source || 'User Upload'}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Dimensions:</span>
                            <strong className="text-cyan-300">{naturalDimensions.width} × {naturalDimensions.height} px</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Aspect Ratio:</span>
                            <strong className="text-white">{(naturalDimensions.width / naturalDimensions.height).toFixed(2)}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Format:</span>
                            <strong className="text-white">{imageStats?.format || 'JPEG'}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Calibration:</span>
                            <strong className="text-amber-300">{spatialScaleMetersPerPx} m/px (2D Pixel Scale)</strong>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-[10px] text-slate-300 leading-relaxed font-sans">
                        <strong>Raw Image Notice:</strong> Original mode displays un-retouched surface optical frames. Visual RGB inspection establishes surface color and brightness, but single 2D optical images cannot establish true elevation or slope angle without stereoscopic DTM calibration.
                      </div>
                    </div>
                  )}

                  {/* ROUTE MODE ANALYSIS & NAVIGATION METRICS */}
                  {displayMode === 'route' && (
                    <div className="space-y-3">
                      {/* PRIMARY NAVIGATION METRICS CARD */}
                      <div className="p-3 bg-black/40 border border-slate-800 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <Route className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Rover Navigation Telemetry</span>
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            activeRoute?.isBlocked
                              ? 'bg-red-500/20 text-red-400 border-red-500/50'
                              : activeRoute?.difficultyScore === 'HIGH RISK'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                              : activeRoute?.difficultyScore === 'MODERATE'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          }`}>
                            {activeRoute?.isBlocked ? 'IMPASSABLE' : activeRoute?.difficultyScore || 'SAFE'}
                          </span>
                        </div>

                        {/* Blocked Route Alert or Feasibility Notice */}
                        {activeRoute?.isBlocked ? (
                          <div className="p-2.5 bg-red-950/60 border border-red-500/50 rounded-lg text-red-200 text-[10px] space-y-1">
                            <strong className="block font-bold text-red-300 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              <span>NO SAFE ROUTE FOUND</span>
                            </strong>
                            <p className="leading-snug">{activeRoute.explanation || 'All corridors are blocked by detected obstacles or clearance buffer. Straight-line routes are strictly rejected.'}</p>
                          </div>
                        ) : null}

                        {/* Metrics Grid */}
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Total Route Distance:</span>
                            <strong className="text-cyan-300 font-bold">
                              {activeRoute?.totalLengthM ? `${activeRoute.totalLengthM.toFixed(1)} m` : `${(totalOutboundPx * spatialScaleMetersPerPx).toFixed(1)} m`}
                              <span className="text-slate-500 font-normal ml-1">({activeRoute?.totalLengthPx ? `${activeRoute.totalLengthPx} px` : `${Math.round(totalOutboundPx)} px`})</span>
                            </strong>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Direct (Straight-Line):</span>
                            <strong className="text-slate-300">
                              {activeRoute?.directDistanceM ? `${activeRoute.directDistanceM.toFixed(1)} m` : '--'}
                            </strong>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Detour Around Obstacles:</span>
                            <strong className="text-amber-300">
                              +{activeRoute?.detourDistanceM ? `${activeRoute.detourDistanceM.toFixed(1)} m` : '0.0 m'}
                              <span className="text-slate-500 font-normal ml-1">(+{activeRoute?.detourPct ?? 0}%)</span>
                            </strong>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Route Waypoints:</span>
                            <strong className="text-white">
                              {activeRoute?.waypointsCount ?? activePath.length} nodes
                            </strong>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Est. Rover Travel Time:</span>
                            <strong className="text-cyan-300">
                              {activeRoute?.estimatedTravelTimeHours
                                ? `${(activeRoute.estimatedTravelTimeHours * 60).toFixed(1)} mins`
                                : `${(totalMissionHours * 60).toFixed(1)} mins`}
                              <span className="text-slate-500 font-normal ml-1">(~0.033 m/s)</span>
                            </strong>
                          </div>
                        </div>

                        {/* Terrain Classification Breakdown */}
                        <div className="pt-2 border-t border-slate-800 space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            Traversed Terrain Composition
                          </span>
                          <div className="space-y-1 text-[10px]">
                            <div>
                              <div className="flex justify-between text-slate-300">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                  <span>Flat Regolith / Soil:</span>
                                </span>
                                <strong className="text-white">{activeRoute?.terrainBreakdown?.soilPct ?? 78}%</strong>
                              </div>
                              <div className="h-1 w-full bg-slate-800 rounded-full mt-0.5 overflow-hidden">
                                <div className="h-full bg-red-400 rounded-full" style={{ width: `${activeRoute?.terrainBreakdown?.soilPct ?? 78}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-slate-300">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Bedrock Outcrop:</span>
                                </span>
                                <strong className="text-white">{activeRoute?.terrainBreakdown?.bedrockPct ?? 22}%</strong>
                              </div>
                              <div className="h-1 w-full bg-slate-800 rounded-full mt-0.5 overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${activeRoute?.terrainBreakdown?.bedrockPct ?? 22}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Traversal Rover Simulation Controls */}
                        {activeRoute && !activeRoute.isBlocked && (
                          <div className="pt-2 border-t border-slate-800 space-y-2">
                            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                              Rover Traversal Simulation
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => isPlaying ? pauseTraversal() : startTraversal()}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow transition"
                              >
                                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                <span>{isPlaying ? 'Pause Simulation' : 'Run Simulation'}</span>
                              </button>
                              <button
                                onClick={resetTraversal}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                                title="Reset Traversal"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Traversal Progress:</span>
                                <strong className="text-cyan-300">{Math.round(traversalProgress * 100)}%</strong>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={traversalProgress}
                                onChange={e => setTraversalProgress(Number(e.target.value))}
                                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ANNOTATIONS MODE ANALYSIS */}
                  {displayMode === 'annotations' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-black/40 border border-slate-800 rounded-xl space-y-2">
                        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                          Annotation Inventory ({checkpointsList.length + scienceStopsList.length + manualHazards.length + notesList.length})
                        </span>
                        <div className="space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Checkpoints:</span>
                            <strong className="text-blue-300">{checkpointsList.length}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Science POIs:</span>
                            <strong className="text-indigo-300">{scienceStopsList.length}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Restricted Zones:</span>
                            <strong className="text-amber-300">{manualHazards.length}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Saved Distance Vectors:</span>
                            <strong className="text-teal-300">{measurementsList.length}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Text Field Notes:</span>
                            <strong className="text-purple-300">{notesList.length}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ANALYSIS MODE REPORT */}
                  {displayMode === 'analysis' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-black/40 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                            Terrain Segmentation &amp; Vision Status
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            hasAnalyzed ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {isAnalyzingImage ? 'Analyzing...' : hasAnalyzed ? 'Analysis Ready' : 'Pending'}
                          </span>
                        </div>

                        {hasAnalyzed ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">Pipeline:</span>
                              <strong className={terrainIntelligence?.aiAvailable ? 'text-emerald-400' : 'text-amber-300'}>
                                {terrainIntelligence?.aiAvailable ? 'Gemini 4 Hydrogen + Pixel CV' : 'FALLBACK: PIXEL-BASED CV'}
                              </strong>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">Runtime:</span>
                              <strong className="text-cyan-300">{inferenceTimeMs ? `${inferenceTimeMs} ms` : '--'}</strong>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-400">Detected Regions:</span>
                              <strong className="text-white">{terrainIntelligence?.regions?.length ?? 0}</strong>
                            </div>

                            {terrainIntelligence && !terrainIntelligence.aiAvailable && (
                              <div className="p-2.5 rounded-lg bg-amber-950/35 border border-amber-500/40 text-[10px] font-mono text-amber-200 space-y-1.5">
                                <div className="space-y-0.5">
                                  <div className="font-bold text-amber-300">AI ANALYSIS UNAVAILABLE</div>
                                  <div className="font-bold text-cyan-300">FALLBACK: PIXEL-BASED COMPUTER VISION</div>
                                  {terrainIntelligence.aiStatusMessage && (
                                    <div className="font-sans text-amber-200/90 pt-0.5">{terrainIntelligence.aiStatusMessage}</div>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => runTerrainIntelligenceAnalysis(true)}
                                  disabled={isAnalyzingImage}
                                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-100 font-bold text-[10px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  <RefreshCw className={`w-3 h-3 ${isAnalyzingImage ? 'animate-spin' : ''}`} />
                                  <span>{isAnalyzingImage ? 'Retrying AI Analysis...' : 'Retry AI Analysis'}</span>
                                </button>
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-800 space-y-1.5">
                              <span className="text-[10px] text-slate-400 font-bold uppercase block">Computed Surface Composition</span>
                              {MASK_CLASS_DEFS.map((cls, idx) => {
                                const livePct = terrainIntelligence?.pixelComposition
                                  ? cls.key === 'soil'
                                    ? terrainIntelligence.pixelComposition.soilPct
                                    : cls.key === 'bedrock'
                                    ? terrainIntelligence.pixelComposition.bedrockPct
                                    : cls.key === 'sand'
                                    ? terrainIntelligence.pixelComposition.sandPct
                                    : terrainIntelligence.pixelComposition.rockPct
                                  : analysis.classStats?.classes?.[idx]?.percentage ?? 0;

                                return (
                                  <div key={cls.key} className="space-y-0.5">
                                    <div className="flex justify-between text-[10px]">
                                      <span>{cls.name}</span>
                                      <strong className="text-white">{livePct}%</strong>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full transition-all" style={{ width: `${livePct}%`, backgroundColor: cls.hex }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center space-y-2">
                            <p className="text-slate-300 font-bold text-xs">Run Complete-Image Analysis</p>
                            <button
                              onClick={handleAnalyzeImage}
                              disabled={imageStatus !== 'loaded' || isAnalyzingImage}
                              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-1.5"
                            >
                              <Cpu className={`w-3.5 h-3.5 ${isAnalyzingImage ? 'animate-spin' : ''}`} />
                              <span>{isAnalyzingImage ? 'Analyzing...' : 'Analyze Image Now'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SPLIT VIEW MODE REPORT */}
                  {displayMode === 'split_comparison' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-black/40 border border-slate-800 rounded-xl space-y-2">
                        <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                          Split-View Comparison Legend
                        </span>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                          Left pane displays the unmodified optical surface frame. Right pane displays real pixel segmentation masks and detected terrain region bounding boxes.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* TAB 2: MEASUREMENTS PANEL */}
              {rightPanelTab === 'measurements' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-[11px] font-bold text-teal-300">Saved Rulers ({measurementsList.length})</span>
                    {measurementsList.length > 0 && (
                      <button
                        onClick={() => clearAllMeasurements()}
                        className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <Trash2 className="w-3 h-3" /> Clear All
                      </button>
                    )}
                  </div>

                  {measurementsList.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 space-y-2 bg-black/30 rounded-xl border border-slate-800">
                      <Ruler className="w-8 h-8 text-teal-500/50 mx-auto" />
                      <p className="font-bold text-slate-300 text-xs">No Distance Measurements Recorded</p>
                      <p className="text-[10px] text-slate-500 font-sans">Select MEASURE from the top toolbar, click two points on the terrain, and save distance vectors.</p>
                      <button
                        onClick={() => setActiveTool('measure')}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] cursor-pointer"
                      >
                        Activate Ruler Tool
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {measurementsList.map(m => {
                        const midX = Math.round((m.startX + m.endX) / 2);
                        const midY = Math.round((m.startY + m.endY) / 2);
                        return (
                          <div
                            key={m.id}
                            className={`p-3 bg-black/40 border rounded-xl space-y-2 transition-all ${
                              selectedItem?.type === 'measure' && selectedItem.id === m.id
                                ? 'border-teal-400 ring-1 ring-teal-400/50 bg-teal-950/20'
                                : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <input
                                type="text"
                                value={m.name}
                                onChange={e => saveMeasurement({ ...m, name: e.target.value })}
                                className="bg-transparent font-bold text-white text-xs focus:outline-none focus:border-b border-teal-400 max-w-[160px]"
                              />
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => toggleMeasurementVisibility(m.id)}
                                  className={`p-1 rounded cursor-pointer ${m.visible !== false ? 'text-teal-400 hover:text-white' : 'text-slate-600'}`}
                                  title={m.visible !== false ? 'Hide from canvas' : 'Show on canvas'}
                                >
                                  {m.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>

                                <button
                                  onClick={() => {
                                    setZoomLevel(2.0);
                                    const sf = (naturalDimensions.width / 256) * 2.0;
                                    setPanOffset({ x: (128 - midX) * sf, y: (128 - midY) * sf });
                                    setSelectedItem({ type: 'measure', id: m.id });
                                    setDisplayMode('annotations');
                                  }}
                                  className="px-2 py-0.5 rounded bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 text-[10px] font-bold cursor-pointer"
                                  title="Locate on map"
                                >
                                  Locate
                                </button>

                                <button
                                  onClick={() => deleteSavedMeasurement(m.id)}
                                  className="p-1 rounded text-slate-500 hover:text-red-400 cursor-pointer"
                                  title="Delete measurement"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div>
                                <span className="text-slate-400 block">Pixel Distance:</span>
                                <strong className="text-teal-300">{m.distPx} px</strong>
                              </div>
                              <div>
                                <span className="text-slate-400 block">Physical Distance:</span>
                                <strong className={m.isPhysicalCalibrated && m.physicalDistM !== null ? 'text-emerald-400' : 'text-amber-400'}>
                                  {m.isPhysicalCalibrated && m.physicalDistM !== null
                                    ? `${m.physicalDistM} m`
                                    : 'Scale unavailable'}
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FIELD JOURNAL / NOTES PANEL */}
              {rightPanelTab === 'field_notes' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-[11px] font-bold text-purple-300">Saved Notes ({notesList.length})</span>
                    <button
                      onClick={() => {
                        setNoteFormCoords({ x: 128, y: 128 });
                        setEditingNoteData(null);
                        setNoteFormTitle(`Field Note #${notesList.length + 1}`);
                        setNoteFormDesc('');
                        setNoteFormCategory('Geology');
                        setNoteFormPriority('Medium');
                        setNoteFormTags('Surface, Note');
                        setNoteModalOpen(true);
                      }}
                      className="text-[10px] px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Note
                    </button>
                  </div>

                  {/* Search Filter */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={notesSearch}
                      onChange={e => setNotesSearch(e.target.value)}
                      placeholder="Search field notes..."
                      className="w-full bg-black/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {notesList.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 space-y-2 bg-black/30 rounded-xl border border-slate-800">
                      <FileText className="w-8 h-8 text-purple-500/50 mx-auto" />
                      <p className="font-bold text-slate-300 text-xs">No Field Notes Recorded</p>
                      <p className="text-[10px] text-slate-500 font-sans">Click NOTE in the toolbar, select a position on the terrain image, and save scientific notes.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notesList
                        .filter(n =>
                          n.title.toLowerCase().includes(notesSearch.toLowerCase()) ||
                          n.description.toLowerCase().includes(notesSearch.toLowerCase())
                        )
                        .map((n, idx) => {
                          return (
                            <div
                              key={n.id}
                              className={`p-3 bg-black/40 border rounded-xl space-y-2 transition-all ${
                                selectedItem?.type === 'note' && selectedItem.id === n.id
                                  ? 'border-purple-400 ring-1 ring-purple-400/50 bg-purple-950/20'
                                  : 'border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                  #{n.pinNumber || idx + 1} {n.category}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setZoomLevel(2.0);
                                      const sf = (naturalDimensions.width / 256) * 2.0;
                                      setPanOffset({ x: (128 - n.x) * sf, y: (128 - n.y) * sf });
                                      setSelectedItem({ type: 'note', id: n.id });
                                      setDisplayMode('annotations');
                                      setLocatedTarget({ id: n.id, x: n.x, y: n.y });
                                      setTimeout(() => setLocatedTarget(null), 3000);
                                    }}
                                    className="px-2 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-[10px] font-bold cursor-pointer"
                                  >
                                    Locate
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingNoteData(n);
                                      setNoteFormTitle(n.title);
                                      setNoteFormDesc(n.description);
                                      setNoteFormCategory(n.category);
                                      setNoteFormPriority(n.priority);
                                      setNoteFormTags(n.tags ? n.tags.join(', ') : '');
                                      setNoteFormCoords({ x: n.x, y: n.y });
                                      setNoteModalOpen(true);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteSavedNote(n.id)}
                                    className="p-1 rounded text-slate-500 hover:text-red-400 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <h4 className="font-bold text-white text-xs">{n.title}</h4>
                              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">{n.description}</p>

                              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-purple-400" /> ({n.x}, {n.y})</span>
                                <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WORKSPACE FIELD NOTE EDITOR MODAL */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0e1c] border border-purple-500/50 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <FileText className="w-5 h-5" />
                <span>{editingNoteData ? 'Edit Field Note' : 'Create Field Note'}</span>
              </div>
              <button onClick={() => setNoteModalOpen(false)} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-slate-400 block mb-1">Title:</label>
                <input
                  type="text"
                  value={noteFormTitle}
                  onChange={e => setNoteFormTitle(e.target.value)}
                  placeholder="e.g. Clay Bedrock Outcrop"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Category:</label>
                  <select
                    value={noteFormCategory}
                    onChange={e => setNoteFormCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white"
                  >
                    <option value="Geology">Geology</option>
                    <option value="Ice/Water">Ice/Water</option>
                    <option value="Hazard">Hazard</option>
                    <option value="Operations">Operations</option>
                    <option value="Biosignature">Biosignature</option>
                    <option value="Sample Target">Sample Target</option>
                    <option value="Base Site">Base Site</option>
                    <option value="Surface Feature">Surface Feature</option>
                    <option value="Regolith">Regolith</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Priority:</label>
                  <select
                    value={noteFormPriority}
                    onChange={e => setNoteFormPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Observations / Telemetry:</label>
                <textarea
                  rows={3}
                  value={noteFormDesc}
                  onChange={e => setNoteFormDesc(e.target.value)}
                  placeholder="Scientific observation details..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tags (comma separated):</label>
                <input
                  type="text"
                  value={noteFormTags}
                  onChange={e => setNoteFormTags(e.target.value)}
                  placeholder="Smectite, Delta"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setNoteModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWorkspaceNote}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer shadow-md font-mono"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3B. INTEGRATED COMPLETE-IMAGE TERRAIN INTELLIGENCE SECTION */}
      {imageStatus === 'loaded' && (
        <div className="bg-[#090D1A] border border-slate-800/80 p-4 rounded-2xl space-y-4 shadow-lg">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider font-sans">
                  Complete-Image Martian Terrain Intelligence
                </h3>
                <p className="text-[11px] font-mono text-slate-400">
                  Full Frame: {naturalDimensions.width} × {naturalDimensions.height} px · Aspect {(naturalDimensions.width / Math.max(1, naturalDimensions.height)).toFixed(2)}:1 ·{' '}
                  {terrainIntelligence
                    ? `${terrainIntelligence.regions.length} Distinct Region(s) · ${terrainIntelligence.processingTimeMs} ms`
                    : isAnalyzingImage
                    ? 'Inspecting complete frame...'
                    : 'Ready'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap font-mono text-[10px]">
              {terrainIntelligence && (
                <span
                  className={`px-2.5 py-1 rounded-lg border font-bold ${
                    terrainIntelligence.aiAvailable
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                  }`}
                >
                  {terrainIntelligence.aiAvailable
                    ? 'Gemini 4 Hydrogen (Interactions API) + CV'
                    : 'FALLBACK: PIXEL-BASED COMPUTER VISION'}
                </span>
              )}
              <button
                onClick={() => setShowRegionOverlays((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer flex items-center gap-1.5 transition ${
                  showRegionOverlays
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-black/40 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Toggle terrain region highlight boxes on the viewport"
              >
                {showRegionOverlays ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Image Region Overlays</span>
              </button>
              <button
                onClick={() => {
                  setDisplayMode('analysis');
                  runTerrainIntelligenceAnalysis(true);
                }}
                disabled={isAnalyzingImage}
                className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingImage ? 'animate-spin' : ''}`} />
                <span>{isAnalyzingImage ? 'Analyzing...' : 'Re-run Analysis'}</span>
              </button>
            </div>
          </div>

          {analysisError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{analysisError}</span>
            </div>
          )}

          {isAnalyzingImage && !terrainIntelligence ? (
            <div className="p-8 text-center space-y-2 bg-black/30 rounded-xl border border-slate-800">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
              <p className="text-xs font-mono text-slate-300">
                Running complete-frame aspect-preserved CV &amp; geological inspection...
              </p>
            </div>
          ) : terrainIntelligence ? (
            <div className="space-y-4">
              {!terrainIntelligence.aiAvailable && (
                <div className="px-3.5 py-2.5 rounded-xl bg-amber-950/35 border border-amber-500/40 text-[11px] font-mono text-amber-200 flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-amber-300">AI ANALYSIS UNAVAILABLE</div>
                      <div className="font-bold text-cyan-300">FALLBACK: PIXEL-BASED COMPUTER VISION</div>
                      {terrainIntelligence.aiStatusMessage && (
                        <div className="font-sans text-[10px] text-amber-200/90 pt-0.5">{terrainIntelligence.aiStatusMessage}</div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayMode('analysis');
                      runTerrainIntelligenceAnalysis(true);
                    }}
                    disabled={isAnalyzingImage}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-100 font-bold text-[10px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`w-3 h-3 ${isAnalyzingImage ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzingImage ? 'Retrying AI...' : 'Retry AI Analysis'}</span>
                  </button>
                </div>
              )}

              {/* A. TERRAIN REGION ANALYSIS */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 font-mono">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>A. Terrain Region Analysis ({terrainIntelligence.regions.length} Detected)</span>
                  </h4>
                  {selectedTerrainRegionId && (
                    <button
                      onClick={() => setSelectedTerrainRegionId(null)}
                      className="text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear Highlight
                    </button>
                  )}
                </div>

                {terrainIntelligence.regions.length === 0 ? (
                  <div className="p-4 rounded-xl bg-black/40 border border-slate-800 text-xs text-slate-400 font-mono">
                    No distinct bounded terrain formations were isolated with high confidence in this frame.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {terrainIntelligence.regions.map((region) => {
                      const isSelected = selectedTerrainRegionId === region.id;
                      const cx256 = Math.round((region.normX + region.normWidth / 2) * 256);
                      const cy256 = Math.round((region.normY + region.normHeight / 2) * 256);
                      const hazardBadge =
                        region.hazardLevel === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : region.hazardLevel === 'moderate'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                      return (
                        <div
                          key={region.id}
                          onMouseEnter={() => setHoveredTerrainRegionId(region.id)}
                          onMouseLeave={() => setHoveredTerrainRegionId((prev) => (prev === region.id ? null : prev))}
                          onClick={() => setSelectedTerrainRegionId((prev) => (prev === region.id ? null : region.id))}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                            isSelected
                              ? 'bg-cyan-950/35 border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg'
                              : 'bg-black/40 border-slate-800 hover:border-cyan-500/50'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                                    {region.id}
                                  </span>
                                  <span className="text-xs font-bold text-white truncate">{region.title}</span>
                                </div>
                                <div className="text-[10px] font-mono text-cyan-400 mt-0.5">
                                  {region.classification} · {region.locationDescription}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0 font-mono text-[10px]">
                                <span className={`px-1.5 py-0.5 rounded border uppercase font-bold ${hazardBadge}`}>
                                  {region.hazardLevel}
                                </span>
                                <span className="text-slate-400">{region.areaPct ?? 0}% area</span>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-snug">{region.visualCharacteristics}</p>

                            <div className="text-[10px] space-y-1 pt-1 border-t border-slate-800/80">
                              <div>
                                <span className="text-indigo-300 font-bold">Science: </span>
                                <span className="text-slate-300">{region.scientificSignificance}</span>
                              </div>
                              <div>
                                <span className="text-amber-300 font-bold">Traversal: </span>
                                <span className="text-slate-300">{region.roverTraversalConcerns}</span>
                              </div>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80 font-mono text-[10px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => convertFindingToScienceStop(`${region.id}: ${region.classification}`, cx256, cy256)}
                              className="flex-1 py-1 px-2 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 font-bold cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Add Science POI</span>
                            </button>
                            <button
                              onClick={() => convertFindingToHazard(`${region.id}: ${region.classification}`, cx256, cy256)}
                              className="flex-1 py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold cursor-pointer flex items-center justify-center gap-1"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>Mark Hazard</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* B. THREE-TIER GEOLOGICAL IDENTIFICATION */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5 font-mono">
                  <Layers3 className="w-3.5 h-3.5" />
                  <span>B. Geological Identification (Visually Observed vs. Inferred vs. Geographically Verified)</span>
                </h4>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Tier 1: Visually Detected */}
                  <div className="p-3 rounded-xl bg-black/40 border border-cyan-500/30 space-y-2">
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase text-cyan-300">
                        1. Visually Detected Terrain
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        Direct Image Evidence
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      {terrainIntelligence.geologicalIdentification.visuallyDetected.summary}
                    </p>
                    <div className="space-y-1 text-[10px] font-mono text-slate-300">
                      <div>
                        <span className="text-slate-400">Materials: </span>
                        {terrainIntelligence.geologicalIdentification.visuallyDetected.surfaceMaterials.join('; ') || 'None isolated'}
                      </div>
                      <div>
                        <span className="text-slate-400">Formations: </span>
                        {terrainIntelligence.geologicalIdentification.visuallyDetected.rockFormations.join('; ') || 'None isolated'}
                      </div>
                      <div>
                        <span className="text-slate-400">Textures/Fractures: </span>
                        {terrainIntelligence.geologicalIdentification.visuallyDetected.fracturesAndTextures.join('; ') || 'None isolated'}
                      </div>
                    </div>
                  </div>

                  {/* Tier 2: Geologically Inferred */}
                  <div className="p-3 rounded-xl bg-black/40 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase text-amber-300">
                        2. Geologically Inferred Context
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Provisional Hypothesis
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 leading-relaxed">
                      {terrainIntelligence.geologicalIdentification.geologicallyInferred.provisionalSummary}
                    </p>
                    <p className="text-[10px] text-amber-200/90 bg-amber-950/30 border border-amber-500/25 rounded-lg p-2 leading-snug">
                      {terrainIntelligence.geologicalIdentification.geologicallyInferred.confidenceCaveat}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      {terrainIntelligence.geologicalIdentification.geologicallyInferred.mineralogicalNote}
                    </p>
                  </div>

                  {/* Tier 3: Geographically Verified */}
                  <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase text-emerald-300">
                        3. Geographically Verified Units
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          terrainIntelligence.geologicalIdentification.geographicallyVerified.status === 'verified_footprint'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : terrainIntelligence.geologicalIdentification.geographicallyVerified.status === 'mission_basin_context'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {terrainIntelligence.geologicalIdentification.geographicallyVerified.status === 'verified_footprint'
                          ? 'Exact Coords'
                          : terrainIntelligence.geologicalIdentification.geographicallyVerified.status === 'mission_basin_context'
                          ? 'Landing Basin Context'
                          : 'Unverified Location'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-white">
                      {terrainIntelligence.geologicalIdentification.geographicallyVerified.headline}
                    </div>

                    <div className="text-[10px] font-mono text-cyan-300">
                      {terrainIntelligence.geologicalIdentification.geographicallyVerified.coordinateLabel}
                    </div>

                    {terrainIntelligence.geologicalIdentification.geographicallyVerified.primaryUnit ? (
                      <div className="space-y-1 text-[10px] bg-emerald-950/20 border border-emerald-500/25 rounded-lg p-2">
                        <div className="font-mono text-white font-bold">
                          SIM 3292 Unit {terrainIntelligence.geologicalIdentification.geographicallyVerified.primaryUnit.unitSymbol} ·{' '}
                          {terrainIntelligence.geologicalIdentification.geographicallyVerified.primaryUnit.unitName}
                        </div>
                        <div className="text-emerald-300 font-mono">
                          Epoch: {terrainIntelligence.geologicalIdentification.geographicallyVerified.primaryUnit.epoch} · Quadrangle:{' '}
                          {terrainIntelligence.geologicalIdentification.geographicallyVerified.quadrangle || 'N/A'}
                        </div>
                        <p className="text-slate-300 leading-snug">
                          {terrainIntelligence.geologicalIdentification.geographicallyVerified.primaryUnit.lithology}
                        </p>
                        {terrainIntelligence.geologicalIdentification.geographicallyVerified.molaElevationM !== null && (
                          <div className="text-cyan-300 font-mono pt-0.5">
                            MOLA Elevation: {terrainIntelligence.geologicalIdentification.geographicallyVerified.molaElevationM.toFixed(1)} m (
                            {terrainIntelligence.geologicalIdentification.geographicallyVerified.molaDatum})
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-300 bg-slate-900/70 border border-slate-800 rounded-lg p-2 leading-snug">
                        {terrainIntelligence.geologicalIdentification.geographicallyVerified.notes}
                      </div>
                    )}

                    {terrainIntelligence.geologicalIdentification.geographicallyVerified.citation && (
                      <div className="text-[9px] font-mono text-slate-400">
                        Provenance: {terrainIntelligence.geologicalIdentification.geographicallyVerified.citation}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* C. SCIENTIFIC TERRAIN REPORT */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5 font-mono">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>C. Scientific Terrain Report</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Brightness {terrainIntelligence.meanBrightness} · RMS Contrast {terrainIntelligence.rmsContrast} · Roughness {terrainIntelligence.roughnessScore}%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">Overall Terrain Composition</span>
                      <p className="text-slate-300 leading-relaxed">{terrainIntelligence.scientificReport.overallComposition}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">Geological Features</span>
                      <p className="text-slate-300 leading-relaxed">{terrainIntelligence.scientificReport.geologicalFeaturesSummary}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">Rock &amp; Soil Characteristics</span>
                      <p className="text-slate-300 leading-relaxed">{terrainIntelligence.scientificReport.rockAndSoilCharacteristics}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">Regional Context</span>
                      <p className="text-slate-300 leading-relaxed">{terrainIntelligence.scientificReport.regionalContext}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">Traversal Hazards</span>
                      <ul className="list-disc pl-4 text-slate-300 space-y-0.5">
                        {terrainIntelligence.scientificReport.traversalHazards.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-indigo-300 font-bold block">Sampling Opportunities</span>
                      <ul className="list-disc pl-4 text-slate-300 space-y-0.5">
                        {terrainIntelligence.scientificReport.samplingOpportunities.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Data &amp; Measurement Limitations</span>
                      <ul className="list-disc pl-4 text-slate-400 space-y-0.5">
                        {terrainIntelligence.scientificReport.dataLimitations.map((l, i) => (
                          <li key={i}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 4. ROUTE STRATEGY COMPARISON ALTERNATIVES */}
      <div className="bg-[#090D1A] border border-slate-800/80 p-4 rounded-2xl space-y-3 shadow-lg font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-xs uppercase tracking-wider font-sans">
              Computed Route Strategy Objectives
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Alpha: Shortest Safe Distance */}
          <div
            onClick={() => {
              setSelectedRouteStrategy('alpha');
              setSelectedRouteIndex(0);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedRouteStrategy === 'alpha' || selectedRouteStrategy === 'shortest'
                ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/40'
                : 'bg-black/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center font-bold text-white mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff]" />
                <span>Alpha: Shortest Safe</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">Distance</span>
            </div>
            <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Length:</span>
                <strong className="text-white">{analysis.routes[0]?.totalLengthM || 0} m</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duration:</span>
                <strong className="text-cyan-300">{analysis.routes[0]?.estimatedDurationMins || 0} mins</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={analysis.routes[0]?.isBlocked ? 'text-rose-400' : 'text-emerald-400 font-bold'}>
                  {analysis.routes[0]?.isBlocked ? 'Blocked' : '✓ Verified Safe'}
                </span>
              </div>
            </div>
          </div>

          {/* Beta: Lowest Traversal Cost */}
          <div
            onClick={() => {
              setSelectedRouteStrategy('beta');
              setSelectedRouteIndex(1);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedRouteStrategy === 'beta'
                ? 'bg-purple-950/40 border-purple-500 shadow-md ring-1 ring-purple-500/40'
                : 'bg-black/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center font-bold text-white mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#bf5af2]" />
                <span>Beta: Lowest Cost</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">Energy</span>
            </div>
            <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Length:</span>
                <strong className="text-white">{analysis.routes[1]?.totalLengthM || 0} m</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cost:</span>
                <strong className="text-purple-300">{analysis.routes[1]?.totalCost || 0} Units</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={analysis.routes[1]?.isBlocked ? 'text-rose-400' : 'text-emerald-400 font-bold'}>
                  {analysis.routes[1]?.isBlocked ? 'Blocked' : '✓ Verified Safe'}
                </span>
              </div>
            </div>
          </div>

          {/* Gamma: Uncertainty-Aware */}
          <div
            onClick={() => {
              setSelectedRouteStrategy('gamma');
              setSelectedRouteIndex(2);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedRouteStrategy === 'gamma' || selectedRouteStrategy === 'safety'
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                : 'bg-black/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center font-bold text-white mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#30d158]" />
                <span>Gamma: Uncertainty</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Clearance</span>
            </div>
            <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Length:</span>
                <strong className="text-white">{analysis.routes[2]?.totalLengthM || 0} m</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Buffer:</span>
                <strong className="text-emerald-400">{analysis.routes[2]?.obstacleClearancePx || contextSafetyClearancePx} px</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={analysis.routes[2]?.isBlocked ? 'text-rose-400' : 'text-emerald-400 font-bold'}>
                  {analysis.routes[2]?.isBlocked ? 'Blocked' : '✓ Max Clearance'}
                </span>
              </div>
            </div>
          </div>

          {/* Delta: Science-Driven Exploration */}
          <div
            onClick={() => {
              setSelectedRouteStrategy('delta');
              setSelectedRouteIndex(3);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedRouteStrategy === 'delta' || selectedRouteStrategy === 'science'
                ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                : 'bg-black/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-center font-bold text-white mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff9f0a]" />
                <span>Delta: Science</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Geology</span>
            </div>
            <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Length:</span>
                <strong className="text-white">{analysis.routes[3]?.totalLengthM || 0} m</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Targets:</span>
                <strong className="text-amber-300">{sharedSession.scienceTargets?.length || 0} verified</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={analysis.routes[3]?.isBlocked ? 'text-rose-400' : 'text-emerald-400 font-bold'}>
                  {analysis.routes[3]?.isBlocked ? 'Blocked' : '✓ Bedrock Path'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. MISSION EVENT TIMELINE & ACTIONS */}
      <div className="bg-[#090D1A] border border-slate-800/80 p-4 rounded-2xl space-y-3 shadow-lg font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-white text-xs uppercase tracking-wider font-sans">
              Mission Audit Timeline &amp; Emergency Actions
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleTriggerEmergencyReturn} className="px-2.5 py-1 rounded bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-200 text-[10px] font-bold cursor-pointer">
              Trigger Emergency Return
            </button>
            <button onClick={handleInjectSegmentBlock} className="px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 text-[10px] font-bold cursor-pointer">
              Block Route Segment
            </button>
            <button onClick={handleExportReport} className="px-3 py-1 rounded bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-bold text-[10px] cursor-pointer">
              Export Report JSON
            </button>
          </div>
        </div>

        <div className="bg-black/50 border border-slate-800 rounded-xl p-2.5 max-h-[140px] overflow-y-auto space-y-1 text-[11px]">
          {timelineEvents.length === 0 ? (
            <span className="text-slate-500">No mission audit events recorded yet.</span>
          ) : (
            timelineEvents.map(evt => (
              <div key={evt.id} className="flex items-start gap-2 border-b border-slate-900 pb-1">
                <span className="text-slate-500 text-[10px] w-14 shrink-0">{evt.timestamp}</span>
                <span className={`px-1 rounded text-[9px] uppercase font-bold shrink-0 ${
                  evt.type === 'emergency' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  evt.type === 'analysis' ? 'bg-cyan-500/20 text-cyan-300' :
                  evt.type === 'hazard' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                }`}>
                  {evt.type}
                </span>
                <span className="text-slate-200 font-bold shrink-0">{evt.title}:</span>
                <span className="text-slate-400 truncate">{evt.detail}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
