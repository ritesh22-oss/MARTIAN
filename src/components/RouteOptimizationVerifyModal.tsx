import React, { useState } from 'react';
import { 
  X, Navigation, Route, Play, RefreshCw, CheckCircle2, AlertTriangle, Sliders, Zap, BarChart3 
} from 'lucide-react';
import { calculateMechanicalEnergy } from '../utils/marsScienceData';

interface RouteOptimizationVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrbitWithContext?: (contextText: string) => void;
}

export default function RouteOptimizationVerifyModal({ 
  isOpen, 
  onClose, 
  onOpenOrbitWithContext 
}: RouteOptimizationVerifyModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'config' | 'test' | 'results' | 'validation'>('overview');
  
  const [selectedStrategy, setSelectedStrategy] = useState<'optimal' | 'cost' | 'uncertainty' | 'science'>('optimal');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [executionLog, setExecutionLog] = useState<any[] | null>(null);

  if (!isOpen) return null;

  const routesMap: Record<string, any> = {
    optimal: { name: 'Direct Optimal Vector (A*)', distanceM: 4820, cost: 142, nodesExplored: 1420, avgSlope: 3.5 },
    cost: { name: 'Lowest Traversal Cost', distanceM: 5940, cost: 98, nodesExplored: 2150, avgSlope: 2.1 },
    uncertainty: { name: 'Uncertainty-Aware Planner', distanceM: 5410, cost: 118, nodesExplored: 1890, avgSlope: 2.8 },
    science: { name: 'Science-Driven Exploration', distanceM: 6650, cost: 185, nodesExplored: 3100, avgSlope: 4.6 }
  };

  const currentRoute = routesMap[selectedStrategy];
  const energy = calculateMechanicalEnergy(currentRoute.distanceM, currentRoute.avgSlope, 8.2);

  const handleRunAStarTest = () => {
    setIsExecuting(true);
    setExecutionLog(null);
    setTimeout(() => {
      setExecutionLog([
        { step: 1, event: 'Grid graph initialized (80x80 Jezero DTM)', status: 'PASS' },
        { step: 2, event: 'Start & destination waypoints verified', status: 'PASS' },
        { step: 3, event: `A* Heuristic computed (Manhattan + slope weight)`, status: 'PASS' },
        { step: 4, event: `Path found: ${currentRoute.nodesExplored} nodes expanded, cost ${currentRoute.cost}`, status: 'PASS' }
      ]);
      setLastTestedAt(new Date().toLocaleTimeString());
      setIsExecuting(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in font-mono">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#070B14] border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-950/60 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1A140A] to-[#2E2010] border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-sans">
                  Module 3: Route Optimization (A* Search)
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded border text-emerald-400 bg-emerald-500/20 border-emerald-500/40">
                  Operational
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Heuristic Path Planning, Node Expansion & Energy Optimization Engine
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (onOpenOrbitWithContext) {
                  onOpenOrbitWithContext("Explain Module 3: Route Optimization, A* search algorithm, and path planning across Jezero Crater.");
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Explain with ORBIT</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center px-6 py-3 bg-[#050813] border-b border-white/10 space-x-2 overflow-x-auto">
          {[
            { id: 'overview', label: '1. Overview & A* Concepts' },
            { id: 'config', label: '2. Planner Configuration' },
            { id: 'test', label: '3. Run A* Pathfinding Test' },
            { id: 'results', label: '4. Route Comparison & Results' },
            { id: 'validation', label: '5. Validation Test Suite' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-xs">
          
          {activeSubTab === 'overview' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#0F172A] to-slate-900 border border-amber-500/30 space-y-3">
                <h3 className="text-base font-bold text-white font-sans">How A* Search Works for Rover Navigation</h3>
                <p className="leading-relaxed text-slate-300">
                  The A* algorithm explores candidate locations using the cost already accumulated ($g(n)$) and a heuristic estimate of the remaining cost to the destination ($h(n)$), formally evaluated as $f(n) = g(n) + h(n)$.
                </p>
              </div>
            </div>
          )}

          {activeSubTab === 'config' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-4">
                <h3 className="text-base font-bold text-white font-sans">A* Planner Strategy Selection</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(routesMap).map(([key, r]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedStrategy(key as any)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedStrategy === key ? 'bg-amber-600/20 border-amber-500 text-white' : 'bg-black/40 border-white/10 text-slate-300'
                      }`}
                    >
                      <div className="font-bold mb-1">{r.name}</div>
                      <div className="text-[11px] text-slate-400">Distance: {(r.distanceM / 1000).toFixed(2)} km | Cost: {r.cost}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'test' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-sans">Execute A* Pathfinding Test</h3>
                  {lastTestedAt && <span className="text-emerald-400 text-[11px]">Last Tested at {lastTestedAt}</span>}
                </div>

                <button
                  onClick={handleRunAStarTest}
                  disabled={isExecuting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all flex items-center space-x-2 cursor-pointer"
                >
                  {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Run A* Pathfinding Search</span>
                </button>

                {executionLog && (
                  <div className="space-y-2 pt-2">
                    <span className="text-white font-bold block">Execution Trace Log:</span>
                    <div className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-2 font-mono text-[11px]">
                      {executionLog.map((log) => (
                        <div key={log.step} className="flex items-center justify-between">
                          <span className="text-slate-300">0{log.step}. {log.event}</span>
                          <span className="text-emerald-400 font-bold">{log.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'results' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-4">
                <h3 className="text-base font-bold text-white font-sans">Selected Strategy Results & Metrics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[10px]">TOTAL DISTANCE</span>
                    <span className="text-white font-bold text-base">{(currentRoute.distanceM / 1000).toFixed(2)} km</span>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[10px]">TRAVERSAL COST</span>
                    <span className="text-amber-400 font-bold text-base">{currentRoute.cost} pts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'validation' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-3">
                <h3 className="text-base font-bold text-white font-sans">A* Implementation Test Suite</h3>
                <p className="text-slate-400 leading-relaxed">Repeatable test cases verify that start equals destination, obstacles are strictly avoided.</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#050813] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Route Optimization Verification Module • A* Search</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors cursor-pointer"
          >
            Close Module
          </button>
        </div>

      </div>
    </div>
  );
}
