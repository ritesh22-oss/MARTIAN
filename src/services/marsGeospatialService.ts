/**
 * Mars Geospatial Service
 * Integrates verified NASA JPL Mars Trek (WMTS / ArcGIS ImageServer / MapServer),
 * USGS Astrogeology Planetarymaps WMS & SIM 3292 Global Geology,
 * MSL Curiosity operational route reference benchmarks, and
 * NASA Worldview / GIBS Earth-observation analog datasets (strictly isolated).
 */

export type MarsMapLayerCategory =
  | 'mosaic'
  | 'ctx'
  | 'hirise'
  | 'dem'
  | 'hillshade'
  | 'thermal'
  | 'geology';

export interface MarsTrekLayerSpec {
  id: string;
  name: string;
  shortName: string;
  category: MarsMapLayerCategory;
  provider: string;
  mission: string;
  instrument: string;
  resolutionMeters: number;
  resolutionLabel: string;
  crs: string;
  datum: string;
  protocol: 'NASA Trek WMTS' | 'NASA Trek ArcGIS ImageServer' | 'NASA Trek ArcGIS MapServer' | 'USGS Astrogeology WMS 1.3.0';
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat] in planetocentric east-positive deg
  publicationOrAcquisitionDate: string;
  calibrationStatus: 'Calibrated Radiometric Mosaic' | 'Calibrated Topographic DEM' | 'Published Geologic Map' | 'Derived Thermal Mosaic';
  description: string;
  sourceUrl: string;
  isRegionalOnly?: boolean;
  regionTag?: string;
  coversPoint?: boolean;
  wmsLayerName?: string;
  wmsValidated?: boolean;
  wmtsMetadata?: {
    identifier: string;
    style: string;
    tileMatrixSet: string;
    format: string;
    minZoom: number;
    maxZoom: number;
    zoomCount: number;
    resourceUrlTemplate: string;
  };
}

export interface UsgsGeologicUnitInfo {
  unitSymbol: string;
  unitName: string;
  epoch: string;
  lithology: string;
  boundaryContext: string;
  quadrangle: string;
  mapSource: string;
  citation: string;
  sourceUrl: string;
  areaKm2?: number | null;
  perimeterKm?: number | null;
  polygonVertexCount?: number;
  confidence: 'Published USGS Map Unit';
}

export interface UsgsSim3292GeoJsonSummary {
  type: 'FeatureCollection';
  featureCount: number;
  bbox: [number, number, number, number] | null;
  features: Array<{
    type: 'Feature';
    id?: string | number;
    properties: Record<string, any>;
    geometryType: string;
    vertexCount: number;
    geometry: any;
  }>;
}

export interface UsgsSim3292DatasetRelease {
  doi: string;
  doiResolvedUrl: string | null;
  scienceBaseStatus: 'available' | 'bot-protected' | 'unavailable';
  scienceBaseNote: string;
  pubsApiUrl: string;
  title: string;
  publicationYear: string;
  mapScale: string;
  authors: string[];
  abstract: string;
  downloads: Array<{ label: string; url: string; fileType: string }>;
}

export interface UsgsGeologyResponse {
  success: boolean;
  matched?: boolean;
  lat: number;
  lon: number;
  regionId?: string;
  quadrangle: string;
  units: UsgsGeologicUnitInfo[];
  nearbyUnits?: UsgsGeologicUnitInfo[];
  boundariesSummary?: string;
  geojson?: UsgsSim3292GeoJsonSummary | null;
  sim3292Release?: UsgsSim3292DatasetRelease | null;
  stacDtms: Array<{
    id: string;
    title: string;
    collection: string;
    resolutionMeters: number;
    dtmUrl: string;
    previewUrl: string;
    bbox: number[];
    source: string;
  }>;
  provenance: {
    primaryMap: string;
    usgsCenter: string;
    wmsEndpoint: string;
    stacEndpoint: string;
    geojsonEndpoint?: string;
    pubsEndpoint?: string;
    retrievedAt: string;
  };
  sourceStatus: 'live' | 'cached' | 'catalog-fallback';
  note?: string;
}

