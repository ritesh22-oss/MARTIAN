import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Firebase (optional cache backend) ───────────────────────────────────────
// Firebase is used for persistent caching in non-serverless environments.
// In serverless (e.g. Vercel), we strictly use the fast in-memory cache to avoid
// cold-start hangs and dynamic import overhead.

let db: any = null;
let getFirestoreDoc: ((key: string) => Promise<any>) | null = null;
let setFirestoreDoc: ((key: string, data: any) => Promise<void>) | null = null;
let firebaseInitialized = false;

async function ensureFirebase() {
  if (firebaseInitialized) return;
  firebaseInitialized = true;

  // Never load Firebase in Vercel or AWS Lambda serverless
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return;
  }

  try {
    const { initializeApp, getApp, getApps } = await import('firebase/app');
    const { getFirestore, doc, getDoc, setDoc, Timestamp } = await import('firebase/firestore');

    // Load Firebase config from file (local) or fall back to env vars
    let firebaseConfig: any = {};
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    if (firebaseConfig.projectId) {
      const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      const firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

      getFirestoreDoc = async (key: string) => {
        const docRef = doc(firestore, 'nasa_cache', key);
        const snap = await getDoc(docRef);
        return snap.exists() ? snap.data() : null;
      };

      setFirestoreDoc = async (key: string, data: any) => {
        const docRef = doc(firestore, 'nasa_cache', key);
        await setDoc(docRef, { ...data, updatedAt: Timestamp.now() });
      };

      console.log('[NASA_ENGINE] Firebase cache backend initialized.');
    } else {
      console.warn('[NASA_ENGINE] No Firebase projectId found — using in-memory cache.');
    }
  } catch (err: any) {
    console.warn('[NASA_ENGINE] Firebase init skipped/failed — using in-memory cache.', err?.message || err);
  }
}

// ─── In-memory fallback cache ─────────────────────────────────────────────────
const memoryCache = new Map<string, { data: any; timestamp: string; url: string; source: string }>();

export interface CacheEntry<T> {
  data: T;
  timestamp: string;
  url: string;
  source: string;
  isStale: boolean;
}

export class NASADataEngine {
  private static CACHE_COLLECTION = 'nasa_cache';
  private static DEFAULT_TIMEOUT = 12000;

  /**
   * Robust fetch with timeout, retry, and caching
   */
  static async fetchWithCache<T>(
    url: string,
    options: {
      cacheTTLMs?: number;
      forceRefresh?: boolean;
      headers?: Record<string, string>;
      timeoutMs?: number;
      retries?: number;
    } = {}
  ): Promise<{ data: T; source: 'live' | 'cache' | 'fallback'; timestamp: string }> {
    const {
      cacheTTLMs = 1000 * 60 * 60 * 24, // 24 hours default for images/raw data
      forceRefresh = false,
      headers = {},
      timeoutMs = this.DEFAULT_TIMEOUT,
      retries = 2
    } = options;

    const cacheKey = this.generateCacheKey(url);

    // 1. Try Cache first unless forceRefresh
    if (!forceRefresh) {
      try {
        const cached = await this.readCache(cacheKey);
        if (cached) {
          const age = Date.now() - new Date(cached.timestamp).getTime();
          if (age < cacheTTLMs) {
            return {
              data: cached.data as T,
              source: 'cache',
              timestamp: cached.timestamp
            };
          }
          console.log(`[NASA_ENGINE] Cache expired for ${url} (Age: ${Math.round(age / 1000 / 60)}m)`);
        }
      } catch (err) {
        console.warn(`[NASA_ENGINE] Cache read error:`, err);
      }
    }

    // 2. Try Live Fetch
    try {
      const data = await this.fetchWithRetry<T>(url, headers, timeoutMs, retries);
      const timestamp = new Date().toISOString();

      // Async cache update (don't block response)
      this.writeCache(cacheKey, { data, timestamp, url, source: 'nasa_jpl' })
        .catch(err => console.warn(`[NASA_ENGINE] Cache write error:`, err));

      return { data, source: 'live', timestamp };
    } catch (err: any) {
      console.warn(`[NASA_ENGINE] Live fetch failed for ${url}:`, err.message);

      // 3. Try Stale Cache Fallback
      try {
        const staleCached = await this.readCache(cacheKey);
        if (staleCached) {
          console.log(`[NASA_ENGINE] Serving stale cache for ${url}`);
          return {
            data: staleCached.data as T,
            source: 'cache',
            timestamp: staleCached.timestamp
          };
        }
      } catch (cacheErr) {
        // ignore
      }

      throw err;
    }
  }

