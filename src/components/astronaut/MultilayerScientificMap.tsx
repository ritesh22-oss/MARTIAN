import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Sliders,
  Activity,
  RefreshCw,
  Download,
  Globe,
  ExternalLink,
  AlertTriangle,
  Layers,
  Loader2,
  Columns2
} from 'lucide-react';
import { useAstronautExploration } from '../../context/AstronautExplorationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { sharedExplorationStore, ActiveExplorationSession } from '../../services/sharedExplorationStore';
import {
  getTrekTilePreviewUrl,
  fetchTrekLayers,
  MarsTrekLayerSpec,
  VERIFIED_MARS_MAP_LAYERS
} from '../../services/marsGeospatialService';
import { fetchUsgsWmsCapabilities } from '../../services/usgsPlanetaryMapService';
import { fetchWorldviewAnalogSites, EarthAnalogSite } from '../../services/nasaWorldviewService';

export const MultilayerScientificMap: React.FC = () => {
  const { currentCoordinates, usgsGeology, trekElevation } = useAstronautExploration();
  const { selectedRegion } = useWorkspace();

  const [activeSession, setActiveSession] = useState<ActiveExplorationSession>(() => sharedExplorationStore.getSession());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeViewMode, setActiveViewMode] = useState<'overlay' | 'original' | 'split'>('overlay');
  const [splitPct, setSplitPct] = useState<number>(50);
  const [baseLayerChoice, setBaseLayerChoice] = useState<'auto' | 'trek_hrsc_mola_clrshade' | 'usgs_mdim21_color' | 'trek_mola_clrshade'>('auto');
  const [spanDeg, setSpanDeg] = useState<number>(0.6);
  const [allowReferenceBrowse, setAllowReferenceBrowse] = useState<boolean>(false);

  const [layerVisibilities, setLayerVisibilities] = useState<Record<string, boolean>>({
    optical_trek: true,
    hillshade: true,
    thermal_day: false,
    thermal_night: false,
    geology_sim3292: true,
    features: true
  });

  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({
    optical_trek: 1.0,
    hillshade: 0.45,
    thermal_day: 0.65,
    thermal_night: 0.65,
    geology_sim3292: 0.55,
    features: 0.85
  });

  const [selectedFeatureIdx, setSelectedFeatureIdx] = useState<number | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [liveLayerSpecs, setLiveLayerSpecs] = useState<MarsTrekLayerSpec[]>(VERIFIED_MARS_MAP_LAYERS);
  const [wmsLayerCount, setWmsLayerCount] = useState<number | null>(null);

  const [analogOpen, setAnalogOpen] = useState<boolean>(false);
  const [analogSites, setAnalogSites] = useState<EarthAnalogSite[]>([]);
  const [selectedAnalogId, setSelectedAnalogId] = useState<string>('atacama');

  const isCoordsUnavailable =
    Boolean(activeSession.imageMetadata.url) && activeSession.provenance?.coordinateScope === 'unavailable';
  const showOrbitalForActive = !isCoordsUnavailable || allowReferenceBrowse;

  const centerLat =
    !isCoordsUnavailable && typeof activeSession.provenance?.lat === 'number'
      ? activeSession.provenance.lat
      : currentCoordinates?.lat ?? selectedRegion?.centerCoords?.lat ?? 18.38;
  const centerLon =
    !isCoordsUnavailable && typeof activeSession.provenance?.lon === 'number'
      ? activeSession.provenance.lon
      : currentCoordinates?.lon ?? selectedRegion?.centerCoords?.lon ?? 77.58;
  const isJezeroBounds = centerLon >= 77.12 && centerLon <= 77.72 && centerLat >= 18.18 && centerLat <= 18.74;

  useEffect(() => {
    const unsubscribe = sharedExplorationStore.subscribe((session) => {
      setActiveSession(session);
      setAllowReferenceBrowse(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;
    fetchTrekLayers(centerLat, centerLon)
      .then(res => {
        if (active && Array.isArray(res.layers) && res.layers.length > 0) setLiveLayerSpecs(res.layers);
      })
      .catch(() => {});
    fetchUsgsWmsCapabilities()
      .then(res => {
        if (active && res.capabilities?.layerNames) setWmsLayerCount(res.capabilities.layerNames.length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [centerLat, centerLon]);

  useEffect(() => {
    if (analogOpen && analogSites.length === 0) {
      fetchWorldviewAnalogSites()
        .then(res => setAnalogSites(res.sites || []))
        .catch(() => {});
    }
  }, [analogOpen, analogSites.length]);

  const categories = [
    { id: 'all', label: 'ALL LAYERS' },
    { id: 'optical', label: 'OPTICAL' },
    { id: 'thermal', label: 'THERMAL IR' },
    { id: 'topographic', label: 'HILLSHADE / DEM' },
    { id: 'geology', label: 'USGS GEOLOGY' }
  ];

  const handleToggleVis = (key: string) => {
    setLayerVisibilities(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpacityChange = (key: string, val: number) => {
    setLayerOpacities(prev => ({ ...prev, [key]: val }));
  };

  const handleReanalyze = async () => {
    if (!activeSession.imageMetadata.url) return;
    setIsReanalyzing(true);
    try {
      sharedExplorationStore.setAnalysisStatus('analyzing', 'Re-analyzing active photograph with CV + Gemini Vision...');
      await sharedExplorationStore.processAndSyncImage(
        activeSession.imageMetadata.url,
        activeSession.imageMetadata.fileName,
        activeSession.activeRegion,
        undefined,
        undefined,
        { ...activeSession.provenance, forceRefresh: true }
      );
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleExportAnalysis = () => {
    const payload = {
      coordinatesAvailable: !isCoordsUnavailable,
      coordinates: isCoordsUnavailable ? null : { lat: centerLat, lon: centerLon, crs: 'IAU2000:49900' },
      trekElevation,
      usgsGeology,
      session: activeSession
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `MarsNav_Multilayer_${isCoordsUnavailable ? 'unreferenced' : `${centerLat.toFixed(2)}N_${centerLon.toFixed(2)}E`}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const boulders = activeSession.imageAnalysis?.boulders || [];

  const resolvedBaseLayerId =
    baseLayerChoice === 'auto'
      ? isJezeroBounds
        ? 'trek_jezero_ctx_6m'
        : 'usgs_mdim21_color'
      : baseLayerChoice;

  const baseOpticalUrl = getTrekTilePreviewUrl({
    layerId: resolvedBaseLayerId,
    lat: centerLat,
    lon: centerLon,
    spanDeg,
    width: 768,
    height: 520
  });
  const hillshadeUrl = getTrekTilePreviewUrl({ layerId: 'trek_hrsc_mola_clrshade', lat: centerLat, lon: centerLon, spanDeg, width: 768, height: 520 });
  const themisDayUrl = getTrekTilePreviewUrl({ layerId: 'usgs_themis_day', lat: centerLat, lon: centerLon, spanDeg, width: 768, height: 520 });
  const themisNightUrl = getTrekTilePreviewUrl({ layerId: 'usgs_themis_night', lat: centerLat, lon: centerLon, spanDeg, width: 768, height: 520 });
  const sim3292Url = getTrekTilePreviewUrl({ layerId: 'trek_sim3292_geology', lat: centerLat, lon: centerLon, spanDeg, width: 768, height: 520 });

  const layerStack = [
    {
      id: 'optical_trek',
      name:
        resolvedBaseLayerId === 'trek_jezero_ctx_6m'
          ? '1. NASA Trek Jezero CTX 6m Mosaic'
          : resolvedBaseLayerId === 'trek_hrsc_mola_clrshade'
            ? '1. NASA Trek HRSC+MOLA Blended Shade'
            : resolvedBaseLayerId === 'trek_mola_clrshade'
              ? '1. NASA Trek MOLA Colorized Hillshade'
              : '1. USGS Viking MDIM 2.1 Color Mosaic',
      cat: 'optical',
      available: showOrbitalForActive,
      nature: 'Observed',
      provider: 'NASA JPL Mars Trek / USGS Astrogeology',
      instrument: resolvedBaseLayerId === 'trek_jezero_ctx_6m' ? 'MRO CTX' : 'Viking / HRSC',
      resolution: resolvedBaseLayerId === 'trek_jezero_ctx_6m' ? '6 m/px' : '200–232 m/px',
      crs: 'IAU2000:49900 / Equirectangular',
      date: 'Published Orbital Product',
      status: showOrbitalForActive ? 'Live WMTS / WMS' : 'Unmapped (Upload lacks lat/lon)',
      sourceUrl: 'https://trek.nasa.gov/mars/'
    },
    {
      id: 'hillshade',
      name: '2. NASA Trek HRSC + MOLA Color Hillshade',
      cat: 'topographic',
      available: showOrbitalForActive,
      nature: 'Calibrated DEM',
      provider: 'NASA JPL / DLR / MOLA Team',
      instrument: 'Mars Express HRSC + MGS MOLA',
      resolution: '200 m/px',
      crs: 'IAU2000:49900 (MOLA Areoid)',
      date: 'Mars2000 Reference',
      status: showOrbitalForActive ? 'Live ImageServer' : 'Unmapped',
      sourceUrl: 'https://trek.nasa.gov/mars/'
    },
    {
      id: 'thermal_day',
      name: '3. USGS THEMIS IR Day 100m Mosaic',
      cat: 'thermal',
      available: showOrbitalForActive,
      nature: 'Observed IR',
      provider: 'USGS Astrogeology / ASU',
      instrument: 'Mars Odyssey THEMIS',
      resolution: '100 m/px',
      crs: 'IAU2000:49900 / WMS 1.3.0',
      date: 'Global Controlled Mosaic',
      status: showOrbitalForActive ? 'Live WMS' : 'Unmapped',
      sourceUrl: 'https://astrogeology.usgs.gov/'
    },
    {
      id: 'thermal_night',
      name: '4. USGS THEMIS IR Night 100m (Thermal Inertia)',
      cat: 'thermal',
      available: showOrbitalForActive,
      nature: 'Derived IR',
      provider: 'USGS Astrogeology / ASU',
      instrument: 'Mars Odyssey THEMIS Night IR',
      resolution: '100 m/px',
      crs: 'IAU2000:49900 / WMS 1.3.0',
      date: 'Global Nighttime Mosaic',
      status: showOrbitalForActive ? 'Live WMS' : 'Unmapped',
      sourceUrl: 'https://astrogeology.usgs.gov/'
    },
    {
      id: 'geology_sim3292',
      name: '5. USGS–NASA SIM 3292 Geologic Units',
      cat: 'geology',
      available: showOrbitalForActive,
      nature: 'Published Map',
      provider: 'USGS Astrogeology Science Center',
      instrument: 'Tanaka et al. (2014) SIM 3292',
      resolution: '1:20,000,000 Global Scale',
      crs: 'IAU2000:49900',
      date: '2014 (Published)',
      status: usgsGeology?.matched ? 'Matched Unit' : showOrbitalForActive ? 'Map Layer Active' : 'Unmapped',
      sourceUrl: 'https://pubs.usgs.gov/sim/3292/'
    },
    {
      id: 'features',
      name: '6. Active-Image Obstacle & Terrain Overlay',
      cat: 'optical',
      available: Boolean(activeSession.imageMetadata.url && boulders.length > 0),
      nature: 'Derived (Active Frame)',
      provider: 'MARSNAV CV + Gemini Vision',
      instrument: activeSession.provenance?.camera || 'Optical Frame',
      resolution: activeSession.imageMetadata.width
        ? `${activeSession.imageMetadata.width}×${activeSession.imageMetadata.height} px`
        : 'Pixel Space',
      crs: isCoordsUnavailable ? 'Uncalibrated Pixel Space' : 'Mission Context',
      date: activeSession.provenance?.acquisitionUtc?.split('T')[0] || 'Session',
      status: `${boulders.length} obstacles localized`,
      sourceUrl: activeSession.provenance?.sourceUrl || ''
    }
  ];

  const activeAnalogSite = analogSites.find(s => s.id === selectedAnalogId) || analogSites[0];

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
              NASA MARS TREK &amp; USGS MULTILAYER SCIENTIFIC MAP
            </span>
            <span className={`text-xs font-mono ${isCoordsUnavailable ? 'text-amber-300' : 'text-cyan-400'}`}>
              {isCoordsUnavailable
                ? 'Active Image Coordinates: UNAVAILABLE'
                : `${centerLat.toFixed(3)}°N, ${centerLon.toFixed(3)}°E · Span ${spanDeg}°`}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Multilayer Orbital &amp; Geological Data Fusion{' '}
            {isCoordsUnavailable && !allowReferenceBrowse
              ? '(Ungeoreferenced Frame)'
              : `(${activeSession.provenance?.locationLabel || selectedRegion?.name || 'Mars Reference'})`}
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl font-mono">
            Quad: <strong className="text-slate-200">{showOrbitalForActive ? usgsGeology?.quadrangle || 'USGS SIM 3292' : 'N/A'}</strong> ·{' '}
            MOLA Elevation:{' '}
            <strong className="text-emerald-300">
              {showOrbitalForActive && trekElevation?.calibrated ? `${trekElevation.elevationM} m (${trekElevation.datum})` : 'Unavailable'}
            </strong>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-[11px] font-mono">
            <span className="text-slate-400">Base:</span>
            <select
              value={baseLayerChoice}
              onChange={e => setBaseLayerChoice(e.target.value as any)}
              className="bg-transparent text-cyan-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="auto" className="bg-slate-900">Auto (CTX/Viking)</option>
              <option value="trek_hrsc_mola_clrshade" className="bg-slate-900">HRSC+MOLA Shade</option>
              <option value="usgs_mdim21_color" className="bg-slate-900">Viking MDIM 2.1</option>
              <option value="trek_mola_clrshade" className="bg-slate-900">MOLA Color Relief</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-2 py-1 text-[11px] font-mono">
            <span className="text-slate-400">Extent:</span>
            {[0.25, 0.6, 1.5, 4.0].map(sp => (
              <button
                key={sp}
                onClick={() => setSpanDeg(sp)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  spanDeg === sp ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {sp}°
              </button>
            ))}
          </div>

          <button
            onClick={() => setActiveViewMode(m => (m === 'overlay' ? 'split' : m === 'split' ? 'original' : 'overlay'))}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Columns2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeViewMode === 'overlay' ? 'Stacked View' : activeViewMode === 'split' ? 'Split Compare' : 'Base Only'}</span>
          </button>

          <button
            onClick={handleReanalyze}
            disabled={!activeSession.imageMetadata.url || isReanalyzing}
            className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isReanalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>REANALYZE</span>
          </button>

          <button
            onClick={handleExportAnalysis}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXPORT JSON</span>
          </button>
        </div>
      </div>

      {/* Explicit Coordinate Unavailable Warning Banner */}
      {isCoordsUnavailable && (
        <div className="bg-amber-950/35 border border-amber-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="font-mono uppercase text-amber-300 block">
                Coordinates Unavailable — Uploaded/Active Image Has No Geographic Coordinates
              </strong>
              <p className="text-slate-300 leading-snug">
                The orbital Mars Trek and USGS maps do NOT represent the uploaded image&apos;s location ({activeSession.imageMetadata.fileName}).
                Select a georeferenced NASA rover observation or enable reference-site browsing explicitly below.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAllowReferenceBrowse(v => !v)}
            className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-mono text-xs font-bold shrink-0 cursor-pointer"
          >
            {allowReferenceBrowse ? 'Hide Reference Map' : `Browse ${selectedRegion?.name || 'Jezero'} Reference`}
          </button>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
                : 'bg-[#0B1021] text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Grid: Map Stage (7 cols) + Layer Stack & Provenance (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-400 font-bold">
                  {showOrbitalForActive ? 'MARS TREK / USGS COMPOSITE' : 'UNREFERENCED IMAGE NOTICE'}
                </span>
                <span>·</span>
                <span>{showOrbitalForActive ? `${centerLat.toFixed(2)}°N, ${centerLon.toFixed(2)}°E` : 'Coordinates Unavailable'}</span>
              </div>
              {activeViewMode === 'split' && showOrbitalForActive && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Split: {splitPct}%</span>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={splitPct}
                    onChange={e => setSplitPct(Number(e.target.value))}
                    className="w-24 accent-cyan-400 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {showOrbitalForActive ? (
              <div className="w-full h-[460px] bg-slate-950 relative overflow-hidden flex items-center justify-center">
                {layerVisibilities.optical_trek && (
                  <img
                    src={baseOpticalUrl}
                    alt="Mars Optical Base Mosaic"
                    style={{ opacity: layerOpacities.optical_trek ?? 1 }}
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                  />
                )}

                {activeViewMode !== 'original' && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={
                      activeViewMode === 'split'
                        ? { clipPath: `inset(0 0 0 ${splitPct}%)` }
                        : undefined
                    }
                  >
                    {layerVisibilities.hillshade && (
                      <img
                        src={hillshadeUrl}
                        alt="HRSC MOLA Color Hillshade"
                        style={{ opacity: layerOpacities.hillshade ?? 0.45 }}
                        className="absolute inset-0 w-full h-full object-contain mix-blend-screen"
                      />
                    )}
                    {layerVisibilities.thermal_day && (
                      <img
                        src={themisDayUrl}
                        alt="USGS THEMIS IR Day"
                        style={{ opacity: layerOpacities.thermal_day ?? 0.65 }}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    )}
                    {layerVisibilities.thermal_night && (
                      <img
                        src={themisNightUrl}
                        alt="USGS THEMIS IR Night"
                        style={{ opacity: layerOpacities.thermal_night ?? 0.65 }}
                        className="absolute inset-0 w-full h-full object-contain mix-blend-lighten"
                      />
                    )}
                    {layerVisibilities.geology_sim3292 && (
                      <img
                        src={sim3292Url}
                        alt="USGS SIM 3292 Geologic Units"
                        style={{ opacity: layerOpacities.geology_sim3292 ?? 0.55 }}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    )}
                  </div>
                )}

                {activeViewMode === 'split' && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-20 pointer-events-none"
                    style={{ left: `${splitPct}%` }}
                  >
                    <span className="absolute top-2 -left-16 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-slate-300">
                      Base
                    </span>
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-cyan-300">
                      Overlay
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
                  <div className="w-6 h-6 rounded-full border-2 border-cyan-400/80 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                  </div>
                </div>

                {layerVisibilities.features && activeViewMode !== 'original' && !isCoordsUnavailable && boulders.map((b, i) => {
                  const isSelected = selectedFeatureIdx === i;
                  return (
                    <div
                      key={b.id || i}
                      onClick={() => setSelectedFeatureIdx(i)}
                      className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform ${
                        isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                      }`}
                      style={{
                        left: `${(b.normX + b.normWidth * 0.5) * 100}%`,
                        top: `${(b.normY + b.normHeight * 0.5) * 100}%`,
                        opacity: layerOpacities.features
                      }}
                    >
                      <div
                        className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold shadow-lg whitespace-nowrap flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cyan-600 text-white border-cyan-300'
                            : 'bg-yellow-400/20 text-yellow-200 border-yellow-400/70 backdrop-blur-sm'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        <span>{b.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="w-full h-[320px] bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <p className="text-xs font-mono text-amber-200 max-w-md">
                  Orbital map withheld because the active uploaded image does not carry planetocentric coordinates.
                </p>
                <button
                  onClick={() => setAllowReferenceBrowse(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-mono text-xs font-bold cursor-pointer"
                >
                  Open Reference Orbital Map ({selectedRegion?.name || 'Jezero Crater'})
                </button>
              </div>
            )}

            <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-300">
              <span>CRS: <strong className="text-white">IAU2000:49900 / EPSG:4326</strong> · Equirectangular</span>
              <span className="text-emerald-400 font-bold">USGS SIM 3292 + NASA Mars Trek</span>
            </div>
          </div>

          {/* Layer Metadata & Provenance Table */}
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Layer Metadata &amp; Provenance Specification</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1.5 pr-3">Layer / Title</th>
                    <th className="py-1.5 pr-3">Provider / Instrument</th>
                    <th className="py-1.5 pr-3">Resolution / CRS</th>
                    <th className="py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {layerStack.map(l => (
                    <tr key={l.id}>
                      <td className="py-2 pr-3 font-bold text-white">{l.name}</td>
                      <td className="py-2 pr-3">
                        <div>{l.provider}</div>
                        <div className="text-[10px] text-slate-400">{l.instrument} · {l.date}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div>{l.resolution}</div>
                        <div className="text-[10px] text-slate-400">{l.crs}</div>
                      </td>
                      <td className="py-2 text-cyan-300">{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Layer Controls & Isolated Earth Analog (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Orbital &amp; Scientific Layer Stack</span>
              </h3>
              <span className="text-[10px] text-cyan-400 font-mono">
                {wmsLayerCount ? `WMS (${wmsLayerCount} LAYERS) / WMTS` : `${liveLayerSpecs.length} Layers`}
              </span>
            </div>

            <div className="space-y-3">
              {layerStack
                .filter(l => selectedCategory === 'all' || l.cat === selectedCategory)
                .map(layer => {
                  const isVis = Boolean(layerVisibilities[layer.id]);
                  const op = layerOpacities[layer.id] ?? 0.65;

                  return (
                    <div key={layer.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            disabled={!layer.available}
                            onClick={() => handleToggleVis(layer.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-40 ${
                              isVis && layer.available
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {isVis && layer.available ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{layer.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 block truncate">
                              {layer.resolution} · {layer.instrument}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 ${
                            layer.available
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-950/50 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {layer.available ? layer.nature : 'UNAVAILABLE'}
                        </span>
                      </div>

                      {layer.available && (
                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-[10px] font-mono text-slate-500">Opacity</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={op}
                            onChange={e => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                          />
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">{Math.round(op * 100)}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Isolated NASA Worldview Earth Analog Reference */}
          <div className="bg-[#0B1021] border border-amber-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Earth Analog Reference (NASA Worldview)
                </h3>
              </div>
              <button
                onClick={() => setAnalogOpen(v => !v)}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[10px] font-mono font-bold cursor-pointer"
              >
                {analogOpen ? 'Hide Earth Analog' : 'Compare Earth Analog'}
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[10px] font-mono text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                ISOLATED EARTH REFERENCE ONLY — NASA Worldview GIBS Earth imagery is never treated as Martian terrain or passed into rover obstacle detection.
              </span>
            </div>

            {analogOpen && (
              <div className="space-y-3 pt-1">
                <div className="flex gap-2">
                  {analogSites.map(site => (
                    <button
                      key={site.id}
                      onClick={() => setSelectedAnalogId(site.id)}
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer ${
                        selectedAnalogId === site.id
                          ? 'bg-amber-600/30 border-amber-400 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {site.name}
                    </button>
                  ))}
                </div>

                {activeAnalogSite && (
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                    <div className="relative h-40">
                      <img
                        src={activeAnalogSite.previewImageUrl}
                        alt={activeAnalogSite.name}
                        className="w-full h-full object-contain bg-black"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-amber-500/50 text-amber-300 text-[9px] font-mono font-bold">
                        {activeAnalogSite.planet}
                      </span>
                    </div>
                    <div className="p-3 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between font-mono">
                        <strong className="text-white">{activeAnalogSite.name}</strong>
                        <span className="text-slate-400">{activeAnalogSite.lat}°, {activeAnalogSite.lon}°</span>
                      </div>
                      <span className="block text-[10px] font-mono text-cyan-300">{activeAnalogSite.marsAnalogTarget}</span>
                      <p className="text-slate-300 text-[11px] leading-snug">{activeAnalogSite.analogRationale}</p>
                      <a
                        href={activeAnalogSite.worldviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-300 hover:underline pt-1"
                      >
                        <span>Open in NASA Worldview</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
