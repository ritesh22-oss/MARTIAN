import React, { useState, useRef } from 'react';
import { Upload, Radio, Loader2, Search, X, Image as ImageIconLucide, ChevronRight, Camera, Rocket, Check, Eye } from 'lucide-react';
import { fetchMarsRawImages, MarsRawImage } from '../services/nasaDataService';
import {
  ROVER_CAMERA_CATALOG,
  searchNasaImageLibrary,
  fetchNasaImageAssetManifest
} from '../services/nasaPerseveranceImageService';
import { useWorkspace } from '../context/WorkspaceContext';

function getSafeImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;
  return `/api/nasa/proxy-image?url=${encodeURIComponent(url)}`;
}

export default function ImageAcquisitionPanel({ onImageSelected }: { onImageSelected: () => void }) {
  const { updateSharedSession } = useWorkspace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nasaImages, setNasaImages] = useState<MarsRawImage[]>([]);
  const [loadingNasa, setLoadingNasa] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [resolvingAsset, setResolvingAsset] = useState<boolean>(false);
  const [nasaBrowserOpen, setNasaBrowserOpen] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<MarsRawImage | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Pagination state
  const [selectedMission, setSelectedMission] = useState<string>('mars2020');
  const [selectedCamera, setSelectedCamera] = useState<string>('ALL');
  const [solFilter, setSolFilter] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    updateSharedSession({
      terrainImage: url,
      imageProvenance: {
        source: `User Upload (${file.name})`,
        rover: 'N/A',
        camera: 'N/A',
        sol: 0,
        acquisitionUtc: new Date().toISOString(),
        identifier: file.name,
        sourceUrl: url,
        coordinateScope: 'unavailable',
        selectionOrigin: 'upload'
      }
    });
    onImageSelected();
  };

  const loadNasaImages = async (reset = false) => {
    const pageToFetch = reset ? 0 : currentPage;
    if (reset) {
      setLoadingNasa(true);
      setNasaImages([]);
    } else {
      setLoadingMore(true);
    }
    setErrorMsg(null);

    try {
      if (selectedMission === 'library') {
        const libPage = pageToFetch + 1;
        const libRes = await searchNasaImageLibrary({
          query: searchKeyword.trim() || 'Mars Rover Jezero Gale',
          page: libPage,
          pageSize: 24
        });
        const mapped: MarsRawImage[] = libRes.items.map(item => ({
          id: item.nasaId,
          imageid: item.nasaId,
          title: item.title,
          sol: 0,
          camera: 'NASA_LIB',
          cameraFullName: item.center || 'NASA Image & Video Library',
          dateUtc: item.dateCreated,
          dateMars: '',
          thumbnailUrl: item.thumbnailUrl,
          fullResUrl: item.resolvedFullResUrl || item.thumbnailUrl,
          sourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(item.nasaId)}`,
          credit: item.credit || 'NASA',
          mission: 'NASA Image Library',
          targetRegion: 'Mars',
          dataSourceType: 'nasa_images_library',
          nasaId: item.nasaId,
          assetManifestUrl: item.assetManifestApiUrl,
          description: item.description
        }));
        setNasaImages(prev => {
          const existingIds = new Set(prev.map(img => img.imageid));
          const fresh = mapped.filter(img => !existingIds.has(img.imageid));
          return reset ? mapped : [...prev, ...fresh];
        });
        setTotalResults(libRes.totalHits);
        setCurrentPage(pageToFetch + 1);
        setHasMore(libRes.hasMore);
      } else {
        const result = await fetchMarsRawImages({
          mission: selectedMission as any,
          camera: selectedCamera,
          sol: solFilter.trim() !== '' ? solFilter : undefined,
          order: sortOrder,
          limit: 24,
          page: pageToFetch,
          search: searchKeyword.trim() !== '' ? searchKeyword.trim() : undefined
        });

        if (result && result.images) {
          setNasaImages(prev => {
            const existingIds = new Set(prev.map(img => img.imageid));
            const fresh = result.images.filter(img => !existingIds.has(img.imageid));
            return reset ? result.images : [...prev, ...fresh];
          });
          setTotalResults(result.totalResults || result.images.length);
          setCurrentPage(pageToFetch + 1);
          setHasMore(result.images.length >= 12);
        } else {
          if (reset) {
            setNasaImages([]);
            setTotalResults(0);
          }
          setHasMore(false);
        }
      }
    } catch (err: any) {
      console.warn('Failed fetching NASA raw images:', err);
      setErrorMsg(err.message || 'Failed to connect to NASA raw image feed.');
    } finally {
      setLoadingNasa(false);
      setLoadingMore(false);
    }
  };

  const openNasaBrowser = () => {
    setNasaBrowserOpen(true);
    if (nasaImages.length === 0) {
      loadNasaImages(true);
    }
  };

  const handleFilterApply = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    loadNasaImages(true);
  };

  const handleOpenPreview = async (img: MarsRawImage) => {
    setPreviewImage(img);
    if (img.dataSourceType === 'nasa_images_library' && img.nasaId) {
      setResolvingAsset(true);
      try {
        const manifest = await fetchNasaImageAssetManifest(img.nasaId);
        const bestUrl = manifest.largeUrl || manifest.origUrl || manifest.mediumUrl || img.fullResUrl;
        if (bestUrl) {
          setPreviewImage(prev => (prev && prev.id === img.id ? { ...prev, fullResUrl: bestUrl } : prev));
        }
      } catch {
        // Keep preview fallback URL cleanly
      } finally {
        setResolvingAsset(false);
      }
    }
  };

  const selectNasaImage = (img: MarsRawImage) => {
    const camLabel = typeof img.cameraFullName === 'string' && img.cameraFullName ? img.cameraFullName : String(img.camera || 'NAVCAM');
    const selectedUrl = img.fullResUrl || img.thumbnailUrl;
    updateSharedSession({
      terrainImage: selectedUrl,
      imageProvenance: {
        source: `NASA Mars Feed (${img.mission} - ${img.camera})`,
        rover: img.mission,
        camera: camLabel,
        sol: img.sol || 0,
        acquisitionUtc: img.dateUtc || new Date().toISOString(),
        identifier: img.imageid || img.id,
        sourceUrl: img.sourceUrl || selectedUrl,
        site: img.site,
        drive: img.drive,
        targetRegion: img.targetRegion,
        lat: img.nominalSiteCoords?.lat,
        lon: img.nominalSiteCoords?.lon,
        coordinateScope: img.nominalSiteCoords?.coordinateScope || 'unavailable',
        locationLabel: img.nominalSiteCoords?.label,
        selectionOrigin: 'nasa'
      }
    });
    setPreviewImage(null);
    setNasaBrowserOpen(false);
    onImageSelected();
  };

  const cameraOptions = ROVER_CAMERA_CATALOG[selectedMission] || ROVER_CAMERA_CATALOG.all;

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-6 py-8 w-full max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center shadow-2xl">
          <ImageIconLucide className="w-10 h-10 text-cyan-400/70" />
        </div>
        <h3 className="text-white font-bold text-sm tracking-tight">Active Image Acquisition</h3>
        <p className="text-slate-400 text-xs font-mono mt-1 leading-relaxed max-w-xs">
          Upload a local terrain file or browse thousands of live raw Mars imagery records across multiple NASA rovers.
        </p>
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="group w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-950/60 to-amber-950/40 border border-orange-500/40 hover:border-orange-400/70 transition-all shadow-lg cursor-pointer text-left"
      >
        <Upload className="w-5 h-5 text-orange-300" />
        <div>
          <span className="block text-orange-200 font-bold text-xs uppercase">Upload Image</span>
          <span className="block text-slate-400 text-[11px] font-mono">PNG, JPG, TIFF, WEBP</span>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </button>

      <button
        onClick={openNasaBrowser}
        className="group w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 to-teal-950/40 border border-cyan-500/40 hover:border-cyan-400/70 transition-all shadow-lg cursor-pointer text-left"
      >
        <Radio className="w-5 h-5 text-cyan-300 animate-pulse" />
        <div className="flex-1">
          <span className="block text-cyan-200 font-bold text-xs uppercase">Fetch NASA Imagery</span>
          <span className="block text-slate-400 text-[11px] font-mono">Perseverance · Curiosity · Opportunity · Spirit</span>
        </div>
        <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
      </button>

      {/* ADVANCED NASA IMAGE BROWSER MODAL */}
      {nasaBrowserOpen && (
        <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md p-4 sm:p-8 flex flex-col overflow-hidden">
          <div className="max-w-7xl w-full mx-auto bg-[#090D1A] rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col flex-1 max-h-[92vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm sm:text-base">NASA Planetary Rover Image Archive</h2>
                  <p className="text-slate-400 text-xs font-mono">
                    Select a raw camera frame for intelligent MARSWALK OPS analysis
                    {totalResults > 0 && ` · ${totalResults.toLocaleString()} archive results`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNasaBrowserOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Toolbar */}
            <form onSubmit={handleFilterApply} className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Rover Select */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Rover / Archive</label>
                  <select
                    value={selectedMission}
                    onChange={e => {
                      setSelectedMission(e.target.value);
                      setSelectedCamera('ALL');
                    }}
                    className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-cyan-500"
                  >
                    <option value="all">All Rovers (Combined)</option>
                    <option value="mars2020">Perseverance (Mars 2020)</option>
                    <option value="msl">Curiosity (MSL)</option>
                    <option value="opportunity">Opportunity (MER-B)</option>
                    <option value="spirit">Spirit (MER-A)</option>
                    <option value="library">NASA Image &amp; Video Library</option>
                  </select>
                </div>

                {/* Camera Select */}
                {selectedMission !== 'library' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Camera Instrument</label>
                    <select
                      value={selectedCamera}
                      onChange={e => setSelectedCamera(e.target.value)}
                      className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-cyan-500"
                    >
                      {cameraOptions.map(cam => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Sol Filter */}
                {selectedMission !== 'library' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Sol / Martian Day</label>
                    <input
                      type="number"
                      placeholder="e.g. 428"
                      value={solFilter}
                      onChange={e => setSolFilter(e.target.value)}
                      className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-cyan-500 w-24"
                    />
                  </div>
                )}

                {/* Keyword Search */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase">Keyword / Site</label>
                  <input
                    type="text"
                    placeholder={selectedMission === 'library' ? 'e.g. Jezero delta' : 'Optional keyword'}
                    value={searchKeyword}
                    onChange={e => setSearchKeyword(e.target.value)}
                    className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-cyan-500 w-40"
                  />
                </div>

                {/* Sort Order */}
                {selectedMission !== 'library' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-400 uppercase">Sort Order</label>
                    <select
                      value={sortOrder}
                      onChange={e => setSortOrder(e.target.value as any)}
                      className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:border-cyan-500"
                    >
                      <option value="newest">Newest Sol First</option>
                      <option value="oldest">Oldest Sol First</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loadingNasa}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-md mt-4 sm:mt-0"
              >
                {loadingNasa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Query Archive</span>
              </button>
            </form>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mx-6 mt-4 p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            {/* Image Grid Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {loadingNasa && nasaImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400 font-mono">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  <span>Connecting to NASA Planetary Data Feed...</span>
                </div>
              ) : nasaImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400 font-mono text-center">
                  <Camera className="w-8 h-8 text-slate-600" />
                  <span>No raw images found matching the selected filters. Try broadening your criteria.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {nasaImages.map((img, index) => {
                    const thumbSrc = img.thumbnailUrl || img.fullResUrl;
                    const cameraLabel = typeof img.camera === 'string' ? img.camera : 'NAVCAM';
                    return (
                      <div
                        key={img.imageid || `${img.sol}_${index}`}
                        onClick={() => handleOpenPreview(img)}
                        className="group bg-slate-900/80 border border-slate-800 hover:border-cyan-500/60 rounded-xl overflow-hidden shadow-lg cursor-pointer transition-all flex flex-col"
                      >
                        <div className="relative aspect-video bg-black/60 overflow-hidden">
                          {getSafeImageUrl(thumbSrc) && (
                            <img
                              src={getSafeImageUrl(thumbSrc)}
                              alt={img.title}
                              onError={e => {
                                const el = e.currentTarget;
                                if (el.src.includes('/api/nasa/proxy-image') && thumbSrc) {
                                  el.src = thumbSrc;
                                }
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          )}
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-500/30">
                            {img.sol > 0 ? `Sol ${img.sol}` : img.nasaId || 'NASA Archive'}
                          </div>
                        </div>
                        <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                          <div>
                            <span className="text-[10px] font-mono text-orange-400 block truncate">{img.mission}</span>
                            <h4 className="text-white text-xs font-bold line-clamp-1 mt-0.5" title={img.title}>{img.title}</h4>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                            <span className="truncate">{cameraLabel}</span>
                            <span className="text-cyan-400 flex items-center gap-1 group-hover:underline">
                              <Eye className="w-3 h-3" /> Preview
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Load More Button */}
              {!loadingNasa && nasaImages.length > 0 && hasMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => loadNasaImages(false)}
                    disabled={loadingMore}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md"
                  >
                    {loadingMore && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                    <span>Load More NASA Imagery ({nasaImages.length} loaded)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMAGE PREVIEW & CONFIRM MODAL */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg p-4 sm:p-8 flex items-center justify-center overflow-y-auto">
          <div className="max-w-3xl w-full bg-[#090D1A] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
              <div>
                <span className="text-[10px] font-mono text-orange-400 uppercase">{previewImage.mission}</span>
                <h3 className="text-white font-bold text-sm sm:text-base">{previewImage.title}</h3>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {getSafeImageUrl(previewImage.fullResUrl || previewImage.thumbnailUrl) && (
                  <img
                    src={getSafeImageUrl(previewImage.fullResUrl || previewImage.thumbnailUrl)}
                    alt={previewImage.title}
                    onError={e => {
                      const el = e.currentTarget;
                      const fallback = previewImage.fullResUrl || previewImage.thumbnailUrl;
                      if (el.src.includes('/api/nasa/proxy-image') && fallback) {
                        el.src = fallback;
                      }
                    }}
                    className="max-h-[50vh] object-contain"
                  />
                )}
                {resolvingAsset && (
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-black/80 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 border border-cyan-500/30">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Resolving full-res asset...</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Sol / ID</span>
                  <span className="text-white font-bold">{previewImage.sol > 0 ? `Sol ${previewImage.sol}` : previewImage.imageid}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Camera</span>
                  <span className="text-cyan-300 font-bold">
                    {typeof previewImage.cameraFullName === 'string' && previewImage.cameraFullName
                      ? previewImage.cameraFullName
                      : String(previewImage.camera || 'NAVCAM')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Capture UTC</span>
                  <span className="text-slate-300">{previewImage.dateUtc ? previewImage.dateUtc.split('T')[0] : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Credit</span>
                  <span className="text-slate-300 truncate block">{previewImage.credit}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setPreviewImage(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectNasaImage(previewImage)}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg"
                >
                  <Check className="w-4 h-4" />
                  <span>Load Into Marswalk Ops</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
