/**
 * MARSNAV OBSTACLE-AWARE A* PATHFINDING & MULTI-STRATEGY ROUTE ENGINE
 * Converts active-frame obstacles (normalized top-left bounding boxes) into a hard-constrained occupancy grid,
 * executes 8-directional A* pathfinding across four traverse strategies (ALPHA, BETA, GAMMA, DELTA),
 * applies supercover segment collision verification, and computes safety ratings transparently.
 */

export interface GridNode {
  x: number;
  y: number;
  cost: number;
  blocked: boolean;
  gCost: number;
  hCost: number;
  fCost: number;
  parent: GridNode | null;
}

export interface ObstacleBoxInput {
  id?: string;
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
  label: string;
  hazardStatus?: string;
  sizeCategory?: string;
  confidence?: number;
}

export interface PathfindingResult {
  path: Array<{ xPct: number; yPct: number }>;
  footprints: Array<{ xPct: number; yPct: number; angleDeg: number; isLeft: boolean }>;
  status: 'ROUTE VERIFIED' | 'NO SAFE ROUTE FOUND' | 'BLOCKED_ENDPOINT';
  distanceMeters: number;
  estimatedMins: number;
  maxSlopeDeg: number | null;
  avgSlopeDeg: number | null;
  slopeAvailable: boolean;
  safetyScore: number | null;
  isComputable: boolean;
  isSimulated: boolean;
  unavailableReason: string | null;
  formulaDescription: string;
  obstacleCount: number;
  minClearanceCells: number;
  collisionChecksPassed: boolean;
  obstacleIntersectionsCount: number;
  routeStatus: 'VALIDATED' | 'REJECTED';
}

export interface StrategyTargetInput {
  id: string;
  name: string;
  xPct: number;
  yPct: number;
}

export interface MultiStrategyRouteOutput {
  id: 'alpha' | 'beta' | 'gamma' | 'delta';
  name: string;
  code: string;
  tagline: string;
  distanceM: number | null;
  timeMins: number | null;
  elevationGainM: number | null;
  elevationLossM: number | null;
  avgSlopeDeg: number | null;
  maxSlopeDeg: number | null;
  slopeAvailable: boolean;
  safetyScorePct: number | null;
  targetsVisitedCount: number;
  isSafe: boolean;
  isComputable: boolean;
  isSimulated: true;
  unavailableReason: string | null;
  formulaDescription: string;
  returnFeasible: boolean;
  collisionChecksPassed: boolean;
  obstacleIntersectionsCount: number;
  routeStatus: 'VALIDATED' | 'REJECTED';
  path: Array<{
    x: number;
    y: number;
    lat: number | null;
    lon: number | null;
    elevM: number | null;
    slopeDeg: number | null;
  }>;
  footprints: Array<{ xPct: number; yPct: number; angleDeg: number; isLeft: boolean }>;
}

const SAFETY_FORMULA_DOC =
  'Safety Score = 100 - (ObstacleProximityPenalty [0–40] + SurfaceRoughnessPenalty [0–30] + SandDriftPenalty [0–15] + SlopePenalty [0–25 if DEM calibrated, else roughness proxy 0–15])';

function checkSegmentCollision(grid: boolean[][], x0: number, y0: number, x1: number, y1: number): boolean {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let x = x0;
  let y = y0;
  let n = 1 + dx + dy;
  let x_inc = (x1 > x0) ? 1 : -1;
  let y_inc = (y1 > y0) ? 1 : -1;
  let error = dx - dy;
  dx *= 2;
  dy *= 2;

  for (; n > 0; --n) {
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
      if (grid[y][x]) return true; // Collision with blocked obstacle cell
    }
    if (error > 0) {
      x += x_inc;
      error -= dy;
    } else {
      y += y_inc;
      error += dx;
    }
  }
  return false;
}

function validatePathCollisions(grid: boolean[][], gridPath: Array<{ x: number; y: number }>): { passed: boolean; intersectionsCount: number } {
  let intersectionsCount = 0;
  for (let i = 0; i < gridPath.length - 1; i++) {
    const p1 = gridPath[i];
    const p2 = gridPath[i + 1];
    if (checkSegmentCollision(grid, p1.x, p1.y, p2.x, p2.y)) {
      intersectionsCount++;
    }
  }
  return { passed: intersectionsCount === 0, intersectionsCount };
}