export interface TrekElevationSample {
  lat: number;
  lon: number;
  elevationM: number | null;
  calibrated: boolean;
  datum: string;
  source: string;
  resolutionMeters: number;
  error?: string;
}

export interface TrekElevationProfileResponse {
  success: boolean;
  calibrated: boolean;
  datum: string;
  source: string;
  resolutionMeters: number;
  samples: TrekElevationSample[];
  minElevationM: number | null;
  maxElevationM: number | null;
  reliefM: number | null;
  error?: string;
}

export interface EarthAnalogSite {
  id: string;
  name: string;
  countryOrRegion: string;
  lat: number;
  lon: number;
  marsAnalogTarget: string;
  analogRationale: string;
  gibsLayerId: string;
  gibsLayerTitle: string;
  date: string;
  tileUrl: string;
  previewImageUrl: string;
  worldviewUrl: string;
  planet: 'Earth (Analog Reference Only)';
  isMarsTerrain: false;
  warningNotice: string;
}

export interface CuriosityRouteBenchmark {
  mission: string;
  landingSite: string;
  quadrangle: string;
  targetMount: string;
  documentedMaxTiltDeg: number;
  recommendedSlopeLimitDeg: number;
  slipRiskThresholdPct: number;
  wheelWearMitigation: string;
  keyObstaclesReferenced: string[];
  provenanceUrl: string;
  isLiveTelemetry: false;
  disclosure: string;
}

export const CURIOSITY_ROUTE_BENCHMARK: CuriosityRouteBenchmark = {
  mission: 'NASA Mars Science Laboratory (Curiosity)',
  landingSite: 'Bradbury Landing → Aeolis Mons (Mount Sharp), Gale Crater (-4.58° N, 137.44° E)',
  quadrangle: 'Aeolis Quadrangle (MC-23)',
  targetMount: 'Vera Rubin Ridge / Glen Torridon / Gediz Vallis',
  documentedMaxTiltDeg: 30,
  recommendedSlopeLimitDeg: 15,
  slipRiskThresholdPct: 35,
  wheelWearMitigation: 'Prefer smooth regolith & laminated mudstone benches; detour around sharp ventifact/bedrock spikes (Hummocky Plains lesson) and loose Bagnold ripple crests.',
  keyObstaclesReferenced: [
    'Sharp embedded ventifacts (wheel puncture mitigation)',
    'Unconsolidated Bagnold sand ripples (>20% slip risk)',
    'Steep pediment scarps (>15° tactical slope cap)'
  ],
  provenanceUrl: 'https://trek.nasa.gov/mars/trekarcgis/rest/services/curiosity_path/MapServer',
  isLiveTelemetry: false,
  disclosure: 'Reference Benchmark Only — Operational planning constraints from NASA MSL Curiosity route engineering, not live rover telemetry.'
};

/**
 * Verified NASA Mars Trek & USGS Astrogeology WMS/ArcGIS Map Catalog
 */
