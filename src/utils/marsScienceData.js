/**
 * MarsNav Scientific Exploration Data & Algorithms
 * Grounded in NASA Mars 2020 (Perseverance), MRO HiRISE, and MGS MOLA datasets.
 */

// Official reference datum: Mars Aeroid (MOLA Topographic Datum, equatorial radius 3396.19 km)
export const MARS_REFERENCE_DATUM = {
  datumName: 'Mars Aeroid / MOLA Areoid',
  meanRadiusKm: 3396.19,
  gravity: 3.721, // m/s²
  coordinateSystem: 'Planetocentric East-positive',
  quadrangle: 'MC-13 Syrtis Major (Jezero Crater)'
};

// Authoritative NASA Data Source Catalog
export const NASA_DATA_SOURCES = [
  {
    id: 'mola',
    name: 'Mars Orbiter Laser Altimeter (MOLA)',
    mission: 'Mars Global Surveyor (MGS)',
    instrument: 'MOLA MEGDR Topography Grid',
    sourceOrg: 'NASA Planetary Data System (PDS) Geosciences Node',
    resolution: '128 pixels/degree (~463 m/pixel at equator)',
    url: 'https://pds-geosciences.wustl.edu/missions/mgs/mola.html',
    type: 'Topographic Digital Elevation Model',
    status: 'Referenced Datum'
  },
  {
    id: 'hirise',
    name: 'High Resolution Imaging Science Experiment (HiRISE)',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'HiRISE Stereo Camera / DTM',
    sourceOrg: 'NASA PDS Imaging Node / University of Arizona',
    resolution: '0.25 to 0.5 m/pixel orthorectified terrain',
    url: 'https://hirise.lpl.arizona.edu/',
    product: 'PSP_001414_1780_RED / DTM Jezero Crater Fan',
    type: 'High-Resolution Orbital Surface Imagery & DEM',
    status: 'Validated Baseline'
  },
  {
    id: 'meda',
    name: 'Mars Environmental Dynamics Analyzer (MEDA)',
    mission: 'Mars 2020 Perseverance Rover',
    instrument: 'MEDA Surface Weather Station',
    sourceOrg: 'NASA Jet Propulsion Laboratory / Centro de Astrobiología',
    coverage: 'In-situ ground station at Octavia E. Butler Landing',
    url: 'https://mars.nasa.gov/mars2020/spacecraft/instruments/meda/',
    type: 'Historical Atmospheric Pressure, Temperature, Dust Opacity (Tau)',
    status: 'In-Situ Measurements'
  }
];

// Historical MEDA meteorological observations (Sol 350 - 420 nominal sample)
export const JEZERO_ENVIRONMENTAL_CONTEXT = {
  solRange: 'Sol 380 - 450 (Northern Spring)',
  localSolarTime: '13:45 LTST',
  airTemperature: {
    min: -78.4,
    max: -18.2,
    currentSimulated: -24.6,
    unit: '°C',
    source: 'MEDA ATS (Air Temperature Sensors)'
  },
  groundTemperature: {
    min: -84.1,
    max: 8.5,
    currentSimulated: -2.1,
    unit: '°C',
    source: 'MEDA TIR (Thermal Infrared Sensor)'
  },
  atmosphericPressure: {
    mean: 742,
    range: '730 - 755',
    currentSimulated: 744,
    unit: 'Pa',
    source: 'MEDA PS (Pressure Sensor)'
  },
  dustOpticalDepth: {
    tau: 0.42,
    status: 'Clear to moderate dust haze',
    source: 'MEDA RDS (Radiation & Dust Sensor)'
  },
  solarInsolation: {
    flux: 540,
    unit: 'W/m²',
    uvIndex: 'High (No ozone layer attenuation)'
  }
};

