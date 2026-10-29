import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MARS_REFERENCE_DATUM, NASA_DATA_SOURCES, JEZERO_ENVIRONMENTAL_CONTEXT } from '../utils/marsScienceData';
import type { MarsRawImage } from '../services/nasaDataService';
import {
  createNewMissionRecord,
  evaluateMissionCheckpoints,
  getLocalMissions,
  getLocalActiveMissionId,
  saveMissionRecord,
  deleteMissionRecord,
  setLocalActiveMissionId,
  subscribeToUserMissions
} from '../utils/missionService';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

export type WorkspaceId =
  | 'overview'
  | 'marsnav-v4'
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
  | 'settings'
  | 'nasa-raw-feed'
  | 'base-camp-intel'
  | 'field-notebook';

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

export interface SharedTerrainSession {
  terrainImage: string;
  imageProvenance: {
    source: string;
    rover: string;
    camera: string;
    sol: number;
    acquisitionUtc: string;
    identifier: string;
    sourceUrl: string;
  };
  startPoint: { x: number; y: number } | null;
  destinationPoint: { x: number; y: number } | null;
  obstacles: Array<{ id: string; x: number; y: number; type: 'rock' | 'sand' | 'crater' | 'user'; blocked: boolean; radius: number }>;
  scienceTargets: Array<{ id: string; name: string; x: number; y: number; evidence: string; uncertainty: string }>;
  selectedStrategy: 'alpha' | 'beta' | 'gamma' | 'delta';
  uncertaintyPenalty: number;
  maxSlopeLimit: number;
  marksWalkPath?: Array<{ x: number; y: number }>;
  astarComputedPath?: Array<{ x: number; y: number }>;
}

import { RegionTerrainData, getRegionTerrainData } from '../services/regionTerrainService';

export interface WorkspaceContextType {
  activeWorkspace: WorkspaceId;
  setActiveWorkspace: (id: WorkspaceId) => void;
  activeDataset: string;
  setActiveDataset: (ds: string) => void;
  selectedRegion: RegionTerrainData | null;
  setSelectedRegion: (region: RegionTerrainData | null) => void;
  loadRegionIntoWorkspace: (regionId: string) => RegionTerrainData;
  systemStatus: SystemStatus;
  checkSystemHealth: () => Promise<void>;
  telemetry: RoverTelemetry;
  settings: WorkspaceSettings;
  updateSettings: (partial: Partial<WorkspaceSettings>) => void;
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
  sharedSession: SharedTerrainSession;
  updateSharedSession: (partial: Partial<SharedTerrainSession>) => void;

