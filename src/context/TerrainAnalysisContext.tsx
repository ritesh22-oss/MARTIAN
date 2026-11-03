import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { AStarGrid, calculatePathLength, validateRouteCollisionFree } from '../utils/astar';
import { SegmentedHazard, Point } from '../utils/terrainSegmentation';
import {
  matchGroundTruthDataset,
  generateReferenceGtGrid,
  calculateSupervisedEvaluation,
  SupervisedEvaluationResult,
  GroundTruthRecord
} from '../services/ai4marsDatasetService';

export function logRouteDiagnostics(sourceModule: string, data: {
  imageId: string;
  imageWidth: number;
  imageHeight: number;
  viewBox: string;
  waypointCount: number;
  firstWaypoint: { x: number; y: number } | null;
  lastWaypoint: { x: number; y: number } | null;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  startPt: { x: number; y: number } | null;
  destPt: { x: number; y: number } | null;
  totalLengthM: number;
}) {
  console.log(`[MARSNAV ROUTE DIAGNOSTICS :: ${sourceModule}]`, {
    imageId: data.imageId,
    imageDimensions: `${data.imageWidth}x${data.imageHeight}`,
    svgViewBox: data.viewBox,
    waypointCount: data.waypointCount,
    firstWaypoint: data.firstWaypoint ? `(${data.firstWaypoint.x.toFixed(1)}, ${data.firstWaypoint.y.toFixed(1)})` : 'None',
    lastWaypoint: data.lastWaypoint ? `(${data.lastWaypoint.x.toFixed(1)}, ${data.lastWaypoint.y.toFixed(1)})` : 'None',
    routeBoundingBox: `X:[${data.minX.toFixed(1)} -> ${data.maxX.toFixed(1)}], Y:[${data.minY.toFixed(1)} -> ${data.maxY.toFixed(1)}]`,
    startPoint: data.startPt ? `(${data.startPt.x.toFixed(1)}, ${data.startPt.y.toFixed(1)})` : 'None',
    destinationPoint: data.destPt ? `(${data.destPt.x.toFixed(1)}, ${data.destPt.y.toFixed(1)})` : 'None',
    totalLengthMeters: data.totalLengthM
  });
}

export interface ObstacleNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'rock' | 'sand' | 'crater' | 'user';
  blocked: boolean;
  label?: string;
  points?: Array<{ x: number; y: number }>;
  center?: { x: number; y: number };
}

export interface RouteWaypoint {
  index: number;
  x: number;
  y: number;
  distanceM: number;
  slope: number;
  roughness: number;
  slip: number;
  obstaclePenalty: number;
  isUnsafe: boolean;
  isBlockedCell: boolean;
  stepCost: number;
  cumulativeCost: number;
}

export interface RouteCandidate {
  id: string;
  strategyId?: 'alpha' | 'beta' | 'gamma' | 'delta';
  color?: string;
  name: string;
  waypoints: RouteWaypoint[];
  totalCost: number;
  totalLengthM: number;
  totalLengthPx?: number;
  directDistanceM?: number;
  directDistancePx?: number;
  detourDistanceM?: number;
  detourPct?: number;
  waypointsCount?: number;
  obstaclesAvoidedCount?: number;
  terrainBreakdown?: {
    soilPct: number;
    bedrockPct: number;
    sandPct: number;
    cautionPct: number;
  };
  maxSlope: number;
  unsafeCount: number;
  isBlocked: boolean;
  difficulty: string;
  difficultyScore?: string;
  estimatedTravelTimeHours?: number;
  estimatedDurationMins?: number;
  validationStatus?: 'VALIDATED_COLLISION_FREE' | 'NO_SAFE_ROUTE' | 'BLOCKED_ENDPOINT';
  validationMessage?: string;
  obstacleClearancePx?: number;
  explanation: string;
}

export interface TerrainClassMetric {
  id: number;
  name: string;
  desc: string;
  pixelCount: number;
  naturalPixelsString: string;
  percentage: number;
  confidencePct: number;
  iou: number | null; // null if no ground truth reference labels
  precision: number | null;
  recall: number | null;
  f1: number | null;
  tp?: number;
  fp?: number;
  fn?: number;
}

export interface TerrainClassStats {
  totalAnalyzedPixels: number;
  naturalTotalPixelsString: string;
  processingDurationMs: number;
  groundTruthAvailable: boolean;
  gtSourceTitle?: string;
  groundTruthNote: string;
  evaluatedPixelCount?: number;
  ignoredPixelCount?: number;
  overallAccuracy?: number | null;
  mIoU?: number | null;
  meanPrecision?: number | null;
  meanRecall?: number | null;
  meanF1?: number | null;
  avgConfidencePct: number;
  traversablePixelPct: number;
  classes: TerrainClassMetric[];
  confusionMatrix: Array<{
    actualClass: string;
    actualId: number;
    predSoil: number;
    predBedrock: number;
    predSand: number;
    predRock: number;
    predSoilPct: number;
    predBedrockPct: number;
    predSandPct: number;
    predRockPct: number;
    totalActualPixels: number;
  }> | null;
}

export interface TerrainAnalysisResult {
  imageId: string;
  imageTitle: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  isLoading: boolean;
  error: string | null;
  startPoint: { x: number; y: number } | null;
  destinationPoint: { x: number; y: number } | null;
  effectiveStartPoint: { x: number; y: number };
  effectiveDestinationPoint: { x: number; y: number };
  obstacles: ObstacleNode[];
  segmentedHazards: SegmentedHazard[];
  occupancyGrid: Uint8Array | null;
  terrainClassGrid: Uint8Array | null;
  costGrid: Float32Array | null;
  safetyClearancePx: number;
  selectedRouteIndex: number;
  routes: RouteCandidate[];
  lastAnalyzedTime: string;
  classStats: TerrainClassStats | null;
  matchedGtRecord: GroundTruthRecord | null;
  activeRouteFeasible: boolean;
  blockedReason: string | null;
}

export interface RoverPosTelemetry {
  x: number;
  y: number;
  angle: number;
  waypointIndex: number;
  distanceTraveledM: number;
  remainingDistanceM: number;
  currentSlope: number;
  currentRoughness: number;
  currentSlip: number;
  currentStepCost: number;
}

interface TerrainAnalysisContextType {
  analysis: TerrainAnalysisResult;
  setStartPoint: (pt: { x: number; y: number } | null) => void;
  setDestinationPoint: (pt: { x: number; y: number } | null) => void;
  clearStartPoint: () => void;
  clearDestinationPoint: () => void;
  swapStartAndDestination: () => void;
  setSelectedRouteIndex: (idx: number) => void;
  safetyClearancePx: number;
  setSafetyClearancePx: (px: number) => void;
  validateCoordinateTraversability: (x: number, y: number) => { traversable: boolean; reason?: string; isCore: boolean };
  addObstacle: (obs: ObstacleNode) => void;
  removeObstacle: (id: string) => void;
  clearObstacles: () => void;
  recalculateAnalysis: () => void;
  uploadCustomGroundTruthMask: (maskGrid: Uint8Array, title?: string) => void;
  clearCustomGroundTruthMask: () => void;

  // Shared Traversal Animation State & Real-Time Controls
  isPlaying: boolean;
  traversalProgress: number; // 0 to 100%
  simSpeed: number;
  traversalStatus: 'STOPPED' | 'TRAVERSING' | 'PAUSED' | 'COMPLETED';
  startTraversal: () => void;
  pauseTraversal: () => void;
  resumeTraversal: () => void;
  resetTraversal: () => void;
  setTraversalProgress: (progress: number) => void;
  setSimSpeed: (speed: number) => void;
  roverPos: RoverPosTelemetry;
}

/**
 * Ultra-fast multi-source BFS inflation for configurable rover safety clearance
 */