export const VERIFIED_MARS_MAP_LAYERS: MarsTrekLayerSpec[] = [
  {
    id: 'trek_hrsc_mola_clrshade',
    name: 'NASA Trek HRSC + MOLA Blended Color Hillshade (200 m/px)',
    shortName: 'HRSC+MOLA Color Shade',
    category: 'hillshade',
    provider: 'NASA JPL Mars Trek / ESA DLR / MGS MOLA',
    mission: 'Mars Express (HRSC) + Mars Global Surveyor (MOLA)',
    instrument: 'HRSC + MOLA Blended DEM Hillshade',
    resolutionMeters: 200,
    resolutionLabel: '200 m/pixel',
    crs: 'IAU2000:49900 (Mars Equirectangular / EPSG:4326)',
    datum: 'MOLA Areoid',
    protocol: 'NASA Trek ArcGIS ImageServer',
    bbox: [-180, -90, 180, 90],
    publicationOrAcquisitionDate: '2019 (JPL Mars Trek Global Blend)',
    calibrationStatus: 'Calibrated Topographic DEM',
    description: 'Colorized global shaded-relief terrain combining ESA Mars Express HRSC topography with NASA MGS MOLA altimetry.',
    sourceUrl: 'https://trek.nasa.gov/mars/trekarcgis/rest/services/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp/ImageServer'
  },
  {
    id: 'trek_jezero_ctx_6m',
    name: 'NASA Trek Jezero Crater CTX Ortho Mosaic (6 m/px)',
    shortName: 'Jezero CTX 6m Mosaic',
    category: 'ctx',
    provider: 'NASA JPL Mars Trek / Malin Space Science Systems',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'Context Camera (CTX)',
    resolutionMeters: 6,
    resolutionLabel: '6 m/pixel',
    crs: 'IAU2000:49900 (Equirectangular)',
    datum: 'Mars Sphere / MOLA Datum',
    protocol: 'NASA Trek WMTS',
    bbox: [77.1605, 18.2110, 77.6992, 18.7212],
    publicationOrAcquisitionDate: '2020 (Mars 2020 Landing Site Cartography)',
    calibrationStatus: 'Calibrated Radiometric Mosaic',
    description: 'High-resolution 6 m/px orthorectified CTX mosaic covering Jezero Crater, Neretva Vallis delta, and Belva Crater.',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0/1.0.0/WMTSCapabilities.xml',
    isRegionalOnly: true,
    regionTag: 'jezero'
  },
  {
    id: 'trek_curiosity_hirise',
    name: 'NASA Trek Gale Crater / Curiosity HiRISE Mosaic (0.25 m/px)',
    shortName: 'Gale HiRISE Mosaic',
    category: 'hirise',
    provider: 'NASA JPL Mars Trek / University of Arizona',
    mission: 'Mars Reconnaissance Orbiter (MRO)',
    instrument: 'HiRISE',
    resolutionMeters: 0.25,
    resolutionLabel: '0.25 m/pixel',
    crs: 'IAU2000:49900 (Equirectangular)',
    datum: 'MOLA Areoid',
    protocol: 'NASA Trek ArcGIS ImageServer',
    bbox: [137.12, -4.93, 137.73, -4.25],
    publicationOrAcquisitionDate: '2018 (MSL Gale Traverse Cartography)',
    calibrationStatus: 'Calibrated Radiometric Mosaic',
    description: 'Sub-meter MRO HiRISE mosaic over Gale Crater landing ellipse and Mount Sharp foothills.',
    sourceUrl: 'https://trek.nasa.gov/mars/trekarcgis/rest/services/curiosity_hirise_mosaic/ImageServer',
    isRegionalOnly: true,
    regionTag: 'gale'
  },
  {
    id: 'usgs_themis_day',
    name: 'USGS Astrogeology THEMIS IR Day 100m Global Mosaic',
    shortName: 'THEMIS IR Day 100m',
    category: 'thermal',
    provider: 'USGS Astrogeology / ASU / NASA JPL',
    mission: '2001 Mars Odyssey',
    instrument: 'THEMIS (Thermal Emission Imaging System)',
    resolutionMeters: 100,
    resolutionLabel: '100 m/pixel',
    crs: 'EPSG:4326 / IAU_2015:49900',
    datum: 'Mars IAU2015 Ellipsoid',
    protocol: 'USGS Astrogeology WMS 1.3.0',
    bbox: [-180, -90, 180, 90],
    publicationOrAcquisitionDate: '2014 (THEMIS Controlled Mosaic v12)',
    calibrationStatus: 'Derived Thermal Mosaic',
    description: 'Daytime thermal infrared brightness mosaic highlighting slope orientation, surface albedo, and bedrock thermal contrast.',
    sourceUrl: 'https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map'
  },
  {
    id: 'usgs_themis_night',
    name: 'USGS Astrogeology THEMIS IR Night 100m Mosaic',
    shortName: 'THEMIS IR Night 100m',
    category: 'thermal',
    provider: 'USGS Astrogeology / ASU / NASA JPL',
    mission: '2001 Mars Odyssey',
    instrument: 'THEMIS Nighttime IR',
    resolutionMeters: 100,
    resolutionLabel: '100 m/pixel',
    crs: 'EPSG:4326 / IAU_2015:49900',
    datum: 'Mars IAU2015 Ellipsoid',
    protocol: 'USGS Astrogeology WMS 1.3.0',
    bbox: [-180, -90, 180, 90],
    publicationOrAcquisitionDate: '2014 (THEMIS Night Controlled)',
    calibrationStatus: 'Derived Thermal Mosaic',
    description: 'Nighttime IR mosaic isolating rock thermal inertia: bright zones indicate exposed bedrock/boulders; dark zones indicate fine dust.',
    sourceUrl: 'https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map'
  },
  {
    id: 'usgs_hrsc_mola_hillshade',
    name: 'USGS Astrogeology HRSC + MOLA Blended Hillshade',
    shortName: 'USGS HRSC+MOLA Shade',
    category: 'dem',
    provider: 'USGS Astrogeology / DLR / NASA GSFC',
    mission: 'Mars Express + Mars Global Surveyor',
    instrument: 'HRSC + MOLA Blended Elevation',
    resolutionMeters: 200,
    resolutionLabel: '200 m/pixel',
    crs: 'EPSG:4326 / IAU_2015:49900',
    datum: 'MOLA Areoid',
    protocol: 'USGS Astrogeology WMS 1.3.0',
    bbox: [-180, -90, 180, 90],
    publicationOrAcquisitionDate: '2018 (USGS Planetary WMS)',
    calibrationStatus: 'Calibrated Topographic DEM',
    description: 'High-relief grayscale shaded topography derived from global HRSC+MOLA digital elevation blend.',
    sourceUrl: 'https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map'
  },
  {
    id: 'usgs_mdim21_color',
    name: 'USGS Viking MDIM 2.1 Colorized Global Mosaic (232 m/px)',
    shortName: 'Viking MDIM 2.1 Color',
    category: 'mosaic',
    provider: 'USGS Astrogeology / NASA',
    mission: 'Viking Orbiter 1 & 2',
    instrument: 'VIS / MDIM 2.1 Mosaic',
    resolutionMeters: 232,
    resolutionLabel: '232 m/pixel',
    crs: 'EPSG:4326 / IAU_2015:49900',
    datum: 'Mars IAU2015 Ellipsoid',
    protocol: 'USGS Astrogeology WMS 1.3.0',
    bbox: [-180, -90, 180, 90],
    publicationOrAcquisitionDate: '2003 (USGS MDIM 2.1)',
    calibrationStatus: 'Calibrated Radiometric Mosaic',
    description: 'Geodetically controlled global colorized Viking Orbiter mosaic widely used as planetary cartographic base.',
    sourceUrl: 'https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map'
  },
  {
    id: 'trek_viking_mdim21',
    name: 'NASA Trek Viking MDIM 2.1 Color Global WMTS (232 m/px)',
    shortName: 'Trek Viking WMTS',
    category: 'mosaic',
    provider: 'NASA JPL Mars Trek / USGS Astrogeology',
    mission: 'Viking Orbiter 1 & 2',
    instrument: 'VIS / MDIM 2.1 WMTSMosaic',
    resolutionMeters: 232,
    resolutionLabel: '232 m/pixel',
    crs: 'IAU2000:49900 (Mars Equirectangular)',
    datum: 'Mars IAU2000 Sphere',
    protocol: 'NASA Trek WMTS',
    bbox: [-180, -90, 180, 90],
    publicationOrAcquisitionDate: '2014 (NASA JPL Mars Trek WMTS)',
    calibrationStatus: 'Calibrated Radiometric Mosaic',
    description: 'Global colorized Viking Orbiter mosaic served directly via NASA JPL Mars Trek OGC WMTS tiles.',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml'
  },
  {
    id: 'trek_mola_clrshade',
    name: 'NASA Trek MGS MOLA Colorized Hillshade WMTS (463 m/px)',
    shortName: 'Trek MOLA Color WMTS',
    category: 'dem',
    provider: 'NASA JPL Mars Trek / MOLA Science Team',
    mission: 'Mars Global Surveyor (MGS)',
    instrument: 'MOLA (Mars Orbiter Laser Altimeter)',
    resolutionMeters: 463,
    resolutionLabel: '463 m/pixel',
    crs: 'IAU2000:49900 (Mars Equirectangular)',
    datum: 'MOLA Areoid',
    protocol: 'NASA Trek WMTS',
    bbox: [-180, -90, 180, 90],
    publicationOrAcquisitionDate: '2014 (NASA JPL Mars Trek WMTS)',
    calibrationStatus: 'Calibrated Topographic DEM',
    description: 'Hypsometric colorized global shaded elevation mosaic derived from MGS MOLA laser altimetry.',
    sourceUrl: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml'
  },
  {
    id: 'usgs_mola_themis_blend',
    name: 'USGS Astrogeology MOLA + THEMIS Blended Relief',
    shortName: 'USGS MOLA+THEMIS',
    category: 'dem',
    provider: 'USGS Astrogeology / ASU / NASA GSFC',
    mission: 'MGS MOLA + 2001 Mars Odyssey THEMIS',
    instrument: 'MOLA + THEMIS Blend',
    resolutionMeters: 200,
    resolutionLabel: '200 m/pixel',
    crs: 'EPSG:4326 / IAU_2015:49900',
    datum: 'MOLA Areoid',
    protocol: 'USGS Astrogeology WMS 1.3.0',
    bbox: [-180, -90, 180, 90],
    publicationOrAcquisitionDate: '2018 (USGS Planetary WMS)',
    calibrationStatus: 'Calibrated Topographic DEM',
    description: 'Combined global MOLA elevation color ramp and THEMIS thermal-infrared geomorphology.',
    sourceUrl: 'https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map',
    wmsLayerName: 'MOLA_THEMIS_blend'
  },
  {
    id: 'trek_sim3292_geology',
    name: 'USGS–NASA SIM 3292 Global Geologic Map of Mars',
    shortName: 'USGS SIM 3292 Geology',
    category: 'geology',
    provider: 'USGS Astrogeology / NASA JPL Mars Trek',
    mission: 'Multi-Mission Synthesis (MOLA / THEMIS / CTX / HiRISE)',
    instrument: 'USGS Scientific Investigations Map 3292',
    resolutionMeters: 200,
    resolutionLabel: '1:20,000,000 Global Geologic Map',
    crs: 'IAU2000:49900',
    datum: 'Mars IAU2000 Sphere',
    protocol: 'NASA Trek ArcGIS MapServer',
    bbox: [-180, -90, 180, 90],
    publicationOrAcquisitionDate: '2014 (Tanaka et al., USGS SIM 3292)',
    calibrationStatus: 'Published Geologic Map',
    description: 'Authoritative global geologic units and age-stratigraphic boundaries compiled by Tanaka et al. (2014).',
    sourceUrl: 'https://trek.nasa.gov/mars/trekarcgis/rest/services/SIM3292_Global_Geology/MapServer'
  }
];

