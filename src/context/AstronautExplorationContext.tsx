import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { sharedExplorationStore, ActiveExplorationSession } from '../services/sharedExplorationStore';
import {
  fetchUsgsGeologyContext,
  fetchTrekElevationPoint,
  fetchMarsSpaceWeather,
  UsgsGeologyResponse,
  TrekElevationSample,
  SpaceWeatherApiResponse
} from '../services/marsGeospatialService';
import { computeMultiStrategyRoutes, MultiStrategyRouteOutput } from '../utils/marsPathfinding';
import {
  SuitConfigId,
  SuitFieldKey,
  FieldProvenance,
  SuitConfigInputRecord,
  SuitMobilityPhysicsResult,
  ParsedSuitImportResult,
  ImportApplyOptions,
  createEmptySuitConfigs,
  createNasaReferenceConfigs,
  createReferenceGravity,
  validateFieldEntry,
  applyParsedImport,
  calculateSuitMobilityPhysics
} from '../services/suitMobilityEngine';

// --- Types & Data Contracts ---

export type AstronautSubmodule =
  | 'surface-dashboard'
  | 'science-planner'
  | 'surface-explorer'
  | 'multilayer-map'
  | 'safety-monitoring'
  | 'geological-targets'
  | 'suit-mobility'
  | 'astronaut-route-planner'
  | 'radiation-monitor'
  | 'mission-notebook';

export interface ScientificObjective {
  id: string;
  title: string;
  category: string;
  question: string;
  targetFormation: string;
  requiredInstruments: string[];
  nasaDatasets: string[];
  recommendedLocations: Array<{ name: string; lat: number; lon: number }>;
  expectedValue: 'Critical' | 'High' | 'Moderate';
  importanceScore: number; // 1-10
  accessibilityScore: number; // 1-10
  safetyScore: number; // 1-10
  timeRequiredHours: number;
  constraints: string;
  status: 'Planned' | 'In Progress' | 'Achieved';
}

export interface GeologicalTarget {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  xPct?: number;
  yPct?: number;
  classification: string;
  supportingImage: string;
  dataSource: string;
  instrument: string;
  confidencePct: number;
  relevance: string;
  recommendedMethod: string;
  status: 'Not Investigated' | 'Planned' | 'In Progress' | 'Sample Collected' | 'Completed' | 'Rejected';
  notes: string[];
  photoUrls: string[];
}

export type SuitConfigType = SuitConfigId;

export interface SuitConfigDetails {
  id: SuitConfigType;
  name: string;
  suitMassKg: number | null;
  backpackMassKg: number | null;
  payloadMassKg: number | null;
  totalMassKg: number | null;
  maxSpeedMs: number | null;
  maxSlopeDeg: number | null;
  metabolicBaseWatts: number | null;
  lifeSupportHours: number | null;
  description: string;
}

export interface MapLayerDefinition {
  id: string;
  category: 'optical' | 'thermal' | 'spectral' | 'topographic' | 'geophysical' | 'atmospheric' | 'radiation' | 'chemical';
  name: string;
  visible: boolean;
  opacity: number;
  source: string;
  acquisitionDate: string;
  resolution: string;
  coverage: string;
  uncertainty: string;
  nature: 'Observed' | 'Derived' | 'Modeled' | 'Unavailable';
  colorRamp: string;
  legendUnits: string;
  legendMinMax: [number, number];
  tileUrlPattern?: string;
  description: string;
}

export type AstronautRouteStrategy = MultiStrategyRouteOutput;

export interface SpaceWeatherTelemetry {
  timestamp: string;
  solarActivityLevel: string;
  solarFlareClass: string;
  cmeEventDetected: boolean;
  sepFluxParticleCount: number | null;
  kpIndex: number | null;
  gcrFluxDoseRate: number | null;
  mslRadSurfaceDoseRate: number | null;
  mSvPerDay: number | null;
  dataFreshness: string;
  dataSource: string;
  units: string;
  isMeasurementReal: boolean;
  marsSurfaceAvailable: boolean;
  historicalTrend: Array<{ sol: number; doseMgyDay: number }>;
}

