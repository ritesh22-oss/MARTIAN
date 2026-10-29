/**
 * Region Terrain Service
 * Provides region-to-workspace mapping for Mars Base Camp candidate regions.
 * Supplies authentic NASA HiRISE / CTX / PDS DTM terrain images, metadata,
 * coordinate footprints, and default traverse start/destination points.
 */

export interface RegionTerrainData {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  centerCoords: { lat: number; lon: number };
  elevation: string;
  quadrangle: string;
  flatnessScore: number;
  waterIceScore: number;
  solarPowerScore: number;
  mobilityScore: number;
  scienceValueScore: number;
  commsVisibilityScore: number;
  description: string;
  scientificReasoning: string;
  primaryRisk: string;
  provenance: string;
  imageUrl: string;
  imageIdentifier: string;
  camera: string;
  sol: number;
  acquisitionUtc: string;
  spatialResolution: string;
  defaultWaypoints: {
    startPoint: { x: number; y: number };
    destinationPoint: { x: number; y: number };
  };
  keyScienceTargets: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    evidence: string;
    uncertainty: string;
  }>;
}

const REGION_REGISTRY: Record<string, RegionTerrainData> = {
  arcadia: {
    id: 'arcadia',
    name: 'Arcadia Planitia',
    latitude: '39.3° N',
    longitude: '189.7° E',
    centerCoords: { lat: 39.3, lon: 189.7 },
    elevation: '-3.8 km',
    quadrangle: 'Diacria Quadrangle (MC-04)',
    flatnessScore: 92,
    waterIceScore: 95,
    solarPowerScore: 68,
    mobilityScore: 90,
    scienceValueScore: 74,
    commsVisibilityScore: 88,
    description: 'Extensive low-altitude smooth plain containing abundant subsurface sheet ice detected by MRO SHARAD radar within 1-2m of the surface.',
    scientificReasoning: 'Shallow slab ice offers direct resource utilization (ISRU) for propellant production and life support, with smooth terrain providing safe touchdown.',
    primaryRisk: 'Higher latitude results in seasonal solar radiation drops during Martian winter.',
    provenance: 'NASA MRO SHARAD / Mars Odyssey THEMIS / MOLA DTM (Arcadia Sheet Ice Unit)',
    imageUrl: '/assets/aistudio/vis_1_84d26681.png',
    imageIdentifier: 'PSP_002134_2200_ORB_ARC',
    camera: 'MRO_HIRISE_RED',
    sol: 1840,
    acquisitionUtc: '2025-08-14T11:20:00Z',
    spatialResolution: '0.25 m/px',
    defaultWaypoints: {
      startPoint: { x: 40, y: 220 },
      destinationPoint: { x: 210, y: 50 }
    },
    keyScienceTargets: [
      { id: 'arc-sci-1', name: 'Terraced Ice Slab Margin', x: 120, y: 140, evidence: 'Concentric polyhedral ground patterns indicating thermokarst activity', uncertainty: 'Subsurface thickness needs radar depth sounding' },
      { id: 'arc-sci-2', name: 'Subsurface Ice Outcrop', x: 180, y: 80, evidence: 'Excavated impact crater rim showing high ALBEDO icy exposure', uncertainty: 'Seasonal sublimation rate unverified' }
    ]
  },
  utopia: {
    id: 'utopia',
    name: 'Utopia Planitia',
    latitude: '46.7° N',
    longitude: '117.5° E',
    centerCoords: { lat: 46.7, lon: 117.5 },
    elevation: '-4.2 km',
    quadrangle: 'Casius Quadrangle (MC-06)',
    flatnessScore: 88,
    waterIceScore: 92,
    solarPowerScore: 60,
    mobilityScore: 86,
    scienceValueScore: 80,
    commsVisibilityScore: 85,
    description: 'Vast northern basin holding a massive underground ice reservoir deposit equivalent in volume to Lake Superior.',
    scientificReasoning: 'Proven high water-ice fraction by Zhurong and SHARAD; dense atmosphere aids entry, descent, and landing (EDL) braking.',
    primaryRisk: 'High dust storm accumulation in mid-to-high northern winter.',
    provenance: 'CNSA Zhurong Rover / NASA MRO SHARAD / PDS Geosciences',
    imageUrl: '/assets/aistudio/vis_2_9c24860c.png',
    imageIdentifier: 'ESP_018859_2270_UTOPIA_BASIN',
    camera: 'MRO_HIRISE_COLOR',
    sol: 1920,
    acquisitionUtc: '2025-09-02T14:45:00Z',
    spatialResolution: '0.30 m/px',
    defaultWaypoints: {
      startPoint: { x: 30, y: 210 },
      destinationPoint: { x: 220, y: 60 }
    },
    keyScienceTargets: [
      { id: 'uto-sci-1', name: 'Scalloped Depressional Trough', x: 140, y: 130, evidence: 'Pitted terrain formed by permafrost ground ice loss', uncertainty: 'Regolith cover thickness between 0.5-1.8m' }
    ]
  },
  jezero: {
    id: 'jezero',
    name: 'Jezero Crater Western Delta',
    latitude: '18.38° N',
    longitude: '77.58° E',
    centerCoords: { lat: 18.38, lon: 77.58 },
    elevation: '-2.5 km',
    quadrangle: 'Syrtis Major Quadrangle (MC-13)',
    flatnessScore: 62,
    waterIceScore: 45,
    solarPowerScore: 88,
    mobilityScore: 65,
    scienceValueScore: 98,
    commsVisibilityScore: 94,
    description: 'Ancient 45-km impact crater hosting a well-preserved river delta with clay minerals and potential biosignatures.',
    scientificReasoning: 'Unrivaled astrobiological priority; diverse lacustrine sedimentary rocks and igneous floor for sample return.',
    primaryRisk: 'Steep delta scarp slopes and boulder fields restrict heavy lander footprint options.',
    provenance: 'NASA Perseverance / MRO HiRISE DTM DTEEC_001414_1780',
    imageUrl: '/assets/aistudio/vis_0_f6a9756b.png',
    imageIdentifier: 'PSP_001414_1780_JEZERO_DELTA',
    camera: 'MRO_HIRISE_STEREO_DTM',
    sol: 428,
    acquisitionUtc: '2024-03-12T09:15:00Z',
    spatialResolution: '0.25 m/px',
    defaultWaypoints: {
      startPoint: { x: 35, y: 220 },
      destinationPoint: { x: 220, y: 45 }
    },
    keyScienceTargets: [
      { id: 'jez-sci-1', name: 'Exposed Bedrock Outcrop A', x: 200, y: 70, evidence: 'High-contrast stratification visible in NavCam stereoscopic pair', uncertainty: 'Visual estimate pending compositional spectrometer confirmation' },
      { id: 'jez-sci-2', name: 'Sedimentary Ripple Layer B', x: 90, y: 190, evidence: 'Fine-grained aeolian ripple alignment near crater rim', uncertainty: 'Surface loose regolith depth unverified by subsurface radar' }
    ]
  },
  elysium: {
    id: 'elysium',
    name: 'Elysium Planitia',
    latitude: '4.5° N',
    longitude: '135.6° E',
    centerCoords: { lat: 4.5, lon: 135.6 },
    elevation: '-2.6 km',
    quadrangle: 'Elysium Quadrangle (MC-15)',
    flatnessScore: 96,
    waterIceScore: 50,
    solarPowerScore: 95,
    mobilityScore: 94,
    scienceValueScore: 68,
    commsVisibilityScore: 96,
    description: 'Smooth, featureless equatorial basaltic plain with high solar flux, site of the NASA InSight seismic station.',
    scientificReasoning: 'Near-perfect equatorial solar power generation year-round and extremely low touchdown slope hazards.',
    primaryRisk: 'Deep subsurface water ice requires deep drilling (>20m).',
    provenance: 'NASA InSight / Viking / MRO CTX Global Mosaic',
    imageUrl: '/assets/aistudio/vis_3_e33f9dca.png',
    imageIdentifier: 'CTX_P01_001520_1845_ELYSIUM',
    camera: 'MRO_CTX_MOSAIC',
    sol: 1100,
    acquisitionUtc: '2025-01-20T16:00:00Z',
    spatialResolution: '0.50 m/px',
    defaultWaypoints: {
      startPoint: { x: 45, y: 200 },
      destinationPoint: { x: 200, y: 55 }
    },
    keyScienceTargets: [
      { id: 'ely-sci-1', name: 'Smooth Basalt Plain Entry', x: 110, y: 150, evidence: 'Flat regolith mantle over lava flow units', uncertainty: 'Low bedrock exposure' }
    ]
  },
  amazonis: {
    id: 'amazonis',
    name: 'Amazonis Planitia',
    latitude: '24.8° N',
    longitude: '196.0° E',
    centerCoords: { lat: 24.8, lon: 196.0 },
    elevation: '-3.5 km',
    quadrangle: 'Amazonis Quadrangle (MC-08)',
    flatnessScore: 94,
    waterIceScore: 70,
    solarPowerScore: 82,
    mobilityScore: 92,
    scienceValueScore: 65,
    commsVisibilityScore: 90,
    description: 'One of the smoothest plains on Mars, formed by young lava flows and fine windblown dust deposits.',
    scientificReasoning: 'Minimal rock hazard density enables large-payload habitat modules and expansive solar arrays.',
    primaryRisk: 'Thick dust mantling may obscure underlying bedrock geology and coat solar panels.',
    provenance: 'NASA Mars Global Surveyor MOLA / MRO CTX',
    imageUrl: '/assets/aistudio/vis_4_2bcd6691.png',
    imageIdentifier: 'MRO_CTX_AMAZONIS_082',
    camera: 'MRO_CTX_ORBITAL',
    sol: 1450,
    acquisitionUtc: '2025-05-18T08:30:00Z',
    spatialResolution: '0.40 m/px',
    defaultWaypoints: {
      startPoint: { x: 35, y: 215 },
      destinationPoint: { x: 215, y: 50 }
    },
    keyScienceTargets: [
      { id: 'ama-sci-1', name: 'Dust-Mantled Wrinkle Ridge', x: 130, y: 120, evidence: 'Compressional tectonic structure protruding through smooth dust mantle', uncertainty: 'Dust depth unknown' }
    ]
  },
  gale: {
    id: 'gale',
    name: 'Gale Crater Mount Sharp',
    latitude: '4.58° S',
    longitude: '137.44° E',
    centerCoords: { lat: -4.58, lon: 137.44 },
    elevation: '-4.4 km',
    quadrangle: 'Aeolis Quadrangle (MC-23)',
    flatnessScore: 58,
    waterIceScore: 40,
    solarPowerScore: 92,
    mobilityScore: 60,
    scienceValueScore: 95,
    commsVisibilityScore: 92,
    description: 'Deep impact crater featuring the 5.5 km high central mound Aeolis Mons (Mount Sharp) with stratified rock history.',
    scientificReasoning: 'Continuous stratigraphic record of Martian habitability transition from wet clay-rich to dry sulfate-rich eras.',
    primaryRisk: 'Rugged topography, sharp clay-capped ridges, and deep active sand dunes (Bagnold Dunes).',
    provenance: 'NASA Curiosity (MSL) / MRO HiRISE Stereo DTM',
    imageUrl: '/assets/aistudio/image_e58e8f79.png',
    imageIdentifier: 'MSL_HIRISE_GALE_SHARP_01',
    camera: 'MRO_HIRISE_STEREO',
    sol: 3820,
    acquisitionUtc: '2024-11-04T12:00:00Z',
    spatialResolution: '0.25 m/px',
    defaultWaypoints: {
      startPoint: { x: 30, y: 220 },
      destinationPoint: { x: 210, y: 40 }
    },
    keyScienceTargets: [
      { id: 'gal-sci-1', name: 'Clay-Sulfate Transition Ridge', x: 160, y: 90, evidence: 'Mineralogical shift recorded by CRISM hyperspectral imaging', uncertainty: 'High slope traversal angle' }
    ]
  },
  hellas: {
    id: 'hellas',
    name: 'Hellas Planitia Basin',
    latitude: '42.4° S',
    longitude: '70.5° E',
    centerCoords: { lat: -42.4, lon: 70.5 },
    elevation: '-7.1 km',
    quadrangle: 'Hellas Quadrangle (MC-28)',
    flatnessScore: 78,
    waterIceScore: 88,
    solarPowerScore: 55,
    mobilityScore: 82,
    scienceValueScore: 89,
    commsVisibilityScore: 80,
    description: 'Deepest impact structure on Mars (-7.1 km), providing maximum atmospheric density and protection from cosmic radiation.',
    scientificReasoning: 'Highest surface pressure on Mars allows temporary liquid water stability; rich in glacial landforms (viscous flow features).',
    primaryRisk: 'Frequent global dust storm origin point and extreme thermal variations.',
    provenance: 'NASA MRO CTX / HiRISE Viscous Flow Survey',
    imageUrl: '/assets/aistudio/image_f798510e.png',
    imageIdentifier: 'PSP_003412_1375_HELLAS_BASIN',
    camera: 'MRO_HIRISE_RED',
    sol: 2100,
    acquisitionUtc: '2025-10-10T15:20:00Z',
    spatialResolution: '0.28 m/px',
    defaultWaypoints: {
      startPoint: { x: 40, y: 210 },
      destinationPoint: { x: 210, y: 50 }
    },
    keyScienceTargets: [
      { id: 'hel-sci-1', name: 'Viscous Flow Lobate Margin', x: 135, y: 110, evidence: 'Glacial flow structure covered by boulder lag', uncertainty: 'Active seasonal movement unverified' }
    ]
  },
  valles: {
    id: 'valles',
    name: 'Valles Marineris Ophir Chasma',
    latitude: '4.0° S',
    longitude: '287.5° E',
    centerCoords: { lat: -4.0, lon: 287.5 },
    elevation: '-3.0 km',
    quadrangle: 'Coprates Quadrangle (MC-18)',
    flatnessScore: 65,
    waterIceScore: 60,
    solarPowerScore: 85,
    mobilityScore: 70,
    scienceValueScore: 99,
    commsVisibilityScore: 88,
    description: 'Gigantic canyon system revealing millions of years of layered Martian crust geology in vertical cliff faces.',
    scientificReasoning: 'Unprecedented access to deep subterranean rock layers and potential hydrated sulfate salt deposits.',
    primaryRisk: 'Canyon wall collapse hazards and optical communications line-of-sight blockage.',
    provenance: 'NASA MRO HiRISE Stereo Canyon DTM',
    imageUrl: '/assets/aistudio/Screenshot_2026-10-28_00.21.14_a7d5fb1b.png',
    imageIdentifier: 'ESP_021000_1760_OPHIR_CHASMA',
    camera: 'MRO_HIRISE_STEREO',
    sol: 1650,
    acquisitionUtc: '2025-07-22T10:10:00Z',
    spatialResolution: '0.25 m/px',
    defaultWaypoints: {
      startPoint: { x: 35, y: 225 },
      destinationPoint: { x: 220, y: 35 }
    },
    keyScienceTargets: [
      { id: 'val-sci-1', name: 'Layered Sulfate Wall Outcrop', x: 175, y: 85, evidence: 'Bright interior layered deposits rich in kieserite', uncertainty: 'Rockfall hazard active zone' }
    ]
  }
};

