import React, { useState } from 'react';
import {
  Layers,
  Database,
  ExternalLink,
  ShieldCheck,
  Compass,
  FileText,
  MapPin,
  CheckCircle2,
  Sliders,
  Info
} from 'lucide-react';
import { NASA_DATA_SOURCES, MARS_REFERENCE_DATUM, JEZERO_SCIENCE_POIS, JEZERO_ENVIRONMENTAL_CONTEXT } from '../../utils/marsScienceData';
import DatasetSection from '../DatasetSection';
import MethodologySection from '../MethodologySection';

export default function MissionDataWorkspace() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'pois' | 'environmental' | 'methodology'>('catalog');
  const [selectedPoi, setSelectedPoi] = useState(JEZERO_SCIENCE_POIS[0]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-mono text-xs">
      {/* Workspace Header */}
      <div className="bg-[#0B1020] border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-cyan-400 uppercase tracking-widest font-bold mb-1">
            <Layers className="w-4 h-4" />
            <span>DATA PROVENANCE & SCIENCE ARCHIVE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans tracking-tight">
            NASA Planetary Data System & Mission Catalog
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Verified MGS MOLA topographic grids, MRO HiRISE orthorectified terrain models, and Mars 2020 MEDA in-situ meteorology.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'catalog' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Data Sources ({NASA_DATA_SOURCES.length})
          </button>
          <button
            onClick={() => setActiveTab('pois')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'pois' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Science POIs ({JEZERO_SCIENCE_POIS.length})
          </button>
          <button
            onClick={() => setActiveTab('environmental')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'environmental' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            MEDA In-Situ Data
          </button>
          <button
            onClick={() => setActiveTab('methodology')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'methodology' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Methodology
          </button>
        </div>
      </div>

      {/* Tab 1: NASA Data Sources Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {NASA_DATA_SOURCES.map((source) => (
              <div
                key={source.id}
                className="bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px] uppercase border border-cyan-500/30">
                      {source.status}
                    </span>
                    <span className="text-[10px] text-slate-400">{source.type}</span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">{source.name}</h3>
                    <div className="text-cyan-400 text-xs mt-0.5">{source.mission}</div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Instrument:</span>
                      <span className="text-slate-200 truncate max-w-[140px]">{source.instrument}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Resolution:</span>
                      <span className="text-emerald-400 font-bold">{source.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Organization:</span>
                      <span className="text-slate-300">{source.sourceOrg}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <span>NASA PDS Catalog Record</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>

          <DatasetSection />
        </div>
      )}

      {/* Tab 2: Science Points of Interest (POIs) */}
      {activeTab === 'pois' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold block">
              Jezero Science Waypoints
            </span>
            <div className="space-y-2">
              {JEZERO_SCIENCE_POIS.map((poi) => (
                <div
                  key={poi.id}
                  onClick={() => setSelectedPoi(poi)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedPoi.id === poi.id
                      ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg'
                      : 'bg-[#090E1C] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-xs">{poi.name}</span>
                    <span className="text-[10px] text-orange-400 font-mono">Elev: {poi.elevationM}m</span>
                  </div>
                  <div className="text-[11px] text-slate-400">{poi.category}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center space-x-3">
                    <span>Lat: {poi.lat}</span>
                    <span>Lon: {poi.lon}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#090E1C] border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">POI Detail Inspector</span>
                <h2 className="text-base font-bold text-white mt-0.5">{selectedPoi.name}</h2>
              </div>
              <span className="px-2 py-1 rounded bg-black/50 text-orange-400 border border-slate-700 text-xs">
                Grid: X:{selectedPoi.x}, Z:{selectedPoi.z}
              </span>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="p-3 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">GEOLOGICAL CLASSIFICATION</span>
                <p className="text-white font-bold">{selectedPoi.category}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">MOLA Absolute Elevation</span>
                  <span className="text-cyan-400 font-bold text-sm">{selectedPoi.elevationM} meters</span>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Coordinates</span>
                  <span className="text-emerald-400 font-bold text-sm">{selectedPoi.lat}, {selectedPoi.lon}</span>
                </div>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed">
                Formed during the late Noachian to early Hesperian period (~3.8 to 4.0 billion years ago) when an ancient river flowed into Lake Jezero, depositing stratified sediment fans with preserved clay minerals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: MEDA Environmental Data */}
      {activeTab === 'environmental' && (
        <div className="bg-[#090E1C] border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-orange-400 uppercase tracking-wider font-bold">METEOROLOGICAL SENSORS</span>
              <h2 className="text-base font-bold text-white mt-0.5">Mars Environmental Dynamics Analyzer (MEDA)</h2>
            </div>
            <span className="text-xs text-slate-400">{JEZERO_ENVIRONMENTAL_CONTEXT.solRange}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-black/40 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Air Temperature</span>
              <div className="text-lg font-bold text-orange-400">{JEZERO_ENVIRONMENTAL_CONTEXT.airTemperature.currentSimulated}°C</div>
              <div className="text-[10px] text-slate-400">Range: {JEZERO_ENVIRONMENTAL_CONTEXT.airTemperature.min}°C to {JEZERO_ENVIRONMENTAL_CONTEXT.airTemperature.max}°C</div>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Ground Surface Temp</span>
              <div className="text-lg font-bold text-amber-400">{JEZERO_ENVIRONMENTAL_CONTEXT.groundTemperature.currentSimulated}°C</div>
              <div className="text-[10px] text-slate-400">TIR Sensor (Thermal Infrared)</div>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Atmospheric Pressure</span>
              <div className="text-lg font-bold text-cyan-400">{JEZERO_ENVIRONMENTAL_CONTEXT.atmosphericPressure.currentSimulated} Pa</div>
              <div className="text-[10px] text-slate-400">Mean: {JEZERO_ENVIRONMENTAL_CONTEXT.atmosphericPressure.mean} Pa</div>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Dust Opacity (Tau)</span>
              <div className="text-lg font-bold text-emerald-400">{JEZERO_ENVIRONMENTAL_CONTEXT.dustOpticalDepth.tau}</div>
              <div className="text-[10px] text-slate-400">{JEZERO_ENVIRONMENTAL_CONTEXT.dustOpticalDepth.status}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Methodology Section */}
      {activeTab === 'methodology' && (
        <div className="space-y-4">
          <MethodologySection />
        </div>
      )}
    </div>
  );
}
