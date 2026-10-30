/**
 * MARSNAV Deep Space Network Telemetry & Connectivity Manager
 * Tracks actual ping latency, navigator connection flags, and independent service health.
 * Prevents individual service outages (Gemini, NASA, Backend) from being reported as total internet failure.
 */

export type ServiceStatus = 'CONNECTED' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';
export type ConnectionState = 'ONLINE' | 'ONLINE_LIMITED' | 'SLOW_CONNECTION' | 'OFFLINE' | 'RECONNECTING';

export interface NetworkStatusSnapshot {
  state: ConnectionState;
  isOnline: boolean; // Genuine browser internet connectivity
  
  // Independent Service Health
  services: {
    backend: ServiceStatus;
    gemini: ServiceStatus;
    nasa: ServiceStatus;
    telemetry: ServiceStatus;
  };

  latencyMs: number | null;
  effectiveType: string | null;
  downlinkMbps: number | null;
  lastChecked: number;
  lastSuccessfulInternetPing: number | null;
  failureCount: number;
  offlineMessage?: string;
  diagnostics?: string;
}

type Listener = (status: NetworkStatusSnapshot) => void;

class NetworkManager {
  private static instance: NetworkManager;
  private listeners: Set<Listener> = new Set();
  private snapshot: NetworkStatusSnapshot;
  private checkInProgress: boolean = false;
  private checkTimer: any = null;
  private backoffDelayMs: number = 2000;

