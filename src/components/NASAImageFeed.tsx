import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Calendar,
  Search,
  RefreshCw,
  Check,
  Globe,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  Sparkles,
  X,
  Clock,
  ArrowDownUp,
  Radio,
  Zap,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { syncLatestObservation, SyncLatestResult } from '../services/nasaDataService';
import { apiGet } from '../utils/apiClient';

interface NASAImageFeedProps {
  onSelectImage?: (img: any) => void;
  onClose?: () => void;
}

const CAMERA_OPTIONS_M2020 = [
  { id: 'ALL', label: 'All Cameras' },
  { id: 'NAVCAM_LEFT', label: 'NavCam Left' },
  { id: 'NAVCAM_RIGHT', label: 'NavCam Right' },
  { id: 'MCZ_LEFT', label: 'Mastcam-Z Left' },
  { id: 'MCZ_RIGHT', label: 'Mastcam-Z Right' },
  { id: 'FRONT_HAZCAM_LEFT_A', label: 'Front HazCam' },
  { id: 'REAR_HAZCAM_LEFT', label: 'Rear HazCam' },
  { id: 'SHERLOC_WATSON', label: 'WATSON (Arm)' },
  { id: 'SUPER_CAM_RMI', label: 'SuperCam RMI' }
];

const CAMERA_OPTIONS_MSL = [
  { id: 'ALL', label: 'All Cameras' },
  { id: 'MAST', label: 'Mast Camera (Mastcam)' },
  { id: 'NAV_LEFT_A', label: 'Navcam Left' },
  { id: 'NAV_RIGHT_A', label: 'Navcam Right' },
  { id: 'FHAZ', label: 'Front Hazcam' },
  { id: 'RHAZ', label: 'Rear Hazcam' },
  { id: 'CHEMCAM_RMI', label: 'ChemCam RMI' },
  { id: 'MAHLI', label: 'MAHLI (Hand Lens)' }
];

