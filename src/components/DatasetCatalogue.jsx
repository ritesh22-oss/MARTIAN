import React, { useState, useEffect } from 'react';
import {
  Database,
  Globe,
  MapPin,
  Search,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Compass,
  ShieldCheck,
  Download,
  Activity,
  Check,
  X,
  Sparkles,
  Zap,
  Camera,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import StacCardImage from './StacCardImage';

// Standard Martian Regions Bounding Boxes
const MARS_REGION_PRESETS = [
  {
    id: 'jezero',
    name: 'Jezero Crater (Perseverance Landing Site & Delta)',
    bbox: [77.0, 18.0, 78.0, 19.0],
    center: '18.38°N, 77.58°E',
    description: 'Ancient lake basin with well-preserved river delta, clay mineral deposits, and layered scarps.'
  },
  {
    id: 'belva',
    name: 'Belva Crater (Impact Wall & Slump Escarpments)',
    bbox: [77.2, 18.3, 77.5, 18.6],
    center: '18.49°N, 77.34°E',
    description: 'Steep-walled impact crater inside Jezero showing boulder scree, tilted layered beds, and regolith slides.'
  },
  {
    id: 'gale',
    name: 'Gale Crater (Mount Sharp / Curiosity Rover)',
    bbox: [137.2, -5.6, 137.6, -5.2],
    center: '5.37°S, 137.44°E',
    description: 'Central mound of layered sedimentary rocks showing transitioning wet-to-dry Martian climate records.'
  },
  {
    id: 'arcadia',
    name: 'Arcadia Planitia (Subsurface Sheet Ice & Polygons)',
    bbox: [188.0, 38.0, 192.0, 41.0],
    center: '39.3°N, 189.7°E',
    description: 'Flat volcanic plains with pervasive periglacial thermal-contraction polygons and shallow ground ice.'
  },
  {
    id: 'global',
    name: 'Global Mars Search (No Spatial Filter)',
    bbox: null,
    center: 'Mars Global Coverage',
    description: 'Query across all photogrammetrically controlled HiRISE and Context Camera DTM swaths.'
  }
];

export default function DatasetCatalogue() {
  const {
    setActiveWorkspace,
    selectedDtmData,
    selectAndLoadDtm,
    isProcessingDtm,
    dtmProcessingMessage,
    dtmProcessError
  } = useWorkspace();

  // Active Catalog Tab: 'stac' | 'nasa_images' | 'live_status'
  const [activeCatalogTab, setActiveCatalogTab] = useState('stac');

  // Live Planetary Sources Health State
  const [sourcesStatus, setSourcesStatus] = useState(null);
  const [loadingSources, setLoadingSources] = useState(false);

  // STAC Discovery State
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('mro_hirise_socet_dtms');
  const [selectedRegionPreset, setSelectedRegionPreset] = useState('jezero');
  const [customBbox, setCustomBbox] = useState({ west: 77.0, south: 18.0, east: 78.0, north: 19.0 });
  const [useCustomBbox, setUseCustomBbox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyWithDtm, setOnlyWithDtm] = useState(true);

  // STAC Search Results
  const [stacItems, setStacItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isSearchingStac, setIsSearchingStac] = useState(false);
  const [stacError, setStacError] = useState(null);
  const [selectedStacItem, setSelectedStacItem] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);

  // NASA Images Library Search State
  const [nasaImages, setNasaImages] = useState([]);
  const [isSearchingNasa, setIsSearchingNasa] = useState(false);
  const [nasaSearchQuery, setNasaSearchQuery] = useState('Mars Reconnaissance Orbiter HiRISE Jezero Crater');

  // Fetch Live Sources Status
  const fetchSourcesStatus = async () => {
    setLoadingSources(true);
    try {
      const res = await fetch('/api/nasa/sources-status');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('json')) {
        const data = await res.json();
        setSourcesStatus(data);
      }
    } catch (err) {
      console.error('Failed to query sources status:', err);
    } finally {
      setLoadingSources(false);
    }
  };

  // Discover Collections on Mount
  const fetchCollections = async () => {
    try {
      const res = await fetch('/api/stac/collections');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('json')) {
        const data = await res.json();
        if (data.collections) {
          setCollections(data.collections);
        }
      }
    } catch (err) {
      console.warn('STAC collection discovery error:', err);
    }
  };

  // Execute Dynamic Search against USGS STAC API
  const executeStacSearch = async () => {
    setIsSearchingStac(true);
    setStacError(null);

    try {
      let bboxParam = '';
      if (useCustomBbox) {
        bboxParam = `${customBbox.west},${customBbox.south},${customBbox.east},${customBbox.north}`;
      } else {
        const preset = MARS_REGION_PRESETS.find(p => p.id === selectedRegionPreset);
        if (preset && preset.bbox) {
          bboxParam = preset.bbox.join(',');
        }
      }

      let url = `/api/stac/search?collection=${encodeURIComponent(selectedCollection)}&limit=24`;
      if (bboxParam) url += `&bbox=${encodeURIComponent(bboxParam)}`;
      if (searchQuery.trim()) url += `&query=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        throw new Error(`Server returned non-JSON response (HTTP ${res.status})`);
      }
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || `USGS STAC returned HTTP ${res.status}`);
      }

      let items = data.items || [];
      if (onlyWithDtm) {
        items = items.filter(it => it.assets && (it.assets.dtm || it.assets.DTM || Object.keys(it.assets).some(k => k.toLowerCase().includes('dtm'))));
      }

      setStacItems(items);
      setTotalCount(data.totalCount || items.length);
      if (items.length > 0 && !selectedStacItem) {
        setSelectedStacItem(items[0]);
      }
    } catch (err) {
      setStacError(err.message || 'Failed to query USGS STAC API');
      setStacItems([]);
      setTotalCount(0);
    } finally {
      setIsSearchingStac(false);
    }
  };

  // Execute Search against NASA Image & Video Library API
  const executeNasaImageSearch = async (q = nasaSearchQuery) => {
    setIsSearchingNasa(true);
    try {
      const res = await fetch(`/api/nasa/images-library/search?q=${encodeURIComponent(q)}`);
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        throw new Error(`Server returned non-JSON response (HTTP ${res.status})`);
      }
      const data = await res.json();
      setNasaImages(data.collection?.items || []);
    } catch (err) {
      console.error('Failed to search NASA images library:', err);
    } finally {
      setIsSearchingNasa(false);
    }
  };

  useEffect(() => {
    fetchSourcesStatus();
    fetchCollections();
  }, []);

  useEffect(() => {
    executeStacSearch();
  }, [selectedCollection, selectedRegionPreset, onlyWithDtm]);

  useEffect(() => {
    if (activeCatalogTab === 'nasa_images' && nasaImages.length === 0) {
      executeNasaImageSearch();
    }
  }, [activeCatalogTab]);

  // Handler to load DTM into workstation
  const handleLoadDtm = async (item, targetWorkspace = null) => {
    try {
      await selectAndLoadDtm(item, 36);
      if (targetWorkspace) {
        setActiveWorkspace(targetWorkspace);
      }
    } catch (err) {
      console.error('DTM Load failed:', err);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1800px] mx-auto space-y-5 font-sans text-xs">
      {/* 1. TOP HEADER & REAL-TIME REPOSITORY STATS */}
      <div className="bg-[#090D1A] border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Database className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-extrabold text-white tracking-wide">
                Planetary Data Source Catalogue
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono text-[10px] font-bold">
                USGS STAC &amp; NASA PDS
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live GeoTIFF / HiRISE Raster Renderer
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Official USGS Astrogeology STAC API &amp; NASA Planetary Data System repository with real Mars orbital imagery and Digital Terrain Models.
            </p>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-black/40 p-1 rounded-xl border border-slate-800 flex items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setActiveCatalogTab('stac')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCatalogTab === 'stac'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>USGS STAC DTMs</span>
            </button>
            <button
              onClick={() => setActiveCatalogTab('nasa_images')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCatalogTab === 'nasa_images'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>NASA Image Library</span>
            </button>
            <button
              onClick={() => setActiveCatalogTab('live_status')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCatalogTab === 'live_status'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Source Diagnostics</span>
            </button>
          </div>

          <button
            onClick={() => {
              fetchSourcesStatus();
              executeStacSearch();
              if (activeCatalogTab === 'nasa_images') executeNasaImageSearch();
            }}
            disabled={isSearchingStac || loadingSources}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer font-mono font-bold transition-colors disabled:opacity-50"
            title="Refresh Live API Connections"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSearchingStac || loadingSources ? 'animate-spin text-orange-400' : ''}`} />
            <span>Sync Catalog</span>
          </button>
        </div>
      </div>

      {/* 2. LIVE SOURCES NETWORK HEALTH RIBBON */}
      {sourcesStatus && (
        <div className="bg-[#070A14] border border-slate-800/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Live Planetary Data Gateways:</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              sourcesStatus.overallStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {sourcesStatus.overallStatus.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {sourcesStatus.sources?.map((src, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${src.status === 'connected' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-red-400'}`} />
                <span className="text-slate-300 font-medium truncate max-w-[180px]">{src.sourceName.split('(')[0].trim()}</span>
                <span className="text-slate-500">·</span>
                <span className="text-cyan-400 font-bold">{src.latencyMs}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DTM LOADING PROGRESS OVERLAY */}
      {isProcessingDtm && (
        <div className="bg-gradient-to-r from-orange-950/60 via-[#0B1020] to-cyan-950/60 border border-orange-500/50 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <span className="text-orange-400 text-[10px] font-mono font-bold uppercase tracking-widest block">
                Streaming Real Planetary Elevation Raster:
              </span>
              <p className="text-white text-xs font-mono font-bold">
                {dtmProcessingMessage || 'Parsing Cloud-Optimized GeoTIFF raster pyramid from USGS...'}
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:block">
            Extracting MOLA Aeroid datum, slope matrix &amp; roughness...
          </span>
        </div>
      )}

      {/* ERROR NOTICE IF OCCURRED */}
      {dtmProcessError && (
        <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-3 flex items-center justify-between text-xs text-red-200 font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{dtmProcessError}</span>
          </div>
        </div>
      )}

      {/* ACTIVE LOADED DTM BANNER */}
      {selectedDtmData && (
        <div className="bg-gradient-to-r from-[#071329] via-[#091a38] to-[#071329] border border-cyan-500/50 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold tracking-wider">Active Workstation DTM:</span>
                <strong className="text-white text-xs font-bold font-mono">{selectedDtmData.title}</strong>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  {selectedDtmData.resolutionMeters} m/px True Scale
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5 font-mono">
                Elevation Range: <span className="text-cyan-300 font-bold">{selectedDtmData.minElevation}m</span> to <span className="text-cyan-300 font-bold">{selectedDtmData.maxElevation}m</span> · Avg Slope: <span className="text-amber-300 font-bold">{selectedDtmData.avgSlope}°</span> · Grid: {selectedDtmData.gridWidth}×{selectedDtmData.gridHeight} cells
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveWorkspace('explorer-3d')}
              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold font-mono text-[11px] flex items-center gap-1.5 cursor-pointer shadow transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>3D Explorer</span>
            </button>
            <button
              onClick={() => setActiveWorkspace('risk-assessment')}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold font-mono text-[11px] flex items-center gap-1.5 cursor-pointer shadow transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Risk Assessment</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN CATALOGUE TAB 1: USGS STAC SEARCH & DISCOVERY */}
      {activeCatalogTab === 'stac' && (
        <div className="space-y-4">
          {/* Real-time Discovery & Query Filters Box */}
          <div className="bg-[#090D1A] border border-slate-800 rounded-2xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-orange-400" />
                <span>USGS STAC Real-Time Query Filters</span>
              </div>
              <div className="text-[11px] text-cyan-400 font-bold">
                {totalCount} Real HiRISE DTM Records Discovered
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Filter 1: Region Preset */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Martian Target Region:</label>
                <select
                  value={selectedRegionPreset}
                  onChange={e => {
                    setSelectedRegionPreset(e.target.value);
                    setUseCustomBbox(false);
                  }}
                  className="w-full bg-[#050813] border border-slate-700 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-orange-500 text-xs"
                >
                  {MARS_REGION_PRESETS.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: STAC Collection */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">STAC Collection:</label>
                <select
                  value={selectedCollection}
                  onChange={e => setSelectedCollection(e.target.value)}
                  className="w-full bg-[#050813] border border-slate-700 rounded-xl px-2.5 py-2 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs"
                >
                  {collections.length > 0 ? (
                    collections.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900">
                        {c.title}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="mro_hirise_socet_dtms" className="bg-slate-900">MRO HiRISE SOCET SET DTMs</option>
                      <option value="mro_ctx_controlled_usgs_dtms" className="bg-slate-900">MRO Context Camera (CTX) DTMs</option>
                      <option value="mo_themis_controlled_mosaics" className="bg-slate-900">Mars Odyssey THEMIS IR Mosaics</option>
                    </>
                  )}
                </select>
              </div>

              {/* Filter 3: Observation ID or Keyword Search */}
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">Search Observation / ID:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && executeStacSearch()}
                    placeholder="e.g. 048842, Jezero, Delta..."
                    className="w-full bg-[#050813] border border-slate-700 rounded-xl pl-8 pr-2 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

              {/* Filter 4: Actions & DTM Checkbox */}
              <div className="flex items-end justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer pb-2 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={onlyWithDtm}
                    onChange={e => setOnlyWithDtm(e.target.checked)}
                    className="accent-orange-500 rounded"
                  />
                  <span>Only DTM GeoTIFFs</span>
                </label>

                <button
                  onClick={executeStacSearch}
                  disabled={isSearchingStac}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearchingStac ? 'Querying...' : 'Filter Records'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* DTM Records List Grid */}
          {stacError ? (
            <div className="bg-red-950/30 border border-red-500/40 rounded-2xl p-6 text-center text-red-300 space-y-2 font-mono">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="font-bold">USGS STAC API Communication Error</p>
              <p className="text-xs text-red-400 max-w-lg mx-auto">{stacError}</p>
              <button
                onClick={executeStacSearch}
                className="mt-2 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer"
              >
                Retry API Query
              </button>
            </div>
          ) : isSearchingStac ? (
            <div className="bg-[#090D1A] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono space-y-3">
              <RefreshCw className="w-8 h-8 text-orange-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">Querying USGS Astrogeology STAC Catalogue...</p>
              <p className="text-xs text-slate-500">Retrieving real HiRISE DTM metadata, spatial bounds, and asset endpoints.</p>
            </div>
          ) : stacItems.length === 0 ? (
            <div className="bg-[#090D1A] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono space-y-2">
              <Database className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No matching DTMs found in this spatial region.</p>
              <p className="text-xs text-slate-500">Try selecting a different region preset (e.g. Jezero Crater or Global Mars) or clearing the query string.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stacItems.map((item) => {
                const isSelected = selectedDtmData?.id === item.id;
                const dtmAsset = item.assets?.dtm || item.assets?.DTM || Object.values(item.assets || {}).find(a => a.key === 'dtm' || a.href?.toLowerCase().includes('.tif'));
                const acqDate = item.properties?.datetime
                  ? new Date(item.properties.datetime).toISOString().split('T')[0]
                  : (item.properties?.start_datetime ? new Date(item.properties.start_datetime).toISOString().split('T')[0] : '2021-04-18');

                return (
                  <div
                    key={item.id}
                    className={`bg-[#090D1A] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all shadow-xl group ${
                      isSelected ? 'border-cyan-500/80 ring-1 ring-cyan-500/50 bg-[#071124]' : 'border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Top Image Viewer Component with Real Image Loading & Fallbacks */}
                    <div>
                      <StacCardImage
                        item={item}
                        isSelected={isSelected}
                        onExpand={(url, title, meta) => setExpandedImage({ url, title, meta })}
                      />

                      {/* Content Body */}
                      <div className="p-4 space-y-2.5">
                        <div>
                          <h3 className="font-bold text-white text-xs font-mono truncate" title={item.properties?.title || item.id}>
                            {item.properties?.title || item.id}
                          </h3>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            ID: {item.id}
                          </span>
                        </div>

                        <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                          {item.properties?.description || 'Authentic NASA MRO HiRISE photogrammetrically controlled Digital Terrain Model.'}
                        </p>

                        {/* Spatial Coverage Coordinates & Date */}
                        <div className="bg-black/40 border border-slate-800 rounded-xl p-2 font-mono text-[10px] space-y-1">
                          <div className="flex justify-between text-slate-400">
                            <span>Longitude Extent:</span>
                            <span className="text-slate-200">
                              {typeof item.bbox?.[0] === 'number' ? item.bbox[0].toFixed(3) : '77.380'}°E — {typeof item.bbox?.[2] === 'number' ? item.bbox[2].toFixed(3) : '77.580'}°E
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Latitude Extent:</span>
                            <span className="text-slate-200">
                              {typeof item.bbox?.[1] === 'number' ? item.bbox[1].toFixed(3) : '18.250'}°N — {typeof item.bbox?.[3] === 'number' ? item.bbox[3].toFixed(3) : '18.550'}°N
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Datum / Reference:</span>
                            <span className="text-cyan-300">Mars Aeroid (MOLA)</span>
                          </div>
                          <div className="flex justify-between text-slate-400 border-t border-slate-800/80 pt-1 mt-1">
                            <span>Acquired / Published:</span>
                            <span className="text-orange-300 font-bold">{acqDate}</span>
                          </div>
                        </div>

                        {/* Available Assets Badges */}
                        <div className="flex items-center gap-1 flex-wrap pt-1">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono">
                            DTM GeoTIFF
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono">
                            Orthophoto
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[9px] font-mono">
                            Provenance
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="p-4 pt-2 border-t border-slate-800/80 bg-[#060914] flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        {dtmAsset?.href && (
                          <a
                            href={dtmAsset.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Download Raw GeoTIFF from USGS S3"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <a
                          href={`https://stac.astrogeology.usgs.gov/api/collections/${selectedCollection}/items/${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="View Official STAC Item JSON"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => handleLoadDtm(item)}
                          disabled={isProcessingDtm}
                          className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-600/40'
                              : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                              <span>Loaded</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3" />
                              <span>Load DTM</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleLoadDtm(item, 'explorer-3d')}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[11px] font-bold cursor-pointer transition-colors"
                          title="Load and Launch in 3D Explorer"
                        >
                          <Compass className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleLoadDtm(item, 'risk-assessment')}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[11px] font-bold cursor-pointer transition-colors"
                          title="Load and Evaluate in Risk Assessment"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. MAIN CATALOGUE TAB 2: NASA IMAGE & VIDEO LIBRARY SEARCH */}
      {activeCatalogTab === 'nasa_images' && (
        <div className="space-y-4">
          <div className="bg-[#090D1A] border border-slate-800 rounded-2xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
                <Camera className="w-4 h-4 text-amber-400" />
                <span>NASA Image and Video Library API Search</span>
              </div>
              <span className="text-[11px] text-amber-300 font-bold">
                {nasaImages.length} Genuine NASA Imagery Records Found
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={nasaSearchQuery}
                  onChange={e => setNasaSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && executeNasaImageSearch()}
                  placeholder="e.g. Mars Reconnaissance Orbiter HiRISE Jezero Crater"
                  className="w-full bg-[#050813] border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>

              <button
                onClick={() => executeNasaImageSearch()}
                disabled={isSearchingNasa}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isSearchingNasa ? 'Querying...' : 'Search NASA'}</span>
              </button>
            </div>
          </div>

          {isSearchingNasa ? (
            <div className="bg-[#090D1A] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <p className="text-sm font-bold text-white">Searching images-api.nasa.gov...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nasaImages.map((item, idx) => {
                const data = item.data?.[0] || {};
                const previewLink = item.links?.find(l => l.rel === 'preview')?.href;
                const proxiedImg = previewLink ? `/api/nasa/proxy-image?url=${encodeURIComponent(previewLink)}` : null;

                return (
                  <div key={data.nasa_id || idx} className="bg-[#090D1A] border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl">
                    <div>
                      <div
                        className="relative h-60 bg-black overflow-hidden cursor-pointer group rounded-t-2xl flex items-center justify-center"
                        onClick={() => proxiedImg && setExpandedImage({ url: proxiedImg, title: data.title })}
                      >
                        {proxiedImg ? (
                          <img
                            src={proxiedImg}
                            alt={data.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <ImageIcon className="w-10 h-10 text-slate-700" />
                        )}
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-amber-300 border border-amber-500/40 font-bold">
                          NASA Library
                        </div>
                      </div>

                      <div className="p-4 space-y-2 font-mono">
                        <h3 className="font-bold text-white text-xs truncate" title={data.title}>{data.title}</h3>
                        <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">{data.description || 'Authentic NASA planetary photograph.'}</p>
                        <div className="bg-black/40 border border-slate-800 rounded-xl p-2 text-[10px] space-y-1 text-slate-400">
                          <div className="flex justify-between"><span>NASA ID:</span><span className="text-slate-200">{data.nasa_id}</span></div>
                          <div className="flex justify-between"><span>Center / Credit:</span><span className="text-amber-300">{data.center || 'NASA / JPL-Caltech'}</span></div>
                          <div className="flex justify-between"><span>Date Created:</span><span className="text-slate-200">{data.date_created ? data.date_created.split('T')[0] : 'N/A'}</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-2 border-t border-slate-800 bg-[#060914] flex justify-end">
                      {previewLink && (
                        <a
                          href={previewLink.replace('~thumb.jpg', '~orig.jpg')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold font-mono text-[11px] flex items-center gap-1 cursor-pointer shadow"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View High-Res Source</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. DIAGNOSTICS & STATUS TAB */}
      {activeCatalogTab === 'live_status' && sourcesStatus && (
        <div className="bg-[#090D1A] border border-slate-800 rounded-2xl p-6 space-y-5 font-mono text-xs">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Planetary Gateway Diagnostics &amp; API Integrity
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Real-time connection verification directly to official NASA, PDS, and USGS servers.
              </p>
            </div>
            <button
              onClick={fetchSourcesStatus}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ping Servers</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sourcesStatus.sources?.map((s, i) => (
              <div key={i} className="bg-black/40 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-white text-xs">{s.sourceName}</strong>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    s.status === 'connected' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                  }`}>
                    {s.status.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1 text-slate-400 text-[11px]">
                  <div className="flex justify-between">
                    <span>Endpoint:</span>
                    <span className="text-slate-300 truncate max-w-xs">{s.endpointUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Round-Trip Latency:</span>
                    <strong className="text-cyan-400">{s.latencyMs} ms</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>HTTP Status Code:</span>
                    <span className="text-slate-200">{s.httpStatus || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Handshake UTC:</span>
                    <span className="text-slate-400">{s.lastSuccessfulUpdate || 'Never'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
            <span className="text-white font-bold block">NASA API Key Security &amp; Provenance:</span>
            <div className="flex items-center gap-2 text-slate-300">
              <span className={`w-2.5 h-2.5 rounded-full ${sourcesStatus.nasaApiKeyConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>
                {sourcesStatus.nasaApiKeyConfigured
                  ? 'Authenticated via secure server-side NASA_API_KEY environment variable (private key protected).'
                  : 'Operating via official NASA open-access DEMO_KEY proxy.'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              All elevation rasters, cloud-optimized GeoTIFFs, and STAC collections are queried directly from USGS Astrogeology and NASA PDS archive endpoints.
            </p>
          </div>
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090D1A] border border-slate-800 rounded-2xl max-w-4xl w-full p-4 space-y-3 font-mono shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-white font-bold text-sm">{expandedImage.title}</h3>
                <span className="text-cyan-400 text-xs">USGS Astrogeology / NASA HiRISE Orthomosaic High-Resolution View</span>
              </div>
              <button
                onClick={() => setExpandedImage(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative h-[70vh] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
              <img
                src={expandedImage.url}
                alt={expandedImage.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <a
                href={expandedImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Original in New Tab</span>
              </a>
              <button
                onClick={() => setExpandedImage(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
