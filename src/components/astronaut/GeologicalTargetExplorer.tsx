import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useAstronautExploration, GeologicalTarget } from '../../context/AstronautExplorationContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getTrekTilePreviewUrl } from '../../services/marsGeospatialService';

function getSafeImgSrc(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;
  return `/api/nasa/proxy-image?url=${encodeURIComponent(url)}`;
}

export const GeologicalTargetExplorer: React.FC = () => {
  const {
    activeSession,
    geologicalTargets,
    updateTargetStatus,
    addTargetNote,
    usgsGeology,
    isLoadingGeology,
    geologyError,
    currentCoordinates,
    refreshGeospatialContext
  } = useAstronautExploration();
  const { selectAndLoadDtm, isProcessingDtm } = useWorkspace();

  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [noteText, setNoteText] = useState('');
  const [loadingDtmId, setLoadingDtmId] = useState<string | null>(null);
  const [showInspectionMask, setShowInspectionMask] = useState<boolean>(false);

  useEffect(() => {
    if (geologicalTargets.length > 0 && !geologicalTargets.some(t => t.id === selectedTargetId)) {
      setSelectedTargetId(geologicalTargets[0].id);
    } else if (geologicalTargets.length === 0) {
      setSelectedTargetId('');
    }
  }, [geologicalTargets, selectedTargetId]);

  const activeTarget = geologicalTargets.find(t => t.id === selectedTargetId) || geologicalTargets[0] || null;
  const isCoordsUnavailable =
    Boolean(activeSession.imageMetadata.url) && activeSession.provenance?.coordinateScope === 'unavailable';

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

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Header Banner */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              USGS–NASA PLANETARY GEOLOGIC MAPPING
            </span>
            <span className="text-xs text-cyan-400 font-mono">
              {isCoordsUnavailable
                ? 'Coordinates Unavailable (Visual Target Inspection Only)'
                : usgsGeology?.quadrangle || 'USGS SIM 3292'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Geological Targets &amp; Published Map Units
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Separates (1) Direct USGS SIM 3292 Map Match, (2) Nearby Regional Geologic Context, and (3) Active-Image AI/CV Visual Observations &amp; Provisional Interpretation.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
          <Target className="w-4 h-4 text-emerald-400" />
          <span>Active Frame Targets: <strong className="text-white font-bold">{geologicalTargets.length}</strong></span>
        </div>
      </div>

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
              <span>{geologyError}</span>
            </div>
          )}

          {isCoordsUnavailable ? (
            <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/35 text-xs text-amber-200 space-y-1.5">
              <strong className="font-mono uppercase block text-amber-300">
                No verified geological classification available for this location.
              </strong>
              <p className="text-slate-300">
                The active uploaded image ({activeSession.imageMetadata.fileName}) has no planetocentric lat/lon coordinates, so USGS SIM 3292 map unit lookup cannot be assigned.
              </p>
            </div>
          ) : primaryUnit ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs">
                    Unit {primaryUnit.unitSymbol}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300">
                    {queryLat?.toFixed(3)}°N, {queryLon?.toFixed(3)}°E
                  </span>
                </div>
                <strong className="text-sm text-white block">{primaryUnit.unitName}</strong>
                <div className="text-[11px] font-mono text-cyan-300">
                  Epoch: {primaryUnit.epoch} · Quadrangle: {usgsGeology?.quadrangle || primaryUnit.quadrangle}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{primaryUnit.lithology}</p>
                <div className="text-[10px] font-mono text-slate-400 border-t border-slate-800 pt-2">
                  Provenance: {primaryUnit.citation || primaryUnit.mapSource}
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
                ? 'Retrieving published geologic unit polygons from USGS SIM 3292...'
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
              Regional boundary context requires planetocentric coordinates.
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    ? 'Querying neighboring SIM 3292 units...'
                    : 'No adjacent geological units returned inside the ±2.5° search envelope.'}
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

      {/* SECTION 3: AI/CV VISUAL INTERPRETATION & ACTIVE-IMAGE TARGETS */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              3. AI / CV Visual Interpretation &amp; Active-Image Targets ({geologicalTargets.length})
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {activeSession.imageMetadata.fileName}
          </span>
        </div>

        {terrainReport && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-cyan-500/30 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold block">
                Visually Observed Terrain Evidence
              </span>
              <p className="text-slate-200 leading-relaxed">
                {terrainReport.geologicalIdentification.visuallyDetected.summary}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-amber-500/30 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block">
                Provisional Optical Interpretation (Unverified Mineralogy)
              </span>
              <p className="text-slate-200 leading-relaxed">
                {terrainReport.geologicalIdentification.geologicallyInferred.provisionalSummary}
              </p>
            </div>
          </div>
        )}

        {geologicalTargets.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs font-mono text-slate-400">
            No active-image geological targets yet. Select a NASA Mars rover image or upload a terrain photograph to isolate visual geological targets.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Target Queue */}
            <div className="lg:col-span-5 space-y-3 max-h-[540px] overflow-y-auto pr-1">
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
                      <h4 className="text-xs font-bold text-white">{tgt.name}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                          tgt.status === 'Sample Collected' || tgt.status === 'Completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : tgt.status === 'In Progress'
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : tgt.status === 'Rejected'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {tgt.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-1">{tgt.classification}</p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                      <span>
                        {tgt.lat !== null && tgt.lon !== null
                          ? `${tgt.lat}°N, ${tgt.lon}°E`
                          : typeof tgt.xPct === 'number'
                            ? `Frame X:${tgt.xPct}% Y:${tgt.yPct}%`
                            : 'Coordinates unavailable'}
                      </span>
                      <span className="text-emerald-400 font-bold">Conf {tgt.confidencePct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Target Detail Inspector */}
            {activeTarget && (
              <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">
                      {activeTarget.id}
                      {primaryUnit ? ` · USGS Unit ${primaryUnit.unitSymbol}` : ''}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">{activeTarget.name}</h3>
                  </div>

                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" />
                    <span>
                      {activeTarget.lat !== null && activeTarget.lon !== null
                        ? `${activeTarget.lat}°N, ${activeTarget.lon}°E`
                        : 'Coordinates Unavailable'}
                    </span>
                  </div>
                </div>

                {/* Uncropped object-contain Target Frame Preview with Inspection Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Image Card &amp; Visual Evidence Inspection</span>
                    {activeSession.imageAnalysis.segmentationMaskUrl && (
                      <button
                        type="button"
                        onClick={() => setShowInspectionMask(v => !v)}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer flex items-center gap-1.5 transition-colors ${
                          showInspectionMask
                            ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{showInspectionMask ? 'Showing Segmentation Mask' : 'Inspect Analyzed Mask'}</span>
                      </button>
                    )}
                  </div>

                  <div className="h-60 rounded-xl overflow-hidden relative border border-slate-800 bg-black flex items-center justify-center">
                    <img
                      src={getSafeImgSrc(activeTarget.supportingImage)}
                      alt={activeTarget.name}
                      className="w-full h-full object-contain"
                    />
                    {showInspectionMask && activeSession.imageAnalysis.segmentationMaskUrl && (
                      <img
                        src={activeSession.imageAnalysis.segmentationMaskUrl}
                        alt="Target Segmentation Overlay"
                        className="absolute inset-0 w-full h-full object-contain opacity-65 pointer-events-none"
                      />
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-slate-300">
                      Source: {activeTarget.dataSource} · {activeTarget.instrument}
                    </div>
                    {typeof activeTarget.xPct === 'number' && (
                      <div className="absolute top-2 right-2 bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded border border-emerald-500/30 text-[9px] font-mono text-emerald-300 font-bold">
                        Target Loc: {activeTarget.xPct}% X, {activeTarget.yPct}% Y
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">
                    Update Target Exploration Status
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

                {/* Structured 4-Facet Scientific Evaluation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-300 uppercase block font-bold">Visual Evidence &amp; Morphology</span>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">
                      Angular clast relief and optical reflectance profile indicate {activeTarget.classification.toLowerCase()} with {activeTarget.confidencePct}% localization confidence.
                    </p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-mono text-amber-300 uppercase block font-bold">Provisional Interpretation</span>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">
                      Lithology suggests basaltic or volcaniclastic origin. Contact spectroscopy (APXS/PIXL/SHERLOC) required to confirm petrology.
                    </p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-300 uppercase block font-bold">Scientific Significance</span>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">{activeTarget.relevance}</p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <span className="text-[10px] font-mono text-purple-300 uppercase block font-bold">Recommended Investigation</span>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">{activeTarget.recommendedMethod}</p>
                  </div>
                </div>

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
