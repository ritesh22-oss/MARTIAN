/**
 * SHARED ACTIVE EXPLORATION SESSION STORE
 * Single authoritative reactive store for live MarsWalk Ops <-> Surface Mission Dashboard & Explorer synchronization.
 * Drives active image metadata/provenance, AI+CV segmentation & boulder detections, terrain regions,
 * USGS geological identification, automated waypoints, and dynamic A* traversal routes with zero fabricated fallbacks.
 */

import { computeObstacleAwareRoute } from '../utils/marsPathfinding';
import { mapCVObstaclesToHazards } from './centralTerrainEngine';
import {
  analyzeCompleteTerrainImage,
  CompleteTerrainIntelligenceReport,
  CoordinateProvenanceScope,
  TerrainRegionItem
} from './terrainIntelligenceService';
import {
  ObstacleHazardStatus,
  ObstacleSizeCategory,
  validateUploadedImageFile
} from './terrainVisionService';

export type AnalysisLifecycleStatus =
  | 'waiting'
  | 'uploading'
  | 'uploaded'
  | 'analyzing'
  | 'retrieving_datasets'
  | 'processing_terrain'
  | 'updating_dashboard'
  | 'completed'
  | 'partial'
  | 'failed';

export interface ActiveImageProvenance {
  source: string;
  rover: string;
  camera: string;
  sol: number;
  acquisitionUtc: string;
  identifier: string;
  sourceUrl: string;
  site?: number;
  drive?: string | number;
  targetRegion?: string;
  lat: number | null;
  lon: number | null;
  coordinateScope: CoordinateProvenanceScope;
  locationLabel: string;
  selectionOrigin: 'upload' | 'nasa' | 'region' | 'none';
}

export interface ExplorationTargetRecord {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  xPct?: number;
  yPct?: number;
  classification: string;
  supportingImage: string;
  dataSource: string;
  instrument: string;
  confidencePct: number;
  relevance: string;
  recommendedMethod: string;
  status: 'Not Investigated' | 'Planned' | 'In Progress' | 'Sample Collected' | 'Completed' | 'Rejected';
  dataNature: 'Observed' | 'Derived' | 'Modeled' | 'Historical' | 'Unknown';
  notes: string[];
  photoUrls: string[];
}

export interface ExplorationWaypoint {
  id: string;
  name: string;
  xPct: number;
  yPct: number;
  type: 'start' | 'destination' | 'science' | 'sample' | 'transit' | 'waypoint';
  notes?: string;
  associatedBoulderId?: string;
  status: 'Pending' | 'In Progress' | 'Investigated' | 'Sampled';
}

export interface AutomatedRouteData {
  path: Array<{ xPct: number; yPct: number }>;
  footprints: Array<{ xPct: number; yPct: number; angleDeg: number; isLeft: boolean }>;
  distanceMeters: number;
  estimatedMins: number;
  maxSlopeDeg: number | null;
  slopeAvailable?: boolean;
  safetyScore: number | null;
  isComputable?: boolean;
  isSimulated?: boolean;
  unavailableReason?: string | null;
  formulaDescription?: string;
  status: 'GENERATED' | 'OPTIMIZED' | 'BLOCKED' | 'ROUTE VERIFIED' | 'NO SAFE ROUTE FOUND' | 'BLOCKED_ENDPOINT' | 'UNAVAILABLE';
}

export interface DetectedBoulder {
  id: string;
  label: string;
  classification: string;
  sizeCategory?: ObstacleSizeCategory;
  hazardStatus?: ObstacleHazardStatus;
  riskLevel?: 'high' | 'moderate' | 'low';
  riskColor?: string;
  traversalRelevance?: string;
  detectionMethod?: 'CV Localizer' | 'Gemini Vision';
  confidence: number;
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
  pixelX: number;
  pixelY: number;
  pixelWidth: number;
  pixelHeight: number;
  physicalWidthM: number | null;
  physicalHeightM: number | null;
  dimensionsNote: string;
}

export interface DetectedHazard {
  id: string;
  label: string;
  classification: 'boulder' | 'rock_cluster' | 'bedrock_ridge' | 'loose_regolith' | 'sand_trap' | 'depression' | 'steep_face' | 'narrow_passage';
  sizeCategory?: ObstacleSizeCategory;
  hazardStatus?: ObstacleHazardStatus;
  traversalRelevance?: string;
  detectionMethod?: 'CV Localizer' | 'Gemini Vision';
  dimensionsNote?: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskColor?: string;
  confidence: number;
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
  pixelX?: number;
  pixelY?: number;
  pixelWidth?: number;
  pixelHeight?: number;
  areaPct: number;
  severity: string;
  mobilityImpact: string;
  reason: string;
}

export interface EnvironmentalObservationRecord {
  value: number | string | null;
  unit: string;
  source: string;
  instrument: string;
  timestamp: string;
  location: string;
  nature: 'Observed' | 'Derived' | 'Modeled' | 'Unavailable';
}

