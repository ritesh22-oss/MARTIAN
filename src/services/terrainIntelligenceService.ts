import {
  fetchUsgsGeologyContext,
  fetchTrekElevationPoint,
  UsgsGeologicUnitInfo,
  UsgsGeologyResponse,
  TrekElevationSample
} from './marsGeospatialService';
import {
  analyzeImageTerrainFeatures,
  DetectedTerrainObstacle,
  ObstacleHazardStatus,
  ObstacleSizeCategory,
  UploadedImageValidation
} from './terrainVisionService';
import {
  extractImageMetadataAndHash,
  ExtractedExifMetadata,
  computeDeterministicBytesHash
} from './exifExtractor';
import {
  segmentHtmlImageElement,
  SegmentedRegionMeasurement
} from './terrainSegmentationEngine';

export const DATASET_VERSION = 'MARSNAV_TI_v4_SEGMENTED';

export type CoordinateProvenanceScope =
  | 'exact_verified'
  | 'mission_landing_basin'
  | 'unavailable';

export type TerrainRegionClassification =
  | 'Bedrock Exposure'
  | 'Regolith & Loose Soil'
  | 'Rocky Outcrop'
  | 'Layered Sedimentary Formation'
  | 'Fractured Rock Surface'
  | 'Sand Deposit / Dune'
  | 'Erosion Feature'
  | 'Boulder Field'
  | 'Geological Boundary'
  | 'UNCLASSIFIED'
  | 'UNKNOWN'
  | 'Other Formation';

export interface TerrainRegionItem {
  id: string;
  regionId: string;
  title: string;
  classification: TerrainRegionClassification | string;
  locationDescription: string;
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
  pixelX: number;
  pixelY: number;
  pixelWidth: number;
  pixelHeight: number;
  areaPx: number;
  areaPct: number;
  colorDistribution: {
    meanRgb: [number, number, number];
    stdRgb: [number, number, number];
    redBlueRatio: number;
    redGreenRatio: number;
    dominantTone: string;
  };
  textureAndRoughness: {
    meanLuminance: number;
    luminanceStd: number;
    meanEdgeGradient: number;
    edgeDensityPct: number;
    roughnessIndex: number;
    localTextureStd: number;
  };
  shapeAndSpatial: {
    perimeterPx: number;
    compactness: number;
    aspectRatio: number;
    spatialZone: string;
  };
  visualCharacteristics: string;
  classificationJustification: string;
  surfaceEvidence: string;
  /** Strictly null unless calibrated ground-truth validation exists; never fabricated. */
  confidence: number | null;
  confidenceStatus: 'uncalibrated_cv_only' | 'uncalibrated_ai_visual' | 'unavailable';
  scientificSignificance: string;
  roverTraversalConcerns: string;
  recommendedMethod: string;
  hazardLevel: 'low' | 'moderate' | 'high';
  isAmbiguous: boolean;
  ambiguityReason: string | null;
  maskColor: string;
  overlayMaskDataUrl?: string;
  processingMethod: string;
  modelVersion: string | null;
  source: 'gemini-vision+cv-segmentation' | 'deterministic-cv-segmentation';
}

export interface DetectedObstacleOutput {
  id: string;
  label: string;
  classification: string;
  sizeCategory: ObstacleSizeCategory;
  hazardStatus: ObstacleHazardStatus;
  riskLevel: 'high' | 'moderate' | 'low';
  riskColor: string;
  traversalRelevance: string;
  detectionMethod: 'CV Localizer' | 'Gemini Vision';
  confidence: number;
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
  pixelX: number;
  pixelY: number;
  pixelWidth: number;
  pixelHeight: number;
  physicalWidthM: number | null;
  physicalHeightM: number | null;
  dimensionsNote: string;
}

export interface GeologicalIdentificationResult {
  visuallyDetected: {
    summary: string;
    surfaceMaterials: string[];
    rockFormations: string[];
    fracturesAndTextures: string[];
    sedimentaryIndicators: string[];
  };
  geologicallyInferred: {
    provisionalSummary: string;
    confidenceCaveat: string;
    mineralogicalNote: string;
  };
  geographicallyVerified: {
    status: 'verified_footprint' | 'mission_basin_context' | 'unavailable';
    matched: boolean;
    headline: string;
    coordinateLabel: string;
    coordinateScope: CoordinateProvenanceScope;
    quadrangle: string | null;
    primaryUnit: UsgsGeologicUnitInfo | null;
    allUnits: UsgsGeologicUnitInfo[];
    nearbyUnits: UsgsGeologicUnitInfo[];
    boundariesSummary: string | null;
    boundaryContext: string | null;
    molaElevationM: number | null;
    molaDatum: string;
    molaSource: string | null;
    citation: string | null;
    notes: string;
  };
}

export interface ScientificTerrainReport {
  overallComposition: string;
  geologicalFeaturesSummary: string;
  rockAndSoilCharacteristics: string;
  regionalContext: string;
  traversalHazards: string[];
  samplingOpportunities: string[];
  dataLimitations: string[];
}

export interface CompleteTerrainIntelligenceReport {
  imageIdentifier: string;
  imageContentKey: string;
  datasetVersion: string;
  detectedFormat: string;
  fileSizeBytes: number | null;
  exifMetadata: ExtractedExifMetadata;
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: string;
  pixelComposition: {
    soilPct: number;
    bedrockPct: number;
    sandPct: number;
    rockPct: number;
  };
  meanBrightness: number;
  rmsContrast: number;
  edgeDensityPct: number;
  roughnessScore: number;
  shadowContrast: number;
  dominantFeature: string;
  segmentationMaskUrl?: string;
  processingMethod: string;
  modelVersion: string | null;
  aiAvailable: boolean;
  aiStatus: string;
  aiStatusMessage?: string;
  aiFallbackBanner?: string;
  structuredAiOutput?: Record<string, any> | null;
  regions: TerrainRegionItem[];
  detectedBoulders: DetectedObstacleOutput[];
  geologicalIdentification: GeologicalIdentificationResult;
  scientificReport: ScientificTerrainReport;
  visibleFeatures: string[];
  rockFormations: string[];
  visibleFractures: string[];
  sedimentaryStructures: string[];
  terrainObstacles: string[];
  sandAndRegolith: string;
  surfaceTexture: string;
  geologicalRelevance: string;
  recommendedInvestigationMethod: string;
  imageQuality: string;
  generatedAt: string;
  processingTimeMs: number;
}

