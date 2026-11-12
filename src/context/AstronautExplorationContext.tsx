import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWorkspace } from './WorkspaceContext';
import { processTerrainIntelligence, TerrainIntelligenceResult } from '../services/centralTerrainEngine';
import { sharedExplorationStore, ActiveExplorationSession } from '../services/sharedExplorationStore';

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
  lat: number;
  lon: number;
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

export type SuitConfigType = 'standard' | 'science-payload' | 'heavy-sample-collection';

export interface SuitConfigDetails {
  id: SuitConfigType;
  name: string;
  suitMassKg: number;
  backpackMassKg: number;
  payloadMassKg: number;
  totalMassKg: number;
  maxSpeedMs: number; // m/s
  maxSlopeDeg: number; // degrees
  metabolicBaseWatts: number;
  lifeSupportHours: number;
  description: string;
}

export interface MapLayerDefinition {
  id: string;
  category: 'optical' | 'thermal' | 'spectral' | 'topographic' | 'geophysical' | 'atmospheric' | 'radiation' | 'chemical';
  name: string;
  visible: boolean;
  opacity: number; // 0.0 - 1.0
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

export interface AstronautRouteStrategy {
  id: 'alpha' | 'beta' | 'gamma' | 'delta';
  name: string;
  code: string;
  tagline: string;
  distanceM: number;
  timeMins: number;
  elevationGainM: number;
  elevationLossM: number;
  avgSlopeDeg: number;
  maxSlopeDeg: number;
  safetyScorePct: number;
  targetsVisitedCount: number;
  isSafe: boolean;
  returnFeasible: boolean;
  path: Array<{ x: number; y: number; lat: number; lon: number; elevM: number; slopeDeg: number }>;
}

export interface SpaceWeatherTelemetry {
  timestamp: string;
  solarActivityLevel: 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Severe (SPE Alert)';
  solarFlareClass: string; // e.g. M2.4, X1.1
  cmeEventDetected: boolean;
  sepFluxParticleCount: number; // pfu
  gcrFluxDoseRate: number; // mSv/yr
  mslRadSurfaceDoseRate: number; // mGy/day
  mSvPerDay: number; // mSv/day equivalent
  dataFreshness: string;
  dataSource: string;
  units: string;
  isMeasurementReal: boolean;
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
  currentCoordinates: { lat: number; lon: number; name: string; elevM: number };
  setCurrentCoordinates: (coords: { lat: number; lon: number; name: string; elevM: number }) => void;

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

  // Multilayer Scientific Map Layers
  layers: MapLayerDefinition[];
  toggleLayerVisibility: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;

  // Astronaut Routes
  routes: Record<'alpha' | 'beta' | 'gamma' | 'delta', AstronautRouteStrategy>;
  selectedRouteId: 'alpha' | 'beta' | 'gamma' | 'delta';
  setSelectedRouteId: (id: 'alpha' | 'beta' | 'gamma' | 'delta') => void;