export interface ActiveExplorationSession {
  activeImageId: string;
  activeAnalysisId: string;
  activeRegion: string;
  provenance: ActiveImageProvenance;
  imageMetadata: {
    fileName: string;
    sizeBytes: number;
    width: number;
    height: number;
    format: string;
    url: string;
    source: string;
  };
  imageAnalysis: {
    visibleFeatures: string[];
    rockFormations: string[];
    boulders: DetectedBoulder[];
    hazards: DetectedHazard[];
    regions: TerrainRegionItem[];
    segmentationMaskUrl?: string;
    pixelComposition: {
      soilPct: number;
      bedrockPct: number;
      sandPct: number;
      rockPct: number;
    };
    sandAndRegolith: string;
    visibleFractures: string[];
    sedimentaryStructures: string[];
    terrainObstacles: string[];
    surfaceTexture: string;
    roughnessScore: number;
    shadowContrast: number;
    dominantFeature: string;
    imageQuality: string;
    uncertainOrUnidentifiedFeatures: string[];
    geologicalRelevance: string;
    recommendedInvestigationMethod: string;
    aiAvailable: boolean;
    aiStatusMessage?: string;
    dataNature: 'Observed' | 'Derived' | 'Modeled' | 'Unavailable';
  };
  terrainReport: CompleteTerrainIntelligenceReport | null;
  terrainAnalysis: {
    slopeMeanDeg: number | null;
    slopeMaxDeg: number | null;
    slopeAvailable: boolean;
    regolithTraversabilityIndex: number | null;
    boulderDensityPct: number;
    sandCoveragePct: number;
    passageWidthPx: number | null;
    passageWidthM: number | null;
    dataSuitability: {
      elevationAnalysis: boolean;
      slopeCalculation: boolean;
      surfaceRoughness: boolean;
      obstacleClearance: boolean;
      roverTraversability: boolean;
      notes: string;
    };
  };
  geologicalTargets: ExplorationTargetRecord[];
  waypoints: ExplorationWaypoint[];
  automatedRoute: AutomatedRouteData;
  environmentalObservations: {
    ambientTempC: EnvironmentalObservationRecord;
    groundTempC: EnvironmentalObservationRecord;
    atmosPressurePa: EnvironmentalObservationRecord;
    windSpeedMs: EnvironmentalObservationRecord;
    windDirectionDeg: EnvironmentalObservationRecord;
    dustTau: EnvironmentalObservationRecord;
    solarExposureWm2: EnvironmentalObservationRecord;
    radiationDoseMgyDay: EnvironmentalObservationRecord;
    galacticCosmicRayMsvYr: EnvironmentalObservationRecord;
    solarFlareStatus: EnvironmentalObservationRecord;
    statusLabel: string;
    isAvailable: boolean;
  };
  elevationData: {
    hasNativeElevation: boolean;
    elevationMinM: number | null;
    elevationMaxM: number | null;
    datum: string;
  };
  activeRoute: {
    code: string;
    name: string;
    distanceM: number | null;
    timeMins: number | null;
    maxSlopeDeg: number | null;
    safetyScorePct: number | null;
    isSimulated: boolean;
    returnFeasible: boolean;
    returnDistanceM: number | null;
    returnDurationMins: number | null;
  };
  analysisStatus: AnalysisLifecycleStatus;
  statusMessage: string;
  lastError: string | null;
  lastUpdated: string;
}

export interface DiagnosticLogEvent {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  stage: string;
  message: string;
  details?: any;
}

const unavailableRecord = (unit = ''): EnvironmentalObservationRecord => ({
  value: null,
  unit,
  source: 'No active in-situ surface telemetry link',
  instrument: 'Unavailable',
  timestamp: 'N/A',
  location: 'Unassigned',
  nature: 'Unavailable'
});

const emptyRouteData: AutomatedRouteData = {
  path: [],
  footprints: [],
  distanceMeters: 0,
  estimatedMins: 0,
  maxSlopeDeg: null,
  slopeAvailable: false,
  safetyScore: null,
  isComputable: false,
  isSimulated: true,
  unavailableReason: 'Select or upload a Martian surface image to compute obstacle-aware traverse routes.',
  formulaDescription:
    'Safety Score = 100 - (ObstacleProximityPenalty [0–40] + SurfaceRoughnessPenalty [0–30] + SandDriftPenalty [0–15] + SlopePenalty [0–25 if DEM calibrated])',
  status: 'UNAVAILABLE'
};

