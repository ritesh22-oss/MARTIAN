import React, { useState } from 'react';
import { Cpu, ShieldAlert, Navigation, Layers, Compass, Zap } from 'lucide-react';
import TerrainIntelligenceVerifyModal from './TerrainIntelligenceVerifyModal';
import RiskAwareNavVerifyModal from './RiskAwareNavVerifyModal';
import RouteOptimizationVerifyModal from './RouteOptimizationVerifyModal';

export default function MissionOverview() {
  const [activeVerifyModal, setActiveVerifyModal] = useState<'terrain' | 'risk' | 'route' | null>(null);

  const features = [
    {
      id: 'terrain' as const,
      icon: <Cpu className="w-6 h-6 text-orange-400" />,
      title: "Terrain Intelligence",
      description:
        "Pixel-level terrain segmentation classifies rover camera imagery into distinct geological classes: soil, bedrock, sand, and rocks.",
      badge: "PyTorch Vision"
    },
    {
      id: 'risk' as const,
      icon: <ShieldAlert className="w-6 h-6 text-red-400" />,
      title: "Risk-Aware Navigation",
      description:
        "Translates surface classification and slope steepness into traversability cost maps, avoiding high-slip sand dunes and boulder hazards.",
      badge: "Cost Weighting"
    },
    {
      id: 'route' as const,
      icon: <Navigation className="w-6 h-6 text-amber-400" />,
      title: "Route Optimization",
      description:
        "Advanced A* pathfinding algorithm searches digital elevation grids to compute safe, energy-efficient trajectories around obstacles.",
      badge: "A* Algorithm"
    }
  ];

  return (
    <section id="overview" className="py-24 px-4 sm:px-6 lg:px-8 relative z-10 bg-[#050813]/60 backdrop-blur-sm border-y border-white/5">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-orange-400 uppercase tracking-widest">
            <Layers className="w-3.5 h-3.5" />
            <span>Mission Overview</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Intelligence Beyond <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              The Horizon
            </span>
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Mars terrain presents treacherous conditions including loose sand, sharp bedrock, and boulder fields. MarsNav investigates how computer vision and automated pathfinding support rover autonomy.
          </p>
        </div>

        {/* 3 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.id}
              onClick={() => setActiveVerifyModal(feature.id)}
              className="group relative bg-[#0B1020]/80 border border-white/10 hover:border-orange-500/50 rounded-3xl p-8 backdrop-blur-xl shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-orange-600/10 flex flex-col justify-between cursor-pointer"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-bl-full pointer-events-none group-hover:bg-orange-500/10 transition-colors" />

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    {feature.icon}
                  </div>
                  <span className="text-[11px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    {feature.badge}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-orange-300 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Module Status: Operational</span>
                <span className="text-orange-400 group-hover:translate-x-1 transition-transform inline-flex items-center font-bold">
                  Verify &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Modals for the 3 Cards */}
      <TerrainIntelligenceVerifyModal
        isOpen={activeVerifyModal === 'terrain'}
        onClose={() => setActiveVerifyModal(null)}
      />
      <RiskAwareNavVerifyModal
        isOpen={activeVerifyModal === 'risk'}
        onClose={() => setActiveVerifyModal(null)}
      />
      <RouteOptimizationVerifyModal
        isOpen={activeVerifyModal === 'route'}
        onClose={() => setActiveVerifyModal(null)}
      />
    </section>
  );
}