export interface AstronautExplorationContextType {
  activeSubmodule: AstronautSubmodule;
  setActiveSubmodule: (submodule: AstronautSubmodule) => void;

  // Central Active Exploration Session Store State
  activeSession: ActiveExplorationSession;

  // Central Terrain Intelligence Engine State
  terrainIntelligence: any | null;
  isProcessingIntelligence: boolean;
  processUploadedPhoto: (file: File) => Promise<void>;

  // Locations & Coordinates
  selectedLocationId: string;
  setSelectedLocationId: (id: string) => void;
  currentCoordinates: { lat: number; lon: number; name: string; elevM: number | null };
  setCurrentCoordinates: (coords: { lat: number; lon: number; name: string; elevM: number | null }) => void;

  // Science Objectives
  objectives: ScientificObjective[];
  addObjective: (obj: ScientificObjective) => void;
  updateObjectiveStatus: (id: string, status: 'Planned' | 'In Progress' | 'Achieved') => void;

  // Geological Targets
  geologicalTargets: GeologicalTarget[];
  updateTargetStatus: (id: string, status: GeologicalTarget['status']) => void;
  addTargetNote: (id: string, note: string) => void;

  // Suit Mobility Model
  suitConfig: SuitConfigType;
  setSuitConfig: (config: SuitConfigType) => void;
  getSuitConfigDetails: () => SuitConfigDetails;
  suitConfigs: Record<SuitConfigType, SuitConfigInputRecord>;
  environmentGravity: FieldProvenance;
  customRouteDistanceM: number | null;
  setCustomRouteDistanceM: (val: number | null) => void;
  customTerrainSlopeDeg: number | null;
  setCustomTerrainSlopeDeg: (val: number | null) => void;
  useReferenceBaseMetabolic: boolean;
  setUseReferenceBaseMetabolic: (enabled: boolean) => void;
  suitPhysicsByConfig: Record<SuitConfigType, SuitMobilityPhysicsResult>;
  activeSuitPhysics: SuitMobilityPhysicsResult;
  updateSuitConfigField: (configId: SuitConfigType, fieldKey: SuitFieldKey, rawValue: string | number | null, unit?: string) => void;
  updateEnvironmentGravity: (rawValue: string | number | null, unit?: string) => void;
  resetEnvironmentGravityToMarsRef: () => void;
  applySuitImport: (parsed: ParsedSuitImportResult, options: ImportApplyOptions) => { updatedConfigIds: SuitConfigId[]; appliedCount: number };
  clearSuitConfigData: (configId?: SuitConfigType) => void;
  loadNasaReferenceProfile: () => void;

  // Multilayer Scientific Map Layers
  layers: MapLayerDefinition[];
  toggleLayerVisibility: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;

  // Dynamic Astronaut Routes
  routes: Record<'alpha' | 'beta' | 'gamma' | 'delta', AstronautRouteStrategy>;
  selectedRouteId: 'alpha' | 'beta' | 'gamma' | 'delta';
  setSelectedRouteId: (id: 'alpha' | 'beta' | 'gamma' | 'delta') => void;

  // Space Weather & Solar Radiation Telemetry (decoupled from surface image selection)
  spaceWeather: SpaceWeatherTelemetry;
  spaceWeatherData: SpaceWeatherApiResponse | null;
  spaceWeatherLoading: boolean;
  spaceWeatherError: string | null;
  refreshSpaceWeather: (startDate?: string, endDate?: string) => Promise<void>;

  // USGS Planetary Geologic Mapping (SIM 3292) & Trek Calibrated Elevation
  usgsGeology: UsgsGeologyResponse | null;
  isLoadingGeology: boolean;
  geologyError: string | null;
  trekElevation: TrekElevationSample | null;
  refreshGeospatialContext: (lat?: number, lon?: number, regionId?: string) => Promise<void>;
}