const initialSession: ActiveExplorationSession = {
  activeImageId: 'UNASSIGNED',
  activeAnalysisId: 'NONE',
  activeRegion: 'jezero',
  provenance: {
    source: 'No Image Selected',
    rover: 'N/A',
    camera: 'N/A',
    sol: 0,
    acquisitionUtc: '',
    identifier: '',
    sourceUrl: '',
    lat: null,
    lon: null,
    coordinateScope: 'unavailable',
    locationLabel: 'No Active Location',
    selectionOrigin: 'none'
  },
  imageMetadata: {
    fileName: 'No Surface Image Loaded',
    sizeBytes: 0,
    width: 0,
    height: 0,
    format: 'N/A',
    url: '',
    source: 'Awaiting image upload or NASA planetary archive selection'
  },
  imageAnalysis: {
    visibleFeatures: [],
    rockFormations: [],
    boulders: [],
    hazards: [],
    regions: [],
    segmentationMaskUrl: undefined,
    pixelComposition: { soilPct: 0, bedrockPct: 0, sandPct: 0, rockPct: 0 },
    sandAndRegolith: 'Select or upload a surface image to inspect regolith and sand deposits.',
    visibleFractures: [],
    sedimentaryStructures: [],
    terrainObstacles: [],
    surfaceTexture: 'Not yet analyzed',
    roughnessScore: 0,
    shadowContrast: 0,
    dominantFeature: 'No Image Loaded',
    imageQuality: 'N/A',
    uncertainOrUnidentifiedFeatures: [],
    geologicalRelevance: 'Select or upload an image to run terrain and geological analysis.',
    recommendedInvestigationMethod: 'Awaiting surface image.',
    aiAvailable: false,
    aiStatusMessage: 'No active image selected.',
    dataNature: 'Unavailable'
  },
  terrainReport: null,
  terrainAnalysis: {
    slopeMeanDeg: null,
    slopeMaxDeg: null,
    slopeAvailable: false,
    regolithTraversabilityIndex: null,
    boulderDensityPct: 0,
    sandCoveragePct: 0,
    passageWidthPx: null,
    passageWidthM: null,
    dataSuitability: {
      elevationAnalysis: false,
      slopeCalculation: false,
      surfaceRoughness: false,
      obstacleClearance: false,
      roverTraversability: false,
      notes: 'Select or upload a Martian terrain image to evaluate surface suitability.'
    }
  },
  geologicalTargets: [],
  waypoints: [],
  automatedRoute: emptyRouteData,
  environmentalObservations: {
    ambientTempC: unavailableRecord('°C'),
    groundTempC: unavailableRecord('°C'),
    atmosPressurePa: unavailableRecord('Pa'),
    windSpeedMs: unavailableRecord('m/s'),
    windDirectionDeg: unavailableRecord('°'),
    dustTau: unavailableRecord('Tau'),
    solarExposureWm2: unavailableRecord('W/m²'),
    radiationDoseMgyDay: unavailableRecord('mGy/day'),
    galacticCosmicRayMsvYr: unavailableRecord('mSv/yr'),
    solarFlareStatus: {
      value: 'See Radiation & Space Weather Monitor',
      unit: '',
      source: 'NOAA SWPC / NASA DONKI',
      instrument: 'Space Weather Stream',
      timestamp: 'N/A',
      location: '1 AU / Heliosphere',
      nature: 'Unavailable'
    },
    statusLabel: 'NO IN-SITU SURFACE WEATHER TELEMETRY ATTACHED TO FRAME',
    isAvailable: false
  },
  elevationData: {
    hasNativeElevation: false,
    elevationMinM: null,
    elevationMaxM: null,
    datum: 'MOLA Areoid (Calibrated DEM Unavailable)'
  },
  activeRoute: {
    code: 'UNCOMPUTED',
    name: 'AWAITING TERRAIN IMAGE',
    distanceM: null,
    timeMins: null,
    maxSlopeDeg: null,
    safetyScorePct: null,
    isSimulated: true,
    returnFeasible: false,
    returnDistanceM: null,
    returnDurationMins: null
  },
  analysisStatus: 'waiting',
  statusMessage: 'Select a NASA rover photograph or upload a Martian terrain image to run live analysis.',
  lastError: null,
  lastUpdated: new Date().toISOString()
};

function inferMimeType(urlOrName: string): string {
  const lower = urlOrName.toLowerCase();
  if (lower.endsWith('.png') || lower.includes('image/png')) return 'PNG';
  if (lower.endsWith('.webp') || lower.includes('image/webp')) return 'WEBP';
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'TIFF';
  return 'JPEG';
}

class SharedExplorationStore {
  private currentSession: ActiveExplorationSession = { ...initialSession };
  private listeners: Set<(session: ActiveExplorationSession) => void> = new Set();
  private diagnosticLogs: DiagnosticLogEvent[] = [];
  private sessionCache: Map<string, ActiveExplorationSession> = new Map();
  private inFlightRequests: Map<string, Promise<ActiveExplorationSession>> = new Map();
  private activeAbortController: AbortController | null = null;
  private currentImageKey: string | null = null;
  private currentSeq = 0;

  constructor() {
    this.logDiagnostic('info', 'INITIALIZATION', 'Shared Exploration Session Store ready (zero-mock baseline).');
  }

  public getSession(): ActiveExplorationSession {
    return this.currentSession;
  }

  public subscribe(listener: (session: ActiveExplorationSession) => void): () => void {
    this.listeners.add(listener);
    setTimeout(() => listener(this.currentSession), 0);
    return () => this.listeners.delete(listener);
  }

  public logDiagnostic(level: DiagnosticLogEvent['level'], stage: string, message: string, details?: any) {
    const event: DiagnosticLogEvent = {
      timestamp: new Date().toISOString(),
      level,
      stage,
      message,
      details
    };
    this.diagnosticLogs.unshift(event);
    if (this.diagnosticLogs.length > 60) this.diagnosticLogs.pop();

    const prefix = `[EXPLORATION_SYNC] [${stage}]`;
    if (level === 'error') console.error(prefix, message, details || '');
    else if (level === 'warn') console.warn(prefix, message, details || '');
    else console.log(prefix, message, details || '');
  }

