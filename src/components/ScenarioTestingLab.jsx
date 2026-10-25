import React, { useState } from 'react';
import { AlertOctagon, RefreshCw, CheckCircle2, ShieldAlert, Play, ArrowRight, Zap } from 'lucide-react';

export default function ScenarioTestingLab() {
  const [selectedScenario, setSelectedScenario] = useState('obstacle'); // 'obstacle', 'slope', 'unavailability', 'budget'
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [scenarioExecuted, setScenarioExecuted] = useState(false);

  const scenarios = {
    obstacle: {
      name: 'Scenario 1: Newly Discovered Boulder Obstacle',
      trigger: 'Orbital HiRISE update detects unmapped 1.8m boulder cluster blocking optimal path at X:12, Z:-4.',
      originalRoute: 'Direct Alpha Vector (4.82 km, 240 mins)',
      revisedRoute: 'Dynamic Local Detour (+640 m detour, +32 mins duration)',
      status: 'Feasible (Bypassed Safely)'
    },
    slope: {
      name: 'Scenario 2: Regolith Slip & Steeper Slope',
      trigger: 'Wheel slip sensor indicates actual slope is 18.4° (exceeding initial 12° estimate).',
      originalRoute: 'Direct Ascent Vector across Jezero fan',
      revisedRoute: 'Contour Line Rerouting along 8° contour (+890 m length)',
      status: 'Feasible (Slope Constraint Respected)'
    },
    unavailability: {
      name: 'Scenario 3: Terrain Map Telemetry Drop',
      trigger: 'High-gain antenna signal degradation drops elevation DTM resolution by 50% for Sector 4.',
      originalRoute: 'Uncertainty-Optimized Route B',
      revisedRoute: 'Conservative Holding Pattern + Fallback to Safe Waypoint Alpha',
      status: 'Safe Mode Engaged'
    },
    budget: {
      name: 'Scenario 4: Mission Time Budget Reduction',
      trigger: 'Remaining rover battery & solar charging window reduced by 90 minutes.',
      originalRoute: 'Science-Focused Multi-POI Traverse (355 mins)',
      revisedRoute: 'Direct Truncated Route visiting Primary Target only (195 mins)',
      status: 'Feasible (Science Scope Truncated)'
    }
  };

  const currentScenario = scenarios[selectedScenario];

  const handleRunStressTest = () => {
    setSimulationRunning(true);
    setScenarioExecuted(false);
    setTimeout(() => {
      setSimulationRunning(false);
      setScenarioExecuted(true);
    }, 1200);
  };

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Header */}
      <div className="bg-[#0A0E1C] border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="text-amber-400 font-semibold">Failure Rehearsal Laboratory</span>
            <span aria-hidden="true">·</span>
            <span>Dynamic Replanning Scenarios</span>
            <span aria-hidden="true">·</span>
            <span>Contingency Analysis</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Route Stress-Testing & Contingency Rehearsal
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
            Simulate how MARSNAV replans when new obstacles appear, slopes exceed estimates, telemetry drops, or battery time windows shrink.
          </p>
        </div>
      </div>

        {/* Scenario Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(scenarios).map(([key, s]) => (
            <button
              key={key}
              onClick={() => { setSelectedScenario(key); setScenarioExecuted(false); }}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer backdrop-blur-xl ${
                selectedScenario === key
                  ? 'bg-orange-600/20 border-orange-500 ring-2 ring-orange-500/40 shadow-xl'
                  : 'bg-[#0B1020]/80 border-white/10 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-orange-400 font-bold uppercase">Stress Test</span>
              </div>
              <h4 className="text-white font-bold text-sm mb-1">{s.name}</h4>
            </button>
          ))}
        </div>

        {/* Stress Test Execution Panel */}
        <div className="bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-4 gap-4">
            <div>
              <span className="text-xs text-orange-400 block mb-1 uppercase tracking-wider">Active Failure Condition</span>
              <h3 className="text-lg font-bold text-white">{currentScenario.name}</h3>
            </div>
            <button
              onClick={handleRunStressTest}
              disabled={simulationRunning}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
            >
              {simulationRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recomputing A* Graph...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Execute Failure Rehearsal</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Trigger Event Description</span>
              <p className="text-slate-200 leading-relaxed">{currentScenario.trigger}</p>
            </div>
            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Original Planned Path</span>
              <p className="text-cyan-400 font-semibold">{currentScenario.originalRoute}</p>
            </div>
            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 space-y-2">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Revised Replanned Path</span>
              <p className="text-orange-400 font-semibold">{scenarioExecuted ? currentScenario.revisedRoute : 'Pending rehearsal execution...'}</p>
            </div>
          </div>

          {scenarioExecuted && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Re-planning Successful: {currentScenario.status}</span>
              </div>
              <span className="text-slate-300 font-mono">Algorithm convergence: 14ms (A* Grid Retraversal)</span>
            </div>
          )}
        </div>
    </div>
  );
}