const INITIAL_LAYERS: MapLayerDefinition[] = [
  {
    id: 'opt-hirise',
    category: 'optical',
    name: 'HiRISE High-Res Ortho-Image (0.25m/px)',
    visible: true,
    opacity: 1.0,
    source: 'NASA / JPL-Caltech / University of Arizona',
    acquisitionDate: 'Published MRO Archive',
    resolution: '0.25 meters/pixel',
    coverage: 'HiRISE Targeted Footprints',
    uncertainty: 'Observed - Spatial Error < 0.15m',
    nature: 'Observed',
    colorRamp: 'Monochrome Grayscale',
    legendUnits: 'Reflectance (Albedo)',
    legendMinMax: [0.05, 0.45],
    description: 'Sub-meter orbital imagery revealing individual boulders, sand ripples, and layered outcrops.'
  },
  {
    id: 'thermal-themis',
    category: 'thermal',
    name: 'THEMIS IR Day/Night Mosaic (100m/px)',
    visible: false,
    opacity: 0.65,
    source: 'NASA / JPL-Caltech / Arizona State University',
    acquisitionDate: 'Mars Odyssey Global Mosaic',
    resolution: '100 meters/pixel',
    coverage: 'Global Mars',
    uncertainty: 'Derived IR Brightness',
    nature: 'Derived',
    colorRamp: 'Thermal IR Grayscale',
    legendUnits: 'Radiance / Thermal Inertia',
    legendMinMax: [180, 520],
    description: 'Distinguishes bedrock/indurated units (high thermal inertia) from fine dust/sand (low thermal inertia).'
  },
  {
    id: 'topo-mola-hirise',
    category: 'topographic',
    name: 'HRSC + MOLA Hillshade & DEM Contours',
    visible: true,
    opacity: 0.80,
    source: 'USGS Astrogeology / NASA JPL Mars Trek',
    acquisitionDate: 'MGS MOLA + Mars Express HRSC',
    resolution: '200 meters/pixel',
    coverage: 'Global Mars',
    uncertainty: 'Observed - MOLA Vertical Accuracy ±1m',
    nature: 'Observed',
    colorRamp: 'Elevation Shade (MOLA Areoid)',
    legendUnits: 'Meters relative to MOLA Areoid',
    legendMinMax: [-4500, 21000],
    description: 'Digital Elevation Model and hillshade relief relative to the Mars 2000 MOLA Areoid.'
  }
];

const INITIAL_OBJECTIVES: ScientificObjective[] = [
  {
    id: 'obj-1',
    title: 'Investigate Ancient Deltaic Lacustrine Deposits',
    category: 'Past Habitability & Aqueous History',
    question: 'Did ancient lacustrine water activity in Jezero delta persist long enough to deposit clay-rich mudstones capable of preserving biosignatures?',
    targetFormation: 'Neretva Vallis Delta Front Mudstones & Siltstones',
    requiredInstruments: ['SuperCam LIBS', 'PIXL Micro-XRF', 'SHERLOC UV Raman', 'Core Drill'],
    nasaDatasets: ['HiRISE PSP_001414_1780', 'USGS SIM 3292', 'Mars 2020 Raw Archive'],
    recommendedLocations: [
      { name: 'Kodiak Mesa Outcrop', lat: 18.375, lon: 77.412 },
      { name: 'Belva Crater Margin', lat: 18.389, lon: 77.435 }
    ],
    expectedValue: 'Critical',
    importanceScore: 10,
    accessibilityScore: 7,
    safetyScore: 8,
    timeRequiredHours: 4.5,
    constraints: 'Slope < 15°, suit reserve > 35%, avoid steep sand traps.',
    status: 'In Progress'
  },
  {
    id: 'obj-2',
    title: 'Subsurface Stratigraphy & Regolith Roughness Survey',
    category: 'Resource Utilization & Subsurface Geology',
    question: 'Does shallow regolith thickness and bedrock exposure support safe rover/EVA traversal across crater floor boundaries?',
    targetFormation: 'Regolith Fill & Subsurface Bedrock Interface',
    requiredInstruments: ['RIMFAX Ground-Penetrating Radar', 'Core Probe'],
    nasaDatasets: ['THEMIS Thermal Inertia Mosaic', 'Mars Trek HRSC+MOLA'],
    recommendedLocations: [
      { name: 'Delta Flatlands Unit', lat: 18.382, lon: 77.420 }
    ],
    expectedValue: 'High',
    importanceScore: 8,
    accessibilityScore: 9,
    safetyScore: 9,
    timeRequiredHours: 3.0,
    constraints: 'Requires continuous corridor without dense boulder blockage.',
    status: 'Planned'
  }
];

