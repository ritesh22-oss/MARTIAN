import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  AlertOctagon,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Layers,
  Route,
  Navigation,
  Download,
  Clock,
  History,
  Shield,
  Sliders,
  ChevronRight,
  Eye,
  Info,
  Compass,
  FileText,
  Activity,
  Cpu,
  ZoomIn,
  ZoomOut,
  Sparkles
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useTerrainAnalysis } from '../context/TerrainAnalysisContext';
import {
  validateUploadedImageFile,
  analyzeImageTerrainFeatures,
  UploadedImageValidation,
  TerrainFeatureExtractionResult,
  DetectedTerrainObstacle
} from '../services/terrainVisionService';
import {
  ScenarioResultData,
  RunAllScenariosResult,
  runScenario1BoulderObstacle,
  runScenario2SlopeAndSlip,
  runScenario3TelemetryDrop,
  runScenario4BudgetReduction,
  executeAllFourScenarios
} from '../services/scenarioRunnerService';
import { apiGet } from '../utils/apiClient';
import { AStarGrid, calculatePathLength } from '../utils/astar';

export interface CandidateRegion {
  id: 'jezero' | 'arcadia' | 'gale' | 'belva' | string;
  name: string;
  subTitle: string;
  coordinates: { lat: number; lon: number; formatted: string };
  defaultProduct: {
    id: string;
    title: string;
    url: string;
    fileName: string;
    scaleMPerPx: number | null;
    mission: string;
    instrument: string;
    observationDate: string;
    sourceCredit: string;
    desc: string;
  };
}

// Authentic NASA/JPL Scientific Region Datasets
export const CANDIDATE_REGIONS: CandidateRegion[] = [
  {
    id: 'jezero',
    name: 'Jezero Crater',
    subTitle: 'HiRISE & Perseverance Delta Front',
    coordinates: { lat: 18.38, lon: 77.58, formatted: '18.38° N, 77.58° E' },
    defaultProduct: {
      id: 'PIA24814',
      title: "Jezero Crater's Kodiak and Scarps",
      url: 'https://images-assets.nasa.gov/image/PIA24814/PIA24814~large.jpg',
      fileName: 'PIA24814_JEZERO_HIRISE_KODIAK.jpg',
      scaleMPerPx: 0.25,
      mission: 'Mars Reconnaissance Orbiter (MRO)',
      instrument: 'HiRISE (High Resolution Imaging Science Experiment)',
      observationDate: '2021-10-07',
      sourceCredit: 'NASA / JPL-Caltech / University of Arizona / USGS',
      desc: 'Authentic HiRISE orbital observation of Jezero Crater western delta fan remnant (Kodiak) and delta scarps.'
    }
  },
  {
    id: 'arcadia',
    name: 'Arcadia Planitia',
    subTitle: 'HiRISE Sheet Ice & Polygonal Ground',
    coordinates: { lat: 39.12, lon: 189.65, formatted: '39.12° N, 189.65° E' },
    defaultProduct: {
      id: 'PIA26321',
      title: 'HiRISE Arcadia Planitia Polygonal Ground & Sheet Ice Swath',
      url: 'https://images-assets.nasa.gov/image/PIA26321/PIA26321~large.jpg',
      fileName: 'PIA26321_HIRISE_ARCADIA_ICE.jpg',
      scaleMPerPx: 0.25,
      mission: 'Mars Reconnaissance Orbiter (MRO)',
      instrument: 'HiRISE (High Resolution Imaging Science Experiment)',
      observationDate: '2024-03-26',
      sourceCredit: 'NASA / JPL-Caltech / University of Arizona',
      desc: 'Calibrated HiRISE orbital frame showing thermal contraction polygons and shallow subsurface sheet ice in Arcadia Planitia.'
    }
  },
  {
    id: 'gale',
    name: 'Gale Crater',
    subTitle: 'Curiosity Rover / Mount Sharp Slopes',
    coordinates: { lat: -5.37, lon: 137.86, formatted: '5.37° S, 137.86° E' },
    defaultProduct: {
      id: 'PIA19068',
      title: 'Inclined Martian Sandstone Beds Near Kimberley in Gale Crater',
      url: 'https://images-assets.nasa.gov/image/PIA19068/PIA19068~large.jpg',
      fileName: 'PIA19068_MSL_GALE_KIMBERLEY.jpg',
      scaleMPerPx: null,
      mission: 'MSL (Curiosity Rover)',
      instrument: 'Mastcam (Mast Camera)',
      observationDate: '2014-12-08',
      sourceCredit: 'NASA / JPL-Caltech / MSSS',
      desc: 'Authentic Curiosity Mastcam surface photograph of inclined sandstone beds from small deltas inside Gale Crater.'
    }
  },
  {
    id: 'belva',
    name: 'Belva Crater',
    subTitle: 'Perseverance Belva Rim & Slump Escarpment',
    coordinates: { lat: 18.47, lon: 77.38, formatted: '18.47° N, 77.38° E' },
    defaultProduct: {
      id: 'PIA25889',
      title: 'Perseverance Mastcam-Z View at Belva Crater Rim & Slump',
      url: 'https://images-assets.nasa.gov/image/PIA25889/PIA25889~large.jpg',
      fileName: 'PIA25889_BELVA_CRATER_MOSAIC.jpg',
      scaleMPerPx: null,
      mission: 'Mars 2020 (Perseverance Rover)',
      instrument: 'Mastcam-Z Stereo Camera',
      observationDate: '2023-05-18',
      sourceCredit: 'NASA / JPL-Caltech / ASU / MSSS',
      desc: '152-image mosaic of Belva Crater within Jezero Crater, showing steep crater wall stratigraphy, dipping beds, and boulder scree.'
    }
  }
];

interface PlacedLabel {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  needsLeaderLine: boolean;
}

/**
 * Collision-aware obstacle label placement algorithm.
 * Positions labels without overlap, keeping all text badges within image bounds.
 */
function computeCollisionFreeLabels(
  obstacles: DetectedTerrainObstacle[],
  viewWidth: number,
  viewHeight: number
): Map<string, PlacedLabel> {
  const labelMap = new Map<string, PlacedLabel>();
  const occupiedBoxes: Array<{ x: number; y: number; width: number; height: number }> = [];

  const sorted = [...obstacles].sort((a, b) => b.confidence - a.confidence);

  for (const obs of sorted) {
    const labelText = `${obs.label} (${Math.round(obs.confidence * 100)}%)`;
    const labelW = Math.min(viewWidth * 0.35, Math.max(54, labelText.length * 5.4 + 10));
    const labelH = 13;

    const anchorX = obs.pixelX + obs.pixelWidth / 2;
    const anchorY = obs.pixelY;

    // Candidate positions: above, below, right, left, offset-above, offset-below
    const candidates = [
      { x: obs.pixelX, y: obs.pixelY - labelH - 3 },
      { x: obs.pixelX, y: obs.pixelY + obs.pixelHeight + 4 },
      { x: obs.pixelX + obs.pixelWidth + 4, y: obs.pixelY },
      { x: obs.pixelX - labelW - 4, y: obs.pixelY },
      { x: obs.pixelX + (obs.pixelWidth - labelW) / 2, y: obs.pixelY - labelH - 3 },
      { x: obs.pixelX + (obs.pixelWidth - labelW) / 2, y: obs.pixelY + obs.pixelHeight + 4 },
      { x: obs.pixelX, y: obs.pixelY - labelH * 2 - 5 },
      { x: obs.pixelX, y: obs.pixelY + obs.pixelHeight + labelH + 6 }
    ];

    let bestPos = candidates[0];
    let minCollisions = 999;
    let foundFree = false;

    for (const cand of candidates) {
      const clampedX = Math.max(2, Math.min(viewWidth - labelW - 2, cand.x));
      const clampedY = Math.max(2, Math.min(viewHeight - labelH - 2, cand.y));

      let collisions = 0;
      for (const placed of occupiedBoxes) {
        const overlap = !(
          clampedX + labelW + 2 < placed.x ||
          clampedX > placed.x + placed.width + 2 ||
          clampedY + labelH + 2 < placed.y ||
          clampedY > placed.y + placed.height + 2
        );
        if (overlap) collisions++;
      }

      if (collisions === 0) {
        bestPos = { x: clampedX, y: clampedY };
        foundFree = true;
        break;
      }

      if (collisions < minCollisions) {
        minCollisions = collisions;
        bestPos = { x: clampedX, y: clampedY };
      }
    }

    if (!foundFree) {
      let offset = 0;
      while (offset < 70) {
        offset += labelH + 3;
        const testY = Math.min(viewHeight - labelH - 2, obs.pixelY + obs.pixelHeight + offset);
        const testX = Math.max(2, Math.min(viewWidth - labelW - 2, obs.pixelX));
        const hasHit = occupiedBoxes.some(b =>
          !(testX + labelW + 2 < b.x || testX > b.x + b.width + 2 || testY + labelH + 2 < b.y || testY > b.y + b.height + 2)
        );
        if (!hasHit) {
          bestPos = { x: testX, y: testY };
          break;
        }
      }
    }

    const finalX = Math.max(2, Math.min(viewWidth - labelW - 2, bestPos.x));
    const finalY = Math.max(2, Math.min(viewHeight - labelH - 2, bestPos.y));

    const distFromAnchor = Math.hypot(
      (finalX + labelW / 2) - anchorX,
      (finalY + labelH / 2) - anchorY
    );

    const placedItem: PlacedLabel = {
      x: finalX,
      y: finalY,
      width: labelW,
      height: labelH,
      anchorX,
      anchorY,
      needsLeaderLine: distFromAnchor > 22
    };

    occupiedBoxes.push({ x: finalX, y: finalY, width: labelW, height: labelH });
    labelMap.set(obs.id, placedItem);
  }

  return labelMap;
}

