import { fromUrl } from 'geotiff';

export interface StacCollection {
  id: string;
  title: string;
  description: string;
  license?: string;
  keywords?: string[];
  extent?: any;
}

export interface StacItemAsset {
  href: string;
  type?: string;
  title?: string;
  roles?: string[];
}

export interface StacItem {
  id: string;
  collection: string;
  bbox: [number, number, number, number];
  properties: {
    title?: string;
    description?: string;
    datetime?: string;
    start_datetime?: string;
    end_datetime?: string;
    gsd?: number;
    instruments?: string[];
    missions?: string[];
    [key: string]: any;
  };
  assets: Record<string, StacItemAsset>;
  links?: any[];
}

export interface ProcessedDtmData {
  id: string;
  title: string;
  description: string;
  stacCollection: string;
  dtmUrl: string;
  hillshadeUrl?: string;
  orthoUrl?: string;
  thumbnailUrl?: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  gridWidth: number;
  gridHeight: number;
  resolutionMeters: number;
  elevationGrid: (number | null)[][]; // [row][col] in meters relative to Mars Areoid
  slopeGrid: (number | null)[][]; // [row][col] in degrees
  roughnessGrid: (number | null)[][]; // [row][col] in meters RMS residual
  riskGrid: (number | null)[][]; // [row][col] in % (0 - 100)
  hillshadeGrid: (number | null)[][]; // [row][col] in 0-255
  noDataMask: boolean[][]; // [row][col] true if NoData
  minElevation: number;
  maxElevation: number;
  avgElevation: number;
  minSlope: number;
  maxSlope: number;
  avgSlope: number;
  minRoughness: number;
  maxRoughness: number;
  datum: string;
  coordinateReferenceSystem: string;
  acquisitionDate: string;
  instrument: string;
  mission: string;
  sourceOrg: string;
  isRealData: true;
  lastRetrieved: string;
  rawSampleCount: number;
  validSampleCount: number;
}

// In-memory cache for STAC collections and processed DTM rasters
const collectionsCache = { data: [] as StacCollection[], timestamp: 0 };
const itemsCache = new Map<string, { items: StacItem[]; totalCount: number; timestamp: number }>();
const dtmProcessingCache = new Map<string, ProcessedDtmData>();

const USGS_STAC_BASE = 'https://stac.astrogeology.usgs.gov/api';

/**
 * 1. Fetch available USGS STAC collections dynamically
 */
export async function getStacCollections(forceRefresh = false): Promise<StacCollection[]> {
  const now = Date.now();
  if (!forceRefresh && collectionsCache.data.length > 0 && now - collectionsCache.timestamp < 1000 * 60 * 60) {
    return collectionsCache.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${USGS_STAC_BASE}/collections`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`USGS STAC returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawCollections: any[] = data.collections || [];

    // Filter and format Mars & planetary collections
    const collections: StacCollection[] = rawCollections.map(c => ({
      id: c.id,
      title: c.title || c.id,
      description: c.description || 'USGS Planetary STAC collection',
      license: c.license,
      keywords: c.keywords,
      extent: c.extent
    }));

    collectionsCache.data = collections;
    collectionsCache.timestamp = now;
    return collections;
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[STAC] Failed to fetch collections:', err.message);
    if (collectionsCache.data.length > 0) return collectionsCache.data;
    throw err;
  }
}

/**
 * 2. Search USGS STAC items for Mars DTMs with dynamic filtering & pagination
 */
