import { apiGet } from '../utils/apiClient';

/**
 * NASA & Planetary Data Central Service Layer
 * Authoritative central access for live Mars raw imagery, PDS HiRISE products,
 * in-situ InSight/MEDA/REMS environmental observations, and system health.
 * Features in-memory caching, request deduplication, and structured error handling.
 */

export interface MarsRawImage {
  id: string;
  imageid: string;
  title: string;
  sol: number;
  camera: string;
  cameraFullName: string;
  dateUtc: string;
  dateMars: string;
  thumbnailUrl: string;
  fullResUrl: string;
  sourceUrl: string;
  attitude?: string;
  extended?: {
    mastAz?: string;
    mastEl?: string;
    dimension?: string;
    scaleFactor?: string;
    xyz?: string;
  };
  site?: number;
  drive?: string | number;
  credit: string;
  mission: string;
  targetRegion: string;
  isStale?: boolean;
  dataSourceType?: 'jpl_raw_rss' | 'nasa_images_library';
  nasaId?: string;
  assetManifestUrl?: string;
  description?: string;
  nominalSiteCoords?: {
    lat: number;
    lon: number;
    label: string;
    coordinateScope: 'exact_verified' | 'mission_landing_basin' | 'unavailable';
  };
}

export interface HiRISEProduct {
  id: string;
  productType: 'DTM' | 'Orbital Imagery' | 'Stereo Pair';
  title: string;
  observationId: string;
  dtmProductId?: string;
  targetFeature: string;
  centerLatitude: number;
  centerLongitude: number;
  elevationMinM?: number;
  elevationMaxM?: number;
  spatialResolution: string;
  datum: string;
  acquisitionDate: string;
  thumbnailUrl: string;
  pdsUrl: string;
  description: string;
  sourceOrg: string;
  provenance: string;
}

export interface DataSourceHealth {
  sourceName: string;
  endpointUrl: string;
  status: 'connected' | 'degraded' | 'offline';
  latencyMs: number | null;
  lastSuccessfulUpdate: string | null;
  errorMessage?: string | null;
  cachedEntriesCount?: number;
}

export interface FetchRawImagesParams {
  mission?: 'mars2020' | 'msl' | 'opportunity' | 'spirit' | 'all';
  camera?: string;
  sol?: number | string;
  order?: 'newest' | 'oldest';
  fromSol?: number;
  toSol?: number;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  page?: number;
  search?: string;
  signal?: AbortSignal;
}

export interface SyncLatestResult {
  status: 'success' | 'fallback';
  mission: 'mars2020' | 'msl';
  latestSol: number;
  latestObservationDate: string;
  latestImageId: string;
  latestCamera: string;
  totalObservations: number;
  totalImagesArchive: number;
  lastCheckedAt: string;
  source: string;
}

export interface MarsEnvironmentalObservationRecord {
  average: number | null;
  min: number | null;
  max: number | null;
  sampleCount?: number;
  unit: string;
}

export interface MarsEnvironmentalDataPayload {
  success: boolean;
  timestamp: string;
  datasets: {
    insight: {
      available: boolean;
      data: {
        mission: string;
        station: string;
        sol: number;
        solKeys: string[];
        firstUtc: string | null;
        lastUtc: string | null;
        season: string | null;
        airTemperature: {
          averageC: number;
          minC: number;
          maxC: number;
          sampleCount: number;
          unit: string;
        } | null;
        atmosphericPressure: {
          averagePa: number;
          minPa: number;
          maxPa: number;
          sampleCount: number;
          unit: string;
        } | null;
        horizontalWindSpeed: {
          averageMs: number;
          minMs: number;
          maxMs: number;
          sampleCount: number;
          unit: string;
        } | null;
        windDirection: {
          compassPoint: string;
          compassDegrees: number;
        } | null;
        provenance: string;
        status: string;
        dataFreshness: string;
      } | null;
      error: string | null;
    };
    meda: {
      mission: string;
      instrument: string;
      location: string;
      liveStreamAvailable: boolean;
      status: string;
      citation: string;
      notes: string;
      publishedBaselines: {
        airTempRangeC: { min: number; max: number; mean: number; unit: string };
        groundTempRangeC: { min: number; max: number; mean: number; unit: string };
        pressureRangePa: { min: number; max: number; mean: number; unit: string };
        dustOpticalDepthTau: { typical: number; unit: string };
      };
    };
    rems: {
      mission: string;
      instrument: string;
      location: string;
      liveStreamAvailable: boolean;
      status: string;
      citation: string;
      notes: string;
      publishedBaselines: {
        airTempRangeC: { min: number; max: number; mean: number; unit: string };
        groundTempRangeC: { min: number; max: number; mean: number; unit: string };
        pressureRangePa: { min: number; max: number; mean: number; unit: string };
      };
    };
    rad: {
      mission: string;
      instrument: string;
      location: string;
      liveStreamAvailable: boolean;
      status: string;
      citation: string;
      notes: string;
      publishedBaselines: {
        surfaceAbsorbedDoseMgyDay: number;
        uncertaintyMgyDay: number;
        doseEquivalentMsvDay: number;
        annualEquivalentMsvYr: number;
        unit: string;
      };
    };
  };
}