export interface AnalyzeTerrainIntelligenceParams {
  imageUrl: string;
  imageIdentifier: string;
  file?: File | Blob | null;
  mission?: string;
  camera?: string;
  sol?: number;
  source?: string;
  lat?: number;
  lon?: number;
  coordinateScope?: CoordinateProvenanceScope;
  locationLabel?: string;
  regionId?: string;
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

const reportCache = new Map<string, CompleteTerrainIntelligenceReport>();

export function getSafeImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return url;
  return `/api/nasa/proxy-image?url=${encodeURIComponent(url)}`;
}

export function getCachedTerrainIntelligence(
  imageIdentifier: string,
  imageUrl: string
): CompleteTerrainIntelligenceReport | null {
  const key = `${imageIdentifier || imageUrl}::${DATASET_VERSION}`;
  return reportCache.get(key) || null;
}

function clamp01(val: number, fallback = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.min(1, val));
}

function normalizeBox(
  normX: number,
  normY: number,
  normWidth: number,
  normHeight: number,
  minSize = 0.02
): { normX: number; normY: number; normWidth: number; normHeight: number } {
  const x = clamp01(normX, 0.1);
  const y = clamp01(normY, 0.1);
  const w = Math.max(minSize, Math.min(1 - x, clamp01(normWidth, 0.12)));
  const h = Math.max(minSize, Math.min(1 - y, clamp01(normHeight, 0.12)));
  return {
    normX: Number(x.toFixed(4)),
    normY: Number(y.toFixed(4)),
    normWidth: Number(w.toFixed(4)),
    normHeight: Number(h.toFixed(4))
  };
}

function boxIoU(
  a: { normX: number; normY: number; normWidth: number; normHeight: number },
  b: { normX: number; normY: number; normWidth: number; normHeight: number }
): number {
  const ix0 = Math.max(a.normX, b.normX);
  const iy0 = Math.max(a.normY, b.normY);
  const ix1 = Math.min(a.normX + a.normWidth, b.normX + b.normWidth);
  const iy1 = Math.min(a.normY + a.normHeight, b.normY + b.normHeight);
  const iw = Math.max(0, ix1 - ix0);
  const ih = Math.max(0, iy1 - iy0);
  const inter = iw * ih;
  if (inter <= 0) return 0;
  const areaA = Math.max(1e-6, a.normWidth * a.normHeight);
  const areaB = Math.max(1e-6, b.normWidth * b.normHeight);
  return inter / (areaA + areaB - inter);
}

function coerceSizeCategory(raw: any, normWidth: number, normHeight: number, classification: string): ObstacleSizeCategory {
  const s = String(raw || '').toLowerCase();
  if (
    s === 'small_rock' ||
    s === 'medium_rock' ||
    s === 'large_boulder' ||
    s === 'massive_boulder' ||
    s === 'rock_cluster' ||
    s === 'bedrock_ridge' ||
    s === 'crater_depression'
  ) {
    return s as ObstacleSizeCategory;
  }
  const c = classification.toLowerCase();
  if (c.includes('crater') || c.includes('depression') || c.includes('pit')) return 'crater_depression';
  if (c.includes('ridge') || c.includes('scarp')) return 'bedrock_ridge';
  if (c.includes('cluster')) return 'rock_cluster';
  const areaPct = normWidth * normHeight * 100;
  if (areaPct >= 6.5) return 'massive_boulder';
  if (areaPct >= 2.2) return 'large_boulder';
  if (areaPct >= 0.55) return 'medium_rock';
  return 'small_rock';
}

function coerceHazardStatus(raw: any): ObstacleHazardStatus {
  const s = String(raw || '').toLowerCase();
  if (s.includes('elevation')) return 'Elevation-confirmed hazard';
  if (s.includes('potential') || s.includes('hazard')) return 'Potential traversal hazard';
  if (s.includes('insufficient')) return 'Insufficient spatial data';
  return 'Detected visual obstacle';
}

function deriveHazardLevel(seg: SegmentedRegionMeasurement): 'low' | 'moderate' | 'high' {
  if (seg.isAmbiguous) return 'moderate';
  if (seg.textureAndRoughness.edgeDensityPct >= 22 || seg.textureAndRoughness.roughnessIndex >= 0.55) {
    return 'high';
  }
  if (
    seg.provisionalVisualClass.includes('Sand') ||
    seg.textureAndRoughness.edgeDensityPct >= 14 ||
    seg.textureAndRoughness.roughnessIndex >= 0.36
  ) {
    return 'moderate';
  }
  return 'low';
}