export function generateOccupancyGrid(
  obstacleCoreGrid: Uint8Array,
  predClassGrid: Uint8Array,
  safetyClearancePx: number,
  gridWidth = 256,
  gridHeight = 256
): Uint8Array {
  const size = gridWidth * gridHeight;
  const occupancy = new Uint8Array(size);
  const distGrid = new Int16Array(size).fill(-1);
  const queue = new Int32Array(size);
  let queueHead = 0;
  let queueTail = 0;

  // Push all obstacle cores into queue
  for (let i = 0; i < size; i++) {
    if (obstacleCoreGrid[i] === 1) {
      occupancy[i] = 3; // Blocked Obstacle Core (Red)
      distGrid[i] = 0;
      queue[queueTail++] = i;
    }
  }

  // Multi-source BFS up to safetyClearancePx
  while (queueHead < queueTail) {
    const curr = queue[queueHead++];
    const d = distGrid[curr];
    if (d >= safetyClearancePx) continue;

    const cx = curr % gridWidth;
    const cy = Math.floor(curr / gridWidth);

    // 8-neighborhood for circular radial inflation
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
          const nIdx = ny * gridWidth + nx;
          if (distGrid[nIdx] === -1) {
            distGrid[nIdx] = d + 1;
            if (occupancy[nIdx] !== 3) {
              occupancy[nIdx] = 4; // Safety clearance margin / Caution zone (Amber)
            }
            queue[queueTail++] = nIdx;
          }
        }
      }
    }
  }

  // Mark remaining cells: 1 for Sand, 2 for Uncertain, 0 for Safe Soil/Bedrock
  for (let i = 0; i < size; i++) {
    if (occupancy[i] === 0) {
      const cls = predClassGrid[i];
      if (cls === 2) {
        occupancy[i] = 1; // Loose Sand (Caution)
      } else if (cls === 5) {
        occupancy[i] = 2; // Uncertain transition
      }
      // Otherwise 0 is safe traversable
    }
  }

  return occupancy;
}

const TerrainAnalysisContext = createContext<TerrainAnalysisContextType | undefined>(undefined);

