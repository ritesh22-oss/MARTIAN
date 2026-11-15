import React, { useState, useEffect, useRef } from 'react';
import {
  Target,
  MapPin,
  FileText,
  Layers,
  ExternalLink,
  Loader2,
  Mountain,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Sparkles,
  Upload,
  Camera,
  Cloud,
  HardDrive,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { useAstronautExploration, GeologicalTarget } from '../../context/AstronautExplorationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { getTrekTilePreviewUrl } from '../../services/marsGeospatialService';

function getSafeImgSrc(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;
  return `/api/nasa/proxy-image?url=${encodeURIComponent(url)}`;
}

type OverlayViewMode = 'selected_region' | 'all_regions' | 'original';

export const GeologicalTargetExplorer: React.FC = () => {
  const {
    activeSession,
    geologicalTargets,
    targetSyncError,
    isProcessingIntelligence,
    processUploadedPhoto,
    retryAiAnalysis,
    updateTargetStatus,
    addTargetNote,
    updateActiveImageCoordinates,
    usgsGeology,
    isLoadingGeology,
    geologyError,
    currentCoordinates,
    refreshGeospatialContext
  } = useAstronautExploration();
  const { selectAndLoadDtm, isProcessingDtm } = useWorkspace();
  const { openAuthModal } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [noteText, setNoteText] = useState('');
  const [loadingDtmId, setLoadingDtmId] = useState<string | null>(null);
  const [overlayMode, setOverlayMode] = useState<OverlayViewMode>('selected_region');
  const [showCoordEditor, setShowCoordEditor] = useState(false);
  const [coordLatInput, setCoordLatInput] = useState('');
  const [coordLonInput, setCoordLonInput] = useState('');
  const [coordError, setCoordError] = useState<string | null>(null);

  useEffect(() => {
    if (geologicalTargets.length > 0 && !geologicalTargets.some(t => t.id === selectedTargetId)) {
      setSelectedTargetId(geologicalTargets[0].id);
    } else if (geologicalTargets.length === 0) {
      setSelectedTargetId('');
    }
  }, [geologicalTargets, selectedTargetId]);

  const activeTarget = geologicalTargets.find(t => t.id === selectedTargetId) || geologicalTargets[0] || null;
  const hasImage = Boolean(activeSession.imageMetadata.url);
  const isCoordsUnavailable = hasImage && activeSession.provenance?.coordinateScope === 'unavailable';
  const isBasinContext = hasImage && activeSession.provenance?.coordinateScope === 'mission_landing_basin';
  const exif = activeSession.imageMetadata.exifMetadata;
  const isFirebaseSignedIn = Boolean(auth.currentUser);

  const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processUploadedPhoto(file);
  };

  const handleApplyManualCoords = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(coordLatInput);
    const lonNum = parseFloat(coordLonInput);
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      setCoordError('Latitude must be between -90 and +90.');
      return;
    }
    if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 360) {
      setCoordError('Longitude must be between -180 and +360.');
      return;
    }
    setCoordError(null);
    updateActiveImageCoordinates(latNum, lonNum);
    setShowCoordEditor(false);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !activeTarget) return;
    addTargetNote(activeTarget.id, noteText.trim());
    setNoteText('');
  };

  const handleSelectTarget = (tgt: GeologicalTarget) => {
    setSelectedTargetId(tgt.id);
    if (tgt.lat !== null && tgt.lon !== null) {
      refreshGeospatialContext(tgt.lat, tgt.lon);
    }
  };

  const handleLoadStacDtm = async (dtm: any) => {
    if (!dtm.dtmUrl) return;
    setLoadingDtmId(dtm.id);
    try {
      await selectAndLoadDtm(dtm, 36);
    } finally {
      setLoadingDtmId(null);
    }
  };

  const statuses: GeologicalTarget['status'][] = [
    'DETECTED',
    'Not Investigated',
    'Planned',
    'In Progress',
    'Sample Collected',
    'Completed',
    'Rejected'
  ];

  const primaryUnit = usgsGeology?.matched && usgsGeology.units?.[0] ? usgsGeology.units[0] : null;
  const nearbyUnits = usgsGeology?.nearbyUnits || [];
  const terrainReport = activeSession.terrainReport;

  const queryLat = !isCoordsUnavailable
    ? (activeTarget?.lat ?? activeSession.provenance?.lat ?? currentCoordinates.lat)
    : null;
  const queryLon = !isCoordsUnavailable
    ? (activeTarget?.lon ?? activeSession.provenance?.lon ?? currentCoordinates.lon)
    : null;

  const geologyMapPreviewUrl =
    queryLat !== null && queryLon !== null
      ? getTrekTilePreviewUrl({
          layerId: 'trek_sim3292_geology',
          lat: queryLat,
          lon: queryLon,
          spanDeg: 2.5,
          width: 480,
          height: 220
        })
      : '';

  const activeMaskOverlaySrc =
    overlayMode === 'selected_region'
      ? activeTarget?.overlayMaskDataUrl || activeSession.imageAnalysis.segmentationMaskUrl || ''
      : overlayMode === 'all_regions'
        ? activeSession.imageAnalysis.segmentationMaskUrl || ''
        : '';

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Header Banner */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              USGS–NASA PLANETARY GEOLOGIC MAPPING
            </span>
            <span className="text-xs text-cyan-400 font-mono">
              {isCoordsUnavailable
                ? 'Coordinates Unavailable (Frame Pixel Analysis Only)'
                : isBasinContext
                  ? `${usgsGeology?.quadrangle || 'USGS SIM 3292'} · Basin-Level Context`
                  : usgsGeology?.quadrangle || 'USGS SIM 3292'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Geological Targets &amp; Published Map Units
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Strictly separates (1) Live USGS SIM 3292 Spatial Query, (2) Adjacent Regional Context, (3) Deterministic Pixel Segmentation Metrics, and (4) Provisional Visual Interpretation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/tiff"
            className="hidden"
            onChange={handleUploadChange}
          />
          <button
            type="button"
            disabled={isProcessingIntelligence}
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
          >
            {isProcessingIntelligence ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{isProcessingIntelligence ? 'Analyzing Image...' : 'Upload Terrain Image'}</span>
          </button>

          {hasImage && (
            <button
              type="button"
              onClick={() => {
                setCoordLatInput(activeSession.provenance?.lat !== null ? String(activeSession.provenance.lat) : '');
                setCoordLonInput(activeSession.provenance?.lon !== null ? String(activeSession.provenance.lon) : '');
                setCoordError(null);
                setShowCoordEditor(v => !v);
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>{isCoordsUnavailable ? 'Assign Coords' : 'Edit Coords'}</span>
            </button>
          )}

          <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Targets: <strong className="text-white font-bold">{geologicalTargets.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Optional Manual Coordinate Assignment Bar */}
      {showCoordEditor && (
        <form
          onSubmit={handleApplyManualCoords}
          className="bg-slate-900/90 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-end gap-3 text-xs font-mono"
        >
          <div className="flex-1 space-y-1">
            <label className="text-[10px] text-amber-300 uppercase font-bold block">
              Mars Planetocentric Latitude (°N, -90 to 90)
            </label>
            <input
              type="text"
              placeholder="e.g. 18.38"
              value={coordLatInput}
              onChange={e => setCoordLatInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] text-amber-300 uppercase font-bold block">
              Mars East Longitude (°E, -180 to 360)
            </label>
            <input
              type="text"
              placeholder="e.g. 77.42"
              value={coordLonInput}
              onChange={e => setCoordLonInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
            >
              Query SIM 3292
            </button>
            <button
              type="button"
              onClick={() => {
                updateActiveImageCoordinates(null, null);
                setShowCoordEditor(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              Clear Coords
            </button>
          </div>
          {coordError && <span className="text-rose-400 text-[11px]">{coordError}</span>}
        </form>
      )}

      {/* SECTION 1 & 2: DIRECT USGS MAP MATCH + NEARBY GEOLOGICAL CONTEXT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 1: Direct USGS Geological Map Match (6 cols) */}
        <div className="lg:col-span-6 bg-[#0B1021] border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                1. Direct USGS Geological Map Match
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              {isLoadingGeology && (
                <span className="text-cyan-300 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Querying SIM 3292...
                </span>
              )}
              <a
                href="https://www.usgs.gov/centers/astrogeology-science-center"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-300 hover:underline flex items-center gap-1"
              >
                <span>USGS Astrogeology</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {geologyError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>USGS SIM 3292 query failed: {geologyError}. No fallback unit assigned.</span>
            </div>
          )}

          {isCoordsUnavailable ? (
            <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/35 text-xs text-amber-200 space-y-1.5">
              <strong className="font-mono uppercase block text-amber-300">
                No verified geological classification available for this location.
              </strong>
              <p className="text-slate-300">
                The active image ({activeSession.imageMetadata.fileName}) has no Mars planetocentric coordinates. USGS SIM 3292 spatial polygon matching is not performed without coordinates.
              </p>
              {exif?.gpsCaveat && (
                <p className="text-[11px] font-mono text-amber-300/90 pt-1">
                  Note: {exif.gpsCaveat}
                </p>
              )}
            </div>
          ) : primaryUnit ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs">
                      Unit {primaryUnit.unitSymbol}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                      {isBasinContext ? 'Basin-Level Context' : 'Live Point-in-Polygon'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300">
                    {queryLat?.toFixed(3)}°N, {queryLon?.toFixed(3)}°E
                  </span>
                </div>
                <strong className="text-sm text-white block">{primaryUnit.unitName}</strong>
                <div className="text-[11px] font-mono text-cyan-300">
                  Epoch: {primaryUnit.epoch} · Quadrangle: {usgsGeology?.quadrangle || primaryUnit.quadrangle}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{primaryUnit.lithology}</p>
                <div className="text-[10px] font-mono text-slate-400 border-t border-slate-800 pt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>CRS: {usgsGeology?.spatialQuery?.crs || 'WKID 104905'}</span>
                  {primaryUnit.featureId !== null && primaryUnit.featureId !== undefined && (
                    <span>Feature FID: {primaryUnit.featureId}</span>
                  )}
                  {primaryUnit.areaKm2 !== null && primaryUnit.areaKm2 !== undefined && (
                    <span>Area: {primaryUnit.areaKm2.toLocaleString()} km²</span>
                  )}
                  <span>Provenance: {primaryUnit.citation || primaryUnit.mapSource}</span>
                </div>
              </div>

              {geologyMapPreviewUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black">
                  <img
                    src={geologyMapPreviewUrl}
                    alt="USGS SIM 3292 Map Layer Cutout"
                    className="w-full h-40 object-contain"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300">
              {isLoadingGeology
                ? 'Retrieving published geologic unit polygons from USGS SIM 3292 (WKID 104905)...'
                : usgsGeology?.note || 'No verified geological classification available for this location.'}
            </div>
          )}
        </div>

        {/* Section 2: Nearby Geological Context & STAC DTMs (6 cols) */}
        <div className="lg:col-span-6 bg-[#0B1021] border border-cyan-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>2. Nearby Geological Context (±2.5° SIM 3292 Envelope)</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {nearbyUnits.length} adjacent unit{nearbyUnits.length === 1 ? '' : 's'}
            </span>
          </div>

          {isCoordsUnavailable ? (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400">
              Regional boundary context requires Mars planetocentric coordinates. Use &ldquo;Assign Coords&rdquo; above if the uploaded frame has known coordinates.
            </div>
          ) : (
            <div className="space-y-3">
              {usgsGeology?.boundariesSummary && (
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300">
                  <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold block mb-1">
                    Boundaries Summary
                  </span>
                  {usgsGeology.boundariesSummary}
                </div>
              )}

              {nearbyUnits.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {nearbyUnits.map(nu => (
                    <div key={nu.unitSymbol} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono text-[10px] font-bold">
                          {nu.unitSymbol}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{nu.epoch}</span>
                      </div>
                      <strong className="text-xs text-white block">{nu.unitName}</strong>
                      <p className="text-[11px] text-slate-400 line-clamp-2">{nu.lithology}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400">
                  {isLoadingGeology
                    ? 'Querying neighboring SIM 3292 polygons...'
                    : 'No adjacent geological units returned inside the ±2.5° envelope.'}
                </div>
              )}

              {usgsGeology?.sim3292Release && (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1.5">
                  <div>
                    DOI: <strong className="text-white">{usgsGeology.sim3292Release.doi}</strong> · Scale:{' '}
                    <strong className="text-white">{usgsGeology.sim3292Release.mapScale}</strong>
                  </div>
                  {usgsGeology.sim3292Release.downloads.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {usgsGeology.sim3292Release.downloads.slice(0, 3).map((dl, idx) => (
                        <a
                          key={idx}
                          href={dl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-950/60 border border-slate-700 text-emerald-300 inline-flex items-center gap-1"
                        >
                          <span>{dl.label}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {usgsGeology?.stacDtms && usgsGeology.stacDtms.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 flex items-center gap-1.5">
                    <Mountain className="w-3.5 h-3.5" />
                    USGS STAC Controlled HiRISE DTMs ({usgsGeology.stacDtms.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {usgsGeology.stacDtms.map(dtm => (
                      <button
                        key={dtm.id}
                        disabled={isProcessingDtm || !dtm.dtmUrl}
                        onClick={() => handleLoadStacDtm(dtm)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-600/30 border border-slate-700 hover:border-cyan-400 text-[10px] font-mono text-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {loadingDtmId === dtm.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        )}
                        <span className="truncate max-w-[180px]">{dtm.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: IMAGE INSPECTOR, PIXEL SEGMENTATION & REGION-LINKED TARGETS */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              3. Image Segmentation, Measured Properties &amp; Provisional Visual Targets ({geologicalTargets.length})
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
            {terrainReport && (
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                {terrainReport.naturalWidth}×{terrainReport.naturalHeight} px · {terrainReport.detectedFormat}
              </span>
            )}
            {terrainReport?.aiAvailable && terrainReport?.modelVersion ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                CV + {terrainReport.modelVersion} (Interactions API)
              </span>
            ) : terrainReport ? (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300">
                FALLBACK: PIXEL-BASED COMPUTER VISION
              </span>
            ) : null}
          </div>
        </div>

        {/* File & EXIF Metadata + Epistemic Separation Strip */}
        {hasImage && terrainReport && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                File &amp; EXIF Metadata ({exif?.exifStatus === 'present' ? `${exif.rawTagCount} tags` : exif?.exifStatus || 'n/a'})
              </span>
              <p className="text-[11px] font-mono text-slate-200 leading-relaxed">
                {exif?.summary || `${activeSession.imageMetadata.fileName} (${terrainReport.naturalWidth}×${terrainReport.naturalHeight} px)`}
              </p>
              {exif && exif.exifStatus === 'present' && (
                <div className="text-[10px] font-mono text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                  {exif.make && <span>Make: {exif.make}</span>}
                  {exif.model && <span>Model: {exif.model}</span>}
                  {exif.exposureTime && <span>Exp: {exif.exposureTime}</span>}
                  {exif.fNumber && <span>f/{exif.fNumber}</span>}
                  {exif.iso && <span>ISO {exif.iso}</span>}
                  {exif.focalLengthMm && <span>{exif.focalLengthMm}mm</span>}
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-1">
              <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold block">
                Measured &amp; Observed Surface Evidence
              </span>
              <p className="text-slate-200 text-xs leading-relaxed">
                {terrainReport.geologicalIdentification.visuallyDetected.summary}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-amber-500/30 space-y-1">
              <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block">
                Provisional Optical Inference (Unverified Mineralogy)
              </span>
              <p className="text-slate-200 text-xs leading-relaxed">
                {terrainReport.geologicalIdentification.geologicallyInferred.provisionalSummary}
              </p>
            </div>
          </div>
        )}

        {terrainReport && !terrainReport.aiAvailable && (
          <div className="p-3 rounded-xl bg-amber-950/35 border border-amber-500/40 text-[11px] font-mono text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-amber-300 tracking-wide">AI ANALYSIS UNAVAILABLE</div>
                <div className="text-cyan-300 font-bold">FALLBACK: PIXEL-BASED COMPUTER VISION</div>
                {terrainReport.aiStatusMessage && (
                  <div className="text-amber-200/90 text-[10px] font-sans pt-0.5">{terrainReport.aiStatusMessage}</div>
                )}
              </div>
            </div>
            {hasImage && (
              <button
                type="button"
                disabled={isProcessingIntelligence}
                onClick={() => retryAiAnalysis()}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-mono text-[10px] font-bold shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isProcessingIntelligence ? 'Retrying AI...' : 'Retry AI Analysis'}
              </button>
            )}
          </div>
        )}

        {targetSyncError && (
          <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/40 text-[11px] font-mono text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{targetSyncError}</span>
          </div>
        )}

        {geologicalTargets.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs font-mono text-slate-400">
            No active-image geological targets yet. Click &ldquo;Upload Terrain Image&rdquo; above or select a NASA Mars rover image to run pixel segmentation.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Target Queue (5 cols) */}
            <div className="lg:col-span-5 space-y-3 max-h-[680px] overflow-y-auto pr-1">
              {geologicalTargets.map(tgt => {
                const isSelected = tgt.id === activeTarget?.id;
                return (
                  <div
                    key={tgt.id}
                    onClick={() => handleSelectTarget(tgt)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {tgt.maskColor && (
                          <span
                            className="w-3 h-3 rounded-sm shrink-0 border border-white/30"
                            style={{ backgroundColor: tgt.maskColor }}
                          />
                        )}
                        <h4 className="text-xs font-bold text-white truncate">{tgt.name}</h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                          tgt.status === 'Sample Collected' || tgt.status === 'Completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : tgt.status === 'In Progress'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : tgt.status === 'Rejected'
                                ? 'bg-rose-500/20 text-rose-300'
                                : tgt.status === 'DETECTED'
                                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {tgt.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className={tgt.isAmbiguous ? 'text-amber-300 font-mono' : 'text-slate-300 truncate'}>
                        {tgt.classification}
                      </span>
                      {typeof tgt.areaPct === 'number' && (
                        <span className="text-[10px] font-mono text-cyan-300 shrink-0 ml-2">
                          {tgt.areaPct}% area
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                      <span>
                        {typeof tgt.xPct === 'number'
                          ? `Center X:${tgt.xPct}% Y:${tgt.yPct}% · ${tgt.shapeAndSpatial?.spatialZone || ''}`
                          : 'Frame pixel region'}
                      </span>
                      <span className="text-slate-400">
                        {tgt.textureAndRoughness ? `Edge ${tgt.textureAndRoughness.edgeDensityPct}%` : tgt.regionId}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Target Detail Inspector (7 cols) */}
            {activeTarget && (
              <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold">
                        {activeTarget.regionId}
                        {primaryUnit ? ` · Regional Map: ${primaryUnit.unitSymbol}` : ''}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 flex items-center gap-1">
                        {isFirebaseSignedIn ? (
                          <>
                            <Cloud className="w-3 h-3 text-emerald-400" />
                            <span>{activeTarget.syncState === 'firestore' ? 'Saved to Firestore' : 'Firestore Synced'}</span>
                          </>
                        ) : (
                          <>
                            <HardDrive className="w-3 h-3 text-amber-400" />
                            <span>Local Cache (Sign in to sync)</span>
                          </>
                        )}
                      </span>
                      {!isFirebaseSignedIn && (
                        <button
                          type="button"
                          onClick={() => openAuthModal('signin')}
                          className="px-2 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-[10px] font-mono text-cyan-200 cursor-pointer"
                        >
                          Sign In for Cloud Sync
                        </button>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white">{activeTarget.name}</h3>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300 flex items-center gap-1.5 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" />
                    <span>
                      {queryLat !== null && queryLon !== null
                        ? `Frame (${activeTarget.xPct}%, ${activeTarget.yPct}%) · Basin ${queryLat.toFixed(2)}°N, ${queryLon.toFixed(2)}°E`
                        : `Frame Pixel (${activeTarget.xPct ?? '?'}% X, ${activeTarget.yPct ?? '?'}% Y)`}
                    </span>
                  </div>
                </div>

                {/* Uncropped Original Image + Interactive Region Highlight Overlay */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                      Original Image &amp; Segmented Region Overlay ({activeTarget.regionId})
                    </span>
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: 'selected_region', label: `Highlight ${activeTarget.regionId}` },
                          { id: 'all_regions', label: 'All Regions' },
                          { id: 'original', label: 'Original Only' }
                        ] as Array<{ id: OverlayViewMode; label: string }>
                      ).map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setOverlayMode(tab.id)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-colors ${
                            overlayMode === tab.id
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-64 rounded-xl overflow-hidden relative border border-slate-800 bg-black flex items-center justify-center">
                    {getSafeImgSrc(activeTarget.supportingImage) ? (
                      <img
                        src={getSafeImgSrc(activeTarget.supportingImage)}
                        alt={activeTarget.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-xs font-mono text-slate-500 px-4 text-center">
                        No supporting terrain frame loaded.
                      </div>
                    )}
                    {overlayMode !== 'original' && activeMaskOverlaySrc && (
                      <img
                        src={activeMaskOverlaySrc}
                        alt={`Segmentation overlay for ${activeTarget.regionId}`}
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      />
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-slate-300">
                      Source: {activeTarget.dataSource} · {activeTarget.instrument}
                    </div>
                    {activeTarget.boundingBox && (
                      <div className="absolute top-2 right-2 bg-slate-950/85 backdrop-blur-md px-2 py-0.5 rounded border border-cyan-500/35 text-[9px] font-mono text-cyan-200 font-bold">
                        BBox: {activeTarget.boundingBox.pixelWidth}×{activeTarget.boundingBox.pixelHeight} px ({activeTarget.areaPct}%)
                      </div>
                    )}
                  </div>

                  {/* Clickable Region Color Legend */}
                  <div className="flex flex-wrap gap-1.5">
                    {geologicalTargets.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTarget(t)}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-mono flex items-center gap-1.5 cursor-pointer ${
                          t.id === activeTarget.id
                            ? 'bg-slate-800 border-cyan-400 text-white'
                            : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: t.maskColor || '#22d3ee' }}
                        />
                        <span>{t.regionId}</span>
                        <span className="text-slate-500">({t.areaPct ?? 0}%)</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Measured Pixel Characteristics for Selected Region */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <span className="text-[10px] font-mono text-cyan-300 uppercase font-bold block">
                    Measured Pixel Metrics ({activeTarget.regionId})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 block uppercase">Region Area</span>
                      <strong className="text-white">{activeTarget.areaPct ?? 0}%</strong>
                      <span className="text-[9px] text-slate-400 block">{(activeTarget.areaPx ?? 0).toLocaleString()} px</span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 block uppercase">Mean RGB &amp; R/B</span>
                      <strong className="text-white">
                        {activeTarget.colorDistribution ? activeTarget.colorDistribution.meanRgb.join(', ') : 'N/A'}
                      </strong>
                      <span className="text-[9px] text-slate-400 block">
                        R/B: {activeTarget.colorDistribution?.redBlueRatio ?? 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 block uppercase">Edge &amp; Texture</span>
                      <strong className="text-white">
                        {activeTarget.textureAndRoughness ? `${activeTarget.textureAndRoughness.edgeDensityPct}% edges` : 'N/A'}
                      </strong>
                      <span className="text-[9px] text-slate-400 block">
                        Roughness: {activeTarget.textureAndRoughness?.roughnessIndex ?? 'N/A'} · σLum: {activeTarget.textureAndRoughness?.luminanceStd ?? 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-400 block uppercase">Shape &amp; BBox</span>
                      <strong className="text-white">
                        {activeTarget.shapeAndSpatial ? `Compact ${activeTarget.shapeAndSpatial.compactness}` : 'N/A'}
                      </strong>
                      <span className="text-[9px] text-slate-400 block">
                        {activeTarget.boundingBox
                          ? `(${activeTarget.boundingBox.pixelX},${activeTarget.boundingBox.pixelY}) ${activeTarget.boundingBox.pixelWidth}×${activeTarget.boundingBox.pixelHeight}`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operator Status Controls */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                    Operator Target Exploration Status (Persisted)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {statuses.map(s => (
                      <button
                        key={s}
                        onClick={() => updateTargetStatus(activeTarget.id, s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                          activeTarget.status === s
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Region-Grounded Scientific & Epistemic Evaluation (Zero Hardcoded Templates) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <span className="text-[10px] font-mono text-cyan-300 uppercase block font-bold">
                      Measured Evidence &amp; Justification
                    </span>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">
                      {activeTarget.visualEvidence || 'Pixel region extracted by deterministic segmentation.'}
                    </p>
                    {activeTarget.classificationJustification && (
                      <p className="text-[11px] text-slate-400 font-mono leading-snug pt-1 border-t border-slate-800">
                        {activeTarget.classificationJustification}
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                    <span className="text-[10px] font-mono text-amber-300 uppercase block font-bold">
                      Provisional Scope &amp; Mineralogy Caveat
                    </span>
                    {activeTarget.isAmbiguous && activeTarget.ambiguityReason && (
                      <p className="text-[11px] font-mono text-amber-200 bg-amber-950/30 border border-amber-500/30 rounded p-1.5">
                        Ambiguity Flag: {activeTarget.ambiguityReason}
                      </p>
                    )}
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">
                      {activeTarget.mineralogyCaveat ||
                        'RGB reflectance imagery cannot confirm mineralogy or lithology without orbital CRISM spectroscopy or contact instruments.'}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                      Method: {activeTarget.processingMethod || 'Deterministic Pixel Segmentation'}
                      {activeTarget.modelVersion ? ` · Model: ${activeTarget.modelVersion}` : ''} · Confidence: Uncalibrated
                    </p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-300 uppercase block font-bold">
                      Scientific Relevance
                    </span>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">{activeTarget.relevance}</p>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-mono text-purple-300 uppercase block font-bold">
                      Recommended Follow-Up Investigation
                    </span>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">{activeTarget.recommendedMethod}</p>
                  </div>
                </div>

                {/* Astronaut & Analysis Notes */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Astronaut &amp; Analysis Notes ({activeTarget.notes.length})</span>
                  </span>
                  {activeTarget.notes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic font-mono">No field notes recorded for this target yet.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-300 font-sans list-disc list-inside">
                      {activeTarget.notes.map((n, i) => (
                        <li key={i} className="bg-slate-900 p-2 rounded-lg border border-slate-800">{n}</li>
                      ))}
                    </ul>
                  )}
                  <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add astronaut observation..."
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Add Note
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