/**
 * Published stratigraphic dictionary for USGS SIM 3292 unit codes (Tanaka et al., 2014, DOI: 10.3133/sim3292).
 * Only grounded in official SIM 3292 legend definitions; never fabricates classifications.
 */
export const SIM3292_UNIT_GLOSSARY: Record<string, {
  epoch: string;
  lithology: string;
  boundaryContext: string;
}> = {
  mNhm: {
    epoch: 'Middle Noachian (~3.94–3.83 Ga)',
    lithology: 'Ancient crustal impact-brecciated highland massif rock with phyllosilicate alteration signatures along crater rims.',
    boundaryContext: 'Forms steep basin rim massifs bounding younger crater-fill and deltaic transition units.'
  },
  HNt: {
    epoch: 'Late Noachian to Early Hesperian (~3.75–3.56 Ga)',
    lithology: 'Fluvial-lacustrine and volcanic-sedimentary plains materials transitional between Noachian highlands and Hesperian basins.',
    boundaryContext: 'Embayed against mNhm rim massifs; hosts valley network mouths and lacustrine fan deposits.'
  },
  Htu: {
    epoch: 'Hesperian (~3.71–3.37 Ga)',
    lithology: 'Undivided sedimentary and volcanic transition units along dichotomy and large basin margins (including Gale Crater).',
    boundaryContext: 'Bounded by crater floor impact units (AHi) and stratified interior mound deposits.'
  },
  AHi: {
    epoch: 'Hesperian to Amazonian (<3.71 Ga)',
    lithology: 'Impact crater ejecta, melt breccia, and crater-wall slump complexes with preserved rim topography.',
    boundaryContext: 'Superimposed discordantly across older Noachian/Hesperian plains.'
  },
  eNh: {
    epoch: 'Early Noachian (~4.1–3.94 Ga)',
    lithology: 'Heavily cratered ancient highland basement bedrock, impact-gardened megaregolith.',
    boundaryContext: 'Oldest exposed crustal terrain in southern and circum-Hellas highlands.'
  },
  mNh: {
    epoch: 'Middle Noachian (~3.94–3.83 Ga)',
    lithology: 'Dissected highland plateau and intercrater plains dissected by ancient valley networks.',
    boundaryContext: 'Gradational contact with Early Noachian massifs and Hesperian ridged plains.'
  },
  lNh: {
    epoch: 'Late Noachian (~3.83–3.71 Ga)',
    lithology: 'Modified highland surfaces with fluvial dissection and localized sedimentary basin fills.',
    boundaryContext: 'Transitions downslope into Hesperian lowland and canyon units.'
  },
  Hve: {
    epoch: 'Hesperian (~3.71–3.37 Ga)',
    lithology: 'Volcanic edifice and ridged flood-basalt plains (Elysium/Tharsis volcanic provinces).',
    boundaryContext: 'Lapped by younger Amazonian lava flows and aeolian dust mantles.'
  },
  lHl: {
    epoch: 'Late Hesperian (~3.61–3.37 Ga)',
    lithology: 'Northern lowland sedimentary plains (Vastitas Borealis / Utopia / Arcadia basin fill) rich in ground ice.',
    boundaryContext: 'Marks the ancient northern ocean/outflow depositional shoreline boundary.'
  },
  AHv: {
    epoch: 'Hesperian to Amazonian (<3.71 Ga)',
    lithology: 'Smooth flood-basalt lava flows with lobate flow margins and minimal crater degradation.',
    boundaryContext: 'Sharp flow-front scarps overlapping older lowland plains.'
  },
  Av: {
    epoch: 'Amazonian (<3.37 Ga)',
    lithology: 'Young basaltic volcanic plains with sparse impact cratering and thin dust mantle.',
    boundaryContext: 'Covers older plains across Amazonis and Tharsis margins.'
  },
  lApc: {
    epoch: 'Late Amazonian (<0.5 Ga)',
    lithology: 'Volatile-rich mid-to-high latitude plains and crater-floor glacial/ice-rich mantling units.',
    boundaryContext: 'Diffuse gradational contacts controlled by obliquity-driven ice deposition.'
  }
};

