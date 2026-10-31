import React, { useState, useEffect, useRef } from 'react';
import { AStarGrid } from '../utils/astar';
import {
  Navigation,
  Play,
  RotateCcw,
  Sliders,
  Cloud,
  Save,
  PenTool,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
  Split,
  ArrowRightLeft,
  Copy
} from 'lucide-react';
import SaveMissionModal from './SaveMissionModal';
import { useWorkspace } from '../context/WorkspaceContext';

// Helper: Generate a continuous staircase path (diagonal steps down-right, then horizontal to goal)
export function generateDefaultStaircasePath(start, goal) {
  const path = [];
  let x = start.x;
  let y = start.y;
  path.push({ x, y });

  while (x !== goal.x || y !== goal.y) {
    if (x < goal.x && y < goal.y) {
      if (path.length % 2 === 1) {
        x += 1;
      } else {
        y += 1;
      }
    } else if (x < goal.x) {
      x += 1;
    } else if (y < goal.y) {
      y += 1;
    } else if (x > goal.x) {
      x -= 1;
    } else if (y > goal.y) {
      y -= 1;
    } else {
      break;
    }
    if (!path.some(p => p.x === x && p.y === y)) {
      path.push({ x, y });
    }
  }

  // Ensure endpoints match exact start and goal
  if (path.length > 0) {
    path[0] = { x: start.x, y: start.y };
    path[path.length - 1] = { x: goal.x, y: goal.y };
  }
  return path;
}

// Helper: Bresenham's integer line algorithm to prevent skipped cells on fast mouse drag
function getBresenhamLine(p0, p1) {
  const points = [];
  let x0 = Math.round(p0.x);
  let y0 = Math.round(p0.y);
  const x1 = Math.round(p1.x);
  const y1 = Math.round(p1.y);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  return points;
}