  public getDiagnosticLogs(): DiagnosticLogEvent[] {
    return [...this.diagnosticLogs];
  }

  public updateSession(partial: Partial<ActiveExplorationSession>) {
    this.currentSession = {
      ...this.currentSession,
      ...partial,
      lastUpdated: new Date().toISOString()
    };
    if (this.currentImageKey && this.currentSession.analysisStatus === 'completed') {
      this.sessionCache.set(this.currentImageKey, this.currentSession);
    }
    this.notifyListeners();
  }

  public setAnalysisStatus(status: AnalysisLifecycleStatus, message: string, error: string | null = null) {
    this.currentSession = {
      ...this.currentSession,
      analysisStatus: status,
      statusMessage: message,
      lastError: error,
      lastUpdated: new Date().toISOString()
    };
    this.logDiagnostic(
      status === 'failed' ? 'error' : status === 'completed' ? 'success' : 'info',
      'STATUS_CHANGE',
      `${status.toUpperCase()}: ${message}`,
      error ? { error } : undefined
    );
    this.notifyListeners();
  }

  public updateWaypoint(waypointId: string, updates: Partial<ExplorationWaypoint>) {
    const updatedWaypoints = this.currentSession.waypoints.map(wp =>
      wp.id === waypointId ? { ...wp, ...updates } : wp
    );

    this.currentSession = {
      ...this.currentSession,
      waypoints: updatedWaypoints,
      lastUpdated: new Date().toISOString()
    };

    const affectedWp = updatedWaypoints.find(wp => wp.id === waypointId);
    if (affectedWp?.type === 'start' || affectedWp?.type === 'destination') {
      this.recalculateRoute();
    } else {
      this.notifyListeners();
    }
  }

  public recalculateRoute() {
    const start = this.currentSession.waypoints.find(wp => wp.type === 'start');
    const dest = this.currentSession.waypoints.find(wp => wp.type === 'destination');
    if (!start || !dest) return;

    const hasImageData = Boolean(this.currentSession.imageMetadata.url);
    const aStarResult = computeObstacleAwareRoute(
      this.currentSession.imageAnalysis.boulders,
      { xPct: start.xPct, yPct: start.yPct },
      { xPct: dest.xPct, yPct: dest.yPct },
      84,
      {
        hasImageData,
        roughnessScore: this.currentSession.imageAnalysis.roughnessScore,
        sandCoveragePct: this.currentSession.terrainAnalysis.sandCoveragePct,
        slopeMaxDeg: this.currentSession.terrainAnalysis.slopeMaxDeg
      }
    );

    this.currentSession = {
      ...this.currentSession,
      automatedRoute: {
        path: aStarResult.path,
        footprints: aStarResult.footprints,
        distanceMeters: aStarResult.distanceMeters,
        estimatedMins: aStarResult.estimatedMins,
        maxSlopeDeg: aStarResult.maxSlopeDeg,
        slopeAvailable: aStarResult.slopeAvailable,
        safetyScore: aStarResult.safetyScore,
        isComputable: aStarResult.isComputable,
        isSimulated: true,
        unavailableReason: aStarResult.unavailableReason,
        formulaDescription: aStarResult.formulaDescription,
        status: aStarResult.status
      },
      lastUpdated: new Date().toISOString()
    };
    this.notifyListeners();
  }