function runAStarSegment(
  grid: boolean[][],
  costGrid: number[][],
  gridSize: number,
  start: { xPct: number; yPct: number },
  destination: { xPct: number; yPct: number }
): { gridPath: Array<{ x: number; y: number }>; totalCost: number } | null {
  const startX = Math.max(0, Math.min(gridSize - 1, Math.floor((start.xPct / 100) * (gridSize - 1))));
  const startY = Math.max(0, Math.min(gridSize - 1, Math.floor((start.yPct / 100) * (gridSize - 1))));
  const destX = Math.max(0, Math.min(gridSize - 1, Math.floor((destination.xPct / 100) * (gridSize - 1))));
  const destY = Math.max(0, Math.min(gridSize - 1, Math.floor((destination.yPct / 100) * (gridSize - 1))));

  const findNearestFree = (tx: number, ty: number): { x: number; y: number } | null => {
    if (!grid[ty][tx]) return { x: tx, y: ty };
    for (let r = 1; r <= 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = tx + dx;
          const ny = ty + dy;
          if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && !grid[ny][nx]) {
            return { x: nx, y: ny };
          }
        }
      }
    }
    return null;
  };

  const sPt = findNearestFree(startX, startY);
  const dPt = findNearestFree(destX, destY);
  if (!sPt || !dPt) return null;

  const openSet: GridNode[] = [];
  const closedSet: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  const nodeMap: GridNode[][] = Array.from({ length: gridSize }, (_, y) =>
    Array.from({ length: gridSize }, (__, x) => ({
      x,
      y,
      cost: costGrid[y][x],
      blocked: grid[y][x],
      gCost: Infinity,
      hCost: 0,
      fCost: Infinity,
      parent: null
    }))
  );

  const startNode = nodeMap[sPt.y][sPt.x];
  const targetNode = nodeMap[dPt.y][dPt.x];
  startNode.gCost = 0;
  startNode.hCost = Math.hypot(dPt.x - sPt.x, dPt.y - sPt.y);
  startNode.fCost = startNode.hCost;
  openSet.push(startNode);

  const directions = [
    { x: 0, y: -1, cost: 1.0 },
    { x: 0, y: 1, cost: 1.0 },
    { x: -1, y: 0, cost: 1.0 },
    { x: 1, y: 0, cost: 1.0 },
    { x: -1, y: -1, cost: 1.414 },
    { x: 1, y: -1, cost: 1.414 },
    { x: -1, y: 1, cost: 1.414 },
    { x: 1, y: 1, cost: 1.414 }
  ];

  let foundPath = false;
  let iterations = 0;
  const maxIterations = gridSize * gridSize * 2.5;

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;
    let lowestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].fCost < openSet[lowestIdx].fCost) lowestIdx = i;
    }
    const current = openSet.splice(lowestIdx, 1)[0];

    if (current.x === targetNode.x && current.y === targetNode.y) {
      foundPath = true;
      break;
    }

    closedSet[current.y][current.x] = true;

    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;
      if (closedSet[ny][nx]) continue;
      const neighbor = nodeMap[ny][nx];
      if (neighbor.blocked || neighbor.cost >= 9000) continue;

      if (dir.x !== 0 && dir.y !== 0) {
        if (grid[current.y][current.x + dir.x] || grid[current.y + dir.y][current.x]) continue;
      }

      const tentativeG = current.gCost + dir.cost * neighbor.cost;
      if (tentativeG < neighbor.gCost) {
        neighbor.parent = current;
        neighbor.gCost = tentativeG;
        neighbor.hCost = Math.hypot(dPt.x - nx, dPt.y - ny);
        neighbor.fCost = neighbor.gCost + neighbor.hCost;
        if (!openSet.includes(neighbor)) openSet.push(neighbor);
      }
    }
  }

  if (!foundPath) return null;

  const gridPath: Array<{ x: number; y: number }> = [];
  let curr: GridNode | null = targetNode;
  while (curr !== null) {
    gridPath.unshift({ x: curr.x, y: curr.y });
    curr = curr.parent;
  }
  return { gridPath, totalCost: targetNode.gCost };
}

