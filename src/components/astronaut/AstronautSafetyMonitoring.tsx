import React, { useState } from 'react';
import {
  ShieldCheck,
  Sun,
  Thermometer,
  Compass,
  Shield,
  Activity,
  Eye,
  Info,
  X
} from 'lucide-react';
import { useAstronautExploration } from '../../context/AstronautExplorationContext';

function getSafeImgSrc(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;
  return `/api/nasa/proxy-image?url=${encodeURIComponent(url)}`;
}

export const AstronautSafetyMonitoring: React.FC = () => {
  const { activeSession, getSuitConfigDetails, routes, selectedRouteId } = useAstronautExploration();
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [showYellowBoxes, setShowYellowBoxes] = useState<boolean>(true);
  const [showSegMask, setShowSegMask] = useState<boolean>(false);

  const suitDetails = getSuitConfigDetails();
  const env = activeSession.environmentalObservations;
  const analysis = activeSession.imageAnalysis;
  const terrain = activeSession.terrainAnalysis;
  const route = routes[selectedRouteId];

  const selectedHazard = analysis.hazards.find(h => h.id === selectedHazardId) || null;
  const hasImage = Boolean(activeSession.imageMetadata.url);
  const imgW = activeSession.imageMetadata.width || 4;
  const imgH = activeSession.imageMetadata.height || 3;

  // Honest Terrain Safety Audit Metrics (never fabricate slope/clearance for uncalibrated 2D frames)
  const terrainHazards = [
    {
      name: 'Slope Steepness',
      val: terrain.slopeAvailable && terrain.slopeMaxDeg !== null ? `${terrain.slopeMaxDeg.toFixed(1)}° Max` : 'UNAVAILABLE (No DEM)',
      limit: suitDetails.maxSlopeDeg !== null ? `${suitDetails.maxSlopeDeg}° Limit` : 'Suit Limit Missing Data',
      risk:
        !terrain.slopeAvailable || terrain.slopeMaxDeg === null
          ? 'UNKNOWN'
          : suitDetails.maxSlopeDeg !== null && terrain.slopeMaxDeg > suitDetails.maxSlopeDeg
            ? 'CRITICAL'
            : terrain.slopeMaxDeg > 12
              ? 'MODERATE'
              : 'LOW',
      nature: terrain.slopeAvailable ? 'Observed' : 'Unavailable'
    },
    {
      name: 'Obstacle Area Density',
      val: hasImage ? `${terrain.boulderDensityPct}% Frame` : 'UNAVAILABLE',
      limit: '< 20% Area',
      risk: !hasImage ? 'UNKNOWN' : terrain.boulderDensityPct > 20 ? 'HIGH' : terrain.boulderDensityPct > 10 ? 'MODERATE' : 'LOW',
      nature: hasImage ? 'Derived' : 'Unavailable'
    },
    {
      name: 'Regolith Traversability',
      val: terrain.regolithTraversabilityIndex !== null ? `${terrain.regolithTraversabilityIndex}/100` : 'UNAVAILABLE',
      limit: '> 40 Index',
      risk:
        terrain.regolithTraversabilityIndex === null
          ? 'UNKNOWN'
          : terrain.regolithTraversabilityIndex < 40
            ? 'HIGH'
            : terrain.regolithTraversabilityIndex < 60
              ? 'MODERATE'
              : 'LOW',
      nature: terrain.regolithTraversabilityIndex !== null ? 'Derived' : 'Unavailable'
    },
    {
      name: 'Passage Width Clearance',
      val: terrain.passageWidthM !== null ? `${terrain.passageWidthM} m` : 'UNAVAILABLE (No Scale)',
      limit: '> 2.0m Clearance',
      risk: terrain.passageWidthM !== null && terrain.passageWidthM < 2.0 ? 'HIGH' : 'UNKNOWN',
      nature: terrain.passageWidthM !== null ? 'Derived' : 'Unavailable'
    }
  ];

  const environmentalHazards = [
    {
      name: 'Ambient Surface Temp',
      val: env.ambientTempC.value !== null ? `${env.ambientTempC.value} ${env.ambientTempC.unit}` : 'UNAVAILABLE',
      limit: '-120°C to +20°C',
      risk: env.ambientTempC.value !== null ? 'LOW' : 'UNKNOWN',
      nature: env.ambientTempC.nature,
      instrument: env.ambientTempC.instrument
    },
    {
      name: 'Atmospheric Pressure',
      val: env.atmosPressurePa.value !== null ? `${env.atmosPressurePa.value} ${env.atmosPressurePa.unit}` : 'UNAVAILABLE',
      limit: '500 - 800 Pa',
      risk: env.atmosPressurePa.value !== null ? 'LOW' : 'UNKNOWN',
      nature: env.atmosPressurePa.nature,
      instrument: env.atmosPressurePa.instrument
    },
    {
      name: 'Wind Velocity Vector',
      val: env.windSpeedMs.value !== null ? `${env.windSpeedMs.value} m/s @ ${env.windDirectionDeg.value}°` : 'UNAVAILABLE',
      limit: '< 25 m/s Limit',
      risk: env.windSpeedMs.value !== null ? 'LOW' : 'UNKNOWN',
      nature: env.windSpeedMs.nature,
      instrument: env.windSpeedMs.instrument
    },
    {
      name: 'Dust Optical Depth (Tau)',
      val: env.dustTau.value !== null ? `${env.dustTau.value} (Tau)` : 'UNAVAILABLE',
      limit: 'Tau < 2.5 Limit',
      risk: env.dustTau.value !== null ? ((env.dustTau.value as number) > 2.5 ? 'HIGH' : 'LOW') : 'UNKNOWN',
      nature: env.dustTau.nature,
      instrument: env.dustTau.instrument
    }
  ];

  const radiationHazards = [
    {
      name: 'Surface Dose Rate',
      val: env.radiationDoseMgyDay.value !== null ? `${env.radiationDoseMgyDay.value} mGy/day` : 'UNAVAILABLE',
      limit: '< 1.2 mGy/day',
      risk: env.radiationDoseMgyDay.value !== null ? ((env.radiationDoseMgyDay.value as number) > 1.2 ? 'HIGH' : 'LOW') : 'UNKNOWN',
      nature: env.radiationDoseMgyDay.nature,
      instrument: env.radiationDoseMgyDay.instrument
    },
    {
      name: 'Solar Particle / Flare Feed',
      val: String(env.solarFlareStatus.value || 'See Radiation Monitor'),
      limit: 'NOAA SWPC / NASA DONKI',
      risk: 'LOW',
      nature: env.solarFlareStatus.nature,
      instrument: env.solarFlareStatus.instrument
    },
    {
      name: 'Galactic Cosmic Ray',
      val: env.galacticCosmicRayMsvYr.value !== null ? `${env.galacticCosmicRayMsvYr.value} mSv/yr` : 'UNAVAILABLE',
      limit: '< 500 mSv/yr',
      risk: env.galacticCosmicRayMsvYr.value !== null ? 'MODERATE' : 'UNKNOWN',
      nature: env.galacticCosmicRayMsvYr.nature,
      instrument: env.galacticCosmicRayMsvYr.instrument
    }
  ];

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">HIGH</span>;
      case 'MODERATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">MODERATE</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">UNAVAILABLE</span>;
    }
  };

  const getNatureTag = (nature: string) => {
    const baseClass = 'px-1.5 py-0.5 rounded-[2px] text-[8px] font-mono font-bold border uppercase';
    switch (nature) {
      case 'Observed':
        return <span className={`${baseClass} bg-cyan-500/10 text-cyan-300 border-cyan-500/30`}>OBSERVED</span>;
      case 'Derived':
        return <span className={`${baseClass} bg-purple-500/10 text-purple-300 border-purple-500/30`}>IMAGE-DERIVED</span>;
      case 'Modeled':
        return <span className={`${baseClass} bg-blue-500/10 text-blue-300 border-blue-500/30`}>MODELED</span>;
      default:
        return <span className={`${baseClass} bg-slate-800 text-slate-400 border-slate-700`}>UNAVAILABLE</span>;
    }
  };

  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MODERATE' | 'LOW'>('ALL');

  // Multi-scale Obstacle Breakdown Statistics
  const totalObstacles = analysis.hazards.length;
  const massiveCount = analysis.hazards.filter(h => h.sizeCategory === 'massive_boulder').length;
  const largeCount = analysis.hazards.filter(h => h.sizeCategory === 'large_boulder').length;
  const mediumCount = analysis.hazards.filter(h => h.sizeCategory === 'medium_rock').length;
  const smallCount = analysis.hazards.filter(h => h.sizeCategory === 'small_rock').length;
  const clusterCount = analysis.hazards.filter(h => h.sizeCategory === 'rock_cluster').length;
  const ridgeCount = analysis.hazards.filter(h => h.sizeCategory === 'bedrock_ridge').length;
  const depressionCount = analysis.hazards.filter(h => h.sizeCategory === 'crater_depression').length;

  const highRiskCount = analysis.hazards.filter(h => h.riskLevel === 'CRITICAL' || h.riskLevel === 'HIGH').length;
  const modRiskCount = analysis.hazards.filter(h => h.riskLevel === 'MODERATE').length;
  const lowRiskCount = analysis.hazards.filter(h => h.riskLevel === 'LOW').length;

  const filteredHazards = analysis.hazards.filter(h => {
    if (riskFilter === 'ALL') return true;
    if (riskFilter === 'HIGH') return h.riskLevel === 'CRITICAL' || h.riskLevel === 'HIGH';
    if (riskFilter === 'MODERATE') return h.riskLevel === 'MODERATE';
    if (riskFilter === 'LOW') return h.riskLevel === 'LOW';
    return true;
  });

  const getHazardBoxColor = (h: any, isSelected: boolean) => {
    const isHigh = h.riskLevel === 'CRITICAL' || h.riskLevel === 'HIGH' || h.sizeCategory === 'massive_boulder' || h.sizeCategory === 'large_boulder';
    const isMod = h.riskLevel === 'MODERATE' || h.sizeCategory === 'rock_cluster' || h.sizeCategory === 'medium_rock' || h.sizeCategory === 'bedrock_ridge';

    if (isSelected) {
      return isHigh
        ? 'border-red-300 bg-red-500/35 z-30 shadow-[0_0_18px_rgba(239,68,68,0.95)]'
        : isMod
          ? 'border-orange-300 bg-orange-500/35 z-30 shadow-[0_0_18px_rgba(249,115,22,0.95)]'
          : 'border-yellow-200 bg-yellow-400/35 z-30 shadow-[0_0_18px_rgba(250,204,21,0.95)]';
    }

    return isHigh
      ? 'border-[#ef4444] bg-red-500/15 hover:bg-red-500/25 z-10'
      : isMod
        ? 'border-[#f97316] bg-orange-500/15 hover:bg-orange-500/25 z-10'
        : 'border-[#eab308] bg-yellow-400/10 hover:bg-yellow-400/20 z-10';
  };

  const getHazardBadgeColor = (h: any) => {
    const isHigh = h.riskLevel === 'CRITICAL' || h.riskLevel === 'HIGH' || h.sizeCategory === 'massive_boulder' || h.sizeCategory === 'large_boulder';
    const isMod = h.riskLevel === 'MODERATE' || h.sizeCategory === 'rock_cluster' || h.sizeCategory === 'medium_rock' || h.sizeCategory === 'bedrock_ridge';

    return isHigh
      ? 'bg-[#ef4444] text-white'
      : isMod
        ? 'bg-[#f97316] text-white'
        : 'bg-[#eab308] text-black';
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in pb-12">
      {/* 1. OBSTACLE SUMMARY STATISTICS PANEL */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Multiscale Martian Obstacle &amp; Hazard Summary
            </h3>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span className="text-slate-400 text-[10px]">FILTER VIEW:</span>
            {(['ALL', 'HIGH', 'MODERATE', 'LOW'] as const).map(f => (
              <button
                key={f}
                onClick={() => setRiskFilter(f)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                  riskFilter === f
                    ? f === 'HIGH'
                      ? 'bg-red-500/30 border-red-500 text-red-200'
                      : f === 'MODERATE'
                        ? 'bg-orange-500/30 border-orange-500 text-orange-200'
                        : f === 'LOW'
                          ? 'bg-yellow-500/30 border-yellow-500 text-yellow-200'
                          : 'bg-cyan-500/30 border-cyan-500 text-cyan-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {f} {f === 'HIGH' ? `(${highRiskCount})` : f === 'MODERATE' ? `(${modRiskCount})` : f === 'LOW' ? `(${lowRiskCount})` : `(${totalObstacles})`}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs font-mono">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[9px] text-slate-400 uppercase block">Total Detected</span>
            <strong className="text-base text-white font-bold">{totalObstacles}</strong>
            <span className="text-[9px] text-slate-500 block">All categories</span>
          </div>
          <div className="bg-red-950/20 border border-red-500/40 rounded-xl p-2.5">
            <span className="text-[9px] text-red-300 uppercase block">Massive Boulders</span>
            <strong className="text-base text-red-400 font-bold">{massiveCount}</strong>
            <span className="text-[9px] text-red-400/80 block">&gt;6.5% Frame</span>
          </div>
          <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-2.5">
            <span className="text-[9px] text-red-300 uppercase block">Large Rocks</span>
            <strong className="text-base text-red-300 font-bold">{largeCount}</strong>
            <span className="text-[9px] text-red-400/80 block">&gt;2.2% Frame</span>
          </div>
          <div className="bg-orange-950/20 border border-orange-500/30 rounded-xl p-2.5">
            <span className="text-[9px] text-orange-300 uppercase block">Medium Rocks</span>
            <strong className="text-base text-orange-400 font-bold">{mediumCount}</strong>
            <span className="text-[9px] text-orange-400/80 block">0.5%–2.2% Frame</span>
          </div>
          <div className="bg-yellow-950/20 border border-yellow-500/30 rounded-xl p-2.5">
            <span className="text-[9px] text-yellow-300 uppercase block">Small Rocks</span>
            <strong className="text-base text-yellow-400 font-bold">{smallCount}</strong>
            <span className="text-[9px] text-yellow-400/80 block">&lt;0.5% Clasts</span>
          </div>
          <div className="bg-orange-950/20 border border-orange-500/30 rounded-xl p-2.5">
            <span className="text-[9px] text-orange-300 uppercase block">Rock Clusters</span>
            <strong className="text-base text-orange-300 font-bold">{clusterCount}</strong>
            <span className="text-[9px] text-orange-400/80 block">Dense rubble</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[9px] text-cyan-300 uppercase block">Ridges &amp; Pits</span>
            <strong className="text-base text-cyan-300 font-bold">{ridgeCount + depressionCount}</strong>
            <span className="text-[9px] text-slate-500 block">{ridgeCount} scarps · {depressionCount} pits</span>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE OBSTACLE & HAZARD VIEWPORT */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 bg-slate-900/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-black uppercase">
                MULTISCALE RISK LOCALIZER
              </span>
              <span className="text-xs text-cyan-300 font-mono truncate max-w-xs">
                {activeSession.imageMetadata.fileName}
              </span>
            </div>
            <h2 className="text-base font-bold text-white">Dynamic Obstacle Segmentation &amp; Risk Overlay</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setShowYellowBoxes(v => !v)}
              className={`px-2.5 py-1.5 rounded-lg border font-bold cursor-pointer ${
                showYellowBoxes
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              Obstacle Boxes ({filteredHazards.length})
            </button>
            {analysis.segmentationMaskUrl && (
              <button
                onClick={() => setShowSegMask(v => !v)}
                className={`px-2.5 py-1.5 rounded-lg border font-bold cursor-pointer flex items-center gap-1 ${
                  showSegMask
                    ? 'bg-purple-500/25 border-purple-400 text-purple-200'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Pixel Mask</span>
              </button>
            )}
            <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-red-300 font-bold">{highRiskCount} High</span>
              <span className="w-2 h-2 rounded-full bg-orange-500 ml-1" />
              <span className="text-[10px] text-orange-300 font-bold">{modRiskCount} Mod</span>
              <span className="w-2 h-2 rounded-full bg-yellow-400 ml-1" />
              <span className="text-[10px] text-yellow-300 font-bold">{lowRiskCount} Low</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Uncropped Aspect-Locked Image + Color-coded Risk Bounding Boxes */}
          <div className="lg:col-span-8 bg-[#050813] p-4 flex items-center justify-center">
            {hasImage ? (
              <div
                className="relative w-full max-h-[540px] bg-black rounded-xl overflow-hidden border border-slate-800"
                style={{ aspectRatio: `${imgW} / ${imgH}` }}
              >
                <img
                  src={getSafeImgSrc(activeSession.imageMetadata.url)}
                  className="w-full h-full object-contain"
                  alt="Terrain Hazard Map"
                />

                {showSegMask && analysis.segmentationMaskUrl && (
                  <img
                    src={analysis.segmentationMaskUrl}
                    alt="Pixel Segmentation Mask"
                    className="absolute inset-0 w-full h-full object-contain opacity-65 pointer-events-none"
                  />
                )}

                {showYellowBoxes &&
                  filteredHazards.map(h => {
                    const isSelected = selectedHazardId === h.id;
                    const boxClasses = getHazardBoxColor(h, isSelected);
                    const badgeClasses = getHazardBadgeColor(h);

                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setSelectedHazardId(isSelected ? null : h.id)}
                        className={`absolute border-2 transition-all cursor-pointer ${boxClasses}`}
                        style={{
                          left: `${h.normX * 100}%`,
                          top: `${h.normY * 100}%`,
                          width: `${h.normWidth * 100}%`,
                          height: `${h.normHeight * 100}%`
                        }}
                      >
                        <span className={`absolute -top-4 left-0 px-1 py-0.2 font-mono text-[8px] font-bold rounded-t whitespace-nowrap shadow ${badgeClasses}`}>
                          {h.label} · {(h.confidence * 100).toFixed(0)}%
                        </span>
                      </button>
                    );
                  })}
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-400 font-mono text-xs text-center p-6">
                No active surface image selected. Upload a Martian photo or choose a NASA rover frame in MARSWALK OPS to run obstacle localization.
              </div>
            )}
          </div>

          {/* Right Obstacle & Hazard Inspector Drawer */}
          <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#090E1D] p-4 flex flex-col justify-between space-y-4">
            {selectedHazard ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-start justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="text-[10px] text-cyan-400 uppercase block">Selected Obstacle Inspector</span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{selectedHazard.label}</h4>
                  </div>
                  <button
                    onClick={() => setSelectedHazardId(null)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase block">Obstacle ID</span>
                    <strong className="text-cyan-300 truncate block">{selectedHazard.id}</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase block">Category</span>
                    <strong className="text-white">{selectedHazard.classification}</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase block">Visual Size Class</span>
                    <strong className="text-amber-300">{selectedHazard.sizeCategory?.replace('_', ' ') || selectedHazard.severity}</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase block">Confidence</span>
                    <strong className="text-emerald-300">{(selectedHazard.confidence * 100).toFixed(1)}%</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase block">Detection Method</span>
                    <strong className="text-purple-300">{selectedHazard.detectionMethod || 'CV Localizer'}</strong>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-400 uppercase block">Hazard Status</span>
                    <strong className="text-amber-300">{selectedHazard.hazardStatus || selectedHazard.riskLevel}</strong>
                  </div>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                  <span className="text-[9px] text-slate-400 uppercase block">Bounding Box Coordinates</span>
                  <div className="text-slate-300">
                    Norm: [{(selectedHazard.normX * 100).toFixed(1)}%, {(selectedHazard.normY * 100).toFixed(1)}%] ·{' '}
                    {(selectedHazard.normWidth * 100).toFixed(1)}% × {(selectedHazard.normHeight * 100).toFixed(1)}%
                  </div>
                  {selectedHazard.pixelWidth ? (
                    <div className="text-slate-400">
                      Pixels: ({selectedHazard.pixelX}, {selectedHazard.pixelY}) · {selectedHazard.pixelWidth}×{selectedHazard.pixelHeight} px
                    </div>
                  ) : null}
                  {selectedHazard.dimensionsNote && (
                    <div className="text-amber-200/90 font-sans pt-0.5">{selectedHazard.dimensionsNote}</div>
                  )}
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 space-y-1">
                  <span className="text-[9px] text-amber-300 uppercase block">Traversal Relevance &amp; Avoidance</span>
                  <p className="text-[11px] font-sans text-slate-200">
                    {selectedHazard.traversalRelevance || selectedHazard.mobilityImpact}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] font-bold text-cyan-300 uppercase">
                    Detected Obstacles Queue ({filteredHazards.length})
                  </span>
                  <span className="text-[10px] text-slate-400">Click card to highlight</span>
                </div>
                {filteredHazards.length === 0 ? (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 font-sans text-xs">
                    {hasImage
                      ? `No ${riskFilter !== 'ALL' ? riskFilter.toLowerCase() + '-risk ' : ''}obstacles matched current filter.`
                      : 'Awaiting surface image.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredHazards.map(h => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setSelectedHazardId(h.id)}
                        className={`w-full text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border transition-all cursor-pointer space-y-1 ${
                          h.riskLevel === 'CRITICAL' || h.riskLevel === 'HIGH'
                            ? 'border-red-900/50 hover:border-red-500/60'
                            : h.riskLevel === 'MODERATE'
                              ? 'border-orange-900/50 hover:border-orange-500/60'
                              : 'border-yellow-900/50 hover:border-yellow-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white truncate">{h.label}</span>
                          {getRiskBadge(h.riskLevel)}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{h.sizeCategory?.replace('_', ' ') || h.classification}</span>
                          <span className="text-cyan-300">
                            {h.detectionMethod || 'CV Localizer'} · {(h.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-2.5 rounded-xl bg-amber-950/25 border border-amber-500/30 text-[10px] font-mono text-amber-200 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>Visual estimate only — calibrated depth/elevation data unavailable without stereo or HiRISE DEM.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SAFETY STATUS HEADER */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
              ASTRONAUT SAFETY &amp; OPERATIONAL LIMITS
            </span>
            <span className="text-xs text-slate-400 font-mono">{env.statusLabel}</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Integrated Planetary Hazard Assessment</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Honest multi-source safety audit: active-image obstacle &amp; roughness localization paired with verified environmental availability status.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shrink-0">
          <ShieldCheck
            className={`w-5 h-5 ${
              terrain.regolithTraversabilityIndex === null
                ? 'text-slate-400'
                : terrain.regolithTraversabilityIndex > 60
                  ? 'text-emerald-400'
                  : 'text-amber-400'
            }`}
          />
          <div className="font-mono text-xs">
            <span className="text-slate-400 block text-[9px] uppercase">Visual Traversability State</span>
            <strong
              className={`${
                terrain.regolithTraversabilityIndex === null
                  ? 'text-slate-300'
                  : terrain.regolithTraversabilityIndex > 60
                    ? 'text-emerald-400'
                    : 'text-amber-400'
              } font-bold text-sm`}
            >
              {terrain.regolithTraversabilityIndex === null
                ? 'AWAITING IMAGE'
                : terrain.regolithTraversabilityIndex > 70
                  ? 'NOMINAL (LOW)'
                  : terrain.regolithTraversabilityIndex > 40
                    ? 'CAUTION (MODERATE)'
                    : 'ALERT (HIGH)'}
            </strong>
          </div>
        </div>
      </div>

      {/* 3. SAFETY RISK COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-orange-400" />
              <span>Terrain Safety Audit</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">CV + Gemini Vision</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {terrainHazards.map((h, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{h.name}</span>
                  {getRiskBadge(h.risk)}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>
                    Val: <strong className="text-slate-200">{h.val}</strong>
                  </span>
                  <span>Limit: {h.limit}</span>
                </div>
                <div className="flex justify-end pt-1">{getNatureTag(h.nature)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              <span>Environmental Safety</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">In-Situ Sensor Status</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {environmentalHazards.map((h, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{h.name}</span>
                  {getRiskBadge(h.risk)}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>
                    Measured: <strong className="text-slate-200">{h.val}</strong>
                  </span>
                  <span>Range: {h.limit}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[8px] text-slate-500 uppercase">{h.instrument}</span>
                  {getNatureTag(h.nature)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Radiation &amp; Emergency</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Telemetry Audit</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {radiationHazards.map((h, i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{h.name}</span>
                  {getRiskBadge(h.risk)}
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>
                    Current: <strong className="text-slate-200">{h.val}</strong>
                  </span>
                  <span>{h.limit}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-[8px] text-slate-500 uppercase">{h.instrument}</span>
                  {getNatureTag(h.nature)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Return Margin Box */}
      <div
        className={`bg-slate-900/90 border rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs ${
          !route?.isComputable
            ? 'border-slate-800'
            : route.returnFeasible
              ? 'border-emerald-500/25'
              : 'border-rose-500/25'
        }`}
      >
        <div className="space-y-1">
          <span
            className={`text-[10px] uppercase font-bold block ${
              !route?.isComputable ? 'text-slate-400' : route.returnFeasible ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            Simulated Route Return Margin ({suitDetails.name})
          </span>
          <p className="text-slate-200 font-sans text-xs">
            {route?.isComputable && route.distanceM !== null ? (
              <>
                Simulated traverse length is <strong>{route.distanceM} m</strong> ({route.timeMins} mins estimated) with safety score{' '}
                <strong>{route.safetyScorePct}%</strong>.
              </>
            ) : (
              route?.unavailableReason || 'Route return feasibility unavailable — select or upload a terrain image first.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`p-2.5 rounded-xl border font-bold ${
              !route?.isComputable
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : route.returnFeasible
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {!route?.isComputable
              ? 'ROUTE UNAVAILABLE'
              : route.returnFeasible
                ? 'SIMULATED RETURN FEASIBLE'
                : 'RETURN MARGIN EXCEEDED'}
          </div>
        </div>
      </div>
    </div>
  );
};
