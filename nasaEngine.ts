import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config
const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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
        const cached = await this.getFromFirestore(cacheKey);
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
      this.saveToFirestore(cacheKey, {
        data,
        timestamp,
        url,
        source: 'nasa_jpl'
      }).catch(err => console.warn(`[NASA_ENGINE] Cache write error:`, err));

      return { data, source: 'live', timestamp };
    } catch (err: any) {
      console.warn(`[NASA_ENGINE] Live fetch failed for ${url}:`, err.message);

      // 3. Try Stale Cache Fallback
      try {
        const staleCached = await this.getFromFirestore(cacheKey);
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

    // Automatically append API key if it's a nasa.gov API (not JPL RSS)
    let finalUrl = url;
    if (url.includes('api.nasa.gov') && !url.includes('api_key=')) {
      const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
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
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : 2000 * (i + 1);
          console.warn(`[NASA_ENGINE] Rate limited (429). Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
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
        if (err.name === 'AbortError') {
          console.warn(`[NASA_ENGINE] Timeout attempt ${i + 1} for ${url}`);
        } else if (i < retries) {
          const delay = 1000 * Math.pow(2, i);
          console.warn(`[NASA_ENGINE] Attempt ${i + 1} failed: ${err.message}. Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Filter NASA Image Library items by geographic keywords
   */
  static filterByRegion(items: any[], regionName: string): any[] {
    const keywords = regionName.toLowerCase().split(' ');
    return items.filter(item => {
      const data = item.data?.[0] || {};
      const text = `${data.title} ${data.description} ${data.keywords?.join(' ')}`.toLowerCase();
      return keywords.every(kw => text.includes(keywords[0])); // Simple heuristic: at least first word must match
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

  private static async getFromFirestore(key: string): Promise<any> {
    const docRef = doc(db, this.CACHE_COLLECTION, key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  }

  private static async saveToFirestore(key: string, data: any): Promise<void> {
    const docRef = doc(db, this.CACHE_COLLECTION, key);
    await setDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  }
}
