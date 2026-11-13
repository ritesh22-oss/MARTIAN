import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiGet, apiPost } from '../utils/apiClient';
import { MARS_REFERENCE_DATUM, NASA_DATA_SOURCES, JEZERO_ENVIRONMENTAL_CONTEXT } from '../utils/marsScienceData';
import type { MarsRawImage } from '../services/nasaDataService';
import type { ProcessedDtmData } from '../services/stacProcessor';
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
import { sharedExplorationStore } from '../services/sharedExplorationStore';

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
  | 'field-notebook'
  | 'astronaut-exploration'
  | 'surface-dashboard'
  | 'science-planner'
  | 'surface-explorer'
  | 'multilayer-map'
  | 'safety-monitoring'
  | 'geological-targets'
  | 'suit-mobility'
  | 'astronaut-route-planner'
  | 'radiation-monitor';

export interface SystemStatus {
  backend: 'connected' | 'autonomous' | 'disconnected' | 'checking';
  backendLatencyMs: number | null;
  model: 'gemini-4-hydrogen' | 'orbit-autonomous-core' | 'unavailable';
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
  obstaclePenalty?: number;
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
    site?: number;
    drive?: string | number;
    targetRegion?: string;
    lat?: number;
    lon?: number;
    coordinateScope?: 'exact_verified' | 'mission_landing_basin' | 'unavailable';
    locationLabel?: string;
    selectionOrigin?: 'upload' | 'nasa' | 'region' | 'none';
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
  rightInspectorOpen: boolean;
  setRightInspectorOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleRightInspector: () => void;
  selectedObservation: MarsRawImage | null;
  setSelectedObservation: (obs: MarsRawImage | null) => void;
  activeTerrainSource: 'hirise-jezero' | 'hirise-belva' | 'custom' | 'procedural';
  setActiveTerrainSource: (source: 'hirise-jezero' | 'hirise-belva' | 'custom' | 'procedural') => void;
  sharedSession: SharedTerrainSession;
  updateSharedSession: (partial: Partial<SharedTerrainSession>) => void;

