import React, { useState, useEffect } from 'react';
import { 
  X, Cpu, CheckCircle2, AlertTriangle, RefreshCw, Terminal, 
  Sliders, Play, ShieldCheck, BarChart3, HelpCircle, ArrowLeft, ExternalLink, Layers 
} from 'lucide-react';

interface TerrainIntelligenceVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrbitWithContext?: (contextText: string) => void;
}

export default function TerrainIntelligenceVerifyModal({ 
  isOpen, 
  onClose, 
  onOpenOrbitWithContext 
}: TerrainIntelligenceVerifyModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'config' | 'test' | 'validation' | 'limitations'>('overview');
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  
  // Test execution state
  const [testImage, setTestImage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<any>(null);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);

  // Configuration parameters
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.75);
  const [targetResolution, setTargetResolution] = useState('256x256');

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/ai4mars/status');
      const data = await res.json();
      setModelStatus(data);
    } catch (err) {
      setModelStatus({
        checkpointAvailable: false,
        error: 'Failed to connect to AI4Mars status API.'
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleRunTestInference = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestResult(null);

    const sampleDataUrl = testImage || 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    try {
      const res = await fetch('/api/ai4mars/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: sampleDataUrl, confidenceThreshold })
      });
      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        setTestError(data);
      } else {
        setTestResult(data);
        setLastTestedAt(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      setTestError({
        error: 'NETWORK_ERROR',
        message: err.message || 'Failed to reach segmentation inference service.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  const moduleStatus = modelStatus?.checkpointAvailable ? 'Operational' : 'Partially Operational (Model Checkpoint Missing)';
  const statusColor = modelStatus?.checkpointAvailable ? 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' : 'text-amber-400 bg-amber-500/20 border-amber-500/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-fade-in font-mono">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#070B14] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-cyan-950/60 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0F172A] to-[#1E1B4B] border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-sans">
                  Module 1: Terrain Intelligence (PyTorch Vision)
                </h2>
                <span className={`text-[10px] px-2.5 py-0.5 rounded border font-mono ${statusColor}`}>
                  {moduleStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                AI4Mars Semantic Segmentation & Pixel-Level Hazard Classification Pipeline
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (onOpenOrbitWithContext) {
                  onOpenOrbitWithContext("Explain Module 1: Terrain Intelligence, PyTorch Vision, and AI4Mars segmentation pipeline status.");
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
            { id: 'overview', label: '1. Overview & Mechanics' },
            { id: 'config', label: '2. Configuration' },
            { id: 'test', label: '3. Run Test Inference' },
            { id: 'validation', label: '4. Validation & Metrics' },
            { id: 'limitations', label: '5. Limitations & Troubleshooting' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
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
              <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-[#0F172A] to-slate-900 border border-cyan-500/30 space-y-3">
                <h3 className="text-base font-bold text-white font-sans">What is Terrain Intelligence & Why It Matters</h3>
                <p className="leading-relaxed text-slate-300">
                  Terrain intelligence uses computer vision to classify image pixels into distinct geological categories. For planetary rovers like NASA Perseverance, understanding whether an ahead surface is stable bedrock, treacherous sand, or wheel-damaging boulders is vital for autonomous survival.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <h4 className="text-white font-bold text-sm">Image Classification vs Segmentation</h4>
                  <p className="text-slate-400 leading-relaxed">
                    <strong>Image Classification</strong> assigns a single label to an entire photo. <br />
                    <strong>Semantic Segmentation</strong> classifies every single pixel in the image into semantic classes (Soil, Bedrock, Sand, Big Rock), delivering precise boundary maps for hazard avoidance.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <h4 className="text-white font-bold text-sm">Model Architecture & Provenance</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Powered by a ResNet34-U-Net encoder-decoder architecture trained on AI4Mars open datasets (MSL Curiosity NavCam ground truth annotations) with cross-rover domain adaptation.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <h4 className="text-orange-400 font-bold text-sm">Model Status & Checkpoint Details</h4>
                {loadingStatus ? (
                  <p className="text-slate-400">Checking model status from server...</p>
                ) : (
                  <div className="space-y-1 font-mono text-[11px]">
                    <div>Active Checkpoint: <strong className="text-white">{modelStatus?.activeCheckpoint || 'None detected (Missing *.pt file)'}</strong></div>
                    <div>Supported Classes: {modelStatus?.classes?.map((c: any) => c.label).join(', ')}</div>
                    <div>Validation mIoU: <strong className="text-cyan-400">0.5578</strong> (Weighted IoU: 0.844)</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'config' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-4">
                <h3 className="text-base font-bold text-white font-sans">PyTorch Inference Configuration Parameters</h3>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-slate-300 block mb-1">Confidence Threshold: {confidenceThreshold}</label>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="0.95" 
                      step="0.05"
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block mb-1">Target Input Resolution</label>
                    <select 
                      value={targetResolution} 
                      onChange={(e) => setTargetResolution(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="256x256">256x256 (Standard AI4Mars Tensor)</option>
                      <option value="512x512">512x512 (High Resolution)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'test' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-sans">Interactive Model Inference Test Workbench</h3>
                  {lastTestedAt && <span className="text-emerald-400 font-mono text-[11px]">Last Tested at {lastTestedAt}</span>}
                </div>

                <button
                  onClick={handleRunTestInference}
                  disabled={isTesting}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>{isTesting ? 'Running PyTorch Inference...' : 'Run Test Inference'}</span>
                </button>

                {testError && (
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 space-y-2">
                    <div className="font-bold flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>{testError.error || 'Checkpoint Missing / Error'}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{testError.message}</p>
                    {testError.reproductionSteps && (
                      <div className="pt-2">
                        <span className="text-white font-bold block mb-1">Reproduction & Setup Steps:</span>
                        <ul className="list-disc list-inside space-y-1 text-slate-400">
                          {testError.reproductionSteps.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {testResult && (
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 space-y-2">
                    <div className="font-bold flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Inference Executed Successfully</span>
                    </div>
                    <pre className="bg-black/50 p-3 rounded-lg text-[11px] text-slate-300 overflow-x-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'validation' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-4">
                <h3 className="text-base font-bold text-white font-sans">Ground Truth Validation & Metrics (mer_test split)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[10px]">Mean IoU</span>
                    <span className="text-cyan-400 font-bold text-lg">0.5578</span>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[10px]">Weighted IoU</span>
                    <span className="text-emerald-400 font-bold text-lg">0.8440</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'limitations' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <div className="p-6 rounded-2xl bg-[#0B1020]/90 border border-white/10 space-y-4">
                <h3 className="text-base font-bold text-white font-sans">Limitations & Troubleshooting</h3>
                <p className="text-slate-400">If PyTorch weights (*.pt) are missing from outputs/, live inference triggers a 422 error rather than fabricating fake masks.</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#050813] border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Terrain Intelligence Verification Module • AI4Mars ResNet34</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors cursor-pointer"
          >
            Close Module
          </button>
        </div>

      </div>
    </div>
  );
}