/**
 * NASA Worldview / GIBS Earth-Observation Analog Reference Sites
 * Strictly isolated as Earth analog baselines (never treated as Martian terrain).
 */
export const EARTH_ANALOG_SITES: EarthAnalogSite[] = [
  {
    id: 'atacama',
    name: 'Atacama Desert Hyperarid Core',
    countryOrRegion: 'Northern Chile',
    lat: -23.86,
    lon: -69.14,
    marsAnalogTarget: 'Gale & Jezero Sulfate / Hyperarid Regolith Analog',
    analogRationale: 'Extreme UV flux, nitrate/sulfate evaporite crusts, and near-zero bio-moisture used by NASA Astrobiology teams to test Mars sample-cache and rover hazard sensors.',
    gibsLayerId: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    gibsLayerTitle: 'NASA GIBS MODIS Terra Corrected Reflectance (True Color)',
    date: '2025-01-15',
    tileUrl: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&CRS=EPSG:4326&BBOX=-25.5,-71.0,-22.0,-67.5&WIDTH=640&HEIGHT=480&FORMAT=image/jpeg&TIME=2025-01-15',
    previewImageUrl: '/api/worldview/tile?site=atacama',
    worldviewUrl: 'https://worldview.earthdata.nasa.gov/?v=-72.5,-26.5,-66.0,-21.0&l=MODIS_Terra_CorrectedReflectance_TrueColor',
    planet: 'Earth (Analog Reference Only)',
    isMarsTerrain: false,
    warningNotice: 'EARTH OBSERVATION ANALOG ONLY — Excluded from Martian terrain elevation, geology, and rover obstacle detection.'
  },
  {
    id: 'devon_island',
    name: 'Haughton Impact Crater, Devon Island',
    countryOrRegion: 'Nunavut, Canadian High Arctic',
    lat: 75.43,
    lon: -89.87,
    marsAnalogTarget: 'Polar Permafrost & Impact Breccia Crater Analog',
    analogRationale: '23 km polar impact crater in permafrost terrain serving as the NASA Haughton-Mars Project field analog for Arcadia/Utopia ice-rich crater exploration.',
    gibsLayerId: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    gibsLayerTitle: 'NASA GIBS MODIS Terra Corrected Reflectance (True Color)',
    date: '2024-07-15',
    tileUrl: 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=MODIS_Terra_CorrectedReflectance_TrueColor&CRS=EPSG:4326&BBOX=74.2,-92.0,76.6,-87.5&WIDTH=640&HEIGHT=480&FORMAT=image/jpeg&TIME=2024-07-15',
    previewImageUrl: '/api/worldview/tile?site=devon_island',
    worldviewUrl: 'https://worldview.earthdata.nasa.gov/?v=-94.0,73.5,-85.0,77.5&l=MODIS_Terra_CorrectedReflectance_TrueColor',
    planet: 'Earth (Analog Reference Only)',
    isMarsTerrain: false,
    warningNotice: 'EARTH OBSERVATION ANALOG ONLY — Excluded from Martian terrain elevation, geology, and rover obstacle detection.'
  }
];

