import React from 'react';
import { ArrowRight, Cpu, Layers, Navigation, ShieldCheck, Zap, Image as ImageIcon, MapPin } from 'lucide-react';

export default function MethodologySection() {
  const steps = [
    { title: "Rover Image", desc: "Front/rear Hazcam navigation stereoscopic frame capture.", icon: <ImageIcon className="w-5 h-5 text-orange-400" />, status: "Implemented" },
    { title: "Preprocessing", desc: "Distortion rectification, histogram leveling, and depth scaling.", icon: <Layers className="w-5 h-5 text-amber-400" />, status: "Implemented" },
    { title: "PyTorch Segmentation", desc: "Deep CNN predicting per-pixel geological semantic terrain classes.", icon: <Cpu className="w-5 h-5 text-red-400" />, status: "Planned (FastAPI)" },
    { title: "Terrain Cost Map", desc: "Translating classes & slope gradients into mobility friction weights.", icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />, status: "Implemented" },
    { title: "A* Search", desc: "Heuristic search algorithm identifying lowest-energy hazard-free path.", icon: <Zap className="w-5 h-5 text-emerald-400" />, status: "Implemented" },
    { title: "Candidate Route", desc: "Validated waypoint telemetry steering commands for rover drive.", icon: <Navigation className="w-5 h-5 text-fuchsia-400" />, status: "Implemented" }
  ];

  return (
    <section id="methodology" className="py-24 px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl mx-auto">
      <div className="space-y-16">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-xs font-mono text-orange-400 uppercase tracking-widest">
            <Layers className="w-3.5 h-3.5" />
            <span>AI Pipeline Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Methodology & <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Inference Dataflow
            </span>
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            From raw Martian camera capture to autonomous rover trajectory execution through an integrated PyTorch and A* graph architecture.
          </p>
        </div>

        {/* Connected Flow Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative bg-[#0B1020]/90 border border-white/10 p-5 rounded-3xl backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-4 group hover:border-orange-500/50 transition-all"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Step 0{idx + 1}</span>
                <span className={step.status.includes('Planned') ? 'text-amber-400' : 'text-emerald-400 font-semibold'}>
                  {step.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Architecture Note */}
        <div className="bg-[#0B1020]/90 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Frontend Architecture</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Built with React, Vite, Tailwind CSS, and Three.js. Provides real-time 3D HiRISE elevation visualization, A* grid pathfinding, and interactive segmentation testing.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Backend Architecture (Planned FastAPI)</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Designed for Python FastAPI microservices serving pre-trained PyTorch semantic segmentation models for real-time Mars rover terrain classification without client secrets.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