// In-memory client cache with TTL
interface CacheItem<T> {
  data: T;
  timestamp: number;
}
const clientCache = new Map<string, CacheItem<any>>();
const CACHE_TTL_MS = 3 * 60 * 1000;

function getFromCache<T>(key: string): T | null {
  const item = clientCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    clientCache.delete(key);
    return null;
  }
  return item.data;
}

function saveToCache<T>(key: string, data: T) {
  clientCache.set(key, { data, timestamp: Date.now() });
}

// Request deduplication map: prevents identical concurrent fetches
const inFlightRequests = new Map<string, Promise<any>>();
function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing;
  const promise = fn().finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, promise);
  return promise;
}

/**
 * Check and synchronize latest NASA Mars rover observations
 */
export async function syncLatestObservation(mission: 'mars2020' | 'msl' = 'mars2020'): Promise<SyncLatestResult> {
  return deduplicate(`sync_${mission}`, async () => {
    const { data, error, isHtml } = await apiGet<SyncLatestResult>(`/api/nasa/sync/latest?mission=${mission}`);
    if (error || !data || isHtml) {
      throw new Error(error || 'Failed to synchronize latest observations');
    }
    return data;
  });
}

/**
 * Fetch raw rover images from NASA JPL / NASA Image Library with deduplication and caching
 */
export async function fetchMarsRawImages(params: FetchRawImagesParams = {}): Promise<{
  images: MarsRawImage[];
  totalResults: number;
  totalImages?: number;
  sol: number;
  latestObservationDate?: string;
  order?: 'newest' | 'oldest';
  mission?: string;
  isStale: boolean;
  retrievedAt: string;
}> {
  const {
    mission = 'mars2020',
    camera,
    sol,
    order = 'newest',
    limit = 24,
    page = 0,
    search,
    signal
  } = params;
  const cacheKey = `raw_${mission}_${camera || 'all'}_${sol || 'latest'}_${order}_${limit}_${page}_${search || ''}`;

  const cached = getFromCache<any>(cacheKey);
  if (cached) {
    return { ...cached, isStale: true };
  }

  return deduplicate(cacheKey, async () => {
    const queryParams = new URLSearchParams();
    queryParams.set('mission', mission);
    queryParams.set('num', String(limit));
    queryParams.set('page', String(page));
    queryParams.set('order', order);
    if (camera && camera !== 'ALL' && camera !== 'all') queryParams.set('camera', camera);
    if (sol !== undefined && sol !== 'latest' && String(sol).trim() !== '') queryParams.set('sol', String(sol));
    if (search && search.trim() !== '') queryParams.set('search', search.trim());

    try {
      const { data, error, isHtml } = await apiGet<any>(`/api/nasa/mars2020/raw?${queryParams.toString()}`, { signal });
      if (error || isHtml || !data) {
        throw new Error(error || 'Failed to fetch Mars raw images');
      }
      saveToCache(cacheKey, data);
      return data;
    } catch (err: any) {
      if (signal?.aborted) throw err;
      const stale = clientCache.get(cacheKey)?.data;
      if (stale) {
        return { ...stale, isStale: true };
      }
      throw err;
    }
  });
}