/**
 * Helper: Build preview URL for server-side NASA Mars Trek / USGS WMS proxy
 */
export function getTrekTilePreviewUrl(params: {
  layerId: string;
  lat: number;
  lon: number;
  spanDeg?: number;
  width?: number;
  height?: number;
}): string {
  const { layerId, lat, lon, spanDeg = 0.45, width = 640, height = 640 } = params;
  const qs = new URLSearchParams({
    layerId,
    lat: String(lat),
    lon: String(lon),
    spanDeg: String(spanDeg),
    width: String(width),
    height: String(height)
  });
  return `/api/trek/tile-preview?${qs.toString()}`;
}

export async function fetchTrekLayers(lat?: number, lon?: number): Promise<{
  layers: MarsTrekLayerSpec[];
  source: string;
}> {
  const qs = lat !== undefined && lon !== undefined ? `?lat=${lat}&lon=${lon}` : '';
  const resp = await fetch(`/api/trek/layers${qs}`);
  if (!resp.ok) throw new Error(`Trek layers HTTP ${resp.status}`);
  return resp.json();
}

export async function fetchTrekElevationPoint(lat: number, lon: number): Promise<TrekElevationSample> {
  const resp = await fetch(`/api/trek/elevation?lat=${lat}&lon=${lon}`);
  if (!resp.ok) {
    return {
      lat,
      lon,
      elevationM: null,
      calibrated: false,
      datum: 'MOLA Areoid',
      source: 'NASA JPL Mars Trek MOLA ImageServer',
      resolutionMeters: 463,
      error: `HTTP ${resp.status}`
    };
  }
  const data = await resp.json();
  return data.samples?.[0] || {
    lat,
    lon,
    elevationM: null,
    calibrated: false,
    datum: 'MOLA Areoid',
    source: 'NASA JPL Mars Trek MOLA ImageServer',
    resolutionMeters: 463,
    error: data.error || 'Elevation unavailable'
  };
}