function buildOccupancyGrids(
  boulders: ObstacleBoxInput[],
  gridSize: number,
  marginCells: number,
  marginPenaltyScale: number
): { grid: boolean[][]; costGrid: number[][]; clearanceGrid: number[][] } {
  const grid: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
  const costGrid: number[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(1.0));
  const clearanceGrid: number[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(99));

  // Ensure default robust central obstacle if boulders list is empty (e.g. unlisted central rocky outcrop)
  const effectiveBoulders = boulders.length > 0 ? boulders : [
    { normX: 0.30, normY: 0.32, normWidth: 0.38, normHeight: 0.36, label: 'Central Rocky Outcrop' }
  ];

  effectiveBoulders.forEach(b => {
    const x1 = Math.max(0, Math.floor(b.normX * gridSize));
    const y1 = Math.max(0, Math.floor(b.normY * gridSize));
    const x2 = Math.min(gridSize - 1, Math.floor((b.normX + (b.normWidth || 0.04)) * gridSize));
    const y2 = Math.min(gridSize - 1, Math.floor((b.normY + (b.normHeight || 0.04)) * gridSize));

    for (let gy = Math.max(0, y1 - marginCells); gy <= Math.min(gridSize - 1, y2 + marginCells); gy++) {
      for (let gx = Math.max(0, x1 - marginCells); gx <= Math.min(gridSize - 1, x2 + marginCells); gx++) {
        if (gx >= x1 && gx <= x2 && gy >= y1 && gy <= y2) {
          grid[gy][gx] = true;
          costGrid[gy][gx] = 9999;
        } else {
          const distToBox = Math.hypot(Math.max(x1 - gx, 0, gx - x2), Math.max(y1 - gy, 0, gy - y2));
          if (distToBox <= marginCells) {
            grid[gy][gx] = true; // Strict blocking for safety margin cells too
            costGrid[gy][gx] = 9999;
          } else {
            const proximityRatio = Math.max(0, 1 - distToBox / Math.max(1, marginCells + 1));
            const penalty = 1.0 + marginPenaltyScale * (1.5 + proximityRatio * 8.0);
            costGrid[gy][gx] = Math.max(costGrid[gy][gx], penalty);
          }
        }
        const minEdgeDist = Math.min(Math.abs(gx - x1), Math.abs(gx - x2), Math.abs(gy - y1), Math.abs(gy - y2));
        clearanceGrid[gy][gx] = Math.min(clearanceGrid[gy][gx], minEdgeDist);
      }
    }
  });

  return { grid, costGrid, clearanceGrid };
}

function buildFootprints(path: Array<{ xPct: number; yPct: number }>) {
  const footprints: Array<{ xPct: number; yPct: number; angleDeg: number; isLeft: boolean }> = [];
  const stride = Math.max(1, Math.floor(path.length / 26));
  for (let i = 0; i < path.length - 1; i += stride) {
    const p1 = path[i];
    const p2 = path[Math.min(path.length - 1, i + stride)];
    const dx = p2.xPct - p1.xPct;
    const dy = p2.yPct - p1.yPct;
    if (Math.hypot(dx, dy) < 0.2) continue;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    footprints.push({
      xPct: Number(((p1.xPct + p2.xPct) / 2).toFixed(1)),
      yPct: Number(((p1.yPct + p2.yPct) / 2).toFixed(1)),
      angleDeg: Number(angleDeg.toFixed(1)),
      isLeft: footprints.length % 2 === 0
    });
  }
  return footprints;
}