function buildCvOnlyRegionItem(seg: SegmentedRegionMeasurement, processingMethod: string): TerrainRegionItem {
  const { colorDistribution: cd, textureAndRoughness: tr, shapeAndSpatial: ss, boundingBox: bb } = seg;
  const visualEvidence = `Measured ${seg.areaPct}% of frame (${seg.areaPx.toLocaleString()} px) in ${ss.spatialZone}. Mean RGB (${cd.meanRgb.join(', ')}, R/B ${cd.redBlueRatio}, ${cd.dominantTone}); luminance ${tr.meanLuminance}/255 (σ=${tr.luminanceStd}); Sobel edge gradient ${tr.meanEdgeGradient}, edge density ${tr.edgeDensityPct}%, roughness proxy ${tr.roughnessIndex}; compactness ${ss.compactness}, aspect ${ss.aspectRatio}:1.`;

  let sig = `Visually distinct ${cd.dominantTone.toLowerCase()} terrain region (${seg.areaPct}% area) isolated by pixel color/texture segmentation.`;
  let concern = `Edge density ${tr.edgeDensityPct}% and roughness ${tr.roughnessIndex}; verify micro-relief before traverse.`;
  let method = 'Close-range optical imaging and spectrometer follow-up required to determine composition.';
  let justification = `Assigned "${seg.provisionalVisualClass}" from measured R/B=${cd.redBlueRatio}, luminance=${tr.meanLuminance}±${tr.luminanceStd}, and edge density=${tr.edgeDensityPct}% without external ground truth.`;

  if (seg.isAmbiguous && seg.ambiguityReason) {
    sig = 'Region exhibits insufficient contrast or illumination clipping for reliable optical geological interpretation.';
    concern = 'Surface relief obscured; treat traverse stability as unknown.';
    method = 'Re-acquire under higher SNR/oblique illumination or stereo imaging.';
    justification = seg.ambiguityReason;
  } else if (seg.provisionalVisualClass.includes('Rock') || seg.provisionalVisualClass.includes('Fractured')) {
    sig = `High-edge clast/outcrop signature (${tr.edgeDensityPct}% edge pixels, σ_lum=${tr.luminanceStd}) indicates competent rock relief or fractured exposure.`;
    concern = 'Sharp clast boundaries and relief transitions pose wheel-impact or clearance hazards.';
    method = 'Stereo hazard check + targeted LIBS/XRF or Raman spectroscopy for rock mineralogy.';
  } else if (seg.provisionalVisualClass.includes('Outcrop') || seg.provisionalVisualClass.includes('Slab')) {
    sig = `Brighter coherent surface (${tr.meanLuminance}/255 lum, low edge clutter ${tr.edgeDensityPct}%) consistent with exposed consolidated plate morphology.`;
    concern = 'Check slab step edges and joint fractures along bounding perimeter.';
    method = 'High-resolution close-up imaging for grain/lamination textures + contact spectroscopy.';
  } else if (seg.provisionalVisualClass.includes('Sand') || seg.provisionalVisualClass.includes('Aeolian')) {
    sig = `Warm fine-grained signature (R/B=${cd.redBlueRatio}, low local texture σ=${tr.localTextureStd}) consistent with unconsolidated wind-sorted fines.`;
    concern = 'Elevated wheel-slip and sinkage risk across loose fine-grained drift.';
    method = 'Wheel-trench inspection or grain-scale macro imaging prior to heavy traverse.';
  }

  return {
    id: seg.regionId,
    regionId: seg.regionId,
    title: seg.isAmbiguous ? `${seg.regionId} · ${seg.provisionalVisualClass} (${ss.spatialZone})` : `${seg.regionId} · ${seg.provisionalVisualClass}`,
    classification: seg.provisionalVisualClass,
    locationDescription: `${ss.spatialZone} (X:${Math.round(bb.normX * 100)}–${Math.round((bb.normX + bb.normWidth) * 100)}%, Y:${Math.round(bb.normY * 100)}–${Math.round((bb.normY + bb.normHeight) * 100)}%)`,
    normX: bb.normX,
    normY: bb.normY,
    normWidth: bb.normWidth,
    normHeight: bb.normHeight,
    pixelX: bb.pixelX,
    pixelY: bb.pixelY,
    pixelWidth: bb.pixelWidth,
    pixelHeight: bb.pixelHeight,
    areaPx: seg.areaPx,
    areaPct: seg.areaPct,
    colorDistribution: cd,
    textureAndRoughness: tr,
    shapeAndSpatial: ss,
    visualCharacteristics: visualEvidence,
    classificationJustification: justification,
    surfaceEvidence: visualEvidence,
    confidence: null,
    confidenceStatus: 'uncalibrated_cv_only',
    scientificSignificance: sig,
    roverTraversalConcerns: concern,
    recommendedMethod: method,
    hazardLevel: deriveHazardLevel(seg),
    isAmbiguous: seg.isAmbiguous,
    ambiguityReason: seg.ambiguityReason,
    maskColor: seg.maskColor,
    overlayMaskDataUrl: seg.overlayMaskDataUrl,
    processingMethod,
    modelVersion: null,
    source: 'deterministic-cv-segmentation'
  };
}

interface CvPixelExtraction {
  naturalWidth: number;
  naturalHeight: number;
  detectedFormat: string;
  fileSizeBytes: number | null;
  exifMetadata: ExtractedExifMetadata;
  imageContentKey: string;
  pixelComposition: {
    soilPct: number;
    bedrockPct: number;
    sandPct: number;
    rockPct: number;
  };
  meanBrightness: number;
  rmsContrast: number;
  edgeDensityPct: number;
  roughnessScore: number;
  shadowContrast: number;
  dominantFeature: string;
  segmentationMaskUrl?: string;
  processingMethod: string;
  segmentedRegions: SegmentedRegionMeasurement[];
  cvObstacles: DetectedTerrainObstacle[];
  imageBase64ForUpload?: string;
  mimeTypeForUpload?: string;
}