const AstronautExplorationContext = createContext<AstronautExplorationContextType | null>(null);

export const AstronautExplorationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedRegion } = useWorkspace();

  const [activeSession, setActiveSession] = useState<ActiveExplorationSession>(() => sharedExplorationStore.getSession());
  const [isProcessingIntelligence, setIsProcessingIntelligence] = useState<boolean>(false);

  const [activeSubmodule, setActiveSubmodule] = useState<AstronautSubmodule>('surface-dashboard');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('jezero');
  const [currentCoordinates, setCurrentCoordinates] = useState<{ lat: number; lon: number; name: string; elevM: number | null }>({
    lat: selectedRegion?.centerCoords?.lat || 18.38,
    lon: selectedRegion?.centerCoords?.lon || 77.42,
    name: selectedRegion?.name || 'Jezero Crater Western Delta',
    elevM: null
  });

  const [objectives, setObjectives] = useState<ScientificObjective[]>(INITIAL_OBJECTIVES);
  const [geologicalTargets, setGeologicalTargets] = useState<GeologicalTarget[]>([]);
  const [suitConfig, setSuitConfig] = useState<SuitConfigType>('standard');
  const [suitConfigs, setSuitConfigs] = useState<Record<SuitConfigType, SuitConfigInputRecord>>(() => createEmptySuitConfigs());
  const [environmentGravity, setEnvironmentGravity] = useState<FieldProvenance>(() => createReferenceGravity());
  const [customRouteDistanceM, setCustomRouteDistanceM] = useState<number | null>(null);
  const [customTerrainSlopeDeg, setCustomTerrainSlopeDeg] = useState<number | null>(null);
  const [useReferenceBaseMetabolic, setUseReferenceBaseMetabolic] = useState<boolean>(false);
  const [layers, setLayers] = useState<MapLayerDefinition[]>(INITIAL_LAYERS);
  const [selectedRouteId, setSelectedRouteId] = useState<'alpha' | 'beta' | 'gamma' | 'delta'>('alpha');

  // USGS Planetary Geologic Mapping + Trek MOLA Elevation State
  const [usgsGeology, setUsgsGeology] = useState<UsgsGeologyResponse | null>(null);
  const [isLoadingGeology, setIsLoadingGeology] = useState<boolean>(false);
  const [geologyError, setGeologyError] = useState<string | null>(null);
  const [trekElevation, setTrekElevation] = useState<TrekElevationSample | null>(null);

  // Live Space Weather State (completely decoupled from surface image changes)
  const [spaceWeatherData, setSpaceWeatherData] = useState<SpaceWeatherApiResponse | null>(null);
  const [spaceWeatherLoading, setSpaceWeatherLoading] = useState<boolean>(false);
  const [spaceWeatherError, setSpaceWeatherError] = useState<string | null>(null);

  // Reactive Subscription to Shared Exploration Session Store
  useEffect(() => {
    const unsubscribe = sharedExplorationStore.subscribe((session) => {
      setActiveSession(session);
      // Always sync targets strictly to active session (clears old targets immediately when new image starts)
      const dynamicTargets: GeologicalTarget[] = (session.geologicalTargets || []).map(t => ({
        id: t.id,
        name: t.name,
        lat: t.lat,
        lon: t.lon,
        xPct: t.xPct,
        yPct: t.yPct,
        classification: t.classification,
        supportingImage: t.supportingImage,
        dataSource: t.dataSource,
        instrument: t.instrument,
        confidencePct: t.confidencePct,
        relevance: t.relevance,
        recommendedMethod: t.recommendedMethod,
        status: t.status,
        notes: t.notes,
        photoUrls: t.photoUrls
      }));
      setGeologicalTargets(dynamicTargets);

      // Keep coordinate readout aligned if the active image brought verified mission coordinates
      if (
        session.provenance?.coordinateScope !== 'unavailable' &&
        typeof session.provenance?.lat === 'number' &&
        typeof session.provenance?.lon === 'number'
      ) {
        setCurrentCoordinates(prev => ({
          lat: session.provenance.lat as number,
          lon: session.provenance.lon as number,
          name: session.provenance.locationLabel || prev.name,
          elevM: session.elevationData?.elevationMinM ?? prev.elevM
        }));
      }
    });
    return unsubscribe;
  }, []);

  const refreshGeospatialContext = useCallback(
    async (
      lat = currentCoordinates.lat,
      lon = currentCoordinates.lon,
      regionId = selectedRegion?.id || selectedLocationId || 'jezero'
    ) => {
      setIsLoadingGeology(true);
      setGeologyError(null);
      try {
        const [geoRes, elevRes] = await Promise.all([
          fetchUsgsGeologyContext(lat, lon, regionId),
          fetchTrekElevationPoint(lat, lon)
        ]);
        setUsgsGeology(geoRes);
        setTrekElevation(elevRes);
        if (elevRes.calibrated && elevRes.elevationM !== null) {
          setCurrentCoordinates(prev => ({ ...prev, elevM: elevRes.elevationM as number }));
        }
      } catch (err: any) {
        setGeologyError(err.message || 'Unable to load USGS geology / Trek elevation.');
      } finally {
        setIsLoadingGeology(false);
      }
    },
    [currentCoordinates.lat, currentCoordinates.lon, selectedRegion?.id, selectedLocationId]
  );

  // Sync USGS Geology & Trek Elevation whenever active image provenance or selected region changes
  useEffect(() => {
    const prov = activeSession.provenance;
    const hasActiveUrl = Boolean(activeSession.imageMetadata.url);
    if (hasActiveUrl && prov?.coordinateScope === 'unavailable') {
      // Ungeoreferenced upload or frame without coordinates: do NOT pretend it maps to Jezero Crater
      setUsgsGeology(null);
      setTrekElevation(null);
      setGeologyError(null);
      return;
    }

    if (
      hasActiveUrl &&
      prov?.coordinateScope !== 'unavailable' &&
      typeof prov?.lat === 'number' &&
      typeof prov?.lon === 'number'
    ) {
      refreshGeospatialContext(prov.lat, prov.lon, activeSession.activeRegion || selectedRegion?.id || 'jezero');
      return;
    }

    const regionId = selectedRegion?.id || selectedLocationId || 'jezero';
    const targetLat = selectedRegion?.centerCoords?.lat ?? 18.38;
    const targetLon = selectedRegion?.centerCoords?.lon ?? 77.42;
    if (selectedRegion?.centerCoords) {
      setCurrentCoordinates(prev => ({
        lat: selectedRegion.centerCoords.lat,
        lon: selectedRegion.centerCoords.lon,
        name: selectedRegion.name,
        elevM: prev.elevM
      }));
    }
    refreshGeospatialContext(targetLat, targetLon, regionId);
  }, [
    activeSession.imageMetadata.url,
    activeSession.provenance?.coordinateScope,
    activeSession.provenance?.lat,
    activeSession.provenance?.lon,
    selectedRegion?.id,
    selectedLocationId
  ]);

  // Fetch live Space Weather & Radiation data once on mount + on manual date range update (never on image change)
  const refreshSpaceWeather = useCallback(async (startDate?: string, endDate?: string) => {
    setSpaceWeatherLoading(true);
    setSpaceWeatherError(null);
    try {
      const data = await fetchMarsSpaceWeather(startDate, endDate);
      setSpaceWeatherData(data);
    } catch (err: any) {
      setSpaceWeatherError(err?.message || 'Unable to fetch NOAA SWPC / NASA DONKI space weather feed.');
    } finally {
      setSpaceWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSpaceWeather();
  }, [refreshSpaceWeather]);

  // Derived backward-compatible spaceWeather view built exclusively from live API data (no hardcoded numbers)
  const spaceWeather: SpaceWeatherTelemetry = useMemo(() => {
    const earth = spaceWeatherData?.earthSolarMonitor;
    const flares = spaceWeatherData?.donkiEvents?.flares?.items || [];
    const cmes = spaceWeatherData?.donkiEvents?.cmes?.items || [];
    const seps = spaceWeatherData?.donkiEvents?.seps?.items || [];

    const latestFlare = flares[0]?.classType || earth?.latestXrayClass || 'Unavailable';
    const protonFlux = earth?.latestProtonFluxPfu ?? null;
    const kp = earth?.latestKpIndex ?? null;
    const activity =
      seps.length > 0 || (protonFlux !== null && protonFlux >= 10)
        ? 'Elevated (SEP Alert)'
        : (kp !== null && kp >= 5) || String(latestFlare).startsWith('X') || String(latestFlare).startsWith('M')
          ? 'Moderate / Active'
          : earth
            ? 'Low / Quiet'
            : 'Unavailable';

    return {
      timestamp: spaceWeatherData?.retrievedAt || '',
      solarActivityLevel: activity,
      solarFlareClass: latestFlare,
      cmeEventDetected: cmes.length > 0,
      sepFluxParticleCount: protonFlux,
      kpIndex: kp,
      gcrFluxDoseRate: null,
      mslRadSurfaceDoseRate: null,
      mSvPerDay: null,
      dataFreshness: spaceWeatherData?.retrievedAt
        ? `Updated ${new Date(spaceWeatherData.retrievedAt).toLocaleTimeString()}`
        : spaceWeatherLoading
          ? 'Fetching NOAA/NASA DONKI...'
          : 'Unavailable',
      dataSource: 'NOAA SWPC GOES + NASA DONKI (Earth / Heliosphere)',
      units: 'GOES X-ray (W/m²) | >=10 MeV Protons (pfu) | Planetary Kp',
      isMeasurementReal: Boolean(earth),
      marsSurfaceAvailable: false,
      historicalTrend: []
    };
  }, [spaceWeatherData, spaceWeatherLoading]);

  // Compute all 4 route strategies dynamically from active image obstacles + terrain + science targets
  const routes: Record<'alpha' | 'beta' | 'gamma' | 'delta', AstronautRouteStrategy> = useMemo(() => {
    const hasImageData = Boolean(activeSession.imageMetadata.url && activeSession.analysisStatus === 'completed');
    const startWp = activeSession.waypoints.find(w => w.type === 'start');
    const destWp = activeSession.waypoints.find(w => w.type === 'destination');
    const hasVerifiedCoords =
      activeSession.provenance?.coordinateScope !== 'unavailable' &&
      typeof activeSession.provenance?.lat === 'number' &&
      typeof activeSession.provenance?.lon === 'number';

    return computeMultiStrategyRoutes({
      hasImageData,
      boulders: activeSession.imageAnalysis.boulders || [],
      roughnessScore: activeSession.imageAnalysis.roughnessScore || 0,
      sandCoveragePct: activeSession.terrainAnalysis.sandCoveragePct || 0,
      start: startWp ? { xPct: startWp.xPct, yPct: startWp.yPct } : { xPct: 14, yPct: 82 },
      destination: destWp ? { xPct: destWp.xPct, yPct: destWp.yPct } : { xPct: 86, yPct: 18 },
      scienceTargets: (activeSession.geologicalTargets || []).map(t => ({
        id: t.id,
        name: t.name,
        xPct: typeof t.xPct === 'number' ? t.xPct : 50,
        yPct: typeof t.yPct === 'number' ? t.yPct : 50
      })),
      centerLat: hasVerifiedCoords ? activeSession.provenance.lat : null,
      centerLon: hasVerifiedCoords ? activeSession.provenance.lon : null,
      demSlopeMaxDeg: activeSession.terrainAnalysis.slopeMaxDeg,
      demSlopeAvgDeg: activeSession.terrainAnalysis.slopeMeanDeg,
      baseElevM: trekElevation?.calibrated ? trekElevation.elevationM : null
    });
  }, [
    activeSession.imageMetadata.url,
    activeSession.analysisStatus,
    activeSession.imageAnalysis.boulders,
    activeSession.imageAnalysis.roughnessScore,
    activeSession.terrainAnalysis.sandCoveragePct,
    activeSession.terrainAnalysis.slopeMaxDeg,
    activeSession.terrainAnalysis.slopeMeanDeg,
    activeSession.waypoints,
    activeSession.geologicalTargets,
    activeSession.provenance?.coordinateScope,
    activeSession.provenance?.lat,
    activeSession.provenance?.lon,
    trekElevation?.calibrated,
    trekElevation?.elevationM
  ]);

  const processUploadedPhoto = async (file: File) => {
    setIsProcessingIntelligence(true);
    try {
      const regionId = selectedRegion?.id || selectedLocationId || 'jezero';
      await sharedExplorationStore.processAndSyncImage(file, file.name, regionId, undefined, undefined, {
        coordinateScope: 'unavailable',
        selectionOrigin: 'upload'
      });
    } catch (err) {
      console.error('Failed to process uploaded photo:', err);
    } finally {
      setIsProcessingIntelligence(false);
    }
  };

  const addObjective = (obj: ScientificObjective) => {
    setObjectives(prev => [obj, ...prev]);
  };

  const updateObjectiveStatus = (id: string, status: 'Planned' | 'In Progress' | 'Achieved') => {
    setObjectives(prev => prev.map(o => (o.id === id ? { ...o, status } : o)));
  };

  const updateTargetStatus = (id: string, status: GeologicalTarget['status']) => {
    setGeologicalTargets(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
  };

  const addTargetNote = (id: string, note: string) => {
    setGeologicalTargets(prev => prev.map(t => (t.id === id ? { ...t, notes: [...t.notes, note] } : t)));
  };

  const effectiveRouteDistanceM = customRouteDistanceM ?? routes[selectedRouteId]?.distanceM ?? activeSession.activeRoute?.distanceM ?? null;
  const effectiveTerrainSlopeDeg = customTerrainSlopeDeg ?? activeSession.terrainAnalysis?.slopeMaxDeg ?? routes[selectedRouteId]?.maxSlopeDeg ?? null;

  const suitPhysicsByConfig: Record<SuitConfigType, SuitMobilityPhysicsResult> = useMemo(() => {
    const opts = {
      routeDistanceM: effectiveRouteDistanceM,
      terrainSlopeDeg: effectiveTerrainSlopeDeg,
      useReferenceBaseMetabolic
    };
    return {
      standard: calculateSuitMobilityPhysics(suitConfigs.standard, environmentGravity, opts),
      'science-payload': calculateSuitMobilityPhysics(suitConfigs['science-payload'], environmentGravity, opts),
      'heavy-sample-collection': calculateSuitMobilityPhysics(suitConfigs['heavy-sample-collection'], environmentGravity, opts)
    };
  }, [suitConfigs, environmentGravity, effectiveRouteDistanceM, effectiveTerrainSlopeDeg, useReferenceBaseMetabolic]);

  const activeSuitPhysics = suitPhysicsByConfig[suitConfig];

  const updateSuitConfigField = (
    configId: SuitConfigType,
    fieldKey: SuitFieldKey,
    rawValue: string | number | null,
    unit?: string
  ) => {
    const { provenance } = validateFieldEntry(fieldKey, rawValue, unit, 'Manual Input', 'manual_entry');
    setSuitConfigs(prev => ({
      ...prev,
      [configId]: {
        ...prev[configId],
        lastUpdatedAt: new Date().toISOString(),
        fields: {
          ...prev[configId].fields,
          [fieldKey]: provenance
        }
      }
    }));
  };

  const updateEnvironmentGravity = (rawValue: string | number | null, unit?: string) => {
    const { provenance } = validateFieldEntry('gravityMs2', rawValue, unit, 'Manual Input', 'manual_entry');
    setEnvironmentGravity(provenance);
  };

  const resetEnvironmentGravityToMarsRef = () => {
    setEnvironmentGravity(createReferenceGravity());
  };

  const applySuitImport = (parsed: ParsedSuitImportResult, options: ImportApplyOptions) => {
    const applied = applyParsedImport(suitConfigs, environmentGravity, parsed, options);
    setSuitConfigs(applied.nextConfigs);
    setEnvironmentGravity(applied.nextGravity);
    return { updatedConfigIds: applied.updatedConfigIds, appliedCount: applied.appliedCount };
  };

  const clearSuitConfigData = (configId?: SuitConfigType) => {
    if (!configId) {
      setSuitConfigs(createEmptySuitConfigs());
      setEnvironmentGravity(createReferenceGravity());
      return;
    }
    const emptyAll = createEmptySuitConfigs();
    setSuitConfigs(prev => ({
      ...prev,
      [configId]: emptyAll[configId]
    }));
  };

  const loadNasaReferenceProfile = () => {
    setSuitConfigs(createNasaReferenceConfigs());
    setEnvironmentGravity(createReferenceGravity());
  };

  const getSuitConfigDetails = (): SuitConfigDetails => {
    const cfg = suitConfigs[suitConfig] || suitConfigs.standard;
    const phys = suitPhysicsByConfig[suitConfig] || suitPhysicsByConfig.standard;
    return {
      id: cfg.id,
      name: cfg.name,
      suitMassKg: phys.mass.suitMassKg,
      backpackMassKg: phys.mass.plssMassKg,
      payloadMassKg: phys.mass.payloadMassKg,
      totalMassKg: phys.mass.totalMassKg,
      maxSpeedMs: phys.mobility.maxSpeedMs,
      maxSlopeDeg: phys.mobility.maxSlopeDeg,
      metabolicBaseWatts: phys.metabolic.effectiveBaseWatts,
      lifeSupportHours: phys.lifeSupport.nominalCapacityHrs,
      description: cfg.description
    };
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers(prev => prev.map(l => (l.id === layerId ? { ...l, visible: !l.visible } : l)));
  };

  const setLayerOpacity = (layerId: string, opacity: number) => {
    setLayers(prev => prev.map(l => (l.id === layerId ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l)));
  };

  return (
    <AstronautExplorationContext.Provider
      value={{
        activeSubmodule,
        setActiveSubmodule,
        activeSession,
        terrainIntelligence: activeSession.terrainReport,
        isProcessingIntelligence,
        processUploadedPhoto,
        selectedLocationId,
        setSelectedLocationId,
        currentCoordinates,
        setCurrentCoordinates,
        objectives,
        addObjective,
        updateObjectiveStatus,
        geologicalTargets,
        updateTargetStatus,
        addTargetNote,
        suitConfig,
        setSuitConfig,
        getSuitConfigDetails,
        suitConfigs,
        environmentGravity,
        customRouteDistanceM,
        setCustomRouteDistanceM,
        customTerrainSlopeDeg,
        setCustomTerrainSlopeDeg,
        useReferenceBaseMetabolic,
        setUseReferenceBaseMetabolic,
        suitPhysicsByConfig,
        activeSuitPhysics,
        updateSuitConfigField,
        updateEnvironmentGravity,
        resetEnvironmentGravityToMarsRef,
        applySuitImport,
        clearSuitConfigData,
        loadNasaReferenceProfile,
        layers,
        toggleLayerVisibility,
        setLayerOpacity,
        routes,
        selectedRouteId,
        setSelectedRouteId,
        spaceWeather,
        spaceWeatherData,
        spaceWeatherLoading,
        spaceWeatherError,
        refreshSpaceWeather,
        usgsGeology,
        isLoadingGeology,
        geologyError,
        trekElevation,
        refreshGeospatialContext
      }}
    >
      {children}
    </AstronautExplorationContext.Provider>
  );
};

export const useAstronautExploration = () => {
  const context = useContext(AstronautExplorationContext);
  if (!context) {
    throw new Error('useAstronautExploration must be used within an AstronautExplorationProvider');
  }
  return context;
};