  private static async fetchWithRetry<T>(
    url: string,
    headers: Record<string, string>,
    timeoutMs: number,
    retries: number
  ): Promise<T> {
    let lastError: any;

    // Automatically append API key if it's api.nasa.gov (excluding images-api.nasa.gov which rejects api_key)
    let finalUrl = url;
    if (url.includes('api.nasa.gov') && !url.includes('images-api.nasa.gov') && !url.includes('api_key=')) {
      // Clean quotes and whitespace from key
      const rawKey = (process.env.NASA_API_KEY || '').trim().replace(/^["']|["']$/g, '');
      const apiKey = rawKey.length > 0 ? rawKey : 'DEMO_KEY';
      finalUrl += (url.includes('?') ? '&' : '?') + `api_key=${apiKey}`;
    }

    for (let i = 0; i <= retries; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(finalUrl, {
          headers: {
            'User-Agent': 'MarsNav/4.0 (NASA Mission Operations; AI Studio Build)',
            'Accept': 'application/json',
            'Referer': 'https://mars.nasa.gov/',
            ...headers
          },
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (response.status === 429) {
          console.warn(`[NASA_ENGINE] Upstream rate limit (429) on ${url}. Fast-failing to prevent request hang.`);
          const err: any = new Error(`NASA_API_RATE_LIMIT: Rate limit exceeded on api.nasa.gov`);
          err.upstreamStatus = 429;
          throw err;
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'No error body');
          const err: any = new Error(`NASA_API_ERROR: ${response.status} ${response.statusText}`);
          err.upstreamStatus = response.status;
          err.details = errorText;
          throw err;
        }

        return await response.json();
      } catch (err: any) {
        lastError = err;
        if (err.upstreamStatus === 429) {
          break; // Do not retry on 429
        }
        if (err.name === 'AbortError') {
          console.warn(`[NASA_ENGINE] Timeout attempt ${i + 1} for ${url}`);
        } else if (i < retries) {
          const delay = Math.min(2000, 1000 * Math.pow(2, i));
          console.warn(`[NASA_ENGINE] Attempt ${i + 1} failed: ${err.message}. Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Filter NASA Image Library items by geographic keywords and terrain suitability
   * Strictly excludes rover selfies, underbody photos, landing-system hardware,
   * instrument close-ups, infographics, and promotional illustrations.
   */
  static filterByRegion(items: any[], regionName: string): any[] {
    const regionLower = regionName.toLowerCase();
    const primaryKeyword = regionLower.split(' ')[0]; // e.g. 'jezero', 'arcadia', 'gale', 'belva'

    const EXCLUDED_PATTERNS = [
      'self-portrait',
      'selfie',
      'curiosity self',
      'perseverance self',
      'underbelly',
      'underbody',
      'wheel inspection',
      'belly pan',
      'sky crane',
      'heat shield',
      'descent stage',
      'parachute',
      'backshell',
      'landing system',
      'illustration',
      'artist concept',
      "artist's concept",
      'infographic',
      'poster',
      'diagram',
      'artwork',
      'flyover',
      'animation',
      'calibration target',
      'drill bit',
      'sample tube',
      'logo'
    ];

    return items.filter(item => {
      const data = item.data?.[0] || {};
      const title = (data.title || '').toLowerCase();
      const description = (data.description || '').toLowerCase();
      const keywords = Array.isArray(data.keywords) ? data.keywords.map((k: string) => k.toLowerCase()) : [];
      const combinedText = `${title} ${description} ${keywords.join(' ')}`;

      // 1. Must match region keyword
      const matchesRegion = combinedText.includes(primaryKeyword) || combinedText.includes(regionLower);
      if (!matchesRegion) return false;

      // 2. Must NOT contain excluded non-terrain patterns
      const hasExcluded = EXCLUDED_PATTERNS.some(pat =>
        title.includes(pat) || description.includes(pat) || keywords.some((k: string) => k.includes(pat))
      );
      if (hasExcluded) return false;

      return true;
    });
  }

  private static generateCacheKey(url: string): string {
    // Sanitize URL to be safe for Firestore doc ID (strip query params for cleaner key if needed, or keep for uniqueness)
    // We'll keep query params but hash them if too long.
    const sanitized = url.replace(/[^a-zA-Z0-9]/g, '_');
    if (sanitized.length > 120) {
      return sanitized.slice(0, 100) + '_' + Buffer.from(url).slice(-10).toString('hex');
    }
    return sanitized;
  }

  /** Read from Firestore (if available and not in serverless) or fall back to in-memory cache. */
  private static async readCache(key: string): Promise<any> {
    // In serverless/Vercel environments, bypass remote Firestore client SDK to eliminate 15s cold-start connection hangs.
    const isServerless = !!process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
    if (!isServerless) {
      await ensureFirebase();
      if (getFirestoreDoc) {
        try {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore read timeout')), 800));
          return await Promise.race([getFirestoreDoc(key), timeoutPromise]);
        } catch {
          // Fall back to memory cache immediately on error or timeout
        }
      }
    }
    return memoryCache.get(key) ?? null;
  }

  /** Write to Firestore (if available and not in serverless) or fall back to in-memory cache. */
  private static async writeCache(key: string, data: any): Promise<void> {
    memoryCache.set(key, data);
    const isServerless = !!process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
    if (!isServerless && setFirestoreDoc) {
      try {
        // Asynchronous non-blocking background persist
        setFirestoreDoc(key, data).catch(() => {});
      } catch {}
    }
  }
}