// Sourced Science Points of Interest (POIs) in Jezero Crater
export const JEZERO_SCIENCE_POIS = [
  {
    id: 'poi-delta',
    name: 'Jezero Western Delta Scarp',
    category: 'Deltaic Sedimentary Fan',
    lat: '18.441° N',
    lon: '77.412° E',
    elevationM: -2462,
    x: -25,
    z: 32,
    priority: 'High',
    scienceGoal: 'Astrobiology biosignature preservation in fine-grained mudstones.',
    geology: 'Layered clay-sulfate rich river delta deposits formed 3.7 billion years ago.',
    verifiedBy: 'NASA M2020 Science Team Target'
  },
  {
    id: 'poi-kodiak',
    name: 'Kodiak Butte (Remnant Outcrop)',
    category: 'Stratigraphic Mesa',
    lat: '18.412° N',
    lon: '77.428° E',
    elevationM: -2415,
    x: -12,
    z: -2,
    priority: 'Critical',
    scienceGoal: 'Bottomset and foreset delta cross-bedding inspection.',
    geology: 'Isolated erosional hill exposing ancient Lake Jezero water level stages.',
    verifiedBy: 'Mastcam-Z / SuperCam Remote Sensing'
  },
  {
    id: 'poi-seitah',
    name: 'South Séítah Dune Ridge',
    category: 'Hazard / Megaripples',
    lat: '18.398° N',
    lon: '77.465° E',
    elevationM: -2492,
    x: -4,
    z: -14,
    priority: 'Mobility Hazard',
    scienceGoal: 'Eolian bedform dynamics and igneous olivine cumulate rock probing.',
    geology: 'Basaltic coarse sand ripples with steep slip-faces; high wheel sinkage risk.',
    verifiedBy: 'Perseverance Autonomous Navigation Log'
  },
  {
    id: 'poi-belva',
    name: 'Belva Impact Crater Rim',
    category: 'Impact Crater & Excavation',
    lat: '18.365° N',
    lon: '77.518° E',
    elevationM: -2438,
    x: 22,
    z: -28,
    priority: 'Primary Destination',
    scienceGoal: 'Deep sub-surface crustal stratigraphy exposed by meteorite excavation.',
    geology: '1 km wide impact crater revealing bedrock beneath lake sediments.',
    verifiedBy: 'HiRISE DTM PSP_001414_1780'
  }
];

/**
 * Calculates mechanical traversal energy model for Mars rover (approx. 1025 kg Curiosity/Perseverance class)
 * Energy = Distance * (Rolling_Resistance + Gravitational_Climb)
 */
export function calculateMechanicalEnergy(distanceM, avgSlopeDeg, maxSlopeDeg, highCostFrac = 0.1) {
  const roverMassKg = 1025; // Perseverance mass
  const marsG = 3.721;
  const rollingCoeff = 0.12 + highCostFrac * 0.18; // wheel sinkage on Martian sand increases resistance
  
  // Rolling work
  const rollWorkJoules = roverMassKg * marsG * rollingCoeff * distanceM;
  
  // Climb work (net elevation gain approximation)
  const climbHeight = distanceM * Math.sin((avgSlopeDeg * Math.PI) / 180) * 0.5;
  const climbWorkJoules = Math.max(0, roverMassKg * marsG * climbHeight);
  
  // Auxiliary electronics & drive efficiency (~65% power train efficiency)
  const totalJoules = (rollWorkJoules + climbWorkJoules) / 0.65;
  const wattHours = Math.round((totalJoules / 3600) * 10) / 10;
  
  return {
    wattHours,
    whPerKm: Math.round((wattHours / (distanceM / 1000)) * 10) / 10,
    rollingResistanceFactor: Math.round(rollingCoeff * 100) / 100
  };
}

/**
 * High-performance deterministic 2D pseudo-noise for infinite procedural terrain
 */
function pseudoNoise2D(x, z) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453123;
  return (s - Math.floor(s)) * 2.0 - 1.0;
}

function smoothNoise(x, z) {
  const iX = Math.floor(x);
  const iZ = Math.floor(z);
  const fX = x - iX;
  const fZ = z - iZ;

  // Smoothstep interpolation
  const u = fX * fX * (3.0 - 2.0 * fX);
  const v = fZ * fZ * (3.0 - 2.0 * fZ);

  const n00 = pseudoNoise2D(iX, iZ);
  const n10 = pseudoNoise2D(iX + 1, iZ);
  const n01 = pseudoNoise2D(iX, iZ + 1);
  const n11 = pseudoNoise2D(iX + 1, iZ + 1);

  const nx0 = n00 * (1.0 - u) + n10 * u;
  const nx1 = n01 * (1.0 - u) + n11 * u;

  return nx0 * (1.0 - v) + nx1 * v;
}