export async function fetchTrekElevationProfile(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  samples = 8
): Promise<TrekElevationProfileResponse> {
  const resp = await fetch(
    `/api/trek/elevation?lat1=${lat1}&lon1=${lon1}&lat2=${lat2}&lon2=${lon2}&samples=${samples}`
  );
  if (!resp.ok) {
    throw new Error(`Elevation profile HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function fetchUsgsGeologyContext(
  lat: number,
  lon: number,
  regionId?: string
): Promise<UsgsGeologyResponse> {
  const qs = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (regionId) qs.set('regionId', regionId);
  const resp = await fetch(`/api/usgs/geology?${qs.toString()}`);
  if (!resp.ok) throw new Error(`USGS geology HTTP ${resp.status}`);
  return resp.json();
}

export async function fetchWorldviewAnalogSites(): Promise<{
  sites: EarthAnalogSite[];
  disclaimer: string;
}> {
  const resp = await fetch('/api/worldview/analog');
  if (!resp.ok) throw new Error(`Worldview analog HTTP ${resp.status}`);
  return resp.json();
}

export interface SpaceWeatherTimeSeriesPoint {
  timestamp: string;
  value: number;
  satellite?: string;
}

export interface DonkiEventItem {
  id: string;
  kind: 'FLR' | 'CME' | 'SEP' | 'GST';
  startTime: string;
  peakTime?: string;
  classType?: string;
  sourceLocation?: string;
  kpIndex?: number;
  speedKmS?: number;
  note?: string;
  link?: string;
}

export interface DonkiEventBucket {
  available: boolean;
  count: number;
  items: DonkiEventItem[];
  note?: string;
}

export interface SpaceWeatherApiResponse {
  success: boolean;
  retrievedAt: string;
  dateRange: { startDate: string; endDate: string };
  earthSolarMonitor: {
    label: string;
    available: boolean;
    solarActivityLevel: 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Severe (SPE Alert)' | 'Unavailable';
    latestXrayClass: string | null;
    latestXrayFluxWm2: number | null;
    latestXrayTimestamp: string | null;
    latestProtonFluxPfu: number | null;
    latestProtonTimestamp: string | null;
    latestKpIndex: number | null;
    latestKpTimestamp: string | null;
    speAlertActive: boolean;
    xraySeries: SpaceWeatherTimeSeriesPoint[];
    protonSeries: SpaceWeatherTimeSeriesPoint[];
    kpSeries: SpaceWeatherTimeSeriesPoint[];
    provenance: {
      source: string;
      instruments: string;
      url: string;
    };
  };
  donkiEvents: {
    label: string;
    startDate: string;
    endDate: string;
    flares: DonkiEventBucket;
    cmes: DonkiEventBucket;
    seps: DonkiEventBucket;
    gsts: DonkiEventBucket;
    sourceUrl: string;
  };
  marsSurfaceObservations: {
    available: false;
    status: string;
    reason: string;
    archivalReferenceNote: string;
    caveat: string;
  };
}

export async function fetchMarsSpaceWeather(
  startDate?: string,
  endDate?: string
): Promise<SpaceWeatherApiResponse> {
  const qs = new URLSearchParams();
  if (startDate) qs.set('startDate', startDate);
  if (endDate) qs.set('endDate', endDate);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const resp = await fetch(`/api/space-weather/mars${query}`);
  if (!resp.ok) throw new Error(`Space weather HTTP ${resp.status}`);
  return resp.json();
}