export default function RoutePlanner({ onOpenMissions }) {
  const { logMissionEvent, updateActiveMission, sharedSession, updateSharedSession } = useWorkspace();

  // Grid dimensions: 28 cols x 16 rows
  const [astarInstance] = useState(() => new AStarGrid(28, 16));
  const [gridState, setGridState] = useState(() => [...astarInstance.grid.map(row => [...row])]);
  const [startPos, setStartPos] = useState({ ...astarInstance.start });
  const [goalPos, setGoalPos] = useState({ ...astarInstance.goal });

  // Route State: Marks Walk (User Drawn) vs A* Computed Path
  const [marksWalkPath, setMarksWalkPath] = useState(() => {
    if (sharedSession.marksWalkPath && sharedSession.marksWalkPath.length > 0) {
      return sharedSession.marksWalkPath;
    }
    return generateDefaultStaircasePath(astarInstance.start, astarInstance.goal);
  });

  const [astarComputedPath, setAstarComputedPath] = useState(() => {
    if (sharedSession.astarComputedPath && sharedSession.astarComputedPath.length > 0) {
      return sharedSession.astarComputedPath;
    }
    const initialAstar = astarInstance.findPath();
    return initialAstar.path || [];
  });

  const [pathResult, setPathResult] = useState(() => astarInstance.findPath());

  // Active Tool: 'marks_walk' | 3 (Boulder) | 1 (Sand) | 0 (Clear) | 'start' | 'goal'
  const [activeTool, setActiveTool] = useState('marks_walk');

  // Display Mode: 'marks_walk' | 'astar' | 'compare_both'
  const [activeDisplayMode, setActiveDisplayMode] = useState('marks_walk');

  // Interactive Mouse Dragging State for Marks Walk
  const [isMouseDown, setIsMouseDown] = useState(false);
  const lastDragRef = useRef(null);
  const [animSpeed, setAnimSpeed] = useState('normal');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedPath, setAnimatedPath] = useState([]);
  const [animatedExplored, setAnimatedExplored] = useState([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const animTimeoutRef = useRef(null);

  // Sync sharedSession on path changes
  useEffect(() => {
    updateSharedSession({
      marksWalkPath,
      astarComputedPath
    });
  }, [marksWalkPath, astarComputedPath]);

  // Mouse drawing / cell click handler
  const handleCellInteraction = (x, y, isDrag = false) => {
    if (isAnimating) return;

    if (activeTool === 'marks_walk') {
      if (!isDrag) {
        // Single click or initial mouse down
        setMarksWalkPath(prev => {
          // If starting a fresh stroke or single cell tap
          return [{ x, y }];
        });
      } else if (lastDragRef.current) {
        // Dragging with Bresenham interpolation to avoid missing fast-dragged cells
        const interpolated = getBresenhamLine(lastDragRef.current, { x, y });
        setMarksWalkPath(prev => {
          const updated = [...prev];
          interpolated.forEach(pt => {
            const last = updated[updated.length - 1];
            if (!last || last.x !== pt.x || last.y !== pt.y) {
              updated.push(pt);
            }
          });
          return updated;
        });
      }
      lastDragRef.current = { x, y };
      setActiveDisplayMode('marks_walk');
    } else if (activeTool === 'start') {
      if (!isDrag && astarInstance.setStart(x, y)) {
        setStartPos({ x, y });
      }
    } else if (activeTool === 'goal') {
      if (!isDrag && astarInstance.setGoal(x, y)) {
        setGoalPos({ x, y });
      }
    } else {
      // Placing obstacles or clearing cells
      astarInstance.setObstacle(x, y, activeTool);
      setGridState([...astarInstance.grid.map(row => [...row])]);
    }
  };

  const handleMouseDownCell = (x, y) => {
    setIsMouseDown(true);
    lastDragRef.current = { x, y };
    handleCellInteraction(x, y, false);
  };

  const handleMouseEnterCell = (x, y) => {
    if (isMouseDown) {
      handleCellInteraction(x, y, true);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    lastDragRef.current = null;
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Clear user-drawn Marks Walk route
  const handleClearMarksWalk = () => {
    setMarksWalkPath([]);
  };

  // Reset to default continuous staircase route
  const handleResetToDefaultStaircase = () => {
    const defaultPath = generateDefaultStaircasePath(startPos, goalPos);
    setMarksWalkPath(defaultPath);
    setActiveDisplayMode('marks_walk');
  };

  // Synchronize: Copy Marks Walk route directly into A* Trajectory
  const handleSyncMarksWalkToAStar = () => {
    setAstarComputedPath([...marksWalkPath]);
    setActiveDisplayMode('compare_both');
    if (logMissionEvent) {
      logMissionEvent({
        type: 'Marks Walk Synchronized to A* Trajectory',
        status: 'Success',
        details: `Synchronized ${marksWalkPath.length} Marks Walk cells directly into A* Trajectory visualization.`,
        method: 'Grid Route Synchronization'
      });
    }
  };

  // Synchronize: Copy A* Computed Path into Marks Walk route
  const handleSyncAStarToMarksWalk = () => {
    if (astarComputedPath.length > 0) {
      setMarksWalkPath([...astarComputedPath]);
      setActiveDisplayMode('compare_both');
      if (logMissionEvent) {
        logMissionEvent({
          type: 'A* Trajectory Synchronized to Marks Walk',
          status: 'Success',
          details: `Synchronized ${astarComputedPath.length} A* waypoints directly into Marks Walk route.`,
          method: 'Grid Route Synchronization'
        });
      }
    }
  };

  // Compute A* algorithm
  const handleRunAStar = () => {
    if (isAnimating) return;
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);

    // Update mission state to "In Progress" for waypoints checkpoint
    if (updateActiveMission) {
      updateActiveMission({ isCalculatingRoute: true });
    }

    const res = astarInstance.findPath();
    setPathResult(res);
    const computedPath = res.path || [];
    setAstarComputedPath(computedPath);
    setActiveDisplayMode('astar');

    if (res.success && logMissionEvent) {
      logMissionEvent({
        type: 'A* Trajectory Computed',
        status: 'Success',
        details: `Computed A* vector (${res.pixelLength} m, ${res.totalCost} cost units, ${computedPath.length} waypoints).`,
        method: 'Weighted A* Graph Search'
      });
      if (updateActiveMission) {
        updateActiveMission({
          startPoint: { x: startPos.x, y: startPos.y },
          destinationPoint: { x: goalPos.x, y: goalPos.y },
          routeMetrics: {
            distanceM: res.pixelLength,
            energyWh: Math.round(res.totalCost * 1.2),
            nodeCount: computedPath.length,
            pathfindingStatus: 'Path Found (A*)'
          },
          rawRoutePath: computedPath,
          isCalculatingRoute: animSpeed === 'instant' ? false : true
        });
      }
    } else {
      // If failed or instant, reset flag immediately
      if (updateActiveMission) {
        updateActiveMission({ isCalculatingRoute: false });
      }
    }

    if (animSpeed === 'instant' || !res.success) {
      setAnimatedExplored(res.exploredNodes || []);
      setAnimatedPath(computedPath);
      return;
    }

    // Step-by-step search animation for A* Trajectory
    setIsAnimating(true);
    const delay = animSpeed === 'slow' ? 25 : animSpeed === 'normal' ? 12 : 4;

    let eIndex = 0;
    const animateExplored = () => {
      if (eIndex < (res.exploredNodes?.length || 0)) {
        setAnimatedExplored(res.exploredNodes.slice(0, eIndex + 3));
        eIndex += 3;
        animTimeoutRef.current = setTimeout(animateExplored, delay);
      } else {
        let pIndex = 0;
        const animatePath = () => {
          if (pIndex <= computedPath.length) {
            setAnimatedPath(computedPath.slice(0, pIndex));
            pIndex++;
            animTimeoutRef.current = setTimeout(animatePath, delay * 2.5);
          } else {
            setIsAnimating(false);
            if (updateActiveMission) {
              updateActiveMission({ isCalculatingRoute: false });
            }
          }
        };
        animatePath();
      }
    };
    animateExplored();
  };

  const handleReset = () => {
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    astarInstance.resetGrid();
    setGridState([...astarInstance.grid.map(row => [...row])]);
    const defaultStart = { x: 2, y: 2 };
    const defaultGoal = { x: 25, y: 13 };
    setStartPos(defaultStart);
    setGoalPos(defaultGoal);
    astarInstance.setStart(defaultStart.x, defaultStart.y);
    astarInstance.setGoal(defaultGoal.x, defaultGoal.y);

    const defaultPath = generateDefaultStaircasePath(defaultStart, defaultGoal);
    setMarksWalkPath(defaultPath);

    const freshAstar = astarInstance.findPath();
    setAstarComputedPath(freshAstar.path || []);
    setPathResult(freshAstar);

    setAnimatedPath([]);
    setAnimatedExplored([]);
    setIsAnimating(false);
    setActiveDisplayMode('marks_walk');
  };

  // Helper checks for cell rendering
  const isMarksWalkCell = (x, y) => marksWalkPath.some(p => p.x === x && p.y === y);
  const isAstarCell = (x, y) => {
    if (isAnimating) return animatedPath.some(p => p.x === x && p.y === y);
    return astarComputedPath.some(p => p.x === x && p.y === y);
  };
  const isExploredCell = (x, y) => animatedExplored.some(p => p.x === x && p.y === y);

  // Compute metrics for Marks Walk route
  const computeMarksWalkCost = () => {
    let cost = 0;
    let collisions = 0;
    marksWalkPath.forEach(p => {
      const cellVal = gridState[p.y]?.[p.x];
      if (cellVal === 3) collisions++;
      else if (cellVal === 1) cost += 2.0;
      else cost += 1.0;
    });
    return {
      steps: marksWalkPath.length,
      cost: Math.round(cost * 10) / 10,
      collisions,
      hasCollisions: collisions > 0
    };
  };

  const marksWalkMetrics = computeMarksWalkCost();

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Workbench Header */}
      <div className="bg-[#0A0E1C] border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="text-orange-400 font-semibold">Route Laboratory &amp; Grid Planner</span>
            <span aria-hidden="true">·</span>
            <span>Marks Walk &amp; A* Trajectory Synchronization</span>
            <span aria-hidden="true">·</span>
            <span>Grid: 28 × 16</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Marks Walk &amp; A* Trajectory Synchronized Grid
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
            Draw exact routes in Marks Walk or compute optimal paths via A* search. Both visualizations operate on the identical grid coordinates, cell boundaries, and obstacles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenMissions && (
            <button
              onClick={onOpenMissions}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs font-medium flex items-center gap-1.5"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Saved Missions</span>
            </button>
          )}
          <button
            disabled={marksWalkPath.length === 0 && astarComputedPath.length === 0}
            onClick={() => setIsSaveModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Active Route</span>
          </button>
        </div>
      </div>

      {/* Main Grid Canvas Workbench */}
      <div className="bg-[#090D1A] border border-slate-800/80 p-5 rounded-xl space-y-5 shadow-lg">
        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          {/* Grid Brush & Marks Walk Tools */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-xs font-medium mr-1 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              <span>Grid Brush:</span>
            </span>

            <button
              onClick={() => setActiveTool('marks_walk')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                activeTool === 'marks_walk'
                  ? 'bg-orange-600 text-white border border-orange-400 font-bold shadow-md shadow-orange-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-orange-300" />
              <span>Marks Walk (Draw Route)</span>
            </button>

            <button
              onClick={() => setActiveTool(3)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 3
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Boulder (Impassable)
            </button>

            <button
              onClick={() => setActiveTool(1)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 1
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Sand Dune (Cost 2.0)
            </button>

            <button
              onClick={() => setActiveTool(0)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 0
                  ? 'bg-slate-800 text-white border border-slate-700 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Clear Cell
            </button>

            <button
              onClick={() => setActiveTool('start')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 'start'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Rover Start (S)
            </button>

            <button
              onClick={() => setActiveTool('goal')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 'goal'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Goal Target (G)
            </button>
          </div>

          {/* Synchronization, Speed & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncMarksWalkToAStar}
              title="Copy Marks Walk route directly into A* Trajectory"
              className="px-2.5 py-1.5 rounded-md bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/40 transition-colors cursor-pointer text-xs font-medium flex items-center gap-1"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
              <span>Sync Walk → A*</span>
            </button>

            <button
              onClick={handleSyncAStarToMarksWalk}
              title="Copy A* Computed route directly into Marks Walk"
              className="px-2.5 py-1.5 rounded-md bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer text-xs font-medium flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sync A* → Walk</span>
            </button>

            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-800 text-xs">
              <span className="text-slate-400 px-1.5 text-[11px]">Speed:</span>
              {['slow', 'normal', 'fast', 'instant'].map(spd => (
                <button
                  key={spd}
                  onClick={() => setAnimSpeed(spd)}
                  className={`px-2 py-1 rounded capitalize text-xs transition-colors cursor-pointer ${
                    animSpeed === spd ? 'bg-orange-600 text-white font-medium' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>

            <button
              onClick={handleResetToDefaultStaircase}
              className="px-2.5 py-1.5 rounded-md bg-orange-950/40 hover:bg-orange-900/60 text-orange-300 border border-orange-500/30 transition-colors cursor-pointer text-xs font-medium"
            >
              Default Staircase
            </button>

            {marksWalkPath.length > 0 && (
              <button
                onClick={handleClearMarksWalk}
                className="px-2.5 py-1.5 rounded-md bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 transition-colors cursor-pointer text-xs font-medium"
              >
                Clear Drawn
              </button>
            )}

            <button
              onClick={handleReset}
              disabled={isAnimating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer disabled:opacity-50 text-xs font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Grid</span>
            </button>

            <button
              onClick={handleRunAStar}
              disabled={isAnimating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 shadow-md"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isAnimating ? 'Searching...' : 'Compute A* Route'}</span>
            </button>
          </div>
        </div>

        {/* View Mode Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#060810] border border-slate-800/80 rounded-xl font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-sans font-medium text-[11px] mr-1">Trajectory Display Mode:</span>
            <button
              onClick={() => setActiveDisplayMode('marks_walk')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeDisplayMode === 'marks_walk'
                  ? 'bg-orange-600 text-white font-bold shadow-lg shadow-orange-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-orange-300" />
              <span>Marks Walk Route ({marksWalkPath.length} cells)</span>
            </button>

            <button
              onClick={() => setActiveDisplayMode('astar')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeDisplayMode === 'astar'
                  ? 'bg-cyan-600 text-white font-bold shadow-lg shadow-cyan-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-cyan-300" />
              <span>A* Computed Route ({astarComputedPath.length} waypoints)</span>
            </button>

            <button
              onClick={() => setActiveDisplayMode('compare_both')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeDisplayMode === 'compare_both'
                  ? 'bg-purple-600 text-white font-bold shadow-lg shadow-purple-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Split className="w-3.5 h-3.5 text-purple-300" />
              <span>Overlay Both Routes</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            {activeTool === 'marks_walk' ? (
              <span className="text-orange-400 font-bold animate-pulse">Drag mouse across grid to draw Marks Walk route</span>
            ) : (
              <span>Grid Brush Mode: {typeof activeTool === 'string' ? activeTool.toUpperCase() : activeTool === 3 ? 'BOULDER' : activeTool === 1 ? 'SAND DUNE' : 'CLEAR'}</span>
            )}
          </div>
        </div>

        {/* Textured Martian Grid Canvas */}
        <div className="relative rounded-lg p-4 bg-[#060810] border border-slate-800/80 overflow-x-auto shadow-inner">
          <div
            className="grid gap-1 mx-auto relative z-10"
            style={{
              gridTemplateColumns: `repeat(${astarInstance.width}, minmax(28px, 1fr))`,
              width: 'fit-content'
            }}
          >
            {gridState.map((row, y) =>
              row.map((cellType, x) => {
                const isStart = startPos.x === x && startPos.y === y;
                const isGoal = goalPos.x === x && goalPos.y === y;

                const onMarksWalk = isMarksWalkCell(x, y);
                const onAstar = isAstarCell(x, y);
                const explored = isExploredCell(x, y);

                let bgClass = 'bg-[#101422] border-slate-800/60 hover:border-orange-500/40 text-slate-600';

                // Obstacle styling
                if (cellType === 3) {
                  bgClass = 'bg-[#220B0B] border-red-900/50 text-red-400';
                } else if (cellType === 1) {
                  bgClass = 'bg-[#261B09] border-amber-800/50 text-amber-300';
                }

                // Explored nodes during A* search
                if (explored && activeDisplayMode !== 'marks_walk' && !onAstar && !isStart && !isGoal) {
                  bgClass = 'bg-sky-950/70 border-sky-600/50 text-sky-300';
                }

                // Render Route Colors based on activeDisplayMode
                if (activeDisplayMode === 'marks_walk') {
                  if (onMarksWalk && !isStart && !isGoal) {
                    bgClass = cellType === 3
                      ? 'bg-red-600 border-red-400 text-white font-bold animate-pulse'
                      : 'bg-orange-600 border-amber-300 text-white font-bold scale-95 shadow-md shadow-orange-600/40';
                  }
                } else if (activeDisplayMode === 'astar') {
                  if (onAstar && !isStart && !isGoal) {
                    bgClass = 'bg-cyan-600 border-cyan-300 text-white font-bold scale-95 shadow-md shadow-cyan-600/40';
                  }
                } else if (activeDisplayMode === 'compare_both') {
                  if (onMarksWalk && onAstar && !isStart && !isGoal) {
                    // Overlapping cell
                    bgClass = 'bg-gradient-to-r from-orange-600 to-cyan-600 border-purple-300 text-white font-bold scale-95 shadow-lg shadow-purple-600/50';
                  } else if (onMarksWalk && !isStart && !isGoal) {
                    bgClass = 'bg-orange-600 border-amber-300 text-white font-bold scale-95 shadow-md shadow-orange-600/40';
                  } else if (onAstar && !isStart && !isGoal) {
                    bgClass = 'bg-cyan-600 border-cyan-300 text-white font-bold scale-95 shadow-md shadow-cyan-600/40';
                  }
                }

                // Green Start
                if (isStart) {
                  bgClass = 'bg-emerald-600 border-emerald-400 text-white font-bold ring-2 ring-emerald-500/50';
                }

                // Red Goal
                if (isGoal) {
                  bgClass = 'bg-red-600 border-red-400 text-white font-bold ring-2 ring-red-500/50';
                }

                return (
                  <div
                    key={`${x}-${y}`}
                    onMouseDown={() => handleMouseDownCell(x, y)}
                    onMouseEnter={() => handleMouseEnterCell(x, y)}
                    className={`w-7 h-7 rounded border cursor-pointer transition-all flex items-center justify-center text-[10px] font-mono select-none ${bgClass}`}
                    title={`Cell (${x}, ${y}) | Cost: ${cellType === 3 ? '∞' : cellType === 1 ? '2.0' : '1.0'}`}
                  >
                    {isStart ? 'S' : isGoal ? 'G' : onMarksWalk && onAstar && activeDisplayMode === 'compare_both' ? '★' : ''}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Legend & Dual Route Comparison Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-slate-800/60 items-center">
          {/* Legend */}
          <div className="lg:col-span-5 space-y-1.5">
            <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider block">Grid Cell Key:</span>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /><span>Start (S)</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500" /><span>Goal (G)</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-500" /><span>Marks Walk Route</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-cyan-500" /><span>A* Computed Route</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-700" /><span>Sand Dune (2.0)</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-950 border border-red-800" /><span>Boulder (∞)</span></span>
            </div>
          </div>

          {/* Metrics Comparison Display */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Marks Walk Length</span>
              <span className="text-base font-bold text-orange-400">
                {marksWalkMetrics.steps > 0 ? `${marksWalkMetrics.steps} cells` : 'Unset'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Marks Walk Cost</span>
              <span className={`text-base font-bold ${marksWalkMetrics.hasCollisions ? 'text-red-400' : 'text-amber-400'}`}>
                {marksWalkMetrics.steps > 0 ? `${marksWalkMetrics.cost} pts` : 'Unset'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">A* Path Length</span>
              <span className="text-base font-bold text-cyan-400">
                {pathResult?.success ? `${pathResult.steps} waypoints` : astarComputedPath.length > 0 ? `${astarComputedPath.length} waypoints` : 'Uncomputed'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">A* Traversal Cost</span>
              <span className="text-base font-bold text-emerald-400">
                {pathResult?.success ? `${pathResult.totalCost} pts` : 'Uncomputed'}
              </span>
            </div>
          </div>
        </div>

        {/* Collisions Alert Banner if User-Drawn Route crosses Boulders */}
        {marksWalkMetrics.hasCollisions && (
          <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl flex items-center justify-between text-red-300 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>Marks Walk Route intersects {marksWalkMetrics.collisions} impassable boulder obstacle(s)! Click "Compute A* Route" to generate a safe detour.</span>
            </div>
            <button
              onClick={handleRunAStar}
              className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] cursor-pointer"
            >
              Compute A* Detour
            </button>
          </div>
        )}
      </div>

      {/* Save Mission Modal */}
      <SaveMissionModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        initialData={{
          title: `Jezero Grid Traverse (${startPos.x},${startPos.y}) → (${goalPos.x},${goalPos.y})`,
          routeType: activeDisplayMode === 'marks_walk' ? 'Marks Walk User Route' : 'A* Trajectory Grid Path',
          distanceM: activeDisplayMode === 'marks_walk' ? Math.round(marksWalkMetrics.steps * 1.5) : pathResult ? Math.round(pathResult.pixelLength * 1.5) : 0,
          energyWh: activeDisplayMode === 'marks_walk' ? Math.round(marksWalkMetrics.cost * 1.2) : pathResult ? Math.round(pathResult.totalCost * 1.2) : 0,
          notes: activeDisplayMode === 'marks_walk'
            ? `Marks Walk User-Drawn Route: ${marksWalkMetrics.steps} cells, traversal cost ${marksWalkMetrics.cost} pts.`
            : `A* Trajectory Path: ${pathResult?.steps || 0} waypoints, explored ${pathResult?.exploredCount || 0} nodes.`
        }}
        onSuccess={() => {
          if (onOpenMissions) onOpenMissions();
        }}
      />
    </div>
  );
}