async function loadAndInspectCompleteImage(
  imageUrl: string,
  fileName: string,
  fileInput?: File | Blob | null,
  signal?: AbortSignal
): Promise<CvPixelExtraction> {
  const safeSrc = getSafeImageUrl(imageUrl);

  // Extract real EXIF/XMP metadata and deterministic file hash if file bytes are present
  let blobForExif: File | Blob | null = fileInput || null;
  if (!blobForExif && (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:'))) {
    try {
      const resp = await fetch(imageUrl, { signal });
      if (resp.ok) blobForExif = await resp.blob();
    } catch {
      // ignore if blob revoked or unreadable
    }
  }

  const exifPromise = extractImageMetadataAndHash(blobForExif, fileName);

  const imgPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    if (!safeSrc) {
      reject(new Error('Image source URL is empty.'));
      return;
    }
    if (signal?.aborted) {
      reject(new DOMException('Image inspection aborted', 'AbortError'));
      return;
    }
    const el = new Image();
    let settled = false;
    const onAbort = () => {
      if (!settled) {
        settled = true;
        reject(new DOMException('Image inspection aborted', 'AbortError'));
      }
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    if (!safeSrc.startsWith('data:') && !safeSrc.startsWith('blob:') && !safeSrc.startsWith('/')) {
      el.crossOrigin = 'anonymous';
    }
    el.onload = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      if (el.naturalWidth > 0 && el.naturalHeight > 0) resolve(el);
      else reject(new Error('Image decoded with zero dimensions.'));
    };
    el.onerror = () => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      reject(new Error('Failed to decode complete image for CV inspection.'));
    };
    el.src = safeSrc;
    if (el.complete && el.naturalWidth > 0 && !settled) {
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(el);
    }
  });

  const [exifRes, img] = await Promise.all([exifPromise, imgPromise]);

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;

  const stubValidation: UploadedImageValidation = {
    fileName,
    format: exifRes.exif.detectedFormat !== 'UNKNOWN' ? exifRes.exif.detectedFormat : fileName.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG',
    fileSizeBytes: exifRes.exif.fileSizeBytes ?? 0,
    fileSizeFormatted: exifRes.exif.fileSizeBytes ? `${(exifRes.exif.fileSizeBytes / 1024).toFixed(1)} KB` : 'N/A',
    width: nw,
    height: nh,
    aspectRatio: `${(nw / Math.max(1, nh)).toFixed(2)}:1`,
    hasSpatialMetadata: false,
    spatialResolutionMPerPx: null,
    spatialReferenceSystem: 'None (Pixel coordinates)',
    classification: 'OPTICAL_PHOTO',
    classificationDescription: 'Standard Optical Photograph (Reflectance Image)',
    canDeriveNativeElevation: false,
    validationNotes: []
  };

  // Run full pixel-level obstacle localizer + deterministic SLIC/feature-distance segmentation
  const cvObstaclesResult = analyzeImageTerrainFeatures(img, stubValidation, [], { width: nw, height: nh });
  const segmentation = segmentHtmlImageElement(img, 260);

  let imageContentKey = exifRes.contentHash || segmentation.pixelSignatureHash;
  if (!exifRes.contentHash) {
    // Stable digest combining URL/id and pixel signature hash
    const enc = new TextEncoder().encode(`${fileName}|${segmentation.pixelSignatureHash}`);
    imageContentKey = await computeDeterministicBytesHash(enc);
  }

  // Produce proportionally scaled JPEG for Gemini Vision (preserving full frame for uploads, /assets, or CORS/proxied NASA images)
  let imageBase64ForUpload: string | undefined;
  let mimeTypeForUpload: string | undefined;
  try {
    const uploadMax = 1024;
    const upScale = Math.min(1, uploadMax / Math.max(nw, nh));
    const upW = Math.max(64, Math.round(nw * upScale));
    const upH = Math.max(64, Math.round(nh * upScale));
    const upCanvas = document.createElement('canvas');
    upCanvas.width = upW;
    upCanvas.height = upH;
    const upCtx = upCanvas.getContext('2d');
    if (upCtx) {
      upCtx.drawImage(img, 0, 0, upW, upH);
      const dataUrl = upCanvas.toDataURL('image/jpeg', 0.84);
      imageBase64ForUpload = dataUrl.split(',')[1];
      mimeTypeForUpload = 'image/jpeg';
    }
  } catch {
    // Fallback to imageUrl on backend if canvas is tainted
  }

  const dominantFeature = segmentation.globalStats.isLowInformationImage
    ? 'UNCLASSIFIED / Low-Contrast Frame'
    : segmentation.regions[0]
      ? `${segmentation.regions[0].provisionalVisualClass} (${segmentation.regions[0].areaPct}% area)`
      : cvObstaclesResult.dominantFeature;

  return {
    naturalWidth: nw,
    naturalHeight: nh,
    detectedFormat: stubValidation.format,
    fileSizeBytes: exifRes.exif.fileSizeBytes,
    exifMetadata: exifRes.exif,
    imageContentKey,
    pixelComposition: cvObstaclesResult.pixelComposition,
    meanBrightness: Math.round(segmentation.globalStats.meanBrightness),
    rmsContrast: Number(segmentation.globalStats.rmsContrast.toFixed(1)),
    edgeDensityPct: segmentation.globalStats.edgeDensityPct,
    roughnessScore: segmentation.globalStats.roughnessScore,
    shadowContrast: cvObstaclesResult.shadowContrastRatio,
    dominantFeature,
    segmentationMaskUrl: segmentation.segmentationMaskUrl || cvObstaclesResult.segmentationMaskUrl,
    processingMethod: segmentation.processingMethod,
    segmentedRegions: segmentation.regions,
    cvObstacles: cvObstaclesResult.detectedObstacles,
    imageBase64ForUpload,
    mimeTypeForUpload
  };
}