  public generateAutomatedNavigationPlan(
    boulders: DetectedBoulder[],
    customStart?: { xPct: number; yPct: number },
    customDest?: { xPct: number; yPct: number },
    roughnessScore = this.currentSession.imageAnalysis.roughnessScore,
    sandCoveragePct = this.currentSession.terrainAnalysis.sandCoveragePct,
    hasImageData = Boolean(this.currentSession.imageMetadata.url)
  ): { waypoints: ExplorationWaypoint[]; automatedRoute: AutomatedRouteData } {
    const waypoints: ExplorationWaypoint[] = [];
    const startX = customStart?.xPct ?? 14;
    const startY = customStart?.yPct ?? 82;
    const destX = customDest?.xPct ?? 86;
    const destY = customDest?.yPct ?? 18;

    waypoints.push({
      id: 'wp_start',
      name: 'Traverse Start Point',
      xPct: Number(startX.toFixed(1)),
      yPct: Number(startY.toFixed(1)),
      type: 'start',
      notes: 'Simulated EVA egress reference point within active image frame.',
      status: 'Investigated'
    });

    boulders.slice(0, 6).forEach((b, idx) => {
      const centerX = (b.normX + b.normWidth * 0.5) * 100;
      const centerY = (b.normY + b.normHeight * 0.5) * 100;
      const standOffX = Number(Math.min(92, Math.max(8, centerX + (centerX > 50 ? -9 : 9))).toFixed(1));
      const standOffY = Number(Math.min(92, Math.max(8, centerY - 6)).toFixed(1));
      waypoints.push({
        id: `wp_sci_${idx + 1}`,
        name: `Inspect: ${b.label}`,
        xPct: standOffX,
        yPct: standOffY,
        type: 'science',
        notes: `${b.detectionMethod || 'CV'} detection (${b.sizeCategory?.replace('_', ' ') || b.classification}) — ${b.traversalRelevance || b.dimensionsNote}`,
        associatedBoulderId: b.id,
        status: idx === 0 ? 'In Progress' : 'Pending'
      });
    });

    waypoints.push({
      id: 'wp_dest',
      name: 'Traverse Objective Point',
      xPct: Number(destX.toFixed(1)),
      yPct: Number(destY.toFixed(1)),
      type: 'destination',
      notes: 'Simulated traverse endpoint across active frame.',
      status: 'Pending'
    });

    const aStarResult = computeObstacleAwareRoute(
      boulders,
      { xPct: startX, yPct: startY },
      { xPct: destX, yPct: destY },
      84,
      {
        hasImageData,
        roughnessScore,
        sandCoveragePct,
        slopeMaxDeg: this.currentSession.terrainAnalysis.slopeMaxDeg
      }
    );

    const automatedRoute: AutomatedRouteData = {
      path: aStarResult.path,
      footprints: aStarResult.footprints,
      distanceMeters: aStarResult.distanceMeters,
      estimatedMins: aStarResult.estimatedMins,
      maxSlopeDeg: aStarResult.maxSlopeDeg,
      slopeAvailable: aStarResult.slopeAvailable,
      safetyScore: aStarResult.safetyScore,
      isComputable: aStarResult.isComputable,
      isSimulated: true,
      unavailableReason: aStarResult.unavailableReason,
      formulaDescription: aStarResult.formulaDescription,
      status: aStarResult.status
    };

    return { waypoints, automatedRoute };
  }

  /**
   * SINGLE UNIFIED ANALYSIS PIPELINE:
   * Immediately resets stale image results, cancels superseded requests via AbortController,
   * executes analyzeCompleteTerrainImage() once (fused CV + Gemini Vision + USGS geology + Trek MOLA),
   * and updates all exploration state synchronously.
   */
  public async processAndSyncImage(
    fileOrUrl: File | string,
    fileName?: string,
    regionId?: string,
    customStart?: { xPct: number; yPct: number },
    customDest?: { xPct: number; yPct: number },
    provenanceInput?: Partial<ActiveImageProvenance> & { forceRefresh?: boolean }
  ): Promise<ActiveExplorationSession> {
    if (!fileOrUrl || (typeof fileOrUrl === 'string' && fileOrUrl.trim() === '')) {
      return this.currentSession;
    }

    const forceRefresh = Boolean(provenanceInput?.forceRefresh);
    const isFile = typeof fileOrUrl !== 'string';
    const rawIdentifier = isFile
      ? `${fileOrUrl.name}_${fileOrUrl.size}_${fileOrUrl.lastModified}`
      : (provenanceInput?.identifier || fileOrUrl);

    const coordScope: CoordinateProvenanceScope =
      provenanceInput?.coordinateScope ||
      (typeof provenanceInput?.lat === 'number' && typeof provenanceInput?.lon === 'number'
        ? 'exact_verified'
        : 'unavailable');

    const coordKey =
      coordScope !== 'unavailable' && typeof provenanceInput?.lat === 'number' && typeof provenanceInput?.lon === 'number'
        ? `${coordScope}:${provenanceInput.lat.toFixed(4)},${provenanceInput.lon.toFixed(4)}`
        : 'no-coords';

    const cacheKey = `${rawIdentifier}::${coordKey}`;

    // If identical image is already completed and we just changed start/dest, recalculate route locally
    if (!forceRefresh && this.currentImageKey === cacheKey && this.currentSession.analysisStatus === 'completed') {
      if (customStart || customDest) {
        const { waypoints, automatedRoute } = this.generateAutomatedNavigationPlan(
          this.currentSession.imageAnalysis.boulders,
          customStart,
          customDest,
          this.currentSession.imageAnalysis.roughnessScore,
          this.currentSession.terrainAnalysis.sandCoveragePct,
          true
        );
        this.currentSession = {
          ...this.currentSession,
          waypoints,
          automatedRoute,
          lastUpdated: new Date().toISOString()
        };
        this.notifyListeners();
      }
      return this.currentSession;
    }

    // Deduplicate concurrent calls for the exact same active image key
    if (!forceRefresh && this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey)!;
    }

    // If cached session exists from earlier switch, restore immediately cleanly
    if (!forceRefresh && this.sessionCache.has(cacheKey)) {
      const cached = this.sessionCache.get(cacheKey)!;
      const { waypoints, automatedRoute } = this.generateAutomatedNavigationPlan(
        cached.imageAnalysis.boulders,
        customStart,
        customDest,
        cached.imageAnalysis.roughnessScore,
        cached.terrainAnalysis.sandCoveragePct,
        true
      );
      this.currentImageKey = cacheKey;
      this.currentSession = {
        ...cached,
        waypoints,
        automatedRoute,
        lastUpdated: new Date().toISOString()
      };
      this.logDiagnostic('info', 'CACHE_RESTORE', `Restored analyzed session for ${cached.imageMetadata.fileName}`);
      this.notifyListeners();
      return this.currentSession;
    }