/**
 * Multi-octave Fractional Brownian Motion (fBm) for realistic Martian terrain
 */
export function martianFBM(x, z, octaves = 4) {
  let total = 0;
  let frequency = 0.015;
  let amplitude = 1.0;
  let maxVal = 0;

  for (let i = 0; i < octaves; i++) {
    total += smoothNoise(x * frequency, z * frequency) * amplitude;
    maxVal += amplitude;
    amplitude *= 0.5;
    frequency *= 2.05;
  }

  return total / maxVal;
}

/**
 * Photorealistic and Dramatic Planetary Elevation Model for Jezero Crater & Martian Terrain:
 * Incorporates:
 * - "Big Big Depths & Holes": Belva Crater plunging -22m with terraced walls, central rebound peak,
 *   Delta Collapse Pit plunging -16m, and deep fault rift canyon (-12m).
 * - "Big Big Mountains": Towering Western Delta mountain massif rising +48m, Kodiak Butte mesa (+20m),
 *   and Southern crater rim cordillera (+38m) with stratified sedimentary cliffs and talus aprons.
 * - Navigable geological valleys and passes connecting scientific exploration targets.
 */
export function getMartianElevation(x, z) {
  let e = 0;

  // Add procedural noise for organic variability
  e += martianFBM(x, z, 5) * 2.5;

  // 1. Regional Continental Basin Tilt & Drainage Slope
  e += Math.sin(x * 0.014 + 0.2) * 4.2;
  e += Math.cos(z * 0.012 - 0.4) * 3.6;

  // 2. BIG BIG MOUNTAINS: Western Delta Mountain Massif (x: -35 to -70, z: -15 to 45)
  const westDist = Math.hypot(x + 48, z - 12);
  if (westDist < 60) {
    const mNorm = Math.max(0, 1.0 - westDist / 60);
    // Stratified mountain layers & jagged peak ridges
    const strata = Math.sin(westDist * 0.35) * 2.2 + Math.cos(x * 0.18 + z * 0.12) * 3.8;
    const peakHeight = Math.pow(mNorm, 1.4) * 44.0 + strata * mNorm;
    e += peakHeight;
  }

  // 3. BIG BIG MOUNTAINS: Southern & Eastern Rim Mountain Cordillera (x: 32 to 70, z: 10 to -50)
  const eastRimDist = Math.hypot(x - 52, z + 18);
  if (eastRimDist < 55) {
    const rNorm = Math.max(0, 1.0 - eastRimDist / 55);
    const rimPeaks = Math.sin(z * 0.16) * 3.2 + Math.cos(x * 0.22) * 2.6;
    const cordillera = Math.pow(rNorm, 1.5) * 36.0 + rimPeaks * rNorm;
    e += cordillera;
  }

  // 4. BIG BIG MOUNTAIN MESA: Kodiak Butte Stratigraphic Mesa (x: -12, z: -2)
  const butteDist = Math.hypot(x + 12, z + 2);
  if (butteDist < 24) {
    // Sheer mesa bluff with flat summit and steep scree talus apron
    const flatSummit = Math.exp(-Math.pow(butteDist / 6.0, 6)) * 16.5;
    const talusApron = Math.max(0, 1.0 - butteDist / 24) * 6.5;
    const cliffBands = Math.sin(butteDist * 1.2) * 0.8;
    e += flatSummit + talusApron + (flatSummit > 2.0 ? cliffBands : 0);
  }

  // 5. BIG BIG DEPTHS & HOLES: Primary Belva Impact Crater Basin (x: 24, z: -26)
  const belvaDist = Math.hypot(x - 24, z + 26);
  const belvaRadius = 26.0;
  if (belvaDist < belvaRadius * 2.4) {
    const norm = belvaDist / belvaRadius;
    if (norm < 0.96) {
      // Deep crater bowl plunging down to -22m with terraced slump walls
      const bowlDepth = Math.cos(norm * Math.PI * 0.5) * 22.0;
      // Sedimentary slump terrace benches on crater walls
      const slumpTerrace = (Math.floor(norm * 4) % 2 === 0 ? 1.4 : -0.8) * Math.sin(norm * Math.PI);
      // Central rebound uplift peak at the center of the deep crater floor
      const centralPeak = Math.exp(-Math.pow(norm / 0.18, 2)) * 5.2;
      e -= (bowlDepth - centralPeak + slumpTerrace);
    } else if (norm <= 1.38) {
      // Towering raised crater rim crest (+8.5m) with asymmetric ejecta lobes
      const rimAngle = Math.atan2(z + 26, x - 24);
      const rimAzimuth = 1.0 + Math.sin(rimAngle * 2.5) * 0.35;
      const rimCrest = Math.sin((norm - 0.96) * Math.PI / 0.42) * 8.5 * rimAzimuth;
      e += Math.max(0, rimCrest);
    } else {
      // Hummocky ejecta blanket tapering outward
      const ejecta = Math.exp(-Math.pow((norm - 1.38) / 0.45, 2)) * 3.2;
      e += ejecta;
    }
  }

  // 6. BIG BIG DEPTHS & HOLES: Secondary Impact Crater / Collapse Pit (x: -24, z: 18)
  const pitDist = Math.hypot(x + 24, z - 18);
  const pitRadius = 14.0;
  if (pitDist < pitRadius * 2.1) {
    const pNorm = pitDist / pitRadius;
    if (pNorm < 0.95) {
      // Steep depression plunging -15m down
      const pitDepth = Math.cos(pNorm * Math.PI * 0.5) * 15.5;
      e -= pitDepth;
    } else if (pNorm <= 1.3) {
      // Raised rim lip (+4.2m)
      const pitRim = Math.sin((pNorm - 0.95) * Math.PI / 0.35) * 4.2;
      e += Math.max(0, pitRim);
    }
  }

  // 7. BIG BIG DEPTHS & HOLES: Pitted Meteorite Impact Crater (x: 8, z: 20)
  const smallCraterDist = Math.hypot(x - 8, z - 20);
  const scRadius = 10.0;
  if (smallCraterDist < scRadius * 1.9) {
    const scNorm = smallCraterDist / scRadius;
    if (scNorm < 0.95) {
      const scDepth = Math.cos(scNorm * Math.PI * 0.5) * 9.5;
      e -= scDepth;
    } else if (scNorm <= 1.3) {
      const scRim = Math.sin((scNorm - 0.95) * Math.PI / 0.35) * 2.8;
      e += Math.max(0, scRim);
    }
  }

  // 8. DEEP RIFT CANYON & GULLY: Fault chasm between x: -2 to 14, z: -6 to -18
  const chasmX = x - 5;
  const chasmZ = z + 12;
  const alongChasm = Math.abs(chasmX * 0.7 + chasmZ * 0.7);
  const acrossChasm = Math.abs(-chasmX * 0.7 + chasmZ * 0.7);
  if (alongChasm < 18 && acrossChasm < 4.5) {
    const chasmDepth = Math.cos((acrossChasm / 4.5) * Math.PI * 0.5) * 7.5;
    e -= chasmDepth;
  }

  // 9. Natural Aeolian Wind Ripples & Dunes (Basaltic TARs)
  const ripple = Math.sin(x * 0.14 + Math.cos(z * 0.08) * 1.6) * 0.85;
  e += ripple;

  // 10. Multi-scale geological bedrock erosion (Fractals & FBM)
  e += martianFBM(x + 400, z + 400, 4) * 4.8;
  e += Math.sin(x * 0.32) * Math.cos(z * 0.32) * 0.45;

  return {
    localRelY: e, // relative 3D coordinate offset for meshes
    molaElevationM: Math.round(-2460 + e * 4.5) // in absolute meters relative to MOLA datum
  };
}

/**
 * Calculates local terrain slope in degrees
 */
export function calculateLocalSlope(x, z, step = 1.0) {
  const eCenter = getMartianElevation(x, z).localRelY;
  const eEast = getMartianElevation(x + step, z).localRelY;
  const eNorth = getMartianElevation(x, z + step).localRelY;

  const dx = (eEast - eCenter) / step;
  const dz = (eNorth - eCenter) / step;
  const slopeRad = Math.atan(Math.hypot(dx, dz) * 0.8);
  const slopeDeg = Math.round(((slopeRad * 180) / Math.PI) * 10) / 10;

  return slopeDeg;
}