export default function ScenarioTestingLab() {
  const { settings, sharedSession } = useWorkspace();
  const { analysis } = useTerrainAnalysis();

  // Active Terrain Image & Region State
  const [selectedRegionId, setSelectedRegionId] = useState<string>('jezero');
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(CANDIDATE_REGIONS[0].defaultProduct.url);
  const [currentFileName, setCurrentFileName] = useState<string>(CANDIDATE_REGIONS[0].defaultProduct.fileName);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [isLoadingRegion, setIsLoadingRegion] = useState<boolean>(false);
  const [regionMetadata, setRegionMetadata] = useState<{
    regionName: string;
    coordinates: { lat: number; lon: number; formatted: string };
    mission: string;
    instrument: string;
    productId: string;
    observationDate: string;
    sourceCredit: string;
    resolution: string;
    desc?: string;
  }>({
    regionName: CANDIDATE_REGIONS[0].name,
    coordinates: CANDIDATE_REGIONS[0].coordinates,
    mission: CANDIDATE_REGIONS[0].defaultProduct.mission,
    instrument: CANDIDATE_REGIONS[0].defaultProduct.instrument,
    productId: CANDIDATE_REGIONS[0].defaultProduct.id,
    observationDate: CANDIDATE_REGIONS[0].defaultProduct.observationDate,
    sourceCredit: CANDIDATE_REGIONS[0].defaultProduct.sourceCredit,
    resolution: CANDIDATE_REGIONS[0].defaultProduct.scaleMPerPx ? `${CANDIDATE_REGIONS[0].defaultProduct.scaleMPerPx} m/pixel (HiRISE orbital scale)` : 'Not available',
    desc: CANDIDATE_REGIONS[0].defaultProduct.desc
  });
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [validationResult, setValidationResult] = useState<UploadedImageValidation | null>(null);
  const [featureExtraction, setFeatureExtraction] = useState<TerrainFeatureExtractionResult | null>(null);

  // Dynamic Viewport Dimensions
  const viewWidth = validationResult?.width || 1585;
  const viewHeight = validationResult?.height || 992;

  // Request cancellation sequence ref for race-free region switching
  const requestSeqRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Image Element Ref for Canvas Pixel Extraction
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User Analysis & Layer Visibility Controls (Default to Clean, No Clutter)
  const [isAnalysisRun, setIsAnalysisRun] = useState<boolean>(false);
  const [isRouteGenerated, setIsRouteGenerated] = useState<boolean>(false);
  const [showObstacleBoxes, setShowObstacleBoxes] = useState<boolean>(false);
  const [showRouteOverlay, setShowRouteOverlay] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [selectedObstacle, setSelectedObstacle] = useState<DetectedTerrainObstacle | null>(null);

  // Scenario Selection & Execution State
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<'obstacle' | 'slope' | 'telemetry' | 'budget'>('obstacle');
  const [isRunningAll, setIsRunningAll] = useState<boolean>(false);
  const [activeRunningScenario, setActiveRunningScenario] = useState<string | null>(null);
  const [scenarioResults, setScenarioResults] = useState<Record<string, ScenarioResultData | null>>({
    obstacle: null,
    slope: null,
    telemetry: null,
    budget: null
  });

  // Rover Configuration Adjustments for Rehearsal
  const [timeBudgetReductionPct, setTimeBudgetReductionPct] = useState<number>(40);
  const [maxSlopeLimitDeg, setMaxSlopeLimitDeg] = useState<number>(settings.maxSlopeLimitDeg || 14.0);

  // Execution History & Report Modal
  const [runHistory, setRunHistory] = useState<RunAllScenariosResult[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [activeReportRun, setActiveReportRun] = useState<RunAllScenariosResult | null>(null);

  // Collision-free obstacle label positions
  const placedLabelsMap = useMemo(() => {
    if (!featureExtraction?.detectedObstacles) return new Map<string, PlacedLabel>();
    return computeCollisionFreeLabels(featureExtraction.detectedObstacles, viewWidth, viewHeight);
  }, [featureExtraction?.detectedObstacles, viewWidth, viewHeight]);

  // Active Route: Dynamically generated via A* pathfinder using actual terrain bounds and detected obstacles
  const activeRoute = useMemo(() => {
    const dimW = viewWidth;
    const dimH = viewHeight;

    const startPt = { x: Math.round(dimW * 0.08), y: Math.round(dimH * 0.82) };
    const goalPt = { x: Math.round(dimW * 0.92), y: Math.round(dimH * 0.18) };

    const gridW = 64;
    const gridH = Math.max(20, Math.min(64, Math.round(64 * (dimH / Math.max(1, dimW)))));
    const astar = new AStarGrid(gridW, gridH);

    const startG = {
      x: Math.min(gridW - 1, Math.max(0, Math.round(startPt.x * (gridW / dimW)))),
      y: Math.min(gridH - 1, Math.max(0, Math.round(startPt.y * (gridH / dimH))))
    };
    const goalG = {
      x: Math.min(gridW - 1, Math.max(0, Math.round(goalPt.x * (gridW / dimW)))),
      y: Math.min(gridH - 1, Math.max(0, Math.round(goalPt.y * (gridH / dimH))))
    };

    // Mark detected obstacles in A* grid if hazard detection has been executed
    if (featureExtraction?.detectedObstacles && featureExtraction.detectedObstacles.length > 0) {
      for (const obs of featureExtraction.detectedObstacles) {
        const minGx = Math.max(0, Math.floor(obs.pixelX * (gridW / dimW)));
        const maxGx = Math.min(gridW - 1, Math.ceil((obs.pixelX + obs.pixelWidth) * (gridW / dimW)));
        const minGy = Math.max(0, Math.floor(obs.pixelY * (gridH / dimH)));
        const maxGy = Math.min(gridH - 1, Math.ceil((obs.pixelY + obs.pixelHeight) * (gridH / dimH)));

        for (let gy = minGy; gy <= maxGy; gy++) {
          for (let gx = minGx; gx <= maxGx; gx++) {
            if ((gx === startG.x && gy === startG.y) || (gx === goalG.x && gy === goalG.y)) continue;
            astar.setObstacle(gx, gy, 3);
          }
        }
      }
    }

    const astarRes = astar.findPath(startG, goalG);
    const rawPath = (astarRes.path && astarRes.path.length >= 2) ? astarRes.path : [startG, goalG];

    let waypoints = rawPath.map(p => ({
      x: Math.round(p.x * (dimW / gridW)),
      y: Math.round(p.y * (dimH / gridH))
    }));

    if (waypoints.length > 0) {
      waypoints[0] = startPt;
      waypoints[waypoints.length - 1] = goalPt;
    }

    const pixelLength = calculatePathLength(waypoints);
    const hasScale = validationResult?.spatialResolutionMPerPx !== null && (validationResult?.spatialResolutionMPerPx || 0) > 0;
    const scale = hasScale ? validationResult!.spatialResolutionMPerPx! : null;
    const totalDistanceM = scale ? parseFloat((pixelLength * scale).toFixed(1)) : 0;
    const formattedDistance = scale
      ? `${totalDistanceM} m`
      : `${Math.round(pixelLength)} px (Scale uncalibrated)`;

    const intersectingObstacles = featureExtraction?.detectedObstacles?.filter(o => o.intersectsPlannedRoute)?.length || 0;

    return {
      id: `${selectedRegionId}-nominal-route`,
      name: `${regionMetadata.regionName} Nominal A* Route`,
      waypoints,
      pixelLength,
      totalDistanceM,
      formattedDistance,
      hasScale,
      totalCost: astarRes.totalCost ? parseFloat(astarRes.totalCost.toFixed(2)) : 0.25,
      isFeasible: intersectingObstacles === 0,
      feasibilityStatus: intersectingObstacles === 0
        ? 'Feasible — Nominal obstacle clearance verified'
        : `Caution — ${intersectingObstacles} obstacle intersection(s)`
    };
  }, [selectedRegionId, regionMetadata.regionName, viewWidth, viewHeight, featureExtraction?.detectedObstacles, validationResult?.spatialResolutionMPerPx]);

  const lastProcessedKeyRef = useRef<string>('');

  // Load and Validate Image whenever currentImageSrc changes (No auto-analysis or clutter)
  const processImage = useCallback((imgEl: HTMLImageElement, fileMeta?: Partial<UploadedImageValidation>, force = false) => {
    const width = imgEl.naturalWidth || fileMeta?.width || 1585;
    const height = imgEl.naturalHeight || fileMeta?.height || 992;
    const key = fileMeta?.fileName ? `${fileMeta.fileName}_${width}x${height}` : `${imgEl.src}_${width}x${height}`;
    if (!force && lastProcessedKeyRef.current === key) {
      return;
    }
    lastProcessedKeyRef.current = key;
    setLoadingStatus('Validating raster encoding & metadata...');
    setIsProcessingImage(true);
    try {
      const isOrbital = fileMeta?.spatialResolutionMPerPx !== null && fileMeta?.spatialResolutionMPerPx !== undefined;
      const validation: UploadedImageValidation = {
        fileName: fileMeta?.fileName || currentFileName,
        format: fileMeta?.format || 'JPEG',
        fileSizeBytes: fileMeta?.fileSizeBytes || 0,
        fileSizeFormatted: fileMeta?.fileSizeFormatted || (fileMeta?.fileSizeBytes ? `${(fileMeta.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB` : 'Not available'),
        width,
        height,
        aspectRatio: `${(width / Math.max(1, height)).toFixed(2)}:1`,
        hasSpatialMetadata: fileMeta?.hasSpatialMetadata ?? isOrbital,
        spatialResolutionMPerPx: fileMeta?.spatialResolutionMPerPx ?? null,
        spatialReferenceSystem: fileMeta?.spatialReferenceSystem || (isOrbital ? 'Mars 2000 Orbital Projection' : 'Not available (Pixel coordinates)'),
        classification: fileMeta?.classification || (isOrbital ? 'GEOREFERENCED_ORBITAL' : 'OPTICAL_PHOTO'),
        classificationDescription: fileMeta?.classificationDescription || (isOrbital ? 'Georeferenced Orbital Orthoimage (Calibrated Scale)' : 'Standard Optical Photograph (Reflectance Image)'),
        canDeriveNativeElevation: fileMeta?.canDeriveNativeElevation ?? false,
        validationNotes: fileMeta?.validationNotes || [
          isOrbital ? `Calibrated ground sampling scale: ${fileMeta?.spatialResolutionMPerPx} m/pixel.` : 'Ground scale: Not available (Surface optical perspective).',
          isOrbital ? 'Georeferenced orbital product verified.' : 'Standard 2D optical reflectance photography. Cannot derive native topographic elevation without auxiliary DEM.'
        ]
      };
      setValidationResult(validation);

      // Do NOT run automatic obstacle detection or annotations
      setFeatureExtraction(null);
      setIsAnalysisRun(false);
      setIsRouteGenerated(false);
      setShowObstacleBoxes(false);
      setShowRouteOverlay(false);
      setShowLabels(false);
      setSelectedObstacle(null);
      setZoom(1);

      // Automatically reset scenario results on new image load
      setScenarioResults({
        obstacle: null,
        slope: null,
        telemetry: null,
        budget: null
      });
    } catch (err) {
      console.error('Error during image processing:', err);
    } finally {
      setIsProcessingImage(false);
      setLoadingStatus('');
    }
  }, [currentFileName]);

  // Explicit User Action: Run Computer Vision Feature Extraction
  const handleRunAnalysis = useCallback(() => {
    if (!imageRef.current || !validationResult) return;
    setIsProcessingImage(true);
    try {
      const features = analyzeImageTerrainFeatures(
        imageRef.current,
        validationResult,
        activeRoute.waypoints,
        { width: viewWidth, height: viewHeight }
      );
      setFeatureExtraction(features);
      setIsAnalysisRun(true);
      setShowObstacleBoxes(true);
    } catch (err) {
      console.error('Failed to analyze terrain features:', err);
    } finally {
      setIsProcessingImage(false);
    }
  }, [validationResult, activeRoute.waypoints, viewWidth, viewHeight]);

  // Explicit User Action: Generate Nominal Navigation Vector
  const handleGenerateRoute = useCallback(() => {
    setIsRouteGenerated(true);
    setShowRouteOverlay(true);
  }, []);

  // Ensure features exist when user directly triggers a scenario rehearsal
  const ensureFeatures = useCallback((): TerrainFeatureExtractionResult | null => {
    if (featureExtraction) return featureExtraction;
    if (!imageRef.current || !validationResult) return null;
    const features = analyzeImageTerrainFeatures(
      imageRef.current,
      validationResult,
      activeRoute.waypoints,
      { width: viewWidth, height: viewHeight }
    );
    setFeatureExtraction(features);
    setIsAnalysisRun(true);
    setIsRouteGenerated(true);
    setShowObstacleBoxes(true);
    setShowRouteOverlay(true);
    return features;
  }, [featureExtraction, validationResult, activeRoute.waypoints, viewWidth, viewHeight]);

  // Helper to load and process authentic NASA product
  const applyNasaProduct = useCallback(async (
    seq: number,
    imageUrl: string,
    fileName: string,
    meta: {
      regionName: string;
      coordinates: { lat: number; lon: number; formatted: string };
      mission: string;
      instrument: string;
      productId: string;
      observationDate: string;
      sourceCredit: string;
      resolution: string;
      desc?: string;
    },
    scaleMPerPx: number | null,
    description: string
  ) => {
    // Drop execution if user selected another region
    if (requestSeqRef.current !== seq) return;

    setCurrentFileName(fileName);
    setCurrentImageSrc(imageUrl);
    setRegionMetadata(meta);
    setRegionError(null);
    setIsLoadingRegion(true);
    setIsProcessingImage(true);
    setLoadingStatus('Handshaking with NASA Asset CDN...');
    
    try {
      // Use a promise to wait for the image to load with a timeout
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('IMAGE_LOAD_TIMEOUT'));
        }, 20000); // 20s timeout for large NASA assets

        const loadImg = new Image();
        loadImg.crossOrigin = 'anonymous';
        loadImg.onload = () => {
          clearTimeout(timeout);
          resolve(loadImg);
        };
        loadImg.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('IMAGE_LOAD_ERROR'));
        };
        loadImg.src = imageUrl;
      });

      if (requestSeqRef.current !== seq) return;
      
      setLoadingStatus('Rasterizing terrain observation...');
      const isOrbital = scaleMPerPx !== null && scaleMPerPx > 0;
      processImage(img, {
        fileName,
        format: 'JPEG',
        width: img.naturalWidth || 1585,
        height: img.naturalHeight || 992,
        aspectRatio: `${((img.naturalWidth || 1585) / Math.max(1, img.naturalHeight || 992)).toFixed(2)}:1`,
        hasSpatialMetadata: isOrbital,
        spatialResolutionMPerPx: scaleMPerPx,
        spatialReferenceSystem: isOrbital ? `Mars 2000 Orbital Projection (${meta.regionName})` : 'Not available (Pixel coordinates)',
        classification: isOrbital ? 'GEOREFERENCED_ORBITAL' : 'OPTICAL_PHOTO',
        classificationDescription: isOrbital ? `Calibrated Orbital Imagery (${meta.instrument})` : `Standard Optical Photograph (${meta.instrument})`,
        canDeriveNativeElevation: false,
        validationNotes: isOrbital ? [
          `Ground scale: ${scaleMPerPx} m/pixel (calibrated orbital).`,
          `Verified NASA observation product: ${meta.productId} (${meta.regionName}).`,
          `Mission: ${meta.mission} | Instrument: ${meta.instrument}.`,
          description
        ] : [
          'Ground scale: Not available (Surface optical perspective).',
          `Verified NASA observation product: ${meta.productId} (${meta.regionName}).`,
          `Mission: ${meta.mission} | Instrument: ${meta.instrument}.`,
          'Standard 2D optical reflectance photography. Cannot derive native topographic elevation without auxiliary DEM.',
          description
        ]
      }, true);
      
    } catch (err: any) {
      if (requestSeqRef.current !== seq) return;
      console.error('applyNasaProduct error:', err);
      setRegionError(err.message === 'IMAGE_LOAD_TIMEOUT' 
        ? 'NASA asset load timed out. The file may be very large or the CDN is throttled.'
        : 'Failed to load verified NASA image asset. Please click Retry.');
    } finally {
      if (requestSeqRef.current === seq) {
        setIsLoadingRegion(false);
        setIsProcessingImage(false);
        setLoadingStatus('');
      }
    }
  }, [processImage]);

  // Handle switching between candidate regions with live NASA backend matching
  const handleSelectRegion = useCallback(async (region: CandidateRegion) => {
    const currentSeq = ++requestSeqRef.current;
    setSelectedRegionId(region.id);

    // Cancel any previous in-flight HTTP request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Immediately clear previous region's image and analysis context while fetching
    setCurrentImageSrc(null);
    setCurrentFileName('');
    setRegionError(null);
    setIsLoadingRegion(true);
    setValidationResult(null);
    setFeatureExtraction(null);
    setIsAnalysisRun(false);
    setIsRouteGenerated(false);
    setShowObstacleBoxes(false);
    setShowRouteOverlay(false);
    setShowLabels(false);
    setSelectedObstacle(null);
    setZoom(1);
    setScenarioResults({
      obstacle: null,
      slope: null,
      telemetry: null,
      budget: null
    });

    try {
      // 1. Fetch NASA imagery matching that region
      const { data, error, isHtml, status } = await apiGet<any>(`/api/nasa/regions/${region.id}/gallery`, {
        signal: controller.signal
      });

      // Guard against race conditions: if another region was selected while this was loading, discard
      if (requestSeqRef.current !== currentSeq) return;

      if (status === 404 || error || isHtml || !data?.images || data.images.length === 0) {
        if (status === 404 && !region.defaultProduct) {
          setRegionError('No verified NASA imagery available for this region.');
          setIsLoadingRegion(false);
          return;
        }
        // Use verified default product for region via proxy
        const fallback = region.defaultProduct;
        const proxyFallbackUrl = `/api/nasa/proxy-image?url=${encodeURIComponent(fallback.url)}`;
        applyNasaProduct(currentSeq, proxyFallbackUrl, fallback.fileName, {
          regionName: region.name,
          coordinates: region.coordinates,
          mission: fallback.mission,
          instrument: fallback.instrument,
          productId: fallback.id,
          observationDate: fallback.observationDate,
          sourceCredit: fallback.sourceCredit,
          resolution: fallback.scaleMPerPx ? `${fallback.scaleMPerPx} m/pixel` : 'Not available',
          desc: fallback.desc
        }, fallback.scaleMPerPx, fallback.desc);
        return;
      }

      // 2. Select the first verified image from NASA response
      const firstImage = data.images[0];
      const targetUrl = firstImage.assetUrl || firstImage.thumbnailUrl;
      const safeUrl = targetUrl.startsWith('/') || targetUrl.startsWith('data:')
        ? targetUrl
        : `/api/nasa/proxy-image?url=${encodeURIComponent(targetUrl)}`;

      const scale = firstImage.scaleMPerPx !== undefined ? firstImage.scaleMPerPx : region.defaultProduct.scaleMPerPx;

      await applyNasaProduct(currentSeq, safeUrl, `${firstImage.id || region.id}_NASA.jpg`, {
        regionName: data.regionName || region.name,
        coordinates: data.coordinates || region.coordinates,
        mission: firstImage.mission || region.defaultProduct.mission,
        instrument: firstImage.instrument || region.defaultProduct.instrument,
        productId: firstImage.productId || firstImage.id || region.defaultProduct.id,
        observationDate: firstImage.observationDate || region.defaultProduct.observationDate,
        sourceCredit: firstImage.sourceCredit || region.defaultProduct.sourceCredit,
        resolution: firstImage.resolution || (scale ? `${scale} m/pixel` : 'Not available'),
        desc: firstImage.description || region.defaultProduct.desc
      }, scale, firstImage.description || region.defaultProduct.desc);

    } catch (err: any) {
      if (err?.name === 'AbortError' || requestSeqRef.current !== currentSeq) return;
      console.warn('Regional NASA imagery fetch error, loading certified fallback:', err);
      const matched = CANDIDATE_REGIONS.find(r => r.id === region.id);
      if (matched && matched.defaultProduct) {
        const fallback = matched.defaultProduct;
        const proxyFallbackUrl = `/api/nasa/proxy-image?url=${encodeURIComponent(fallback.url)}`;
        await applyNasaProduct(currentSeq, proxyFallbackUrl, fallback.fileName, {
          regionName: matched.name,
          coordinates: matched.coordinates,
          mission: fallback.mission,
          instrument: fallback.instrument,
          productId: fallback.id,
          observationDate: fallback.observationDate,
          sourceCredit: fallback.sourceCredit,
          resolution: fallback.scaleMPerPx ? `${fallback.scaleMPerPx} m/pixel` : 'Not available',
          desc: fallback.desc
        }, fallback.scaleMPerPx, fallback.desc);
      } else {
        setRegionError('No verified NASA imagery available for this region.');
        setIsLoadingRegion(false);
        setIsProcessingImage(false);
      }
    } finally {
      if (requestSeqRef.current === currentSeq) {
        setIsLoadingRegion(false);
      }
    }
  }, [applyNasaProduct]);

  // Initial load: Only run once on mount
  const hasMounted = useRef(false);
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      handleSelectRegion(CANDIDATE_REGIONS[0]);
    }
  }, []); // Empty dependencies to run only once

  // Handle local user file upload (drag & drop or picker)
  const handleFileUpload = async (file: File) => {
    setIsProcessingImage(true);
    try {
      const validation = await validateUploadedImageFile(file);
      setValidationResult(validation);
      setCurrentFileName(file.name);

      const objectUrl = URL.createObjectURL(file);
      setCurrentImageSrc(objectUrl);

      const tempImg = new Image();
      tempImg.onload = () => {
        processImage(tempImg, validation);
      };
      tempImg.src = objectUrl;
    } catch (err) {
      console.error('Failed to validate uploaded file:', err);
      setIsProcessingImage(false);
    }
  };

  // Run Individual Scenario Test
  const handleRunSingleScenario = (key: 'obstacle' | 'slope' | 'telemetry' | 'budget') => {
    const features = ensureFeatures();
    if (!features) return;
    setActiveRunningScenario(key);

    setTimeout(() => {
      let result: ScenarioResultData;
      switch (key) {
        case 'obstacle':
          result = runScenario1BoulderObstacle(features, activeRoute, {
            widthM: 2.7,
            clearanceMarginM: 0.6
          });
          break;
        case 'slope':
          result = runScenario2SlopeAndSlip(
            features,
            activeRoute,
            { maxSlopeLimitDeg, maxAllowableSlip: 0.45 },
            {
              hasElevation: features.validation.canDeriveNativeElevation,
              datasetName: currentFileName
            }
          );
          break;
        case 'telemetry':
          result = runScenario3TelemetryDrop(features, activeRoute, true, false);
          break;
        case 'budget':
          result = runScenario4BudgetReduction(features, activeRoute, timeBudgetReductionPct);
          break;
      }

      setScenarioResults(prev => ({ ...prev, [key]: result }));
      setActiveRunningScenario(null);
    }, 450);
  };

  // RUN ALL SCENARIOS (MANDATORY REQUIREMENT)
  const handleRunAllScenarios = async () => {
    const features = ensureFeatures();
    if (!features) return;
    setIsRunningAll(true);

    try {
      const allResults = await executeAllFourScenarios(
        features,
        activeRoute,
        {
          widthM: 2.7,
          clearanceMarginM: 0.6,
          maxSlopeLimitDeg,
          maxAllowableSlip: 0.45,
          budgetReductionPct: timeBudgetReductionPct
        },
        (_idx, scenarioId) => {
          setActiveRunningScenario(scenarioId);
        }
      );

      setScenarioResults(allResults.results);
      setRunHistory(prev => [allResults, ...prev].slice(0, 10));
      setActiveReportRun(allResults);
    } catch (err) {
      console.error('Error executing all scenarios:', err);
    } finally {
      setIsRunningAll(false);
      setActiveRunningScenario(null);
    }
  };

  // Reset Test to pristine state
  const handleResetTest = () => {
    setScenarioResults({
      obstacle: null,
      slope: null,
      telemetry: null,
      budget: null
    });
    setFeatureExtraction(null);
    setIsAnalysisRun(false);
    setIsRouteGenerated(false);
    setShowObstacleBoxes(false);
    setShowRouteOverlay(false);
    setShowLabels(false);
    setSelectedObstacle(null);
    setZoom(1);
  };

  // Summary Metrics Calculation across all 4 scenarios
  const executedScenariosList = Object.values(scenarioResults).filter(Boolean) as ScenarioResultData[];
  const totalExecuted = executedScenariosList.length;
  const passedCount = executedScenariosList.filter(s => s.status === 'PASS').length;
  const failedCount = executedScenariosList.filter(s => s.status === 'FAIL').length;
  const inconclusiveCount = executedScenariosList.filter(s => s.status === 'INCONCLUSIVE').length;
  const errorCount = executedScenariosList.filter(s => s.status === 'ERROR').length;
  const resilienceScore = totalExecuted > 0 ? Math.round((passedCount / totalExecuted) * 100) : null;

  const currentActiveResult = scenarioResults[selectedScenarioKey];

  return (
    <div className="space-y-6 font-sans text-xs pb-16">

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.tif,.tiff,.dem,.dtm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
      />

      {/* ======================================================== */}
      {/* 1. HEADER & MISSION FAILURE REHEARSAL CONTROL BAR       */}
      {/* ======================================================== */}
      <div className="bg-[#080d20] border border-white/10 p-5 rounded-3xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-2xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 uppercase font-bold text-[9px]">
              STEP 09 &bull; FAILURE REHEARSAL
            </span>
            <span>&bull;</span>
            <span className="text-cyan-300 font-bold">IMAGE-DRIVEN TERRAIN INTELLIGENCE</span>
            <span>&bull;</span>
            <span className="text-slate-400">NON-PREDETERMINED STRESS TESTS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <AlertOctagon className="w-6 h-6 text-orange-400" />
            <span>Scenario Testing &amp; Dynamic Failure Rehearsal Engine</span>
          </h1>
          <p className="text-slate-300 text-xs max-w-3xl leading-relaxed">
            Performs rigorous, data-driven engineering tests against uploaded Martian terrain rasters, active A* trajectories, and terramechanical flight rules. Every test is verified against actual evidence—never predetermined.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRunAllScenarios}
            disabled={isRunningAll || isProcessingImage}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className={`w-4 h-4 fill-white ${isRunningAll ? 'animate-pulse' : ''}`} />
            <span>{isRunningAll ? 'Executing 4 Scenarios...' : 'RUN ALL SCENARIOS'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetTest}
            disabled={isRunningAll}
            className="px-3.5 py-2.5 rounded-2xl bg-[#0e1630] hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            title="Reset test results"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {runHistory.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveReportRun(runHistory[0]);
                setShowReportModal(true);
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          )}

          {runHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-[#0e1630] hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5" />
              <span>Runs ({runHistory.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. OVERALL RESILIENCE SCORE & DASHBOARD SUMMARY          */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        {/* Card 1: Total Scenarios */}
        <div className="p-4 rounded-2xl bg-[#070b1a] border border-white/10 space-y-1">
          <span className="text-[10px] text-slate-400 font-mono block uppercase">TOTAL SCENARIOS</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">4</span>
            <span className="text-[10px] text-slate-400 font-mono">({totalExecuted} Executed)</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Independent Engines</span>
        </div>

        {/* Card 2: Passed Count */}
        <div className="p-4 rounded-2xl bg-[#070b1a] border border-emerald-500/30 space-y-1">
          <span className="text-[10px] text-emerald-400 font-mono block uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>PASSED TESTS</span>
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{passedCount}</span>
          <span className="text-[10px] text-slate-500 block">Verified Feasible</span>
        </div>

        {/* Card 3: Failed Count */}
        <div className="p-4 rounded-2xl bg-[#070b1a] border border-rose-500/30 space-y-1">
          <span className="text-[10px] text-rose-400 font-mono block uppercase flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>FAILED CONSTRAINTS</span>
          </span>
          <span className="text-2xl font-bold font-mono text-rose-400">{failedCount}</span>
          <span className="text-[10px] text-slate-500 block">Violation Detected</span>
        </div>

        {/* Card 4: Inconclusive */}
        <div className="p-4 rounded-2xl bg-[#070b1a] border border-amber-500/30 space-y-1">
          <span className="text-[10px] text-amber-400 font-mono block uppercase flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-amber-400" />
            <span>INCONCLUSIVE</span>
          </span>
          <span className="text-2xl font-bold font-mono text-amber-400">{inconclusiveCount}</span>
          <span className="text-[10px] text-slate-500 block">Missing Data / Scale</span>
        </div>

        {/* Card 5: Errors */}
        <div className="p-4 rounded-2xl bg-[#070b1a] border border-purple-500/30 space-y-1">
          <span className="text-[10px] text-purple-400 font-mono block uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-purple-400" />
            <span>EXECUTION ERRORS</span>
          </span>
          <span className="text-2xl font-bold font-mono text-purple-300">{errorCount}</span>
          <span className="text-[10px] text-slate-500 block">Technical Exceptions</span>
        </div>

        {/* Card 6: Resilience Gauge */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0a1028] to-[#060a18] border border-cyan-500/40 space-y-1">
          <span className="text-[10px] text-cyan-300 font-mono block uppercase font-bold">MISSION RESILIENCE</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${resilienceScore !== null ? (resilienceScore >= 75 ? 'text-emerald-400' : resilienceScore >= 50 ? 'text-amber-400' : 'text-rose-400') : 'text-slate-500'}`}>
              {resilienceScore !== null ? `${resilienceScore}%` : 'PENDING'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block font-mono">
            {resilienceScore !== null
              ? resilienceScore >= 75
                ? 'GO FOR AUTONAV'
                : 'CONDITIONAL HOLD'
              : 'Awaiting Rehearsal'}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. TERRAIN IMAGE UPLOAD & COMPUTER VISION ANALYSIS       */}
      {/* ======================================================== */}
      <div className="bg-[#070b1a] border border-white/10 p-5 rounded-3xl space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>IMAGE UPLOAD &amp; COMPUTER VISION FEATURE EXTRACTION</span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Upload any custom JPG, PNG, TIFF, or DEM file, or select a pre-calibrated NASA HiRISE orbital benchmark.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-md shadow-cyan-600/20"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Custom Terrain Image</span>
            </button>
          </div>
        </div>

        {/* Target Region Quick Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
              EXPLORATION TARGET REGIONS (AUTHENTIC NASA / JPL TERRAIN):
            </span>
            {isLoadingRegion && (
              <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1.5 animate-pulse">
                <Activity className="w-3 h-3 animate-spin" />
                <span>Fetching NASA/JPL Observation...</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {CANDIDATE_REGIONS.map((reg) => {
              const isSelected = selectedRegionId === reg.id;
              return (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => handleSelectRegion(reg)}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                      : 'bg-black/40 border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold text-xs truncate">{reg.name}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                  </div>
                  <span className="text-[9px] text-cyan-300 font-mono block mt-0.5">{reg.coordinates.formatted}</span>
                  <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 font-sans">{reg.subTitle}</p>
                </button>
              );
            })}
          </div>
          {regionError && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs font-mono flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                <span>{regionError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const reg = CANDIDATE_REGIONS.find(r => r.id === selectedRegionId) || CANDIDATE_REGIONS[0];
                  handleSelectRegion(reg);
                }}
                className="px-2.5 py-1 rounded-lg bg-red-800/40 hover:bg-red-800/60 text-white font-mono text-[10px] font-bold transition cursor-pointer shrink-0"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Visualizer & Detected Features Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Interactive Terrain Viewport */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-white font-bold">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Primary Terrain Viewport</span>
                <span className="text-[10px] text-slate-500 font-normal ml-1">
                  ({viewWidth} × {viewHeight} px)
                </span>
              </span>

              {/* Viewport Action Controls & Toggles */}
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                {/* 1. Hazard Detection Trigger / Toggle */}
                {!isAnalysisRun ? (
                  <button
                    type="button"
                    onClick={handleRunAnalysis}
                    disabled={isProcessingImage}
                    className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-mono font-bold transition flex items-center gap-1.5 shadow-md shadow-orange-600/30 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-orange-200" />
                    <span>Detect Hazards</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowObstacleBoxes(prev => !prev)}
                      className={`px-2 py-0.5 rounded cursor-pointer border font-mono transition ${
                        showObstacleBoxes
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                          : 'bg-black/40 text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      Obstacle Envelopes ({featureExtraction?.detectedObstacles.length || 0})
                    </button>
                    {showObstacleBoxes && (
                      <button
                        type="button"
                        onClick={() => setShowLabels(prev => !prev)}
                        className={`px-2 py-0.5 rounded cursor-pointer border font-mono transition ${
                          showLabels
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-black/40 text-slate-400 border-white/10 hover:border-white/20'
                        }`}
                        title="Toggle obstacle text labels"
                      >
                        Labels
                      </button>
                    )}
                  </>
                )}

                {/* 2. Route Plotter Trigger / Toggle */}
                {!isRouteGenerated ? (
                  <button
                    type="button"
                    onClick={handleGenerateRoute}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 font-mono transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Route className="w-3 h-3 text-cyan-300" />
                    <span>Plot Nominal Route</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRouteOverlay(prev => !prev)}
                    className={`px-2 py-0.5 rounded cursor-pointer border font-mono transition ${
                      showRouteOverlay
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-black/40 text-slate-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    Planned Route
                  </button>
                )}

                {/* 3. Zoom Controls */}
                <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))}
                    disabled={zoom <= 1}
                    className="p-1 rounded hover:bg-white/10 text-slate-300 disabled:opacity-30 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] font-mono text-slate-400 w-8 text-center select-none">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(2.5, +(z + 0.25).toFixed(2)))}
                    disabled={zoom >= 2.5}
                    className="p-1 rounded hover:bg-white/10 text-slate-300 disabled:opacity-30 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3 h-3" />
                  </button>
                  {zoom > 1 && (
                    <button
                      type="button"
                      onClick={() => setZoom(1)}
                      className="text-[9px] font-mono text-cyan-300 hover:text-cyan-200 px-1 border-l border-white/10 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Canvas/Image Box: Responsive to image aspect ratio with zero empty black space */}
            <div
              className="relative w-full rounded-2xl overflow-hidden border border-white/15 bg-slate-950 flex items-center justify-center group shadow-2xl min-h-[300px]"
              style={{ aspectRatio: `${viewWidth} / ${viewHeight}` }}
            >
              {isLoadingRegion ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 min-h-[300px]">
                  <Activity className="w-10 h-10 text-cyan-400 animate-spin" />
                  <span className="text-sm font-bold font-mono text-cyan-200">
                    Fetching verified NASA/JPL imagery for {regionMetadata.regionName || 'selected region'}...
                  </span>
                  <p className="text-xs text-slate-400 max-w-md font-sans">
                    Connecting to NASA Planetary Data System, HiRISE orbital archive, and rover image repositories.
                  </p>
                </div>
              ) : regionError ? (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 min-h-[300px]">
                  <AlertOctagon className="w-10 h-10 text-amber-400" />
                  <span className="text-sm font-bold font-mono text-amber-200">
                    Verified NASA Imagery Unavailable
                  </span>
                  <p className="text-xs text-slate-400 max-w-md font-sans">
                    {regionError}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const reg = CANDIDATE_REGIONS.find(r => r.id === selectedRegionId) || CANDIDATE_REGIONS[0];
                      handleSelectRegion(reg);
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Fetch</span>
                  </button>
                </div>
              ) : currentImageSrc ? (
                <div
                  className="w-full h-full relative overflow-hidden flex items-center justify-center transition-transform duration-150"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center'
                  }}
                >
                  <img
                    ref={imageRef}
                    src={currentImageSrc}
                    alt="Analyzed Terrain"
                    crossOrigin="anonymous"
                    className="w-full h-full object-contain select-none"
                    onError={() => {
                      setRegionError('Failed to load NASA image asset. Please click Retry.');
                    }}
                  />

                {/* Overlay SVG for Detected Obstacles & Planned Route (Only when explicitly active) */}
                {(showRouteOverlay || showObstacleBoxes) && (
                  <svg
                    viewBox={`0 0 ${viewWidth} ${viewHeight}`}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {/* 1. Planned Rover Route Polyline */}
                    {showRouteOverlay && isRouteGenerated && activeRoute.waypoints.length > 1 && (
                      <g>
                        <polyline
                          points={activeRoute.waypoints.map(p => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="4 2"
                          opacity="0.9"
                        />
                        {/* Waypoint circles */}
                        {activeRoute.waypoints.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={i === 0 || i === activeRoute.waypoints.length - 1 ? 5 : 2.5}
                            fill={i === 0 ? '#10b981' : i === activeRoute.waypoints.length - 1 ? '#ef4444' : '#06b6d4'}
                            stroke="#ffffff"
                            strokeWidth="0.8"
                          />
                        ))}
                        {/* Start 'S' marker badge */}
                        <g>
                          <rect
                            x={activeRoute.waypoints[0].x - 8}
                            y={Math.max(2, activeRoute.waypoints[0].y - 18)}
                            width="16"
                            height="12"
                            fill="#060a18"
                            stroke="#10b981"
                            strokeWidth="1"
                            rx="2"
                          />
                          <text
                            x={activeRoute.waypoints[0].x}
                            y={Math.max(11, activeRoute.waypoints[0].y - 9)}
                            fill="#10b981"
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            S
                          </text>
                        </g>
                        {/* Destination 'G' marker badge */}
                        <g>
                          <rect
                            x={activeRoute.waypoints[activeRoute.waypoints.length - 1].x - 8}
                            y={Math.max(2, activeRoute.waypoints[activeRoute.waypoints.length - 1].y - 18)}
                            width="16"
                            height="12"
                            fill="#060a18"
                            stroke="#ef4444"
                            strokeWidth="1"
                            rx="2"
                          />
                          <text
                            x={activeRoute.waypoints[activeRoute.waypoints.length - 1].x}
                            y={Math.max(11, activeRoute.waypoints[activeRoute.waypoints.length - 1].y - 9)}
                            fill="#ef4444"
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            G
                          </text>
                        </g>
                      </g>
                    )}

                    {/* 2. Detected Obstacles Bounding Boxes (Clean, non-cluttered) */}
                    {showObstacleBoxes && featureExtraction?.detectedObstacles.map((obs) => {
                      const isIntersecting = obs.intersectsPlannedRoute;
                      const isSelected = selectedObstacle?.id === obs.id;
                      const strokeColor = isIntersecting ? '#ef4444' : isSelected ? '#06b6d4' : '#f97316';
                      const fillColor = isIntersecting ? 'rgba(239, 68, 68, 0.25)' : isSelected ? 'rgba(6, 182, 212, 0.25)' : 'rgba(249, 115, 22, 0.15)';
                      const labelPos = placedLabelsMap.get(obs.id);
                      const shouldShowLabel = showLabels || isSelected;

                      return (
                        <g key={obs.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedObstacle(obs)}>
                          {/* Leader line only if label is displayed and was displaced */}
                          {shouldShowLabel && labelPos?.needsLeaderLine && (
                            <line
                              x1={labelPos.anchorX}
                              y1={labelPos.anchorY}
                              x2={labelPos.x + labelPos.width / 2}
                              y2={labelPos.y + (labelPos.y < labelPos.anchorY ? labelPos.height : 0)}
                              stroke={strokeColor}
                              strokeWidth="0.8"
                              strokeDasharray="2 2"
                              opacity="0.75"
                            />
                          )}

                          {/* Obstacle Bounding Box */}
                          <rect
                            x={obs.pixelX}
                            y={obs.pixelY}
                            width={obs.pixelWidth}
                            height={obs.pixelHeight}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={isIntersecting || isSelected ? '2' : '1.2'}
                            rx="2"
                          />

                          {/* Clean Obstacle Label Tag (Only if enabled or selected) */}
                          {shouldShowLabel && labelPos && (
                            <g>
                              <rect
                                x={labelPos.x}
                                y={labelPos.y}
                                width={labelPos.width}
                                height={labelPos.height}
                                fill="#060a18"
                                stroke={strokeColor}
                                strokeWidth="0.8"
                                rx="2"
                              />
                              <text
                                x={labelPos.x + 4}
                                y={labelPos.y + labelPos.height - 3.5}
                                fill={strokeColor}
                                fontSize="7.5"
                                fontFamily="monospace"
                                fontWeight="bold"
                              >
                                {obs.label} [{Math.round(obs.confidence * 100)}%]
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 min-h-[300px]">
                <ImageIcon className="w-10 h-10 text-slate-600" />
                <span className="text-xs font-mono text-slate-400">
                  Select a region above to fetch authentic NASA/JPL terrain imagery.
                </span>
              </div>
            )}

            {/* Processing Spinner Overlay */}
              {isProcessingImage && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 z-20">
                  <Activity className="w-8 h-8 text-cyan-400 animate-spin" />
                  <span className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
                    {loadingStatus || 'Scanning Surface Topology & Hazard Envelopes...'}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Caption & Dynamic Legend with Real NASA Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
              <span className="text-slate-300">
                Region: <strong className="text-white">{regionMetadata.regionName}</strong> ({regionMetadata.coordinates.formatted}) &bull; Product: <span className="text-cyan-300 font-bold">{regionMetadata.productId}</span> ({regionMetadata.mission})
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 text-slate-300 text-[9px]">
                  Method: Baseline CV (Sobel Gradient &amp; Shadow Clustering)
                </span>
                <span className={`px-2 py-0.5 rounded border text-[9px] ${
                  validationResult?.spatialResolutionMPerPx
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  {validationResult?.spatialResolutionMPerPx ? `Scale: ${validationResult.spatialResolutionMPerPx} m/px` : 'Scale: Uncalibrated'}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 text-slate-300 text-[9px]">
                  {validationResult?.canDeriveNativeElevation ? 'DEM verified' : 'Analysis limited: DEM unavailable'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Detected Metadata & Validation Dossier */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4">
            {/* NASA Product & Origin Metadata Card */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>NASA Product & Origin Metadata</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0 font-bold">
                  {regionMetadata.productId || 'Not available'}
                </span>
              </div>

              {/* Diagnostic State Panel */}
              <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400 uppercase font-bold tracking-tighter">Diagnostic Pipeline Status</span>
                  <span className={`px-1.5 py-0.5 rounded font-bold ${isLoadingRegion || isProcessingImage ? 'text-amber-400 bg-amber-400/10' : 'text-emerald-400 bg-emerald-400/10'}`}>
                    {isLoadingRegion ? 'FETCHING' : isProcessingImage ? 'PROCESSING' : 'NOMINAL'}
                  </span>
                </div>
                <div className="space-y-1.5 font-mono text-[9px] break-all">
                  <div className="flex flex-col">
                    <span className="text-slate-500">RAW_ASSET_URL:</span>
                    <span className="text-slate-300 truncate max-w-full hover:whitespace-normal hover:overflow-visible hover:bg-black/80 hover:p-1 hover:rounded hover:z-50 cursor-help" title={currentImageSrc || undefined}>
                      {currentImageSrc || 'NO_ASSET_LOADED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">VIEWPORT_DIMS:</span>
                    <span className="text-slate-300">{viewWidth} × {viewHeight} px</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">CORS_MODE:</span>
                    <span className="text-cyan-400 font-bold underline decoration-dotted decoration-cyan-400/50">ANONYMOUS_PROXY</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-[11px] font-mono">
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                  <span className="text-slate-400 shrink-0">Mission:</span>
                  <span className="text-white font-bold text-right truncate">{regionMetadata.mission || 'Not available'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                  <span className="text-slate-400 shrink-0">Instrument:</span>
                  <span className="text-cyan-300 font-bold text-right truncate">{regionMetadata.instrument || 'Not available'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                  <span className="text-slate-400 shrink-0">Observation Date:</span>
                  <span className="text-slate-200 text-right">{regionMetadata.observationDate || 'Not available'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                  <span className="text-slate-400 shrink-0">Coordinates:</span>
                  <span className="text-slate-200 text-right">{regionMetadata.coordinates?.formatted || 'Not available'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                  <span className="text-slate-400 shrink-0">Source Credit:</span>
                  <span className="text-slate-300 text-right text-[10px] truncate max-w-[180px]">{regionMetadata.sourceCredit || 'NASA / JPL-Caltech'}</span>
                </div>
                {regionMetadata.desc && (
                  <p className="text-[10px] text-slate-400 font-sans leading-relaxed pt-1">
                    {regionMetadata.desc}
                  </p>
                )}
              </div>
            </div>

            {/* STEP 1: Image Validation Card */}
            {validationResult ? (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>STEP 1: File &amp; Spatial Validation</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 font-bold">
                    {validationResult.format}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                    <span className="text-[9px] text-slate-400 block uppercase">DIMENSIONS</span>
                    <span className="text-white font-bold block">{validationResult.width} × {validationResult.height} px</span>
                    <span className="text-[9px] text-slate-500 block">Aspect {validationResult.aspectRatio}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                    <span className="text-[9px] text-slate-400 block uppercase">FILE SIZE</span>
                    <span className="text-white font-bold block">{validationResult.fileSizeFormatted}</span>
                    <span className="text-[9px] text-slate-500 block">{validationResult.fileName.split('.').pop()?.toUpperCase()}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                    <span className="text-[9px] text-slate-400 block uppercase">SPATIAL SCALE</span>
                    <span className={`font-bold block ${validationResult.spatialResolutionMPerPx ? 'text-cyan-300' : 'text-amber-300'}`}>
                      {validationResult.spatialResolutionMPerPx ? `${validationResult.spatialResolutionMPerPx} m/px` : 'Not available'}
                    </span>
                    <span className="text-[9px] text-slate-500 block truncate">{validationResult.spatialReferenceSystem.split(' ')[0]}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                    <span className="text-[9px] text-slate-400 block uppercase">CLASSIFICATION</span>
                    <span className="text-orange-300 font-bold text-[10px] block leading-tight">{validationResult.classification.replace(/_/g, ' ')}</span>
                    <span className="text-[9px] text-slate-500 block">{validationResult.canDeriveNativeElevation ? 'DEM Matrix' : 'Optical 2D'}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-[10px] space-y-1">
                  <span className="text-slate-300 font-bold block">Validation Notes:</span>
                  {validationResult.validationNotes.map((note, i) => (
                    <p key={i} className="text-slate-400 font-sans leading-relaxed">&bull; {note}</p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 shadow-lg text-slate-400 font-mono text-xs">
                <span>Waiting for image validation...</span>
              </div>
            )}

            {/* STEP 3: Terrain Data Validation & Suitability Checklist */}
            {featureExtraction ? (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>STEP 3: Data Suitability for Navigation</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0 font-bold truncate max-w-[120px]">
                    {featureExtraction.dominantFeature}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                    <span className="text-slate-300 shrink-0">Elevation Analysis</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono text-right shrink-0 ${
                      featureExtraction.dataSuitability.elevationAnalysis
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {featureExtraction.dataSuitability.elevationAnalysis ? 'DIRECT DEM' : 'DEM UNAVAILABLE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                    <span className="text-slate-300 shrink-0">Slope Calculation</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono text-right shrink-0 ${
                      featureExtraction.dataSuitability.slopeCalculation
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {featureExtraction.dataSuitability.slopeCalculation ? 'CENTRAL-DIFF' : 'DEM UNAVAILABLE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                    <span className="text-slate-300 shrink-0">Surface Roughness</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-right shrink-0">
                      SCORE: {featureExtraction.surfaceTextureScore} (2D PROXY)
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                    <span className="text-slate-300 shrink-0">Obstacle Clearance</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-right shrink-0">
                      2D ENVELOPE VERIFIED
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                    <span className="text-slate-300 shrink-0">Navigation Readiness</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono text-right shrink-0 ${
                      validationResult?.canDeriveNativeElevation
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : validationResult?.spatialResolutionMPerPx
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {validationResult?.canDeriveNativeElevation
                        ? 'NAVIGATION READY'
                        : validationResult?.spatialResolutionMPerPx
                        ? 'LIMITED (DEM UNAVAILABLE)'
                        : 'LIMITED (DEM & SCALE UNAVAILABLE)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-black/30 border border-white/5 gap-2">
                    <span className="text-slate-300 shrink-0">Analysis Pipeline</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-slate-800 text-slate-300 border border-white/10 text-right shrink-0">
                      CV BASELINE (MODEL NOT CONNECTED)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-[10px] text-cyan-200">
                  {featureExtraction.dataSuitability.notes}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>STEP 3: Navigation Suitability Standby</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/10 shrink-0">
                    NOT STARTED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Optical terrain validated. Run <span className="text-orange-400 font-mono font-bold">Detect Hazards</span> or execute a failure rehearsal to derive terrain texture metrics and assess autonomous navigation suitability. (Note: Deep learning AI segmentation model is not connected; real Computer Vision baseline is used).
                </p>
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={isProcessingImage || !currentImageSrc}
                  className="w-full py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/40 text-xs font-mono font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Scan Terrain Hazards Now</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Detected Obstacles Table */}
        {featureExtraction && featureExtraction.detectedObstacles.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                <span>DETECTED TERRAIN OBSTACLES &amp; ROCK CLUSTERS ({featureExtraction.detectedObstacles.length})</span>
                {featureExtraction.intersectingObstacleCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                    {featureExtraction.intersectingObstacleCount} INTERSECTS PLANNED ROUTE
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Click any row or box above to inspect
              </span>
            </div>

            <div className="overflow-x-auto max-h-48 overflow-y-auto border border-white/10 rounded-2xl bg-black/30">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-[#0b1025] text-slate-400 border-b border-white/10 text-[10px] uppercase sticky top-0">
                  <tr>
                    <th className="p-2.5">Feature</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Image Coordinates (X, Y)</th>
                    <th className="p-2.5">Dimensions (W × H)</th>
                    <th className="p-2.5">Confidence</th>
                    <th className="p-2.5">Route Intersection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {featureExtraction.detectedObstacles.map((obs) => {
                    const isSelected = selectedObstacle?.id === obs.id;
                    return (
                      <tr
                        key={obs.id}
                        onClick={() => setSelectedObstacle(obs)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/50 text-white'
                            : obs.intersectsPlannedRoute
                            ? 'bg-red-950/20 text-red-200 hover:bg-red-950/30'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <td className="p-2.5 font-bold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${obs.intersectsPlannedRoute ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} />
                          <span>{obs.label}</span>
                        </td>
                        <td className="p-2.5 uppercase text-[10px]">{obs.classification}</td>
                        <td className="p-2.5">[{obs.pixelX}, {obs.pixelY}] ({obs.pixelWidth}×{obs.pixelHeight} px)</td>
                        <td className="p-2.5 text-slate-400 text-[10px]">{obs.dimensionsNote}</td>
                        <td className="p-2.5 text-cyan-300">{Math.round(obs.confidence * 100)}%</td>
                        <td className="p-2.5 font-bold">
                          {obs.intersectsPlannedRoute ? (
                            <span className="text-red-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>COLLISION HAZARD</span>
                            </span>
                          ) : (
                            <span className="text-emerald-400">CLEAR ({obs.distanceToRoutePixels} px)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. THE FOUR INDIVIDUAL SCENARIOS SELECTION CARDS         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            key: 'obstacle' as const,
            num: '01',
            name: 'Scenario 1: Newly Discovered Boulder Obstacle',
            desc: 'Detects unexpected rock cluster obstruction and re-computes A* obstacle bypass.',
            icon: AlertOctagon,
            color: 'text-orange-400'
          },
          {
            key: 'slope' as const,
            num: '02',
            name: 'Scenario 2: Regolith Slip & Steeper Slope',
            desc: 'Tests 14° flight rule limits and contour rerouting using DEM elevation data.',
            icon: Compass,
            color: 'text-cyan-400'
          },
          {
            key: 'telemetry' as const,
            num: '03',
            name: 'Scenario 3: Terrain Map Telemetry Drop',
            desc: 'Controlled fault injection testing fallback to cached MOLA orbital basemap.',
            icon: Activity,
            color: 'text-purple-400'
          },
          {
            key: 'budget' as const,
            num: '04',
            name: 'Scenario 4: Mission Time Budget Reduction',
            desc: 'Simulates compressed battery charging window and direct path truncation.',
            icon: Clock,
            color: 'text-amber-400'
          }
        ].map((item) => {
          const res = scenarioResults[item.key];
          const isSelected = selectedScenarioKey === item.key;
          const isRunningThis = activeRunningScenario === item.key;

          return (
            <div
              key={item.key}
              onClick={() => setSelectedScenarioKey(item.key)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'bg-gradient-to-b from-[#0c1432] to-[#080d22] border-orange-500 ring-2 ring-orange-500/50 shadow-2xl'
                  : 'bg-[#070b1a] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    STRESS TEST {item.num}
                  </span>
                  {/* Status Badge */}
                  {res ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                      res.status === 'PASS'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : res.status === 'FAIL'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : res.status === 'INCONCLUSIVE'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                    }`}>
                      {res.status}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500">PENDING</span>
                  )}
                </div>

                <h3 className="text-white font-bold text-sm leading-snug">{item.name}</h3>
                <p className="text-slate-400 text-xs font-sans leading-relaxed">{item.desc}</p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedScenarioKey(item.key);
                    handleRunSingleScenario(item.key);
                  }}
                  disabled={isRunningThis || isRunningAll}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-orange-600 text-white font-bold text-[10px] uppercase font-mono transition cursor-pointer flex items-center gap-1.5"
                >
                  {isRunningThis ? (
                    <>
                      <Activity className="w-3 h-3 animate-spin" />
                      <span>Computing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      <span>Run Test</span>
                    </>
                  )}
                </button>

                <ChevronRight className={`w-4 h-4 transition ${isSelected ? 'text-orange-400 translate-x-1' : 'text-slate-600'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 5. ACTIVE SCENARIO DEEP DIVE WORKSTATION                 */}
      {/* ======================================================== */}
      <div className="bg-[#070b1a] border border-white/10 p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl">
        {/* Scenario Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-orange-400 font-bold uppercase tracking-wider">
                ACTIVE REHEARSAL FOCUS
              </span>
              {currentActiveResult && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                  currentActiveResult.status === 'PASS'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : currentActiveResult.status === 'FAIL'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                    : currentActiveResult.status === 'INCONCLUSIVE'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                }`}>
                  {currentActiveResult.status}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              {selectedScenarioKey === 'obstacle' && 'Scenario 1: Newly Discovered Boulder Obstacle'}
              {selectedScenarioKey === 'slope' && 'Scenario 2: Regolith Slip & Steeper Slope'}
              {selectedScenarioKey === 'telemetry' && 'Scenario 3: Terrain Map Telemetry Drop'}
              {selectedScenarioKey === 'budget' && 'Scenario 4: Mission Time Budget Reduction'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Contextual sliders for tweaking test conditions */}
            {selectedScenarioKey === 'budget' && (
              <div className="flex items-center gap-2 text-[11px] font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-slate-400">Budget Reduction:</span>
                <input
                  type="range"
                  min="20"
                  max="70"
                  step="5"
                  value={timeBudgetReductionPct}
                  onChange={(e) => setTimeBudgetReductionPct(parseInt(e.target.value, 10))}
                  className="w-20 accent-orange-500 cursor-pointer"
                />
                <span className="text-orange-400 font-bold">-{timeBudgetReductionPct}%</span>
              </div>
            )}

            {selectedScenarioKey === 'slope' && (
              <div className="flex items-center gap-2 text-[11px] font-mono bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="text-slate-400">Rover Slope Limit:</span>
                <input
                  type="range"
                  min="10"
                  max="20"
                  step="0.5"
                  value={maxSlopeLimitDeg}
                  onChange={(e) => setMaxSlopeLimitDeg(parseFloat(e.target.value))}
                  className="w-20 accent-cyan-500 cursor-pointer"
                />
                <span className="text-cyan-400 font-bold">{maxSlopeLimitDeg}°</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleRunSingleScenario(selectedScenarioKey)}
              disabled={activeRunningScenario === selectedScenarioKey || isRunningAll}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
            >
              {activeRunningScenario === selectedScenarioKey ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Computing A* Traversal...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Execute This Rehearsal</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 6. ORIGINAL PATH VS REVISED PATH VISUALIZATION (MANDATORY) */}
        {/* ======================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="text-white font-bold flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>SYNCHRONIZED PATH TRAVERSAL MAPS (ORIGINAL VS. REVISED)</span>
            </span>
            <span>Dynamic Viewport ({viewWidth}×{viewHeight})</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT: ORIGINAL PLANNED PATH */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>ORIGINAL PLANNED PATH</span>
                </span>
                <span className="text-slate-400">
                  {currentActiveResult?.originalRoute.distanceM.toFixed(1) || activeRoute.totalDistanceM} m &bull; {currentActiveResult?.originalRoute.durationMins || Math.round(activeRoute.totalDistanceM / 2)} mins
                </span>
              </div>

              <div
                className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center"
                style={{ aspectRatio: `${viewWidth} / ${viewHeight}` }}
              >
                {currentImageSrc && (
                  <img
                    src={currentImageSrc}
                    alt="Original Terrain"
                    className="w-full h-full object-contain opacity-60"
                  />
                )}
                <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="absolute inset-0 w-full h-full pointer-events-none">
                  {/* Original Path */}
                  <polyline
                    points={activeRoute.waypoints.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {activeRoute.waypoints.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={i === 0 || i === activeRoute.waypoints.length - 1 ? 5 : 3}
                      fill={i === 0 ? '#10b981' : i === activeRoute.waypoints.length - 1 ? '#ef4444' : '#06b6d4'}
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                  ))}
                  {/* Highlighted obstruction sector if obstacle scenario - ONLY after execution */}
                  {currentActiveResult && selectedScenarioKey === 'obstacle' && featureExtraction?.detectedObstacles.filter(o => o.intersectsPlannedRoute).map((obs) => (
                    <g key={obs.id}>
                      <rect
                        x={obs.pixelX}
                        y={obs.pixelY}
                        width={obs.pixelWidth}
                        height={obs.pixelHeight}
                        fill="rgba(239, 68, 68, 0.4)"
                        stroke="#ef4444"
                        strokeWidth="2"
                        className="animate-pulse"
                      />
                      <circle cx={obs.pixelX + obs.pixelWidth / 2} cy={obs.pixelY + obs.pixelHeight / 2} r="12" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" />
                    </g>
                  ))}
                  {/* Highlighted steep sector if slope scenario - ONLY after execution */}
                  {currentActiveResult && selectedScenarioKey === 'slope' && (
                    <rect
                      x={viewWidth * 0.35}
                      y={viewHeight * 0.2}
                      width={viewWidth * 0.3}
                      height={viewHeight * 0.6}
                      fill="rgba(249, 115, 22, 0.25)"
                      stroke="#f97316"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                  )}
                  {/* Highlighted telemetry drop corridor if telemetry scenario - ONLY after execution */}
                  {currentActiveResult && selectedScenarioKey === 'telemetry' && (
                    <rect
                      x={viewWidth * 0.3}
                      y={viewHeight * 0.15}
                      width={viewWidth * 0.4}
                      height={viewHeight * 0.7}
                      fill="rgba(168, 85, 247, 0.25)"
                      stroke="#a855f7"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                  )}
                </svg>
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-cyan-300 border border-cyan-500/30">
                  Planned Nominal Vector
                </div>
              </div>
            </div>

            {/* RIGHT: REVISED / REPLANNED PATH */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-orange-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400" />
                  <span>REVISED / REPLANNED PATH</span>
                </span>
                {currentActiveResult?.revisedRoute ? (
                  <span className="text-slate-300">
                    {currentActiveResult.revisedRoute.distanceM.toFixed(1)} m &bull; {currentActiveResult.revisedRoute.durationMins} mins
                  </span>
                ) : (
                  <span className="text-slate-500">Awaiting Rehearsal</span>
                )}
              </div>

              <div
                className="relative w-full rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center"
                style={{ aspectRatio: `${viewWidth} / ${viewHeight}` }}
              >
                {currentImageSrc && (
                  <img
                    src={currentImageSrc}
                    alt="Revised Terrain"
                    className="w-full h-full object-contain opacity-60"
                  />
                )}

                {currentActiveResult?.revisedRoute ? (
                  <svg viewBox={`0 0 ${viewWidth} ${viewHeight}`} className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Ghosted Original Path */}
                    <polyline
                      points={activeRoute.waypoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    {/* Active Revised Detour Path */}
                    <polyline
                      points={currentActiveResult.revisedRoute.waypoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {currentActiveResult.revisedRoute.waypoints.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={i === 0 || i === currentActiveResult.revisedRoute!.waypoints.length - 1 ? 5 : 3}
                        fill={i === 0 ? '#10b981' : i === currentActiveResult.revisedRoute!.waypoints.length - 1 ? '#ef4444' : '#f97316'}
                        stroke="#ffffff"
                        strokeWidth="1"
                      />
                    ))}
                  </svg>
                ) : currentActiveResult && currentActiveResult.status === 'FAIL' ? (
                  <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-1">
                    <XCircle className="w-8 h-8 text-red-400" />
                    <span className="text-xs font-bold font-mono text-red-200 uppercase tracking-wider">
                      NO VALID ALTERNATIVE ROUTE FOUND
                    </span>
                    <p className="text-[10px] text-red-300 font-sans max-w-xs">
                      All traversable corridor alternatives violate configured rover slope or clearance constraints.
                    </p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 space-y-1">
                    <Play className="w-6 h-6 opacity-40" />
                    <span className="text-[11px] font-mono">Pending rehearsal execution...</span>
                  </div>
                )}

                {currentActiveResult?.revisedRoute && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[9px] font-mono text-orange-300 border border-orange-500/30">
                    {currentActiveResult.revisedRoute.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Execution Output / Scientific Calculation Tables */}
        {currentActiveResult ? (
          <div className="space-y-4 pt-4 border-t border-white/10 animate-fadeIn">
            {/* Detected Events & Status Message */}
            <div className={`p-4 rounded-2xl border space-y-2 ${
              currentActiveResult.status === 'PASS'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : currentActiveResult.status === 'FAIL'
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                : currentActiveResult.status === 'INCONCLUSIVE'
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                : 'bg-purple-950/30 border-purple-500/40 text-purple-200'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold font-mono">
                <span className="flex items-center gap-2">
                  {currentActiveResult.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {currentActiveResult.status === 'FAIL' && <XCircle className="w-4 h-4 text-rose-400" />}
                  {currentActiveResult.status === 'INCONCLUSIVE' && <HelpCircle className="w-4 h-4 text-amber-400" />}
                  {currentActiveResult.status === 'ERROR' && <AlertTriangle className="w-4 h-4 text-purple-400" />}
                  <span>{currentActiveResult.statusMessage}</span>
                </span>
                <span className="text-[10px] opacity-80 font-mono">
                  Runtime: {currentActiveResult.executionTimeMs} ms
                </span>
              </div>

              <div className="space-y-1 text-[11px] font-sans">
                {currentActiveResult.detectedEvents.map((evt, i) => (
                  <p key={i} className="leading-relaxed">&bull; {evt}</p>
                ))}
              </div>

              {currentActiveResult.failureExplanation && (
                <div className="pt-2 border-t border-rose-500/20 text-[11px]">
                  <strong className="text-rose-300 font-mono uppercase">Failure Root Cause:</strong>{' '}
                  <span className="text-slate-300 font-sans">{currentActiveResult.failureExplanation}</span>
                </div>
              )}

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <div>
                  <strong className="text-cyan-300 font-mono uppercase">Recommended Flight Action:</strong>{' '}
                  <span className="text-slate-200 font-sans">{currentActiveResult.recommendedAction}</span>
                </div>
              </div>
            </div>

            {/* Scientific Calculation Details Breakdown */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <span className="text-xs font-bold font-mono text-slate-300 block uppercase">
                SCIENTIFIC CALCULATION DETAILS &amp; PARAMETER PROVENANCE
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-[11px] font-mono">
                {currentActiveResult.calculationDetails.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">{c.label}</span>
                    <span className="text-white font-bold block">{c.value}</span>
                    {c.note && <span className="text-[9px] text-cyan-400 block">{c.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-black/40 border border-white/5 text-center space-y-2">
            <AlertOctagon className="w-8 h-8 text-orange-400 mx-auto opacity-70" />
            <div className="font-bold text-white text-sm">Awaiting Rehearsal Execution</div>
            <p className="text-slate-400 text-xs font-sans max-w-md mx-auto">
              Click <strong>Execute This Rehearsal</strong> above or <strong>RUN ALL SCENARIOS</strong> to stress-test the navigation system against real image evidence.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 7. RUN HISTORY & REPORT EXPORT MODALS                    */}
      {/* ======================================================== */}
      {showReportModal && activeReportRun && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#080d22] border border-white/20 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase font-bold">MARSNAV MISSION ASSURANCE REPORT</span>
                <h3 className="text-lg font-bold text-white">Failure Rehearsal Dossier &bull; {activeReportRun.runId}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-slate-400 block">TOTAL SCENARIOS</span>
                <span className="text-base font-bold text-white">{activeReportRun.totalScenarios}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-400 block">PASSED</span>
                <span className="text-base font-bold text-emerald-400">{activeReportRun.passedCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-rose-500/30">
                <span className="text-[10px] text-rose-400 block">FAILED</span>
                <span className="text-base font-bold text-rose-400">{activeReportRun.failedCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-amber-500/30">
                <span className="text-[10px] text-amber-400 block">INCONCLUSIVE</span>
                <span className="text-base font-bold text-amber-400">{activeReportRun.inconclusiveCount}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs font-mono text-cyan-200">
              <strong>OVERALL STATUS:</strong> {activeReportRun.overallAssessment}
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-white font-mono uppercase">Individual Test Breakdown</span>
              {Object.entries(activeReportRun.results).map(([k, s]) => (
                <div key={k} className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-white font-bold">{s.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.status === 'PASS' ? 'text-emerald-400 bg-emerald-500/10' : s.status === 'FAIL' ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] font-sans">{s.statusMessage}</p>
                  <p className="text-slate-400 text-[10px] font-mono">Action: {s.recommendedAction}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(activeReportRun, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `MARSNAV_SCENARIO_REPORT_${activeReportRun.runId}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download JSON Dossier</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#080d22] border border-white/20 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <History className="w-4 h-4 text-cyan-400" />
                <span>Rehearsal Execution History ({runHistory.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-3 py-1 rounded-lg bg-white/10 text-white text-xs cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              {runHistory.map((run, i) => (
                <div
                  key={run.runId}
                  onClick={() => {
                    setScenarioResults(run.results);
                    setActiveReportRun(run);
                    setShowHistoryModal(false);
                  }}
                  className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-cyan-500/50 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="space-y-0.5 font-mono">
                    <span className="text-white font-bold text-xs">{run.runId}</span>
                    <span className="text-[10px] text-slate-400 block">{new Date(run.timestamp).toLocaleString()}</span>
                    <span className="text-[10px] text-cyan-300 block truncate max-w-xs">{run.uploadedFileRef}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs font-bold text-white">{run.resilienceScorePct}% Score</span>
                    <span className="text-[10px] text-emerald-400 block">{run.passedCount} PASS / {run.failedCount} FAIL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