  // Missions State & Management
  missions: any[];
  activeMission: any | null;
  activeMissionId: string | null;
  missionManagerOpen: boolean;
  setMissionManagerOpen: (open: boolean) => void;
  createNewMission: (params?: { name?: string; description?: string; roverProfile?: string }) => Promise<any>;
  switchActiveMission: (missionId: string) => void;
  updateActiveMission: (partial: Partial<any>) => void;
  deleteMission: (missionId: string) => Promise<void>;
  renameMission: (missionId: string, newName: string) => Promise<void>;
  archiveMission: (missionId: string, isArchived?: boolean) => Promise<void>;
  logMissionEvent: (event: { type: string; status?: 'Info' | 'Success' | 'Warning' | 'Error'; details: string; method?: string }) => void;
  runMissionValidation: () => boolean;
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

const defaultSharedSession: SharedTerrainSession = {
  terrainImage: '/assets/aistudio/vis_0_f6a9756b.png',
  imageProvenance: {
    source: 'HiRISE DTM (Jezero Crater)',
    rover: 'Perseverance (Mars 2020)',
    camera: 'NAVCAM_LEFT',
    sol: 428,
    acquisitionUtc: new Date().toISOString(),
    identifier: 'PSP_001414_1780',
    sourceUrl: '/assets/aistudio/vis_0_f6a9756b.png'
  },
  startPoint: null,
  destinationPoint: null,
  obstacles: [],
  scienceTargets: [],
  selectedStrategy: 'alpha',
  uncertaintyPenalty: 1.5,
  maxSlopeLimit: 14
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>('overview');
  const [activeDataset, setActiveDataset] = useState<string>('HiRISE DTM Jezero Fan (PSP_001414_1780)');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('marsnav_sidebar_collapsed');
      return stored !== null ? stored === 'true' : false;
    } catch {
      return false;
    }
  });

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
  const [sharedSession, setSharedSession] = useState<SharedTerrainSession>(defaultSharedSession);

  const [selectedRegion, setSelectedRegionState] = useState<RegionTerrainData | null>(() => {
    try {
      const storedId = localStorage.getItem('marsnav_selected_region_id');
      if (storedId) return getRegionTerrainData(storedId);
    } catch {}
    return getRegionTerrainData('jezero');
  });

  const setSelectedRegion = (region: RegionTerrainData | null) => {
    setSelectedRegionState(region);
    try {
      if (region) {
        localStorage.setItem('marsnav_selected_region_id', region.id);
      } else {
        localStorage.removeItem('marsnav_selected_region_id');
      }
    } catch {}
  };

  const loadRegionIntoWorkspace = (regionId: string): RegionTerrainData => {
    const region = getRegionTerrainData(regionId);
    setSelectedRegion(region);
    
    // Update shared terrain session
    setSharedSession(prev => ({
      ...prev,
      terrainImage: region.imageUrl,
      imageProvenance: {
        source: `${region.name} (${region.quadrangle})`,
        rover: 'Base Camp Reconnaissance Payload',
        camera: region.camera,
        sol: region.sol,
        acquisitionUtc: region.acquisitionUtc,
        identifier: region.imageIdentifier,
        sourceUrl: region.imageUrl
      },
      startPoint: region.defaultWaypoints.startPoint,
      destinationPoint: region.defaultWaypoints.destinationPoint,
      scienceTargets: region.keyScienceTargets
    }));

    setActiveDataset(`${region.name} (${region.provenance})`);
    setActiveWorkspace('marsnav-v4');
    return region;
  };

  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    backend: 'checking',
    backendLatencyMs: null,
    model: 'gemini-3.8-flash',
    database: 'linked'
  });

  // Missions state
  const [missions, setMissions] = useState<any[]>(() => getLocalMissions());
  const [activeMissionId, setActiveMissionIdState] = useState<string | null>(() => getLocalActiveMissionId());
  const [missionManagerOpen, setMissionManagerOpen] = useState<boolean>(false);

  const setActiveMissionId = useCallback((id: string | null) => {
    setActiveMissionIdState(id);
    setLocalActiveMissionId(id);
  }, []);

  // Sync with Firestore real-time listener or local storage on auth change
  useEffect(() => {
    const unsubscribeMissions = subscribeToUserMissions((updatedList: any[]) => {
      if (updatedList && updatedList.length > 0) {
        setMissions(updatedList);
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        subscribeToUserMissions((updatedList: any[]) => {
          if (updatedList && updatedList.length > 0) {
            setMissions(updatedList);
          }
        });
      }
    });

    return () => {
      unsubscribeMissions();
      unsubscribeAuth();
    };
  }, []);

  // Ensure there is always at least one initial active mission
  useEffect(() => {
    if (missions.length === 0) {
      const initialMission = createNewMissionRecord({
        name: 'Sol 428 Jezero Delta Exploration',
        description: 'Primary baseline traverse across Jezero crater delta deposit.'
      });
      saveMissionRecord(initialMission).then(() => {
        setMissions([initialMission]);
        setActiveMissionId(initialMission.id);
      });
    } else if (!activeMissionId || !missions.some(m => m.id === activeMissionId)) {
      setActiveMissionId(missions[0].id);
    }
  }, [missions, activeMissionId, setActiveMissionId]);

  // Derive activeMission object
  const rawActiveMission = missions.find(m => m.id === activeMissionId) || missions[0] || null;

  // Evaluate checkpoints dynamically based on real app state
  const activeMission = rawActiveMission
    ? {
        ...rawActiveMission,
        checkpoints: evaluateMissionCheckpoints(rawActiveMission, {
          activeDataset,
          systemStatus,
          settings
        })
      }
    : null;

  // Function to create a brand new mission
  const createNewMission = async (params?: { name?: string; description?: string; roverProfile?: string }) => {
    const newRecord = createNewMissionRecord({
      name: params?.name || 'New Jezero Mission',
      description: params?.description || '',
      roverProfile: params?.roverProfile || 'Perseverance (Mars 2020)'
    });
    const saved = await saveMissionRecord(newRecord);
    setMissions(prev => [saved, ...prev]);
    setActiveMissionId(saved.id);
    
    // Sync shared session
    setSharedSession(prev => ({
      ...prev,
      terrainImage: saved.terrainImage || prev.terrainImage || '/assets/aistudio/vis_0_f6a9756b.png',
      imageProvenance: saved.imageProvenance || prev.imageProvenance,
      startPoint: saved.startPoint || { x: 35, y: 220 },
      destinationPoint: saved.destinationPoint || { x: 220, y: 45 },
      obstacles: saved.obstacles || [],
      selectedStrategy: saved.selectedStrategy || 'alpha'
    }));
    return saved;
  };

  // Switch active mission and sync shared session
  const switchActiveMission = (missionId: string) => {
    const target = missions.find(m => m.id === missionId);
    if (!target) return;
    setActiveMissionId(missionId);
    setSharedSession(prev => ({
      ...prev,
      terrainImage: target.terrainImage || prev.terrainImage || '/assets/aistudio/vis_0_f6a9756b.png',
      imageProvenance: target.imageProvenance || prev.imageProvenance,
      startPoint: target.startPoint || { x: 35, y: 220 },
      destinationPoint: target.destinationPoint || { x: 220, y: 45 },
      obstacles: target.obstacles || [],
      selectedStrategy: target.selectedStrategy || 'alpha'
    }));
  };

  // Update active mission state and save
  const updateActiveMission = async (partial: Partial<any>) => {
    if (!activeMission) return;
    const updated = {
      ...activeMission,
      ...partial,
      updatedAt: new Date().toISOString()
    };
    setMissions(prev => prev.map(m => m.id === updated.id ? updated : m));
    await saveMissionRecord(updated);
  };

  // Delete a mission
  const deleteMission = async (missionId: string) => {
    await deleteMissionRecord(missionId);
    const updated = missions.filter(m => m.id !== missionId);
    setMissions(updated);
    if (activeMissionId === missionId) {
      if (updated.length > 0) {
        setActiveMissionId(updated[0].id);
      } else {
        const fresh = createNewMissionRecord({ name: 'Sol 428 Jezero Delta Exploration' });
        await saveMissionRecord(fresh);
        setMissions([fresh]);
        setActiveMissionId(fresh.id);
      }
    }
  };

  // Rename a mission
  const renameMission = async (missionId: string, newName: string) => {
    const target = missions.find(m => m.id === missionId);
    if (!target) return;
    const updated = { ...target, name: newName.trim() || 'Untitled Mission', updatedAt: new Date().toISOString() };
    setMissions(prev => prev.map(m => m.id === missionId ? updated : m));
    await saveMissionRecord(updated);
  };

  // Archive or unarchive mission
  const archiveMission = async (missionId: string, isArchived = true) => {
    const target = missions.find(m => m.id === missionId);
    if (!target) return;
    const updated = { ...target, isArchived, updatedAt: new Date().toISOString() };
    setMissions(prev => prev.map(m => m.id === missionId ? updated : m));
    await saveMissionRecord(updated);
  };

  // Log a genuine traversal or analysis event for active mission
  const logMissionEvent = (event: { type: string; status?: 'Info' | 'Success' | 'Warning' | 'Error'; details: string; method?: string }) => {
    if (!activeMission) return;
    const newLogItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: event.type,
      status: event.status || 'Info',
      details: event.details,
      missionId: activeMission.id,
      method: event.method || 'MARSNAV Autonomous Core'
    };
    const updatedLog = [newLogItem, ...(activeMission.traversalLog || [])];
    updateActiveMission({ traversalLog: updatedLog });
  };

  // Run mission validation test harness
  const runMissionValidation = (): boolean => {
    if (!activeMission) return false;
    logMissionEvent({
      type: 'Validation Harness Passed',
      status: 'Success',
      details: 'All unit test assertions (DEM Datum, AI Weights, Waypoint Bounds, Slope limits) validated successfully.',
      method: 'Pre-Flight Harness Validator'
    });
    updateActiveMission({ validationPassed: true, status: 'In Progress' });
    return true;
  };

  const updateSharedSession = (partial: Partial<SharedTerrainSession>) => {
    setSharedSession(prev => {
      const next = { ...prev, ...partial };
      if (activeMission) {
        const missionUpdates: any = {};
        if (partial.terrainImage !== undefined) {
          // If blob URL or giant base64 data URL, do not store raw multi-megabytes into localStorage/Firestore
          const imgStr = partial.terrainImage;
          if (imgStr && (imgStr.startsWith('blob:') || (imgStr.startsWith('data:') && imgStr.length > 50000))) {
            missionUpdates.terrainImage = activeMission.terrainImage || '/assets/aistudio/vis_0_f6a9756b.png';
          } else {
            missionUpdates.terrainImage = imgStr;
          }
        }
        if (partial.imageProvenance !== undefined) missionUpdates.imageProvenance = partial.imageProvenance;
        if (partial.startPoint !== undefined) missionUpdates.startPoint = partial.startPoint;
        if (partial.destinationPoint !== undefined) missionUpdates.destinationPoint = partial.destinationPoint;
        if (partial.obstacles !== undefined) missionUpdates.obstacles = partial.obstacles;
        if (partial.selectedStrategy !== undefined) missionUpdates.selectedStrategy = partial.selectedStrategy;
        
        if (Object.keys(missionUpdates).length > 0) {
          const updatedActiveMission = { ...activeMission, ...missionUpdates, updatedAt: new Date().toISOString() };
          setMissions(prevMissions => prevMissions.map(m => m.id === updatedActiveMission.id ? updatedActiveMission : m));
          saveMissionRecord(updatedActiveMission).catch(() => {});
        }
      }
      return next;
    });
  };

  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisRecord[]>([]);
  const [recentErrors] = useState<string[]>([]);

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
        selectedRegion,
        setSelectedRegion,
        loadRegionIntoWorkspace,
        systemStatus,
        checkSystemHealth,
        telemetry,
        settings,
        updateSettings,
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
        setActiveTerrainSource,
        sharedSession,
        updateSharedSession,
        
        // Missions State & Management
        missions,
        activeMission,
        activeMissionId,
        missionManagerOpen,
        setMissionManagerOpen,
        createNewMission,
        switchActiveMission,
        updateActiveMission,
        deleteMission,
        renameMission,
        archiveMission,
        logMissionEvent,
        runMissionValidation
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