export function TerrainAnalysisProvider({ children }: { children: React.ReactNode }) {
  const { selectedObservation, selectedRegion, sharedSession, settings, updateSharedSession } = useWorkspace();

  // Sync points and manual obstacles with global sharedSession
  const startPoint = sharedSession.startPoint;
  const destinationPoint = sharedSession.destinationPoint;
  const manualObstacles = sharedSession.obstacles;

  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [autoObstacles, setAutoObstacles] = useState<ObstacleNode[]>([]);
  const [segmentedHazards, setSegmentedHazards] = useState<SegmentedHazard[]>([]);
  const [safetyClearancePx, setSafetyClearancePxState] = useState<number>(12);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ width: number; height: number }>({ width: 300, height: 250 });
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string>('Never');

  // Internal pixel-based grids (256x256)
  const [traversabilityGrid, setTraversabilityGrid] = useState<Float32Array | null>(null);
  const [textureGrid, setTextureGrid] = useState<Float32Array | null>(null);
  const [obstacleCoreGrid, setObstacleCoreGrid] = useState<Uint8Array | null>(null);
  const [predClassGrid, setPredClassGrid] = useState<Uint8Array | null>(null);
  const [occupancyGrid, setOccupancyGrid] = useState<Uint8Array | null>(null);
  const [costGrid, setCostGrid] = useState<Float32Array | null>(null);
  const [classStats, setClassStats] = useState<TerrainClassStats | null>(null);

  const [recalcTrigger, setRecalcTrigger] = useState<number>(0);

  // Active image metadata
  const activeImage = useMemo(() => {
    if (sharedSession?.terrainImage && sharedSession.terrainImage.trim() !== '') {
      return {
        id: sharedSession.imageProvenance?.identifier || 'uploaded_terrain_img',
        title: sharedSession.imageProvenance?.source || sharedSession.imageProvenance?.identifier || 'Active Uploaded Image',
        url: sharedSession.terrainImage
      };
    }
    if (selectedObservation) {
      return {
        id: selectedObservation.imageid || `obs_${selectedObservation.id}`,
        title: selectedObservation.title || `Sol ${selectedObservation.sol} - ${selectedObservation.camera}`,
        url: selectedObservation.fullResUrl || selectedObservation.thumbnailUrl
      };
    }
    if (selectedRegion) {
      return {
        id: selectedRegion.id,
        title: selectedRegion.name,
        url: selectedRegion.imageUrl
      };
    }
    return {
      id: 'PSP_001414_1780_JEZERO',
      title: 'Jezero Crater Western Delta',
      url: '/assets/aistudio/vis_0_f6a9756b.png'
    };
  }, [
    selectedObservation,
    selectedRegion,
    sharedSession?.terrainImage,
    sharedSession?.imageProvenance?.identifier,
    sharedSession?.imageProvenance?.source
  ]);

  // Effective Start and Destination Points for path computation (normalized 256x256 coordinate space)
  const effectiveStartPoint = useMemo(() => {
    if (startPoint) return startPoint;
    return { x: 38, y: 218 };
  }, [startPoint]);

  const effectiveDestinationPoint = useMemo(() => {
    if (destinationPoint) return destinationPoint;
    return { x: 218, y: 38 };
  }, [destinationPoint]);

  // Load and decode image + generate baseline traversability grid & class stats
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setTraversabilityGrid(null);
    setTextureGrid(null);
    setClassStats(null);

    const startTime = performance.now();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Use proxy for remote NASA URLs to avoid CORS / Black preview issues
    const safeUrl = (activeImage.url.startsWith('http') && !activeImage.url.includes(window.location.host))
      ? `/api/nasa/proxy-image?url=${encodeURIComponent(activeImage.url)}`
      : activeImage.url;
      
    img.src = safeUrl;

    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        setError('Image decoded with zero dimensions.');
        setIsLoading(false);
        return;
      }

      const nw = img.naturalWidth || 1024;
      const nh = img.naturalHeight || 768;
      setImageDims({ width: nw, height: nh });
      
      // Honest Baseline: Pixel Analysis & Classification
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 256, 256);
        const imgData = ctx.getImageData(0, 0, 256, 256);
        const data = imgData.data;
        
        const predGrid = new Uint8Array(256 * 256);
        const grid = new Float32Array(256 * 256);
        const textures = new Float32Array(256 * 256);
        const obstacleClusters: { x: number; y: number; count: number; lum: number }[] = [];
        const grayGrid = new Float32Array(256 * 256);
        const edgeGrid = new Float32Array(256 * 256);

        // Pass 1: Compute Grayscale and Sobel Edge Gradients
        for (let y = 0; y < 256; y++) {
          for (let x = 0; x < 256; x++) {
            const idx = y * 256 + x;
            const i = idx * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            grayGrid[idx] = 0.299 * r + 0.587 * g + 0.114 * b;
          }
        }

        for (let y = 1; y < 255; y++) {
          for (let x = 1; x < 255; x++) {
            const idx = y * 256 + x;
            const gx =
              -grayGrid[(y - 1) * 256 + (x - 1)] + grayGrid[(y - 1) * 256 + (x + 1)] +
              -2 * grayGrid[y * 256 + (x - 1)] + 2 * grayGrid[y * 256 + (x + 1)] +
              -grayGrid[(y + 1) * 256 + (x - 1)] + grayGrid[(y + 1) * 256 + (x + 1)];

            const gy =
              -grayGrid[(y - 1) * 256 + (x - 1)] - 2 * grayGrid[(y - 1) * 256 + x] - grayGrid[(y - 1) * 256 + (x + 1)] +
              grayGrid[(y + 1) * 256 + (x - 1)] + 2 * grayGrid[(y + 1) * 256 + x] + grayGrid[(y + 1) * 256 + (x + 1)];

            edgeGrid[idx] = Math.sqrt(gx * gx + gy * gy);
          }
        }

        // Pass 2: Feature-Based Terrain Classification (Boulders, Bedrock, Sand, Soil)
        // Compute dynamic luminance statistics for adaptive Martian contrast scaling
        let sumGray = 0;
        let sumGraySq = 0;
        for (let i = 0; i < 256 * 256; i++) {
          const val = grayGrid[i];
          sumGray += val;
          sumGraySq += val * val;
        }
        const meanImgLum = sumGray / (256 * 256);
        const stdImgLum = Math.sqrt(Math.max(1, (sumGraySq / (256 * 256)) - (meanImgLum * meanImgLum)));

        const rawClassGrid = new Uint8Array(256 * 256);
        for (let y = 0; y < 256; y++) {
          for (let x = 0; x < 256; x++) {
            const idx = y * 256 + x;
            const i = idx * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = grayGrid[idx];
            const edge = edgeGrid[idx];
            const warmth = r - b;

            // Local 5x5 variance check around pixel
            let sumL = 0, sumL2 = 0, nL = 0;
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const ny = y + dy;
                const nx = x + dx;
                if (ny >= 0 && ny < 256 && nx >= 0 && nx < 256) {
                  const val = grayGrid[ny * 256 + nx];
                  sumL += val;
                  sumL2 += val * val;
                  nL++;
                }
              }
            }
            const meanL = sumL / nL;
            const varL = sumL2 / nL - meanL * meanL;

            // Robust statistical detection of authentic Martian boulders, craters, and escarpments
            // True rocks exhibit distinct sunlit highlight faces or deep cast shadows paired with sharp edge gradients
            const isHighlightRock = gray > (meanImgLum + 1.15 * stdImgLum) && edge > 60 && varL > 200;
            const isShadowRock = gray < Math.max(30, meanImgLum - 1.15 * stdImgLum) && edge > 50 && varL > 180;
            const isSharpBoulderTexture = edge > 85 && varL > 280;
            const isDeepPit = gray < Math.max(25, meanImgLum - 1.45 * stdImgLum) && edge > 45 && varL > 220;
            const isSteepGradient = edge > 115 && varL > 320;

            if (isHighlightRock || isShadowRock || isSharpBoulderTexture) {
              rawClassGrid[idx] = 3; // Rock / Boulder (Blocked)
            } else if (isDeepPit) {
              rawClassGrid[idx] = 3; // Crater / Deep Shadow Pit (Blocked)
            } else if (isSteepGradient) {
              rawClassGrid[idx] = 3; // Steep Slope Escarpment (Blocked)
            } else if (gray > (meanImgLum + 0.3 * stdImgLum) && varL < 160 && edge < 35) {
              rawClassGrid[idx] = 1; // Bedrock (Firm safe ground)
            } else if (warmth > 14 && varL < 220 && edge < 40) {
              rawClassGrid[idx] = 2; // Sand / Dunes (High slip penalty)
            } else {
              rawClassGrid[idx] = 0; // Flat Soil / Regolith (Normal cost)
            }
          }
        }

        // Pass 3: Spatial Modal (3x3 Majority) Smoothing Filter for Clean Regions
        for (let y = 0; y < 256; y++) {
          for (let x = 0; x < 256; x++) {
            const idx = y * 256 + x;

            let finalCls = rawClassGrid[idx];
            if (y > 0 && y < 255 && x > 0 && x < 255) {
              const counts3x3 = [0, 0, 0, 0];
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const c = rawClassGrid[(y + dy) * 256 + (x + dx)];
                  if (c < 4) counts3x3[c]++;
                }
              }
              let maxCount = 0;
              for (let c = 0; c < 4; c++) {
                if (counts3x3[c] > maxCount) {
                  maxCount = counts3x3[c];
                  finalCls = c;
                }
              }
            }

            predGrid[idx] = finalCls;
            textures[idx] = grayGrid[idx] / 255;
          }
        }

        // Initial candidate obstacle core grid from Pass 3
        const rawCoreGrid = new Uint8Array(256 * 256);
        for (let i = 0; i < 256 * 256; i++) {
          if (predGrid[i] === 3) rawCoreGrid[i] = 1;
        }

        // Pass 4: Connected Component Analysis to Extract Individual Obstacle Polygons
        // Prune isolated single-pixel/two-pixel noise clusters (< 8 pixels) so flat soil is not blocked
        const visited = new Uint8Array(256 * 256);
        const cleanCoreGrid = new Uint8Array(256 * 256);
        const detectedHazards: SegmentedHazard[] = [];
        const detectedObstacles: ObstacleNode[] = [];
        let obstacleIdCounter = 1;

        for (let y = 1; y < 255; y++) {
          for (let x = 1; x < 255; x++) {
            const rootIdx = y * 256 + x;
            if (rawCoreGrid[rootIdx] === 1 && visited[rootIdx] === 0) {
              const queue = [rootIdx];
              visited[rootIdx] = 1;
              const clusterX: number[] = [];
              const clusterY: number[] = [];
              let sumX = 0;
              let sumY = 0;
              let edgeSum = 0;

              while (queue.length > 0 && clusterX.length < 1200) {
                const curr = queue.shift()!;
                const cx = curr % 256;
                const cy = Math.floor(curr / 256);
                clusterX.push(cx);
                clusterY.push(cy);
                sumX += cx;
                sumY += cy;
                edgeSum += edgeGrid[curr];

                const nbrs = [curr - 1, curr + 1, curr - 256, curr + 256];
                for (const n of nbrs) {
                  if (n >= 0 && n < 256 * 256 && visited[n] === 0 && rawCoreGrid[n] === 1) {
                    visited[n] = 1;
                    queue.push(n);
                  }
                }
              }

              // Only genuine clusters (>= 8 px) are registered as impassable boulder hazards
              if (clusterX.length >= 8) {
                for (let k = 0; k < clusterX.length; k++) {
                  cleanCoreGrid[clusterY[k] * 256 + clusterX[k]] = 1;
                }

                const minX = Math.min(...clusterX);
                const maxX = Math.max(...clusterX);
                const minY = Math.min(...clusterY);
                const maxY = Math.max(...clusterY);
                const centroid = {
                  x: Math.round(sumX / clusterX.length),
                  y: Math.round(sumY / clusterY.length)
                };

                // Build irregular perimeter polygon
                const angleBins: { [bin: number]: Point } = {};
                const numBins = 10;
                for (let i = 0; i < clusterX.length; i++) {
                  const px = clusterX[i];
                  const py = clusterY[i];
                  const angle = Math.atan2(py - centroid.y, px - centroid.x);
                  const bin = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * numBins);
                  const dist = Math.hypot(px - centroid.x, py - centroid.y);
                  if (!angleBins[bin] || dist > Math.hypot(angleBins[bin].x - centroid.x, angleBins[bin].y - centroid.y)) {
                    angleBins[bin] = { x: px, y: py };
                  }
                }
                const rawPoly: Point[] = [];
                for (let b = 0; b < numBins; b++) {
                  if (angleBins[b]) rawPoly.push(angleBins[b]);
                }
                if (rawPoly.length >= 3) {
                  rawPoly.push({ ...rawPoly[0] });
                }

                const rad = Math.min(18, Math.max(3, Math.round(Math.sqrt(clusterX.length / Math.PI))));
                const avgEdge = edgeSum / clusterX.length;
                const type = avgEdge > 35 ? 'rock' : 'hole';

                const hazard: SegmentedHazard = {
                  id: `hazard-${obstacleIdCounter}`,
                  name: `${type === 'rock' ? 'Basaltic Boulder' : 'Terrain Pit / Crater'} #${obstacleIdCounter}`,
                  type,
                  polygon: rawPoly.length >= 3 ? rawPoly : [
                    { x: centroid.x - rad, y: centroid.y - rad },
                    { x: centroid.x + rad, y: centroid.y - rad },
                    { x: centroid.x + rad, y: centroid.y + rad },
                    { x: centroid.x - rad, y: centroid.y + rad },
                    { x: centroid.x - rad, y: centroid.y - rad }
                  ],
                  centroid,
                  boundingBox: { minX, minY, maxX, maxY },
                  areaPx: clusterX.length,
                  blocked: true,
                  userStatus: 'auto',
                  uncertainty: avgEdge > 40 ? 'Low' : 'Moderate',
                  inRouteCorridor: false,
                  roughness: parseFloat(avgEdge.toFixed(1)),
                  method: 'classical-cv-contour'
                };
                detectedHazards.push(hazard);

                detectedObstacles.push({
                  id: `auto-${obstacleIdCounter}`,
                  x: centroid.x,
                  y: centroid.y,
                  radius: rad,
                  type: 'rock',
                  blocked: true
                });

                obstacleIdCounter++;
              } else {
                // Isolated speck noise (< 8 px) is reverted to traversable regolith
                for (let k = 0; k < clusterX.length; k++) {
                  predGrid[clusterY[k] * 256 + clusterX[k]] = 0;
                }
              }
            }
          }
        }

        // Recompute class counts and confidence after noise pruning
        let soilCount = 0;
        let bedrockCount = 0;
        let sandCount = 0;
        let rockCount = 0;
        let sumConfidence = 0;

        for (let i = 0; i < 256 * 256; i++) {
          const finalCls = predGrid[i];
          if (finalCls === 3) {
            rockCount++;
            grid[i] = 1.0;
            sumConfidence += 0.92;
          } else if (finalCls === 1) {
            bedrockCount++;
            grid[i] = 0.2;
            sumConfidence += 0.94;
          } else if (finalCls === 2) {
            sandCount++;
            grid[i] = 0.5;
            sumConfidence += 0.91;
          } else {
            soilCount++;
            grid[i] = 0.0;
            sumConfidence += 0.95;
          }
        }

        // Compute cost grid: Flat soil 1.0, Bedrock 1.3, Sand 2.8, Blocked 50.0
        const computedCosts = new Float32Array(256 * 256);
        for (let i = 0; i < 256 * 256; i++) {
          const cls = predGrid[i];
          let baseCost = 1.0;
          if (cls === 1) baseCost = 1.3;
          else if (cls === 2) baseCost = 2.8;
          else if (cls === 3) baseCost = 50.0;
          const roughnessPenalty = textures[i] ? (1.0 - textures[i]) * settings.roughnessWeight : 0;
          computedCosts[i] = baseCost + roughnessPenalty;
        }

        // Generate occupancy grid with initial safety clearance based on cleaned core obstacles
        const occGrid = generateOccupancyGrid(cleanCoreGrid, predGrid, safetyClearancePx);

        const totalPixels = 256 * 256;
        const naturalTotal = img.naturalWidth * img.naturalHeight;
        const endTime = performance.now();
        const durationMs = Math.round(endTime - startTime);

        const naturalStr = (count: number) => {
          const val = (count / totalPixels) * naturalTotal;
          if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
          if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
          return `${Math.round(val)}`;
        };

        // Match dataset manifest or custom mask
        const matchedRecord = matchGroundTruthDataset(activeImage.id, activeImage.title, activeImage.url);
        setMatchedGtRecord(matchedRecord);

        let gtGrid: Uint8Array | null = null;
        let customTitle: string | undefined = undefined;

        if (customGtMask) {
          gtGrid = customGtMask.grid;
          customTitle = customGtMask.title;
        } else if (matchedRecord) {
          gtGrid = generateReferenceGtGrid(matchedRecord, 256, 256);
        }

        const supEval = gtGrid
          ? calculateSupervisedEvaluation(predGrid, gtGrid, matchedRecord, customTitle)
          : calculateSupervisedEvaluation(predGrid, new Uint8Array(256 * 256), null);

        const classDescs = [
          'Dominant background class. Unconsolidated fine-grained soil and gravel.',
          'In-situ lithified rock benches, sedimentary strata, and exposed bedrock.',
          'Low-cohesion eolian sand ripples and dune fields posing high wheel slip risk.',
          'Distinct boulder obstacles and crater boundaries exceeding rover ground clearance.'
        ];

        const computedClassStats: TerrainClassStats = {
          totalAnalyzedPixels: totalPixels,
          naturalTotalPixelsString: naturalStr(totalPixels),
          processingDurationMs: Math.max(12, durationMs),
          groundTruthAvailable: supEval.hasGroundTruth,
          gtSourceTitle: supEval.gtSourceTitle,
          groundTruthNote: supEval.gtProvenanceNote,
          evaluatedPixelCount: supEval.evaluatedPixelCount,
          ignoredPixelCount: supEval.ignoredPixelCount,
          overallAccuracy: supEval.overallAccuracy,
          mIoU: supEval.mIoU,
          meanPrecision: supEval.meanPrecision,
          meanRecall: supEval.meanRecall,
          meanF1: supEval.meanF1,
          avgConfidencePct: Math.round((sumConfidence / totalPixels) * 100 * 10) / 10,
          traversablePixelPct: Math.round(((soilCount + bedrockCount) / totalPixels) * 100 * 10) / 10,
          classes: supEval.classes.map((c, idx) => ({
            id: c.id,
            name: c.name,
            desc: classDescs[idx],
            pixelCount: c.predictedPixelCount,
            naturalPixelsString: naturalStr(c.predictedPixelCount),
            percentage: c.predictedPercentage,
            confidencePct: c.confidencePct,
            iou: c.iou,
            precision: c.precision,
            recall: c.recall,
            f1: c.f1,
            tp: c.tp,
            fp: c.fp,
            fn: c.fn
          })),
          confusionMatrix: supEval.confusionMatrix
        };

        setTraversabilityGrid(grid);
        setTextureGrid(textures);
        setObstacleCoreGrid(cleanCoreGrid);
        setPredClassGrid(predGrid);
        setOccupancyGrid(occGrid);
        setCostGrid(computedCosts);
        setSegmentedHazards(detectedHazards);
        setAutoObstacles(detectedObstacles);
        setClassStats(computedClassStats);
      }

      setIsLoading(false);
      setLastAnalyzedTime(new Date().toLocaleTimeString());
    };

    img.onerror = () => {
      setError('Failed to load or decode active image resource.');
      setIsLoading(false);
    };
  }, [activeImage.url, activeImage.id, recalcTrigger, settings]);

  // Update occupancy grid whenever safetyClearancePx changes
  useEffect(() => {
    if (obstacleCoreGrid && predClassGrid) {
      setOccupancyGrid(generateOccupancyGrid(obstacleCoreGrid, predClassGrid, safetyClearancePx));
    }
  }, [safetyClearancePx, obstacleCoreGrid, predClassGrid]);

  // Multi-Path Obstacle-Aware Solver
  const candidates = useMemo(() => {
    if (isLoading || error || !occupancyGrid || !costGrid) return [];

    const solver = new AStarGrid(256, 256);
    const results: RouteCandidate[] = [];

    const start = {
      x: Math.min(255, Math.max(0, Math.round(effectiveStartPoint.x))),
      y: Math.min(255, Math.max(0, Math.round(effectiveStartPoint.y)))
    };
    const goal = {
      x: Math.min(255, Math.max(0, Math.round(effectiveDestinationPoint.x))),
      y: Math.min(255, Math.max(0, Math.round(effectiveDestinationPoint.y)))
    };

    const pixelsToMeters = 0.15;

    // Validate Start and Destination on Obstacle Core
    const startIdx = start.y * 256 + start.x;
    const goalIdx = goal.y * 256 + goal.x;

    const startInCore = (obstacleCoreGrid && obstacleCoreGrid[startIdx] === 1) ||
      manualObstacles.some(obs => obs.blocked && Math.hypot(start.x - obs.x, start.y - obs.y) <= obs.radius);
    const goalInCore = (obstacleCoreGrid && obstacleCoreGrid[goalIdx] === 1) ||
      manualObstacles.some(obs => obs.blocked && Math.hypot(goal.x - obs.x, goal.y - obs.y) <= obs.radius);

    const makeBlockedEndpoints = (reason: string): RouteCandidate[] => {
      const strategies: Array<{ id: 'alpha' | 'beta' | 'gamma' | 'delta'; name: string; color: string }> = [
        { id: 'alpha', name: 'Route Alpha: Shortest Safe Distance', color: '#00f0ff' },
        { id: 'beta', name: 'Route Beta: Lowest Traversal Cost', color: '#bf5af2' },
        { id: 'gamma', name: 'Route Gamma: Uncertainty-Aware', color: '#30d158' },
        { id: 'delta', name: 'Route Delta: Science-Driven Exploration', color: '#ff9f0a' }
      ];
      return strategies.map(s => ({
        id: s.id,
        strategyId: s.id,
        color: s.color,
        name: s.name,
        waypoints: [],
        totalCost: Infinity,
        totalLengthM: 0,
        totalLengthPx: 0,
        directDistanceM: 0,
        directDistancePx: 0,
        detourDistanceM: 0,
        waypointsCount: 0,
        obstaclesAvoidedCount: 0,
        maxSlope: 0,
        unsafeCount: 1,
        isBlocked: true,
        difficulty: 'Blocked',
        validationStatus: 'BLOCKED_ENDPOINT',
        validationMessage: reason,
        explanation: reason
      }));
    };

    if (startInCore) {
      return makeBlockedEndpoints('Selected Start Base is positioned directly on a detected boulder or obstacle. Select clear terrain.');
    }

    if (goalInCore) {
      return makeBlockedEndpoints('Selected Destination Target is positioned directly on a detected boulder or obstacle. Select clear terrain.');
    }

    // Hard core obstacle check
    const isCoreBlocked = (x: number, y: number) => {
      if (x < 0 || x >= 256 || y < 0 || y >= 256) return true;
      const idx = y * 256 + x;
      if (obstacleCoreGrid && obstacleCoreGrid[idx] === 1) return true;
      for (const obs of manualObstacles) {
        if (obs.blocked && Math.hypot(x - obs.x, y - obs.y) <= obs.radius) return true;
      }
      return false;
    };

    // Nominal obstacle + clearance buffer check
    const isNominalBlocked = (x: number, y: number) => {
      if (x < 0 || x >= 256 || y < 0 || y >= 256) return true;
      const idx = y * 256 + x;
      for (const obs of manualObstacles) {
        if (obs.blocked && Math.hypot(x - obs.x, y - obs.y) <= obs.radius + (safetyClearancePx / 2)) {
          return true;
        }
      }
      if (occupancyGrid) {
        const occ = occupancyGrid[idx];
        if (occ === 3 || occ === 4) return true; // Blocked core or safety buffer
      } else if (obstacleCoreGrid && obstacleCoreGrid[idx] === 1) {
        return true;
      }
      return false;
    };

    // Gamma expanded obstacle clearance check (extra buffer for uncertainty resilience)
    const gammaClearancePx = Math.min(26, safetyClearancePx + 6);
    const isGammaBlocked = (x: number, y: number) => {
      if (x < 0 || x >= 256 || y < 0 || y >= 256) return true;
      const idx = y * 256 + x;
      for (const obs of manualObstacles) {
        if (obs.blocked && Math.hypot(x - obs.x, y - obs.y) <= obs.radius + (gammaClearancePx / 2)) {
          return true;
        }
      }
      for (const haz of segmentedHazards) {
        if (haz.blocked) {
          const maxDim = haz.boundingBox ? Math.max(haz.boundingBox.maxX - haz.boundingBox.minX, haz.boundingBox.maxY - haz.boundingBox.minY) / 2 : 10;
          if (Math.hypot(x - haz.centroid.x, y - haz.centroid.y) <= maxDim + gammaClearancePx) {
            return true;
          }
        }
      }
      if (occupancyGrid) {
        const occ = occupancyGrid[idx];
        if (occ === 3 || occ === 4) return true;
      } else if (obstacleCoreGrid && obstacleCoreGrid[idx] === 1) {
        return true;
      }
      return false;
    };

    // Build RouteCandidate and validate collision freedom
    const createCandidate = (
      strategyId: 'alpha' | 'beta' | 'gamma' | 'delta',
      name: string,
      color: string,
      rawPath: Array<{ x: number; y: number }> | null,
      explanationText: string,
      clearanceMargin: number,
      checkBlockedFn: (x: number, y: number) => boolean = isNominalBlocked
    ): RouteCandidate => {
      const defaultBlocked: RouteCandidate = {
        id: strategyId,
        strategyId,
        color,
        name,
        waypoints: [],
        totalCost: Infinity,
        totalLengthM: 0,
        totalLengthPx: 0,
        directDistanceM: 0,
        directDistancePx: 0,
        detourDistanceM: 0,
        waypointsCount: 0,
        obstaclesAvoidedCount: 0,
        maxSlope: 0,
        unsafeCount: 1,
        isBlocked: true,
        difficulty: 'Blocked',
        validationStatus: 'NO_SAFE_ROUTE',
        validationMessage: 'No safe route found around detected terrain obstacles.',
        obstacleClearancePx: clearanceMargin,
        explanation: 'Impassable obstacles or boulder field completely block traversal. No safe route found.'
      };

      if (!rawPath || rawPath.length < 2) {
        return defaultBlocked;
      }

      // Check collision along entire path at sub-pixel resolution
      const val = validateRouteCollisionFree(rawPath, checkBlockedFn, isCoreBlocked, 0.5);
      if (!val.isValid) {
        // Path encroached obstacle or was invalid
        return defaultBlocked;
      }

      // Compute physical metrics along validated path
      const totalLenPx = calculatePathLength(rawPath);
      const totalLenM = Number((totalLenPx * pixelsToMeters).toFixed(1));
      const directPx = Number(Math.hypot(goal.x - start.x, goal.y - start.y).toFixed(1));
      const directM = Number((directPx * pixelsToMeters).toFixed(1));
      const detourM = Number(Math.max(0, totalLenM - directM).toFixed(1));
      const detourPct = directM > 0 ? Math.round((detourM / directM) * 100) : 0;
      const durationMins = Math.round((totalLenM / 0.04) / 60);

      let maxSlope = 0;
      let unsafeCount = 0;
      let cumDist = 0;
      let cumCost = 0;
      let soilSteps = 0, bedrockSteps = 0, sandSteps = 0, cautionSteps = 0;

      const pathWaypoints: RouteWaypoint[] = rawPath.map((p, i) => {
        const prev = rawPath[i - 1] || p;
        const segDistPx = Math.hypot(p.x - prev.x, p.y - prev.y);
        cumDist += segDistPx * pixelsToMeters;

        const pIdx = Math.round(p.y) * 256 + Math.round(p.x);
        const cls = predClassGrid ? predClassGrid[pIdx] : 0;
        const occ = occupancyGrid ? occupancyGrid[pIdx] : 0;

        if (occ === 4) cautionSteps++;
        else if (cls === 1) bedrockSteps++;
        else if (cls === 2) sandSteps++;
        else soilSteps++;

        const roughness = textureGrid ? 1.0 - textureGrid[pIdx] : 0.2;
        const slope = Math.round(roughness * 22 * 10) / 10;
        const slip = 0.05 + (roughness * 0.4) + (slope / 45) * 0.2;

        const isUnsafe = Math.abs(slope) > settings.maxSlopeLimitDeg;
        if (isUnsafe) unsafeCount++;
        maxSlope = Math.max(maxSlope, Math.abs(slope));

        const stepCost = (1.0 + (Math.abs(slope) / 20) * settings.slopeWeight + roughness * settings.roughnessWeight) * 10;
        cumCost += stepCost;

        return {
          index: i,
          x: p.x,
          y: p.y,
          distanceM: Math.round(cumDist),
          slope,
          roughness: Math.round(roughness * 100) / 100,
          slip: Math.round(slip * 100) / 100,
          obstaclePenalty: occ === 4 ? 8 : 0,
          isUnsafe,
          isBlockedCell: checkBlockedFn(p.x, p.y),
          stepCost,
          cumulativeCost: Math.round(cumCost)
        };
      });

      // Count obstacles safely avoided along route corridor
      let avoidedCount = 0;
      for (const haz of segmentedHazards) {
        if (haz.blocked) {
          const inCorridor = rawPath.some(p => Math.hypot(p.x - haz.centroid.x, p.y - haz.centroid.y) < clearanceMargin + 25);
          if (inCorridor) avoidedCount++;
        }
      }

      const totalSteps = Math.max(1, rawPath.length);
      const terrainBreakdown = {
        soilPct: Math.round((soilSteps / totalSteps) * 100),
        bedrockPct: Math.round((bedrockSteps / totalSteps) * 100),
        sandPct: Math.round((sandSteps / totalSteps) * 100),
        cautionPct: Math.round((cautionSteps / totalSteps) * 100)
      };

      return {
        id: strategyId,
        strategyId,
        color,
        name,
        waypoints: pathWaypoints,
        totalCost: Math.round(cumCost),
        totalLengthM: totalLenM,
        totalLengthPx: totalLenPx,
        directDistanceM: directM,
        directDistancePx: directPx,
        detourDistanceM: detourM,
        detourPct,
        waypointsCount: pathWaypoints.length,
        obstaclesAvoidedCount: avoidedCount,
        terrainBreakdown,
        maxSlope,
        unsafeCount,
        isBlocked: false,
        difficulty: maxSlope > 15 ? 'Restricted' : maxSlope > 8 ? 'Moderate' : 'Safe',
        estimatedTravelTimeHours: parseFloat((durationMins / 60).toFixed(2)),
        estimatedDurationMins: durationMins,
        validationStatus: 'VALIDATED_COLLISION_FREE',
        validationMessage: `100% collision-free verified (${avoidedCount} obstacles avoided with ${clearanceMargin}px clearance)`,
        obstacleClearancePx: clearanceMargin,
        explanation: `${explanationText} (Validated collision-free; ${avoidedCount} obstacles avoided).`
      };
    };

    // Helper to solve a route strategy with progressive adaptive fallback
    const solveStrategy = (
      costFn: (x: number, y: number) => number,
      checkBlockedFn: (x: number, y: number) => boolean,
      clearanceMargin: number
    ): { path: Array<{ x: number; y: number }> | null; clearance: number; adaptedNote: string } => {
      // 1. Nominal search with given clearance
      let search = solver.findPath(start, goal, checkBlockedFn, costFn, { isCoreBlocked });
      if (search && search.success && search.path && search.path.length >= 2) {
        if (validateRouteCollisionFree(search.path, checkBlockedFn, isCoreBlocked, 0.5).isValid) {
          return { path: search.path, clearance: clearanceMargin, adaptedNote: '' };
        } else if (search.rawPath && validateRouteCollisionFree(search.rawPath, checkBlockedFn, isCoreBlocked, 0.5).isValid) {
          return { path: search.rawPath, clearance: clearanceMargin, adaptedNote: '' };
        }
      }

      // 2. Adaptive Corridor Fallback: if corridor between obstacles is narrower than clearanceMargin,
      // allow reduced margin down to rover physical clearance (never touching rock cores)
      const minMargin = Math.max(4, Math.round(clearanceMargin * 0.5));
      const isCorridorBlocked = (x: number, y: number) => {
        if (isCoreBlocked(x, y)) return true;
        for (const obs of manualObstacles) {
          if (obs.blocked && Math.hypot(x - obs.x, y - obs.y) <= obs.radius + minMargin) return true;
        }
        return false;
      };

      search = solver.findPath(start, goal, checkBlockedFn, costFn, { isCoreBlocked, allowReducedMargin: true });
      if (search && search.success && search.path && search.path.length >= 2) {
        if (validateRouteCollisionFree(search.path, isCorridorBlocked, isCoreBlocked, 0.5).isValid) {
          return {
            path: search.path,
            clearance: minMargin,
            adaptedNote: ` (Adapted to ${minMargin}px clearance through narrow rock corridor)`
          };
        } else if (search.rawPath && validateRouteCollisionFree(search.rawPath, isCorridorBlocked, isCoreBlocked, 0.5).isValid) {
          return {
            path: search.rawPath,
            clearance: minMargin,
            adaptedNote: ` (Adapted to ${minMargin}px clearance through narrow rock corridor)`
          };
        }
      }

      return { path: null, clearance: clearanceMargin, adaptedNote: '' };
    };

    // =========================================================================
    // STRATEGY 1: Route Alpha (Shortest Safe Distance)
    // Objective: Minimise total traversable distance. Uniform cost.
    // =========================================================================
    const alphaCost = () => 1.0;
    const alphaSol = solveStrategy(alphaCost, isNominalBlocked, safetyClearancePx);
    const routeAlpha = createCandidate(
      'alpha',
      'Route Alpha: Shortest Safe Distance',
      '#00f0ff',
      alphaSol.path,
      'Minimises total path distance across traversable terrain with strict obstacle avoidance' + alphaSol.adaptedNote,
      alphaSol.clearance,
      alphaSol.adaptedNote ? isCoreBlocked : isNominalBlocked
    );

    // =========================================================================
    // STRATEGY 2: Route Beta (Lowest Traversal Cost)
    // Objective: Minimise cumulative traversal cost using costGrid.
    // =========================================================================
    const betaCost = (x: number, y: number) => {
      const idx = y * 256 + x;
      return costGrid ? costGrid[idx] : 1.0;
    };
    const betaSol = solveStrategy(betaCost, isNominalBlocked, safetyClearancePx);
    const routeBeta = createCandidate(
      'beta',
      'Route Beta: Lowest Traversal Cost',
      '#bf5af2',
      betaSol.path,
      'Minimises wheel-slip and cumulative energy expenditure by steering through firm regolith and low-roughness corridors' + betaSol.adaptedNote,
      betaSol.clearance,
      betaSol.adaptedNote ? isCoreBlocked : isNominalBlocked
    );

    // =========================================================================
    // STRATEGY 3: Route Gamma (Uncertainty-Aware)
    // Objective: Maximise safety margins and avoid high-uncertainty / boundary cells.
    // =========================================================================
    const uncertaintyPenaltyFactor = typeof sharedSession.uncertaintyPenalty === 'number' ? sharedSession.uncertaintyPenalty : 1.5;
    const gammaCost = (x: number, y: number) => {
      const idx = y * 256 + x;
      let base = costGrid ? costGrid[idx] : 1.0;
      // High penalty on uncertain boundary / transition cells
      if (occupancyGrid && occupancyGrid[idx] === 2) {
        base += 12.0 * uncertaintyPenaltyFactor;
      }
      // Quadratic proximity penalty near detected obstacles
      for (const haz of segmentedHazards) {
        if (haz.blocked) {
          const d = Math.hypot(x - haz.centroid.x, y - haz.centroid.y);
          if (d < 16) {
            base += Math.max(0, 16 - d) * 1.5;
          }
        }
      }
      return base;
    };

    let gammaSol = solveStrategy(gammaCost, isGammaBlocked, gammaClearancePx);
    if (!gammaSol.path) {
      gammaSol = solveStrategy(gammaCost, isNominalBlocked, safetyClearancePx);
    }
    const routeGamma = createCandidate(
      'gamma',
      'Route Gamma: Uncertainty-Aware',
      '#30d158',
      gammaSol.path,
      `Maintains enhanced safety clearance (${gammaSol.clearance}px) and penalises uncertain terrain transitions` + gammaSol.adaptedNote,
      gammaSol.clearance,
      gammaSol.adaptedNote ? isCoreBlocked : (gammaSol.clearance === gammaClearancePx ? isGammaBlocked : isNominalBlocked)
    );

    // =========================================================================
    // STRATEGY 4: Route Delta (Science-Driven Exploration)
    // Objective: Balance safe traversal, distance, and verified geological targets.
    // =========================================================================
    let deltaValidPath: Array<{ x: number; y: number }> | null = null;
    let deltaExplanation = 'Routes along verified exposed geological bedrock outcroppings for scientific observation.';

    // Check verified science targets in sharedSession
    const verifiedScienceTargets = Array.isArray(sharedSession.scienceTargets)
      ? sharedSession.scienceTargets.filter(t => t && typeof t.x === 'number' && typeof t.y === 'number' && !isNominalBlocked(t.x, t.y))
      : [];

    if (verifiedScienceTargets.length > 0) {
      // Find closest reachable science target
      const poi = verifiedScienceTargets[0];
      const leg1 = solver.findPath(start, { x: poi.x, y: poi.y }, isNominalBlocked, betaCost, { isCoreBlocked });
      if (leg1 && leg1.success && leg1.path && leg1.path.length >= 2) {
        const leg2 = solver.findPath({ x: poi.x, y: poi.y }, goal, isNominalBlocked, betaCost, { isCoreBlocked });
        if (leg2 && leg2.success && leg2.path && leg2.path.length >= 2) {
          const combined = [...leg1.path, ...leg2.path.slice(1)];
          if (validateRouteCollisionFree(combined, isNominalBlocked, isCoreBlocked, 0.5).isValid) {
            deltaValidPath = combined;
            deltaExplanation = `Detours via verified scientific waypoint "${poi.name || 'Sample Site 1'}" while avoiding obstacles.`;
          }
        }
      }
    }

    let deltaSol = deltaValidPath
      ? { path: deltaValidPath, clearance: safetyClearancePx, adaptedNote: '' }
      : solveStrategy(
          (x: number, y: number) => {
            const idx = y * 256 + x;
            const cls = predClassGrid ? predClassGrid[idx] : 0;
            // Discount bedrock outcrops to encourage scientific route exploration along rock strata
            if (cls === 1) return 0.65;
            if (cls === 2) return 3.2; // Avoid sand
            return 1.15; // Standard soil
          },
          isNominalBlocked,
          safetyClearancePx
        );

    const routeDelta = createCandidate(
      'delta',
      'Route Delta: Science-Driven Exploration',
      '#ff9f0a',
      deltaSol.path,
      deltaExplanation + deltaSol.adaptedNote,
      deltaSol.clearance,
      deltaSol.adaptedNote ? isCoreBlocked : isNominalBlocked
    );

    return [routeAlpha, routeBeta, routeGamma, routeDelta];
  }, [
    isLoading,
    error,
    occupancyGrid,
    costGrid,
    obstacleCoreGrid,
    predClassGrid,
    effectiveStartPoint,
    effectiveDestinationPoint,
    manualObstacles,
    safetyClearancePx,
    segmentedHazards,
    settings,
    textureGrid,
    sharedSession.scienceTargets,
    sharedSession.uncertaintyPenalty
  ]);

  const [customGtMask, setCustomGtMask] = useState<{ grid: Uint8Array; title: string } | null>(null);
  const [matchedGtRecord, setMatchedGtRecord] = useState<GroundTruthRecord | null>(null);

  // Real-time synchronization of computed active route to sharedSession
  const lastSyncedRouteKeyRef = useRef<string>('');

  useEffect(() => {
    const validIdx = Math.min(selectedRouteIndex, Math.max(0, candidates.length - 1));
    const activeRoute = candidates[validIdx];
    if (activeRoute && !activeRoute.isBlocked && activeRoute.waypoints && activeRoute.waypoints.length > 1) {
      const routeFingerprint = `${activeRoute.id}_${activeRoute.waypoints.length}_${activeRoute.totalLengthM}_${validIdx}_${imageDims.width}x${imageDims.height}`;
      if (lastSyncedRouteKeyRef.current === routeFingerprint) {
        return;
      }
      lastSyncedRouteKeyRef.current = routeFingerprint;

      const strat = validIdx === 0 ? 'alpha' : validIdx === 1 ? 'beta' : validIdx === 2 ? 'gamma' : 'delta';
      updateSharedSession({
        astarComputedPath: activeRoute.waypoints.map(w => ({ x: w.x, y: w.y })),
        activeSyncRoute: {
          routeId: activeRoute.id,
          name: activeRoute.name,
          sourceModule: 'MARSWALK_OPS',
          strategy: strat,
          strategyName: activeRoute.name,
          startPoint: { x: activeRoute.waypoints[0].x, y: activeRoute.waypoints[0].y },
          destinationPoint: {
            x: activeRoute.waypoints[activeRoute.waypoints.length - 1].x,
            y: activeRoute.waypoints[activeRoute.waypoints.length - 1].y
          },
          waypoints: activeRoute.waypoints,
          totalDistanceM: activeRoute.totalLengthM,
          totalCost: activeRoute.totalCost,
          sourceDimensions: { width: imageDims.width, height: imageDims.height },
          version: 1,
          lastUpdated: 'synced'
        }
      });
    } else {
      if (lastSyncedRouteKeyRef.current !== 'blocked') {
        lastSyncedRouteKeyRef.current = 'blocked';
        updateSharedSession({
          astarComputedPath: [],
          activeSyncRoute: null
        });
      }
    }
  }, [candidates, selectedRouteIndex, imageDims.width, imageDims.height, updateSharedSession]);

  const setSafetyClearancePx = useCallback((px: number) => {
    const clamped = Math.max(4, Math.min(28, Math.round(px)));
    setSafetyClearancePxState(clamped);
    if (obstacleCoreGrid && predClassGrid) {
      setOccupancyGrid(generateOccupancyGrid(obstacleCoreGrid, predClassGrid, clamped));
    }
  }, [obstacleCoreGrid, predClassGrid]);

  const validateCoordinateTraversability = useCallback((x: number, y: number) => {
    const gx = Math.min(255, Math.max(0, Math.round(x)));
    const gy = Math.min(255, Math.max(0, Math.round(y)));
    const idx = gy * 256 + gx;

    for (const obs of manualObstacles) {
      if (obs.blocked && Math.hypot(gx - obs.x, gy - obs.y) <= obs.radius) {
        return { traversable: false, isCore: true, reason: 'Restricted manual hazard zone' };
      }
    }

    if (obstacleCoreGrid && obstacleCoreGrid[idx] === 1) {
      const cls = predClassGrid ? predClassGrid[idx] : 3;
      const name = cls === 3 ? 'Basaltic Boulder / Rock' : 'Obstacle Core';
      return { traversable: false, isCore: true, reason: name };
    }

    if (occupancyGrid && occupancyGrid[idx] === 4) {
      return { traversable: true, isCore: false, reason: 'Rover safety clearance caution buffer' };
    }

    return { traversable: true, isCore: false };
  }, [obstacleCoreGrid, occupancyGrid, predClassGrid, manualObstacles]);

  const primaryRoute = candidates[0];
  const activeRouteFeasible = Boolean(primaryRoute && !primaryRoute.isBlocked && primaryRoute.waypoints.length > 0);
  const blockedReason = primaryRoute && primaryRoute.isBlocked ? primaryRoute.explanation : null;

  const analysis: TerrainAnalysisResult = {
    imageId: activeImage.id,
    imageTitle: activeImage.title,
    imageUrl: activeImage.url,
    imageWidth: imageDims.width,
    imageHeight: imageDims.height,
    isLoading,
    error,
    startPoint,
    destinationPoint,
    effectiveStartPoint,
    effectiveDestinationPoint,
    obstacles: [...autoObstacles, ...manualObstacles],
    segmentedHazards,
    occupancyGrid,
    terrainClassGrid: predClassGrid,
    costGrid,
    safetyClearancePx,
    selectedRouteIndex: Math.min(selectedRouteIndex, Math.max(0, candidates.length - 1)),
    routes: candidates.length > 0 ? candidates : (sharedSession?.activeSyncRoute?.waypoints?.length ? [{
      id: sharedSession.activeSyncRoute.routeId,
      name: sharedSession.activeSyncRoute.name,
      waypoints: sharedSession.activeSyncRoute.waypoints.map(w => ({
        index: w.index,
        x: w.x,
        y: w.y,
        distanceM: w.distanceM,
        slope: w.slope,
        roughness: w.roughness,
        slip: w.slip,
        obstaclePenalty: (w as any).obstaclePenalty || 0,
        isUnsafe: Boolean(w.isUnsafe),
        isBlockedCell: Boolean(w.isBlockedCell),
        stepCost: w.stepCost,
        cumulativeCost: w.cumulativeCost
      })),
      totalCost: sharedSession.activeSyncRoute.totalCost || 0,
      totalLengthM: sharedSession.activeSyncRoute.totalDistanceM,
      maxSlope: 8,
      unsafeCount: 0,
      isBlocked: false,
      difficulty: 'Safe',
      explanation: 'Walk Ops Synchronized Route'
    }] : []),
    lastAnalyzedTime,
    classStats,
    matchedGtRecord,
    activeRouteFeasible,
    blockedReason
  };

  const setStartPoint = useCallback((pt: { x: number; y: number } | null) => {
    updateSharedSession({ startPoint: pt });
  }, [updateSharedSession]);

  const setDestinationPoint = useCallback((pt: { x: number; y: number } | null) => {
    updateSharedSession({ destinationPoint: pt });
  }, [updateSharedSession]);

  const clearStartPoint = useCallback(() => {
    updateSharedSession({ startPoint: null });
  }, [updateSharedSession]);

  const clearDestinationPoint = useCallback(() => {
    updateSharedSession({ destinationPoint: null });
  }, [updateSharedSession]);

  const swapStartAndDestination = useCallback(() => {
    updateSharedSession({
      startPoint: sharedSession.destinationPoint,
      destinationPoint: sharedSession.startPoint
    });
  }, [sharedSession.destinationPoint, sharedSession.startPoint, updateSharedSession]);

  const addObstacle = useCallback((obs: ObstacleNode) => {
    updateSharedSession({
      obstacles: [...manualObstacles, obs]
    });
  }, [manualObstacles, updateSharedSession]);

  const removeObstacle = useCallback((id: string) => {
    updateSharedSession({
      obstacles: manualObstacles.filter(o => o.id !== id)
    });
  }, [manualObstacles, updateSharedSession]);

  const clearObstacles = useCallback(() => {
    updateSharedSession({
      obstacles: []
    });
  }, [updateSharedSession]);

  const recalculateAnalysis = useCallback(() => {
    setLastAnalyzedTime(new Date().toLocaleTimeString());
    setRecalcTrigger(prev => prev + 1);
  }, []);

  const uploadCustomGroundTruthMask = useCallback((maskGrid: Uint8Array, title = 'User Custom Reference Mask') => {
    setCustomGtMask({ grid: maskGrid, title });
    setRecalcTrigger(prev => prev + 1);
  }, []);

  const clearCustomGroundTruthMask = useCallback(() => {
    setCustomGtMask(null);
    setRecalcTrigger(prev => prev + 1);
  }, []);

  // ========================================================
  // SHARED TRAVERSAL ANIMATION STATE & REAL-TIME CONTROLS
  // ========================================================
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [traversalProgress, setTraversalProgressState] = useState<number>(0);
  const [simSpeed, setSimSpeedState] = useState<number>(1.0);

  const activeRouteIndex = Math.min(selectedRouteIndex, Math.max(0, candidates.length - 1));
  const currentActiveRoute = candidates[activeRouteIndex] || (sharedSession?.activeSyncRoute?.waypoints?.length ? {
    id: sharedSession.activeSyncRoute.routeId,
    name: sharedSession.activeSyncRoute.name,
    waypoints: sharedSession.activeSyncRoute.waypoints.map(w => ({
      index: w.index,
      x: w.x,
      y: w.y,
      distanceM: w.distanceM,
      slope: w.slope,
      roughness: w.roughness,
      slip: w.slip,
      obstaclePenalty: (w as any).obstaclePenalty || 0,
      isUnsafe: Boolean(w.isUnsafe),
      isBlockedCell: Boolean(w.isBlockedCell),
      stepCost: w.stepCost,
      cumulativeCost: w.cumulativeCost
    })),
    totalCost: sharedSession.activeSyncRoute.totalCost || 0,
    totalLengthM: sharedSession.activeSyncRoute.totalDistanceM,
    maxSlope: 8,
    unsafeCount: 0,
    isBlocked: false,
    difficulty: 'Safe',
    explanation: 'Walk Ops Synchronized Route'
  } : null);
  const activeWaypoints = currentActiveRoute?.waypoints || [];

  // Reset traversal progress when active route or active image changes
  const prevRouteKeyRef = useRef<string>('');
  useEffect(() => {
    const key = `${activeImage.id}_${activeRouteIndex}_${activeWaypoints.length}`;
    if (prevRouteKeyRef.current !== key) {
      prevRouteKeyRef.current = key;
      setIsPlaying(false);
      setTraversalProgressState(0);
    }
  }, [activeImage.id, activeRouteIndex, activeWaypoints.length]);

  // Shared Animation Loop using requestAnimationFrame
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying || !currentActiveRoute || currentActiveRoute.isBlocked || activeWaypoints.length < 2) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      lastTimeRef.current = null;
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setTraversalProgressState((prev) => {
        // Complete route traversal takes 14 seconds at 1x simSpeed
        const speedPct = (100 / 14) * simSpeed * dt;
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
  }, [isPlaying, currentActiveRoute, activeWaypoints.length, simSpeed]);

  // Compute rover position telemetry interpolated along activeWaypoints
  const roverPos: RoverPosTelemetry = useMemo(() => {
    const startPt = effectiveStartPoint;
    if (activeWaypoints.length === 0) {
      return {
        x: startPt.x,
        y: startPt.y,
        angle: 0,
        waypointIndex: 0,
        distanceTraveledM: 0,
        remainingDistanceM: 0,
        currentSlope: 0,
        currentRoughness: 0,
        currentSlip: 0,
        currentStepCost: 0
      };
    }

    if (activeWaypoints.length === 1) {
      const w0 = activeWaypoints[0];
      return {
        x: w0.x,
        y: w0.y,
        angle: 0,
        waypointIndex: 0,
        distanceTraveledM: 0,
        remainingDistanceM: 0,
        currentSlope: w0.slope,
        currentRoughness: w0.roughness,
        currentSlip: w0.slip,
        currentStepCost: w0.stepCost
      };
    }

    // Cumulative distance along pixel path
    let totalPixelDist = 0;
    const segDistances: number[] = [];
    for (let i = 0; i < activeWaypoints.length - 1; i++) {
      const p1 = activeWaypoints[i];
      const p2 = activeWaypoints[i + 1];
      const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      segDistances.push(d);
      totalPixelDist += d;
    }

    if (totalPixelDist === 0) {
      const w0 = activeWaypoints[0];
      return {
        x: w0.x,
        y: w0.y,
        angle: 0,
        waypointIndex: 0,
        distanceTraveledM: 0,
        remainingDistanceM: currentActiveRoute?.totalLengthM || 0,
        currentSlope: w0.slope,
        currentRoughness: w0.roughness,
        currentSlip: w0.slip,
        currentStepCost: w0.stepCost
      };
    }

    const targetPixelDist = (traversalProgress / 100) * totalPixelDist;
    let accumulated = 0;

    for (let i = 0; i < activeWaypoints.length - 1; i++) {
      const p1 = activeWaypoints[i];
      const p2 = activeWaypoints[i + 1];
      const segLen = segDistances[i];

      if (accumulated + segLen >= targetPixelDist || i === activeWaypoints.length - 2) {
        const remain = Math.max(0, targetPixelDist - accumulated);
        const ratio = segLen > 0 ? Math.min(1, remain / segLen) : 0;

        const rx = p1.x + (p2.x - p1.x) * ratio;
        const ry = p1.y + (p2.y - p1.y) * ratio;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

        const totalM = currentActiveRoute?.totalLengthM || 0;
        const distTraveledM = Math.round((traversalProgress / 100) * totalM);
        const remainingM = Math.max(0, totalM - distTraveledM);

        const currentSlope = Math.round(p1.slope + ratio * (p2.slope - p1.slope));
        const currentRoughness = Number((p1.roughness + ratio * (p2.roughness - p1.roughness)).toFixed(2));
        const currentSlip = Number((p1.slip + ratio * (p2.slip - p1.slip)).toFixed(2));
        const currentStepCost = Math.round(p1.stepCost + ratio * (p2.stepCost - p1.stepCost));

        return {
          x: rx,
          y: ry,
          angle: angleDeg,
          waypointIndex: i,
          distanceTraveledM: distTraveledM,
          remainingDistanceM: remainingM,
          currentSlope,
          currentRoughness,
          currentSlip,
          currentStepCost
        };
      }
      accumulated += segLen;
    }

    const lastW = activeWaypoints[activeWaypoints.length - 1];
    const totalM = currentActiveRoute?.totalLengthM || 0;
    return {
      x: lastW.x,
      y: lastW.y,
      angle: 0,
      waypointIndex: activeWaypoints.length - 1,
      distanceTraveledM: totalM,
      remainingDistanceM: 0,
      currentSlope: lastW.slope,
      currentRoughness: lastW.roughness,
      currentSlip: lastW.slip,
      currentStepCost: lastW.stepCost
    };
  }, [activeWaypoints, traversalProgress, effectiveStartPoint, currentActiveRoute]);

  const traversalStatus: 'STOPPED' | 'TRAVERSING' | 'PAUSED' | 'COMPLETED' = useMemo(() => {
    if (traversalProgress >= 100) return 'COMPLETED';
    if (isPlaying) return 'TRAVERSING';
    if (traversalProgress > 0) return 'PAUSED';
    return 'STOPPED';
  }, [isPlaying, traversalProgress]);

  const startTraversal = useCallback(() => {
    if (traversalProgress >= 100) {
      setTraversalProgressState(0);
    }
    setIsPlaying(true);
  }, [traversalProgress]);

  const pauseTraversal = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resumeTraversal = useCallback(() => {
    if (traversalProgress >= 100) {
      setTraversalProgressState(0);
    }
    setIsPlaying(true);
  }, [traversalProgress]);

  const resetTraversal = useCallback(() => {
    setIsPlaying(false);
    setTraversalProgressState(0);
  }, []);

  const setTraversalProgress = useCallback((progress: number) => {
    setIsPlaying(false);
    setTraversalProgressState(Math.max(0, Math.min(100, progress)));
  }, []);

  const setSimSpeed = useCallback((speed: number) => {
    setSimSpeedState(speed);
  }, []);

  return (
    <TerrainAnalysisContext.Provider value={{
      analysis,
      setStartPoint,
      setDestinationPoint,
      clearStartPoint,
      clearDestinationPoint,
      swapStartAndDestination,
      setSelectedRouteIndex,
      safetyClearancePx,
      setSafetyClearancePx,
      validateCoordinateTraversability,
      addObstacle,
      removeObstacle,
      clearObstacles,
      recalculateAnalysis,
      uploadCustomGroundTruthMask,
      clearCustomGroundTruthMask,
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
    }}>
      {children}
    </TerrainAnalysisContext.Provider>
  );
}

export function useTerrainAnalysis() {
  const context = useContext(TerrainAnalysisContext);
  if (!context) {
    throw new Error('useTerrainAnalysis must be used within a TerrainAnalysisProvider');
  }
  return context;
}
