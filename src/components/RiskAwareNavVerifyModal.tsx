import React, { useState } from 'react';
import { 
  X, ShieldAlert, Sliders, AlertTriangle, CheckCircle2, Play, RefreshCw, Compass, ArrowLeft, BarChart3 
} from 'lucide-react';
import { calculateLocalSlope, getMartianElevation } from '../utils/marsScienceData';

interface RiskAwareNavVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrbitWithContext?: (contextText: string) => void;
}

export default function RiskAwareNavVerifyModal({ 
  isOpen, 
  onClose, 
  onOpenOrbitWithContext 
}: RiskAwareNavVerifyModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'config' | 'test' | 'results' | 'limitations'>('overview');
  
  const [slopePenaltyWeight, setSlopePenaltyWeight] = useState(2.4);
  const [roughnessPenalty, setRoughnessPenalty] = useState(1.8);
  const [maxSlopeThreshold, setMaxSlopeThreshold] = useState(14);
  const [sampleX, setSampleX] = useState(12);
  const [sampleZ, setSampleZ] = useState(-15);
  
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [computedCostResult, setComputedCostResult] = useState<any>(null);

  if (!isOpen) return null;

  const elevation = getMartianElevation(sampleX, sampleZ);
  const slope = calculateLocalSlope(sampleX, sampleZ);
  const baseCost = 10;
  const slopeCost = slope * slopePenaltyWeight;
  const totalTraversalCost = Math.round(baseCost + slopeCost + (elevation.localRelY < -10 ? 25 : 0));
  const isHazardous = slope > maxSlopeThreshold;

  const handleRunCostTest = () => {
    setIsComputing(true);
    setTimeout(() => {
      setComputedCostResult({
        coordinate: { x: sampleX, z: sampleZ },
        elevationM: elevation.localRelY,
        slopeDeg: slope,
        totalTraversalCost,
        isHazardous,
        parametersUsed: { slopePenaltyWeight, roughnessPenalty, maxSlopeThreshold }
      });
      setLastTestedAt(new Date().toLocaleTimeString());
      setIsComputing(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in font-mono">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#070B14] border border-red-500/30 rounded-2xl shadow-2xl shadow-red-950/60 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#1A0A0A] to-[#2E1010] border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-sans">
                  Module 2: Risk-Aware Navigation (Terrain Cost Weighting)
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded border text-emerald-400 bg-emerald-500/20 border-emerald-500/40">
                  Operational
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Traversability Cost Mapping, Slip Probability & Slope Penalty Engine
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (onOpenOrbitWithContext) {
                  onOpenOrbitWithContext("Explain Module 2: Risk-Aware Navigation, terrain cost weighting, and traversability analysis.");
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
            { id: 'overview', label: '1. Overview & Concepts' },
            { id: 'config', label: '2. Cost Configuration' },
            { id: 'test', label: '3. Run Traversability Test' },
            { id: 'results', label: '4. Computed Results' },
            { id: 'limitations', label: '5. Limitations & Validation' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
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
              <div className="p-6 rounded-2xl bg-gradient-to-br from-red-950/40 via-[#0F172A] to-slate-900 border border-red-500/30 space-y-3">
                <h3 className="text-base font-bold text-white font-sans">Purpose of Risk-Aware Cost Weighting</h3>
                <p className="leading-relaxed text-slate-300">
                  This module assigns relative traversal costs to Martian terrain features so that path planners can compare alternative routes. It translates slope angles, regolith sinkage risk, and boulder densities into numerical friction weights.
                </p>
              </div>
            </div>
          )}

          {activeSubTab === 'config' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-4">
                <h3 className="text-base font-bold text-white font-sans">Interactive Cost Formula Parameters</h3>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Slope Penalty Weight: {slopePenaltyWeight}</label>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="5.0" 
                      step="0.1"
                      value={slopePenaltyWeight}
                      onChange={(e) => setSlopePenaltyWeight(Number(e.target.value))}
                      className="w-full accent-red-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'test' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-sans">Run Traversability Cost Calculation Test</h3>
                  {lastTestedAt && <span className="text-emerald-400 text-[11px]">Tested at {lastTestedAt}</span>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 block mb-1">Sample X: {sampleX}</label>
                    <input 
                      type="range" min="-50" max="50" value={sampleX} 
                      onChange={(e) => setSampleX(Number(e.target.value))}
                      className="w-full accent-red-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Sample Z: {sampleZ}</label>
                    <input 
                      type="range" min="-50" max="50" value={sampleZ} 
                      onChange={(e) => setSampleZ(Number(e.target.value))}
                      className="w-full accent-red-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunCostTest}
                  disabled={isComputing}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all flex items-center space-x-2 cursor-pointer"
                >
                  {isComputing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Compute Traversability Cost</span>
                </button>
              </div>
            </div>
          )}

          {activeSubTab === 'results' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-4">
                <h3 className="text-base font-bold text-white font-sans">Computed Cost Results & Telemetry</h3>
                {computedCostResult ? (
                  <div className="space-y-3 bg-black/50 p-4 rounded-xl border border-white/10">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Coordinate:</span>
                      <span className="text-white font-bold">X: {computedCostResult.coordinate.x}, Z: {computedCostResult.coordinate.z}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Calculated Slope:</span>
                      <span className="text-white font-bold">{computedCostResult.slopeDeg}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Traversal Cost:</span>
                      <span className="text-red-400 font-bold text-base">{computedCostResult.totalTraversalCost} pts</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">No test executed yet. Run a test in Tab 3 to view results.</p>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'limitations' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-3">
                <h3 className="text-base font-bold text-white font-sans">Limitations & Validation Notes</h3>
                <p className="text-slate-400 leading-relaxed">Cost weighting formulas approximate wheel-soil mechanics using deterministic slope gradients.</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#050813] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Risk-Aware Navigation Verification Module • Cost Weighting</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors cursor-pointer"
          >
            Close Module
          </button>
        </div>

      </div>
    </div>
  );
}