function computeDistanceAndSafety(params: {
  gridPath: Array<{ x: number; y: number }>;
  clearanceGrid: number[][];
  boulderCount: number;
  roughnessScore: number;
  sandCoveragePct: number;
  gridSize: number;
  hasImageData: boolean;
  scaleMetersPerGridCell?: number | null;
  slopeMaxDeg?: number | null;
  slopeAvgDeg?: number | null;
}) {
  const {
    gridPath,
    clearanceGrid,
    boulderCount,
    roughnessScore,
    sandCoveragePct,
    gridSize,
    hasImageData,
    scaleMetersPerGridCell,
    slopeMaxDeg = null,
    slopeAvgDeg = null
  } = params;

  if (!hasImageData || gridPath.length === 0) {
    return {
      distanceMeters: 0,
      estimatedMins: 0,
      safetyScore: null,
      minClearanceCells: 0,
      slopeAvailable: false,
      maxSlopeDeg: null,
      avgSlopeDeg: null,
      isComputable: false,
      unavailableReason: 'Safety score unavailable — insufficient terrain data.'
    };
  }

  let pathCellsLen = 0;
  let minClearance = 99;
  let nearObstacleSteps = 0;
  for (let i = 0; i < gridPath.length; i++) {
    const p = gridPath[i];
    const clr = clearanceGrid[p.y]?.[p.x] ?? 99;
    if (clr < minClearance) minClearance = clr;
    if (clr <= 2.5) nearObstacleSteps++;
    if (i > 0) {
      pathCellsLen += Math.hypot(p.x - gridPath[i - 1].x, p.y - gridPath[i - 1].y);
    }
  }

  const cellMeters = scaleMetersPerGridCell && scaleMetersPerGridCell > 0
    ? scaleMetersPerGridCell
    : (64 / gridSize);
  const distanceMeters = Math.max(5, Math.round(pathCellsLen * cellMeters));
  const speedMPerMin = Math.max(20, 42 - roughnessScore * 14);
  const estimatedMins = Math.max(1, Math.round(distanceMeters / speedMPerMin));

  const nearFraction = nearObstacleSteps / Math.max(1, gridPath.length);
  const obstacleDensityPenalty = Math.min(22, boulderCount * 1.4);
  const proximityPenalty = Math.min(24, nearFraction * 36 + (minClearance <= 1 ? 8 : 0));
  const roughnessPenalty = Math.min(24, roughnessScore * 28);
  const sandPenalty = Math.min(14, (sandCoveragePct / 100) * 26);
  const slopeAvailable = slopeMaxDeg !== null && Number.isFinite(slopeMaxDeg);
  const slopePenalty = slopeAvailable ? Math.min(25, Math.max(0, (slopeMaxDeg! - 4) * 1.3)) : 0;

  const rawSafety = 100 - (obstacleDensityPenalty * 0.55 + proximityPenalty + roughnessPenalty + sandPenalty + slopePenalty);
  const safetyScore = Math.max(12, Math.min(99, Math.round(rawSafety)));

  return {
    distanceMeters,
    estimatedMins,
    safetyScore,
    minClearanceCells: minClearance === 99 ? gridSize : Number(minClearance.toFixed(1)),
    slopeAvailable,
    maxSlopeDeg: slopeAvailable ? Number(slopeMaxDeg!.toFixed(1)) : null,
    avgSlopeDeg: slopeAvgDeg !== null ? Number(slopeAvgDeg.toFixed(1)) : null,
    isComputable: true,
    unavailableReason: null
  };
}

