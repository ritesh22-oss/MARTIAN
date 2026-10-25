import React, { createContext, useContext, useState, useEffect } from 'react';
import { MARS_REFERENCE_DATUM, NASA_DATA_SOURCES, JEZERO_ENVIRONMENTAL_CONTEXT } from '../utils/marsScienceData';
import type { MarsRawImage } from '../services/nasaDataService';

export type WorkspaceId =
  | 'overview'
  | 'explorer-3d'
  | 'live-mission-data'
  | 'mission-data'
  | 'configuration'
  | 'terrain-intelligence'
  | 'dataset-catalogue'
  | 'hazard-analysis'
  | 'risk-assessment'
  | 'route-lab'
  | 'route-comparison'
  | 'scenario-testing'
  | 'validation-harness'
  | 'model-eval'
  | 'audit'
  | 'guide'
  | 'orbit-terminal'
  | 'settings';

export interface SystemStatus {
  backend: 'connected' | 'autonomous' | 'disconnected' | 'checking';
  backendLatencyMs: number | null;
  model: 'gemini-3.8-flash' | 'orbit-autonomous-core' | 'unavailable';
  database: 'linked' | 'local';
}

export interface RoverTelemetry {
  sol: number;
  localSolarTime: string;
  x: number;
  y: number; // elevation in meters
  z: number;
  headingDeg: number;
  speedKmh: number;
  batteryPct: number;
  ambientTempC: number;
  atmosPressurePa: number;
  dustTau: number;
}

export interface WorkspaceSettings {
  maxSlopeLimitDeg: number;
  roverMassKg: number;
  slopeWeight: number;
  roughnessWeight: number;
  slipWeight: number;
  renderQuality: 'high' | 'balanced' | 'eco';
  unitSystem: 'metric' | 'imperial';
  coordinateDatum: string;
}

export interface AnalysisRecord {
  timestamp: string;
  type: string;
  status: 'Completed' | 'Failed' | 'In Progress';
  details: string;
}

interface WorkspaceContextType {
  activeWorkspace: WorkspaceId;
  setActiveWorkspace: (id: WorkspaceId) => void;
  activeDataset: string;
  setActiveDataset: (ds: string) => void;
  systemStatus: SystemStatus;
  checkSystemHealth: () => Promise<void>;
  telemetry: RoverTelemetry;
  settings: WorkspaceSettings;
  updateSettings: (partial: Partial<WorkspaceSettings>) => void;
  inspectorOpen: boolean;
  setInspectorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  recentAnalyses: AnalysisRecord[];
  addAnalysisRecord: (record: AnalysisRecord) => void;
  recentErrors: string[];
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  selectedObservation: MarsRawImage | null;
  setSelectedObservation: (obs: MarsRawImage | null) => void;
  activeTerrainSource: 'hirise-jezero' | 'hirise-belva' | 'custom' | 'procedural';
  setActiveTerrainSource: (source: 'hirise-jezero' | 'hirise-belva' | 'custom' | 'procedural') => void;
}

const defaultSettings: WorkspaceSettings = {
  maxSlopeLimitDeg: 14.0,
  roverMassKg: 1025,
  slopeWeight: 0.45,
  roughnessWeight: 0.25,
  slipWeight: 0.30,
  renderQuality: 'high',
  unitSystem: 'metric',
  coordinateDatum: MARS_REFERENCE_DATUM.datumName
};

const defaultTelemetry: RoverTelemetry = {
  sol: 428,
  localSolarTime: '13:45 LTST',
  x: 12.4,
  y: -2462.8,
  z: -15.2,
  headingDeg: 42.0,
  speedKmh: 0.04,
  batteryPct: 94.2,
  ambientTempC: JEZERO_ENVIRONMENTAL_CONTEXT.airTemperature.currentSimulated,
  atmosPressurePa: JEZERO_ENVIRONMENTAL_CONTEXT.atmosphericPressure.currentSimulated,
  dustTau: JEZERO_ENVIRONMENTAL_CONTEXT.dustOpticalDepth.tau
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('overview');
  const [activeDataset, setActiveDataset] = useState<string>('HiRISE DTM Jezero Fan (PSP_001414_1780)');
  const [inspectorOpen, setInspectorOpenState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('marsnav_inspector_open');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('marsnav_sidebar_collapsed');
      return stored !== null ? stored === 'true' : false;
    } catch {
      return false;
    }
  });

  const setInspectorOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    setInspectorOpenState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try {
        localStorage.setItem('marsnav_inspector_open', String(next));
      } catch {}
      return next;
    });
  };

  const setSidebarCollapsed = (val: boolean | ((prev: boolean) => boolean)) => {
    setSidebarCollapsedState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try {
        localStorage.setItem('marsnav_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [selectedObservation, setSelectedObservation] = useState<MarsRawImage | null>(null);
  const [activeTerrainSource, setActiveTerrainSource] = useState<'hirise-jezero' | 'hirise-belva' | 'custom' | 'procedural'>('hirise-jezero');
  const [settings, setSettings] = useState<WorkspaceSettings>(defaultSettings);
  const [telemetry, setTelemetry] = useState<RoverTelemetry>(defaultTelemetry);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisRecord[]>([
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      type: 'A* Pathfinding Search',
      status: 'Completed',
      details: '4.82 km Jezero Delta vector computed (142 cost units, 0 boulder collisions)'
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      type: 'HiRISE DTM Orthorectification',
      status: 'Completed',
      details: 'Mapped Octavia E. Butler quadrangle with 0.25 m/pixel resolution'
    }
  ]);
  const [recentErrors] = useState<string[]>([]);

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backend: 'checking',
    backendLatencyMs: null,
    model: 'gemini-3.8-flash',
    database: 'linked'
  });

  const checkSystemHealth = async () => {
    const t0 = Date.now();
    try {
      const res = await fetch('/api/ai4mars/status');
      const latency = Date.now() - t0;
      if (res.ok) {
        setSystemStatus({
          backend: 'connected',
          backendLatencyMs: latency,
          model: 'gemini-3.8-flash',
          database: 'linked'
        });
      } else {
        setSystemStatus({
          backend: 'autonomous',
          backendLatencyMs: latency,
          model: 'orbit-autonomous-core',
          database: 'local'
        });
      }
    } catch {
      setSystemStatus({
        backend: 'autonomous',
        backendLatencyMs: null,
        model: 'orbit-autonomous-core',
        database: 'local'
      });
    }
  };

  useEffect(() => {
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 45000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to open command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateSettings = (partial: Partial<WorkspaceSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  const addAnalysisRecord = (record: AnalysisRecord) => {
    setRecentAnalyses(prev => [record, ...prev.slice(0, 9)]);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        setActiveWorkspace,
        activeDataset,
        setActiveDataset,
        systemStatus,
        checkSystemHealth,
        telemetry,
        settings,
        updateSettings,
        inspectorOpen,
        setInspectorOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
        recentAnalyses,
        addAnalysisRecord,
        recentErrors,
        commandPaletteOpen,
        setCommandPaletteOpen,
        selectedObservation,
        setSelectedObservation,
        activeTerrainSource,
        setActiveTerrainSource
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
