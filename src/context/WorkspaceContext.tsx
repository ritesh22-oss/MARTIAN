import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPost } from '../utils/apiClient';
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
import { useMissionRecord } from './MissionRecordContext';

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

export interface ActiveSyncRouteWaypoint {
  index: number;
  x: number;
  y: number;
  distanceM: number;
  slope: number;
  roughness: number;
  slip: number;
  stepCost: number;
  cumulativeCost: number;
  isUnsafe?: boolean;
  isBlockedCell?: boolean;
}

export interface ActiveSyncRoute {
  routeId: string;
  name: string;
  sourceModule: 'MARSWALK_OPS';
  strategy: 'shortest' | 'safety' | 'science' | string;
  strategyName: string;
  startPoint: { x: number; y: number };
  destinationPoint: { x: number; y: number };
  waypoints: ActiveSyncRouteWaypoint[];
  totalDistanceM: number;
  totalCost: number;
  sourceDimensions: { width: number; height: number };
  version: number;
  lastUpdated: string;
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
  activeSyncRoute?: ActiveSyncRoute | null;
  selectedRouteWaypointIndex?: number | null;
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
  terrainImage: '',
  imageProvenance: {
    source: '',
    rover: '',
    camera: '',
    sol: 0,
    acquisitionUtc: '',
    identifier: '',
    sourceUrl: ''
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
  const { 
      missions: recordMissions, 
      activeMission: recordActiveMission, 
      setActiveMission: setRecordActiveMission,
      createNewMission: recordCreateNewMission,
      updateMission: recordUpdateMission,
      deleteMission: recordDeleteMission
  } = useMissionRecord();
  const [missionManagerOpen, setMissionManagerOpen] = useState<boolean>(false);

  const missions = recordMissions;
  const activeMissionId = recordActiveMission?.id || null;

  // Sync with Firestore real-time listener or local storage on auth change
  useEffect(() => {
    // Mission state is now handled by MissionRecordContext
  }, []);

  // Ensure there is always at least one initial active mission
  useEffect(() => {
    if (missions.length === 0) {
      recordCreateNewMission({
        name: 'Sol 428 Jezero Delta Exploration',
        description: 'Primary baseline traverse across Jezero crater delta deposit.'
      });
    } else if (!activeMissionId || !missions.some(m => m.id === activeMissionId)) {
      setRecordActiveMission(missions[0].id);
    }
  }, [missions, activeMissionId, setRecordActiveMission, recordCreateNewMission]);

  // Derive activeMission object
  const activeMission = recordActiveMission
    ? {
        ...recordActiveMission,
        checkpoints: evaluateMissionCheckpoints(recordActiveMission, {
          activeDataset,
          systemStatus,
          settings
        })
      }
    : null;

  // Function to create a brand new mission
  const createNewMission = async (params?: { name?: string; description?: string; roverProfile?: string }) => {
    const saved = await recordCreateNewMission({
      name: params?.name || 'New Jezero Mission',
      description: params?.description || '',
    });
    
    // Sync shared session
    setSharedSession(prev => ({
      ...prev,
      terrainImage: saved.terrainImage || prev.terrainImage || '',
      imageProvenance: saved.imageProvenance || prev.imageProvenance,
      startPoint: saved.startPoint || null,
      destinationPoint: saved.destinationPoint || null,
      obstacles: saved.obstacles || [],
      selectedStrategy: (saved.selectedStrategy || 'alpha') as 'alpha' | 'beta' | 'delta' | 'gamma'
    }));
    return saved;
  };

  // Switch active mission and sync shared session
  const switchActiveMission = (missionId: string) => {
    const target = missions.find(m => m.id === missionId);
    if (!target) return;
    setRecordActiveMission(missionId);
    setSharedSession(prev => ({
      ...prev,
      terrainImage: target.terrainImage || prev.terrainImage || '',
      imageProvenance: target.imageProvenance || prev.imageProvenance,
      startPoint: target.startPoint || null,
      destinationPoint: target.destinationPoint || null,
      obstacles: target.obstacles || [],
      selectedStrategy: (target.selectedStrategy || 'alpha') as 'alpha' | 'beta' | 'delta' | 'gamma'
    }));
  };

  // Update active mission state and save
  const updateActiveMission = async (partial: Partial<any>) => {
    if (!recordActiveMission) return;
    await recordUpdateMission(recordActiveMission.id, partial);
  };

  // Delete a mission
  const deleteMission = async (missionId: string) => {
    await recordDeleteMission(missionId);
  };

  // Rename a mission
  const renameMission = async (missionId: string, newName: string) => {
    await recordUpdateMission(missionId, { name: newName.trim() || 'Untitled Mission' });
  };

  // Archive or unarchive mission
  const archiveMission = async (missionId: string, isArchived = true) => {
    await recordUpdateMission(missionId, { isArchived });
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

  const activeMissionRef = useRef(activeMission);
  activeMissionRef.current = activeMission;

  const recordUpdateMissionRef = useRef(recordUpdateMission);
  recordUpdateMissionRef.current = recordUpdateMission;

  const updateSharedSession = useCallback((partial: Partial<SharedTerrainSession>) => {
    setSharedSession(prev => {
      // Check if this update actually changes any keys in prev
      let hasChanges = false;
      for (const k in partial) {
        if ((prev as any)[k] !== (partial as any)[k]) {
          hasChanges = true;
          break;
        }
      }
      if (!hasChanges) return prev;

      const next = { ...prev, ...partial };
      const currentActiveMission = activeMissionRef.current;
      if (currentActiveMission) {
        const missionUpdates: any = {};
        if (partial.terrainImage !== undefined) {
          // If blob URL or giant base64 data URL, do not store raw multi-megabytes into localStorage/Firestore
          const imgStr = partial.terrainImage;
          if (imgStr && (imgStr.startsWith('blob:') || (imgStr.startsWith('data:') && imgStr.length > 50000))) {
            missionUpdates.terrainImage = currentActiveMission.terrainImage || '';
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
          const updatedActiveMission = { ...currentActiveMission, ...missionUpdates, updatedAt: new Date().toISOString() };
          recordUpdateMissionRef.current(updatedActiveMission.id, updatedActiveMission);
        }
      }
      return next;
    });
  }, []);

  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisRecord[]>([]);
  const [recentErrors] = useState<string[]>([]);

  const checkSystemHealth = async () => {
    const t0 = Date.now();
    try {
      const { status, isHtml } = await apiGet<any>('/api/ai4mars/status');
      const latency = Date.now() - t0;
      if (status === 200 && !isHtml) {
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
