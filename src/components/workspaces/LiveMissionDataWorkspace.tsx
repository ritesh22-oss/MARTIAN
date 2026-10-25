import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  fetchMarsRawImages,
  fetchHiRISEProducts,
  fetchSourcesHealth,
  MarsRawImage,
  HiRISEProduct,
  DataSourceHealth
} from '../../services/nasaDataService';

export const LiveMissionDataWorkspace: React.FC = () => {
  const {
    setActiveWorkspace,
    selectedObservation,
    setSelectedObservation,
    setActiveTerrainSource,
    addAnalysisRecord
  } = useWorkspace();

  // Active sub-tab: 'surface' (Rover Raw Images) | 'orbital' (HiRISE DTM Products)
  const [activeTab, setActiveTab] = useState<'surface' | 'orbital'>('surface');

  // Surface feed state
  const [surfaceImages, setSurfaceImages] = useState<MarsRawImage[]>([]);
  const [surfaceLoading, setSurfaceLoading] = useState<boolean>(true);
  const [surfaceError, setSurfaceError] = useState<string | null>(null);
  const [cameraFilter, setCameraFilter] = useState<string>('all');
  const [solInput, setSolInput] = useState<string>('latest');
  const [appliedSol, setAppliedSol] = useState<string>('latest');
  const [missionSelect, setMissionSelect] = useState<'mars2020' | 'msl'>('mars2020');
  const [page, setPage] = useState<number>(0);
  const [totalImages, setTotalImages] = useState<number>(0);

  // HiRISE DTM state
  const [hiriseProducts, setHiriseProducts] = useState<HiRISEProduct[]>([]);
  const [selectedHiRISE, setSelectedHiRISE] = useState<HiRISEProduct | null>(null);

  // Sources health state
  const [sourcesHealth, setSourcesHealth] = useState<DataSourceHealth[]>([]);
  const [healthChecking, setHealthChecking] = useState<boolean>(false);

  // Auto-refresh config
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = off, 30, 60, 300
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [nextSyncSeconds, setNextSyncSeconds] = useState<number>(0);

  // Detail modal state
  const [activeDetailModal, setActiveDetailModal] = useState<MarsRawImage | null>(null);

  // Load health
  const refreshHealth = useCallback(async () => {
    setHealthChecking(true);
    try {
      const data = await fetchSourcesHealth();
      setSourcesHealth(data.sources || []);
    } catch {
      // Keep previous
    } finally {
      setHealthChecking(false);
    }
  }, []);

  // Load surface observations
  const loadSurfaceObservations = useCallback(async (isRefresh = false) => {
    setSurfaceLoading(true);
    setSurfaceError(null);
    try {
      const solParam = appliedSol === 'latest' ? undefined : parseInt(appliedSol, 10);
      const res = await fetchMarsRawImages({
        sol: isNaN(solParam as number) ? undefined : solParam,
        camera: cameraFilter,
        page: page,
        limit: 24
      });

      setSurfaceImages(res.images || []);
      setTotalImages(res.totalResults || 0);
      setLastSyncTime(new Date());

      // If no selected observation yet, pre-select the first one
      if (!selectedObservation && res.images && res.images.length > 0) {
        setSelectedObservation(res.images[0]);
      }
    } catch (err: any) {
      setSurfaceError(err.message || 'Failed to connect to NASA JPL raw observation catalog.');
    } finally {
      setSurfaceLoading(false);
    }
  }, [appliedSol, cameraFilter, page, selectedObservation, setSelectedObservation]);

  // Load orbital products
  const loadOrbitalProducts = useCallback(async () => {
    try {
      const res = await fetchHiRISEProducts();
      setHiriseProducts(res.products || []);
      if (res.products && res.products.length > 0 && !selectedHiRISE) {
        setSelectedHiRISE(res.products[0]);
      }
    } catch {
      // Keep static
    }
  }, [selectedHiRISE]);

  // Initial load
  useEffect(() => {
    refreshHealth();
    loadSurfaceObservations();
    loadOrbitalProducts();
  }, [refreshHealth, loadSurfaceObservations, loadOrbitalProducts]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) {
      setNextSyncSeconds(0);
      return;
    }

    setNextSyncSeconds(autoRefreshInterval);
    const intervalTimer = setInterval(() => {
      setNextSyncSeconds(prev => {
        if (prev <= 1) {
          loadSurfaceObservations(true);
          refreshHealth();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [autoRefreshInterval, loadSurfaceObservations, refreshHealth]);

  const handleApplySol = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setAppliedSol(solInput.trim().toLowerCase());
  };

  const handleSendToAI4MARS = (image: MarsRawImage) => {
    setSelectedObservation(image);
    addAnalysisRecord({
      timestamp: new Date().toISOString(),
      type: 'Observation Dispatched to AI4MARS',
      status: 'In Progress',
      details: `${image.title} (Sol ${image.sol}, ${image.camera}) queued for terrain segmentation.`
    });
    setActiveWorkspace('terrain-intelligence');
  };

  const handleLoadHiRISEInto3D = (product: HiRISEProduct) => {
    if (product.id.includes('jezero') || product.observationId.includes('001414')) {
      setActiveTerrainSource('hirise-jezero');
    } else if (product.id.includes('belva') || product.observationId.includes('037166')) {
      setActiveTerrainSource('hirise-belva');
    } else {
      setActiveTerrainSource('custom');
    }

    addAnalysisRecord({
      timestamp: new Date().toISOString(),
      type: 'Orbital DTM Mounted to 3D Explorer',
      status: 'Completed',
      details: `${product.title} (${product.observationId}) active at ${product.spatialResolution}.`
    });
    setActiveWorkspace('explorer-3d');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#070b12] text-slate-200 overflow-y-auto">
      {/* Workspace Header */}
      <div className="border-b border-slate-800 bg-[#0b111e]/90 backdrop-blur-md px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                NASA LIVE MISSION STREAM
              </span>
              <span className="text-xs font-mono text-slate-500">
                PDS/JPL CATALOG REF: 2026-M2020-RAW
              </span>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-3">
              Planetary Observation &amp; Orbital Terrain Products
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
              Live ingest of verified raw engineering and science frames from NASA Mars 2020 Perseverance and MSL Curiosity, integrated with NASA Planetary Data System (PDS) HiRISE Digital Terrain Models.
            </p>
          </div>

          {/* Sync & Refresh Toolbar */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Auto-Refresh Select */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">AUTO-SYNC:</span>
              <select
                aria-label="Auto-sync interval"
                value={autoRefreshInterval}
                onChange={e => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-slate-900 text-slate-300">Off</option>
                <option value={30} className="bg-slate-900 text-slate-300">30s</option>
                <option value={60} className="bg-slate-900 text-slate-300">60s</option>
                <option value={300} className="bg-slate-900 text-slate-300">5 min</option>
              </select>
              {autoRefreshInterval > 0 && (
                <span className="text-amber-400 font-mono text-[10px] ml-1">
                  ({nextSyncSeconds}s)
                </span>
              )}
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={() => {
                loadSurfaceObservations(true);
                refreshHealth();
              }}
              disabled={surfaceLoading || healthChecking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
              title="Query NASA JPL for freshest raw images"
            >
              <svg className={`w-3.5 h-3.5 ${surfaceLoading ? 'animate-spin text-amber-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {surfaceLoading ? 'Fetching Live...' : 'Sync NASA Feed'}
            </button>

            {/* AI4MARS Quick Link */}
            <button
              onClick={() => setActiveWorkspace('terrain-intelligence')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600/90 hover:bg-amber-500 text-slate-950 font-semibold text-xs transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              AI4MARS Pipeline
            </button>
          </div>
        </div>

        {/* Real-time Sources Health Status Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              AUTHORITATIVE SOURCES STATUS:
            </span>
            {sourcesHealth.map((src, i) => (
              <div key={i} className="flex items-center gap-1.5 font-mono text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    src.status === 'connected'
                      ? 'bg-emerald-400'
                      : src.status === 'degraded'
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-slate-300">{src.sourceName}:</span>
                <span className={src.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>
                  {src.status.toUpperCase()}
                  {src.latencyMs !== null && ` (${src.latencyMs}ms)`}
                </span>
              </div>
            ))}
            {sourcesHealth.length === 0 && (
              <span className="text-slate-500 font-mono text-[11px]">Pinging NASA endpoints...</span>
            )}
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Last Synced: <span className="text-slate-300">{lastSyncTime.toLocaleTimeString()} UTC</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 space-y-6">
        {/* Navigation Tabs (Surface vs Orbital) */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab('surface')}
            className={`px-4 py-2.5 font-mono text-xs font-semibold tracking-wide border-b-2 flex items-center gap-2 transition ${
              activeTab === 'surface'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            SURFACE ROVER RAW OBSERVATIONS ({totalImages.toLocaleString()} IN NASA CATALOG)
          </button>
          <button
            onClick={() => setActiveTab('orbital')}
            className={`px-4 py-2.5 font-mono text-xs font-semibold tracking-wide border-b-2 flex items-center gap-2 transition ${
              activeTab === 'orbital'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            NASA PDS ORBITAL DTMs &amp; ELEVATION MODELS ({hiriseProducts.length})
          </button>
        </div>

        {/* TAB 1: SURFACE OBSERVATIONS */}
        {activeTab === 'surface' && (
          <div className="space-y-5">
            {/* Filter Bar */}
            <div className="bg-[#0e1626] border border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Mission Select */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">TARGET MISSION</label>
                  <select
                    aria-label="Target Mission"
                    value={missionSelect}
                    onChange={e => setMissionSelect(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                  >
                    <option value="mars2020">Perseverance (Mars 2020) - Jezero Crater</option>
                    <option value="msl">Curiosity (MSL) - Gale Crater</option>
                  </select>
                </div>

                {/* Camera / Instrument Filter */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1">INSTRUMENT / CAMERA</label>
                  <select
                    aria-label="Instrument / Camera"
                    value={cameraFilter}
                    onChange={e => {
                      setCameraFilter(e.target.value);
                      setPage(0);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                  >
                    <option value="all">All Available Instruments</option>
                    <option value="NAVCAM_LEFT">Navigation Camera Left (NavCam)</option>
                    <option value="NAVCAM_RIGHT">Navigation Camera Right (NavCam)</option>
                    <option value="MCZ_RIGHT">Mastcam-Z Right (Stereo Multi-spectral)</option>
                    <option value="MCZ_LEFT">Mastcam-Z Left</option>
                    <option value="FRONT_HAZCAM_LEFT_A">Front HazCam Left</option>
                    <option value="FRONT_HAZCAM_RIGHT_A">Front HazCam Right</option>
                    <option value="REAR_HAZCAM_LEFT">Rear HazCam Left</option>
                    <option value="SUPERCAM_RMI">SuperCam Remote Micro-Imager (RMI)</option>
                    <option value="SHERLOC_WATSON">SHERLOC WATSON (Close-up Hand Lens)</option>
                  </select>
                </div>

                {/* Sol Filter Form */}
                <form onSubmit={handleApplySol} className="flex items-end gap-1.5">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">MARTIAN SOL</label>
                    <input
                      type="text"
                      placeholder="latest or sol #"
                      value={solInput}
                      onChange={e => setSolInput(e.target.value)}
                      className="w-28 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
                  >
                    Filter
                  </button>
                </form>
              </div>

              {/* Sol Presets & Pagination */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">Quick Sol:</span>
                {['latest', '2019', '1400', '1042', '500'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => {
                      setSolInput(preset);
                      setAppliedSol(preset);
                      setPage(0);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition ${
                      appliedSol === preset
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {preset === 'latest' ? 'LATEST' : `Sol ${preset}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Banner */}
            {surfaceError && (
              <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{surfaceError}</span>
                </div>
                <button
                  onClick={() => loadSurfaceObservations(true)}
                  className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-100 font-mono text-xs"
                >
                  Retry Query
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {surfaceLoading && surfaceImages.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center border border-slate-800/80 rounded-lg bg-[#0e1626]">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
                <div className="text-sm font-medium text-slate-300 font-mono">Querying NASA JPL Mars 2020 Raw Feed...</div>
                <div className="text-xs text-slate-500 mt-1">Fetching genuine observation catalog from mars.nasa.gov</div>
              </div>
            )}

            {/* Image Observation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {surfaceImages.map(img => {
                const isSelected = selectedObservation?.id === img.id;
                const isNavCam = img.camera.includes('NAV');
                return (
                  <div
                    key={img.id}
                    className={`group bg-[#0b121e] border rounded-lg overflow-hidden flex flex-col transition hover:border-slate-600 ${
                      isSelected
                        ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50'
                        : 'border-slate-800'
                    }`}
                  >
                    {/* Thumbnail Container */}
                    <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
                      <img
                        src={img.thumbnailUrl}
                        alt={img.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        onError={(e) => {
                          // Fallback placeholder with honest label
                          (e.currentTarget as HTMLImageElement).src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="225" viewBox="0 0 300 225"><rect width="100%" height="100%" fill="%230f172a"/><text x="50%" y="50%" fill="%2364748b" font-family="monospace" font-size="12" text-anchor="middle">Thumbnail Stored on NASA PDS</text></svg>';
                        }}
                      />

                      {/* Overlaid Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/80 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                          SOL {img.sol}
                        </span>
                        {isNavCam && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm" title="Ideal for AI4MARS surface traversal evaluation">
                            NAVCAM STEREO
                          </span>
                        )}
                      </div>

                      {img.isStale && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900/90 text-slate-400 border border-slate-700">
                          CACHED
                        </div>
                      )}
                    </div>

                    {/* Meta & Info Body */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                          <span className="text-amber-400 font-semibold truncate max-w-[170px]" title={img.cameraFullName}>
                            {img.camera}
                          </span>
                          <span>{img.dateMars}</span>
                        </div>
                        <h4 className="text-xs font-medium text-slate-200 line-clamp-2 mb-2 leading-relaxed" title={img.title}>
                          {img.title}
                        </h4>
                        <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                          <div className="flex justify-between">
                            <span>UTC:</span>
                            <span className="text-slate-300">{new Date(img.dateUtc).toLocaleDateString()} {new Date(img.dateUtc).toLocaleTimeString()}</span>
                          </div>
                          {img.extended?.mastAz && (
                            <div className="flex justify-between">
                              <span>Az / El:</span>
                              <span className="text-slate-300">{parseFloat(img.extended.mastAz).toFixed(1)}° / {parseFloat(img.extended?.mastEl || '0').toFixed(1)}°</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Group */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => setActiveDetailModal(img)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition"
                        >
                          Inspect
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedObservation(img);
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
                              isSelected
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {isSelected ? 'Active' : 'Select'}
                          </button>

                          <button
                            onClick={() => handleSendToAI4MARS(img)}
                            title="Feed this real rover observation into AI4MARS terrain segmentation"
                            className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-[11px] font-mono transition"
                          >
                            AI4MARS &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="bg-[#0e1626] border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-400">
                Displaying {surfaceImages.length} observations (Page {page + 1})
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0 || surfaceLoading}
                  onClick={() => {
                    setPage(p => Math.max(0, p - 1));
                  }}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono disabled:opacity-40 transition"
                >
                  &larr; Previous Page
                </button>
                <button
                  disabled={surfaceImages.length < 24 || surfaceLoading}
                  onClick={() => {
                    setPage(p => p + 1);
                  }}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono disabled:opacity-40 transition"
                >
                  Next Page &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORBITAL ELEVATION PRODUCTS & DTMs */}
        {activeTab === 'orbital' && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-xs text-slate-300 flex items-start gap-3">
              <svg className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <span className="font-semibold text-cyan-300 block mb-0.5">Planetary Data System (PDS) HiRISE Digital Terrain Elevation Standard</span>
                These DTM products are photogrammetrically stereo-derived by the University of Arizona and USGS Astrogeology Science Center. Elevations are calibrated against the Mars Orbiter Laser Altimeter (MOLA) Areoid reference datum. Selecting a DTM binds its real topographic matrix to the MARSNAV 3D Explorer.
              </div>
            </div>

            {/* DTM Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hiriseProducts.map(product => {
                const isSelected = selectedHiRISE?.id === product.id;
                return (
                  <div
                    key={product.id}
                    className={`bg-[#0b121e] border rounded-lg overflow-hidden flex flex-col justify-between transition hover:border-slate-600 ${
                      isSelected ? 'border-cyan-500 ring-1 ring-cyan-500/40' : 'border-slate-800'
                    }`}
                  >
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                          {product.productType}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          Res: <span className="text-slate-200">{product.spatialResolution}</span>
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-white">
                        {product.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {product.description}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/60 p-2.5 rounded border border-slate-800">
                        <div>
                          <span className="text-slate-400 block text-[10px]">PDS OBS ID</span>
                          <span className="text-cyan-400 font-semibold">{product.observationId}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">COORDINATES</span>
                          <span className="text-slate-300">{product.centerLatitude.toFixed(2)}°N, {product.centerLongitude.toFixed(2)}°E</span>
                        </div>
                        {product.elevationMinM !== undefined && (
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px]">MOLA ELEVATION RANGE</span>
                            <span className="text-emerald-400 font-semibold">
                              {product.elevationMinM.toFixed(1)} m to {product.elevationMaxM?.toFixed(1)} m (Δ {((product.elevationMaxM || 0) - product.elevationMinM).toFixed(1)}m)
                            </span>
                          </div>
                        )}
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[10px]">DATUM &amp; PROVENANCE</span>
                          <span className="text-slate-400">{product.datum} • {product.provenance}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex items-center justify-between gap-2">
                      <a
                        href={product.pdsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        NASA PDS Archive Record
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>

                      <button
                        onClick={() => handleLoadHiRISEInto3D(product)}
                        className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs font-mono transition flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Mount to 3D Explorer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Observation Detail Modal */}
      {activeDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b121e] border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                  NASA Mars 2020 Raw Observation
                </span>
                <h3 className="text-base font-semibold text-white">
                  {activeDetailModal.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveDetailModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center max-h-[50vh]">
                <img
                  src={activeDetailModal.fullResUrl || activeDetailModal.thumbnailUrl}
                  alt={activeDetailModal.title}
                  className="max-h-[50vh] w-auto object-contain"
                />
              </div>

              {/* Metadata Table */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">SOL</span>
                  <span className="text-amber-400 font-semibold">{activeDetailModal.sol}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">INSTRUMENT</span>
                  <span className="text-slate-200">{activeDetailModal.camera}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">LOCAL MARS TIME</span>
                  <span className="text-slate-200">{activeDetailModal.dateMars}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">UTC ACQUISITION</span>
                  <span className="text-slate-300">{activeDetailModal.dateUtc}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">JPL IMAGE ID</span>
                  <span className="text-slate-300 truncate block">{activeDetailModal.imageid}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[10px]">CREDIT / PROVENANCE</span>
                  <span className="text-slate-400">{activeDetailModal.credit}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <a
                href={activeDetailModal.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                Official NASA Mission Page &rarr;
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveDetailModal(null)}
                  className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleSendToAI4MARS(activeDetailModal);
                    setActiveDetailModal(null);
                  }}
                  className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs font-mono transition"
                >
                  Send to AI4MARS Segmentation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