/**
 * Fetch real scientific environmental observations (InSight, MEDA, REMS, RAD)
 */
export async function fetchMarsEnvironmentalData(): Promise<MarsEnvironmentalDataPayload> {
  const cacheKey = 'mars_environmental_data';
  const cached = getFromCache<MarsEnvironmentalDataPayload>(cacheKey);
  if (cached) return cached;

  return deduplicate(cacheKey, async () => {
    const { data, error, isHtml } = await apiGet<MarsEnvironmentalDataPayload>('/api/nasa/environmental');
    if (error || isHtml || !data) {
      throw new Error(error || 'Failed to load Mars environmental datasets');
    }
    saveToCache(cacheKey, data);
    return data;
  });
}

/**
 * Fetch real HiRISE orbital and digital elevation products from NASA & PDS
 */
export async function fetchHiRISEProducts(query?: string): Promise<{
  products: HiRISEProduct[];
  retrievedAt: string;
}> {
  const cacheKey = `hirise_${query || 'all'}`;
  const cached = getFromCache<any>(cacheKey);
  if (cached) return cached;

  return deduplicate(cacheKey, async () => {
    const { data, error, isHtml } = await apiGet<any>(`/api/nasa/hirise/products${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    if (error || isHtml || !data) {
      throw new Error(error || 'Failed to fetch HiRISE products');
    }
    saveToCache(cacheKey, data);
    return data;
  });
}

/**
 * Search NASA Image and Video Library
 */
export async function fetchNasaImagesLibrary(query: string, page = 1, pageSize = 24): Promise<any> {
  const cacheKey = `images_lib_${query}_${page}_${pageSize}`;
  const cached = getFromCache<any>(cacheKey);
  if (cached) return cached;

  return deduplicate(cacheKey, async () => {
    const { data, error, isHtml } = await apiGet<any>(
      `/api/nasa/images-library/search?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`
    );
    if (error || isHtml || !data) {
      throw new Error(error || 'Failed to search NASA image library');
    }
    saveToCache(cacheKey, data);
    return data;
  });
}

/**
 * Fetch asset manifest for a NASA Image ID
 */
export async function fetchNasaAssetManifest(nasaId: string): Promise<any> {
  const cacheKey = `asset_manifest_${nasaId}`;
  const cached = getFromCache<any>(cacheKey);
  if (cached) return cached;

  return deduplicate(cacheKey, async () => {
    const { data, error, isHtml } = await apiGet<any>(`/api/nasa/images-library/asset/${encodeURIComponent(nasaId)}`);
    if (error || isHtml || !data) {
      throw new Error(error || 'Failed to fetch NASA asset manifest');
    }
    saveToCache(cacheKey, data);
    return data;
  });
}

/**
 * Fetch diagnostic telemetry from all integration endpoints
 */
export async function fetchNasaDiagnostics(): Promise<any> {
  const { data, error, isHtml } = await apiGet<any>('/api/nasa/diagnostics');
  if (error || isHtml || !data) {
    throw new Error(error || 'Failed to retrieve NASA diagnostics');
  }
  return data;
}

/**
 * Fetch real-time health and connectivity metrics for all Mars data sources
 */
export async function fetchSourcesHealth(): Promise<{
  sources: DataSourceHealth[];
  overallStatus: 'connected' | 'degraded' | 'offline';
  timestamp: string;
}> {
  try {
    const { data, error, isHtml } = await apiGet<any>('/api/sources/health');
    if (error || isHtml || !data) {
      throw new Error(error || 'Health check failed');
    }
    return data;
  } catch (err: any) {
    return {
      sources: [
        {
          sourceName: 'NASA Mars 2020 Raw Feed (JPL)',
          endpointUrl: 'https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020',
          status: 'offline',
          latencyMs: null,
          lastSuccessfulUpdate: null,
          errorMessage: err.message
        },
        {
          sourceName: 'NASA Planetary Data System (PDS Geosciences)',
          endpointUrl: 'https://pds-geosciences.wustl.edu/',
          status: 'offline',
          latencyMs: null,
          lastSuccessfulUpdate: null,
          errorMessage: err.message
        }
      ],
      overallStatus: 'offline',
      timestamp: new Date().toISOString()
    };
  }
}