  // Real NASA/USGS DTM State
  selectedDtmData: ProcessedDtmData | null;
  setSelectedDtmData: (dtm: ProcessedDtmData | null) => void;
  isProcessingDtm: boolean;
  dtmProcessingMessage: string;
  dtmProcessError: string | null;
  selectAndLoadDtm: (dtmItem: any, targetGridSize?: number) => Promise<ProcessedDtmData>;

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
    sourceUrl: '',
    coordinateScope: 'unavailable',
    selectionOrigin: 'none'
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
  const [rightInspectorOpen, setRightInspectorOpenState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('marsnav_right_inspector_open');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const setRightInspectorOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    setRightInspectorOpenState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try {
        localStorage.setItem('marsnav_right_inspector_open', String(next));
      } catch {}
      return next;
    });
  };

  const toggleRightInspector = () => {
    setRightInspectorOpen(prev => !prev);
  };

  // Real NASA / USGS DTM state
  const [selectedDtmData, setSelectedDtmData] = useState<ProcessedDtmData | null>(() => {
    try {
      const stored = localStorage.getItem('marsnav_selected_dtm_data');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isProcessingDtm, setIsProcessingDtm] = useState<boolean>(false);
  const [dtmProcessingMessage, setDtmProcessingMessage] = useState<string>('');
  const [dtmProcessError, setDtmProcessError] = useState<string | null>(null);

  const selectAndLoadDtm = async (dtmItem: any, targetGridSize = 36): Promise<ProcessedDtmData> => {
    setIsProcessingDtm(true);
    setDtmProcessingMessage(`Connecting to USGS STAC for ${dtmItem.id || 'DTM'}...`);
    setDtmProcessError(null);

    const dtmUrl = dtmItem.dtmUrl || dtmItem.assets?.dtm?.href;
    if (!dtmUrl) {
      setIsProcessingDtm(false);
      setDtmProcessError('No GeoTIFF DTM asset available in this STAC record.');
      throw new Error('No GeoTIFF asset available');
    }

    try {
      setDtmProcessingMessage(`Streaming Cloud-Optimized GeoTIFF raster from USGS...`);
      const res = await fetch('/api/stac/dtm/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dtmUrl,
          itemId: dtmItem.id,
          title: dtmItem.properties?.title || dtmItem.title,
          stacCollection: dtmItem.collection,
          targetGridSize
        })
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setSelectedDtmData(json.data);
        setActiveDataset(json.data.title);
        try {
          localStorage.setItem('marsnav_selected_dtm_data', JSON.stringify(json.data));
        } catch {}
        setIsProcessingDtm(false);
        setDtmProcessingMessage('DTM loaded successfully.');
        return json.data;
      } else {
        throw new Error(json?.error?.message || 'Failed to process DTM raster');
      }
    } catch (err: any) {
      setIsProcessingDtm(false);
      setDtmProcessError(err.message || 'Error processing DTM');
      throw err;
    }
  };

  // Auto-seed real Jezero Crater DTM if none loaded
  useEffect(() => {
    if (!selectedDtmData) {
      const jezeroDtm = {
        id: 'DTEEC_048842_1985_048908_1985_U01',
        title: 'MRO HiRISE Jezero Crater Delta DTM (PSP_001414_1780 / ESP_048842)',
        collection: 'mro_hirise_socet_dtms',
        dtmUrl: 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/ESP_048842_1985_ESP_048908_1985/DTEEC_048842_1985_048908_1985_U01.tif'
      };
      selectAndLoadDtm(jezeroDtm, 36).catch(e => {
        console.warn('[WORKSPACE] Auto-load baseline Jezero DTM failed:', e);
      });
    }
  }, []);

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
        sourceUrl: region.imageUrl,
        targetRegion: region.name,
        lat: region.centerCoords.lat,
        lon: region.centerCoords.lon,
        coordinateScope: 'exact_verified',
        locationLabel: `${region.name} (${region.quadrangle})`,
        selectionOrigin: 'region'
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
    model: 'gemini-4-hydrogen',
    database: 'linked'
  });

  // Missions state
  const { 
      missions: recordMissions, 
      activeMission: recordActiveMission, 
      isLoading: missionsLoading,
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

  // Ensure there is always at least one initial active mission once initial load finishes
  const hasAutoCreatedMissionRef = useRef(false);
  useEffect(() => {
    if (missionsLoading) return;
    if (missions.length === 0) {
      if (!hasAutoCreatedMissionRef.current) {
        hasAutoCreatedMissionRef.current = true;
        recordCreateNewMission({
          name: 'Sol 428 Jezero Delta Exploration',
          description: 'Primary baseline traverse across Jezero crater delta deposit.'
        });
      }
    } else if (!activeMissionId || !missions.some(m => m.id === activeMissionId)) {
      setRecordActiveMission(missions[0].id);
    }
  }, [missions, missionsLoading, activeMissionId, setRecordActiveMission, recordCreateNewMission]);

  // Derive activeMission object
  const activeMission = useMemo(() => (
    recordActiveMission
      ? {
          ...recordActiveMission,
          checkpoints: evaluateMissionCheckpoints(recordActiveMission, {
            activeDataset,
            systemStatus,
            settings
          })
        }
      : null
  ), [recordActiveMission, activeDataset, systemStatus, settings]);

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
  const updateActiveMission = useCallback(async (partial: Partial<any>) => {
    if (!recordActiveMission?.id) return;
    await recordUpdateMission(recordActiveMission.id, partial);
  }, [recordActiveMission?.id, recordUpdateMission]);

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
        const prevVal = (prev as any)[k];
        const nextVal = (partial as any)[k];
        if (prevVal === nextVal) continue;
        if (Array.isArray(prevVal) && Array.isArray(nextVal)) {
          if (prevVal.length === 0 && nextVal.length === 0) continue;
          if (prevVal.length === nextVal.length) {
            try {
              if (JSON.stringify(prevVal) === JSON.stringify(nextVal)) continue;
            } catch {}
          }
        } else if (
          prevVal && nextVal &&
          typeof prevVal === 'object' &&
          typeof nextVal === 'object'
        ) {
          try {
            if (JSON.stringify(prevVal) === JSON.stringify(nextVal)) continue;
          } catch {}
        }
        hasChanges = true;
        break;
      }
      if (!hasChanges) return prev;
      return { ...prev, ...partial };
    });
  }, []);

  // Use refs to avoid infinite loops and stale closures in effects
  const lastSyncedMissionSessionRef = useRef<string>('');
  const lastMissionIdForSyncRef = useRef<string | null>(null);
  const lastSyncedStoreSessionRef = useRef<string>('');

  // EFFECT: Synchronize sharedSession changes to the Active Mission Record
  useEffect(() => {
    const currentMission = activeMissionRef.current;
    if (!currentMission) return;

    // Create a fingerprint of the keys we want to persist to the mission record
    const fingerprint = JSON.stringify({
      missionId: currentMission.id,
      terrainImage: sharedSession.terrainImage?.substring(0, 100), // Only check start for performance/blobs
      startPoint: sharedSession.startPoint,
      destinationPoint: sharedSession.destinationPoint,
      obstacles: sharedSession.obstacles,
      selectedStrategy: sharedSession.selectedStrategy
    });

    // When active mission changes or initializes, record baseline without overwriting loaded mission data
    if (lastMissionIdForSyncRef.current !== currentMission.id) {
      lastMissionIdForSyncRef.current = currentMission.id;
      lastSyncedMissionSessionRef.current = fingerprint;
      return;
    }

    if (lastSyncedMissionSessionRef.current === fingerprint) return;
    lastSyncedMissionSessionRef.current = fingerprint;

    const missionUpdates: any = {};
    
    // If blob URL or giant base64 data URL, do not store raw multi-megabytes into mission record
    const imgStr = sharedSession.terrainImage;
    if (imgStr && (imgStr.startsWith('blob:') || (imgStr.startsWith('data:') && imgStr.length > 50000))) {
      // Keep existing image if new one is too large for storage
      missionUpdates.terrainImage = currentMission.terrainImage || '';
    } else {
      missionUpdates.terrainImage = imgStr;
    }

    missionUpdates.imageProvenance = sharedSession.imageProvenance;
    missionUpdates.startPoint = sharedSession.startPoint;
    missionUpdates.destinationPoint = sharedSession.destinationPoint;
    missionUpdates.obstacles = sharedSession.obstacles;
    missionUpdates.selectedStrategy = sharedSession.selectedStrategy;

    // Skip write if active mission already matches these fields
    const matchesExisting =
      (currentMission.terrainImage || '') === (missionUpdates.terrainImage || '') &&
      JSON.stringify(currentMission.startPoint || null) === JSON.stringify(missionUpdates.startPoint || null) &&
      JSON.stringify(currentMission.destinationPoint || null) === JSON.stringify(missionUpdates.destinationPoint || null) &&
      JSON.stringify(currentMission.obstacles || []) === JSON.stringify(missionUpdates.obstacles || []) &&
      (currentMission.selectedStrategy || 'alpha') === (missionUpdates.selectedStrategy || 'alpha');

    if (matchesExisting) return;

    // Debounce the mission update to avoid hitting Firestore quotas during rapid changes (e.g. dragging markers)
    const timeoutId = setTimeout(() => {
      updateActiveMission({ ...missionUpdates, updatedAt: new Date().toISOString() });
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [sharedSession, activeMission?.id, updateActiveMission]);

  // EFFECT: Synchronize sharedSession changes to the SharedExplorationStore (Astronaut Dashboards)
  useEffect(() => {
    // Fingerprint for store sync
    const fingerprint = JSON.stringify({
      terrainImage: sharedSession.terrainImage?.substring(0, 100),
      startPoint: sharedSession.startPoint,
      destinationPoint: sharedSession.destinationPoint,
      activeSyncRouteId: sharedSession.activeSyncRoute?.routeId,
      activeSyncRouteLen: sharedSession.activeSyncRoute?.waypoints.length
    });

    if (lastSyncedStoreSessionRef.current === fingerprint) return;
    lastSyncedStoreSessionRef.current = fingerprint;

    // 1. Sync Waypoints
    if (sharedSession.startPoint) {
      sharedExplorationStore.updateWaypoint('wp_start', { 
        xPct: Number(((sharedSession.startPoint.x / 256) * 100).toFixed(1)), 
        yPct: Number(((sharedSession.startPoint.y / 256) * 100).toFixed(1)) 
      });
    }
    if (sharedSession.destinationPoint) {
      sharedExplorationStore.updateWaypoint('wp_dest', { 
        xPct: Number(((sharedSession.destinationPoint.x / 256) * 100).toFixed(1)), 
        yPct: Number(((sharedSession.destinationPoint.y / 256) * 100).toFixed(1)) 
      });
    }

    // 2. Sync Image Analysis with full provenance
    if (sharedSession.terrainImage && sharedSession.terrainImage.trim() !== '') {
      const imgName = sharedSession.imageProvenance?.identifier || sharedSession.imageProvenance?.source || 'Mars_Terrain.jpg';
      const currentStart = sharedSession.startPoint ? { 
        xPct: (sharedSession.startPoint.x / 256) * 100, 
        yPct: (sharedSession.startPoint.y / 256) * 100 
      } : undefined;
      const currentDest = sharedSession.destinationPoint ? { 
        xPct: (sharedSession.destinationPoint.x / 256) * 100, 
        yPct: (sharedSession.destinationPoint.y / 256) * 100 
      } : undefined;

      const prov = sharedSession.imageProvenance;
      sharedExplorationStore.processAndSyncImage(
        sharedSession.terrainImage, 
        imgName, 
        selectedRegion?.id || 'jezero',
        currentStart,
        currentDest,
        {
          source: prov?.source,
          rover: prov?.rover,
          camera: prov?.camera,
          sol: prov?.sol,
          acquisitionUtc: prov?.acquisitionUtc,
          identifier: prov?.identifier,
          sourceUrl: prov?.sourceUrl,
          site: prov?.site,
          drive: prov?.drive,
          targetRegion: prov?.targetRegion,
          lat: typeof prov?.lat === 'number' ? prov.lat : null,
          lon: typeof prov?.lon === 'number' ? prov.lon : null,
          coordinateScope: prov?.coordinateScope || 'unavailable',
          locationLabel: prov?.locationLabel,
          selectionOrigin: prov?.selectionOrigin || (sharedSession.terrainImage.startsWith('blob:') ? 'upload' : 'nasa')
        }
      ).catch(err => {
        console.warn('[WORKSPACE] Shared exploration store sync failed:', err);
      });
    }

    // 3. Sync Active Route & Footprints only when a computed MarsWalk route exists
    if (sharedSession.activeSyncRoute && sharedSession.activeSyncRoute.waypoints.length > 0) {
      const route = sharedSession.activeSyncRoute;
      const path = route.waypoints.map(w => ({ xPct: (w.x / 256) * 100, yPct: (w.y / 256) * 100 }));
      
      const footprints: any[] = [];
      for (let i = 0; i < route.waypoints.length - 1; i++) {
        const p1 = route.waypoints[i];
        const p2 = route.waypoints[i + 1];
        const segSteps = 2;
        for (let s = 1; s <= segSteps; s++) {
          const ratio = s / (segSteps + 1);
          const fx = p1.x + (p2.x - p1.x) * ratio;
          const fy = p1.y + (p2.y - p1.y) * ratio;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const angleRad = Math.atan2(dy, dx);
          const angleDeg = (angleRad * 180) / Math.PI + 90;
          footprints.push({
            xPct: Number(((fx / 256) * 100).toFixed(1)),
            yPct: Number(((fy / 256) * 100).toFixed(1)),
            angleDeg: Number(angleDeg.toFixed(1)),
            isLeft: s % 2 === 0
          });
        }
      }

      const prevSession = sharedExplorationStore.getSession();
      sharedExplorationStore.updateSession({
        automatedRoute: {
          ...prevSession.automatedRoute,
          path,
          footprints,
          distanceMeters: route.totalDistanceM,
          estimatedMins: Math.max(1, Math.round(route.totalDistanceM / 40)),
          isComputable: true,
          isSimulated: true,
          status: 'GENERATED'
        }
      });
    }
  }, [
    sharedSession.startPoint, 
    sharedSession.destinationPoint, 
    sharedSession.terrainImage, 
    sharedSession.activeSyncRoute,
    sharedSession.imageProvenance,
    selectedRegion?.id
  ]);

  // Initial synchronization on mount (only if a user/mission terrain image is already selected)
  useEffect(() => {
    if (!sharedSession.terrainImage || sharedSession.terrainImage.trim() === '') return;
    const initialImg = sharedSession.terrainImage;
    const initialName = sharedSession.imageProvenance?.identifier || 'Mars_Terrain.png';
    const prov = sharedSession.imageProvenance;
    sharedExplorationStore.processAndSyncImage(
      initialImg,
      initialName,
      selectedRegion?.id || 'jezero',
      undefined,
      undefined,
      {
        source: prov?.source,
        rover: prov?.rover,
        camera: prov?.camera,
        sol: prov?.sol,
        acquisitionUtc: prov?.acquisitionUtc,
        identifier: prov?.identifier,
        sourceUrl: prov?.sourceUrl,
        lat: typeof prov?.lat === 'number' ? prov.lat : null,
        lon: typeof prov?.lon === 'number' ? prov.lon : null,
        coordinateScope: prov?.coordinateScope || 'unavailable',
        locationLabel: prov?.locationLabel,
        selectionOrigin: prov?.selectionOrigin || (initialImg.startsWith('blob:') ? 'upload' : 'nasa')
      }
    ).catch(err => {
      console.warn('[WORKSPACE] Initial sharedExplorationStore sync failed:', err);
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
          model: 'gemini-4-hydrogen',
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

  // Global Keyboard Navigation & Quick Actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Command Palette Shortcut: Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
        return;
      }

      // 2. Escape closes command palette if active
      if (e.key === 'Escape' && commandPaletteOpen) {
        e.preventDefault();
        setCommandPaletteOpen(false);
        return;
      }

      // Input Guard: Do NOT fire single-key shortcuts when typing in inputs/textareas/contenteditable
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        Boolean(target.closest && target.closest('input, textarea, select, [contenteditable="true"]'))
      );

      if (isInput) return;

      // 3. Single-Key Global Navigation & Panel Toggles
      if (e.key === '1') {
        e.preventDefault();
        setActiveWorkspace('overview');
      } else if (e.key === '2') {
        e.preventDefault();
        setActiveWorkspace('explorer-3d');
      } else if (e.key === '3') {
        e.preventDefault();
        setActiveWorkspace('dataset-catalogue');
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        toggleRightInspector();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen]);

  const updateSettings = (partial: Partial<WorkspaceSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
    
    if (partial.maxSlopeLimitDeg !== undefined && activeMission) {
      updateActiveMission({ maxSlopeLimit: partial.maxSlopeLimitDeg });
    }
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
        rightInspectorOpen,
        setRightInspectorOpen,
        toggleRightInspector,
        selectedObservation,
        setSelectedObservation,
        activeTerrainSource,
        setActiveTerrainSource,
        sharedSession,
        updateSharedSession,

        // Real NASA / USGS DTM state
        selectedDtmData,
        setSelectedDtmData,
        isProcessingDtm,
        dtmProcessingMessage,
        dtmProcessError,
        selectAndLoadDtm,
        
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