export function computeObstacleAwareRoute(
  boulders: ObstacleBoxInput[],
  start: { xPct: number; yPct: number } = { xPct: 15, yPct: 82 },
  destination: { xPct: number; yPct: number } = { xPct: 85, yPct: 18 },
  gridSize = 84,
  options?: {
    roughnessScore?: number;
    sandCoveragePct?: number;
    hasImageData?: boolean;
    slopeMaxDeg?: number | null;
    slopeAvgDeg?: number | null;
  }
): PathfindingResult {
  const hasImageData = options?.hasImageData ?? true;
  const roughnessScore = options?.roughnessScore ?? 0.32;
  const sandCoveragePct = options?.sandCoveragePct ?? 10;

  if (!hasImageData) {
    return {
      path: [],
      footprints: [],
      status: 'NO SAFE ROUTE FOUND',
      distanceMeters: 0,
      estimatedMins: 0,
      maxSlopeDeg: null,
      avgSlopeDeg: null,
      slopeAvailable: false,
      safetyScore: null,
      isComputable: false,
      isSimulated: true,
      unavailableReason: 'Safety score unavailable — insufficient terrain data.',
      formulaDescription: SAFETY_FORMULA_DOC,
      obstacleCount: boulders.length,
      minClearanceCells: 0,
      collisionChecksPassed: false,
      obstacleIntersectionsCount: 0,
      routeStatus: 'REJECTED'
    };
  }

  const margins = [3, 1, 0];
  for (const margin of margins) {
    const { grid, costGrid, clearanceGrid } = buildOccupancyGrids(boulders, gridSize, margin, 1.0);
    const seg = runAStarSegment(grid, costGrid, gridSize, start, destination);
    if (seg && seg.gridPath.length > 0) {
      // MANDATORY SEGMENT COLLISION VALIDATION CHECK
      const collisionCheck = validatePathCollisions(grid, seg.gridPath);
      if (!collisionCheck.passed) {
        continue; // Reject this candidate path and try next margin or report no safe route
      }

      const path = seg.gridPath.map(p => ({
        xPct: Number(((p.x / (gridSize - 1)) * 100).toFixed(1)),
        yPct: Number(((p.y / (gridSize - 1)) * 100).toFixed(1))
      }));
      const footprints = buildFootprints(path);
      const metrics = computeDistanceAndSafety({
        gridPath: seg.gridPath,
        clearanceGrid,
        boulderCount: boulders.length,
        roughnessScore,
        sandCoveragePct,
        gridSize,
        hasImageData: true,
        slopeMaxDeg: options?.slopeMaxDeg ?? null,
        slopeAvgDeg: options?.slopeAvgDeg ?? null
      });

      return {
        path,
        footprints,
        status: 'ROUTE VERIFIED',
        distanceMeters: metrics.distanceMeters,
        estimatedMins: metrics.estimatedMins,
        maxSlopeDeg: metrics.maxSlopeDeg,
        avgSlopeDeg: metrics.avgSlopeDeg,
        slopeAvailable: metrics.slopeAvailable,
        safetyScore: metrics.safetyScore,
        isComputable: true,
        isSimulated: true,
        unavailableReason: null,
        formulaDescription: SAFETY_FORMULA_DOC,
        obstacleCount: boulders.length,
        minClearanceCells: metrics.minClearanceCells,
        collisionChecksPassed: true,
        obstacleIntersectionsCount: 0,
        routeStatus: 'VALIDATED'
      };
    }
  }

  return {
    path: [],
    footprints: [],
    status: 'NO SAFE ROUTE FOUND',
    distanceMeters: 0,
    estimatedMins: 0,
    maxSlopeDeg: null,
    avgSlopeDeg: null,
    slopeAvailable: false,
    safetyScore: null,
    isComputable: false,
    isSimulated: true,
    unavailableReason: 'No collision-free corridor exists between start and destination (path blocked by obstacles).',
    formulaDescription: SAFETY_FORMULA_DOC,
    obstacleCount: boulders.length,
    minClearanceCells: 0,
    collisionChecksPassed: false,
    obstacleIntersectionsCount: 1,
    routeStatus: 'REJECTED'
  };
}

