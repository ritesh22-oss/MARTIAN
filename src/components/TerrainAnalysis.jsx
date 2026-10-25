import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Cpu,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Terminal,
  FileCode,
  Sliders,
  Eye,
  Info,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

const AI4MARS_CLASSES = [
  { id: 0, key: 'soil', label: 'Soil / Regolith', colorHex: '#FF0000', twBg: 'bg-red-500', twBorder: 'border-red-500', twText: 'text-red-400' },
  { id: 1, key: 'bedrock', label: 'Bedrock Outcrop', colorHex: '#00FF00', twBg: 'bg-green-500', twBorder: 'border-green-500', twText: 'text-green-400' },
  { id: 2, key: 'sand', label: 'Sand / Dunes', colorHex: '#0000FF', twBg: 'bg-blue-500', twBorder: 'border-blue-500', twText: 'text-blue-400' },
  { id: 3, key: 'big_rock', label: 'Big Rock / Boulder Hazard', colorHex: '#FFFF00', twBg: 'bg-yellow-400', twBorder: 'border-yellow-400', twText: 'text-yellow-400' }
];

export default function TerrainAnalysis() {
  const { selectedObservation, setActiveWorkspace } = useWorkspace();

  // Checkpoint verification state
  const [modelStatus, setModelStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Active view tab: 'upload' (Live user upload inference) | 'benchmarks' (Research test evaluation samples)
  const [activeTab, setActiveTab] = useState('upload');

  // Live inference state
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inferenceResult, setInferenceResult] = useState(null);
  const [blockerError, setBlockerError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showTrainingGuide, setShowTrainingGuide] = useState(false);

  // Sync selected observation from NASA live feed if present
  useEffect(() => {
    if (selectedObservation) {
      setUploadedImage(selectedObservation.thumbnailUrl || selectedObservation.fullResUrl);
      setInferenceResult(null);
      setBlockerError(null);
    }
  }, [selectedObservation]);

  // Mask display controls
  const [maskOpacity, setMaskOpacity] = useState(55);
  const [visibleClasses, setVisibleClasses] = useState({
    soil: true,
    bedrock: true,
    sand: true,
    big_rock: true
  });

  // Benchmark artifacts state
  const [benchmarksData, setBenchmarksData] = useState(null);
  const [selectedBenchmarkSample, setSelectedBenchmarkSample] = useState(0);
  const [benchmarkViewMode, setBenchmarkViewMode] = useState('overlay'); // 'overlay' | 'prediction' | 'confusion'

  // Canvas ref for overlay rendering
  const canvasRef = useRef(null);

  // Fetch checkpoint verification status on mount
  useEffect(() => {
    checkCheckpointStatus();
    loadBenchmarks();
  }, []);

  const checkCheckpointStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/ai4mars/status');
      const data = await res.json();
      setModelStatus(data);
    } catch (err) {
      setModelStatus({
        checkpointAvailable: false,
        error: 'Failed to query checkpoint status from server.'
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const loadBenchmarks = async () => {
    try {
      const res = await fetch('/api/ai4mars/benchmarks');
      const data = await res.json();
      setBenchmarksData(data);
    } catch (err) {
      console.warn('Could not load benchmark data:', err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result);
        setInferenceResult(null);
        setBlockerError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result);
        setInferenceResult(null);
        setBlockerError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunInference = async () => {
    if (!uploadedImage) return;
    setIsProcessing(true);
    setBlockerError(null);
    setInferenceResult(null);

    try {
      const res = await fetch('/api/ai4mars/segment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadedImage })
      });

      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        // Real honest blocker: no fabricated data!
        setBlockerError(data);
      } else {
        setInferenceResult(data);
      }
    } catch (err) {
      setBlockerError({
        error: 'NETWORK_FAILURE',
        message: err.message || 'Failed connecting to segmentation endpoint'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleClass = (key) => {
    setVisibleClasses((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Module Header */}
      <div className="bg-[#0A0E1C] border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="text-cyan-400 font-semibold">AI4MARS Vision Pipeline</span>
            <span aria-hidden="true">·</span>
            <span>ResNet-34 U-Net Semantic Segmentation</span>
            <span aria-hidden="true">·</span>
            <span>NavCam Stereo Pairs</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Terrain Intelligence & Ground Class Segmentation
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
            Pixel-level parsing into 4 terrain classes: Soil (Class 0), Bedrock (Class 1), Sand (Class 2), and Boulder Hazards (Class 3).
          </p>
        </div>
      </div>

      {/* Checkpoint Verification Banner */}
      <div className="bg-[#090D1A] border border-slate-800/80 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  modelStatus?.checkpointAvailable
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {modelStatus?.checkpointAvailable ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white font-sans">Model Checkpoint Verification</h3>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                      modelStatus?.checkpointAvailable
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {statusLoading
                      ? 'VERIFYING...'
                      : modelStatus?.checkpointAvailable
                      ? 'CHECKPOINT_LOADED'
                      : 'WEIGHTS_NOT_FOUND'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Architecture: <span className="text-slate-200">ResNet34 + U-Net Bottleneck UDA (4 classes)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={checkCheckpointStatus}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-slate-300 hover:text-white font-mono flex items-center space-x-1.5 transition-all cursor-pointer"
                title="Re-scan workspace for checkpoint weights"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
                <span>Re-check Checkpoint</span>
              </button>
              <button
                onClick={() => setShowTrainingGuide(!showTrainingGuide)}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300 font-mono flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{showTrainingGuide ? 'Hide Training Guide' : 'Training & Weights Guide'}</span>
              </button>
            </div>
          </div>

          {/* Searched paths & diagnostic status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Active Weights Path</span>
              <span className="text-slate-200 font-bold truncate block mt-0.5">
                {modelStatus?.activeCheckpoint ? modelStatus.activeCheckpoint : 'None found (Pending Checkpoint)'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Expected Checkpoint Paths</span>
              <span className="text-slate-300 truncate block mt-0.5">
                outputs/best_model.pth, outputs/joint.pt
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Verification Integrity</span>
              <span className="text-emerald-400 font-bold block mt-0.5">
                Strict: Zero Output Fabrication
              </span>
            </div>
          </div>

          {/* Collapsible Step-by-Step Training Guide */}
          {showTrainingGuide && (
            <div className="mt-4 p-5 rounded-2xl bg-black/60 border border-cyan-500/30 space-y-3 font-mono text-xs animate-fade-in">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <FileCode className="w-4 h-4" />
                <span>How to Obtain or Train AI4MARS Checkpoint Weights:</span>
              </div>
              <p className="text-slate-300">
                The training scripts are included in the repository. Follow these exact steps to train or export the model weights:
              </p>
              <div className="p-4 rounded-xl bg-[#050813] border border-white/10 space-y-2 text-slate-200 overflow-x-auto text-[11px]">
                <div className="text-slate-500"># 1. Install dependencies from requirements_30777c98.txt</div>
                <div className="text-cyan-300">pip install torch torchvision numpy Pillow</div>
                <div className="text-slate-500 pt-1"># 2. Extract AI4MARS v0.6 dataset into ai4mars-dataset-merged-0.6/</div>
                <div className="text-cyan-300">python make_splits_50e75ab0.py</div>
                <div className="text-slate-500 pt-1"># 3. Supervised MSL Curiosity Pretraining</div>
                <div className="text-cyan-300">python train_6c0c9c61.py --method supervised --out-ckpt outputs/E1.pt</div>
                <div className="text-slate-500 pt-1"># 4. Cross-Rover Joint Semi-Supervision (Best Result: 0.658 mIoU / 0.844 wIoU)</div>
                <div className="text-cyan-300">python train_6c0c9c61.py --method semisup_joint --preset followup --init-ckpt outputs/E1.pt --out-ckpt outputs/joint.pt</div>
                <div className="text-slate-500 pt-1"># 5. Export final best_model.pth artifact</div>
                <div className="text-cyan-300">python export_results_aa7aad1a.py --checkpoint outputs/joint.pt --split mer_test</div>
              </div>
              <p className="text-slate-400 text-[11px]">
                Once <code className="text-orange-300">outputs/best_model.pth</code> or <code className="text-orange-300">outputs/joint.pt</code> is generated, click <strong>"Re-check Checkpoint"</strong> to immediately engage real-time inference.
              </p>
            </div>
          )}
        </div>

        {/* 4-Class Color Legend & Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-bold uppercase tracking-wider">AI4MARS Classes:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {AI4MARS_CLASSES.map((cls) => (
              <button
                key={cls.id}
                onClick={() => toggleClass(cls.key)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                  visibleClasses[cls.key]
                    ? `${cls.twBorder} bg-white/[0.06] text-white shadow-sm`
                    : 'border-white/10 bg-transparent text-slate-500 opacity-50'
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${cls.twBg} shadow-sm`} />
                <span className="font-semibold">{cls.label}</span>
                <span className="text-[10px] text-slate-400">({cls.colorHex})</span>
              </button>
            ))}
          </div>

          {/* Mask Opacity Slider */}
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Opacity:</span>
            <input
              type="range"
              min="10"
              max="90"
              value={maskOpacity}
              onChange={(e) => setMaskOpacity(Number(e.target.value))}
              className="w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="w-8 text-right font-bold text-cyan-300">{maskOpacity}%</span>
          </div>
        </div>

        {/* Main Interface Tabs */}
        <div className="flex border-b border-white/15 space-x-6 text-sm font-mono">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 border-b-2 font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'upload'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Live Image Inference</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`pb-3 border-b-2 font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              activeTab === 'benchmarks'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Verified Test-Set Evaluations & Ground Truth</span>
          </button>
        </div>

        {/* TAB 1: LIVE IMAGE INFERENCE */}
        {activeTab === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Left: Input Selection & Drag-and-Drop */}
            <div className="lg:col-span-6 space-y-6 bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Upload Mars Rover NavCam Feed</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">Preprocessed to 256×256</span>
              </div>

              {/* Active Observation from Live NASA Feed */}
              {selectedObservation && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-amber-500/40">
                      <img
                        src={selectedObservation.thumbnailUrl}
                        alt={selectedObservation.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] font-mono text-amber-400 font-semibold uppercase tracking-wider">
                        NASA Raw Feed Active Observation
                      </div>
                      <div className="text-xs text-white font-medium truncate">
                        {selectedObservation.title} (Sol {selectedObservation.sol}, {selectedObservation.camera})
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveWorkspace('live-mission-data')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono shrink-0 transition"
                  >
                    Change Frame &rarr;
                  </button>
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <label
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all group ${
                    isDragging
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-white/20 hover:border-cyan-400/50 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-white mb-1 font-sans">
                    Drag & drop or click to upload NavCam/Hazcam
                  </p>
                  <p className="text-xs text-slate-400 font-mono">Accepts PNG, JPG, JPEG</p>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Execute Segmentation Button */}
              <button
                onClick={handleRunInference}
                disabled={!uploadedImage || isProcessing}
                className={`w-full flex items-center justify-center space-x-2 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest font-mono shadow-xl transition-all cursor-pointer ${
                  !uploadedImage
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing ResNet34-U-Net Forward Pass...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>Run AI4MARS 4-Class Segmentation</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-slate-400 font-mono space-y-1">
                <div>• Preprocessing: ImageNet Normalized (μ=[0.485,0.456,0.406], σ=[0.229,0.224,0.225]).</div>
                <div>• Zero-Fabrication Guarantee: Fails gracefully with diagnostics if checkpoint weights are absent.</div>
              </div>
            </div>

            {/* Right: Output Screen & Diagnostics */}
            <div className="lg:col-span-6 space-y-6 bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-orange-400" />
                  <span>Segmentation Mask & Overlay</span>
                </h3>
                {inferenceResult && (
                  <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Inference Succeeded</span>
                  </span>
                )}
              </div>

              {/* Display Area */}
              <div className="relative w-full aspect-square rounded-2xl bg-black/80 border border-white/10 overflow-hidden flex items-center justify-center">
                {uploadedImage ? (
                  <div className="relative w-full h-full">
                    {/* Raw uploaded image */}
                    <img
                      src={uploadedImage}
                      alt="Source Input"
                      className="w-full h-full object-cover"
                    />

                    {/* Inference Mask Overlay if succeeded */}
                    {inferenceResult?.overlayDataUrl && (
                      <img
                        src={inferenceResult.overlayDataUrl}
                        alt="Segmented Mask"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ opacity: maskOpacity / 100 }}
                      />
                    )}

                    {/* Blocker State when Checkpoint is Missing (No fabricated outputs!) */}
                    {blockerError && (
                      <div className="absolute inset-0 bg-black/92 backdrop-blur-md p-6 flex flex-col justify-between text-left font-mono animate-fade-in">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                            <XCircle className="w-5 h-5 text-red-500" />
                            <span>CHECKPOINT_MISSING: Real Inference Blocked</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {blockerError.message ||
                              'AI4MARS checkpoint weights (*.pt, *.pth) are not present in the workspace. In accordance with scientific integrity standards, model outputs are not fabricated.'}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5 text-[11px]">
                          <span className="text-slate-400 block font-bold">Checked Paths:</span>
                          <div className="text-slate-300">
                            • outputs/best_model.pth<br />
                            • outputs/joint.pt<br />
                            • outputs/E1.pt
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            See Training Guide above to train or export weights.
                          </span>
                          <button
                            onClick={() => setShowTrainingGuide(true)}
                            className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-bold text-xs"
                          >
                            View Steps
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-2 p-8 text-slate-500 font-mono text-xs">
                    <Layers className="w-10 h-10 mx-auto opacity-30" />
                    <p>Upload a NavCam image on the left to run inference.</p>
                  </div>
                )}
              </div>

              {/* Class distribution breakdown if real inference completed */}
              {inferenceResult?.classDistribution && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 font-mono text-xs">
                  <span className="text-slate-300 font-bold uppercase tracking-wider block">
                    Predicted Class Terrain Distribution:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AI4MARS_CLASSES.map((cls) => (
                      <div key={cls.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className={`w-2 h-2 rounded-full ${cls.twBg}`} />
                          <span className="text-slate-300 font-bold truncate">{cls.label}</span>
                        </div>
                        <div className="text-base font-extrabold text-white">
                          {inferenceResult.classDistribution[cls.key] || 0}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: VERIFIED BENCHMARK EVALUATIONS & GROUND TRUTH */}
        {activeTab === 'benchmarks' && benchmarksData && (
          <div className="space-y-8 animate-fade-in">
            {/* Top Stats Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-[#0B1020]/90 border border-white/15 space-y-1">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider">Overall Test mIoU</span>
                <div className="text-2xl font-black text-white">
                  {(benchmarksData.overallMetrics.mIoU * 100).toFixed(2)}%
                </div>
                <span className="text-[10px] text-cyan-400">Target Domain MER Test</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B1020]/90 border border-white/15 space-y-1">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider">Weighted wIoU</span>
                <div className="text-2xl font-black text-emerald-400">
                  {(benchmarksData.overallMetrics.wIoU * 100).toFixed(2)}%
                </div>
                <span className="text-[10px] text-slate-400">Frequency Weighted</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B1020]/90 border border-white/15 space-y-1">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider">Best Performing Class</span>
                <div className="text-2xl font-black text-red-400">Soil (75.96%)</div>
                <span className="text-[10px] text-slate-400">91.38% Recall</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B1020]/90 border border-white/15 space-y-1">
                <span className="text-slate-400 text-[11px] uppercase tracking-wider">Hardest Class</span>
                <div className="text-2xl font-black text-yellow-400">Big Rock (0.01%)</div>
                <span className="text-[10px] text-slate-400">Severe Class Imbalance</span>
              </div>
            </div>

            {/* Test Sample Viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Sample list selector */}
              <div className="lg:col-span-4 space-y-3 font-mono text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider block">
                  Select Official AI4MARS Test Frame:
                </span>
                <div className="space-y-2">
                  {benchmarksData.testSamples.map((sample, idx) => (
                    <button
                      key={sample.id}
                      onClick={() => setSelectedBenchmarkSample(idx)}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        selectedBenchmarkSample === idx
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-lg'
                          : 'bg-[#0B1020]/80 border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold">{sample.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <span>Classes:</span>
                          <span className="text-cyan-300">{sample.primaryClasses.join(', ')}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  ))}

                  {/* Primary 4-Panel Prediction Card */}
                  <button
                    onClick={() => setSelectedBenchmarkSample(-1)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      selectedBenchmarkSample === -1
                        ? 'bg-orange-500/15 border-orange-500/50 text-white shadow-lg'
                        : 'bg-[#0B1020]/80 border-white/10 text-slate-300 hover:border-white/30'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-orange-300">Official Quad-Panel Prediction</div>
                      <div className="text-[10px] text-slate-400">Input | Ground Truth | Prediction | Overlay</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-orange-400" />
                  </button>
                </div>
              </div>

              {/* Main Sample Display View */}
              <div className="lg:col-span-8 bg-[#0B1020]/90 border border-white/15 p-6 rounded-3xl backdrop-blur-xl shadow-2xl space-y-4">
                <div className="flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white">
                      {selectedBenchmarkSample === -1
                        ? 'AI4MARS Benchmark: Raw | Ground Truth | Model Prediction | Composite'
                        : benchmarksData.testSamples[selectedBenchmarkSample].name}
                    </span>
                  </div>

                  {/* View Mode Buttons */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setBenchmarkViewMode('overlay')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        benchmarkViewMode === 'overlay'
                          ? 'bg-cyan-500 text-white font-bold'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Predictions
                    </button>
                    <button
                      onClick={() => setBenchmarkViewMode('confusion')}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        benchmarkViewMode === 'confusion'
                          ? 'bg-orange-500 text-white font-bold'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Confusion Matrix
                    </button>
                  </div>
                </div>

                {/* Benchmark Image Preview */}
                <div className="rounded-2xl bg-black border border-white/10 overflow-hidden flex items-center justify-center p-2">
                  {benchmarkViewMode === 'confusion' ? (
                    <img
                      src={benchmarksData.confusionMatrixUrl}
                      alt="Row-Normalized Confusion Matrix"
                      className="max-h-[440px] w-auto object-contain rounded-xl"
                    />
                  ) : selectedBenchmarkSample === -1 ? (
                    <img
                      src={benchmarksData.primaryPredictionSampleUrl}
                      alt="Official 4-Panel Visualization"
                      className="w-full h-auto object-contain rounded-xl"
                    />
                  ) : (
                    <img
                      src={benchmarksData.testSamples[selectedBenchmarkSample].url}
                      alt="Test Sample Triad"
                      className="w-full h-auto object-contain rounded-xl"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Source: Cesare Fraccaroli · Università degli Studi di Verona (UniVR) · July 2026</span>
                  <span className="text-cyan-300">AI4MARS Curiosity (MSL) → Spirit/Opportunity (MER)</span>
                </div>
              </div>
            </div>

            {/* Per-Class Scientific Metrics Table */}
            <div className="p-6 rounded-3xl bg-[#0B1020]/90 border border-white/15 backdrop-blur-xl shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-orange-400" />
                <span>AI4MARS Per-Class Validation Benchmark Scores</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 text-[11px] uppercase">
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3">Color Identifier</th>
                      <th className="py-2.5 px-3">Intersection-over-Union (IoU)</th>
                      <th className="py-2.5 px-3">Dice Coefficient</th>
                      <th className="py-2.5 px-3">Precision</th>
                      <th className="py-2.5 px-3">Recall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {benchmarksData.metricsTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-bold text-white">{row.class}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className="inline-block w-3.5 h-3.5 rounded-full mr-2 align-middle shadow-sm"
                            style={{ backgroundColor: row.color }}
                          />
                          <span className="text-slate-300">{row.color}</span>
                        </td>
                        <td className="py-2.5 px-3 text-cyan-300 font-bold">{(row.iou * 100).toFixed(2)}%</td>
                        <td className="py-2.5 px-3 text-slate-200">{(row.dice * 100).toFixed(2)}%</td>
                        <td className="py-2.5 px-3 text-slate-200">{(row.precision * 100).toFixed(2)}%</td>
                        <td className="py-2.5 px-3 text-slate-200">{(row.recall * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
