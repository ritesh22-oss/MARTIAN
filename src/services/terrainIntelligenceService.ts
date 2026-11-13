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

export const DATASET_VERSION = 'MARSNAV_TI_v3_SIM3292';

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
  | 'Other Formation';

export interface TerrainRegionItem {
  id: string;
  title: string;
  classification: TerrainRegionClassification | string;
  locationDescription: string;
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
  visualCharacteristics: string;
  confidence: number;
  scientificSignificance: string;
  roverTraversalConcerns: string;
  hazardLevel: 'low' | 'moderate' | 'high';
  source: 'gemini-vision' | 'deterministic-cv';
}

export interface DetectedObstacleOutput {
  id: string;
  label: string;
  classification: string;
  sizeCategory: ObstacleSizeCategory;
  hazardStatus: ObstacleHazardStatus;
  riskLevel: 'high' | 'moderate' | 'low';
  riskColor: string; // '#ef4444' (Red - High), '#f97316' (Orange - Moderate), '#eab308' (Yellow - Low)
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
  datasetVersion: string;
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
  roughnessScore: number;
  shadowContrast: number;
  dominantFeature: string;
  segmentationMaskUrl?: string;
  aiAvailable: boolean;
  aiStatus: string;
  aiStatusMessage?: string;
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

function describeNormalizedZone(cx: number, cy: number): string {
  const v = cy < 0.33 ? 'Upper (Far-field)' : cy < 0.67 ? 'Mid-frame' : 'Lower (Foreground)';
  const h = cx < 0.33 ? 'Left' : cx < 0.67 ? 'Center' : 'Right';
  return `${v} ${h}`;
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

interface CvPixelExtraction {
  naturalWidth: number;
  naturalHeight: number;
  pixelComposition: {
    soilPct: number;
    bedrockPct: number;
    sandPct: number;
    rockPct: number;
  };
  meanBrightness: number;
  rmsContrast: number;
  roughnessScore: number;
  shadowContrast: number;
  dominantFeature: string;
  segmentationMaskUrl?: string;
  cvRegions: TerrainRegionItem[];
  cvObstacles: DetectedTerrainObstacle[];
  imageBase64ForUpload?: string;
  mimeTypeForUpload?: string;
}

async function loadAndInspectCompleteImage(imageUrl: string, fileName: string, signal?: AbortSignal): Promise<CvPixelExtraction> {
  const safeSrc = getSafeImageUrl(imageUrl);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
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

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;

  const stubValidation: UploadedImageValidation = {
    fileName,
    format: fileName.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG',
    fileSizeBytes: 0,
    fileSizeFormatted: 'N/A',
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

  // Run full pixel-level obstacle localizer + segmentation mask
  const cvResult = analyzeImageTerrainFeatures(img, stubValidation, [], { width: nw, height: nh });

  // Derive tile regions from a quick downsampled inspect pass for Region Summary boxes
  const maxSide = 480;
  const scale = Math.min(1, maxSide / Math.max(nw, nh));
  const workW = Math.max(32, Math.round(nw * scale));
  const workH = Math.max(32, Math.round(nh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = workW;
  canvas.height = workH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  ctx.drawImage(img, 0, 0, workW, workH);
  const { data } = ctx.getImageData(0, 0, workW, workH);
  const totalPx = workW * workH;

  const gray = new Float32Array(totalPx);
  const edge = new Float32Array(totalPx);
  const warmth = new Float32Array(totalPx);

  let sumGray = 0;
  let sumGraySq = 0;

  for (let i = 0; i < totalPx; i++) {
    const p = i * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;
    warmth[i] = r - b;
    sumGray += lum;
    sumGraySq += lum * lum;
  }

  const meanBrightness = sumGray / totalPx;
  const variance = Math.max(1, sumGraySq / totalPx - meanBrightness * meanBrightness);
  const rmsContrast = Math.sqrt(variance);

  for (let y = 1; y < workH - 1; y++) {
    for (let x = 1; x < workW - 1; x++) {
      const idx = y * workW + x;
      const gx =
        -gray[(y - 1) * workW + (x - 1)] + gray[(y - 1) * workW + (x + 1)] +
        -2 * gray[y * workW + (x - 1)] + 2 * gray[y * workW + (x + 1)] +
        -gray[(y + 1) * workW + (x - 1)] + gray[(y + 1) * workW + (x + 1)];
      const gy =
        -gray[(y - 1) * workW + (x - 1)] - 2 * gray[(y - 1) * workW + x] - gray[(y - 1) * workW + (x + 1)] +
        gray[(y + 1) * workW + (x - 1)] + 2 * gray[(y + 1) * workW + x] + gray[(y + 1) * workW + (x + 1)];
      edge[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  const cols = 4;
  const rows = 3;
  const tileW = workW / cols;
  const tileH = workH / rows;

  interface TileProfile {
    col: number;
    row: number;
    normX: number;
    normY: number;
    normWidth: number;
    normHeight: number;
    soilRatio: number;
    bedrockRatio: number;
    sandRatio: number;
    rockRatio: number;
    meanEdge: number;
    meanLum: number;
    classification: TerrainRegionClassification;
    hazardLevel: 'low' | 'moderate' | 'high';
  }

  const tiles: TileProfile[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x0 = Math.floor(c * tileW);
      const x1 = Math.min(workW, Math.floor((c + 1) * tileW));
      const y0 = Math.floor(r * tileH);
      const y1 = Math.min(workH, Math.floor((r + 1) * tileH));

      let tCount = 0;
      let tBed = 0;
      let tSand = 0;
      let tRock = 0;
      let tSoil = 0;
      let tEdge = 0;
      let tLum = 0;

      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const idx = yy * workW + xx;
          const gVal = gray[idx];
          const eVal = edge[idx];
          const wVal = warmth[idx];
          tCount++;
          tEdge += eVal;
          tLum += gVal;

          if ((gVal > meanBrightness + 1.15 * rmsContrast && eVal > 50) || (gVal < Math.max(25, meanBrightness - 1.15 * rmsContrast) && eVal > 42) || eVal > 78) {
            tRock++;
          } else if (gVal > meanBrightness + 0.25 * rmsContrast && eVal < 36) {
            tBed++;
          } else if (wVal > 14 && eVal < 38) {
            tSand++;
          } else {
            tSoil++;
          }
        }
      }

      if (tCount === 0) continue;
      const soilRatio = tSoil / tCount;
      const bedrockRatio = tBed / tCount;
      const sandRatio = tSand / tCount;
      const rockRatio = tRock / tCount;
      const meanEdge = tEdge / tCount;
      const meanLum = tLum / tCount;

      let classification: TerrainRegionClassification = 'Regolith & Loose Soil';
      let hazardLevel: 'low' | 'moderate' | 'high' = 'low';

      if (rockRatio >= 0.14 || meanEdge >= 42) {
        classification = rockRatio >= 0.2 ? 'Boulder Field' : 'Fractured Rock Surface';
        hazardLevel = rockRatio >= 0.22 ? 'high' : 'moderate';
      } else if (bedrockRatio >= 0.28) {
        classification = meanEdge > 24 ? 'Rocky Outcrop' : 'Bedrock Exposure';
        hazardLevel = meanEdge > 30 ? 'moderate' : 'low';
      } else if (sandRatio >= 0.22) {
        classification = 'Sand Deposit / Dune';
        hazardLevel = 'moderate';
      }

      tiles.push({
        col: c,
        row: r,
        normX: x0 / workW,
        normY: y0 / workH,
        normWidth: (x1 - x0) / workW,
        normHeight: (y1 - y0) / workH,
        soilRatio,
        bedrockRatio,
        sandRatio,
        rockRatio,
        meanEdge,
        meanLum,
        classification,
        hazardLevel
      });
    }
  }

  const mergedTiles: TileProfile[] = [];
  const used = new Set<number>();
  for (let i = 0; i < tiles.length; i++) {
    if (used.has(i)) continue;
    const base = { ...tiles[i] };
    used.add(i);

    let spanCols = 1;
    for (let j = i + 1; j < tiles.length; j++) {
      if (used.has(j)) continue;
      const cand = tiles[j];
      if (cand.row === base.row && cand.col === base.col + spanCols && cand.classification === base.classification) {
        used.add(j);
        spanCols++;
        base.normWidth = Number((base.normWidth + cand.normWidth).toFixed(4));
        base.soilRatio = (base.soilRatio + cand.soilRatio) / 2;
        base.bedrockRatio = (base.bedrockRatio + cand.bedrockRatio) / 2;
        base.sandRatio = (base.sandRatio + cand.sandRatio) / 2;
        base.rockRatio = (base.rockRatio + cand.rockRatio) / 2;
        base.meanEdge = (base.meanEdge + cand.meanEdge) / 2;
      } else if (cand.row !== base.row) {
        break;
      }
    }
    mergedTiles.push(base);
  }

  const prioritized = [...mergedTiles]
    .sort((a, b) => {
      const scoreA = a.rockRatio * 3 + a.bedrockRatio * 2 + a.sandRatio * 2 + (a.meanEdge / 60);
      const scoreB = b.rockRatio * 3 + b.bedrockRatio * 2 + b.sandRatio * 2 + (b.meanEdge / 60);
      return scoreB - scoreA;
    })
    .slice(0, 6);

  const cvRegions: TerrainRegionItem[] = prioritized.map((tile, idx) => {
    const cx = tile.normX + tile.normWidth / 2;
    const cy = tile.normY + tile.normHeight / 2;
    const locLabel = describeNormalizedZone(cx, cy);
    const box = normalizeBox(tile.normX, tile.normY, tile.normWidth, tile.normHeight, 0.06);

    const dominantPct = Math.round(
      Math.max(tile.soilRatio, tile.bedrockRatio, tile.sandRatio, tile.rockRatio) * 100
    );

    const charParts = [
      `Edge gradient ${tile.meanEdge.toFixed(1)} px/step`,
      `mean luminance ${Math.round(tile.meanLum)}/255`,
      `${Math.round(tile.bedrockRatio * 100)}% bright-flat plate`,
      `${Math.round(tile.rockRatio * 100)}% high-contrast rock/shadow`,
      `${Math.round(tile.sandRatio * 100)}% warm fine-grain`
    ];

    let sig = 'Representative regolith matrix suitable for baseline optical surface texture correlation.';
    let concern = 'Low wheel-obstruction density in 2D pixel contrast; verify fine-scale sinkage locally.';
    if (tile.classification === 'Boulder Field' || tile.classification === 'Fractured Rock Surface') {
      sig = 'High-relief clasts and angular rock edges indicate mechanical weathering, ejecta, or fractured caprock.';
      concern = 'Sharp rock edges and cast shadows pose wheel-puncture, hang-up, and high-clearance hazards.';
    } else if (tile.classification === 'Bedrock Exposure' || tile.classification === 'Rocky Outcrop') {
      sig = 'Coherent high-albedo, low-variance slab morphology consistent with exposed lithified outcrop.';
      concern = 'Firm bearing capacity generally favorable; inspect step edges for vertical drop-offs.';
    } else if (tile.classification === 'Sand Deposit / Dune') {
      sig = 'Smooth warm-toned unconsolidated windblown drift or ripple infill.';
      concern = 'Elevated rover wheel-slip and sinkage risk in unconsolidated aeolian fines.';
    }

    return {
      id: `cv_region_${idx + 1}`,
      title: `${tile.classification} (${locLabel})`,
      classification: tile.classification,
      locationDescription: `${locLabel} zone (~${Math.round(box.normX * 100)}–${Math.round((box.normX + box.normWidth) * 100)}% X, ${Math.round(box.normY * 100)}–${Math.round((box.normY + box.normHeight) * 100)}% Y)`,
      ...box,
      visualCharacteristics: `${dominantPct}% dominant regional pixel signature (${charParts.join(', ')}).`,
      confidence: Number(Math.min(0.92, Math.max(0.55, 0.58 + (tile.meanEdge / 140))).toFixed(2)),
      scientificSignificance: sig,
      roverTraversalConcerns: concern,
      hazardLevel: tile.hazardLevel,
      source: 'deterministic-cv'
    };
  });

  // For local blob/data URLs, produce base64 from a proportionally scaled canvas so Gemini sees the complete uncropped image
  let imageBase64ForUpload: string | undefined;
  let mimeTypeForUpload: string | undefined;
  if (imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
    const uploadMax = 1440;
    const upScale = Math.min(1, uploadMax / Math.max(nw, nh));
    const upW = Math.max(64, Math.round(nw * upScale));
    const upH = Math.max(64, Math.round(nh * upScale));
    const upCanvas = document.createElement('canvas');
    upCanvas.width = upW;
    upCanvas.height = upH;
    const upCtx = upCanvas.getContext('2d');
    if (upCtx) {
      upCtx.drawImage(img, 0, 0, upW, upH);
      const dataUrl = upCanvas.toDataURL('image/jpeg', 0.88);
      imageBase64ForUpload = dataUrl.split(',')[1];
      mimeTypeForUpload = 'image/jpeg';
    }
  }

  return {
    naturalWidth: nw,
    naturalHeight: nh,
    pixelComposition: cvResult.pixelComposition,
    meanBrightness: Math.round(meanBrightness),
    rmsContrast: Math.round(rmsContrast),
    roughnessScore: cvResult.surfaceTextureScore,
    shadowContrast: cvResult.shadowContrastRatio,
    dominantFeature: cvResult.dominantFeature,
    segmentationMaskUrl: cvResult.segmentationMaskUrl,
    cvRegions,
    cvObstacles: cvResult.detectedObstacles,
    imageBase64ForUpload,
    mimeTypeForUpload
  };
}

export async function analyzeCompleteTerrainImage(
  params: AnalyzeTerrainIntelligenceParams
): Promise<CompleteTerrainIntelligenceReport> {
  const startT = performance.now();
  const cacheKey = `${params.imageIdentifier || params.imageUrl}::${DATASET_VERSION}`;
  if (!params.forceRefresh && reportCache.has(cacheKey)) {
    return reportCache.get(cacheKey)!;
  }

  // 1. Complete-frame pixel analysis preserving exact aspect ratio
  const cv = await loadAndInspectCompleteImage(params.imageUrl, params.imageIdentifier, params.signal);

  if (params.signal?.aborted) {
    throw new DOMException('Terrain analysis aborted', 'AbortError');
  }

  // 2. Parallel external requests: AI Complete-Frame Vision + Conditional USGS/Trek Geo-verification
  const visionPromise = (async () => {
    try {
      const payload: Record<string, any> = {
        fileName: params.imageIdentifier,
        missionContext: params.mission || params.source,
        cameraContext: params.camera,
        solContext: params.sol
      };
      if (cv.imageBase64ForUpload) {
        payload.imageBase64 = cv.imageBase64ForUpload;
        payload.mimeType = cv.mimeTypeForUpload || 'image/jpeg';
      } else {
        payload.imageUrl = params.imageUrl;
      }

      const resp = await fetch('/api/gemini/analyze-terrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: params.signal
      });
      if (!resp.ok) {
        return { aiAvailable: false, aiStatus: `http_${resp.status}`, message: `Server HTTP ${resp.status}`, analysis: null };
      }
      return await resp.json();
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      return {
        aiAvailable: false,
        aiStatus: 'network_error',
        message: err?.message || 'Vision service request failed.',
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
    elevation: TrekElevationSample | null;
  }> => {
    if (!hasCoordinates) {
      return { geology: null, elevation: null };
    }
    const [geologyRes, elevRes] = await Promise.allSettled([
      fetchUsgsGeologyContext(params.lat!, params.lon!, params.regionId),
      fetchTrekElevationPoint(params.lat!, params.lon!)
    ]);
    return {
      geology: geologyRes.status === 'fulfilled' ? geologyRes.value : null,
      elevation: elevRes.status === 'fulfilled' ? elevRes.value : null
    };
  })();

  const [visionRes, geoRes] = await Promise.all([visionPromise, geoPromise]);

  if (params.signal?.aborted) {
    throw new DOMException('Terrain analysis aborted', 'AbortError');
  }

  const aiAvailable = Boolean(visionRes?.aiAvailable && visionRes?.analysis);
  const aiAnalysis = aiAvailable ? visionRes.analysis : null;

  // 3. Build Regions (AI Vision when available, else deterministic CV)
  let regions: TerrainRegionItem[] = [];
  if (aiAnalysis && Array.isArray(aiAnalysis.regions) && aiAnalysis.regions.length > 0) {
    regions = aiAnalysis.regions
      .slice(0, 10)
      .map((r: any, idx: number): TerrainRegionItem => {
        const box = normalizeBox(r.normX, r.normY, r.normWidth, r.normHeight, 0.05);
        const hLevel = String(r.hazardLevel || '').toLowerCase();
        const hazardLevel: 'low' | 'moderate' | 'high' =
          hLevel === 'high' ? 'high' : hLevel === 'moderate' ? 'moderate' : 'low';
        return {
          id: typeof r.id === 'string' && r.id.trim() ? r.id.trim() : `ai_region_${idx + 1}`,
          title: String(r.title || r.classification || `Terrain Region ${idx + 1}`),
          classification: String(r.classification || 'Other Formation'),
          locationDescription: String(r.locationDescription || describeNormalizedZone(box.normX + box.normWidth / 2, box.normY + box.normHeight / 2)),
          ...box,
          visualCharacteristics: String(r.visualCharacteristics || 'Visually identified surface morphology.'),
          confidence: Number(clamp01(Number(r.confidence), 0.72).toFixed(2)),
          scientificSignificance: String(r.scientificSignificance || 'Surface morphological region observed in optical imagery.'),
          roverTraversalConcerns: String(r.roverTraversalConcerns || 'Assess micro-topography locally prior to traversal.'),
          hazardLevel,
          source: 'gemini-vision'
        };
      });
  } else {
    regions = cv.cvRegions;
  }

  // 4. Fuse AI boulders + CV pixel-tight obstacles + high-hazard rock regions
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

  if (aiAnalysis && Array.isArray(aiAnalysis.boulders)) {
    aiAnalysis.boulders.slice(0, 24).forEach((b: any, i: number) => {
      const box = normalizeBox(Number(b.normX), Number(b.normY), Number(b.normWidth), Number(b.normHeight), 0.025);
      const classification = String(b.classification || 'boulder');
      const sizeCategory = coerceSizeCategory(b.sizeCategory, box.normWidth, box.normHeight, classification);
      const hazardStatus = coerceHazardStatus(b.hazardStatus);
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
        traversalRelevance: String(b.traversalRelevance || 'Obstacle detected in optical image; maintain safe stand-off margin.'),
        detectionMethod: 'Gemini Vision',
        confidence: Number(clamp01(Number(b.confidence), 0.76).toFixed(2)),
        ...box,
        pixelX: pxX,
        pixelY: pxY,
        pixelWidth: pxW,
        pixelHeight: pxH,
        physicalWidthM: null,
        physicalHeightM: null,
        dimensionsNote: String(b.dimensionsNote || `Visual estimate only (${pxW}×${pxH} px) — physical scale unavailable`)
      });
    });
  }

  // Add CV obstacles that don't heavily overlap with an already listed AI boulder
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

  // Mandatory: Incorporate prominent high-risk / moderate-risk rock regions as unified hard obstacles
  // (e.g. massive rocky outcrops, boulder fields, fractured rock scarps that span wide visual areas)
  regions.forEach((reg, rIdx) => {
    const isRockHazard =
      reg.hazardLevel === 'high' ||
      (reg.hazardLevel === 'moderate' && ['Rocky Outcrop', 'Boulder Field', 'Fractured Rock Surface'].includes(reg.classification));
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
        reg.normWidth * reg.normHeight * 100 >= 6.5
          ? 'massive_boulder'
          : reg.normWidth * reg.normHeight * 100 >= 2.2
            ? 'large_boulder'
            : 'rock_cluster';
      const { riskLevel, riskColor } = getRiskMeta(sizeCat);
      const pxW = Math.max(1, Math.round(reg.normWidth * cv.naturalWidth));
      const pxH = Math.max(1, Math.round(reg.normHeight * cv.naturalHeight));

      mergedObstacles.push({
        id: `reg_obs_${rIdx + 1}`,
        label: `${reg.title} (${reg.classification})`,
        classification: 'boulder',
        sizeCategory: sizeCat,
        hazardStatus: 'Potential traversal hazard',
        riskLevel,
        riskColor,
        traversalRelevance: `Prominent unified rock formation (${reg.classification}); impassable core. Route must detour around perimeter.`,
        detectionMethod: reg.source === 'gemini-vision' ? 'Gemini Vision' : 'CV Localizer',
        confidence: Number((reg.confidence / 100).toFixed(2)),
        ...regBox,
        pixelX: Math.round(reg.normX * cv.naturalWidth),
        pixelY: Math.round(reg.normY * cv.naturalHeight),
        pixelWidth: pxW,
        pixelHeight: pxH,
        physicalWidthM: null,
        physicalHeightM: null,
        dimensionsNote: `Visual region estimate (${pxW}×${pxH} px, ${reg.locationDescription}) — physical scale unavailable`
      });
    }
  });

  // 5. Build 3-Tier Geological Identification (Strict Scientific Integrity)
  const visibleFeatures: string[] = Array.isArray(aiAnalysis?.visibleFeatures) && aiAnalysis.visibleFeatures.length > 0
    ? aiAnalysis.visibleFeatures
    : [
        `${cv.pixelComposition.soilPct}% unconsolidated regolith / soil matrix`,
        ...(cv.pixelComposition.bedrockPct > 4 ? [`${cv.pixelComposition.bedrockPct}% coherent light-toned bedrock plates`] : []),
        ...(cv.pixelComposition.sandPct > 4 ? [`${cv.pixelComposition.sandPct}% fine warm-toned aeolian drift`] : []),
        ...(cv.pixelComposition.rockPct > 2 ? [`${cv.pixelComposition.rockPct}% high-contrast rock/shadow clasts`] : [])
      ];

  const rockFormations: string[] = Array.isArray(aiAnalysis?.rockFormations) && aiAnalysis.rockFormations.length > 0
    ? aiAnalysis.rockFormations
    : regions
        .filter(r => ['Bedrock Exposure', 'Rocky Outcrop', 'Layered Sedimentary Formation', 'Fractured Rock Surface', 'Boulder Field'].includes(r.classification))
        .map(r => `${r.classification} — ${r.locationDescription}`);

  const visibleFractures: string[] = Array.isArray(aiAnalysis?.visibleFractures) && aiAnalysis.visibleFractures.length > 0
    ? aiAnalysis.visibleFractures
    : [`Optical surface roughness index ${cv.roughnessScore} (RMS contrast ${cv.rmsContrast}, shadow ratio ${(cv.shadowContrast * 100).toFixed(1)}%)`];

  const sedimentaryStructures: string[] = Array.isArray(aiAnalysis?.sedimentaryStructures) && aiAnalysis.sedimentaryStructures.length > 0
    ? aiAnalysis.sedimentaryStructures
    : ['No definitive stratified sedimentary bedding verified from deterministic CV pixels alone.'];

  const visuallySummary = aiAnalysis?.geologicalFeaturesSummary
    ? String(aiAnalysis.geologicalFeaturesSummary)
    : `Complete-frame optical pixel analysis (${cv.naturalWidth}×${cv.naturalHeight} px) identifies ${cv.dominantFeature.toLowerCase()} (${cv.pixelComposition.soilPct}% soil/regolith, ${cv.pixelComposition.bedrockPct}% bright plate/bedrock, ${cv.pixelComposition.sandPct}% sand drift, ${cv.pixelComposition.rockPct}% high-relief rock clasts).`;

  const provisionalSummary = aiAnalysis?.provisionalGeologicalInference
    ? String(aiAnalysis.provisionalGeologicalInference)
    : `Provisional morphology suggests ${cv.pixelComposition.bedrockPct > 25 ? 'exposed consolidated lithic plates interbedded with wind-blown fines' : 'a regolith-mantled impact/aeolian surface with scattered rock clasts'}. Lithology and mineralogy cannot be confirmed from RGB optical pixels without orbital CRISM/THEMIS spectra or APXS/SHERLOC contact measurements.`;

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
      headline: 'No verified geological classification available for this location.',
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
        ? 'No verified geological classification available for this location. Frame lacks planetocentric coordinates or orbital footprint registration.'
        : (geoRes.geology?.note || 'No verified geological classification available for this location.')
    };
  } else if (coordinateScope === 'mission_landing_basin') {
    geoVerified = {
      status: 'mission_basin_context',
      matched: true,
      headline: `Basin-Level Context: Unit ${primaryUnit!.unitSymbol} (${primaryUnit!.unitName})`,
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
      notes: `Grounded in USGS–NASA SIM 3292 (1:20,000,000 scale) at nominal ${params.mission || 'mission'} landing-basin coordinates. Reflects regional basin stratigraphy rather than an exact single-frame rover footprint.`
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
      notes: `Verified against published USGS SIM 3292 geologic mapping (${geoRes.geology?.sourceStatus || 'live'}) and NASA JPL Mars Trek MOLA altimetry.`
    };
  }

  // 6. Build Structured Scientific Terrain Report
  const traversalHazards: string[] = Array.isArray(aiAnalysis?.terrainObstacles) && aiAnalysis.terrainObstacles.length > 0
    ? aiAnalysis.terrainObstacles
    : mergedObstacles.length > 0
      ? mergedObstacles.slice(0, 6).map(o => `${o.label} (${o.sizeCategory.replace('_', ' ')}): ${o.traversalRelevance}`)
      : regions
          .filter(r => r.hazardLevel !== 'low')
          .map(r => `${r.title}: ${r.roverTraversalConcerns}`);

  if (traversalHazards.length === 0) {
    traversalHazards.push('Low macro-boulder density detected; inspect localized fine-regolith sinkage and shadow pits before high-speed drive.');
  }

  const samplingOpportunities: string[] = Array.isArray(aiAnalysis?.samplingOpportunities) && aiAnalysis.samplingOpportunities.length > 0
    ? aiAnalysis.samplingOpportunities
    : regions
        .filter(r => ['Bedrock Exposure', 'Rocky Outcrop', 'Layered Sedimentary Formation', 'Fractured Rock Surface'].includes(r.classification))
        .map(r => `${r.title} — ${r.scientificSignificance}`);

  if (samplingOpportunities.length === 0) {
    samplingOpportunities.push('Regolith grain-size sorting and undisturbed surface soil trench/scoop sampling.');
  }

  const dataLimitations: string[] = Array.isArray(aiAnalysis?.dataLimitations) && aiAnalysis.dataLimitations.length > 0
    ? [...aiAnalysis.dataLimitations]
    : [
        'Visual estimate only — calibrated depth/elevation data unavailable from a single 2D optical reflectance image without stereoscopic/orbital DEM.',
        'Bulk chemical composition and hydration state cannot be determined without spectrometer payloads (CRISM, SuperCam, PIXL, SHERLOC).'
      ];

  if (!hasCoordinates) {
    dataLimitations.push('Frame lacks planetocentric lat/lon footprint; regional USGS SIM 3292 geologic unit mapping is unavailable.');
  } else if (coordinateScope === 'mission_landing_basin') {
    dataLimitations.push('Coordinates represent nominal rover mission landing-basin center (~1:20M SIM 3292 regional context), not individual camera-frame frustum footprint.');
  }
  if (!aiAvailable && visionRes?.message) {
    dataLimitations.push(String(visionRes.message));
  }

  const scientificReport: ScientificTerrainReport = {
    overallComposition: aiAnalysis?.overallComposition
      ? String(aiAnalysis.overallComposition)
      : `Full-frame optical pixel breakdown (${cv.naturalWidth}×${cv.naturalHeight} px): ${cv.pixelComposition.soilPct}% regolith/soil, ${cv.pixelComposition.bedrockPct}% bright bedrock plate, ${cv.pixelComposition.sandPct}% warm aeolian sand, and ${cv.pixelComposition.rockPct}% high-contrast rock/shadow features.`,
    geologicalFeaturesSummary: visuallySummary,
    rockAndSoilCharacteristics: aiAnalysis?.rockAndSoilCharacteristics
      ? String(aiAnalysis.rockAndSoilCharacteristics)
      : `Mean brightness ${cv.meanBrightness}/255 with RMS contrast ${cv.rmsContrast} and edge roughness index ${cv.roughnessScore}. ${cv.pixelComposition.rockPct > 10 ? 'Noticeable angular relief and shadow-casting clasts present.' : 'Predominantly low-relief surface matrix with localized clast contrast.'}`,
    regionalContext: geoVerified.matched && primaryUnit
      ? `${geoVerified.headline} (${geoVerified.quadrangle}). ${primaryUnit.epoch} — ${primaryUnit.lithology}${geoVerified.molaElevationM !== null ? ` Regional MOLA datum: ${geoVerified.molaElevationM.toFixed(0)} m.` : ''}`
      : 'No verified geological classification available for this location.',
    traversalHazards,
    samplingOpportunities,
    dataLimitations
  };

  const report: CompleteTerrainIntelligenceReport = {
    imageIdentifier: params.imageIdentifier || 'MARS_SURFACE_FRAME',
    datasetVersion: DATASET_VERSION,
    naturalWidth: cv.naturalWidth,
    naturalHeight: cv.naturalHeight,
    aspectRatio: `${(cv.naturalWidth / Math.max(1, cv.naturalHeight)).toFixed(2)}:1`,
    pixelComposition: cv.pixelComposition,
    meanBrightness: cv.meanBrightness,
    rmsContrast: cv.rmsContrast,
    roughnessScore: cv.roughnessScore,
    shadowContrast: cv.shadowContrast,
    dominantFeature: aiAnalysis?.dominantFeature ? String(aiAnalysis.dominantFeature) : cv.dominantFeature,
    segmentationMaskUrl: cv.segmentationMaskUrl,
    aiAvailable,
    aiStatus: String(visionRes?.aiStatus || (aiAvailable ? 'ok' : 'unavailable')),
    aiStatusMessage: visionRes?.message ? String(visionRes.message) : undefined,
    regions,
    detectedBoulders: mergedObstacles,
    geologicalIdentification: {
      visuallyDetected: {
        summary: visuallySummary,
        surfaceMaterials: visibleFeatures,
        rockFormations: rockFormations.length > 0 ? rockFormations : ['No distinct consolidated rock outcrops isolated in CV pass.'],
        fracturesAndTextures: visibleFractures,
        sedimentaryIndicators: sedimentaryStructures
      },
      geologicallyInferred: {
        provisionalSummary,
        confidenceCaveat: 'Provisional interpretation derived from 2D optical morphology only; subject to illumination geometry and dust cover.',
        mineralogicalNote: 'Mineralogy requires orbital hyperspectral (CRISM) or in-situ laser/X-ray spectroscopy.'
      },
      geographicallyVerified: geoVerified
    },
    scientificReport,
    visibleFeatures,
    rockFormations: rockFormations.length > 0 ? rockFormations : ['No consolidated outcrops isolated'],
    visibleFractures,
    sedimentaryStructures,
    terrainObstacles: traversalHazards,
    sandAndRegolith: aiAnalysis?.sandAndRegolith
      ? String(aiAnalysis.sandAndRegolith)
      : `${cv.pixelComposition.soilPct}% regolith soil matrix, ${cv.pixelComposition.sandPct}% fine warm aeolian drift.`,
    surfaceTexture: aiAnalysis?.surfaceTexture
      ? String(aiAnalysis.surfaceTexture)
      : `Optical roughness index ${cv.roughnessScore}, RMS contrast ${cv.rmsContrast}.`,
    geologicalRelevance: aiAnalysis?.geologicalRelevance
      ? String(aiAnalysis.geologicalRelevance)
      : provisionalSummary,
    recommendedInvestigationMethod: aiAnalysis?.recommendedInvestigationMethod
      ? String(aiAnalysis.recommendedInvestigationMethod)
      : 'Micro-imaging and local spectroscopic assessment required prior to contact sampling.',
    imageQuality: aiAnalysis?.imageQuality ? String(aiAnalysis.imageQuality) : `${cv.naturalWidth}×${cv.naturalHeight} px (${cv.rmsContrast > 28 ? 'High' : 'Moderate'} Contrast)`,
    generatedAt: new Date().toISOString(),
    processingTimeMs: Math.round(performance.now() - startT)
  };

  reportCache.set(cacheKey, report);
  return report;
}
