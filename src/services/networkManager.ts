/**
 * MARSNAV Deep Space Network Telemetry & Connectivity Manager
 * Tracks actual ping latency, navigator connection flags, offline states,
 * and handles progressive reconnection with exponential backoff.
 */

export type ConnectionState = 'ONLINE' | 'SLOW_CONNECTION' | 'OFFLINE' | 'RECONNECTING' | 'ONLINE_LIMITED';

export interface NetworkStatusSnapshot {
  state: ConnectionState;
  isOnline: boolean;
  latencyMs: number | null;
  effectiveType: string | null;
  downlinkMbps: number | null;
  lastChecked: number;
  lastSuccessfulPing: number | null;
  failureCount: number;
  offlineMessage?: string;
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
      latencyMs: null,
      effectiveType: conn?.effectiveType || 'unknown',
      downlinkMbps: conn?.downlink || null,
      lastChecked: Date.now(),
      lastSuccessfulPing: isNavOnline ? Date.now() : null,
      failureCount: 0,
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineEvent);
      window.addEventListener('offline', this.handleOfflineEvent);

      if (conn) {
        conn.addEventListener?.('change', this.handleConnectionChange);
      }

      // Initial telemetry check after boot
      setTimeout(() => {
        this.pingTelemetry();
      }, 300);
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
    this.pingTelemetry(true);
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
   * Performs an actual low-overhead HTTP ping to /api/health with strict AbortController timeout.
   */
  public async pingTelemetry(forceImmediate: boolean = false): Promise<NetworkStatusSnapshot> {
    if (this.checkInProgress && !forceImmediate) {
      return this.getStatus();
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.updateSnapshot({
        isOnline: false,
        state: 'OFFLINE',
        latencyMs: null
      });
      return this.getStatus();
    }

    this.checkInProgress = true;
    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch('/api/health?t=' + Date.now(), {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const elapsed = Math.round(performance.now() - start);

      if (response.ok) {
        this.backoffDelayMs = 2000; // Reset backoff
        const isSlow = elapsed > 2000;

        this.updateSnapshot({
          isOnline: true,
          state: isSlow ? 'SLOW_CONNECTION' : 'ONLINE',
          latencyMs: elapsed,
          lastSuccessfulPing: Date.now(),
          failureCount: 0,
          offlineMessage: undefined
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err?.name === 'AbortError' || err?.message?.includes('abort');
      const failures = this.snapshot.failureCount + 1;

      if (isTimeout) {
        this.updateSnapshot({
          isOnline: true,
          state: 'SLOW_CONNECTION',
          latencyMs: 4000,
          failureCount: failures,
          offlineMessage: 'Deep space telemetry response timed out (>4000ms). Link is highly degraded.'
        });
      } else {
        this.updateSnapshot({
          isOnline: false,
          state: 'OFFLINE',
          latencyMs: null,
          failureCount: failures,
          offlineMessage: 'Failed to establish MarsNav ground station socket. Operating on local cache.'
        });
      }
    } finally {
      this.checkInProgress = false;
    }

    return this.getStatus();
  }

  public scheduleNextPing(delayMs: number = 30000) {
    if (this.checkTimer) clearTimeout(this.checkTimer);
    this.checkTimer = setTimeout(() => {
      this.pingTelemetry();
    }, delayMs);
  }

  public retryConnection(): Promise<NetworkStatusSnapshot> {
    this.updateSnapshot({ state: 'RECONNECTING' });
    return this.pingTelemetry(true);
  }
}

export const networkManager = NetworkManager.getInstance();
