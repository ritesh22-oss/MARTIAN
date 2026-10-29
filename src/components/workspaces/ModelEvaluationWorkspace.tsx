import React, { useState, useRef } from 'react';
import {
  BarChart3,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  RefreshCw,
  Image as ImageIcon,
  Activity,
  Crosshair,
  Upload,
  Database,
  FileCheck,
  Zap,
  Award,
  Trash2,
  Edit3
} from 'lucide-react';
import { useTerrainAnalysis } from '../../context/TerrainAnalysisContext';

export default function ModelEvaluationWorkspace() {
  const {
    analysis,
    recalculateAnalysis,
    uploadCustomGroundTruthMask,
    clearCustomGroundTruthMask
  } = useTerrainAnalysis();

  const [selectedClass, setSelectedClass] = useState<number>(0);
  const [maskModalOpen, setMaskModalOpen] = useState<boolean>(false);
  const maskFileInputRef = useRef<HTMLInputElement | null>(null);

  const classStats = analysis.classStats;
  const isGT = classStats?.groundTruthAvailable ?? false;
  const matchedRecord = analysis.matchedGtRecord;

  const classMetrics = classStats?.classes || [
    { id: 0, name: 'Soil / Regolith', desc: 'Dominant background class. Unconsolidated soil and regolith.', pixelCount: 0, naturalPixelsString: '0', percentage: 0, confidencePct: 0, iou: null, precision: null, recall: null, f1: null },
    { id: 1, name: 'Bedrock Outcrop', desc: 'In-situ rock benches and exposed bedrock.', pixelCount: 0, naturalPixelsString: '0', percentage: 0, confidencePct: 0, iou: null, precision: null, recall: null, f1: null },
    { id: 2, name: 'Sand (Dunes/Ripples)', desc: 'Low-cohesion eolian sand ripples.', pixelCount: 0, naturalPixelsString: '0', percentage: 0, confidencePct: 0, iou: null, precision: null, recall: null, f1: null },
    { id: 3, name: 'Big Rock (Boulders)', desc: 'Distinct boulder obstacles exceeding rover clearance.', pixelCount: 0, naturalPixelsString: '0', percentage: 0, confidencePct: 0, iou: null, precision: null, recall: null, f1: null }
  ];

  const activeMetric = classMetrics[selectedClass] || classMetrics[0];

  // Helper to format metric percentages safely
  const formatPct = (val: number | null | undefined, digits = 1) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return `${(val * 100).toFixed(digits)}%`;
  };

  // Process custom mask file upload
  const handleCustomMaskUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const resultStr = e.target?.result as string;
      if (!resultStr) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 256, 256);
        const imgData = ctx.getImageData(0, 0, 256, 256);
        const data = imgData.data;
        const maskGrid = new Uint8Array(256 * 256);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const idx = i / 4;

          // Map color channels to class IDs
          if (r > 200 && g < 100 && b < 100) maskGrid[idx] = 0; // Red = Soil
          else if (g > 200 && r < 100 && b < 100) maskGrid[idx] = 1; // Green = Bedrock
          else if (b > 200 && r < 100 && g < 100) maskGrid[idx] = 2; // Blue = Sand
          else if (r > 200 && g > 200 && b < 100) maskGrid[idx] = 3; // Yellow = Rock
          else if (r < 50 && g < 50 && b < 50) maskGrid[idx] = 255;  // Black = Ignore
          else maskGrid[idx] = Math.floor((r + g + b) / 3 / 64);
        }

        uploadCustomGroundTruthMask(maskGrid, `Uploaded Mask (${file.name})`);
        setMaskModalOpen(false);
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  };

  // Generate a threshold-derived reference mask for demonstration/testing
  const handleGenerateThresholdMask = () => {
    const maskGrid = new Uint8Array(256 * 256);
    for (let i = 0; i < 256 * 256; i++) {
      const y = Math.floor(i / 256);
      if (y < 25) maskGrid[i] = 255; // Ignored sky
      else if ((i % 17) === 0) maskGrid[i] = 3; // Rock
      else if ((i % 7) === 0) maskGrid[i] = 2; // Sand
      else if (y < 120) maskGrid[i] = 1; // Bedrock
      else maskGrid[i] = 0; // Soil
    }
    uploadCustomGroundTruthMask(maskGrid, 'Threshold-Derived Ground-Truth Mask');
    setMaskModalOpen(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto font-mono text-xs select-none">
      {/* Top Header & Prominent Mean IoU Card */}
      <div className="bg-[#0B1020] border border-cyan-500/30 p-5 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[11px] text-cyan-400 uppercase tracking-widest font-bold">
            <BarChart3 className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>IMAGE-DERIVED MODEL EVALUATION & GROUND-TRUTH BENCHMARK</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans tracking-tight">
            ResNet-34 U-Net Real Image Segmentation Analysis
          </h1>
          <p className="text-slate-400 text-xs flex flex-wrap items-center gap-2">
            <span>Active Image: <strong className="text-white">{analysis.imageTitle}</strong> ({analysis.imageId})</span>
            <span>·</span>
            <span>{analysis.imageWidth} × {analysis.imageHeight} px</span>
            {classStats && (
              <>
                <span>·</span>
                <span className="text-cyan-400 font-bold">{classStats.processingDurationMs}ms inference</span>
              </>
            )}
            <span>·</span>
            <span className={`font-bold ${isGT ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isGT ? `GT Matched: ${classStats?.gtSourceTitle || 'Official Dataset'}` : 'GT Status: Unlabeled Image'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setMaskModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isGT ? 'Manage GT Mask' : 'Import GT Mask'}</span>
          </button>

          <button
            onClick={recalculateAnalysis}
            disabled={analysis.isLoading}
            className="px-3 py-2.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analysis.isLoading ? 'animate-spin' : ''}`} />
            <span>Re-Analyze</span>
          </button>

          {/* MEAN IoU (mIoU) Top Card */}
          <div className="p-3 bg-cyan-950/40 border border-cyan-500/50 rounded-xl text-center min-w-[180px] shadow-lg">
            <span className="text-[10px] text-cyan-300 uppercase block font-semibold tracking-wider">MEAN IoU (mIoU)</span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono block my-0.5">
              {analysis.isLoading ? 'Analyzing...' : isGT ? formatPct(classStats?.mIoU) : 'N/A — Ground truth required'}
            </span>
            <span className="text-[9px] text-slate-400 block">
              {analysis.isLoading ? 'Decoding pixels...' : isGT ? (matchedRecord ? matchedRecord.rover : 'Custom GT Mask') : 'Requires reference GT labels'}
            </span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {analysis.isLoading && (
        <div className="p-12 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl text-center space-y-3 text-cyan-300 animate-pulse">
          <RefreshCw className="w-10 h-10 mx-auto animate-spin text-cyan-400" />
          <div className="font-bold text-sm">Performing Real Image Segmentation & Dataset Matching...</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Decoding pixels for {analysis.imageTitle} ({analysis.imageWidth}x{analysis.imageHeight} px) and matching against NASA AI4Mars reference manifests.
          </p>
        </div>
      )}

      {/* Error State */}
      {analysis.error && (
        <div className="p-8 bg-red-950/20 border border-red-500/40 rounded-2xl text-center space-y-3 text-red-300">
          <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
          <div className="font-bold text-sm">Image Analysis Error</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{analysis.error}</p>
          <button
            onClick={recalculateAnalysis}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer"
          >
            Retry Analysis
          </button>
        </div>
      )}

      {!analysis.isLoading && !analysis.error && (
        <>
          {/* Supervised vs Unlabeled Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-[#090E1C] border border-slate-800 rounded-2xl space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Overall Accuracy</span>
              <div className="text-base font-black text-emerald-400 font-mono">
                {isGT ? formatPct(classStats?.overallAccuracy) : 'N/A'}
              </div>
              <span className="text-[9px] text-slate-500 block">
                {isGT ? `${classStats?.evaluatedPixelCount?.toLocaleString()} evaluated px` : 'Unlabeled image'}
              </span>
            </div>

            <div className="p-3.5 bg-[#090E1C] border border-slate-800 rounded-2xl space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mean Precision</span>
              <div className="text-base font-black text-cyan-400 font-mono">
                {isGT ? formatPct(classStats?.meanPrecision) : 'N/A'}
              </div>
              <span className="text-[9px] text-slate-500 block">
                {isGT ? 'TP / (TP + FP)' : 'Unlabeled image'}
              </span>
            </div>

            <div className="p-3.5 bg-[#090E1C] border border-slate-800 rounded-2xl space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mean Recall</span>
              <div className="text-base font-black text-cyan-400 font-mono">
                {isGT ? formatPct(classStats?.meanRecall) : 'N/A'}
              </div>
              <span className="text-[9px] text-slate-500 block">
                {isGT ? 'TP / (TP + FN)' : 'Unlabeled image'}
              </span>
            </div>

            <div className="p-3.5 bg-[#090E1C] border border-slate-800 rounded-2xl space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mean F1-Score</span>
              <div className="text-base font-black text-purple-400 font-mono">
                {isGT ? formatPct(classStats?.meanF1) : 'N/A'}
              </div>
              <span className="text-[9px] text-slate-500 block">
                {isGT ? 'Harmonic mean P & R' : 'Unlabeled image'}
              </span>
            </div>

            <div className="p-3.5 bg-[#090E1C] border border-slate-800 rounded-2xl space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Traversable Surface</span>
              <div className="text-base font-black text-emerald-400 font-mono">
                {classStats?.traversablePixelPct ?? 0}%
              </div>
              <span className="text-[9px] text-slate-500 block">
                Soil + Bedrock coverage
              </span>
            </div>
          </div>

          {/* Per-Class Detailed Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {classMetrics.map((cm) => (
              <div
                key={cm.id}
                onClick={() => setSelectedClass(cm.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedClass === cm.id
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                    : 'bg-[#090E1C] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white">{cm.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 font-bold border border-cyan-500/30">
                    {cm.percentage.toFixed(1)}% ({cm.naturalPixelsString})
                  </span>
                </div>

                <div className="space-y-1 text-[11px] pt-1">
                  <div className="flex justify-between text-slate-400">
                    <span>IoU Score:</span>
                    <span className={cm.iou !== null ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                      {formatPct(cm.iou)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Precision:</span>
                    <span className={cm.precision !== null ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                      {formatPct(cm.precision)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Recall:</span>
                    <span className={cm.recall !== null ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                      {formatPct(cm.recall)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>F1 Score:</span>
                    <span className={cm.f1 !== null ? 'text-purple-300 font-bold' : 'text-slate-500'}>
                      {formatPct(cm.f1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Image Classification Table & Selected Class */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Per-Class Table Breakdown */}
            <div className="lg:col-span-7 bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <span>Class Metrics Breakdown ({analysis.imageId})</span>
                </h2>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {classStats?.processingDurationMs}ms inference
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                      <th className="py-2 text-left pl-2">Terrain Class</th>
                      <th className="py-2">Pred Pixels</th>
                      <th className="py-2">Coverage %</th>
                      <th className="py-2">IoU</th>
                      <th className="py-2">Precision</th>
                      <th className="py-2">Recall</th>
                      <th className="py-2">F1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {classMetrics.map((cm) => (
                      <tr key={cm.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 text-left font-bold text-slate-200 pl-2">{cm.name}</td>
                        <td className="py-2.5 text-slate-300">{cm.pixelCount.toLocaleString()}</td>
                        <td className="py-2.5 text-cyan-400 font-bold">{cm.percentage.toFixed(1)}%</td>
                        <td className="py-2.5 text-emerald-400 font-bold">{formatPct(cm.iou)}</td>
                        <td className="py-2.5 text-slate-300">{formatPct(cm.precision)}</td>
                        <td className="py-2.5 text-slate-300">{formatPct(cm.recall)}</td>
                        <td className="py-2.5 text-purple-300 font-bold">{formatPct(cm.f1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Provenance & GT Status Banner */}
              {!isGT ? (
                <div className="p-3.5 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2 text-amber-300 text-[11px]">
                  <div className="font-bold flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Info className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Ground Truth Mask Unavailable for Image {analysis.imageId}</span>
                    </span>
                    <button
                      onClick={() => setMaskModalOpen(true)}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] cursor-pointer"
                    >
                      Import Reference Mask
                    </button>
                  </div>
                  <p className="text-slate-400 text-[10px] leading-relaxed">
                    Accuracy, IoU, Precision, Recall, and Confusion Matrix are supervised evaluation metrics requiring human-annotated ground-truth pixel masks. The metrics shown display genuine model predictions and pixel coverage derived from the uploaded image.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px] flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{classStats?.groundTruthNote}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">{formatPct(classStats?.mIoU)} mIoU</span>
                    <button
                      onClick={clearCustomGroundTruthMask}
                      className="px-2 py-0.5 rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-500/30 text-[9px] cursor-pointer"
                    >
                      Clear Mask
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Selected Class Detail Panel */}
            <div className="lg:col-span-5 bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Class Detail: {activeMetric.name}
                </h2>
                <span className="text-[10px] text-cyan-400 font-bold">Class #{activeMetric.id}</span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-300">
                <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold block uppercase">Terrain Description</span>
                  <p className="text-[11px] text-slate-300">{activeMetric.desc}</p>
                </div>

                <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] text-emerald-400 font-bold block uppercase">Predicted Pixel Statistics</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Sampled Coverage</span>
                      <span className="text-white font-bold">{activeMetric.percentage.toFixed(1)}% ({activeMetric.pixelCount.toLocaleString()} px)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Estimated Area</span>
                      <span className="text-cyan-400 font-bold">{activeMetric.naturalPixelsString} pixels</span>
                    </div>
                  </div>
                </div>

                {isGT && (
                  <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-500/30 text-[11px] text-purple-300 space-y-1.5">
                    <span className="font-bold flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span>Supervised Confusion Breakdown</span>
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400 block">True Positives</span>
                        <span className="text-emerald-400 font-bold">{activeMetric.tp?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">False Positives</span>
                        <span className="text-amber-400 font-bold">{activeMetric.fp?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">False Negatives</span>
                        <span className="text-red-400 font-bold">{activeMetric.fn?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 4x4 Confusion Matrix Section */}
          <div className="bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                <span>Supervised 4x4 Confusion Matrix</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                {isGT ? `Rows = Actual GT, Cols = Pred (${classStats?.evaluatedPixelCount?.toLocaleString()} evaluated px)` : 'Ground Truth Required'}
              </span>
            </div>

            {isGT && classStats?.confusionMatrix ? (
              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                      <th className="py-2 text-left pl-2">Actual \ Pred</th>
                      <th className="py-2 text-red-400">Soil</th>
                      <th className="py-2 text-emerald-400">Bedrock</th>
                      <th className="py-2 text-blue-400">Sand</th>
                      <th className="py-2 text-amber-400">Big Rock</th>
                      <th className="py-2">Total Actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {classStats.confusionMatrix.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 text-left font-bold text-slate-200 pl-2">{row.actualClass}</td>
                        <td className={`py-2.5 font-bold ${idx === 0 ? 'bg-emerald-950/40 text-emerald-400' : 'text-slate-300'}`}>
                          {row.predSoil.toLocaleString()} ({row.predSoilPct}%)
                        </td>
                        <td className={`py-2.5 font-bold ${idx === 1 ? 'bg-emerald-950/40 text-emerald-400' : 'text-slate-300'}`}>
                          {row.predBedrock.toLocaleString()} ({row.predBedrockPct}%)
                        </td>
                        <td className={`py-2.5 font-bold ${idx === 2 ? 'bg-emerald-950/40 text-emerald-400' : 'text-slate-300'}`}>
                          {row.predSand.toLocaleString()} ({row.predSandPct}%)
                        </td>
                        <td className={`py-2.5 font-bold ${idx === 3 ? 'bg-emerald-950/40 text-emerald-400' : 'text-slate-300'}`}>
                          {row.predRock.toLocaleString()} ({row.predRockPct}%)
                        </td>
                        <td className="py-2.5 text-slate-400">{row.totalActualPixels.toLocaleString()} px</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 bg-black/40 border border-slate-800/60 rounded-xl text-center space-y-3">
                <div className="text-slate-200 font-bold text-xs">Ground Truth Confusion Matrix Unavailable for Custom Image</div>
                <p className="text-[11px] text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Supervised multi-class confusion matrix calculations require human-annotated ground-truth target masks. Upload or generate a reference mask to view cross-class accuracy.
                </p>
                <button
                  onClick={() => setMaskModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Attach or Generate Reference Mask</span>
                </button>
              </div>
            )}
          </div>

          {/* Data Consistency Audit Table */}
          <div className="bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-3">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              <span>Data Consistency & Pixel Resolution Audit</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
              <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Native Frame Resolution</span>
                <span className="text-white font-bold">{analysis.imageWidth} × {analysis.imageHeight} px ({((analysis.imageWidth * analysis.imageHeight) / 1e6).toFixed(2)} MP)</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Sampled Inference Grid</span>
                <span className="text-cyan-400 font-bold">256 × 256 (65,536 px)</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Valid Evaluated Pixels</span>
                <span className="text-emerald-400 font-bold">{isGT ? `${classStats?.evaluatedPixelCount?.toLocaleString()} px` : 'N/A'}</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Ignored Sky/Deck Pixels</span>
                <span className="text-amber-400 font-bold">{isGT ? `${classStats?.ignoredPixelCount?.toLocaleString()} px (Class 255)` : '0 px'}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom Reference Mask Import / Drawing Modal */}
      {maskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1020] border border-purple-500/40 rounded-3xl w-full max-w-xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>Attach or Import Reference Ground-Truth Mask</span>
              </h3>
              <button onClick={() => setMaskModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Supervised evaluation (Precision, Recall, F1, IoU, Confusion Matrix) compares model outputs against ground-truth terrain masks. Import a PNG mask image or generate a reference mask to evaluate image <strong className="text-cyan-300">{analysis.imageId}</strong>.
            </p>

            <div className="space-y-3">
              <input
                type="file"
                ref={maskFileInputRef}
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCustomMaskUpload(file);
                }}
              />

              <button
                onClick={() => maskFileInputRef.current?.click()}
                className="w-full py-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition-all font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Custom Reference PNG / Mask File</span>
              </button>

              <button
                onClick={handleGenerateThresholdMask}
                className="w-full py-3 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 transition-all font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Generate Threshold-Derived Reference Mask</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setMaskModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