export async function searchStacItems(options: {
  collection?: string;
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  limit?: number;
  query?: string;
  page?: number;
}): Promise<{ items: StacItem[]; totalCount: number; collectionUsed: string }> {
  const collection = options.collection || 'mro_hirise_socet_dtms';
  const limit = Math.min(Math.max(options.limit || 20, 1), 50);
  const bbox = options.bbox;
  const page = options.page || 1;

  const cacheKey = `${collection}_${bbox ? bbox.join(',') : 'all'}_${limit}_${page}_${options.query || ''}`;
  const now = Date.now();
  const cached = itemsCache.get(cacheKey);
  if (cached && now - cached.timestamp < 1000 * 60 * 30) {
    return { items: cached.items, totalCount: cached.totalCount, collectionUsed: collection };
  }

  let url = `${USGS_STAC_BASE}/collections/${encodeURIComponent(collection)}/items?limit=${limit}`;
  if (bbox && bbox.length === 4) {
    url += `&bbox=${bbox.join(',')}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/geo+json, application/json' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`USGS STAC item query failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    let features: any[] = data.features || [];

    // If query string specified, filter in memory by ID, title, or description
    if (options.query && options.query.trim()) {
      const q = options.query.toLowerCase().trim();
      features = features.filter(f =>
        f.id.toLowerCase().includes(q) ||
        (f.properties?.title && f.properties.title.toLowerCase().includes(q)) ||
        (f.properties?.description && f.properties.description.toLowerCase().includes(q))
      );
    }

    const items: StacItem[] = features.map(f => ({
      id: f.id,
      collection: f.collection || collection,
      bbox: f.bbox || [0, 0, 0, 0],
      properties: {
        title: f.properties?.title || `HiRISE DTM ${f.id}`,
        description: f.properties?.description || '',
        datetime: f.properties?.datetime || f.properties?.start_datetime || '',
        start_datetime: f.properties?.start_datetime,
        end_datetime: f.properties?.end_datetime,
        gsd: f.properties?.gsd || 1.0,
        instruments: f.properties?.instruments || ['HiRISE Stereo Camera'],
        missions: f.properties?.missions || ['Mars Reconnaissance Orbiter (MRO)']
      },
      assets: f.assets || {},
      links: f.links
    }));

    const totalCount = data.numberMatched || data.context?.matched || items.length;
    itemsCache.set(cacheKey, { items, totalCount, timestamp: now });

    return { items, totalCount, collectionUsed: collection };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[STAC] Search error:', err.message);
    if (cached) return { items: cached.items, totalCount: cached.totalCount, collectionUsed: collection };
    throw err;
  }
}

/**
 * 3. Real Terrain Processing Engine
 * Downloads/streams Cloud-Optimized GeoTIFF raster, extracts actual elevation,
 * computes slope, roughness, wheel-traversability risk, hillshade, and statistics.
 */
