/**
 * NASA & PDS Data Service Layer
 * Authoritative data-access client for live Mars raw imagery, PDS HiRISE DTMs,
 * and data-source health monitoring with caching, cancellation, and error handling.
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
  mission: 'Mars 2020 (Perseverance)' | 'MSL (Curiosity)';
  targetRegion: string;
  isStale?: boolean;
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
  mission?: 'mars2020' | 'msl';
  camera?: string;
  sol?: number | string;
  limit?: number;
  page?: number;
  signal?: AbortSignal;
}

// In-memory client cache with 5-minute TTL
interface CacheItem<T> {
  data: T;
  timestamp: number;
}
const clientCache = new Map<string, CacheItem<any>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

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

/**
 * Fetch raw rover images from NASA JPL Mars Raw Feed
 */
export async function fetchMarsRawImages(params: FetchRawImagesParams = {}): Promise<{
  images: MarsRawImage[];
  totalResults: number;
  sol: number;
  isStale: boolean;
  retrievedAt: string;
}> {
  const { mission = 'mars2020', camera, sol, limit = 24, page = 0, signal } = params;
  const cacheKey = `raw_${mission}_${camera || 'all'}_${sol || 'latest'}_${limit}_${page}`;
  
  const cached = getFromCache<any>(cacheKey);
  if (cached) {
    return { ...cached, isStale: true };
  }

  const queryParams = new URLSearchParams();
  queryParams.set('mission', mission);
  queryParams.set('num', String(limit));
  queryParams.set('page', String(page));
  if (camera && camera !== 'ALL') queryParams.set('camera', camera);
  if (sol !== undefined && sol !== 'latest') queryParams.set('sol', String(sol));

  try {
    const res = await fetch(`/api/nasa/mars2020/raw?${queryParams.toString()}`, { signal });
    if (!res.ok) {
      throw new Error(`Failed to fetch Mars raw images: HTTP ${res.status}`);
    }
    const data = await res.json();
    saveToCache(cacheKey, data);
    return data;
  } catch (err: any) {
    if (signal?.aborted) throw err;
    // If request fails, return cached if available or fallback
    const stale = clientCache.get(cacheKey)?.data;
    if (stale) {
      return { ...stale, isStale: true };
    }
    throw err;
  }
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

  const res = await fetch(`/api/nasa/hirise/products${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch HiRISE products: HTTP ${res.status}`);
  }
  const data = await res.json();
  saveToCache(cacheKey, data);
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
    const res = await fetch('/api/sources/health');
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    return await res.json();
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