    // Cancel any superseded previous in-flight analysis
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
    }
    const controller = new AbortController();
    this.activeAbortController = controller;

    const seq = ++this.currentSeq;
    this.currentImageKey = cacheKey;

    const resolvedFileName =
      fileName ||
      (isFile ? fileOrUrl.name : provenanceInput?.identifier || fileOrUrl.split('/').pop()?.split('?')[0] || 'Mars_Surface_Frame.jpg');
    const activeRegion = regionId || this.currentSession.activeRegion || 'jezero';

    const imageUrl = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
    const isUserUpload =
      provenanceInput?.selectionOrigin === 'upload' ||
      isFile ||
      imageUrl.startsWith('blob:') ||
      Boolean(provenanceInput?.source?.toLowerCase().includes('upload'));

    const selectionOrigin: ActiveImageProvenance['selectionOrigin'] =
      isUserUpload ? 'upload' : provenanceInput?.selectionOrigin || 'nasa';

    const resolvedProvenance: ActiveImageProvenance = {
      source: provenanceInput?.source || (isUserUpload ? `User Upload (${resolvedFileName})` : `NASA Mars Feed (${resolvedFileName})`),
      rover: provenanceInput?.rover || (isUserUpload ? 'User Payload / Custom Upload' : 'NASA Mars Rover'),
      camera: provenanceInput?.camera || (isUserUpload ? 'OPTICAL_FRAME' : 'NAVCAM'),
      sol: typeof provenanceInput?.sol === 'number' ? provenanceInput.sol : 0,
      acquisitionUtc: provenanceInput?.acquisitionUtc || new Date().toISOString(),
      identifier: provenanceInput?.identifier || resolvedFileName,
      sourceUrl: provenanceInput?.sourceUrl || imageUrl,
      site: provenanceInput?.site,
      drive: provenanceInput?.drive,
      targetRegion: provenanceInput?.targetRegion,
      lat: coordScope !== 'unavailable' && typeof provenanceInput?.lat === 'number' ? provenanceInput.lat : null,
      lon: coordScope !== 'unavailable' && typeof provenanceInput?.lon === 'number' ? provenanceInput.lon : null,
      coordinateScope: coordScope,
      locationLabel:
        provenanceInput?.locationLabel ||
        (coordScope === 'unavailable' ? 'Coordinates Unavailable' : `${provenanceInput?.targetRegion || activeRegion}`),
      selectionOrigin
    };

    const imageId = `IMG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const analysisId = `ANALYSIS_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // IMMEDIATELY CLEAR stale boulders, hazards, targets, mask, and routes from previous image
    this.currentSession = {
      ...initialSession,
      activeImageId: imageId,
      activeAnalysisId: analysisId,
      activeRegion,
      provenance: resolvedProvenance,
      imageMetadata: {
        fileName: resolvedFileName,
        sizeBytes: isFile ? fileOrUrl.size : 0,
        width: 0,
        height: 0,
        format: inferMimeType(resolvedFileName),
        url: imageUrl,
        source: resolvedProvenance.source
      },
      analysisStatus: 'analyzing',
      statusMessage: `Reset previous analysis; inspecting ${resolvedFileName} with CV + Gemini Vision...`,
      lastError: null,
      lastUpdated: new Date().toISOString()
    };
    this.notifyListeners();

    const taskPromise = (async (): Promise<ActiveExplorationSession> => {
      try {
        let localValidation = null;
        if (isFile) {
          localValidation = await validateUploadedImageFile(fileOrUrl);
        }

        if (controller.signal.aborted || this.currentSeq !== seq) {
          return this.currentSession;
        }

        const report = await analyzeCompleteTerrainImage({
          imageUrl,
          imageIdentifier: resolvedProvenance.identifier,
          mission: resolvedProvenance.rover,
          camera: resolvedProvenance.camera,
          sol: resolvedProvenance.sol,
          source: resolvedProvenance.source,
          lat: resolvedProvenance.lat ?? undefined,
          lon: resolvedProvenance.lon ?? undefined,
          coordinateScope: resolvedProvenance.coordinateScope,
          locationLabel: resolvedProvenance.locationLabel,
          regionId: activeRegion,
          forceRefresh,
          signal: controller.signal
        });

        if (controller.signal.aborted || this.currentSeq !== seq) {
          return this.currentSession;
        }

        const boulders: DetectedBoulder[] = report.detectedBoulders.map(b => ({
          id: b.id,
          label: b.label,
          classification: b.classification,
          sizeCategory: b.sizeCategory,
          hazardStatus: b.hazardStatus,
          riskLevel: b.riskLevel,
          riskColor: b.riskColor,
          traversalRelevance: b.traversalRelevance,
          detectionMethod: b.detectionMethod,
          confidence: b.confidence,
          normX: b.normX,
          normY: b.normY,
          normWidth: b.normWidth,
          normHeight: b.normHeight,
          pixelX: b.pixelX,
          pixelY: b.pixelY,
          pixelWidth: b.pixelWidth,
          pixelHeight: b.pixelHeight,
          physicalWidthM: b.physicalWidthM,
          physicalHeightM: b.physicalHeightM,
          dimensionsNote: b.dimensionsNote
        }));

        const hazards: DetectedHazard[] = mapCVObstaclesToHazards(
          report.detectedBoulders.map(b => ({
            ...b,
            classification: (b.classification as any) || 'boulder',
            intersectsPlannedRoute: false,
            distanceToRoutePixels: 0,
            intersectingWaypointIndex: null
          }))
        );

        const totalObstacleAreaPct = parseFloat(
          Math.min(
            95,
            boulders.reduce((sum, b) => sum + b.normWidth * b.normHeight * 100, 0)
          ).toFixed(1)
        );
        const roughnessNorm = Number((report.roughnessScore / 100).toFixed(2));
        const traversabilityIdx = Math.max(
          15,
          Math.min(96, Math.round(100 - (roughnessNorm * 38 + report.shadowContrast * 22 + Math.min(26, totalObstacleAreaPct * 0.9))))
        );

        const { waypoints, automatedRoute } = this.generateAutomatedNavigationPlan(
          boulders,
          customStart,
          customDest,
          roughnessNorm,
          report.pixelComposition.sandPct,
          true
        );

        // Construct active-image geological targets from detected regions + obstacles
        const hasCoords = resolvedProvenance.lat !== null && resolvedProvenance.lon !== null;
        const primaryGeoUnit = report.geologicalIdentification.geographicallyVerified.primaryUnit;
        const dynamicTargets: ExplorationTargetRecord[] = [];

        report.regions.slice(0, 5).forEach((reg, idx) => {
          const cxPct = Number(((reg.normX + reg.normWidth * 0.5) * 100).toFixed(1));
          const cyPct = Number(((reg.normY + reg.normHeight * 0.5) * 100).toFixed(1));
          dynamicTargets.push({
            id: `tgt_${imageId}_reg_${idx + 1}`,
            name: reg.title,
            lat: hasCoords ? Number((resolvedProvenance.lat! + (reg.normY - 0.5) * 0.002).toFixed(5)) : null,
            lon: hasCoords ? Number((resolvedProvenance.lon! + (reg.normX - 0.5) * 0.002).toFixed(5)) : null,
            xPct: cxPct,
            yPct: cyPct,
            classification: reg.classification,
            supportingImage: imageUrl,
            dataSource: resolvedProvenance.source,
            instrument: `${resolvedProvenance.rover} / ${resolvedProvenance.camera}`,
            confidencePct: reg.confidence,
            relevance: reg.scientificSignificance,
            recommendedMethod: report.recommendedInvestigationMethod,
            status: idx === 0 ? 'In Progress' : 'Planned',
            dataNature: 'Derived',
            notes: [
              `Visual region (${reg.locationDescription}): ${reg.visualCharacteristics}`,
              primaryGeoUnit
                ? `Regional USGS SIM 3292 context: ${primaryGeoUnit.unitSymbol} (${primaryGeoUnit.unitName})`
                : 'USGS map unit: No verified geological classification available for this location.'
            ],
            photoUrls: [imageUrl]
          });
        });

        if (dynamicTargets.length === 0) {
          boulders.slice(0, 4).forEach((obs, idx) => {
            const cxPct = Number(((obs.normX + obs.normWidth * 0.5) * 100).toFixed(1));
            const cyPct = Number(((obs.normY + obs.normHeight * 0.5) * 100).toFixed(1));
            dynamicTargets.push({
              id: `tgt_${imageId}_obs_${idx + 1}`,
              name: obs.label,
              lat: hasCoords ? Number((resolvedProvenance.lat! + (obs.normY - 0.5) * 0.002).toFixed(5)) : null,
              lon: hasCoords ? Number((resolvedProvenance.lon! + (obs.normX - 0.5) * 0.002).toFixed(5)) : null,
              xPct: cxPct,
              yPct: cyPct,
              classification: obs.sizeCategory ? obs.sizeCategory.replace('_', ' ') : obs.classification,
              supportingImage: imageUrl,
              dataSource: resolvedProvenance.source,
              instrument: `${resolvedProvenance.rover} / ${resolvedProvenance.camera}`,
              confidencePct: Math.round(obs.confidence * 100),
              relevance: obs.traversalRelevance || obs.dimensionsNote,
              recommendedMethod: 'Optical close-range documentation & spectroscopic confirmation.',
              status: idx === 0 ? 'In Progress' : 'Planned',
              dataNature: 'Derived',
              notes: [`Detected via ${obs.detectionMethod || 'CV Localizer'}: ${obs.dimensionsNote}`],
              photoUrls: [imageUrl]
            });
          });
        }

        const geoVerified = report.geologicalIdentification.geographicallyVerified;
        const molaElev = geoVerified.molaElevationM;

        const finalSession: ActiveExplorationSession = {
          activeImageId: imageId,
          activeAnalysisId: analysisId,
          activeRegion,
          provenance: resolvedProvenance,
          imageMetadata: {
            fileName: resolvedFileName,
            sizeBytes: isFile ? fileOrUrl.size : localValidation?.fileSizeBytes || 0,
            width: report.naturalWidth,
            height: report.naturalHeight,
            format: inferMimeType(resolvedFileName),
            url: imageUrl,
            source: resolvedProvenance.source
          },
          imageAnalysis: {
            visibleFeatures: report.visibleFeatures,
            rockFormations: report.rockFormations,
            boulders,
            hazards,
            regions: report.regions,
            segmentationMaskUrl: report.segmentationMaskUrl,
            pixelComposition: report.pixelComposition,
            sandAndRegolith: report.sandAndRegolith,
            visibleFractures: report.visibleFractures,
            sedimentaryStructures: report.sedimentaryStructures,
            terrainObstacles: report.terrainObstacles,
            surfaceTexture: report.surfaceTexture,
            roughnessScore: roughnessNorm,
            shadowContrast: report.shadowContrast,
            dominantFeature: report.dominantFeature,
            imageQuality: report.imageQuality,
            uncertainOrUnidentifiedFeatures: report.scientificReport.dataLimitations,
            geologicalRelevance: report.geologicalRelevance,
            recommendedInvestigationMethod: report.recommendedInvestigationMethod,
            aiAvailable: report.aiAvailable,
            aiStatusMessage: report.aiStatusMessage,
            dataNature: hasCoords ? 'Observed' : 'Derived'
          },
          terrainReport: report,
          terrainAnalysis: {
            slopeMeanDeg: null,
            slopeMaxDeg: null,
            slopeAvailable: false,
            regolithTraversabilityIndex: traversabilityIdx,
            boulderDensityPct: totalObstacleAreaPct,
            sandCoveragePct: report.pixelComposition.sandPct,
            passageWidthPx: null,
            passageWidthM: null,
            dataSuitability: {
              elevationAnalysis: false,
              slopeCalculation: false,
              surfaceRoughness: true,
              obstacleClearance: true,
              roverTraversability: true,
              notes: 'Visual estimate only — calibrated depth/elevation data unavailable from single 2D optical frame.'
            }
          },
          geologicalTargets: dynamicTargets,
          waypoints,
          automatedRoute,
          environmentalObservations: {
            ...initialSession.environmentalObservations,
            statusLabel: hasCoords
              ? 'NO LIVE IN-SITU SURFACE SENSOR STREAM AT FRAME TIMESTAMP'
              : 'COORDINATES UNAVAILABLE — NO IN-SITU SENSOR LINK',
            isAvailable: false
          },
          elevationData: {
            hasNativeElevation: molaElev !== null,
            elevationMinM: molaElev !== null ? Number(molaElev.toFixed(1)) : null,
            elevationMaxM: molaElev !== null ? Number(molaElev.toFixed(1)) : null,
            datum: geoVerified.molaDatum || 'MOLA Areoid'
          },
          activeRoute: {
            code: 'ALPHA-AUTO',
            name: 'SIMULATED OBSTACLE-AWARE ROUTE',
            distanceM: automatedRoute.isComputable ? automatedRoute.distanceMeters : null,
            timeMins: automatedRoute.isComputable ? automatedRoute.estimatedMins : null,
            maxSlopeDeg: automatedRoute.maxSlopeDeg,
            safetyScorePct: automatedRoute.safetyScore,
            isSimulated: true,
            returnFeasible: Boolean(automatedRoute.isComputable && (automatedRoute.estimatedMins ?? 999) <= 90),
            returnDistanceM: automatedRoute.isComputable ? automatedRoute.distanceMeters : null,
            returnDurationMins: automatedRoute.isComputable ? Math.max(1, Math.round(automatedRoute.estimatedMins * 0.85)) : null
          },
          analysisStatus: 'completed',
          statusMessage: `Analyzed ${resolvedFileName} (${report.naturalWidth}×${report.naturalHeight} px · ${boulders.length} obstacles · ${report.regions.length} regions).`,
          lastError: null,
          lastUpdated: new Date().toISOString()
        };

        this.currentSession = finalSession;
        this.sessionCache.set(cacheKey, finalSession);
        this.logDiagnostic(
          'success',
          'ANALYSIS_COMPLETE',
          `Completed ${resolvedFileName}: ${boulders.length} obstacles, ${report.regions.length} regions, ${dynamicTargets.length} targets.`
        );
        this.notifyListeners();
        return this.currentSession;
      } catch (err: any) {
        if (controller.signal.aborted || err?.name === 'AbortError' || this.currentSeq !== seq) {
          return this.currentSession;
        }
        const msg = err?.message || 'Unable to analyze active surface image.';
        this.setAnalysisStatus('failed', msg, msg);
        return this.currentSession;
      } finally {
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, taskPromise);
    return taskPromise;
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentSession);
      } catch (err: any) {
        console.error('[EXPLORATION_SYNC] Listener error:', err);
      }
    });
  }
}

export const sharedExplorationStore = new SharedExplorationStore();
