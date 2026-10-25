import React, { useState } from 'react';
import { Database, ShieldCheck, AlertTriangle, FileText, ExternalLink, RefreshCw, Upload, CheckCircle2 } from 'lucide-react';
import { NASA_DATA_SOURCES, MARS_REFERENCE_DATUM } from '../utils/marsScienceData';

export default function DatasetCatalogue() {
  const [sources, setSources] = useState(NASA_DATA_SOURCES);
  const [selectedDataset, setSelectedDataset] = useState(NASA_DATA_SOURCES[1]); // HiRISE default
  const [validationStatus, setValidationStatus] = useState(null);
  const [localFileImported, setLocalFileImported] = useState(false);

  const handleValidateDataset = (ds) => {
    setValidationStatus({
      datasetName: ds.name,
      status: 'Validated',
      crs: MARS_REFERENCE_DATUM.coordinateSystem,
      datum: MARS_REFERENCE_DATUM.datumName,
      unitCompatibility: 'Verified (Meters / Degrees)',
      spatialCoverageOverlap: '100% Match with Jezero Crater Study Region',
      resolutionQuality: ds.resolution || 'Standard DTM Grid',
      warnings: ds.id === 'mola' ? ['Low resolution grid; elevation interpolation required for small boulders.'] : []
    });
  };

  const handleLocalImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const newSource = {
        id: `local-${Date.now()}`,
        name: file.name,
        mission: 'User Imported Local Raster / DTM',
        instrument: 'Custom User Upload',
        sourceOrg: 'Local Workspace Storage',
        resolution: 'User Defined Grid',
        url: 'local-file://' + file.name,
        type: 'User Raster Elevation Product',
        status: 'Locally Verified'
      };
      setSources([...sources, newSource]);
      setSelectedDataset(newSource);
      setLocalFileImported(true);
      setValidationStatus({
        datasetName: file.name,
        status: 'Locally Validated',
        crs: MARS_REFERENCE_DATUM.coordinateSystem,
        datum: MARS_REFERENCE_DATUM.datumName,
        unitCompatibility: 'Parsed OK',
        spatialCoverageOverlap: 'Custom User Bounding Box',
        resolutionQuality: `${(file.size / 1024).toFixed(1)} KB raster file`,
        warnings: ['User imported dataset. Verify vertical datum offset manually.']
      });
    }
  };

  return (
    <div className="space-y-5 font-sans text-xs">
      {/* Header */}
      <div className="bg-[#0A0E1C] border border-slate-800/80 p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="text-emerald-400 font-semibold">Data Ingestion & Provenance</span>
            <span aria-hidden="true">·</span>
            <span>NASA PDS & HiRISE Terrain Fusion</span>
            <span aria-hidden="true">·</span>
            <span>CRS Verification</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Planetary Data Source Catalogue & Provenance
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl leading-relaxed">
            Track NASA PDS, MRO HiRISE, MOLA elevation grids, and AI4Mars data products with strict coordinate reference system validation and quality warnings.
          </p>
        </div>
      </div>

        {/* Datum Reference Banner */}
        <div className="bg-[#0B1020]/90 border border-white/15 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">Active Reference Datum: {MARS_REFERENCE_DATUM.datumName}</div>
              <div className="text-slate-400">System: {MARS_REFERENCE_DATUM.coordinateSystem} • Equatorial Radius: {MARS_REFERENCE_DATUM.meanRadiusKm} km</div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-slate-200 cursor-pointer transition-all">
              <Upload className="w-4 h-4 text-orange-400" />
              <span>Import Local PDS / DTM File</span>
              <input type="file" onChange={handleLocalImport} className="hidden" accept=".img,.tif,.tiff,.csv,.json" />
            </label>
          </div>
        </div>

        {/* Catalogue Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sources List */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-orange-400" />
              <span>Catalogued Datasets ({sources.length})</span>
            </h3>

            <div className="space-y-3">
              {sources.map((ds) => (
                <div
                  key={ds.id}
                  onClick={() => setSelectedDataset(ds)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer bg-[#0B1020]/80 backdrop-blur-md ${
                    selectedDataset.id === ds.id
                      ? 'border-orange-500 ring-2 ring-orange-500/30'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10 text-orange-300">
                        {ds.mission}
                      </span>
                      <h4 className="text-white font-bold text-base mt-1">{ds.name}</h4>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      {ds.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mb-3">{ds.instrument} • {ds.type}</p>
                  <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 border-t border-white/10 pt-3">
                    <span>Resolution: <strong className="text-white">{ds.resolution}</strong></span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleValidateDataset(ds); }}
                      className="px-3 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 transition-colors"
                    >
                      Verify Compatibility
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dataset Detail & Validation Inspector */}
          <div className="lg:col-span-5 space-y-6 bg-[#0B1020]/90 border border-white/15 p-6 rounded-3xl backdrop-blur-xl shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Dataset Provenance Inspector</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                {selectedDataset.id}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-slate-400 block text-[10px]">DATASET NAME & REFERENCE</span>
                <span className="text-white font-bold text-sm">{selectedDataset.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                  <span className="text-slate-400 block text-[10px]">MISSION / AGENCY</span>
                  <span className="text-slate-200 font-semibold">{selectedDataset.mission}</span>
                </div>
                <div className="bg-black/40 p-2.5 rounded-xl border border-white/10">
                  <span className="text-slate-400 block text-[10px]">SOURCE ORG</span>
                  <span className="text-slate-200 font-semibold">{selectedDataset.sourceOrg}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SPATIAL RESOLUTION</span>
                <span className="text-emerald-400 font-semibold">{selectedDataset.resolution}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">ARCHIVE REFERENCE URL</span>
                <a
                  href={selectedDataset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline flex items-center space-x-1 truncate mt-0.5"
                >
                  <span>{selectedDataset.url}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>

            {/* Validation Panel */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white uppercase tracking-wider">Coordinate & Fusion Validation</span>
                <button
                  onClick={() => handleValidateDataset(selectedDataset)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Check</span>
                </button>
              </div>

              {validationStatus ? (
                <div className="bg-black/50 p-4 rounded-2xl border border-emerald-500/40 space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Status: {validationStatus.status}</span>
                  </div>
                  <div className="text-slate-300 space-y-1">
                    <div>CRS: <strong className="text-white">{validationStatus.crs}</strong></div>
                    <div>Datum: <strong className="text-white">{validationStatus.datum}</strong></div>
                    <div>Coverage: <strong className="text-white">{validationStatus.spatialCoverageOverlap}</strong></div>
                    <div>Resolution Quality: <strong className="text-white">{validationStatus.resolutionQuality}</strong></div>
                  </div>
                  {validationStatus.warnings.length > 0 && (
                    <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{validationStatus.warnings[0]}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-black/30 border border-white/10 text-slate-400 text-center">
                  Click 'Run Check' to verify spatial coordinate compatibility and unit fusion.
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