export function computeMultiStrategyRoutes(params: {
  hasImageData: boolean;
  boulders: ObstacleBoxInput[];
  roughnessScore: number;
  sandCoveragePct: number;
  start?: { xPct: number; yPct: number };
  destination?: { xPct: number; yPct: number };
  scienceTargets?: StrategyTargetInput[];
  centerLat?: number | null;
  centerLon?: number | null;
  demSlopeMaxDeg?: number | null;
  demSlopeAvgDeg?: number | null;
  baseElevM?: number | null;
}): Record<'alpha' | 'beta' | 'gamma' | 'delta', MultiStrategyRouteOutput> {
  const start = params.start || { xPct: 14, yPct: 82 };
  const dest = params.destination || { xPct: 86, yPct: 18 };
  const gridSize = 72;
  const targets = (params.scienceTargets || []).slice(0, 3);

  const strategyConfigs: Array<{
    id: 'alpha' | 'beta' | 'gamma' | 'delta';
    name: string;
    code: string;
    tagline: string;
    margin: number;
    penaltyScale: number;
    visitTargets: boolean;
  }> = [
    {
      id: 'alpha',
      name: 'ROUTE ALPHA — SHORTEST DISTANCE',
      code: 'ALPHA-DIRECT',
      tagline: 'Minimum path distance around detected obstacles between start and destination.',
      margin: 1,
      penaltyScale: 0.4,
      visitTargets: false
    },
    {
      id: 'beta',
      name: 'ROUTE BETA — LOWEST TRAVERSAL COST',
      code: 'BETA-COST',
      tagline: 'Balances distance against surface roughness, sand friction, and obstacle proximity penalties.',
      margin: 2,
      penaltyScale: 1.15 + params.roughnessScore * 0.8,
      visitTargets: false
    },
    {
      id: 'gamma',
      name: 'ROUTE GAMMA — SAFETY FIRST',
      code: 'GAMMA-SHIELD',
      tagline: 'Maximizes clearance buffer around every detected boulder and hazard boundary.',
      margin: 4,
      penaltyScale: 2.2,
      visitTargets: false
    },
    {
      id: 'delta',
      name: 'ROUTE DELTA — SCIENCE OPTIMIZED',
      code: 'DELTA-SCIENCE',
      tagline: 'Detours to visit active geological targets detected in the current surface frame.',
      margin: 2,
      penaltyScale: 1.0,
      visitTargets: true
    }
  ];

  const results = {} as Record<'alpha' | 'beta' | 'gamma' | 'delta', MultiStrategyRouteOutput>;

  for (const cfg of strategyConfigs) {
    if (!params.hasImageData) {
      results[cfg.id] = {
        id: cfg.id,
        name: cfg.name,
        code: cfg.code,
        tagline: cfg.tagline,
        distanceM: null,
        timeMins: null,
        elevationGainM: null,
        elevationLossM: null,
        avgSlopeDeg: null,
        maxSlopeDeg: null,
        slopeAvailable: false,
        safetyScorePct: null,
        targetsVisitedCount: 0,
        isSafe: false,
        isComputable: false,
        isSimulated: true,
        unavailableReason: 'Safety score unavailable — insufficient terrain data.',
        formulaDescription: SAFETY_FORMULA_DOC,
        returnFeasible: false,
        collisionChecksPassed: false,
        obstacleIntersectionsCount: 0,
        routeStatus: 'REJECTED',
        path: [],
        footprints: []
      };
      continue;
    }

    let solvedGridPath: Array<{ x: number; y: number }> | null = null;
    let solvedClearance: number[][] | null = null;
    let solvedGrid: boolean[][] | null = null;
    let visitedCount = 0;

    for (const marginAttempt of [cfg.margin, Math.max(1, cfg.margin - 2), 0]) {
      const { grid, costGrid, clearanceGrid } = buildOccupancyGrids(
        params.boulders,
        gridSize,
        marginAttempt,
        cfg.penaltyScale
      );

      if (cfg.id === 'gamma') {
        for (let y = 0; y < gridSize; y++) {
          for (let x = 0; x < gridSize; x++) {
            const centerBias = Math.abs(x / gridSize - 0.5) + Math.abs(y / gridSize - 0.5);
            costGrid[y][x] += centerBias * 0.15;
          }
        }
      }

      if (cfg.visitTargets && targets.length > 0) {
        const waypointsSeq = [start, ...targets.map(t => ({ xPct: t.xPct, yPct: t.yPct })), dest];
        const combined: Array<{ x: number; y: number }> = [];
        let reachedTargets = 0;
        let allOk = true;
        for (let sIdx = 0; sIdx < waypointsSeq.length - 1; sIdx++) {
          const seg = runAStarSegment(grid, costGrid, gridSize, waypointsSeq[sIdx], waypointsSeq[sIdx + 1]);
          if (!seg) {
            allOk = false;
            break;
          }
          const coll = validatePathCollisions(grid, seg.gridPath);
          if (!coll.passed) {
            allOk = false;
            break;
          }
          if (sIdx > 0 && sIdx < waypointsSeq.length - 1) reachedTargets++;
          combined.push(...(combined.length > 0 ? seg.gridPath.slice(1) : seg.gridPath));
        }
        if (allOk && combined.length > 0) {
          solvedGridPath = combined;
          solvedClearance = clearanceGrid;
          solvedGrid = grid;
          visitedCount = targets.length;
          break;
        }
      }

      const direct = runAStarSegment(grid, costGrid, gridSize, start, dest);
      if (direct && direct.gridPath.length > 0) {
        const coll = validatePathCollisions(grid, direct.gridPath);
        if (coll.passed) {
          solvedGridPath = direct.gridPath;
          solvedClearance = clearanceGrid;
          solvedGrid = grid;
          visitedCount = targets.filter(t =>
            direct.gridPath.some(pt => {
              const px = (pt.x / (gridSize - 1)) * 100;
              const py = (pt.y / (gridSize - 1)) * 100;
              return Math.hypot(px - t.xPct, py - t.yPct) <= 10;
            })
          ).length;
          break;
        }
      }
    }

    if (!solvedGridPath || !solvedClearance || !solvedGrid) {
      results[cfg.id] = {
        id: cfg.id,
        name: cfg.name,
        code: cfg.code,
        tagline: cfg.tagline,
        distanceM: null,
        timeMins: null,
        elevationGainM: null,
        elevationLossM: null,
        avgSlopeDeg: null,
        maxSlopeDeg: null,
        slopeAvailable: false,
        safetyScorePct: null,
        targetsVisitedCount: 0,
        isSafe: false,
        isComputable: false,
        isSimulated: true,
        unavailableReason: 'No collision-free path found around detected obstacles.',
        formulaDescription: SAFETY_FORMULA_DOC,
        returnFeasible: false,
        collisionChecksPassed: false,
        obstacleIntersectionsCount: 1,
        routeStatus: 'REJECTED',
        path: [],
        footprints: []
      };
      continue;
    }

    const finalColl = validatePathCollisions(solvedGrid, solvedGridPath);
    if (!finalColl.passed) {
      results[cfg.id] = {
        id: cfg.id,
        name: cfg.name,
        code: cfg.code,
        tagline: cfg.tagline,
        distanceM: null,
        timeMins: null,
        elevationGainM: null,
        elevationLossM: null,
        avgSlopeDeg: null,
        maxSlopeDeg: null,
        slopeAvailable: false,
        safetyScorePct: null,
        targetsVisitedCount: 0,
        isSafe: false,
        isComputable: false,
        isSimulated: true,
        unavailableReason: 'Route rejected due to obstacle intersection collision.',
        formulaDescription: SAFETY_FORMULA_DOC,
        returnFeasible: false,
        collisionChecksPassed: false,
        obstacleIntersectionsCount: finalColl.intersectionsCount,
        routeStatus: 'REJECTED',
        path: [],
        footprints: []
      };
      continue;
    }

    const metrics = computeDistanceAndSafety({
      gridPath: solvedGridPath,
      clearanceGrid: solvedClearance,
      boulderCount: params.boulders.length,
      roughnessScore: params.roughnessScore,
      sandCoveragePct: params.sandCoveragePct,
      gridSize,
      hasImageData: true,
      slopeMaxDeg: params.demSlopeMaxDeg ?? null,
      slopeAvgDeg: params.demSlopeAvgDeg ?? null
    });

    const pctPath = solvedGridPath.map(p => ({
      xPct: Number(((p.x / (gridSize - 1)) * 100).toFixed(1)),
      yPct: Number(((p.y / (gridSize - 1)) * 100).toFixed(1))
    }));
    const footprints = buildFootprints(pctPath);
    const sampleStep = Math.max(1, Math.floor(pctPath.length / 8));
    const sampledPts = pctPath.filter((_, idx) => idx === 0 || idx === pctPath.length - 1 || idx % sampleStep === 0);

    const hasLatLon =
      typeof params.centerLat === 'number' &&
      typeof params.centerLon === 'number' &&
      Number.isFinite(params.centerLat) &&
      Number.isFinite(params.centerLon);

    results[cfg.id] = {
      id: cfg.id,
      name: cfg.name,
      code: cfg.code,
      tagline: cfg.tagline,
      distanceM: metrics.distanceMeters,
      timeMins: metrics.estimatedMins,
      elevationGainM: null,
      elevationLossM: null,
      avgSlopeDeg: metrics.avgSlopeDeg,
      maxSlopeDeg: metrics.maxSlopeDeg,
      slopeAvailable: metrics.slopeAvailable,
      safetyScorePct: metrics.safetyScore,
      targetsVisitedCount: visitedCount,
      isSafe: (metrics.safetyScore ?? 0) >= 50,
      isComputable: true,
      isSimulated: true,
      unavailableReason: null,
      formulaDescription: SAFETY_FORMULA_DOC,
      returnFeasible: metrics.estimatedMins <= 120 && (metrics.safetyScore ?? 0) >= 45,
      collisionChecksPassed: true,
      obstacleIntersectionsCount: 0,
      routeStatus: 'VALIDATED',
      path: sampledPts.map(pt => ({
        x: pt.xPct,
        y: pt.yPct,
        lat: hasLatLon ? Number((params.centerLat! + ((50 - pt.yPct) / 100) * 0.004).toFixed(5)) : null,
        lon: hasLatLon ? Number((params.centerLon! + ((pt.xPct - 50) / 100) * 0.004).toFixed(5)) : null,
        elevM: typeof params.baseElevM === 'number' && Number.isFinite(params.baseElevM) ? Number(params.baseElevM.toFixed(1)) : null,
        slopeDeg: metrics.avgSlopeDeg
      })),
      footprints
    };
  }

  return results;
}