export default function NASAImageFeed({ onSelectImage, onClose }: NASAImageFeedProps) {
  const { updateSharedSession, sharedSession } = useWorkspace();
  
  // Mission and Query State
  const [mission, setMission] = useState<'mars2020' | 'msl'>('mars2020');
  const [sol, setSol] = useState<string>(''); // empty means latest or unconstrained
  const [camera, setCamera] = useState<string>('ALL');
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(12);

  // Data State
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [totalArchiveCount, setTotalArchiveCount] = useState<number>(1054652);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Sync & Telemetry State
  const [latestSol, setLatestSol] = useState<number>(2022);
  const [latestObsDate, setLatestObsDate] = useState<string>('2026-10-28T11:17:45Z');
  const [lastCheckedAt, setLastCheckedAt] = useState<string>(new Date().toLocaleTimeString());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [autoSyncIntervalSec, setAutoSyncIntervalSec] = useState<number>(60); // 0 = off, 30, 60, 120
  const [countdownSec, setCountdownSec] = useState<number>(60);

  // Pre-decoding feedback state
  const [loadingImageId, setLoadingImageId] = useState<string | null>(null);

  // Check latest observation from JPL
  const performSyncCheck = useCallback(async (isManual = false) => {
    setIsSyncing(true);
    try {
      const syncRes = await syncLatestObservation(mission);
      setLatestSol(syncRes.latestSol);
      if (syncRes.latestObservationDate) {
        setLatestObsDate(syncRes.latestObservationDate);
      }
      if (syncRes.totalObservations) {
        setTotalResults(syncRes.totalObservations);
      }
      if (syncRes.totalImagesArchive) {
        setTotalArchiveCount(syncRes.totalImagesArchive);
      }
      const nowStr = new Date().toLocaleTimeString();
      setLastCheckedAt(nowStr);

      if (isManual) {
        setSyncNotice('Sync complete: No newer observations available at this moment. You are viewing the latest JPL stream.');
        setTimeout(() => setSyncNotice(null), 6000);
      }
    } catch (err: any) {
      console.warn('Sync check warning:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [mission]);

  // Fetch image page
  const fetchRawImages = useCallback(async (
    targetMission: 'mars2020' | 'msl',
    solVal: string,
    camVal: string,
    orderVal: 'newest' | 'oldest',
    pageNum: number,
    numItems: number,
    append: boolean = false
  ) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        mission: targetMission,
        num: String(numItems),
        page: String(pageNum),
        order: orderVal
      });

      if (solVal && solVal.trim() !== '') {
        queryParams.append('sol', solVal.trim());
      }
      if (camVal && camVal !== 'ALL') {
        queryParams.append('camera', camVal);
      }

      const { data, error, isHtml, status } = await apiGet<any>(`/api/nasa/mars2020/raw?${queryParams.toString()}`);
      
      if (error || isHtml || !data) {
        throw new Error(error || `NASA JPL API responded with HTTP ${status}`);
      }
      if (data && Array.isArray(data.images)) {
        if (append) {
          // Deduplicate when appending
          setImages(prev => {
            const seen = new Set(prev.map(i => i.id));
            const newOnes = data.images.filter((i: any) => !seen.has(i.id));
            return [...prev, ...newOnes];
          });
        } else {
          setImages(data.images);
        }

        if (data.totalResults) setTotalResults(data.totalResults);
        if (data.totalImages) setTotalArchiveCount(data.totalImages);
        if (data.latestObservationDate) setLatestObsDate(data.latestObservationDate);
        setIsStale(Boolean(data.isStale));
      } else {
        if (!append) setImages([]);
      }
    } catch (err: any) {
      console.error('NASA Raw Feed fetch error:', err);
      setError(err.message || 'Unable to retrieve NASA live raw frames.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial mount sync & fetch
  useEffect(() => {
    performSyncCheck(false);
    fetchRawImages(mission, sol, camera, order, page, limit, false);
  }, [mission, sol, camera, order, page, limit, fetchRawImages, performSyncCheck]);

  // Periodic Auto-Sync Timer
  useEffect(() => {
    if (autoSyncIntervalSec <= 0) return;
    setCountdownSec(autoSyncIntervalSec);

    const timer = setInterval(() => {
      setCountdownSec(prev => {
        if (prev <= 1) {
          performSyncCheck(false);
          return autoSyncIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoSyncIntervalSec, performSyncCheck]);

  // Jump to Latest
  const handleJumpToLatest = () => {
    setSol('');
    setOrder('newest');
    setPage(0);
    setSyncNotice(`Jumped to latest observation corridor (Sol ${latestSol}).`);
    setTimeout(() => setSyncNotice(null), 5000);
  };

  // Jump to Earliest (Sol 0)
  const handleJumpToEarliest = () => {
    setSol('0');
    setOrder('oldest');
    setPage(0);
    setSyncNotice('Jumped to earliest mission observations (Sol 0 / Touchdown day).');
    setTimeout(() => setSyncNotice(null), 5000);
  };

  // Load More (Pagination)
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchRawImages(mission, sol, camera, order, nextPage, limit, true);
  };

  // Safe Image URL proxy
  const getSafeImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;
    return `/api/nasa/proxy-image?url=${encodeURIComponent(url)}`;
  };

  // Pre-decode and load into simulator
  const handleSelect = (img: any) => {
    setSelectedImageId(img.id);
    setLoadingImageId(img.id);

    const fullResUrl = img.fullResUrl || img.thumbnailUrl;
    const targetProxy = getSafeImageUrl(fullResUrl);

    // Pre-decode image before transitioning to ensure zero latency in the terrain viewer
    const preloader = new Image();
    preloader.crossOrigin = 'anonymous';

    const commitSelection = () => {
      setLoadingImageId(null);
      const provenanceData = {
        source: img.mission || 'NASA JPL Mars Raw Feed',
        rover: img.mission?.includes('Curiosity') ? 'Curiosity (MSL)' : 'Perseverance (Mars 2020)',
        camera: img.camera || 'NAVCAM_LEFT',
        sol: img.sol ?? Number(sol || latestSol),
        acquisitionUtc: img.dateUtc || new Date().toISOString(),
        identifier: img.id || img.imageid || img.title,
        sourceUrl: img.sourceUrl || fullResUrl
      };

      updateSharedSession({
        terrainImage: fullResUrl,
        imageProvenance: provenanceData
      });

      if (onSelectImage) {
        onSelectImage(img);
      }
    };

    preloader.onload = commitSelection;
    preloader.onerror = () => {
      // If full res fails to decode, fallback cleanly to thumbnail
      commitSelection();
    };
    preloader.src = targetProxy;

    if (preloader.complete && preloader.naturalWidth > 0) {
      commitSelection();
    } else if (typeof preloader.decode === 'function') {
      preloader.decode().then(commitSelection).catch(commitSelection);
    }
  };

  const cameraOptions = mission === 'mars2020' ? CAMERA_OPTIONS_M2020 : CAMERA_OPTIONS_MSL;

  return (
    <div className="bg-[#0A0E1A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-6xl w-full mx-auto font-sans">
      {/* 1. Header with Mission Switcher & Telemetry */}
      <div className="px-6 py-4 bg-[#080B14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Radio className="w-5 h-5 mx-auto animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                NASA Mars Planetary Raw Image Archive
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live JPL Feed
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                Sol 0 → Sol {latestSol}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Genuine observations from Mars touchdown to current mission operations ({totalArchiveCount.toLocaleString()} archive frames)
            </p>
          </div>
        </div>

        {/* Rover Mission Toggle & Close */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-black/60 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              onClick={() => {
                setMission('mars2020');
                setSol('');
                setCamera('ALL');
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                mission === 'mars2020'
                  ? 'bg-orange-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Perseverance (M2020)
            </button>
            <button
              onClick={() => {
                setMission('msl');
                setSol('4300');
                setCamera('ALL');
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                mission === 'msl'
                  ? 'bg-cyan-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Curiosity (MSL)
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Real-Time Sync & Live Observation Status Strip */}
      <div className="px-6 py-2.5 bg-[#060812] border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Last checked:</span>
            <strong className="text-white">{lastCheckedAt}</strong>
          </div>
          <div className="hidden sm:inline-block text-slate-700">|</div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Latest observation:</span>
            <strong className="text-orange-300">
              {latestObsDate ? new Date(latestObsDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Today'} (Sol {latestSol})
            </strong>
          </div>
          <div className="hidden md:inline-block text-slate-700">|</div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Archive Total:</span>
            <span className="text-slate-200 font-bold">{totalResults.toLocaleString()} frames</span>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500">Auto-sync:</span>
            <select
              aria-label="Auto-sync interval"
              value={autoSyncIntervalSec}
              onChange={e => setAutoSyncIntervalSec(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-md px-1.5 py-0.5 text-cyan-400 focus:outline-none cursor-pointer"
            >
              <option value={0}>Off</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
              <option value={120}>120s</option>
            </select>
            {autoSyncIntervalSec > 0 && (
              <span className="text-[10px] text-cyan-500 font-mono">({countdownSec}s)</span>
            )}
          </div>

          <button
            onClick={() => performSyncCheck(true)}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
            title="Check NASA JPL for newly transmitted observations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-orange-400' : 'text-slate-400'}`} />
            <span>{isSyncing ? 'Checking...' : 'Sync Latest'}</span>
          </button>
        </div>
      </div>

      {/* Sync notification banner */}
      {syncNotice && (
        <div className="bg-emerald-950/40 border-b border-emerald-800/80 px-6 py-2 flex items-center justify-between text-xs text-emerald-300 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button onClick={() => setSyncNotice(null)} className="text-emerald-500 hover:text-emerald-300 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Filter & Timeline Navigation Bar */}
      <div className="p-4 bg-[#080C18] border-b border-slate-800/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Timeline Jumps */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleJumpToLatest}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                order === 'newest' && (!sol || sol === '')
                  ? 'bg-orange-600/30 border-orange-500 text-orange-300 shadow-md shadow-orange-950'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-orange-400" />
              Jump to Latest (Sol {latestSol})
            </button>

            <button
              onClick={handleJumpToEarliest}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                order === 'oldest' || sol === '0'
                  ? 'bg-cyan-600/30 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Jump to Earliest (Sol 0)
            </button>

            {/* Sort Toggle */}
            <button
              onClick={() => {
                setOrder(prev => (prev === 'newest' ? 'oldest' : 'newest'));
                setPage(0);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Toggle timeline ordering"
            >
              <ArrowDownUp className="w-3.5 h-3.5 text-orange-400" />
              <span>Sort: {order === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>

          {/* Sol Search & Common Sol Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5">
              <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-xs font-mono text-slate-400">Target Sol:</span>
              <input
                type="text"
                value={sol}
                onChange={e => {
                  setSol(e.target.value);
                  setPage(0);
                }}
                placeholder="All / Sol #"
                className="w-20 bg-transparent text-xs font-mono text-white focus:outline-none placeholder:text-slate-600"
              />
              {sol && (
                <button
                  onClick={() => {
                    setSol('');
                    setPage(0);
                  }}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Sol shortcut pills */}
            <div className="hidden xl:flex items-center gap-1 text-[11px] font-mono">
              <span className="text-slate-500">Presets:</span>
              <button onClick={() => { setSol('0'); setPage(0); }} className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800">Sol 0</button>
              <button onClick={() => { setSol('428'); setPage(0); }} className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800">Sol 428</button>
              <button onClick={() => { setSol('1042'); setPage(0); }} className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800">Sol 1042</button>
              <button onClick={() => { setSol('2022'); setPage(0); }} className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800">Sol 2022</button>
            </div>
          </div>
        </div>

        {/* Camera Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs font-mono text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Camera:
          </span>
          {cameraOptions.map(cam => (
            <button
              key={cam.id}
              onClick={() => {
                setCamera(cam.id);
                setPage(0);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                camera === cam.id
                  ? 'bg-cyan-500 text-black font-semibold shadow-md shadow-cyan-950'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              {cam.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Main Gallery Grid */}
      <div className="p-6 max-h-[560px] overflow-y-auto">
        {loading && images.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-9 h-9 text-cyan-400 animate-spin mx-auto" />
            <p className="text-sm font-mono text-cyan-300">
              Querying NASA JPL Mars Raw Observation Archive ({mission === 'mars2020' ? 'Perseverance' : 'Curiosity'})...
            </p>
            <p className="text-xs text-slate-500 font-mono">Resolving authentic mission frames from sol {sol || (order === 'oldest' ? '0' : latestSol)}</p>
          </div>
        ) : error && images.length === 0 ? (
          <div className="py-12 text-center space-y-4 bg-red-950/20 border border-red-900/50 rounded-2xl p-6">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-red-300 font-bold uppercase tracking-tight">Telemetry Signal Interrupted</p>
              <p className="text-xs text-red-400 font-mono max-w-sm mx-auto">{error}</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => fetchRawImages(mission, sol, camera, order, page, limit, false)}
                disabled={loading}
                className="px-6 py-2 bg-red-900/40 hover:bg-red-900/60 text-red-200 text-xs rounded-xl font-bold transition-all cursor-pointer border border-red-800 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{loading ? 'Re-establishing Link...' : 'Retry Connection'}</span>
              </button>
              
              <button 
                onClick={() => window.open('/api/nasa/diagnostics', '_blank')}
                className="text-[10px] text-slate-500 hover:text-slate-300 underline font-mono cursor-pointer"
              >
                View NASA System Diagnostics
              </button>
            </div>
          </div>
        ) : images.length === 0 ? (
          <div className="py-20 text-center space-y-3 text-slate-400">
            <Globe className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-200">No Raw Observations Found</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No matching rover images were found for Sol {sol || 'selected'} with camera filter "{camera}".
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={handleJumpToLatest}
                className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold font-mono transition"
              >
                Reset to Latest (Sol {latestSol})
              </button>
              <button
                onClick={() => {
                  setCamera('ALL');
                  setSol('');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map(img => {
              const fullUrl = img.fullResUrl || img.thumbnailUrl;
              const isSelected = sharedSession.terrainImage === fullUrl;
              const isLoadingThis = loadingImageId === img.id;

              return (
                <div
                  key={img.id}
                  onClick={() => handleSelect(img)}
                  className={`group relative bg-[#090D18] border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-950/80'
                      : 'border-slate-800 hover:border-orange-500/70 hover:shadow-lg hover:shadow-orange-950/30'
                  }`}
                >
                  <div>
                    {/* Image Viewport */}
                    <div className="aspect-video bg-black relative overflow-hidden flex items-center justify-center">
                      <img
                        src={getSafeImageUrl(img.thumbnailUrl || img.fullResUrl)}
                        alt={img.title}
                        onError={e => {
                          const target = e.currentTarget;
                          if (target.src.includes('/api/nasa/proxy-image')) {
                            target.src = img.thumbnailUrl || img.fullResUrl;
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-black/85 backdrop-blur-sm text-[10px] font-mono text-cyan-300 border border-slate-700/80 font-bold">
                          Sol {img.sol}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-sm text-[9px] font-mono text-orange-400 border border-slate-700/80 uppercase">
                          {img.camera}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-cyan-500 text-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 text-[10px] font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>ACTIVE MAP</span>
                        </div>
                      )}

                      {isLoadingThis && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center text-cyan-300 font-mono text-xs gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                          <span>Pre-decoding frame...</span>
                        </div>
                      )}

                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-mono text-slate-400 border border-slate-800">
                        Site {img.site ?? 92} / Drive {img.drive ?? 0}
                      </div>
                    </div>

                    {/* Metadata Content */}
                    <div className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate max-w-[200px]" title={img.title}>
                          {img.cameraFullName || img.title}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {img.dateUtc ? new Date(img.dateUtc).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : `Sol ${img.sol}`}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                        {img.cameraFullName || img.title}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="p-3 pt-2 bg-[#060A14] border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="truncate max-w-[150px]">{img.credit || 'NASA/JPL-Caltech'}</span>
                    <span className="text-orange-400 group-hover:text-orange-300 font-bold group-hover:underline flex items-center gap-1">
                      Load Into Simulator →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Footer Pagination & Actions */}
      <div className="px-6 py-3.5 bg-[#080B14] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <span>Showing {images.length} of {totalResults.toLocaleString()} verified frames</span>
          {isStale && (
            <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800">
              Cached JPL snapshot
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            disabled={page === 0 || loading}
            onClick={() => {
              const prevPage = Math.max(0, page - 1);
              setPage(prevPage);
              fetchRawImages(mission, sol, camera, order, prevPage, limit, false);
            }}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 rounded-lg hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <button
            disabled={loading}
            onClick={handleLoadMore}
            className="px-3.5 py-1.5 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/50 text-xs font-mono text-orange-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1 font-bold"
          >
            <Layers className="w-3.5 h-3.5 text-orange-400" /> Load More (+12)
          </button>

          <button
            disabled={images.length === 0 || loading}
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchRawImages(mission, sol, camera, order, nextPage, limit, false);
            }}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 rounded-lg hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