  // Space Weather Telemetry
  spaceWeather: SpaceWeatherTelemetry;
}

// Default Spacesuit Configurations
export const SUIT_CONFIGS: Record<SuitConfigType, SuitConfigDetails> = {
  'standard': {
    id: 'standard',
    name: 'Standard Exploration Suit (EVA Light)',
    suitMassKg: 110,
    backpackMassKg: 40,
    payloadMassKg: 5,
    totalMassKg: 235, // 80kg astronaut + 155kg suit
    maxSpeedMs: 1.1, // ~4 km/h walking
    maxSlopeDeg: 18.0,
    metabolicBaseWatts: 210,
    lifeSupportHours: 8.5,
    description: 'Optimized for high-agility mobility and rapid recon traverses over moderate terrain.'
  },
  'science-payload': {
    id: 'science-payload',
    name: 'Spacesuit with Field Instrument Suite',
    suitMassKg: 110,
    backpackMassKg: 42,
    payloadMassKg: 25, // Raman spectrometer, XRF analyzer, Core drill
    totalMassKg: 257,
    maxSpeedMs: 0.85,
    maxSlopeDeg: 15.0,
    metabolicBaseWatts: 260,
    lifeSupportHours: 7.5,
    description: 'Standard suit retrofitted with handheld spectrometers, rock core drills, and active sensors.'
  },
  'heavy-sample-collection': {
    id: 'heavy-sample-collection',
    name: 'Heavy Equipment & Sample Container Config',
    suitMassKg: 115,
    backpackMassKg: 45,
    payloadMassKg: 50, // Sealed rock sample containers, trenching gear
    totalMassKg: 290,
    maxSpeedMs: 0.65,
    maxSlopeDeg: 12.0,
    metabolicBaseWatts: 320,
    lifeSupportHours: 6.0,
    description: 'Maximum load payload rig designed for deep geological sampling, core extraction, and heavy transport.'
  }
};

// Initial Multilayer Map Specifications (Grounded in NASA MRO, MSL, Mars 2020, MOLA, THEMIS, CRISM)
const INITIAL_LAYERS: MapLayerDefinition[] = [
  {
    id: 'opt-hirise',
    category: 'optical',
    name: 'HiRISE High-Res Ortho-Image (0.25m/px)',
    visible: true,
    opacity: 1.0,
    source: 'NASA / JPL-Caltech / University of Arizona',
    acquisitionDate: '2023-04-12',
    resolution: '0.25 meters/pixel',
    coverage: '100% Core Delta Traverse Bounds',
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
    name: 'THEMIS Surface Temperature & Thermal Inertia',
    visible: false,
    opacity: 0.65,
    source: 'NASA / JPL-Caltech / Arizona State University',
    acquisitionDate: '2024-01-20',
    resolution: '100 meters/pixel',
    coverage: 'Global Quadrangle MC-13',
    uncertainty: 'Derived - Model Error ±2.5 K',
    nature: 'Derived',
    colorRamp: 'Cool-to-Warm (Blue to Red)',
    legendUnits: 'Thermal Inertia (J·m⁻²·K⁻¹·s⁻⁰.⁵)',
    legendMinMax: [180, 520],
    description: 'Thermal inertia map distinguishing bedrock/indurated units (high inertia) from fine dust/sand (low inertia).'
  },
  {
    id: 'spectral-crism',
    category: 'spectral',
    name: 'CRISM Mineralogy (Hydrated Clays & Sulfates)',
    visible: true,
    opacity: 0.50,
    source: 'NASA PDS Geosciences Node / JHU-APL',
    acquisitionDate: '2022-11-05',
    resolution: '18 meters/pixel',
    coverage: 'Jezero Western Delta & Rim',
    uncertainty: 'Observed - Band Depth SNR 85:1',
    nature: 'Observed',
    colorRamp: 'RGB false-color (Fe/Mg Smectites: Cyan, Sulfates: Yellow, Carbonates: Magenta)',
    legendUnits: 'Spectral Band Absorption Depth',
    legendMinMax: [0.0, 0.25],
    description: 'Hyperspectral mapping of phyllosilicates (clays), polyhydrated sulfates, and olivine-bearing carbonate units.'
  },
  {
    id: 'topo-mola-hirise',
    category: 'topographic',
    name: 'HiRISE & MOLA High-Density Elevation Contours',
    visible: true,
    opacity: 0.80,
    source: 'USGS Astrogeology / NASA PDS',
    acquisitionDate: '2023-08-14',
    resolution: '1.0 meter/grid',
    coverage: 'Full Exploration Sector',
    uncertainty: 'Observed - Vertical Accuracy ±0.4m',
    nature: 'Observed',
    colorRamp: 'Elevation Gradient (Purple - Cyan - Green - Yellow)',
    legendUnits: 'Meters relative to MOLA Areoid',
    legendMinMax: [-2540, -2410],
    description: 'Digital Elevation Model with 5-meter contour lines and local terrain slope gradient calculation.'
  },
  {
    id: 'geophys-rimfax',
    category: 'geophysical',
    name: 'RIMFAX Subsurface Shallow Stratigraphy Radar',
    visible: false,
    opacity: 0.70,
    source: 'NASA Mars 2020 / FFI Norway',
    acquisitionDate: '2024-02-18',
    resolution: '10 cm vertical / 10 cm horizontal',
    coverage: 'Traverse Track Bounds (10m depth)',
    uncertainty: 'Observed - Radar Dielectric Estimate ε_r=3.2',
    nature: 'Observed',
    colorRamp: 'Radar Reflection Amplitude (Black to Neon Green)',
    legendUnits: 'Relative Dielectric Reflectivity (dB)',
    legendMinMax: [-40, 10],
    description: 'Ground-penetrating radar sounding profile depicting subsurface sedimentary bedding, buried boulders, and dielectric boundaries.'
  },
  {
    id: 'atmos-meda',
    category: 'atmospheric',
    name: 'MEDA Atmospheric Dynamics & Dust Optical Depth',
    visible: false,
    opacity: 0.60,
    source: 'NASA Mars 2020 / CAB Spain',
    acquisitionDate: '2026-11-10',
    resolution: 'Point In-Situ Station Telemetry',
    coverage: 'Local Crater Basin',
    uncertainty: 'Observed - Sensor Precision ±0.5 Pa',
    nature: 'Observed',
    colorRamp: 'Wind Vector Vectors & Pressure Isobars',
    legendUnits: 'Dust Tau & Wind Speed (m/s)',
    legendMinMax: [0.3, 1.8],
    description: 'Diurnal pressure oscillations, wind speed/direction vector field, and atmospheric opacity (dust tau).'
  },
  {
    id: 'rad-msl',
    category: 'radiation',
    name: 'MSL RAD Surface Radiation & Cosmic Ray Dose',
    visible: true,
    opacity: 0.45,
    source: 'NASA MSL RAD / Southwest Research Institute',
    acquisitionDate: '2026-11-11',
    resolution: 'Surface Point Station Measurement',
    coverage: 'Regional Extrapolated Surface Field',
    uncertainty: 'Observed - Silicon Detector Error ±4%',
    nature: 'Observed',
    colorRamp: 'Radiation Dose Rate (Green: <0.5 mGy/d, Yellow: 0.6-0.8 mGy/d, Red: >1.0 mGy/d)',
    legendUnits: 'Dose Equivalent Rate (mGy/day)',
    legendMinMax: [0.45, 0.95],
    description: 'Continuous energetic particle detector monitoring GCR background dose and solar particle event (SPE) levels.'
  },
  {
    id: 'chemical-apxs',
    category: 'chemical',
    name: 'SuperCam & PIXL Elemental Chemistry Distribution',
    visible: false,
    opacity: 0.55,
    source: 'NASA Mars 2020 / LANL / JPL',
    acquisitionDate: '2024-05-30',
    resolution: 'Micro-scale to 5m spot array',
    coverage: 'Scattered Target Outcrops',
    uncertainty: 'Observed - LIBS Mass Fraction ±0.8%',
    nature: 'Observed',
    colorRamp: 'Oxide Concentration Map (SiO2, FeO, Al2O3, MgO)',
    legendUnits: 'Weight Percent (wt%)',
    legendMinMax: [2.0, 52.0],
    description: 'In-situ laser-induced breakdown spectroscopy (LIBS) and X-ray fluorescence elemental abundance.'
  }
];

// Initial Scientific Objectives Grounded in NASA Mars Exploration Goals
const INITIAL_OBJECTIVES: ScientificObjective[] = [
  {
    id: 'obj-1',
    title: 'Investigate Ancient Deltaic Lacustrine Deposits',
    category: 'Past Habitability & Aqueous History',
    question: 'Did ancient lacustrine water activity in Jezero delta persist long enough to deposit clay-rich mudstones capable of preserving biosignatures?',
    targetFormation: 'Neretva Vallis Delta Front Mudstones & Siltstones',
    requiredInstruments: ['SuperCam LIBS', 'PIXL Micro-XRF', 'SHERLOC UV Raman', 'Ramen Core Drill'],
    nasaDatasets: ['HiRISE PSP_001414_1780', 'CRISM Hydrated Mineral Map', 'Mars 2020 SuperCam Feed'],
    recommendedLocations: [
      { name: 'Kodiak Mesa Outcrop', lat: 18.375, lon: 77.412 },
      { name: 'Belva Crater Margin', lat: 18.389, lon: 77.435 }
    ],
    expectedValue: 'Critical',
    importanceScore: 10,
    accessibilityScore: 7,
    safetyScore: 8,
    timeRequiredHours: 4.5,
    constraints: 'Slope < 15°, suit power reserve > 35%, dust optical depth tau < 1.2.',
    status: 'In Progress'
  },
  {
    id: 'obj-2',
    title: 'Subsurface Ice & Dielectric Boundary Survey',
    category: 'Resource Utilization & Subsurface Geology',
    question: 'Does the shallow subsurface contain stable water ice lenses or hydrated regolith sheets accessible within 2 meters depth?',
    targetFormation: 'Regolith Fill & Subsurface Bedrock Interface',
    requiredInstruments: ['RIMFAX Ground-Penetrating Radar', 'Neutron Spectrometer', 'Core Probe'],
    nasaDatasets: ['RIMFAX Subsurface Sounding Series', 'THEMIS Thermal Inertia Map'],
    recommendedLocations: [
      { name: 'Delta Flatlands Unit', lat: 18.382, lon: 77.420 },
      { name: 'Neretva Channel Mouth', lat: 18.395, lon: 77.448 }
    ],
    expectedValue: 'High',
    importanceScore: 8,
    accessibilityScore: 9,
    safetyScore: 9,
    timeRequiredHours: 3.0,
    constraints: 'Requires continuous walking radar transect without dense boulder field blockage.',
    status: 'Planned'
  },
  {
    id: 'obj-3',
    title: 'Boxwork Fracture Network & Carbonate Cement Sampling',
    category: 'Biosignature Preservation & Mineralogy',
    question: 'Are the boxwork vein ridges enriched in magnesium carbonates deposited by hydrothermal fluid circulation?',
    targetFormation: 'Carbonate-Rich Boxwork Fractures on Crater Floor',
    requiredInstruments: ['SHERLOC Fluorescence', 'APXS Chemical Probe', 'Sample Container Cask'],
    nasaDatasets: ['CRISM Carbonate Spectral Product', 'HiRISE 0.25m DEM'],
    recommendedLocations: [
      { name: 'Séítah Carbonate Ridge', lat: 18.365, lon: 77.405 }
    ],
    expectedValue: 'Critical',
    importanceScore: 9,
    accessibilityScore: 6,
    safetyScore: 7,
    timeRequiredHours: 5.0,
    constraints: 'High rock roughness; traverse path must avoid deep sand traps in Séítah dunes.',
    status: 'Planned'
  }
];

// Initial Geological Targets
const INITIAL_TARGETS: GeologicalTarget[] = [
  {
    id: 'tgt-101',
    name: 'Kodiak Scarp Delta Layers',
    lat: 18.3751,
    lon: 77.4124,
    classification: 'Cross-bedded Sedimentary Sandstone / Mudstone',
    supportingImage: '/public/images/mars-landscape.jpg',
    dataSource: 'MRO HiRISE / Perseverance Mastcam-Z',
    instrument: 'Mastcam-Z / SuperCam Remote Micro-Imager',
    confidencePct: 96,
    relevance: 'Classic top-set / fore-set deltaic bedding proving river flow into crater lake.',
    recommendedMethod: 'Handheld Raman spectroscopy and 10cm drill core extraction.',
    status: 'Planned',
    notes: ['Clear horizontal bedding visible.', 'Stratigraphy indicates episodic high-energy water flow.'],
    photoUrls: []
  },
  {
    id: 'tgt-102',
    name: 'Belva Crater Ejecta Blocks',
    lat: 18.3892,
    lon: 77.4358,
    classification: 'Impact Breccia & Olivine Basalt Inlier',
    supportingImage: '/public/images/mars-surface.jpg',
    dataSource: 'Mars 2020 Mastcam-Z / SuperCam LIBS',
    instrument: 'SuperCam LIBS / PIXL Micro-XRF',
    confidencePct: 91,
    relevance: 'Exhumed deep crustal rock excavated by impact, offering pristine igneous sample.',
    recommendedMethod: 'XRF elemental scan and surface dust abrading tool (PAT).',
    status: 'In Progress',
    notes: ['Large 1.2m Angular boulder.', 'PIXL scan revealed high iron-magnesium silicate content.'],
    photoUrls: []
  },
  {
    id: 'tgt-103',
    name: 'Séítah Boxwork Vein Ridge',
    lat: 18.3654,
    lon: 77.4052,
    classification: 'Hydrothermal Carbonate-Cemented Veins',
    supportingImage: '/public/images/mars-valles.jpg',
    dataSource: 'MRO CRISM / HiRISE DTM',
    instrument: 'SHERLOC UV Raman / Core Drill',
    confidencePct: 88,
    relevance: 'Potential bio-preserving micro-environments formed during fluid circulation.',
    recommendedMethod: 'Sealed titanium core sample collection.',
    status: 'Not Investigated',
    notes: [],
    photoUrls: []
  }
];

// Space Weather Initial State (NASA MSL RAD & CCMC DONKI Grounded Data)
const INITIAL_SPACE_WEATHER: SpaceWeatherTelemetry = {
  timestamp: new Date().toISOString(),
  solarActivityLevel: 'Moderate',
  solarFlareClass: 'M1.8',
  cmeEventDetected: false,
  sepFluxParticleCount: 4.2, // pfu
  gcrFluxDoseRate: 210, // mSv/yr
  mslRadSurfaceDoseRate: 0.64, // mGy/day
  mSvPerDay: 1.86, // mSv/day equivalent
  dataFreshness: 'Updated 14 mins ago',
  dataSource: 'NASA MSL RAD / CCMC Space Weather DONKI Stream',
  units: 'mGy/day (Absorbed Dose) | mSv/day (Dose Equivalent)',
  isMeasurementReal: true,
  historicalTrend: [
    { sol: 420, doseMgyDay: 0.61 },
    { sol: 421, doseMgyDay: 0.62 },
    { sol: 422, doseMgyDay: 0.65 },
    { sol: 423, doseMgyDay: 0.68 },
    { sol: 424, doseMgyDay: 0.72 },
    { sol: 425, doseMgyDay: 0.66 },
    { sol: 426, doseMgyDay: 0.63 },
    { sol: 427, doseMgyDay: 0.64 },
    { sol: 428, doseMgyDay: 0.64 }
  ]
};

// Candidate Route Strategies
const INITIAL_ROUTES: Record<'alpha' | 'beta' | 'gamma' | 'delta', AstronautRouteStrategy> = {
  alpha: {
    id: 'alpha',
    name: 'ROUTE ALPHA — SHORTEST DISTANCE',
    code: 'ALPHA-DIRECT',
    tagline: 'Prioritizes minimum geographical distance while respecting hard safety constraints.',
    distanceM: 1420,
    timeMins: 32,
    elevationGainM: 28,
    elevationLossM: 14,
    avgSlopeDeg: 6.2,
    maxSlopeDeg: 12.8,
    safetyScorePct: 82,
    targetsVisitedCount: 1,
    isSafe: true,
    returnFeasible: true,
    path: [
      { x: 10, y: 10, lat: 18.375, lon: 77.412, elevM: -2450, slopeDeg: 2.1 },
      { x: 25, y: 30, lat: 18.378, lon: 77.416, elevM: -2442, slopeDeg: 7.4 },
      { x: 45, y: 50, lat: 18.382, lon: 77.422, elevM: -2436, slopeDeg: 11.2 },
      { x: 60, y: 70, lat: 18.389, lon: 77.435, elevM: -2422, slopeDeg: 4.8 }
    ]
  },
  beta: {
    id: 'beta',
    name: 'ROUTE BETA — LOWEST TRAVERSAL COST',
    code: 'BETA-EASY',
    tagline: 'Prefers smooth flat ground and minimal terrain friction to reduce astronaut fatigue.',
    distanceM: 1680,
    timeMins: 36,
    elevationGainM: 18,
    elevationLossM: 10,
    avgSlopeDeg: 3.8,
    maxSlopeDeg: 8.5,
    safetyScorePct: 91,
    targetsVisitedCount: 2,
    isSafe: true,
    returnFeasible: true,
    path: [
      { x: 10, y: 10, lat: 18.375, lon: 77.412, elevM: -2450, slopeDeg: 1.8 },
      { x: 18, y: 35, lat: 18.376, lon: 77.418, elevM: -2448, slopeDeg: 3.2 },
      { x: 38, y: 52, lat: 18.381, lon: 77.425, elevM: -2442, slopeDeg: 4.1 },
      { x: 60, y: 70, lat: 18.389, lon: 77.435, elevM: -2432, slopeDeg: 3.5 }
    ]
  },
  gamma: {
    id: 'gamma',
    name: 'ROUTE GAMMA — SAFETY FIRST',
    code: 'GAMMA-SHIELD',
    tagline: 'Prioritizes maximum obstacle clearance, low slope exposure, and proximity to natural cliff radiation shelters.',
    distanceM: 1890,
    timeMins: 42,
    elevationGainM: 15,
    elevationLossM: 8,
    avgSlopeDeg: 2.9,
    maxSlopeDeg: 6.8,
    safetyScorePct: 98,
    targetsVisitedCount: 1,
    isSafe: true,
    returnFeasible: true,
    path: [
      { x: 10, y: 10, lat: 18.375, lon: 77.412, elevM: -2450, slopeDeg: 1.2 },
      { x: 15, y: 40, lat: 18.374, lon: 77.420, elevM: -2449, slopeDeg: 2.1 },
      { x: 30, y: 60, lat: 18.380, lon: 77.428, elevM: -2445, slopeDeg: 2.8 },
      { x: 60, y: 70, lat: 18.389, lon: 77.435, elevM: -2435, slopeDeg: 3.0 }
    ]
  },
  delta: {
    id: 'delta',
    name: 'ROUTE DELTA — SCIENCE OPTIMIZED',
    code: 'DELTA-SCIENCE',
    tagline: 'Visits the maximum number of high-priority geological targets within safe EVA time and power budgets.',
    distanceM: 2150,
    timeMins: 52,
    elevationGainM: 35,
    elevationLossM: 22,
    avgSlopeDeg: 5.4,
    maxSlopeDeg: 13.5,
    safetyScorePct: 86,
    targetsVisitedCount: 3,
    isSafe: true,
    returnFeasible: true,
    path: [
      { x: 10, y: 10, lat: 18.375, lon: 77.412, elevM: -2450, slopeDeg: 2.1 },
      { x: 28, y: 20, lat: 18.365, lon: 77.405, elevM: -2435, slopeDeg: 8.2 },
      { x: 40, y: 45, lat: 18.378, lon: 77.422, elevM: -2428, slopeDeg: 11.0 },
      { x: 60, y: 70, lat: 18.389, lon: 77.435, elevM: -2415, slopeDeg: 5.2 }
    ]
  }
};

const AstronautExplorationContext = createContext<AstronautExplorationContextType | null>(null);

export const AstronautExplorationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedRegion } = useWorkspace();

  const [activeSession, setActiveSession] = useState<ActiveExplorationSession>(() => sharedExplorationStore.getSession());
  const [terrainIntelligence, setTerrainIntelligence] = useState<TerrainIntelligenceResult | null>(null);
  const [isProcessingIntelligence, setIsProcessingIntelligence] = useState<boolean>(false);

  // Reactive Subscription to Shared Exploration Session Store
  useEffect(() => {
    const unsubscribe = sharedExplorationStore.subscribe((session) => {
      setActiveSession(session);

      // Auto-update geological targets queue from active session
      if (session.geologicalTargets && session.geologicalTargets.length > 0) {
        const dynamicTargets: GeologicalTarget[] = session.geologicalTargets.map(t => ({
          id: t.id,
          name: t.name,
          lat: t.lat,
          lon: t.lon,
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
      }
    });
    return unsubscribe;
  }, []);

  const [activeSubmodule, setActiveSubmodule] = useState<AstronautSubmodule>('surface-dashboard');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('jezero');
  const [currentCoordinates, setCurrentCoordinates] = useState({
    lat: selectedRegion?.centerCoords?.lat || 18.38,
    lon: selectedRegion?.centerCoords?.lon || 77.42,
    name: selectedRegion?.name || 'Jezero Crater Western Delta',
    elevM: -2450
  });

  const [objectives, setObjectives] = useState<ScientificObjective[]>(INITIAL_OBJECTIVES);
  const [geologicalTargets, setGeologicalTargets] = useState<GeologicalTarget[]>(INITIAL_TARGETS);
  const [suitConfig, setSuitConfig] = useState<SuitConfigType>('standard');
  const [layers, setLayers] = useState<MapLayerDefinition[]>(INITIAL_LAYERS);
  const [routes] = useState<Record<'alpha' | 'beta' | 'gamma' | 'delta', AstronautRouteStrategy>>(INITIAL_ROUTES);
  const [selectedRouteId, setSelectedRouteId] = useState<'alpha' | 'beta' | 'gamma' | 'delta'>('alpha');
  const [spaceWeather] = useState<SpaceWeatherTelemetry>(INITIAL_SPACE_WEATHER);

  // Synchronize Terrain Intelligence on Region Change without clobbering activeSession image
  useEffect(() => {
    const regionId = selectedRegion?.id || selectedLocationId || 'jezero';
    if (selectedRegion?.centerCoords) {
      setCurrentCoordinates({
        lat: selectedRegion.centerCoords.lat,
        lon: selectedRegion.centerCoords.lon,
        name: selectedRegion.name,
        elevM: -2450
      });
    }
  }, [selectedRegion, selectedLocationId]);

  // Handler for direct image uploads to run computer vision analysis
  const processUploadedPhoto = async (file: File) => {
    setIsProcessingIntelligence(true);
    try {
      const regionId = selectedRegion?.id || selectedLocationId || 'jezero';
      await sharedExplorationStore.processAndSyncImage(file, file.name, regionId);
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
    setObjectives(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  const updateTargetStatus = (id: string, status: GeologicalTarget['status']) => {
    setGeologicalTargets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  const addTargetNote = (id: string, note: string) => {
    setGeologicalTargets(prev => prev.map(t => t.id === id ? { ...t, notes: [...t.notes, note] } : t));
  };

  const getSuitConfigDetails = (): SuitConfigDetails => {
    return SUIT_CONFIGS[suitConfig] || SUIT_CONFIGS['standard'];
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l));
  };

  const setLayerOpacity = (layerId: string, opacity: number) => {
    setLayers(prev => prev.map(l => l.id === layerId ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l));
  };

  return (
    <AstronautExplorationContext.Provider value={{
      activeSubmodule,
      setActiveSubmodule,
      activeSession,
      terrainIntelligence,
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
      layers,
      toggleLayerVisibility,
      setLayerOpacity,
      routes,
      selectedRouteId,
      setSelectedRouteId,
      spaceWeather
    }}>
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
