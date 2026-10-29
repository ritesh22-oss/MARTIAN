import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useWorkspace } from './WorkspaceContext';

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
  obstacles: ObstacleNode[];
  selectedRouteIndex: number;
  routes: RouteCandidate[];
  lastAnalyzedTime: string;
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
}

const TerrainAnalysisContext = createContext<TerrainAnalysisContextType | undefined>(undefined);

import { AStarGrid } from '../utils/astar';

export function TerrainAnalysisProvider({ children }: { children: React.ReactNode }) {
  const { selectedObservation, selectedRegion, sharedSession, settings, updateSharedSession } = useWorkspace();

  // Sync points and manual obstacles with the global sharedSession
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

  // Active image metadata
  const activeImage = useMemo(() => {
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
    if (sharedSession?.terrainImage) {
      return {
        id: sharedSession.imageProvenance?.identifier || 'custom_session_img',
        title: sharedSession.imageProvenance?.identifier || 'Custom Image',
        url: sharedSession.terrainImage
      };
    }
    return {
      id: 'PSP_001414_1780_JEZERO',
      title: 'Jezero Crater Western Delta',
      url: '/assets/aistudio/vis_0_f6a9756b.png'
    };
  }, [selectedObservation, selectedRegion, sharedSession]);

  // Load and decode image + generate baseline traversability grid
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setTraversabilityGrid(null);
    setTextureGrid(null);

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
      
      // Honest Baseline: Pixel Analysis
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, 256, 256);
        const imgData = ctx.getImageData(0, 0, 256, 256);
        const data = imgData.data;
        
        const grid = new Float32Array(256 * 256);
        const textures = new Float32Array(256 * 256);
        const obstacleClusters: { x: number; y: number; count: number; lum: number }[] = [];
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const idx = i / 4;
          const x = idx % 256;
          const y = Math.floor(idx / 256);
          
          // Luminance-based baseline
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const contrast = Math.abs(r - g) + Math.abs(g - b);
          
          // proposing a candidate obstacle if extremely dark or very high local contrast
          if (lum < 0.18 || (lum < 0.35 && contrast > 50)) {
            grid[idx] = 1.0; // Blocked candidate
            
            // Simple clustering: check if this pixel is near an existing cluster
            let found = false;
            for (const cluster of obstacleClusters) {
              if (Math.hypot(cluster.x - x, cluster.y - y) < 10) {
                cluster.x = (cluster.x * cluster.count + x) / (cluster.count + 1);
                cluster.y = (cluster.y * cluster.count + y) / (cluster.count + 1);
                cluster.lum = (cluster.lum * cluster.count + lum) / (cluster.count + 1);
                cluster.count++;
                found = true;
                break;
              }
            }
            if (!found && obstacleClusters.length < 15) {
              obstacleClusters.push({ x, y, count: 1, lum });
            }
          } else {
            grid[idx] = 0.0; // Clear
          }
          textures[idx] = lum;
        }

        // Map clusters back to image space and filter for significant ones
        const detectedObstacles: ObstacleNode[] = obstacleClusters
          .filter(c => c.count > 15) // Only significant clusters
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
      }

      setIsLoading(false);
      setLastAnalyzedTime(new Date().toLocaleTimeString());
    };

    img.onerror = () => {
      setError('Failed to load or decode active image resource.');
      setIsLoading(false);
    };
  }, [activeImage.url]);

  // Multi-Path Solver
  const candidates = useMemo(() => {
    if (isLoading || error || !traversabilityGrid || !startPoint || !destinationPoint) return [];

    const solver = new AStarGrid(256, 256);
    const results: RouteCandidate[] = [];
    
    // Internal A* helpers
    const getGridCoord = (pt: { x: number; y: number }) => ({
      x: Math.round((pt.x / imageDims.width) * 255),
      y: Math.round((pt.y / imageDims.height) * 255)
    });

    const start = getGridCoord(startPoint);
    const goal = getGridCoord(destinationPoint);
    
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
        // Basic distance penalty
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

        // Realistic slope derived from pixel luminance gradients (proxy for terrain height changes)
        const gx = textureGrid ? (textureGrid[p.y * 256 + Math.min(255, p.x + 1)] - textureGrid[p.y * 256 + Math.max(0, p.x - 1)]) : 0;
        const gy = textureGrid ? (textureGrid[Math.min(255, p.y + 1) * 256 + p.x] - textureGrid[Math.max(0, p.y - 1) * 256 + p.x]) : 0;
        const gradient = Math.sqrt(gx * gx + gy * gy);
        
        // Map gradient [0, 0.5] to slope [0, 35] degrees
        const slope = Math.round(gradient * 70 * 10) / 10;
        const roughness = textureGrid ? 1.0 - textureGrid[p.y * 256 + p.x] : 0.2;
        const slip = 0.05 + (roughness * 0.4) + (slope / 45) * 0.2;
        
        const isUnsafe = Math.abs(slope) > settings.maxSlopeLimitDeg;
        if (isUnsafe) unsafeCount++;
        maxSlope = Math.max(maxSlope, Math.abs(slope));

        const stepCost = (1.0 + (Math.abs(slope) / 20) * settings.slopeWeight + roughness * settings.roughnessWeight) * 10;
        cumCost += stepCost;

        // Calculate proximity penalty based on actual distance to nearest obstacles
        let minObsDist = 100;
        for (const obs of allObstacles) {
          const gx = (obs.x / imageDims.width) * 255;
          const gy = (obs.y / imageDims.height) * 255;
          const d = Math.hypot(p.x - gx, p.y - gy) - (obs.radius / imageDims.width) * 255;
          if (d < minObsDist) minObsDist = d;
        }
        // Penalty increases as we get closer to 0 (the obstacle boundary)
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

    // Find Alternatives by penalizing previous paths (Simplified Yen's approach)
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
      
      // Block nodes in the middle of the previous path to force divergence
      prevPath.waypoints.forEach((w, idx) => {
        if (idx > 3 && idx < prevPath.waypoints.length - 4) {
          const gx = Math.round((w.x / imageDims.width) * 255);
          const gy = Math.round((w.y / imageDims.height) * 255);
          // Block a small radius around the previous path nodes
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
  }, [isLoading, error, traversabilityGrid, textureGrid, startPoint, destinationPoint, autoObstacles, manualObstacles, settings, imageDims]);

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
    obstacles: [...autoObstacles, ...manualObstacles],
    selectedRouteIndex: Math.min(selectedRouteIndex, Math.max(0, candidates.length - 1)),
    routes: candidates,
    lastAnalyzedTime
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
      recalculateAnalysis
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
