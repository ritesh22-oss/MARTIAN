import React, { useState } from 'react';
import { ShieldAlert, Compass, AlertTriangle, Sliders, CheckCircle2 } from 'lucide-react';
import { getMartianElevation, calculateLocalSlope } from '../utils/marsScienceData';

export default function HazardAnalysisLab() {
  const [sampleX, setSampleX] = useState(12);
  const [sampleZ, setSampleZ] = useState(-15);
  const [maxSlopeLimit, setMaxSlopeLimit] = useState(14); // 14 deg safe max for rocker-bogie

  const elevationData = getMartianElevation(sampleX, sampleZ);
  const slopeDeg = calculateLocalSlope(sampleX, sampleZ);
  const isHazardous = slopeDeg > maxSlopeLimit || elevationData.localRelY < -12;

  // Hazard zones in Jezero Crater
  const hazardZones = [
    { id: 'zone-1', name: 'South Séítah Megaripples', x: -4, z: -14, type: 'Loose Sand / Wheel Trenching Risk', slope: 8.2, risk: 'Moderate' },
    { id: 'zone-2', name: 'Belva Crater Slump Wall', x: 24, z: -26, type: 'Steep Escarpment & Loose Scree', slope: 22.4, risk: 'Critical' },
    { id: 'zone-3', name: 'Western Delta Scarp', x: -25, z: 32, type: 'Bouldery Outcrop & Layered Cliffs', slope: 16.8, risk: 'High' },
    { id: 'zone-4', name: 'Collapse Pit Margin', x: -24, z: 18, type: 'Depression / Subsurface Void Risk', slope: 11.5, risk: 'Moderate' }
  ];

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Workbench Header */}
      <div className="bg-[#0A0E1C] border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="text-amber-400 font-semibold">Traversability Pipeline</span>
            <span aria-hidden="true">·</span>
            <span>Local Slope & Sinkage Modeling</span>
            <span aria-hidden="true">·</span>
            <span>Jezero Crater DTM</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Slope, Obstacle, and Sinkage Hazard Laboratory
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
            Evaluate topographical gradients, rock distributions, regolith sinkage risks, and traverse cost penalties using deterministic elevation calculations.
          </p>
        </div>
      </div>

      {/* Main Grid: Inspector & Hazard Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Coordinate Inspector & Cost Parameters */}
        <div className="lg:col-span-6 bg-[#090D1A] border border-slate-800/80 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-orange-400" />
              <span>Point Sample Slope & Elevation Inspector</span>
            </h3>
            <span className="text-xs text-cyan-400 font-mono">Jezero Grid System</span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Sample X Coordinate: <span className="text-slate-200 font-mono font-bold">{sampleX} m</span>
                </label>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={sampleX}
                  onChange={(e) => setSampleX(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Sample Z Coordinate: <span className="text-slate-200 font-mono font-bold">{sampleZ} m</span>
                </label>
                <input
                  type="range"
                  min="-80"
                  max="80"
                  value={sampleZ}
                  onChange={(e) => setSampleZ(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Max Safe Slope Threshold: <span className="text-cyan-300 font-mono font-bold">{maxSlopeLimit}°</span>
              </label>
              <input
                type="range"
                min="5"
                max="25"
                value={maxSlopeLimit}
                onChange={(e) => setMaxSlopeLimit(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Readout Summary */}
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Local Relative Elevation:</span>
                <span className="text-white font-mono font-bold">{elevationData.localRelY.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">MOLA Absolute Datum:</span>
                <span className="text-orange-400 font-mono font-bold">{elevationData.molaElevationM} m</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Calculated Local Slope:</span>
                <span className={`font-mono font-bold ${slopeDeg > maxSlopeLimit ? 'text-red-400' : 'text-emerald-400'}`}>
                  {slopeDeg}°
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Traversability Assessment:</span>
                <span className={`font-medium ${isHazardous ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isHazardous ? 'Hazardous / Unsafe' : 'Nominal / Safe for Rocker-Bogie'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Catalogued Jezero Hazard Zones */}
        <div className="lg:col-span-6 bg-[#090D1A] border border-slate-800/80 p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Catalogued Jezero Crater Hazard Zones</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">4 Regions Mapped</span>
          </div>

          <div className="space-y-2.5">
            {hazardZones.map((zone) => (
              <div key={zone.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">{zone.name}</span>
                  <span className={`text-[11px] font-mono font-medium ${
                    zone.risk === 'Critical' ? 'text-red-400' :
                    zone.risk === 'High' ? 'text-orange-400' :
                    'text-amber-400'
                  }`}>
                    {zone.risk} Risk
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">{zone.type}</div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
                  <span>Slope: <strong className="text-slate-200">{zone.slope}°</strong></span>
                  <span>Grid: X: {zone.x}, Z: {zone.z}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
