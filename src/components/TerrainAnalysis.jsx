import React, { useState } from 'react';
import { Upload, Cpu, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw, Layers, ShieldAlert, Sparkles } from 'lucide-react';
import soilSample from '../assets/images/mars_soil_jezero_1792001380657.jpg';
import bedrockSample from '../assets/images/bedrock_ridge_jezero_1792001381866.jpg';
import sandSample from '../assets/images/sand_dunes_jezero_1792001382467.jpg';

export default function TerrainAnalysis() {
  const [selectedImage, setSelectedImage] = useState(soilSample);
  const [isProcessing, setIsProcessing] = useState(false);
  const [segmented, setSegmented] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const sampleImages = [
    { id: 'Regolith / Soil', name: 'Jezero_Soil_Sol_380.jpg', url: soilSample },
    { id: 'Bedrock Ridge', name: 'Bedrock_Ridge_Sol_412.jpg', url: bedrockSample },
    { id: 'Basalt Dunes', name: 'Seitah_Megaripples_Sector_9.jpg', url: sandSample }
  ];

  const handleSelectSample = (img) => {
    setSelectedImage(img.url);
    setSegmented(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setSegmented(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setSegmented(false);
    }
  };

  const handleRunInference = () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSegmented(true);
    }, 900);
  };

  return (
    <section id="terrain-ai" className="py-24 px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl mx-auto">
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-xs font-mono text-orange-400 uppercase tracking-widest">
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Terrain Segmentation Lab</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            PyTorch Vision Model <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Inference Sandbox
            </span>
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Upload rover navigation camera imagery or select a sample frame to test pixel-level soil, bedrock, sand, and rock classification using the NASA AI4Mars architecture.
          </p>
        </div>

        {/* Main Lab Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload & Sample selector */}
          <div className="lg:col-span-6 space-y-6 bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-orange-400" />
                <span>Source Image Input</span>
              </h3>
              <span className="text-xs font-mono text-slate-400">NASA AI4Mars Vision Model Sandbox</span>
            </div>

            {/* Drag and Drop Upload area */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all group ${
                  isDragging
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-white/20 hover:border-orange-500/50 bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">Drag & drop or click to upload</p>
                <p className="text-xs text-slate-400 font-mono">Curiosity / Perseverance Hazcam & Navcam (PNG, JPG)</p>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Sample Selector */}
            <div className="space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Or choose a preloaded sample:</span>
              <div className="grid grid-cols-3 gap-3">
                {sampleImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleSelectSample(img)}
                    className={`relative rounded-xl overflow-hidden border transition-all ${
                      selectedImage === img.url
                        ? 'border-orange-500 ring-2 ring-orange-500/40'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img src={img.url} alt={img.name} className="w-full h-20 object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-sm p-1 text-[10px] text-slate-200 truncate font-mono text-center">
                      {img.id}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Run Inference Button */}
            <button
              onClick={handleRunInference}
              disabled={!selectedImage || isProcessing}
              className={`w-full flex items-center justify-center space-x-2 py-4 rounded-2xl font-bold text-sm tracking-wider uppercase shadow-xl transition-all ${
                !selectedImage
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-orange-600/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Simulated Mask...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  <span>Execute Simulated Segmentation</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Results & Segmentation Mask */}
          <div className="lg:col-span-6 space-y-6 bg-[#0B1020]/90 border border-white/15 p-6 sm:p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-orange-400" />
                <span>Segmentation Output Mask</span>
              </h3>
              {segmented ? (
                <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Simulated Preview</span>
                </div>
              ) : (
                <span className="text-xs font-mono text-slate-400">Standby</span>
              )}
            </div>

            {/* Preview Box */}
            <div className="relative w-full h-72 rounded-2xl bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center">
              {selectedImage ? (
                <div className="relative w-full h-full">
                  <img src={selectedImage} alt="Selected Rover Feed" className="w-full h-full object-cover" />
                  {segmented && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/30 via-orange-500/30 to-red-500/30 mix-blend-color-dodge flex flex-col items-center justify-between p-4">
                      <div className="bg-black/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-[11px] font-mono text-orange-300">
                        NASA AI4Mars Benchmark Classification Overlay
                      </div>
                      <div className="bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/20 text-xs font-mono text-slate-200">
                        Bedrock: 42% • Sand: 35% • Soil: 18% • Big Rock: 5%
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-2 p-6 text-slate-500 font-mono text-xs">
                  <ImageIcon className="w-10 h-10 mx-auto opacity-40" />
                  <p>No image loaded. Drag a rover photo or choose a sample to test.</p>
                </div>
              )}
            </div>

            {/* 5 NASA AI4Mars Legend Classes */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Official NASA AI4Mars Legend:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-200">Soil</span>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="w-3 h-3 rounded-full bg-cyan-400" />
                  <span className="text-slate-200">Bedrock</span>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-200">Sand</span>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-slate-200">Big Rock</span>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded-xl bg-white/[0.02] border border-white/5 col-span-2 sm:col-span-1">
                  <span className="w-3 h-3 rounded-full bg-slate-500" />
                  <span className="text-slate-200">Unlabeled / Sky</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
