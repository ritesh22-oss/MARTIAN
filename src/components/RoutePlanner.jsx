import React, { useState, useEffect, useRef } from 'react';
import { AStarGrid } from '../utils/astar';
import { Navigation, Play, RotateCcw, Sliders, Cloud, Save, Gauge, Info } from 'lucide-react';
import SaveMissionModal from './SaveMissionModal';

import { useWorkspace } from '../context/WorkspaceContext';

export default function RoutePlanner({ onOpenMissions }) {
  const { logMissionEvent, updateActiveMission } = useWorkspace();
  const [astarInstance] = useState(() => new AStarGrid(28, 16));
  const [gridState, setGridState] = useState(() => [...astarInstance.grid]);
  const [startPos, setStartPos] = useState({ ...astarInstance.start });
  const [goalPos, setGoalPos] = useState({ ...astarInstance.goal });
  const [pathResult, setPathResult] = useState(null);
  const [animatedPath, setAnimatedPath] = useState([]);
  const [animatedExplored, setAnimatedExplored] = useState([]);
  const [activeTool, setActiveTool] = useState(3); // 3: Boulder (∞), 1: Sand (2.0), 0: Clear
  const [animSpeed, setAnimSpeed] = useState('normal'); // 'slow', 'normal', 'fast', 'instant'
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const animTimeoutRef = useRef(null);

  const handleCellClick = (x, y) => {
    if (isAnimating) return;
    if (activeTool === 'start') {
      if (astarInstance.setStart(x, y)) {
        setStartPos({ x, y });
        clearResults();
      }
    } else if (activeTool === 'goal') {
      if (astarInstance.setGoal(x, y)) {
        setGoalPos({ x, y });
        clearResults();
      }
    } else {
      astarInstance.setObstacle(x, y, activeTool);
      setGridState([...astarInstance.grid.map(row => [...row])]);
      clearResults();
    }
  };

  const clearResults = () => {
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    setPathResult(null);
    setAnimatedPath([]);
    setAnimatedExplored([]);
  };

  const handleRunAStar = () => {
    if (isAnimating) return;
    clearResults();

    const res = astarInstance.findPath();
    setPathResult(res);

    if (res.success && logMissionEvent) {
      logMissionEvent({
        type: 'A* Pathfinding Search',
        status: 'Success',
        details: `Computed ${res.distanceM} m vector (${res.cost} cost units, ${res.path.length} waypoints).`,
        method: 'Weighted A* Graph Search'
      });
      if (updateActiveMission) {
        updateActiveMission({
          startPoint: { x: startPos.x, y: startPos.y },
          destinationPoint: { x: goalPos.x, y: goalPos.y },
          routeMetrics: {
            distanceM: res.distanceM,
            energyWh: res.energyWh,
            nodeCount: res.path.length,
            pathfindingStatus: 'Path Found (A*)'
          },
          rawRoutePath: res.path
        });
      }
    }

    if (animSpeed === 'instant' || !res.success) {
      setAnimatedExplored(res.exploredNodes || []);
      setAnimatedPath(res.path || []);
      return;
    }

    // Step-by-step search animation
    setIsAnimating(true);
    const delay = animSpeed === 'slow' ? 25 : animSpeed === 'normal' ? 12 : 4;
    
    let eIndex = 0;
    const animateExplored = () => {
      if (eIndex < res.exploredNodes.length) {
        setAnimatedExplored(res.exploredNodes.slice(0, eIndex + 3));
        eIndex += 3;
        animTimeoutRef.current = setTimeout(animateExplored, delay);
      } else {
        let pIndex = 0;
        const animatePath = () => {
          if (pIndex <= res.path.length) {
            setAnimatedPath(res.path.slice(0, pIndex));
            pIndex++;
            animTimeoutRef.current = setTimeout(animatePath, delay * 2.5);
          } else {
            setIsAnimating(false);
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
    setStartPos({ ...astarInstance.start });
    setGoalPos({ ...astarInstance.goal });
    clearResults();
    setIsAnimating(false);
  };

  const isPathCell = (x, y) => {
    return animatedPath.some(p => p.x === x && p.y === y);
  };

  const isExploredCell = (x, y) => {
    return animatedExplored.some(p => p.x === x && p.y === y);
  };

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Workbench Header */}
      <div className="bg-[#0A0E1C] border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="text-orange-400 font-semibold">Autonomous Navigation Laboratory</span>
            <span aria-hidden="true">·</span>
            <span>Weighted A* Graph Search</span>
            <span aria-hidden="true">·</span>
            <span>Grid: 28 × 16</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            A* Trajectory & Heuristic Pathfinding Grid
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
            Configure obstacles, start vectors, and science targets to evaluate traversal costs and path clearance in real time.
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
            disabled={!pathResult?.success}
            onClick={() => setIsSaveModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Route</span>
          </button>
        </div>
      </div>

      {/* Main Grid Canvas Workbench */}
      <div className="bg-[#090D1A] border border-slate-800/80 p-5 rounded-xl space-y-5 shadow-lg">
        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
          {/* Tool Selection */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-xs font-medium mr-1 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              <span>Grid Brush:</span>
            </span>

            <button
              onClick={() => setActiveTool(3)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 3
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Boulder (Impassable)
            </button>
            <button
              onClick={() => setActiveTool(1)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 1
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Sand Dune (Cost 2.0)
            </button>
            <button
              onClick={() => setActiveTool(0)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 0
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Clear Cell
            </button>
            <button
              onClick={() => setActiveTool('start')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 'start'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Rover Start (S)
            </button>
            <button
              onClick={() => setActiveTool('goal')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTool === 'goal'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Goal Target (G)
            </button>
          </div>

          {/* Animation Speed & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-md border border-slate-800 text-xs">
              <span className="text-slate-400 px-2 text-[11px]">Speed:</span>
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
              onClick={handleReset}
              disabled={isAnimating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer disabled:opacity-50 text-xs font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleRunAStar}
              disabled={isAnimating}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isAnimating ? 'Searching...' : 'Compute A* Route'}</span>
            </button>
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
                const onPath = isPathCell(x, y);
                const explored = isExploredCell(x, y);

                let bgClass = 'bg-[#101422] border-slate-800/60 hover:border-orange-500/40 text-slate-600';
                
                // Obstacle styling
                if (cellType === 3) {
                  bgClass = 'bg-[#220B0B] border-red-900/50 text-red-400';
                } else if (cellType === 1) {
                  bgClass = 'bg-[#261B09] border-amber-800/50 text-amber-300';
                }

                // Explored in Cool Blue
                if (explored && !onPath && !isStart && !isGoal) {
                  bgClass = 'bg-sky-950/70 border-sky-600/50 text-sky-300';
                }

                // Glowing Orange Calculated Path
                if (onPath && !isStart && !isGoal) {
                  bgClass = 'bg-orange-600 border-amber-300 text-white font-bold scale-95 shadow-md shadow-orange-600/40';
                }

                // Green Start
                if (isStart) {
                  bgClass = 'bg-emerald-600 border-emerald-400 text-white font-bold';
                }

                // Red Goal
                if (isGoal) {
                  bgClass = 'bg-red-600 border-red-400 text-white font-bold';
                }

                return (
                  <div
                    key={`${x}-${y}`}
                    onClick={() => handleCellClick(x, y)}
                    className={`w-7 h-7 rounded border cursor-pointer transition-colors flex items-center justify-center text-[10px] font-mono select-none ${bgClass}`}
                    title={`Coords (${x}, ${y}) | Cost: ${cellType === 3 ? '∞' : cellType === 1 ? '2.0' : '1.0'}`}
                  >
                    {isStart ? 'S' : isGoal ? 'G' : onPath ? '•' : ''}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Metrics & Classification Legend */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-slate-800/60 items-center">
          {/* Legend */}
          <div className="lg:col-span-5 space-y-1.5">
            <span className="text-slate-400 text-[11px] font-medium uppercase tracking-wider block">Terrain Key:</span>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /><span>Start (S)</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500" /><span>Goal (G)</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-sky-500" /><span>Explored</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-orange-500" /><span>Optimal Route</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-700" /><span>Sand (2.0)</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-950 border border-red-800" /><span>Boulder (∞)</span></span>
            </div>
          </div>

          {/* Metrics Display with Monospace Numerals */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Path Length</span>
              <span className="text-base font-bold text-orange-400 font-mono">
                {pathResult ? `${pathResult.steps} steps` : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Traversal Cost</span>
              <span className="text-base font-bold text-amber-400 font-mono">
                {pathResult ? pathResult.totalCost : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Explored Nodes</span>
              <span className="text-base font-bold text-sky-400 font-mono">
                {pathResult ? pathResult.exploredCount : '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-sans">A* State</span>
              <span className={`text-base font-bold ${pathResult?.success ? 'text-emerald-400' : 'text-slate-400'}`}>
                {pathResult ? (pathResult.success ? 'Optimal' : 'Blocked') : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Mission Modal */}
      <SaveMissionModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        initialData={{
          title: `Jezero Traverse (${startPos.x},${startPos.y}) → (${goalPos.x},${goalPos.y})`,
          routeType: 'A* Grid Path',
          distanceM: pathResult ? Math.round(pathResult.steps * 45) : 800,
          energyWh: pathResult ? Math.round(pathResult.totalCost * 28) : 320,
          notes: `A* grid vector: ${pathResult?.steps || 0} steps, explored ${pathResult?.exploredCount || 0} nodes with total cost ${pathResult?.totalCost || 0}.`
        }}
        onSuccess={() => {
          if (onOpenMissions) onOpenMissions();
        }}
      />
    </div>
  );
}