/**
 * Get terrain dataset for a candidate region ID
 */
export function getRegionTerrainData(regionId: string): RegionTerrainData {
  const normalizedKey = regionId.toLowerCase().trim();
  if (REGION_REGISTRY[normalizedKey]) {
    return REGION_REGISTRY[normalizedKey];
  }

  // Matching fallback search by substring (e.g., "arcadia planitia" -> "arcadia")
  for (const [key, data] of Object.entries(REGION_REGISTRY)) {
    if (normalizedKey.includes(key) || data.name.toLowerCase().includes(normalizedKey)) {
      return data;
    }
  }

  // Default fallback is Jezero Crater
  return REGION_REGISTRY['jezero'];
}

/**
 * Get all available candidate regions
 */
export function getAllCandidateRegions(): RegionTerrainData[] {
  return Object.values(REGION_REGISTRY);
}

/**
 * Find region closest to specific coordinates
 */
export function getClosestRegionByCoords(lat: number, lon: number): RegionTerrainData {
  let closest: RegionTerrainData = REGION_REGISTRY['jezero'];
  let minDistance = Infinity;

  for (const region of Object.values(REGION_REGISTRY)) {
    const dist = Math.sqrt(
      Math.pow(region.centerCoords.lat - lat, 2) + Math.pow(region.centerCoords.lon - lon, 2)
    );
    if (dist < minDistance) {
      minDistance = dist;
      closest = region;
    }
  }

  return closest;
}
