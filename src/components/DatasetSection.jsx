import React from 'react';
import { Database, Cpu, Layers, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function DatasetSection() {
  const datasetHighlights = [
    { title: "Dataset Origin", desc: "NASA AI4Mars public dataset containing thousands of labeled rover navigation camera frames." },
    { title: "Semantic Classes", desc: "Pixel-level annotation across soil, bedrock, sand dunes, and rock hazards." },
    { title: "Training Split", desc: "80% training set across Curiosity and Perseverance rover traverse logs; 20% validation set." },
    { title: "Evaluation Metric", desc: "Mean Intersection over Union (mIoU) and pixel classification accuracy." }
  ];

  return (
    <section id="dataset" className="py-24 px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl mx-auto">
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-xs font-mono text-orange-400 uppercase tracking-widest">
            <Database className="w-3.5 h-3.5" />
            <span>Dataset & Model Research</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            NASA AI4Mars <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              Dataset & Architecture
            </span>
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Understanding geological terrain appearance is fundamental for autonomous planetary exploration. MarsNav leverages benchmarked datasets to train semantic segmentation networks.
          </p>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {datasetHighlights.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#0B1020]/90 border border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-xl hover:border-orange-500/40 transition-all space-y-4"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 font-mono font-bold text-sm">
                0{idx + 1}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Banner with Official Link */}
        <div className="bg-gradient-to-r from-orange-950/40 via-[#0B1020] to-red-950/40 border border-orange-500/30 p-8 rounded-3xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-left">
            <div className="flex items-center space-x-2 text-orange-400 font-mono text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Open Science & Research Prototype</span>
            </div>
            <h3 className="text-xl font-bold text-white">Explore the Official NASA AI4Mars Documentation</h3>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Access raw labeled imagery, annotation guidelines, and baseline segmentation models provided by NASA JPL and PDS Imaging Node.
            </p>
          </div>
          <a
            href="https://pds-imaging.jpl.nasa.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition-all shrink-0"
          >
            <span>View Dataset Docs</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