  private constructor() {
    const isNavOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const conn = typeof navigator !== 'undefined' ? (navigator as any).connection : null;

    this.snapshot = {
      state: isNavOnline ? 'ONLINE' : 'OFFLINE',
      isOnline: isNavOnline,
      services: {
        backend: 'UNKNOWN',
        gemini: 'UNKNOWN',
        nasa: 'UNKNOWN',
        telemetry: 'UNKNOWN'
      },
      latencyMs: null,
      effectiveType: conn?.effectiveType || 'unknown',
      downlinkMbps: conn?.downlink || null,
      lastChecked: Date.now(),
      lastSuccessfulInternetPing: isNavOnline ? Date.now() : null,
      failureCount: 0,
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineEvent);
      window.addEventListener('offline', this.handleOfflineEvent);

      if (conn) {
        conn.addEventListener?.('change', this.handleConnectionChange);
      }

      // Initial comprehensive diagnostics check after boot
      setTimeout(() => {
        this.runFullDiagnostics();
      }, 500);
    }
  }

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  private handleOnlineEvent = () => {
    this.updateSnapshot({
      isOnline: true,
      state: 'RECONNECTING',
      offlineMessage: undefined
    });
    this.runFullDiagnostics();
  };

  private handleOfflineEvent = () => {
    this.updateSnapshot({
      isOnline: false,
      state: 'OFFLINE',
      latencyMs: null,
      offlineMessage: 'Hardware network interface reported offline. MarsNav switching to local autonomous mode.'
    });
  };

  private handleConnectionChange = () => {
    const conn = (navigator as any).connection;
    if (conn) {
      this.updateSnapshot({
        effectiveType: conn.effectiveType,
        downlinkMbps: conn.downlink
      });
    }
  };

  public getStatus(): NetworkStatusSnapshot {
    return { ...this.snapshot };
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateSnapshot(partial: Partial<NetworkStatusSnapshot>) {
    this.snapshot = {
      ...this.snapshot,
      ...partial,
      lastChecked: Date.now()
    };
    this.notify();
  }

  private notify() {
    const current = this.getStatus();
    this.listeners.forEach((fn) => {
      try {
        fn(current);
      } catch (err) {
        console.error('Network listener error:', err);
      }
    });
  }

  /**
   * Verifies actual internet connectivity by reaching a reliable public resource.
   * This differentiates between "no internet" and "server down".
   */
  private async checkInternetConnectivity(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    // Try multiple reliable public endpoints to ensure resilience against localized outages or blocks
    const endpoints = [
      'https://www.google.com/favicon.ico',
      'https://1.1.1.1/favicon.ico', // Cloudflare DNS (often reachable)
      'https://www.bing.com/favicon.ico'
    ];

    try {
      // Parallel pings, we only need one to succeed to prove "Internet" is up
      const pings = endpoints.map(url => 
        fetch(url, { 
          mode: 'no-cors', 
          cache: 'no-store',
          signal: controller.signal 
        }).then(() => true).catch(() => false)
      );

      const results = await Promise.all(pings);
      clearTimeout(timeoutId);
      
      if (results.some(r => r)) return true;

      // Final fallback: if we can't reach any public endpoints, check our own origin
      try {
        const selfCheck = await fetch('/api/health?probe=' + Date.now(), { 
          method: 'HEAD', 
          cache: 'no-store',
          signal: controller.signal
        });
        return selfCheck.ok;
      } catch {
        return false;
      }
    } catch (e) {
      clearTimeout(timeoutId);
      return false;
    }
  }

  /**
   * Runs independent checks for all services.
   */
  public async runFullDiagnostics(): Promise<NetworkStatusSnapshot> {
    if (this.checkInProgress) return this.getStatus();
    this.checkInProgress = true;

    const start = performance.now();
    
    // 1. Internet Check
    const internetOk = await this.checkInternetConnectivity();
    
    // 2. Backend Check
    let backendStatus: ServiceStatus = 'UNAVAILABLE';
    let telemetryStatus: ServiceStatus = 'UNAVAILABLE';
    try {
      const resp = await fetch('/api/health?t=' + Date.now(), { cache: 'no-store' });
      if (resp.ok) {
        backendStatus = 'CONNECTED';
        telemetryStatus = 'CONNECTED';
      } else {
        backendStatus = 'DEGRADED';
      }
    } catch (e) {
      backendStatus = 'UNAVAILABLE';
    }

    // 3. NASA Check (External)
    let nasaStatus: ServiceStatus = 'UNAVAILABLE';
    try {
      const resp = await fetch('https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=1', { mode: 'no-cors' });
      nasaStatus = 'CONNECTED'; // opaque response is fine for health
    } catch {
      nasaStatus = 'UNAVAILABLE';
    }

    // 4. Gemini Check (Proxy through backend)
    let geminiStatus: ServiceStatus = 'UNAVAILABLE';
    if (backendStatus === 'CONNECTED') {
      try {
        const resp = await fetch('/api/orbit/models', { cache: 'no-store' });
        if (resp.ok) {
          const data = await resp.json();
          geminiStatus = data.neuralLinkStatus === 'active' ? 'CONNECTED' : 'DEGRADED';
        }
      } catch {
        geminiStatus = 'UNAVAILABLE';
      }
    }

    const elapsed = Math.round(performance.now() - start);
    
    // Classification Logic
    let newState: ConnectionState = 'ONLINE';
    if (!internetOk) {
      newState = 'OFFLINE';
    } else if (backendStatus === 'UNAVAILABLE') {
      newState = 'ONLINE_LIMITED';
    } else if (elapsed > 2500) {
      newState = 'SLOW_CONNECTION';
    }

    this.updateSnapshot({
      isOnline: internetOk,
      state: newState,
      services: {
        backend: backendStatus,
        gemini: geminiStatus,
        nasa: nasaStatus,
        telemetry: telemetryStatus
      },
      latencyMs: internetOk ? elapsed : null,
      lastSuccessfulInternetPing: internetOk ? Date.now() : this.snapshot.lastSuccessfulInternetPing,
      failureCount: internetOk ? 0 : this.snapshot.failureCount + 1,
      offlineMessage: internetOk ? undefined : 'Global internet connectivity lost. Ground station signals severed.',
      diagnostics: `Latency: ${elapsed}ms | Backend: ${backendStatus} | Gemini: ${geminiStatus} | NASA: ${nasaStatus}`
    });

    this.checkInProgress = false;
    return this.getStatus();
  }

  public retryConnection(): Promise<NetworkStatusSnapshot> {
    this.updateSnapshot({ state: 'RECONNECTING' });
    return this.runFullDiagnostics();
  }
}

export const networkManager = NetworkManager.getInstance();
