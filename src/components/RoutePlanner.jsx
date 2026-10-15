import React, { useState, useEffect, useRef } from 'react';
import { AStarGrid } from '../utils/astar';
import { Navigation, Play, RotateCcw, ShieldAlert, Sparkles, CheckCircle2, Zap, Gauge, Sliders, Cloud, Save } from 'lucide-react';
import SaveMissionModal from './SaveMissionModal';

export default function RoutePlanner({ onOpenMissions }) {
  const [astarInstance] = useState(() => new AStarGrid(28, 16));
  const [gridState, setGridState] = useState(() => [...astarInstance.grid]);
  const [startPos, setStartPos] = useState({ ...astarInstance.start });
  const [goalPos, setGoalPos] = useState({ ...astarInstance.goal });
  const [pathResult, setPathResult] = useState(null);
  const [animatedPath, setAnimatedPath] = useState([]);
  const [animatedExplored, setAnimatedExplored] = useState([]);
  const [activeTool, setActiveTool] = useState(3); // 3: Boulder (∞), 2: Rough Bedrock (5.0), 1: Sand (2.0), 0: Clear
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

    if (animSpeed === 'instant' || !res.success) {
      setAnimatedExplored(res.exploredNodes || []);
      setAnimatedPath(res.path || []);
      return;
    }

    // Step-by-step animation
    setIsAnimating(true);
    const delay = animSpeed === 'slow' ? 25 : animSpeed === 'normal' ? 12 : 4;
    
    // First animate explored nodes in blue
    let eIndex = 0;
    const animateExplored = () => {
      if (eIndex < res.exploredNodes.length) {
        setAnimatedExplored(res.exploredNodes.slice(0, eIndex + 3));
        eIndex += 3;
        animTimeoutRef.current = setTimeout(animateExplored, delay);
      } else {
        // Then animate glowing orange path
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
    <section id="route-planner" className="py-24 px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl mx-auto">
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-xs font-mono text-orange-400 uppercase tracking-widest">
            <Navigation className="w-3.5 h-3.5" />
            <span>Autonomous Pathfinding Engine</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            A* Cost-Aware <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Rover Trajectory Grid
            </span>
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Real-time graph search algorithm evaluating terrain traversal costs, slip hazards, and obstacle avoidance.
          </p>
          <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300">
            DISCLAIMER: Computational simulation benchmark. Not certified for flight operations.
          </div>
        </div>

        {/* Main Grid Card */}
        <div className="bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-8">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
            {/* Tool Selection */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono uppercase text-slate-400 mr-2 flex items-center space-x-1">
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
                <span>Tool:</span>
              </span>
              <button
                onClick={() => setActiveTool(3)}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  activeTool === 3 ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                Boulder (Impassable)
              </button>
              <button
                onClick={() => setActiveTool(1)}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  activeTool === 1 ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                Sand Dune (Cost 2.0)
              </button>
              <button
                onClick={() => setActiveTool(0)}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  activeTool === 0 ? 'bg-slate-700 text-white shadow-lg' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                Clear Cell
              </button>
              <button
                onClick={() => setActiveTool('start')}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  activeTool === 'start' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                Set Rover (Start)
              </button>
              <button
                onClick={() => setActiveTool('goal')}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  activeTool === 'goal' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                Set Target (Goal)
              </button>
            </div>

            {/* Animation Speed & Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-mono">
                <span className="text-slate-400 px-2 flex items-center space-x-1">
                  <Gauge className="w-3 h-3 text-orange-400" />
                  <span>Speed:</span>
                </span>
                {['slow', 'normal', 'fast', 'instant'].map(spd => (
                  <button
                    key={spd}
                    onClick={() => setAnimSpeed(spd)}
                    className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] transition-all ${
                      animSpeed === spd ? 'bg-orange-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>

              <button
                onClick={handleReset}
                disabled={isAnimating}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold tracking-wide border border-white/10 transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                onClick={handleRunAStar}
                disabled={isAnimating}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xs font-bold tracking-wider uppercase shadow-xl shadow-orange-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isAnimating ? 'Searching...' : 'Calculate Route'}</span>
              </button>
            </div>
          </div>

          {/* Textured Martian Grid Canvas */}
          <div className="relative rounded-2xl p-4 bg-gradient-to-b from-[#2a0e08]/40 via-[#180806]/60 to-[#0B1020] border border-orange-500/20 overflow-x-auto shadow-inner">
            <div
              className="grid gap-1 mx-auto relative z-10"
              style={{
                gridTemplateColumns: `repeat(${astarInstance.width}, minmax(26px, 1fr))`,
                width: 'fit-content'
              }}
            >
              {gridState.map((row, y) =>
                row.map((cellType, x) => {
                  const isStart = startPos.x === x && startPos.y === y;
                  const isGoal = goalPos.x === x && goalPos.y === y;
                  const onPath = isPathCell(x, y);
                  const explored = isExploredCell(x, y);

                  let bgClass = 'bg-[#150a0d]/70 border-white/5 hover:border-orange-500/40 text-slate-500';
                  
                  // Obstacle styling
                  if (cellType === 3) {
                    bgClass = 'bg-[#120505] border-red-900/60 shadow-inner text-red-400';
                  } else if (cellType === 1) {
                    bgClass = 'bg-amber-950/70 border-amber-600/40 text-amber-300';
                  }

                  // Explored in Cool Blue (as requested)
                  if (explored && !onPath && !isStart && !isGoal) {
                    bgClass = 'bg-sky-600/30 border-sky-400/50 text-sky-200 animate-pulse';
                  }

                  // Glowing Orange Calculated Path (as requested)
                  if (onPath && !isStart && !isGoal) {
                    bgClass = 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/60 border-amber-300 font-bold scale-95';
                  }

                  // Green Start
                  if (isStart) {
                    bgClass = 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/60 border-emerald-300 font-black';
                  }

                  // Red Goal
                  if (isGoal) {
                    bgClass = 'bg-red-500 text-white shadow-xl shadow-red-500/60 border-red-300 font-black';
                  }

                  return (
                    <div
                      key={`${x}-${y}`}
                      onClick={() => handleCellClick(x, y)}
                      className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md border cursor-pointer transition-all flex items-center justify-center text-[10px] font-mono select-none ${bgClass}`}
                      title={`Coords (${x}, ${y}) | Cost: ${cellType === 3 ? '∞' : cellType === 1 ? '2.0' : '1.0'}`}
                    >
                      {isStart ? 'S' : isGoal ? 'G' : onPath ? '•' : ''}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Metrics & Color Legend */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 border-t border-white/10 items-center">
            {/* Legend */}
            <div className="lg:col-span-5 space-y-2">
              <span className="text-xs font-mono uppercase text-slate-400">Map Classification:</span>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
                <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /><span>Start (S)</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-red-500" /><span>Goal (G)</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-sky-500" /><span>Explored (Blue)</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-orange-500" /><span>Route (Orange)</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-amber-800" /><span>Sand (2.0)</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-red-950 border border-red-800" /><span>Boulder (∞)</span></span>
              </div>
            </div>

            {/* Metrics Display */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/[0.02] border border-white/10 p-4 rounded-2xl text-xs font-mono text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Path Length</span>
                <span className="text-base font-bold text-orange-400">{pathResult ? pathResult.steps : '---'} steps</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Traversal Cost</span>
                <span className="text-base font-bold text-amber-400">{pathResult ? pathResult.totalCost : '---'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Explored Nodes</span>
                <span className="text-base font-bold text-sky-400">{pathResult ? pathResult.exploredCount : '---'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">A* Status</span>
                <span className={`text-base font-bold ${pathResult?.success ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {pathResult ? (pathResult.success ? 'Optimized' : 'Blocked') : 'Ready'}
                </span>
              </div>
            </div>
          </div>

          {/* Cloud Persistence Toolbar */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 text-xs font-mono">
            <div className="flex items-center space-x-2 text-slate-400">
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span>Google Cloud Firestore Persistence:</span>
              <span className="text-emerald-400">Online & Secured</span>
            </div>

            <div className="flex items-center space-x-3">
              {onOpenMissions && (
                <button
                  onClick={onOpenMissions}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  View Cloud Log
                </button>
              )}

              <button
                disabled={!pathResult?.success}
                onClick={() => setIsSaveModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-semibold shadow-lg shadow-orange-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Route to Cloud</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Mission Modal */}
      <SaveMissionModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        initialData={{
          title: `Traverse (${startPos.x},${startPos.y}) → (${goalPos.x},${goalPos.y})`,
          routeType: 'A* Grid Path',
          distanceM: pathResult ? Math.round(pathResult.steps * 45) : 800,
          energyWh: pathResult ? Math.round(pathResult.totalCost * 28) : 320,
          notes: `A* grid route: ${pathResult?.steps || 0} steps, explored ${pathResult?.exploredCount || 0} nodes with total cost ${pathResult?.totalCost || 0}.`
        }}
        onSuccess={() => {
          if (onOpenMissions) onOpenMissions();
        }}
      />
    </section>
  );
}