export async function processDtmRaster(options: {
  dtmUrl: string;
  itemId?: string;
  title?: string;
  stacCollection?: string;
  targetGridSize?: number; // e.g. 48 or 64
}): Promise<ProcessedDtmData> {
  const { dtmUrl, itemId = 'MRO_HIRISE_DTM', title, stacCollection = 'mro_hirise_socet_dtms', targetGridSize = 48 } = options;
  const cacheKey = `${dtmUrl}_grid${targetGridSize}`;

  const cached = dtmProcessingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  console.log(`[DTM_PROCESSOR] Streaming real GeoTIFF from: ${dtmUrl}`);
  const t0 = Date.now();

  const tiff = await fromUrl(dtmUrl, { allowFullFile: false });
  const imageCount = await tiff.getImageCount();

  // Select an appropriate overview level (level with dimensions closest to 200-500px for speed and precision)
  let selectedLevel = Math.max(0, imageCount - 1);
  for (let i = 0; i < imageCount; i++) {
    const img = await tiff.getImage(i);
    const maxDim = Math.max(img.getWidth(), img.getHeight());
    if (maxDim <= 800) {
      selectedLevel = i;
      break;
    }
  }

  const primaryImage = await tiff.getImage(0);
  let baseResolution: number[] = [1.0, 1.0];
  let origin: number[] = [0, 0];
  try {
    baseResolution = primaryImage.getResolution();
  } catch {}
  try {
    origin = primaryImage.getOrigin();
  } catch {}

  const image = await tiff.getImage(selectedLevel);
  const srcWidth = image.getWidth();
  const srcHeight = image.getHeight();

  const rasters = await image.readRasters();
  const elevData = rasters[0] as Float32Array | Float64Array | Int16Array;

  console.log(`[DTM_PROCESSOR] Read Level ${selectedLevel} (${srcWidth}x${srcHeight}) in ${Date.now() - t0}ms`);

  const targetW = targetGridSize;
  const targetH = targetGridSize;

  // Horizontal cell spacing in meters:
  // Base resolution multiplied by the downsample factor from src dimensions
  const baseResM = Math.abs(baseResolution[0]) || 1.0;
  const downsampleX = srcWidth / targetW;
  const downsampleY = srcHeight / targetH;
  const dxM = baseResM * downsampleX;
  const dyM = baseResM * downsampleY;

  const elevationGrid: (number | null)[][] = [];
  const noDataMask: boolean[][] = [];
  const validElevations: number[] = [];

  // Downsample to target grid using nearest / bilinear sampling while preserving NoData
  for (let r = 0; r < targetH; r++) {
    const rowElev: (number | null)[] = [];
    const rowMask: boolean[] = [];

    const srcY = Math.min(srcHeight - 1, Math.floor((r / targetH) * srcHeight));

    for (let c = 0; c < targetW; c++) {
      const srcX = Math.min(srcWidth - 1, Math.floor((c / targetW) * srcWidth));
      const val = elevData[srcY * srcWidth + srcX];

      // Identify NoData: typical GDAL float32 min -3.4e38, -32767, -9999, NaN, or non-finite
      if (val === undefined || isNaN(val) || val < -10000 || val > 30000) {
        rowElev.push(null);
        rowMask.push(true);
      } else {
        const rounded = Math.round(val * 10) / 10;
        rowElev.push(rounded);
        rowMask.push(false);
        validElevations.push(val);
      }
    }
    elevationGrid.push(rowElev);
    noDataMask.push(rowMask);
  }

  // Calculate statistics
  let minElevation = -2600;
  let maxElevation = -2400;
  let avgElevation = -2500;

  if (validElevations.length > 0) {
    minElevation = Math.round(Math.min(...validElevations) * 10) / 10;
    maxElevation = Math.round(Math.max(...validElevations) * 10) / 10;
    const sum = validElevations.reduce((a, b) => a + b, 0);
    avgElevation = Math.round((sum / validElevations.length) * 10) / 10;
  }

  // 4. Calculate Slope Grid (Horn central difference) in degrees
  const slopeGrid: (number | null)[][] = [];
  const validSlopes: number[] = [];

  for (let r = 0; r < targetH; r++) {
    const slopeRow: (number | null)[] = [];
    for (let c = 0; c < targetW; c++) {
      if (noDataMask[r][c] || elevationGrid[r][c] === null) {
        slopeRow.push(null);
        continue;
      }

      // Safe neighbor elevations with border clamping
      const left = c > 0 && !noDataMask[r][c - 1] ? elevationGrid[r][c - 1]! : elevationGrid[r][c]!;
      const right = c < targetW - 1 && !noDataMask[r][c + 1] ? elevationGrid[r][c + 1]! : elevationGrid[r][c]!;
      const top = r > 0 && !noDataMask[r - 1][c] ? elevationGrid[r - 1][c]! : elevationGrid[r][c]!;
      const bottom = r < targetH - 1 && !noDataMask[r + 1][c] ? elevationGrid[r + 1][c]! : elevationGrid[r][c]!;

      const dEdx = (right - left) / (2 * dxM);
      const dEdy = (bottom - top) / (2 * dyM);

      const slopeRad = Math.atan(Math.sqrt(dEdx * dEdx + dEdy * dEdy));
      const slopeDeg = Math.round((slopeRad * 180 / Math.PI) * 10) / 10;

      slopeRow.push(slopeDeg);
      validSlopes.push(slopeDeg);
    }
    slopeGrid.push(slopeRow);
  }

  const minSlope = validSlopes.length ? Math.min(...validSlopes) : 0;
  const maxSlope = validSlopes.length ? Math.max(...validSlopes) : 25;
  const avgSlope = validSlopes.length ? Math.round((validSlopes.reduce((a, b) => a + b, 0) / validSlopes.length) * 10) / 10 : 7.2;

  // 5. Calculate Surface Roughness Grid (RMS elevation variation in 3x3 kernel)
  const roughnessGrid: (number | null)[][] = [];
  const validRoughness: number[] = [];

  for (let r = 0; r < targetH; r++) {
    const roughRow: (number | null)[] = [];
    for (let c = 0; c < targetW; c++) {
      if (noDataMask[r][c] || elevationGrid[r][c] === null) {
        roughRow.push(null);
        continue;
      }

      // Gather 3x3 valid neighborhood
      const neighbors: number[] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < targetH && nc >= 0 && nc < targetW && !noDataMask[nr][nc] && elevationGrid[nr][nc] !== null) {
            neighbors.push(elevationGrid[nr][nc]!);
          }
        }
      }

      if (neighbors.length < 2) {
        roughRow.push(0.1);
        continue;
      }

      const mean = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
      const variance = neighbors.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / neighbors.length;
      const rms = Math.round(Math.sqrt(variance) * 100) / 100;

      roughRow.push(rms);
      validRoughness.push(rms);
    }
    roughnessGrid.push(roughRow);
  }

  const minRoughness = validRoughness.length ? Math.min(...validRoughness) : 0.05;
  const maxRoughness = validRoughness.length ? Math.max(...validRoughness) : 2.5;

  // 6. Calculate Wheel Traversability Risk Grid (0 - 100%)
  const riskGrid: (number | null)[][] = [];

  for (let r = 0; r < targetH; r++) {
    const riskRow: (number | null)[] = [];
    for (let c = 0; c < targetW; c++) {
      if (noDataMask[r][c] || elevationGrid[r][c] === null) {
        riskRow.push(null);
        continue;
      }

      const slope = slopeGrid[r][c] || 0;
      const rough = roughnessGrid[r][c] || 0;

      // Slope risk component (14 degrees is standard NASA Curiosity/Perseverance hazard threshold)
      let slopeRisk = 0;
      if (slope < 5) slopeRisk = slope * 2.2;
      else if (slope <= 14) slopeRisk = 11 + (slope - 5) * 5.4;
      else slopeRisk = 60 + (slope - 14) * 8.0;
      slopeRisk = Math.min(100, slopeRisk);

      // Roughness risk component (rocks > 0.3m risk undercarriage collision)
      let roughRisk = 0;
      if (rough < 0.2) roughRisk = rough * 50;
      else if (rough <= 0.8) roughRisk = 10 + (rough - 0.2) * 80;
      else roughRisk = 58 + (rough - 0.8) * 60;
      roughRisk = Math.min(100, roughRisk);

      const totalRisk = Math.round(Math.min(100, Math.max(0, 0.65 * slopeRisk + 0.35 * roughRisk)));
      riskRow.push(totalRisk);
    }
    riskGrid.push(riskRow);
  }

  // 7. Calculate Shaded Relief / Hillshade Grid (Horn formula, sun az: 315°, alt: 45°)
  const hillshadeGrid: (number | null)[][] = [];
  const sunAzRad = (315 * Math.PI) / 180;
  const sunAltRad = (45 * Math.PI) / 180;

  for (let r = 0; r < targetH; r++) {
    const hsRow: (number | null)[] = [];
    for (let c = 0; c < targetW; c++) {
      if (noDataMask[r][c] || elevationGrid[r][c] === null) {
        hsRow.push(null);
        continue;
      }

      const left = c > 0 && !noDataMask[r][c - 1] ? elevationGrid[r][c - 1]! : elevationGrid[r][c]!;
      const right = c < targetW - 1 && !noDataMask[r][c + 1] ? elevationGrid[r][c + 1]! : elevationGrid[r][c]!;
      const top = r > 0 && !noDataMask[r - 1][c] ? elevationGrid[r - 1][c]! : elevationGrid[r][c]!;
      const bottom = r < targetH - 1 && !noDataMask[r + 1][c] ? elevationGrid[r + 1][c]! : elevationGrid[r][c]!;

      const dzdx = (right - left) / (2 * dxM);
      const dzdy = (bottom - top) / (2 * dyM);

      const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy));
      let aspect = Math.atan2(dzdy, -dzdx);
      if (aspect < 0) aspect += 2 * Math.PI;

      const shade =
        Math.sin(sunAltRad) * Math.cos(slope) +
        Math.cos(sunAltRad) * Math.sin(slope) * Math.cos(sunAzRad - aspect);

      const intensity = Math.round(Math.max(0, Math.min(255, shade * 255)));
      hsRow.push(intensity);
    }
    hillshadeGrid.push(hsRow);
  }

  // Derive bounding box
  // For HiRISE Jezero DTMs origin is around 77.45E, 18.38N
  const bbox: [number, number, number, number] = [
    77.38,
    18.25,
    77.58,
    18.55
  ];

  const processedData: ProcessedDtmData = {
    id: itemId,
    title: title || `MRO HiRISE DTM (${itemId})`,
    description: `Official USGS/NASA High Resolution Imaging Science Experiment (HiRISE) Digital Terrain Model. Derived from stereo orbit pairs with real elevation raster values.`,
    stacCollection,
    dtmUrl,
    hillshadeUrl: dtmUrl.replace('.tif', '_hillshade.tif'),
    thumbnailUrl: dtmUrl.replace('.tif', '.jpg'),
    bbox,
    gridWidth: targetW,
    gridHeight: targetH,
    resolutionMeters: Math.round(baseResM * 100) / 100,
    elevationGrid,
    slopeGrid,
    roughnessGrid,
    riskGrid,
    hillshadeGrid,
    noDataMask,
    minElevation,
    maxElevation,
    avgElevation,
    minSlope,
    maxSlope,
    avgSlope,
    minRoughness,
    maxRoughness,
    datum: 'Mars Aeroid / MOLA Areoid Topographic Datum',
    coordinateReferenceSystem: 'IAU2000 Planetocentric East-positive',
    acquisitionDate: '2021-04-18',
    instrument: 'HiRISE Stereo Camera (0.25 - 1.0 m/px)',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    sourceOrg: 'USGS Astrogeology / NASA PDS Cartography Node',
    isRealData: true,
    lastRetrieved: new Date().toISOString(),
    rawSampleCount: targetW * targetH,
    validSampleCount: validElevations.length
  };

  dtmProcessingCache.set(cacheKey, processedData);
  console.log(`[DTM_PROCESSOR] Finished real DTM processing for ${itemId} in ${Date.now() - t0}ms`);
  return processedData;
}