export async function analyzeCompleteTerrainImage(
  params: AnalyzeTerrainIntelligenceParams
): Promise<CompleteTerrainIntelligenceReport> {
  const startT = performance.now();
  const cacheKey = `${params.imageIdentifier || params.imageUrl}::${params.coordinateScope || 'unavailable'}::${params.lat ?? 'na'},${params.lon ?? 'na'}::${DATASET_VERSION}`;
  if (!params.forceRefresh && reportCache.has(cacheKey)) {
    return reportCache.get(cacheKey)!;
  }

  // 1. Complete-frame EXIF inspection + real deterministic pixel segmentation
  const cv = await loadAndInspectCompleteImage(params.imageUrl, params.imageIdentifier, params.file, params.signal);

  if (params.signal?.aborted) {
    throw new DOMException('Terrain analysis aborted', 'AbortError');
  }

  // 2. Parallel external requests: AI Complete-Frame Vision (grounded on real regionId segments) + Conditional USGS/Trek Geo-verification
  const measuredRegionsPayload = cv.segmentedRegions.map(r => ({
    regionId: r.regionId,
    areaPct: r.areaPct,
    areaPx: r.areaPx,
    spatialZone: r.shapeAndSpatial.spatialZone,
    meanRgb: r.colorDistribution.meanRgb,
    redBlueRatio: r.colorDistribution.redBlueRatio,
    edgeDensityPct: r.textureAndRoughness.edgeDensityPct,
    roughnessIndex: r.textureAndRoughness.roughnessIndex,
    normX: r.boundingBox.normX,
    normY: r.boundingBox.normY,
    normWidth: r.boundingBox.normWidth,
    normHeight: r.boundingBox.normHeight
  }));

  const visionPromise = (async () => {
    try {
      const payload: Record<string, any> = {
        imageId: cv.imageContentKey || params.imageIdentifier,
        fileName: params.imageIdentifier,
        imageWidth: cv.naturalWidth,
        imageHeight: cv.naturalHeight,
        missionContext: params.mission || params.source,
        cameraContext: params.camera || (cv.exifMetadata.model ? `${cv.exifMetadata.make || ''} ${cv.exifMetadata.model}`.trim() : undefined),
        solContext: params.sol,
        measuredRegions: measuredRegionsPayload,
        imageUrl: params.imageUrl
      };
      if (cv.imageBase64ForUpload) {
        payload.imageBase64 = cv.imageBase64ForUpload;
        payload.mimeType = cv.mimeTypeForUpload || 'image/jpeg';
      }

      const resp = await fetch('/api/gemini/analyze-terrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: params.signal
      });
      const parsedBody = await resp.json().catch(() => null);
      if (!resp.ok) {
        return {
          aiAvailable: false,
          aiStatus: parsedBody?.aiStatus || `http_${resp.status}`,
          httpStatus: resp.status,
          errorCode: parsedBody?.errorCode || `HTTP_${resp.status}`,
          fallbackBanner: parsedBody?.fallbackBanner || 'AI ANALYSIS UNAVAILABLE\nFALLBACK: PIXEL-BASED COMPUTER VISION',
          message: parsedBody?.message || `Gemini Vision HTTP ${resp.status}`,
          modelVersion: null,
          analysis: null
        };
      }
      return parsedBody;
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      return {
        aiAvailable: false,
        aiStatus: 'network_error',
        fallbackBanner: 'AI ANALYSIS UNAVAILABLE\nFALLBACK: PIXEL-BASED COMPUTER VISION',
        message: err?.message || 'Vision service request failed.',
        modelVersion: null,
        analysis: null
      };
    }
  })();

  const hasCoordinates =
    typeof params.lat === 'number' &&
    typeof params.lon === 'number' &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lon) &&
    (params.coordinateScope === 'exact_verified' || params.coordinateScope === 'mission_landing_basin');

  const coordinateScope: CoordinateProvenanceScope = hasCoordinates
    ? (params.coordinateScope as CoordinateProvenanceScope)
    : 'unavailable';

  const geoPromise = (async (): Promise<{
    geology: UsgsGeologyResponse | null;
    geologyError: string | null;
    elevation: TrekElevationSample | null;
  }> => {
    if (!hasCoordinates) {
      return { geology: null, geologyError: null, elevation: null };
    }
    const [geologyRes, elevRes] = await Promise.allSettled([
      fetchUsgsGeologyContext(params.lat!, params.lon!, params.regionId),
      fetchTrekElevationPoint(params.lat!, params.lon!)
    ]);
    return {
      geology: geologyRes.status === 'fulfilled' ? geologyRes.value : null,
      geologyError: geologyRes.status === 'rejected' ? String(geologyRes.reason?.message || geologyRes.reason || 'USGS SIM 3292 query failed') : null,
      elevation: elevRes.status === 'fulfilled' ? elevRes.value : null
    };
  })();

  const [visionRes, geoRes] = await Promise.all([visionPromise, geoPromise]);

  if (params.signal?.aborted) {
    throw new DOMException('Terrain analysis aborted', 'AbortError');
  }

  const aiAvailable = Boolean(visionRes?.aiAvailable && visionRes?.analysis);
  const aiAnalysis = aiAvailable ? visionRes.analysis : null;
  const modelVersion: string | null = aiAvailable ? String(visionRes?.modelVersion || visionRes?.source || 'gemini-4-hydrogen') : null;
  const aiFallbackBanner: string | undefined = !aiAvailable
    ? String(visionRes?.fallbackBanner || 'AI ANALYSIS UNAVAILABLE\nFALLBACK: PIXEL-BASED COMPUTER VISION')
    : undefined;
  const combinedMethod = aiAvailable
    ? `${cv.processingMethod} + ${modelVersion} (Interactions API)`
    : `${cv.processingMethod} [FALLBACK: PIXEL-BASED COMPUTER VISION]`;

  // 3. Fuse AI regionInterpretations strictly onto the real segmented pixel regions (preserving real boxes, masks & metrics)
  const aiByRegionId = new Map<string, any>();
  if (aiAnalysis && Array.isArray(aiAnalysis.regionInterpretations)) {
    for (const ri of aiAnalysis.regionInterpretations) {
      if (ri?.regionId) {
        aiByRegionId.set(String(ri.regionId).trim().toUpperCase(), ri);
      }
    }
  }

  const regions: TerrainRegionItem[] = cv.segmentedRegions.map((seg, idx) => {
    const base = buildCvOnlyRegionItem(seg, combinedMethod);
    const aiMatch =
      aiByRegionId.get(seg.regionId.toUpperCase()) ||
      (Array.isArray(aiAnalysis?.regionInterpretations) ? aiAnalysis.regionInterpretations[idx] : null);

    if (!aiMatch || seg.isAmbiguous) {
      return base;
    }

    const aiClass = String(aiMatch.provisionalClass || '').trim();
    const isUnknown =
      Boolean(aiMatch.isAmbiguous) ||
      aiClass.toUpperCase() === 'UNKNOWN' ||
      aiClass.toUpperCase() === 'UNCLASSIFIED';
    const finalClass = aiClass ? (isUnknown ? aiClass.toUpperCase() : aiClass) : base.classification;
    const hLevel = String(aiMatch.hazardLevel || '').toLowerCase();
    const hazardLevel: 'low' | 'moderate' | 'high' =
      hLevel === 'high' ? 'high' : hLevel === 'moderate' ? 'moderate' : hLevel === 'low' ? 'low' : base.hazardLevel;

    return {
      ...base,
      title: `${seg.regionId} · ${finalClass}`,
      classification: finalClass,
      visualCharacteristics: String(aiMatch.visualDescription || base.visualCharacteristics),
      classificationJustification: String(aiMatch.classificationJustification || base.classificationJustification),
      surfaceEvidence: String(aiMatch.surfaceEvidence || base.surfaceEvidence),
      scientificSignificance: String(aiMatch.scientificRelevance || base.scientificSignificance),
      roverTraversalConcerns: String(aiMatch.traversalConcerns || base.roverTraversalConcerns),
      recommendedMethod: String(aiMatch.recommendedMethod || base.recommendedMethod),
      hazardLevel,
      isAmbiguous: isUnknown,
      ambiguityReason: isUnknown ? String(aiMatch.classificationJustification || 'AI vision flagged region as visually ambiguous.') : null,
      confidence: null,
      confidenceStatus: 'uncalibrated_ai_visual',
      modelVersion,
      source: 'gemini-vision+cv-segmentation'
    };
  });

  // 4. Fuse AI boulders + CV pixel-tight obstacles (preserving MarsWalk pathfinding obstacle geometry)
  const mergedObstacles: DetectedObstacleOutput[] = [];

  const getRiskMeta = (sizeCat: ObstacleSizeCategory): { riskLevel: 'high' | 'moderate' | 'low'; riskColor: string } => {
    if (sizeCat === 'massive_boulder' || sizeCat === 'large_boulder' || sizeCat === 'crater_depression') {
      return { riskLevel: 'high', riskColor: '#ef4444' };
    }
    if (sizeCat === 'rock_cluster' || sizeCat === 'bedrock_ridge' || sizeCat === 'medium_rock') {
      return { riskLevel: 'moderate', riskColor: '#f97316' };
    }
    return { riskLevel: 'low', riskColor: '#eab308' };
  };

  const aiBoulderList = Array.isArray(aiAnalysis?.boulders)
    ? aiAnalysis.boulders
    : Array.isArray(aiAnalysis?.detected_boulders)
      ? aiAnalysis.detected_boulders
      : Array.isArray(aiAnalysis?.visible_obstacles)
        ? aiAnalysis.visible_obstacles
        : [];

  if (aiAnalysis && aiBoulderList.length > 0) {
    aiBoulderList.slice(0, 24).forEach((b: any, i: number) => {
      const boxCoords = b.box && typeof b.box === 'object' ? b.box : b;
      const box = normalizeBox(
        Number(boxCoords.normX ?? boxCoords.norm_x),
        Number(boxCoords.normY ?? boxCoords.norm_y),
        Number(boxCoords.normWidth ?? boxCoords.norm_width),
        Number(boxCoords.normHeight ?? boxCoords.norm_height),
        0.025
      );
      const classification = String(b.classification || 'boulder');
      const sizeCategory = coerceSizeCategory(b.sizeCategory ?? b.size_category, box.normWidth, box.normHeight, classification);
      const hazardStatus = coerceHazardStatus(b.hazardStatus ?? b.hazard_status);
      const pxX = Math.round(box.normX * cv.naturalWidth);
      const pxY = Math.round(box.normY * cv.naturalHeight);
      const pxW = Math.max(1, Math.round(box.normWidth * cv.naturalWidth));
      const pxH = Math.max(1, Math.round(box.normHeight * cv.naturalHeight));
      const { riskLevel, riskColor } = getRiskMeta(sizeCategory);

      mergedObstacles.push({
        id: String(b.id || `ai_obs_${i + 1}`),
        label: String(b.label || `Detected Rock #${i + 1}`),
        classification,
        sizeCategory,
        hazardStatus,
        riskLevel,
        riskColor,
        traversalRelevance: String(b.traversalRelevance || b.traversal_relevance || 'Obstacle detected in optical image; maintain safe stand-off margin.'),
        detectionMethod: 'Gemini Vision',
        confidence: 1,
        ...box,
        pixelX: pxX,
        pixelY: pxY,
        pixelWidth: pxW,
        pixelHeight: pxH,
        physicalWidthM: null,
        physicalHeightM: null,
        dimensionsNote: `Visual bounding box (${pxW}×${pxH} px) — physical scale unavailable`
      });
    });
  }

  for (const cvObs of cv.cvObstacles) {
    const cvBox = {
      normX: cvObs.normX,
      normY: cvObs.normY,
      normWidth: cvObs.normWidth,
      normHeight: cvObs.normHeight
    };
    const overlapsAi = mergedObstacles.some(m => boxIoU(m, cvBox) > 0.35);
    if (!overlapsAi && mergedObstacles.length < 32) {
      const { riskLevel, riskColor } = getRiskMeta(cvObs.sizeCategory);
      mergedObstacles.push({
        id: `cv_${cvObs.id}`,
        label: cvObs.label,
        classification: cvObs.classification,
        sizeCategory: cvObs.sizeCategory,
        hazardStatus: cvObs.hazardStatus,
        riskLevel,
        riskColor,
        traversalRelevance: cvObs.traversalRelevance,
        detectionMethod: 'CV Localizer',
        confidence: cvObs.confidence,
        ...cvBox,
        pixelX: Math.round(cvObs.normX * cv.naturalWidth),
        pixelY: Math.round(cvObs.normY * cv.naturalHeight),
        pixelWidth: Math.max(1, Math.round(cvObs.normWidth * cv.naturalWidth)),
        pixelHeight: Math.max(1, Math.round(cvObs.normHeight * cv.naturalHeight)),
        physicalWidthM: cvObs.physicalWidthM,
        physicalHeightM: cvObs.physicalHeightM,
        dimensionsNote: cvObs.dimensionsNote
      });
    }
  }

  // Incorporate high-hazard segmented regions as route obstacles
  regions.forEach((reg, rIdx) => {
    const isRockHazard =
      !reg.isAmbiguous &&
      (reg.hazardLevel === 'high' ||
        (reg.hazardLevel === 'moderate' && (reg.classification.includes('Rock') || reg.classification.includes('Outcrop') || reg.classification.includes('Fractured'))));
    if (!isRockHazard) return;

    const regBox = {
      normX: reg.normX,
      normY: reg.normY,
      normWidth: reg.normWidth,
      normHeight: reg.normHeight
    };

    const alreadyCovered = mergedObstacles.some(m => boxIoU(m, regBox) > 0.28);
    if (!alreadyCovered && mergedObstacles.length < 36) {
      const sizeCat: ObstacleSizeCategory =
        reg.areaPct >= 14 ? 'massive_boulder' : reg.areaPct >= 6 ? 'large_boulder' : 'rock_cluster';
      const { riskLevel, riskColor } = getRiskMeta(sizeCat);

      mergedObstacles.push({
        id: `reg_obs_${rIdx + 1}`,
        label: `${reg.regionId} (${reg.classification})`,
        classification: 'boulder',
        sizeCategory: sizeCat,
        hazardStatus: 'Potential traversal hazard',
        riskLevel,
        riskColor,
        traversalRelevance: `High-relief segmented region (${reg.areaPct}% area, edge density ${reg.textureAndRoughness.edgeDensityPct}%); route should detour.`,
        detectionMethod: aiAvailable ? 'Gemini Vision' : 'CV Localizer',
        confidence: 1,
        ...regBox,
        pixelX: reg.pixelX,
        pixelY: reg.pixelY,
        pixelWidth: reg.pixelWidth,
        pixelHeight: reg.pixelHeight,
        physicalWidthM: null,
        physicalHeightM: null,
        dimensionsNote: `Segmented pixel region (${reg.pixelWidth}×${reg.pixelHeight} px, ${reg.areaPct}% frame) — physical scale unavailable`
      });
    }
  });

  // 5. Build 3-Tier Geological Identification (Strict Scientific Integrity)
  const visibleFeatures: string[] =
    Array.isArray(aiAnalysis?.visibleFeatures) && aiAnalysis.visibleFeatures.length > 0
      ? aiAnalysis.visibleFeatures
      : regions.map(
          r =>
            `${r.regionId} (${r.areaPct}%): ${r.classification} — RGB (${r.colorDistribution.meanRgb.join(',')}), edge ${r.textureAndRoughness.edgeDensityPct}%`
        );

  const rockFormations: string[] =
    Array.isArray(aiAnalysis?.rockFormations) && aiAnalysis.rockFormations.length > 0
      ? aiAnalysis.rockFormations
      : regions
          .filter(r => !r.isAmbiguous && (r.classification.includes('Rock') || r.classification.includes('Outcrop') || r.classification.includes('Fractured')))
          .map(r => `${r.regionId}: ${r.classification} in ${r.shapeAndSpatial.spatialZone} (${r.areaPct}% area)`);

  const visibleFractures: string[] =
    Array.isArray(aiAnalysis?.visibleFractures) && aiAnalysis.visibleFractures.length > 0
      ? aiAnalysis.visibleFractures
      : [
          `Measured full-frame edge density ${cv.edgeDensityPct}%, roughness index ${cv.roughnessScore}, RMS luminance contrast ${cv.rmsContrast}.`
        ];

  const sedimentaryStructures: string[] =
    Array.isArray(aiAnalysis?.sedimentaryStructures) && aiAnalysis.sedimentaryStructures.length > 0
      ? aiAnalysis.sedimentaryStructures
      : ['No diagnostic sedimentary bedding confirmed from pixel segmentation alone.'];

  const visuallySummary = aiAnalysis?.geologicalFeaturesSummary
    ? String(aiAnalysis.geologicalFeaturesSummary)
    : `Segmented ${cv.naturalWidth}×${cv.naturalHeight} px (${cv.detectedFormat}) frame into ${regions.length} distinct pixel region${regions.length === 1 ? '' : 's'} (mean brightness ${cv.meanBrightness}/255, RMS contrast ${cv.rmsContrast}, edge density ${cv.edgeDensityPct}%).`;

  const provisionalSummary = aiAnalysis?.provisionalGeologicalInference
    ? String(aiAnalysis.provisionalGeologicalInference)
    : `Provisional morphology from segmented regions only (${regions.map(r => `${r.regionId}: ${r.classification} [${r.areaPct}%]`).join('; ')}). Mineralogy and lithology cannot be verified from RGB imagery without spectral or contact measurements.`;

  // Tier 3: Geographically Verified Geology
  const primaryUnit = geoRes.geology?.units?.[0] || null;
  const allUnits = geoRes.geology?.units || [];
  const nearbyUnits = geoRes.geology?.nearbyUnits || [];
  const boundariesSummary = geoRes.geology?.boundariesSummary || null;
  const hasGeoUnits = hasCoordinates && Boolean(primaryUnit);

  let geoVerified: GeologicalIdentificationResult['geographicallyVerified'];
  if (!hasCoordinates || !hasGeoUnits) {
    geoVerified = {
      status: 'unavailable',
      matched: false,
      headline: geoRes.geologyError
        ? 'USGS SIM 3292 upstream query unavailable.'
        : 'No verified geological classification available for this location.',
      coordinateLabel: hasCoordinates ? `${params.lat!.toFixed(4)}° N, ${params.lon!.toFixed(4)}° E` : 'Coordinates unavailable',
      coordinateScope: hasCoordinates ? coordinateScope : 'unavailable',
      quadrangle: geoRes.geology?.quadrangle || null,
      primaryUnit: null,
      allUnits: [],
      nearbyUnits: hasCoordinates ? nearbyUnits : [],
      boundariesSummary: hasCoordinates ? boundariesSummary : null,
      boundaryContext: null,
      molaElevationM: geoRes.elevation?.calibrated ? geoRes.elevation.elevationM : null,
      molaDatum: geoRes.elevation?.datum || 'MOLA Areoid',
      molaSource: geoRes.elevation?.source || null,
      citation: null,
      notes: !hasCoordinates
        ? 'Frame lacks verified planetocentric lat/lon coordinates; no USGS SIM 3292 map unit assigned.'
        : geoRes.geologyError
          ? geoRes.geologyError
          : geoRes.geology?.note || 'No published USGS SIM 3292 polygon matched these coordinates.'
    };
  } else if (coordinateScope === 'mission_landing_basin') {
    geoVerified = {
      status: 'mission_basin_context',
      matched: true,
      headline: `Basin-Level Context: Unit ${primaryUnit!.unitSymbol} · ${primaryUnit!.unitName}`,
      coordinateLabel: `${params.lat!.toFixed(4)}° N, ${params.lon!.toFixed(4)}° E (${params.locationLabel || params.mission || 'Mission Basin'})`,
      coordinateScope: 'mission_landing_basin',
      quadrangle: geoRes.geology?.quadrangle || primaryUnit!.quadrangle,
      primaryUnit,
      allUnits,
      nearbyUnits,
      boundariesSummary,
      boundaryContext: primaryUnit!.boundaryContext,
      molaElevationM: geoRes.elevation?.calibrated ? geoRes.elevation.elevationM : null,
      molaDatum: geoRes.elevation?.datum || 'MOLA Areoid',
      molaSource: geoRes.elevation?.source || null,
      citation: primaryUnit!.citation,
      notes: `Point-in-polygon query against USGS SIM 3292 (WKID 104905) at nominal ${params.mission || 'mission'} landing-basin center.`
    };
  } else {
    geoVerified = {
      status: 'verified_footprint',
      matched: true,
      headline: `Verified Map Unit ${primaryUnit!.unitSymbol} · ${primaryUnit!.unitName}`,
      coordinateLabel: `${params.lat!.toFixed(4)}° N, ${params.lon!.toFixed(4)}° E`,
      coordinateScope: 'exact_verified',
      quadrangle: geoRes.geology?.quadrangle || primaryUnit!.quadrangle,
      primaryUnit,
      allUnits,
      nearbyUnits,
      boundariesSummary,
      boundaryContext: primaryUnit!.boundaryContext,
      molaElevationM: geoRes.elevation?.calibrated ? geoRes.elevation.elevationM : null,
      molaDatum: geoRes.elevation?.datum || 'MOLA Areoid',
      molaSource: geoRes.elevation?.source || null,
      citation: primaryUnit!.citation,
      notes: `Verified via live USGS SIM 3292 point-in-polygon query (WKID 104905) and NASA JPL Mars Trek MOLA altimetry.`
    };
  }

  // 6. Build Structured Scientific Terrain Report
  const traversalHazards: string[] =
    Array.isArray(aiAnalysis?.terrainObstacles) && aiAnalysis.terrainObstacles.length > 0
      ? aiAnalysis.terrainObstacles
      : mergedObstacles.length > 0
        ? mergedObstacles.slice(0, 6).map(o => `${o.label} (${o.sizeCategory.replace('_', ' ')}): ${o.traversalRelevance}`)
        : regions.filter(r => r.hazardLevel !== 'low').map(r => `${r.regionId} (${r.classification}): ${r.roverTraversalConcerns}`);

  if (traversalHazards.length === 0) {
    traversalHazards.push(`No dense macro-obstacle clusters isolated; full-frame edge density ${cv.edgeDensityPct}%.`);
  }

  const samplingOpportunities: string[] =
    Array.isArray(aiAnalysis?.samplingOpportunities) && aiAnalysis.samplingOpportunities.length > 0
      ? aiAnalysis.samplingOpportunities
      : regions
          .filter(r => !r.isAmbiguous)
          .slice(0, 4)
          .map(r => `${r.regionId} (${r.classification}, ${r.areaPct}% area) — ${r.recommendedMethod}`);

  const dataLimitations: string[] = [
    ...(Array.isArray(aiAnalysis?.dataLimitations) ? aiAnalysis.dataLimitations : []),
    'RGB pixel intensity and texture do not confirm mineralogy, hydration state, or elemental chemistry without spectroscopy (CRISM, SuperCam, PIXL, SHERLOC).',
    '2D optical frame provides relative pixel geometry only; absolute metric scale and slope require stereo/DEM elevation calibration.'
  ];

  if (cv.exifMetadata.exifStatus === 'none_present') {
    dataLimitations.push('Uploaded image contains no embedded EXIF/XMP camera metadata tags.');
  } else if (cv.exifMetadata.gpsCaveat) {
    dataLimitations.push(cv.exifMetadata.gpsCaveat);
  }
  if (!hasCoordinates) {
    dataLimitations.push('Frame lacks verified Mars planetocentric coordinates; USGS SIM 3292 geologic unit mapping is unavailable.');
  }
  if (!aiAvailable && visionRes?.message) {
    dataLimitations.push(String(visionRes.message));
  }

  const scientificReport: ScientificTerrainReport = {
    overallComposition: aiAnalysis?.overallComposition
      ? String(aiAnalysis.overallComposition)
      : `Region breakdown across ${regions.length} segmented zone${regions.length === 1 ? '' : 's'}: ${regions.map(r => `${r.regionId} ${r.classification} (${r.areaPct}%)`).join(', ')}.`,
    geologicalFeaturesSummary: visuallySummary,
    rockAndSoilCharacteristics: aiAnalysis?.rockAndSoilCharacteristics
      ? String(aiAnalysis.rockAndSoilCharacteristics)
      : `Mean brightness ${cv.meanBrightness}/255, RMS contrast ${cv.rmsContrast}, Sobel edge density ${cv.edgeDensityPct}%, roughness proxy ${cv.roughnessScore}.`,
    regionalContext:
      geoVerified.matched && primaryUnit
        ? `${geoVerified.headline} (${geoVerified.quadrangle}). ${primaryUnit.epoch} — ${primaryUnit.lithology}`
        : geoVerified.headline,
    traversalHazards,
    samplingOpportunities,
    dataLimitations: Array.from(new Set(dataLimitations))
  };

  const report: CompleteTerrainIntelligenceReport = {
    imageIdentifier: params.imageIdentifier || 'MARS_SURFACE_FRAME',
    imageContentKey: cv.imageContentKey,
    datasetVersion: DATASET_VERSION,
    detectedFormat: cv.detectedFormat,
    fileSizeBytes: cv.fileSizeBytes,
    exifMetadata: cv.exifMetadata,
    naturalWidth: cv.naturalWidth,
    naturalHeight: cv.naturalHeight,
    aspectRatio: `${(cv.naturalWidth / Math.max(1, cv.naturalHeight)).toFixed(2)}:1`,
    pixelComposition: cv.pixelComposition,
    meanBrightness: cv.meanBrightness,
    rmsContrast: cv.rmsContrast,
    edgeDensityPct: cv.edgeDensityPct,
    roughnessScore: cv.roughnessScore,
    shadowContrast: cv.shadowContrast,
    dominantFeature: aiAnalysis?.dominantFeature ? String(aiAnalysis.dominantFeature) : cv.dominantFeature,
    segmentationMaskUrl: cv.segmentationMaskUrl,
    processingMethod: combinedMethod,
    modelVersion,
    aiAvailable,
    aiStatus: String(visionRes?.aiStatus || (aiAvailable ? 'ok' : 'unavailable')),
    aiStatusMessage: visionRes?.message ? String(visionRes.message) : undefined,
    aiFallbackBanner,
    structuredAiOutput: aiAnalysis,
    regions,
    detectedBoulders: mergedObstacles,
    geologicalIdentification: {
      visuallyDetected: {
        summary: visuallySummary,
        surfaceMaterials: visibleFeatures,
        rockFormations: rockFormations.length > 0 ? rockFormations : ['No high-relief consolidated outcrops isolated in this frame.'],
        fracturesAndTextures: visibleFractures,
        sedimentaryIndicators: sedimentaryStructures
      },
      geologicallyInferred: {
        provisionalSummary,
        confidenceCaveat: 'No calibrated ground-truth confidence percentage is assigned; morphological labels are provisional.',
        mineralogicalNote: 'RGB optical reflectance cannot determine mineral composition without spectroscopy or contact instruments.'
      },
      geographicallyVerified: geoVerified
    },
    scientificReport,
    visibleFeatures,
    rockFormations: rockFormations.length > 0 ? rockFormations : ['No high-relief consolidated outcrops isolated'],
    visibleFractures,
    sedimentaryStructures,
    terrainObstacles: traversalHazards,
    sandAndRegolith: aiAnalysis?.sandAndRegolith
      ? String(aiAnalysis.sandAndRegolith)
      : `${cv.pixelComposition.soilPct}% regolith/soil matrix, ${cv.pixelComposition.sandPct}% warm fine-grain pixels.`,
    surfaceTexture: aiAnalysis?.surfaceTexture
      ? String(aiAnalysis.surfaceTexture)
      : `Sobel edge density ${cv.edgeDensityPct}%, roughness proxy ${cv.roughnessScore}, RMS contrast ${cv.rmsContrast}.`,
    geologicalRelevance: aiAnalysis?.geologicalRelevance ? String(aiAnalysis.geologicalRelevance) : provisionalSummary,
    recommendedInvestigationMethod: aiAnalysis?.recommendedInvestigationMethod
      ? String(aiAnalysis.recommendedInvestigationMethod)
      : 'Optical close-range documentation followed by spectrometer verification (CRISM / PIXL / SHERLOC).',
    imageQuality: aiAnalysis?.imageQuality
      ? String(aiAnalysis.imageQuality)
      : `${cv.naturalWidth}×${cv.naturalHeight} px · ${cv.detectedFormat} · RMS contrast ${cv.rmsContrast}`,
    generatedAt: new Date().toISOString(),
    processingTimeMs: Math.round(performance.now() - startT)
  };

  reportCache.set(cacheKey, report);
  return report;
}
