import React, { useRef, useState } from 'react';
import {
  Footprints,
  Cpu,
  Activity,
  Info,
  AlertTriangle,
  CheckCircle2,
  Upload,
  FileText,
  SlidersHorizontal,
  Trash2,
  RotateCcw,
  ShieldCheck,
  X,
  Compass,
  BatteryCharging,
  HelpCircle,
} from 'lucide-react';
import { useAstronautExploration, SuitConfigType } from '../../context/AstronautExplorationContext';
import {
  SuitConfigId,
  SuitFieldKey,
  FIELD_DEFINITIONS,
  SUIT_CONFIG_META,
  ParsedSuitImportResult,
  FieldProvenance,
  parseSuitDataFile,
  MARS_REFERENCE_GRAVITY_MS2,
} from '../../services/suitMobilityEngine';

const CONFIG_ORDER: SuitConfigType[] = ['standard', 'science-payload', 'heavy-sample-collection'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getSourceLabel(prov: FieldProvenance): { text: string; toneClass: string } {
  if (prov.status === 'missing' || prov.normalizedValue === null) {
    return { text: 'Missing Data', toneClass: 'text-slate-500' };
  }
  if (prov.status === 'error') {
    return { text: prov.warningMessage || 'Invalid Input', toneClass: 'text-rose-400' };
  }
  if (prov.sourceType === 'uploaded_file') {
    return {
      text: `Uploaded (${prov.source})${prov.originalUnit && prov.originalUnit !== prov.unit ? ` · converted from ${prov.originalUnit}` : ''}`,
      toneClass: prov.status === 'warning' ? 'text-amber-300' : 'text-cyan-300',
    };
  }
  if (prov.sourceType === 'reference_constant') {
    return { text: `Reference: ${prov.source}`, toneClass: 'text-purple-300' };
  }
  return {
    text: prov.status === 'warning' && prov.warningMessage ? prov.warningMessage : 'Manual Entry',
    toneClass: prov.status === 'warning' ? 'text-amber-300' : 'text-emerald-300',
  };
}

export const SuitMobilityAnalysis: React.FC = () => {
  const {
    suitConfig,
    setSuitConfig,
    suitConfigs,
    environmentGravity,
    customRouteDistanceM,
    setCustomRouteDistanceM,
    customTerrainSlopeDeg,
    setCustomTerrainSlopeDeg,
    useReferenceBaseMetabolic,
    setUseReferenceBaseMetabolic,
    suitPhysicsByConfig,
    activeSuitPhysics,
    updateSuitConfigField,
    updateEnvironmentGravity,
    resetEnvironmentGravityToMarsRef,
    applySuitImport,
    clearSuitConfigData,
    loadNasaReferenceProfile,
    activeSession,
    routes,
    selectedRouteId,
  } = useAstronautExploration();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const manualEditorRef = useRef<HTMLDivElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [showManualEditor, setShowManualEditor] = useState(false);
  const [manualCategoryTab, setManualCategoryTab] = useState<'mass' | 'mobility' | 'life-support' | 'metabolic'>('mass');
  const [parseProgress, setParseProgress] = useState<number>(0);
  const [parsedPreview, setParsedPreview] = useState<ParsedSuitImportResult | null>(null);
  const [singleTargetConfig, setSingleTargetConfig] = useState<SuitConfigId>(suitConfig);
  const [resolvedAmbiguities, setResolvedAmbiguities] = useState<
    Record<string, { targetField: SuitFieldKey | 'gravityMs2' | 'ignore'; unitOverride?: string }>
  >({});
  const [resolvedConflicts, setResolvedConflicts] = useState<Record<string, number>>({});
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeRecord = suitConfigs[suitConfig];
  const activeMeta = SUIT_CONFIG_META[suitConfig];
  const activeRoute = activeSession.activeRoute || routes[selectedRouteId];
  const activeRouteDistanceM = customRouteDistanceM ?? activeRoute?.distanceM ?? null;
  const activeTerrainSlopeDeg = customTerrainSlopeDeg ?? activeSession.terrainAnalysis?.slopeMaxDeg ?? activeRoute?.maxSlopeDeg ?? null;

  const handleSelectedFile = async (file: File) => {
    setImportFeedback(null);
    setParseProgress(25);
    try {
      const content = await file.text();
      setParseProgress(70);
      const parsed = parseSuitDataFile({
        name: file.name,
        size: file.size,
        content,
        activeConfigId: suitConfig,
      });

      const initialAmbiguities: Record<string, { targetField: SuitFieldKey | 'gravityMs2' | 'ignore'; unitOverride?: string }> = {};
      parsed.ambiguousItems.forEach((amb) => {
        initialAmbiguities[amb.id] = {
          targetField: amb.suggestedField || 'ignore',
          unitOverride: amb.suggestedUnit || amb.rawUnit,
        };
      });

      const initialConflicts: Record<string, number> = {};
      parsed.duplicateConflicts.forEach((c) => {
        initialConflicts[c.id] = 0;
      });

      setSingleTargetConfig(parsed.defaultSingleTargetConfig || suitConfig);
      setResolvedAmbiguities(initialAmbiguities);
      setResolvedConflicts(initialConflicts);
      setParsedPreview(parsed);
      setParseProgress(100);
    } catch (err: any) {
      setParseProgress(0);
      setParsedPreview(null);
      setImportFeedback({
        type: 'error',
        message: err?.message || `Failed to read file "${file.name}". Existing configuration data was preserved.`,
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectedFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleSelectedFile(file);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedPreview || !parsedPreview.parseSuccess) return;
    const { updatedConfigIds, appliedCount } = applySuitImport(parsedPreview, {
      singleTargetConfig,
      resolvedAmbiguities,
      resolvedConflicts,
    });
    if (updatedConfigIds.length === 1) {
      setSuitConfig(updatedConfigIds[0]);
    }
    setParsedPreview(null);
    setParseProgress(0);
    setImportFeedback({
      type: 'success',
      message: `Applied ${appliedCount} validated parameter${appliedCount === 1 ? '' : 's'} from "${parsedPreview.fileName}" to ${
        updatedConfigIds.length > 0
          ? updatedConfigIds.map((id) => SUIT_CONFIG_META[id].shortLabel).join(', ')
          : 'Environment Parameters'
      }. Other configurations were preserved untouched.`,
    });
  };

  const handleOpenManualEditor = () => {
    setShowManualEditor(true);
    setTimeout(() => {
      manualEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const renderFieldInput = (fieldKey: SuitFieldKey) => {
    const def = FIELD_DEFINITIONS[fieldKey];
    const prov = activeRecord.fields[fieldKey];
    const srcMeta = getSourceLabel(prov);
    const inputVal = prov.normalizedValue !== null ? String(prov.normalizedValue) : '';

    return (
      <div
        key={fieldKey}
        className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5"
      >
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-slate-200">{def.label}</label>
          <span className="text-[11px] font-mono text-slate-400">{def.canonicalUnit}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step={def.step}
            min={def.min}
            value={inputVal}
            placeholder="Missing Data"
            onChange={(e) => {
              const raw = e.target.value;
              updateSuitConfigField(suitConfig, fieldKey, raw === '' ? null : raw, def.canonicalUnit);
            }}
            className="w-full bg-[#070B18] border border-slate-700 focus:border-cyan-400 focus:outline-none rounded-lg px-3 py-1.5 text-sm font-mono tabular-nums text-white placeholder:text-slate-600"
          />
          {prov.normalizedValue !== null && (
            <button
              type="button"
              onClick={() => updateSuitConfigField(suitConfig, fieldKey, null)}
              title={`Clear ${def.label}`}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
          <span className="text-slate-500 truncate" title={def.hint}>
            {def.hint}
          </span>
          <span className={`${srcMeta.toneClass} shrink-0 truncate max-w-[180px]`} title={srcMeta.text}>
            {srcMeta.text}
          </span>
        </div>
      </div>
    );
  };

  // Determine fields visible in manual editor category tab
  const massFieldsForActive = activeMeta.visibleMassFields.concat(['reportedTotalMassKg']);
  const mobilityFields: SuitFieldKey[] = ['maxWalkingSpeedMs', 'maxSlopeDeg', 'suitPressureKpa'];
  const lifeSupportFields: SuitFieldKey[] = [
    'lifeSupportCapacityHrs',
    'plannedEvaDurationHrs',
    'measuredReserveHrs',
    'batteryCapacityWh',
    'lifeSupportPowerWatts',
  ];
  const metabolicFields: SuitFieldKey[] = [
    'metabolicBaseWatts',
    'measuredWalkingWatts',
    'measuredInclineWatts',
    'measuredInclineAngleDeg',
  ];

  // Cross-config comparison scaling max values
  const maxMassAll = Math.max(
    1,
    ...CONFIG_ORDER.map((id) => suitPhysicsByConfig[id].mass.totalMassKg ?? 0)
  );
  const maxSpeedAll = Math.max(
    0.1,
    ...CONFIG_ORDER.map((id) => suitPhysicsByConfig[id].mobility.maxSpeedMs ?? 0)
  );
  const maxWattsAll = Math.max(
    1,
    ...CONFIG_ORDER.map(
      (id) =>
        suitPhysicsByConfig[id].metabolic.uploadedWalkingWatts ??
        suitPhysicsByConfig[id].metabolic.modeledFlatWatts ??
        0
    )
  );

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
            <span className="font-bold text-purple-300 uppercase tracking-wider">
              Spacesuit Mobility &amp; Traversability Model
            </span>
            <span aria-hidden="true">·</span>
            <span>Dynamic Bio-Mechanical Kinematics Engine</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Human Spacesuit Mobility &amp; Load Payload Configuration
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Upload astronaut and suit telemetry (.json / .txt) or enter specifications manually. All mass, gravity,
            traversal feasibility, metabolic expenditure, and reserve calculations update in real time with full provenance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono tabular-nums">
            <Footprints className="w-4 h-4 text-purple-400" />
            <span>
              Active Weight:{' '}
              {activeSuitPhysics.gravity.marsWeightN !== null && activeSuitPhysics.gravity.earthEquivalentKgf !== null ? (
                <strong className="text-purple-300 font-bold">
                  {activeSuitPhysics.gravity.marsWeightN.toFixed(1)} N ({activeSuitPhysics.gravity.earthEquivalentKgf.toFixed(1)} kg_f)
                </strong>
              ) : (
                <strong className="text-slate-500">Missing Mass Data</strong>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* UPLOAD ASTRONAUT / SUIT DATA PANEL */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Upload Astronaut / Suit Data
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Drop a structured JSON or labeled TXT telemetry sheet, or enter parameters manually for each suit configuration.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadNasaReferenceProfile}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-purple-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              Load NASA Reference Profile
            </button>
            <button
              type="button"
              onClick={() => clearSuitConfigData()}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Data</span>
            </button>
          </div>
        </div>

        {/* Drag-and-drop upload surface */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`rounded-xl border border-dashed p-5 transition-all duration-200 flex flex-col md:flex-row items-center justify-between gap-4 ${
            isDragging
              ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
              : 'border-slate-700 bg-slate-900/50 hover:border-cyan-500/50'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-transform duration-300 ${
                isDragging
                  ? 'scale-105 bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.15)]'
              }`}
            >
              <Upload className="w-5 h-5 animate-bounce" style={{ animationDuration: '2.6s' }} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-white">
                Drag and drop <span className="font-mono text-cyan-300">.json</span> or{' '}
                <span className="font-mono text-cyan-300">.txt</span> suit configuration file
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Supports multi-config &amp; single-config files · Automatic unit normalization (lb→kg, km/h→m/s, psi→kPa, min→hr)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.txt,application/json,text/plain"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-4 h-4" />
              <span>Upload JSON / TXT</span>
            </button>
            <button
              type="button"
              onClick={handleOpenManualEditor}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4 text-purple-300" />
              <span>Enter Data Manually</span>
            </button>
          </div>
        </div>

        {/* Apply / Read Feedback */}
        {importFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 ${
              importFeedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {importFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{importFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setImportFeedback(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Parsed Preview, Validation, Ambiguity Resolution & Confirm Panel */}
        {parsedPreview && (
          <div className="rounded-xl border border-slate-700 bg-[#070B18] p-4 space-y-4">
            {/* Metadata & Progress */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-white font-bold">{parsedPreview.fileName}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{formatFileSize(parsedPreview.fileSizeBytes)}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-cyan-300 font-bold">Format: {parsedPreview.detectedFormat}</span>
                  <span className="text-slate-500">·</span>
                  <span
                    className={
                      parsedPreview.parseSuccess
                        ? parsedPreview.ambiguousItems.length > 0 || parsedPreview.duplicateConflicts.length > 0
                          ? 'text-amber-300 font-bold'
                          : 'text-emerald-400 font-bold'
                        : 'text-rose-400 font-bold'
                    }
                  >
                    {parsedPreview.parseSuccess
                      ? parsedPreview.ambiguousItems.length > 0 || parsedPreview.duplicateConflicts.length > 0
                        ? 'Needs Field Confirmation'
                        : 'Validated & Ready'
                      : 'Parse Error — Existing Data Preserved'}
                  </span>
                </div>
                {parseProgress > 0 && (
                  <div className="w-56 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        parsedPreview.parseSuccess ? 'bg-cyan-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${parseProgress}%` }}
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setParsedPreview(null);
                  setParseProgress(0);
                }}
                className="text-xs font-mono text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <X className="w-4 h-4" />
                <span>Discard File</span>
              </button>
            </div>

            {/* Parse Errors */}
            {parsedPreview.errors.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-1 text-xs font-mono text-rose-300">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Extraction Errors ({parsedPreview.errors.length})</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-rose-200/90">
                  {parsedPreview.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Range / Unit Warnings */}
            {parsedPreview.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs font-mono text-amber-300">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  <span>Validation Notices ({parsedPreview.warnings.length})</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-200/90">
                  {parsedPreview.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Single-Config Target Selector */}
            {parsedPreview.parseSuccess && parsedPreview.detectedConfigMode === 'single' && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-semibold text-white block">Single-Configuration Dataset Detected</span>
                  <span className="text-slate-400">
                    Select which configuration receives these values. The other two configurations remain untouched.
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CONFIG_ORDER.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSingleTargetConfig(id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                        singleTargetConfig === id
                          ? 'bg-purple-500 text-white font-bold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {SUIT_CONFIG_META[id].shortLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ambiguous Field Confirmation */}
            {parsedPreview.ambiguousItems.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4" />
                  <span>Ambiguous Fields Requiring Confirmation ({parsedPreview.ambiguousItems.length})</span>
                </div>
                {parsedPreview.ambiguousItems.map((amb) => {
                  const selection = resolvedAmbiguities[amb.id] || {
                    targetField: amb.suggestedField || 'ignore',
                    unitOverride: amb.suggestedUnit || amb.rawUnit,
                  };
                  return (
                    <div key={amb.id} className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-white font-semibold">
                          "{amb.rawKey}": <span className="text-cyan-300">{String(amb.rawValue)}</span>
                        </span>
                        <span className="text-slate-400 font-mono">
                          Scope: {amb.configScope === 'single_target' ? SUIT_CONFIG_META[singleTargetConfig].shortLabel : amb.configScope}
                        </span>
                      </div>
                      <p className="text-slate-400">{amb.reason}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={`${selection.targetField}::${selection.unitOverride || ''}`}
                          onChange={(e) => {
                            const [field, unit] = e.target.value.split('::');
                            setResolvedAmbiguities((prev) => ({
                              ...prev,
                              [amb.id]: {
                                targetField: field as SuitFieldKey | 'gravityMs2' | 'ignore',
                                unitOverride: unit || undefined,
                              },
                            }));
                          }}
                          className="bg-[#070B18] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                        >
                          {amb.candidateFields.map((cand, idx) => (
                            <option key={idx} value={`${cand.key}::${cand.unit || amb.rawUnit || ''}`}>
                              {cand.label}
                            </option>
                          ))}
                          <option value="ignore::">Ignore / Do Not Import</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Duplicate Conflicts */}
            {parsedPreview.duplicateConflicts.length > 0 && (
              <div className="space-y-2.5">
                <div className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Duplicate Conflicting Entries ({parsedPreview.duplicateConflicts.length})</span>
                </div>
                {parsedPreview.duplicateConflicts.map((conflict) => {
                  const chosenIdx = resolvedConflicts[conflict.id] ?? 0;
                  return (
                    <div key={conflict.id} className="p-3 rounded-lg bg-slate-900 border border-amber-500/30 space-y-2 text-xs font-mono">
                      <div className="text-white font-semibold">
                        Conflicting entries for {conflict.targetLabel} ({conflict.configScope}):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {conflict.entries.map((opt, idx) => (
                          <label
                            key={idx}
                            className={`px-3 py-1.5 rounded-lg border cursor-pointer flex items-center gap-2 ${
                              chosenIdx === idx
                                ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200'
                                : 'bg-[#070B18] border-slate-700 text-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={conflict.id}
                              checked={chosenIdx === idx}
                              onChange={() => setResolvedConflicts((prev) => ({ ...prev, [conflict.id]: idx }))}
                            />
                            <span>
                              {opt.lineOrPath}: {opt.normalizedValue} {opt.unit}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Extracted Fields Preview Table */}
            {parsedPreview.entries.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                  Extracted Field Mapping Preview ({parsedPreview.entries.length})
                </div>
                <div className="max-h-56 overflow-y-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono tabular-nums">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Target Scope</th>
                        <th className="py-2 px-3">Mapped Field</th>
                        <th className="py-2 px-3">Raw Input</th>
                        <th className="py-2 px-3">Normalized Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {parsedPreview.entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 text-slate-400">
                            {entry.configScope === 'environment'
                              ? 'Environment'
                              : entry.configScope === 'single_target'
                              ? SUIT_CONFIG_META[singleTargetConfig].shortLabel
                              : SUIT_CONFIG_META[entry.configScope].shortLabel}
                          </td>
                          <td className="py-2 px-3 text-white">{entry.label}</td>
                          <td className="py-2 px-3 text-slate-400">
                            {String(entry.rawValue)} ({entry.originalUnit})
                          </td>
                          <td className={`py-2 px-3 font-bold ${entry.status === 'warning' ? 'text-amber-300' : 'text-cyan-300'}`}>
                            {entry.normalizedValue} {entry.canonicalUnit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Confirm Action Footer */}
            {parsedPreview.parseSuccess && (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setParsedPreview(null);
                    setParseProgress(0);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm &amp; Apply Extracted Data</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configuration Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CONFIG_ORDER.map((cfgKey) => {
          const meta = SUIT_CONFIG_META[cfgKey];
          const record = suitConfigs[cfgKey];
          const physics = suitPhysicsByConfig[cfgKey];
          const isSelected = suitConfig === cfgKey;

          return (
            <div
              key={cfgKey}
              onClick={() => setSuitConfig(cfgKey)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                isSelected
                  ? 'bg-purple-500/15 border-purple-500/60 shadow-xl shadow-purple-950/30'
                  : 'bg-[#0B1021] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    isSelected ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {meta.code}
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-purple-300">
                  {physics.mass.totalMassKg !== null
                    ? `${physics.mass.totalMassKg.toFixed(1)} kg Total Mass`
                    : 'Incomplete Mass Data'}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white">{meta.name}</h3>
              <p className="text-xs text-slate-300 font-sans leading-relaxed line-clamp-2">{meta.description}</p>

              <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                <div>
                  <span className="text-slate-400 block text-[10px]">Max Walking Speed</span>
                  {physics.mobility.maxSpeedMs !== null ? (
                    <>
                      <strong className="text-white">{physics.mobility.maxSpeedMs} m/s</strong>{' '}
                      <span className="text-slate-400">({physics.mobility.maxSpeedKmh} km/h)</span>
                    </>
                  ) : (
                    <span className="text-slate-500">Missing Data</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Slope Limit</span>
                  {physics.mobility.maxSlopeDeg !== null ? (
                    <strong className="text-amber-300">{physics.mobility.maxSlopeDeg}° Slope</strong>
                  ) : (
                    <span className="text-slate-500">Missing Data</span>
                  )}
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-500 truncate">
                {record.lastUpdatedByFile
                  ? `Source: ${record.lastUpdatedByFile}`
                  : record.lastUpdatedAt
                  ? 'Source: Manual Parameter Input'
                  : 'Status: Awaiting Uploaded or Manual Data'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable Manual Input & Environment Parameters Panel */}
      {showManualEditor && (
        <div
          ref={manualEditorRef}
          className="bg-[#0B1021] border border-cyan-500/40 rounded-2xl p-5 space-y-4 shadow-xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase block">
                Manual Parameter Editor · {activeMeta.name}
              </span>
              <p className="text-xs text-slate-400 mt-0.5">
                Edits apply only to the currently selected configuration ({activeMeta.shortLabel}) and recalculate physics immediately.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => clearSuitConfigData(suitConfig)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-rose-300 cursor-pointer"
              >
                Reset {activeMeta.shortLabel}
              </button>
              <button
                type="button"
                onClick={() => setShowManualEditor(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white cursor-pointer"
              >
                Hide Editor
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900 rounded-xl w-fit">
            {[
              { id: 'mass', label: 'Mass Components' },
              { id: 'mobility', label: 'Mobility & Pressure' },
              { id: 'life-support', label: 'Life Support & Reserve' },
              { id: 'metabolic', label: 'Metabolic Data & Environment' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setManualCategoryTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  manualCategoryTab === tab.id
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {manualCategoryTab === 'mass' && massFieldsForActive.map(renderFieldInput)}
            {manualCategoryTab === 'mobility' && mobilityFields.map(renderFieldInput)}
            {manualCategoryTab === 'life-support' && lifeSupportFields.map(renderFieldInput)}
            {manualCategoryTab === 'metabolic' && (
              <>
                {metabolicFields.map(renderFieldInput)}

                {/* Mars Gravity Override Field */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-200">Surface Gravity Constant</label>
                    <span className="text-[11px] font-mono text-slate-400">m/s²</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.001}
                      min={0.1}
                      value={environmentGravity.normalizedValue ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateEnvironmentGravity(raw === '' ? null : raw, 'm/s²');
                      }}
                      className="w-full bg-[#070B18] border border-slate-700 focus:border-cyan-400 focus:outline-none rounded-lg px-3 py-1.5 text-sm font-mono tabular-nums text-white"
                    />
                    <button
                      type="button"
                      onClick={resetEnvironmentGravityToMarsRef}
                      title={`Reset to Mars standard (${MARS_REFERENCE_GRAVITY_MS2} m/s²)`}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[11px] font-mono text-purple-300 truncate">
                    {environmentGravity.source}
                  </div>
                </div>

                {/* Optional Route Distance & Terrain Slope Overrides */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-200">Route Distance (Override)</label>
                    <span className="text-[11px] font-mono text-slate-400">m</span>
                  </div>
                  <input
                    type="number"
                    step={50}
                    min={0}
                    value={customRouteDistanceM ?? ''}
                    placeholder={activeRoute?.distanceM ? `Active Route: ${activeRoute.distanceM} m` : 'Enter distance (m)'}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCustomRouteDistanceM(v === '' ? null : Math.max(0, Number(v)));
                    }}
                    className="w-full bg-[#070B18] border border-slate-700 focus:border-cyan-400 focus:outline-none rounded-lg px-3 py-1.5 text-sm font-mono tabular-nums text-white placeholder:text-slate-500"
                  />
                  <div className="text-[11px] font-mono text-slate-400">
                    Leave blank to use active route ({activeRoute?.code || 'None'})
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-200">Terrain Slope (Override)</label>
                    <span className="text-[11px] font-mono text-slate-400">°</span>
                  </div>
                  <input
                    type="number"
                    step={0.5}
                    min={0}
                    max={60}
                    value={customTerrainSlopeDeg ?? ''}
                    placeholder={
                      activeSession.terrainAnalysis?.slopeMaxDeg !== undefined
                        ? `Terrain Max: ${activeSession.terrainAnalysis.slopeMaxDeg}°`
                        : 'Enter slope (°)'
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setCustomTerrainSlopeDeg(v === '' ? null : Math.max(0, Number(v)));
                    }}
                    className="w-full bg-[#070B18] border border-slate-700 focus:border-cyan-400 focus:outline-none rounded-lg px-3 py-1.5 text-sm font-mono tabular-nums text-white placeholder:text-slate-500"
                  />
                  <div className="text-[11px] font-mono text-slate-400">
                    Used for slope feasibility &amp; route incline power
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Detailed Kinematic & Metabolic Physics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Mass Distribution, Gravity & Mobility Breakdown (6 cols) */}
        <div className="lg:col-span-6 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Mass &amp; Gravity Physics Breakdown</span>
            </h3>
            <button
              type="button"
              onClick={handleOpenManualEditor}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              Edit Fields
            </button>
          </div>

          {activeSuitPhysics.mass.massDiscrepancyWarning && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{activeSuitPhysics.mass.massDiscrepancyWarning}</span>
            </div>
          )}

          <div className="space-y-2.5 font-mono text-xs tabular-nums">
            {activeMeta.visibleMassFields.map((fieldKey) => {
              const def = FIELD_DEFINITIONS[fieldKey];
              const prov = activeRecord.fields[fieldKey];
              const srcMeta = getSourceLabel(prov);
              const isPayload =
                fieldKey === 'sampleContainerMassKg' ||
                fieldKey === 'scientificPayloadMassKg' ||
                fieldKey === 'additionalEquipmentMassKg';

              return (
                <div key={fieldKey} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-slate-400">{def.label}:</span>
                    {prov.normalizedValue !== null ? (
                      <span className={`font-bold ${isPayload ? 'text-amber-300' : 'text-white'}`}>
                        {prov.normalizedValue.toFixed(1)} {def.canonicalUnit}
                      </span>
                    ) : (
                      <span className="text-slate-500">Missing Data</span>
                    )}
                  </div>
                  <div className={`text-[10px] ${srcMeta.toneClass} text-right`}>{srcMeta.text}</div>
                </div>
              );
            })}

            {/* Total System Mass */}
            <div
              className={`p-3 rounded-xl border space-y-1 ${
                activeSuitPhysics.mass.totalMassKg !== null
                  ? 'bg-purple-500/10 border-purple-500/30 text-purple-200'
                  : 'bg-slate-900/80 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex justify-between items-center gap-2">
                <span className="font-bold">Total System Mass (Earth Equivalent):</span>
                {activeSuitPhysics.mass.totalMassKg !== null ? (
                  <span className="font-bold text-sm">{activeSuitPhysics.mass.totalMassKg.toFixed(1)} kg</span>
                ) : (
                  <span className="font-bold">Incomplete Mass Data</span>
                )}
              </div>
              <div className="text-[10px] text-slate-300">
                {activeSuitPhysics.mass.totalMassBasis === 'component_sum'
                  ? `Calculated from component sum${
                      activeSuitPhysics.mass.payloadFractionPct !== null
                        ? ` · Payload burden: ${activeSuitPhysics.mass.payloadFractionPct}% (${activeSuitPhysics.mass.payloadMassKg?.toFixed(1)} kg)`
                        : ''
                    }`
                  : activeSuitPhysics.mass.totalMassBasis === 'reported_total_fallback'
                  ? `Uploaded total mass (Missing: ${activeSuitPhysics.mass.missingRequiredMassFields.join(', ')})`
                  : `Missing required components: ${activeSuitPhysics.mass.missingRequiredMassFields.join(', ')}`}
              </div>
            </div>

            {/* Mars Gravity Force */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-400">
                  Mars Gravity Force (g = {activeSuitPhysics.gravity.gravityMs2 ?? 'Missing'} m/s²):
                </span>
                {activeSuitPhysics.gravity.marsWeightN !== null &&
                activeSuitPhysics.gravity.earthEquivalentKgf !== null ? (
                  <span className="text-purple-300 font-bold">
                    {activeSuitPhysics.gravity.marsWeightN.toFixed(1)} N ({activeSuitPhysics.gravity.earthEquivalentKgf.toFixed(1)} kg_f)
                  </span>
                ) : (
                  <span className="text-slate-500">Missing Data</span>
                )}
              </div>
              <div className="text-[10px] text-purple-300/80 text-right">
                {activeSuitPhysics.gravity.gravitySource} · W_Mars = m × g
              </div>
            </div>

            {/* Suit Pressure & Route Mobility Feasibility */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Route Traversal &amp; Slope Feasibility:</span>
                </span>
                <span
                  className={`font-bold ${
                    activeSuitPhysics.mobility.slopeFeasible === true
                      ? 'text-emerald-400'
                      : activeSuitPhysics.mobility.slopeFeasible === false
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {activeSuitPhysics.mobility.slopeStatusLabel}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[10px]">Route Distance</span>
                  <span>
                    {activeRouteDistanceM !== null ? `${(activeRouteDistanceM / 1000).toFixed(2)} km` : 'Missing'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Est. Traversal Time</span>
                  <span>
                    {activeSuitPhysics.mobility.estimatedTraversalTimeMins !== null
                      ? `${activeSuitPhysics.mobility.estimatedTraversalTimeMins} mins`
                      : 'Missing Speed'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Suit Pressure</span>
                  <span>
                    {activeSuitPhysics.mobility.suitPressureKpa !== null
                      ? `${activeSuitPhysics.mobility.suitPressureKpa.toFixed(1)} kPa (${activeSuitPhysics.mobility.suitPressurePsi} psi)`
                      : 'Missing Data'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Metabolic Expenditure & Life-Support Reserve (6 cols) */}
        <div className="lg:col-span-6 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Metabolic Expenditure &amp; Life-Support Reserve</span>
            </h3>
            <label className="flex items-center gap-2 text-[11px] font-mono text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={useReferenceBaseMetabolic}
                onChange={(e) => setUseReferenceBaseMetabolic(e.target.checked)}
                className="accent-cyan-500 cursor-pointer"
              />
              <span>Allow 210 W NASA Resting Baseline</span>
            </label>
          </div>

          <div className="space-y-2.5 font-mono text-xs tabular-nums">
            {/* Uploaded Direct Measurements (if provided) */}
            {(activeSuitPhysics.metabolic.uploadedWalkingWatts !== null ||
              activeSuitPhysics.metabolic.uploadedInclineWatts !== null) && (
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5">
                <div className="text-[10px] font-bold text-cyan-300 uppercase">Uploaded Metabolic Measurements</div>
                {activeSuitPhysics.metabolic.uploadedWalkingWatts !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">Uploaded Flat Walking Power:</span>
                    <strong className="text-cyan-200">{activeSuitPhysics.metabolic.uploadedWalkingWatts} W</strong>
                  </div>
                )}
                {activeSuitPhysics.metabolic.uploadedInclineWatts !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-300">
                      Uploaded Incline Power
                      {activeSuitPhysics.metabolic.uploadedInclineAngleDeg !== null
                        ? ` (${activeSuitPhysics.metabolic.uploadedInclineAngleDeg}°)`
                        : ''}
                      :
                    </span>
                    <strong className="text-cyan-200">{activeSuitPhysics.metabolic.uploadedInclineWatts} W</strong>
                  </div>
                )}
              </div>
            )}

            {/* Base Rest Metabolic Rate */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-400">Base Rest Metabolic Rate:</span>
                {activeSuitPhysics.metabolic.effectiveBaseWatts !== null ? (
                  <span className="text-white font-bold">{activeSuitPhysics.metabolic.effectiveBaseWatts} Watts</span>
                ) : (
                  <span className="text-slate-500">Missing Data</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 text-right">
                {activeSuitPhysics.metabolic.effectiveBaseSourceLabel}
              </div>
            </div>

            {/* Modeled Flat Walking Power */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-400">Modeled Flat Terrain Walking (0°):</span>
                {activeSuitPhysics.metabolic.modeledFlatWatts !== null ? (
                  <span className="text-cyan-300 font-bold">
                    {activeSuitPhysics.metabolic.modeledFlatWatts} W ({activeSuitPhysics.metabolic.modeledFlatKcalHr} kcal/hr)
                  </span>
                ) : (
                  <span className="text-slate-500">Missing Inputs</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 text-right">
                {activeSuitPhysics.metabolic.metabolicModelAvailable
                  ? `Modeled Estimate · ${activeSuitPhysics.metabolic.formulaText}`
                  : `Requires: ${activeSuitPhysics.metabolic.missingModelInputs.join(', ')}`}
              </div>
            </div>

            {/* Modeled Incline 10 & 15 deg */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Modeled Incline (10° Slope)</span>
                {activeSuitPhysics.metabolic.modeledSlope10Watts !== null ? (
                  <strong className="text-amber-300 text-sm">{activeSuitPhysics.metabolic.modeledSlope10Watts} W</strong>
                ) : (
                  <span className="text-slate-500">Missing Inputs</span>
                )}
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Modeled Incline (15° Slope)</span>
                {activeSuitPhysics.metabolic.modeledSlope15Watts !== null ? (
                  <strong className="text-rose-400 text-sm">{activeSuitPhysics.metabolic.modeledSlope15Watts} W</strong>
                ) : (
                  <span className="text-slate-500">Missing Inputs</span>
                )}
              </div>
            </div>

            {/* Route Slope Energy Estimate */}
            {activeTerrainSlopeDeg !== null && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center gap-2">
                <span className="text-slate-400">
                  Route Slope Energy ({activeTerrainSlopeDeg.toFixed(1)}° Terrain):
                </span>
                {activeSuitPhysics.metabolic.modeledRouteSlopeWatts !== null ? (
                  <span className="text-amber-200 font-bold">
                    {activeSuitPhysics.metabolic.modeledRouteSlopeWatts} W
                    {activeSuitPhysics.metabolic.estimatedRouteEnergyWh !== null
                      ? ` · ${activeSuitPhysics.metabolic.estimatedRouteEnergyWh} Wh`
                      : ''}
                  </span>
                ) : (
                  <span className="text-slate-500">Missing Inputs</span>
                )}
              </div>
            )}

            {/* PLSS Nominal Capacity vs Remaining Usable Reserve */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PLSS Nominal Capacity:</span>
                </span>
                {activeSuitPhysics.lifeSupport.nominalCapacityHrs !== null ? (
                  <strong className="text-white">
                    {activeSuitPhysics.lifeSupport.nominalCapacityHrs} Hours
                  </strong>
                ) : (
                  <span className="text-slate-500">Missing Data</span>
                )}
              </div>
              <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-slate-800">
                <span className="text-slate-400">Remaining Usable Reserve:</span>
                {activeSuitPhysics.lifeSupport.remainingReserveHrs !== null ? (
                  <strong
                    className={
                      activeSuitPhysics.lifeSupport.reserveStatus === 'deficit'
                        ? 'text-rose-400'
                        : activeSuitPhysics.lifeSupport.reserveStatus === 'caution'
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                    }
                  >
                    {activeSuitPhysics.lifeSupport.remainingReserveHrs} Hours
                    {activeSuitPhysics.lifeSupport.reservePct !== null
                      ? ` (${activeSuitPhysics.lifeSupport.reservePct}%)`
                      : ''}
                  </strong>
                ) : (
                  <span className="text-amber-300/90 text-[11px]">Insufficient Consumption/Duration Data</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">{activeSuitPhysics.lifeSupport.reserveBasis}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Multi-Configuration Comparison Bars */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Live Cross-Configuration Telemetry Comparison</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Compares calculated total mass, walking speed, slope feasibility, and metabolic power across all three configurations.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs tabular-nums">
          {/* Total Mass Comparison */}
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-400 uppercase font-bold">Total System Mass (kg)</div>
            {CONFIG_ORDER.map((id) => {
              const val = suitPhysicsByConfig[id].mass.totalMassKg;
              const pct = val !== null ? Math.min(100, (val / maxMassAll) * 100) : 0;
              return (
                <div key={id} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className={suitConfig === id ? 'text-white font-bold' : 'text-slate-400'}>
                      {SUIT_CONFIG_META[id].shortLabel}
                    </span>
                    <span className={val !== null ? 'text-purple-300 font-bold' : 'text-slate-500'}>
                      {val !== null ? `${val.toFixed(1)} kg` : 'Missing Data'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        suitConfig === id ? 'bg-purple-400' : 'bg-purple-500/60'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Walking Speed Comparison */}
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-400 uppercase font-bold">Max Walking Speed (m/s)</div>
            {CONFIG_ORDER.map((id) => {
              const val = suitPhysicsByConfig[id].mobility.maxSpeedMs;
              const pct = val !== null ? Math.min(100, (val / maxSpeedAll) * 100) : 0;
              return (
                <div key={id} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className={suitConfig === id ? 'text-white font-bold' : 'text-slate-400'}>
                      {SUIT_CONFIG_META[id].shortLabel}
                    </span>
                    <span className={val !== null ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                      {val !== null ? `${val} m/s` : 'Missing Data'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        suitConfig === id ? 'bg-cyan-400' : 'bg-cyan-500/60'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metabolic Power Comparison */}
          <div className="space-y-2.5">
            <div className="text-[11px] text-slate-400 uppercase font-bold">Flat Walking Power (Watts)</div>
            {CONFIG_ORDER.map((id) => {
              const m = suitPhysicsByConfig[id].metabolic;
              const val = m.uploadedWalkingWatts ?? m.modeledFlatWatts;
              const isMeasured = m.uploadedWalkingWatts !== null;
              const pct = val !== null ? Math.min(100, (val / maxWattsAll) * 100) : 0;
              return (
                <div key={id} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className={suitConfig === id ? 'text-white font-bold' : 'text-slate-400'}>
                      {SUIT_CONFIG_META[id].shortLabel}
                    </span>
                    <span className={val !== null ? 'text-amber-300 font-bold' : 'text-slate-500'}>
                      {val !== null ? `${val} W ${isMeasured ? '(Meas.)' : '(Est.)'}` : 'Missing Data'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        suitConfig === id ? 'bg-amber-400' : 'bg-amber-500/60'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Model Disclaimer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 font-mono flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200 uppercase block text-[10px]">
            Modeled Physics &amp; Provenance Notice:
          </strong>
          <span>
            {activeSuitPhysics.metabolic.uncertaintyNote} All unprovided fields remain marked as Missing Data rather than
            zero-filled. Default gravity ({MARS_REFERENCE_GRAVITY_MS2} m/s²) is labeled as NASA Mars Mean Surface Gravity
            unless overridden.
          </span>
        </div>
      </div>
    </div>
  );
};
