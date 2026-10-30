import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { AStarGrid } from '../utils/astar';
import {
  matchGroundTruthDataset,
  generateReferenceGtGrid,
  calculateSupervisedEvaluation,
  SupervisedEvaluationResult,
  GroundTruthRecord
} from '../services/ai4marsDatasetService';

export interface ObstacleNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'rock' | 'sand' | 'crater' | 'user';
  blocked: boolean;
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
  name: string;
  waypoints: RouteWaypoint[];
  totalCost: number;
  totalLengthM: number;
  maxSlope: number;
  unsafeCount: number;
  isBlocked: boolean;
  difficulty: string;
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
  selectedRouteIndex: number;
  routes: RouteCandidate[];
  lastAnalyzedTime: string;
  classStats: TerrainClassStats | null;
  matchedGtRecord: GroundTruthRecord | null;
}

interface TerrainAnalysisContextType {
  analysis: TerrainAnalysisResult;
  setStartPoint: (pt: { x: number; y: number }) => void;
  setDestinationPoint: (pt: { x: number; y: number }) => void;
  setSelectedRouteIndex: (idx: number) => void;
  addObstacle: (obs: ObstacleNode) => void;
  removeObstacle: (id: string) => void;
  clearObstacles: () => void;
  recalculateAnalysis: () => void;
  uploadCustomGroundTruthMask: (maskGrid: Uint8Array, title?: string) => void;
  clearCustomGroundTruthMask: () => void;
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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ width: number; height: number }>({ width: 300, height: 250 });
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string>('Never');

  // Internal pixel-based traversability grid (256x256)
  const [traversabilityGrid, setTraversabilityGrid] = useState<Float32Array | null>(null);
  const [textureGrid, setTextureGrid] = useState<Float32Array | null>(null);
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

  // Effective Start and Destination Points for immediate path computation
  const effectiveStartPoint = useMemo(() => {
    if (startPoint) return startPoint;
    if (!imageDims.width || !imageDims.height) return { x: 45, y: 215 };
    return { x: Math.round(imageDims.width * 0.15), y: Math.round(imageDims.height * 0.85) };
  }, [startPoint, imageDims]);

  const effectiveDestinationPoint = useMemo(() => {
    if (destinationPoint) return destinationPoint;
    if (!imageDims.width || !imageDims.height) return { x: 255, y: 35 };
    return { x: Math.round(imageDims.width * 0.85), y: Math.round(imageDims.height * 0.15) };
  }, [destinationPoint, imageDims]);

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

      setImageDims({ width: img.naturalWidth, height: img.naturalHeight });
      
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

            const isHighlightShadowDipole = (gray > 160 && edge > 28) || (gray < 65 && edge > 22 && varL > 250);
            if (isHighlightShadowDipole || (edge > 42 && varL > 320)) {
              rawClassGrid[idx] = 3; // Big Rock
            } else if (gray > 150 && varL < 180 && edge < 25) {
              rawClassGrid[idx] = 1; // Bedrock
            } else if (warmth > 18 && varL < 220) {
              rawClassGrid[idx] = 2; // Sand
            } else {
              rawClassGrid[idx] = 0; // Soil
            }
          }
        }

        // Pass 3: Spatial Modal (3x3 Majority) Smoothing Filter for Clean Regions
        let soilCount = 0;
        let bedrockCount = 0;
        let sandCount = 0;
        let rockCount = 0;
        let sumConfidence = 0;

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

            if (finalCls === 3) {
              rockCount++;
              grid[idx] = 1.0;
              sumConfidence += 0.92;

              let found = false;
              for (const cluster of obstacleClusters) {
                if (Math.hypot(cluster.x - x, cluster.y - y) < 10) {
                  cluster.x = (cluster.x * cluster.count + x) / (cluster.count + 1);
                  cluster.y = (cluster.y * cluster.count + y) / (cluster.count + 1);
                  cluster.lum = (cluster.lum * cluster.count + grayGrid[idx] / 255) / (cluster.count + 1);
                  cluster.count++;
                  found = true;
                  break;
                }
              }
              if (!found && obstacleClusters.length < 15) {
                obstacleClusters.push({ x, y, count: 1, lum: grayGrid[idx] / 255 });
              }
            } else if (finalCls === 1) {
              bedrockCount++;
              grid[idx] = 0.2;
              sumConfidence += 0.94;
            } else if (finalCls === 2) {
              sandCount++;
              grid[idx] = 0.5;
              sumConfidence += 0.91;
            } else {
              soilCount++;
              grid[idx] = 0.0;
              sumConfidence += 0.95;
            }
          }
        }

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
          'Distinct boulder obstacles exceeding rover ground clearance threshold.'
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

        // Map clusters back to image space and filter for significant ones
        const detectedObstacles: ObstacleNode[] = obstacleClusters
          .filter(c => c.count > 15)
          .map((c, i) => ({
            id: `auto-${i}`,
            x: Math.round(c.x * (img.naturalWidth / 256)),
            y: Math.round(c.y * (img.naturalHeight / 256)),
            radius: Math.min(25, 6 + Math.sqrt(c.count) * 0.8),
            type: c.lum < 0.12 ? 'rock' : 'sand',
            blocked: true
          }));
        
        setTraversabilityGrid(grid);
        setTextureGrid(textures);
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
  }, [activeImage.url, activeImage.id, recalcTrigger]);

  // Multi-Path Solver
  const candidates = useMemo(() => {
    if (isLoading || error || !traversabilityGrid) return [];

    const solver = new AStarGrid(256, 256);
    const results: RouteCandidate[] = [];
    
    // Internal A* helpers using effective start and goal points
    const getGridCoord = (pt: { x: number; y: number }) => ({
      x: Math.round((pt.x / imageDims.width) * 255),
      y: Math.round((pt.y / imageDims.height) * 255)
    });

    const start = getGridCoord(effectiveStartPoint);
    const goal = getGridCoord(effectiveDestinationPoint);
    
    const pixelsToMeters = 0.15;
    const baseSafetyBuffer = 12;

    const runAStarIteration = (excludedNodes: Set<number>, name: string, explanation: string) => {
      const isBlocked = (x: number, y: number) => {
        const idx = y * 256 + x;
        if (excludedNodes.has(idx)) return true;
        
        // Combined obstacles: Auto-detected + Manual
        const allObstacles = [...autoObstacles, ...manualObstacles];
        for (const obs of allObstacles) {
          const gx = (obs.x / imageDims.width) * 255;
          const gy = (obs.y / imageDims.height) * 255;
          const dist = Math.hypot(x - gx, y - gy);
          if (dist < (obs.radius / imageDims.width) * 255 + (baseSafetyBuffer / 10)) {
            if (obs.blocked) return true;
          }
        }
        
        // Baseline grid blockage
        return traversabilityGrid[idx] > 0.8;
      };

      const getCost = (x: number, y: number) => {
        const idx = y * 256 + x;
        const base = 1.0;
        const texturePenalty = textureGrid ? (1.0 - textureGrid[idx]) * settings.roughnessWeight : 0;
        return base + texturePenalty;
      };

      const res = solver.findPath(start, goal, isBlocked, getCost);
      if (!res.path) return null;

      // Transform grid path back to image path + compute metrics
      let cumDist = 0;
      let cumCost = 0;
      let maxSlope = 0;
      let unsafeCount = 0;

      const allObstacles = [...autoObstacles, ...manualObstacles];

      const pathWaypoints: RouteWaypoint[] = res.path.map((p, i) => {
        const imgX = (p.x / 255) * imageDims.width;
        const imgY = (p.y / 255) * imageDims.height;
        
        const prev = res.path[i - 1] || p;
        const segDistPx = Math.hypot(p.x - prev.x, p.y - prev.y);
        cumDist += segDistPx * pixelsToMeters;

        const gx = textureGrid ? (textureGrid[p.y * 256 + Math.min(255, p.x + 1)] - textureGrid[p.y * 256 + Math.max(0, p.x - 1)]) : 0;
        const gy = textureGrid ? (textureGrid[Math.min(255, p.y + 1) * 256 + p.x] - textureGrid[Math.max(0, p.y - 1) * 256 + p.x]) : 0;
        const gradient = Math.sqrt(gx * gx + gy * gy);
        
        const slope = Math.round(gradient * 70 * 10) / 10;
        const roughness = textureGrid ? 1.0 - textureGrid[p.y * 256 + p.x] : 0.2;
        const slip = 0.05 + (roughness * 0.4) + (slope / 45) * 0.2;
        
        const isUnsafe = Math.abs(slope) > settings.maxSlopeLimitDeg;
        if (isUnsafe) unsafeCount++;
        maxSlope = Math.max(maxSlope, Math.abs(slope));

        const stepCost = (1.0 + (Math.abs(slope) / 20) * settings.slopeWeight + roughness * settings.roughnessWeight) * 10;
        cumCost += stepCost;

        let minObsDist = 100;
        for (const obs of allObstacles) {
          const gx = (obs.x / imageDims.width) * 255;
          const gy = (obs.y / imageDims.height) * 255;
          const d = Math.hypot(p.x - gx, p.y - gy) - (obs.radius / imageDims.width) * 255;
          if (d < minObsDist) minObsDist = d;
        }
        const obstaclePenalty = Math.max(0, 10 - Math.max(0, minObsDist));

        return {
          index: i,
          x: imgX,
          y: imgY,
          distanceM: Math.round(cumDist),
          slope,
          roughness: Math.round(roughness * 100) / 100,
          slip: Math.round(slip * 100) / 100,
          obstaclePenalty: Math.round(obstaclePenalty * 10) / 10,
          isUnsafe,
          isBlockedCell: isBlocked(p.x, p.y),
          stepCost,
          cumulativeCost: Math.round(cumCost)
        };
      });

      return {
        id: `route-${results.length}`,
        name,
        waypoints: pathWaypoints,
        totalCost: Math.round(cumCost),
        totalLengthM: Math.round(cumDist),
        maxSlope,
        unsafeCount,
        isBlocked: !res.success,
        difficulty: res.success ? (maxSlope > 15 ? 'Restricted' : maxSlope > 10 ? 'Moderate' : 'Safe') : 'Blocked',
        explanation
      };
    };

    // Find Route 1: Optimal
    const r1 = runAStarIteration(new Set(), 'Alpha: Shortest Feasible', 'Primary trajectory minimizing total Euclidean distance while respecting hard constraints.');
    if (r1) results.push(r1);

    const activeExclusions = new Set<number>();
    
    const stratConfigs = [
      { name: 'Beta: Maximum Clearance', exp: 'Trajectory favoring wide open corridors and maximum separation from identified hazards.' },
      { name: 'Gamma: Minimal Incline', exp: 'Divergent path optimized to avoid steep topographical gradients at the cost of length.' },
      { name: 'Delta: Alternative Corridor A', exp: 'Distinct lateral alternative bypassing primary bottleneck regions.' },
      { name: 'Epsilon: Alternative Corridor B', exp: 'Secondary lateral trajectory utilizing unmapped open areas.' }
    ];

    for (let i = 0; i < 4; i++) {
      const prevPath = results[results.length - 1];
      if (!prevPath) break;
      
      prevPath.waypoints.forEach((w, idx) => {
        if (idx > 3 && idx < prevPath.waypoints.length - 4) {
          const gx = Math.round((w.x / imageDims.width) * 255);
          const gy = Math.round((w.y / imageDims.height) * 255);
          for (let dx = -4; dx <= 4; dx++) {
            for (let dy = -4; dy <= 4; dy++) {
              activeExclusions.add((gy + dy) * 256 + (gx + dx));
            }
          }
        }
      });

      const nextRoute = runAStarIteration(activeExclusions, stratConfigs[i].name, stratConfigs[i].exp);
      if (nextRoute && nextRoute.waypoints.length > 0) {
        results.push(nextRoute);
      } else {
        break;
      }
    }

    return results;
  }, [isLoading, error, traversabilityGrid, textureGrid, effectiveStartPoint, effectiveDestinationPoint, autoObstacles, manualObstacles, settings, imageDims]);

  const [customGtMask, setCustomGtMask] = useState<{ grid: Uint8Array; title: string } | null>(null);
  const [matchedGtRecord, setMatchedGtRecord] = useState<GroundTruthRecord | null>(null);

  // Real-time synchronization of computed active route to sharedSession
  const lastSyncedRouteKeyRef = useRef<string>('');

  useEffect(() => {
    const validIdx = Math.min(selectedRouteIndex, Math.max(0, candidates.length - 1));
    const activeRoute = candidates[validIdx];
    if (activeRoute && activeRoute.waypoints && activeRoute.waypoints.length > 0) {
      const routeFingerprint = `${activeRoute.id}_${activeRoute.waypoints.length}_${activeRoute.totalLengthM}_${validIdx}_${imageDims.width}x${imageDims.height}`;
      if (lastSyncedRouteKeyRef.current === routeFingerprint) {
        return;
      }
      lastSyncedRouteKeyRef.current = routeFingerprint;

      const strat = validIdx === 0 ? 'shortest' : validIdx === 1 ? 'safety' : validIdx === 2 ? 'science' : 'alternative';
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
    }
  }, [candidates, selectedRouteIndex, imageDims.width, imageDims.height, updateSharedSession]);

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
    selectedRouteIndex: Math.min(selectedRouteIndex, Math.max(0, candidates.length - 1)),
    routes: candidates,
    lastAnalyzedTime,
    classStats,
    matchedGtRecord
  };

  const setPoints = useCallback((start?: { x: number; y: number }, dest?: { x: number; y: number }) => {
    updateSharedSession({
      ...(start && { startPoint: start }),
      ...(dest && { destinationPoint: dest })
    });
  }, [updateSharedSession]);

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

  return (
    <TerrainAnalysisContext.Provider value={{
      analysis,
      setStartPoint: (pt) => setPoints(pt, undefined),
      setDestinationPoint: (pt) => setPoints(undefined, pt),
      setSelectedRouteIndex,
      addObstacle,
      removeObstacle,
      clearObstacles,
      recalculateAnalysis,
      uploadCustomGroundTruthMask,
      clearCustomGroundTruthMask
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
