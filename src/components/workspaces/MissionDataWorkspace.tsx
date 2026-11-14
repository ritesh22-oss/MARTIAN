import React, { useState, useEffect } from 'react';
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
  Info,
  Loader2,
  AlertTriangle,
  Wind,
  Thermometer,
  Gauge,
  Sun
} from 'lucide-react';
import { NASA_DATA_SOURCES, MARS_REFERENCE_DATUM, JEZERO_SCIENCE_POIS, JEZERO_ENVIRONMENTAL_CONTEXT } from '../../utils/marsScienceData';
import { fetchMarsEnvironmentalData, MarsEnvironmentalDataPayload } from '../../services/nasaDataService';
import DatasetSection from '../DatasetSection';
import MethodologySection from '../MethodologySection';

export default function MissionDataWorkspace() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'pois' | 'environmental' | 'methodology'>('catalog');
  const [selectedPoi, setSelectedPoi] = useState(JEZERO_SCIENCE_POIS[0]);
  const [envData, setEnvData] = useState<MarsEnvironmentalDataPayload | null>(null);
  const [loadingEnv, setLoadingEnv] = useState<boolean>(false);
  const [envError, setEnvError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (activeTab === 'environmental' && !envData) {
      setLoadingEnv(true);
      fetchMarsEnvironmentalData()
        .then((data) => {
          if (isMounted) {
            setEnvData(data);
            setLoadingEnv(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setEnvError(err?.message || 'Failed to load environmental records.');
            setLoadingEnv(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [activeTab, envData]);

  const insightDataset = envData?.datasets?.insight;
  const insightObs = insightDataset?.data;
  const medaDataset = envData?.datasets?.meda;
  const remsDataset = envData?.datasets?.rems;
  const radDataset = envData?.datasets?.rad;

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

      {/* Tab 3: Scientific In-Situ Environmental Telemetry */}
      {activeTab === 'environmental' && (
        <div className="space-y-6">
          {/* Header Summary */}
          <div className="bg-[#090E1C] border border-slate-800 p-6 rounded-2xl">
            <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold">IN-SITU METEOROLOGY & ENVIRONMENTAL OBSERVATIONS</span>
                <h2 className="text-base font-bold text-white mt-0.5">NASA Surface Sensor Systems & PDS Archives</h2>
              </div>
              <div className="flex items-center gap-2">
                {loadingEnv ? (
                  <span className="flex items-center gap-1.5 text-xs text-cyan-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Synchronizing Telemetry...
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 text-[11px] font-semibold">
                    {insightObs?.status || 'PDS ARCHIVE CONNECTED'}
                  </span>
                )}
              </div>
            </div>

            {/* InSight Lander Weather Section (Active Verified NASA Endpoint) */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">InSight Lander Weather Archive (Elysium Planitia)</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Data Freshness: {insightObs?.dataFreshness || 'Archived In-Situ Observations (NASA PDS)'}
                </span>
              </div>

              {loadingEnv ? (
                <div className="p-8 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
                  <span>Retrieving NASA InSight raw sensor feed...</span>
                </div>
              ) : insightObs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-orange-400" /> Air Temp (TWINS)
                      </span>
                      <span className="text-[10px] text-cyan-400 font-bold">Sol {insightObs.sol}</span>
                    </div>
                    <div className="text-lg font-bold text-orange-400">
                      {insightObs.airTemperature?.averageC != null ? `${insightObs.airTemperature.averageC.toFixed(1)}°C` : 'DATA UNAVAILABLE'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Min: {insightObs.airTemperature?.minC != null ? `${insightObs.airTemperature.minC.toFixed(1)}°C` : 'N/A'} | Max: {insightObs.airTemperature?.maxC != null ? `${insightObs.airTemperature.maxC.toFixed(1)}°C` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-4 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-cyan-400" /> Atmos Pressure
                      </span>
                      <span className="text-[10px] text-slate-500">{insightObs.season || 'Mars Season'}</span>
                    </div>
                    <div className="text-lg font-bold text-cyan-400">
                      {insightObs.atmosphericPressure?.averagePa != null ? `${insightObs.atmosphericPressure.averagePa.toFixed(1)} Pa` : 'DATA UNAVAILABLE'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Range: {insightObs.atmosphericPressure?.minPa != null ? `${insightObs.atmosphericPressure.minPa.toFixed(1)}` : 'N/A'} - {insightObs.atmosphericPressure?.maxPa != null ? `${insightObs.atmosphericPressure.maxPa.toFixed(1)} Pa` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-4 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                        <Wind className="w-3 h-3 text-emerald-400" /> Wind Velocity
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">{insightObs.windDirection?.compassPoint || 'DIR N/A'}</span>
                    </div>
                    <div className="text-lg font-bold text-emerald-400">
                      {insightObs.horizontalWindSpeed?.averageMs != null ? `${insightObs.horizontalWindSpeed.averageMs.toFixed(1)} m/s` : 'DATA UNAVAILABLE'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Peak: {insightObs.horizontalWindSpeed?.maxMs != null ? `${insightObs.horizontalWindSpeed.maxMs.toFixed(1)} m/s` : 'N/A'}
                    </div>
                  </div>

                  <div className="p-4 bg-black/40 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                        <Sun className="w-3 h-3 text-amber-400" /> Observation UTC
                      </span>
                      <span className="text-[9px] text-slate-500">InSight Station</span>
                    </div>
                    <div className="text-xs font-mono text-slate-200 mt-1 truncate">
                      {insightObs.firstUtc ? new Date(insightObs.firstUtc).toLocaleDateString() : 'Historical Archive'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      UTC: {insightObs.firstUtc?.split('T')[0] || 'NASA PDS'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  InSight telemetry stream currently offline or unreachable.
                </div>
              )}
            </div>
          </div>

          {/* Mars 2020 Perseverance MEDA & MSL Curiosity REMS Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Perseverance MEDA */}
            <div className="bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-cyan-400 text-xs font-bold uppercase">Perseverance Rover (Jezero Crater)</div>
                  <h3 className="text-sm font-bold text-white mt-0.5">Mars Environmental Dynamics Analyzer (MEDA)</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                  DATA UNAVAILABLE (NO REALTIME STREAM)
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                NASA PDS archives MEDA raw instrument records in quarterly releases. No live real-time stream endpoint is published by JPL for active Sols.
              </p>
              <div className="p-3 bg-black/40 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">PDS Calibrated Reference Baseline (Sols 0–450)</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Air Temp Mean:</span>
                    <span className="text-slate-200 font-bold">-55.0°C (ATS)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Surface Temp Range:</span>
                    <span className="text-slate-200 font-bold">-84.1°C to +8.5°C (TIR)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Atmospheric Pressure:</span>
                    <span className="text-slate-200 font-bold">~742 Pa (PS)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Dust Optical Depth:</span>
                    <span className="text-slate-200 font-bold">0.42 Tau (RDS)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MSL Curiosity REMS & RAD */}
            <div className="bg-[#090E1C] border border-slate-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-cyan-400 text-xs font-bold uppercase">Curiosity Rover (Gale Crater)</div>
                  <h3 className="text-sm font-bold text-white mt-0.5">Rover Environmental Monitoring Station (REMS) & RAD</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                  DATA UNAVAILABLE (NO REALTIME STREAM)
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                REMS environmental records and RAD radiation dosimetry are accessible via the NASA PDS Atmospheres Node following peer calibration.
              </p>
              <div className="p-3 bg-black/40 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">PDS Calibrated Reference Baseline (Gale Crater)</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Diurnal Temp Cycle:</span>
                    <span className="text-slate-200 font-bold">-75°C to 0°C (REMS)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mean Surface Pressure:</span>
                    <span className="text-slate-200 font-bold">850 Pa (REMS)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Galactic Cosmic Radiation:</span>
                    <span className="text-slate-200 font-bold">0.64 mGy/day (RAD)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Cumulative Surface Dose:</span>
                    <span className="text-slate-200 font-bold">~0.21 Sv/yr (RAD)</span>
                  </div>
                </div>
              </div>
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
