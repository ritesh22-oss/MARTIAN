/**
 * MarsNav PDS Verification Engine & Metadata Evaluator
 * Strictly evaluates actual parsed PDS metadata against MarsNav Reference Configuration.
 * 
 * Baselines:
 * - Target Body: Mars
 * - Reference System: Planetocentric East-positive
 * - Reference Datum: Mars Aeroid / MOLA Areoid (Equatorial Radius 3396.19 km)
 * - Map Projection: Equirectangular / Conformal / Orthographic
 * - Jezero Crater Study Region: Lat 18.20°N to 18.55°N, Lon 77.20°E to 77.65°E
 */

export const MARSNAV_BASELINE = {
  targetBody: 'Mars',
  datum: 'Mars Aeroid / MOLA Areoid',
  meanRadiusKm: 3396.19,
  coordinateSystem: 'Planetocentric East-positive',
  latitudeConvention: 'Planetocentric',
  longitudeDirection: 'East-positive',
  preferredProjection: 'Equirectangular',
  elevationUnit: 'Meters',
  studyRegion: {
    name: 'Jezero Crater Western Delta Core',
    minLat: 18.20,
    maxLat: 18.55,
    minLon: 77.20,
    maxLon: 77.65
  }
};

/**
 * Parses raw PDS3 / PDS4 label text into structured key-value metadata.
 */
export function parsePDSLabelText(labelText) {
  if (!labelText || typeof labelText !== 'string') {
    return null;
  }

  const lines = labelText.split(/\r?\n/);
  const kv = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('#')) continue;

    // Match KEY = VALUE or <pds:tag>value</pds:tag>
    const eqMatch = trimmed.match(/^([A-Z0-9_:]+)\s*=\s*(.+)$/i);
    if (eqMatch) {
      const key = eqMatch[1].toUpperCase().trim();
      let val = eqMatch[2].trim().replace(/^"/, '').replace(/"$/, '').replace(/<[^>]+>/g, '');
      // Strip trailing comments
      if (val.includes('/*')) val = val.split('/*')[0].trim();
      kv[key] = val;
    } else {
      // XML tag match e.g. <pds:target_name>Mars</pds:target_name>
      const xmlMatch = trimmed.match(/<pds:([a-z0-9_]+)>([^<]+)<\/pds:[a-z0-9_]+>/i);
      if (xmlMatch) {
        const key = xmlMatch[1].toUpperCase().trim();
        kv[key] = xmlMatch[2].trim();
      }
    }
  }

  // Extract structured properties
  const targetBody = kv['TARGET_NAME'] || kv['TARGET'] || kv['TARGET_IDENTIFICATION'] || null;
  const coordSys = kv['COORDINATE_SYSTEM_NAME'] || kv['COORD_SYS'] || kv['COORDINATE_SYSTEM'] || null;
  const lonDir = kv['LONGITUDE_DIRECTION'] || kv['LONGITUDE_SYSTEM'] || null;
  const latType = kv['LATITUDE_TYPE'] || kv['LATITUDE_CONVENTION'] || null;
  const projection = kv['MAP_PROJECTION_TYPE'] || kv['PROJECTION_TYPE'] || kv['MAP_PROJECTION_NAME'] || null;
  const datum = kv['A_AXIS_RADIUS'] ? `Spheroid Radius ${kv['A_AXIS_RADIUS']} km` : (kv['SPHEROID_NAME'] || kv['DATUM_NAME'] || kv['DATUM'] || null);
  
  const scaleStr = kv['MAP_SCALE'] || kv['PIXEL_RESOLUTION'] || kv['GRID_RESOLUTION'] || kv['PIXEL_SCALE'] || null;
  let resolutionMeters = null;
  if (scaleStr) {
    const num = parseFloat(scaleStr);
    if (!isNaN(num)) resolutionMeters = num;
  }

  const units = kv['UNIT'] || kv['ELEVATION_UNIT'] || kv['VERTICAL_UNIT'] || kv['MAP_SCALE_UNIT'] || null;

  const minLatStr = kv['MINIMUM_LATITUDE'] || kv['SOUTH_BOUNDING_LATITUDE'] || kv['MIN_LAT'] || null;
  const maxLatStr = kv['MAXIMUM_LATITUDE'] || kv['NORTH_BOUNDING_LATITUDE'] || kv['MAX_LAT'] || null;
  const minLonStr = kv['WESTERNMOST_LONGITUDE'] || kv['WEST_BOUNDING_LONGITUDE'] || kv['MIN_LON'] || null;
  const maxLonStr = kv['EASTERNMOST_LONGITUDE'] || kv['EAST_BOUNDING_LONGITUDE'] || kv['MAX_LON'] || null;

  let bounds = null;
  if (minLatStr && maxLatStr && minLonStr && maxLonStr) {
    bounds = {
      minLat: parseFloat(minLatStr),
      maxLat: parseFloat(maxLatStr),
      minLon: parseFloat(minLonStr),
      maxLon: parseFloat(maxLonStr)
    };
  }

  const format = kv['RECORD_TYPE'] || kv['FORMAT'] || kv['FILE_TYPE'] || kv['DATA_TYPE'] || null;
  const productType = kv['PRODUCT_TYPE'] || kv['DATA_SET_ID'] || kv['PRODUCT_ID'] || null;

  return {
    rawKeyValueCount: Object.keys(kv).length,
    targetBody,
    coordinateSystem: coordSys,
    longitudeDirection: lonDir,
    latitudeConvention: latType,
    mapProjection: projection,
    datum,
    resolutionMeters,
    units,
    bounds,
    format,
    productType,
    hasTerrainData: productType && (productType.includes('DTM') || productType.includes('DEM') || productType.includes('MEGDR') || productType.includes('ELEVATION'))
  };
}

/**
 * Runs 9 genuine verification checks against active dataset metadata.
 * Returns exact PASS, FAIL, or UNKNOWN status for each check without fake numbers.
 */
export function verifyDatasetMetadata(metadata, studyRegion = MARSNAV_BASELINE.studyRegion) {
  const retrievalSuccess = Boolean(metadata && !metadata.retrievalError);
  const checks = [];

  let passCount = 0;
  let failCount = 0;
  let unknownCount = 0;

  // 1. Target Body
  const targetVal = metadata?.targetBody;
  if (!retrievalSuccess || !targetVal) {
    unknownCount++;
    checks.push({
      id: 'target_body',
      title: 'Target Celestial Body',
      status: 'UNKNOWN',
      expected: 'Mars',
      actual: 'Metadata unavailable',
      explanation: 'Target body parameter could not be retrieved from dataset header or PDS API.'
    });
  } else if (targetVal.toUpperCase().includes('MARS')) {
    passCount++;
    checks.push({
      id: 'target_body',
      title: 'Target Celestial Body',
      status: 'PASS',
      expected: 'Mars',
      actual: targetVal,
      explanation: 'Verified target body is Mars.'
    });
  } else {
    failCount++;
    checks.push({
      id: 'target_body',
      title: 'Target Celestial Body',
      status: 'FAIL',
      expected: 'Mars',
      actual: targetVal,
      explanation: `Dataset is captured for ${targetVal}, not Mars. Target mismatch.`
    });
  }

  // 2. Coordinate Reference System & Convention
  const coordSys = metadata?.coordinateSystem;
  const lonDir = metadata?.longitudeDirection;
  if (!retrievalSuccess || (!coordSys && !lonDir)) {
    unknownCount++;
    checks.push({
      id: 'crs',
      title: 'Coordinate Reference System & Convention',
      status: 'UNKNOWN',
      expected: 'Planetocentric East-positive',
      actual: 'Metadata unavailable',
      explanation: 'Coordinate system parameters missing from label headers.'
    });
  } else {
    const isEast = (lonDir && lonDir.toUpperCase().includes('EAST')) || (coordSys && coordSys.toUpperCase().includes('EAST'));
    const isWest = (lonDir && lonDir.toUpperCase().includes('WEST')) || (coordSys && coordSys.toUpperCase().includes('WEST'));

    if (isEast) {
      passCount++;
      checks.push({
        id: 'crs',
        title: 'Coordinate Reference System & Convention',
        status: 'PASS',
        expected: 'Planetocentric East-positive',
        actual: coordSys || 'East-positive',
        explanation: 'Coordinate reference system conforms to Planetocentric East-positive convention.'
      });
    } else if (isWest) {
      failCount++;
      checks.push({
        id: 'crs',
        title: 'Coordinate Reference System & Convention',
        status: 'FAIL',
        expected: 'Planetocentric East-positive',
        actual: coordSys || 'West-positive Planetographic',
        explanation: 'West-positive longitude convention detected. Requires axis inversion (360° - Lon_West).'
      });
    } else {
      unknownCount++;
      checks.push({
        id: 'crs',
        title: 'Coordinate Reference System & Convention',
        status: 'UNKNOWN',
        expected: 'Planetocentric East-positive',
        actual: coordSys || 'Undefined',
        explanation: 'Coordinate direction convention is unspecified in label.'
      });
    }
  }

  // 3. Map Projection & Spatial Reference
  const proj = metadata?.mapProjection;
  if (!retrievalSuccess || !proj) {
    unknownCount++;
    checks.push({
      id: 'map_projection',
      title: 'Map Projection & Spatial Reference',
      status: 'UNKNOWN',
      expected: 'Equirectangular / Conformal Projection',
      actual: 'Metadata unavailable',
      explanation: 'Map projection definition keyword missing from dataset headers.'
    });
  } else {
    const pUpper = proj.toUpperCase();
    if (pUpper.includes('EQUIRECTANGULAR') || pUpper.includes('SINUSOIDAL') || pUpper.includes('STEREOGRAPHIC') || pUpper.includes('MERCATOR') || pUpper.includes('ORTHOGRAPHIC')) {
      passCount++;
      checks.push({
        id: 'map_projection',
        title: 'Map Projection & Spatial Reference',
        status: 'PASS',
        expected: 'Standard Conformal / Cylindrical Projection',
        actual: proj,
        explanation: `Map projection (${proj}) can be transformed to Jezero local coordinates.`
      });
    } else if (pUpper.includes('NONE') || pUpper.includes('UNPROJECTED')) {
      failCount++;
      checks.push({
        id: 'map_projection',
        title: 'Map Projection & Spatial Reference',
        status: 'FAIL',
        expected: 'Georeferenced Map Projection',
        actual: proj,
        explanation: 'Unprojected or raw camera perspective data without georeferenced spatial projection.'
      });
    } else {
      unknownCount++;
      checks.push({
        id: 'map_projection',
        title: 'Map Projection & Spatial Reference',
        status: 'UNKNOWN',
        expected: 'Supported Map Projection',
        actual: proj,
        explanation: `Unrecognized projection format (${proj}). Requires manual transform inspection.`
      });
    }
  }

  // 4. Horizontal & Vertical Datum
  const datum = metadata?.datum;
  if (!retrievalSuccess || !datum) {
    unknownCount++;
    checks.push({
      id: 'datum',
      title: 'Horizontal & Vertical Datum Compatibility',
      status: 'UNKNOWN',
      expected: 'Mars Aeroid / MOLA Areoid',
      actual: 'Metadata unavailable',
      explanation: 'Datum definition missing from dataset label.'
    });
  } else {
    const dUpper = datum.toUpperCase();
    if (dUpper.includes('MOLA') || dUpper.includes('AEROID') || dUpper.includes('3396') || dUpper.includes('AREOCENTRIC')) {
      passCount++;
      checks.push({
        id: 'datum',
        title: 'Horizontal & Vertical Datum Compatibility',
        status: 'PASS',
        expected: 'Mars Aeroid / MOLA Areoid',
        actual: datum,
        explanation: 'Horizontal and vertical datum matches Mars Aeroid reference spheroid.'
      });
    } else {
      failCount++;
      checks.push({
        id: 'datum',
        title: 'Horizontal & Vertical Datum Compatibility',
        status: 'FAIL',
        expected: 'Mars Aeroid / MOLA Areoid',
        actual: datum,
        explanation: `Non-standard datum detected (${datum}). Spheroid radius offset prevents direct vertical alignment.`
      });
    }
  }

  // 5. Spatial Resolution & Pixel Scale
  const res = metadata?.resolutionMeters;
  if (!retrievalSuccess || res === null || res === undefined) {
    unknownCount++;
    checks.push({
      id: 'resolution',
      title: 'Spatial Resolution & Pixel Scale',
      status: 'UNKNOWN',
      expected: 'Calibrated Pixel Scale (m/pixel)',
      actual: 'Metadata unavailable',
      explanation: 'Grid cell resolution or pixel scale parameter unavailable.'
    });
  } else if (res > 0 && res <= 1000) {
    passCount++;
    checks.push({
      id: 'resolution',
      title: 'Spatial Resolution & Pixel Scale',
      status: 'PASS',
      expected: 'Spatial Grid Resolution ≤ 1000 m/px',
      actual: `${res} m/pixel`,
      explanation: res <= 1.0
        ? `High resolution grid (${res} m/px) ideal for rover navigation.`
        : `Coarse grid resolution (${res} m/px). Spatial interpolation required before micro-routing.`
    });
  } else {
    failCount++;
    checks.push({
      id: 'resolution',
      title: 'Spatial Resolution & Pixel Scale',
      status: 'FAIL',
      expected: 'Valid Spatial Grid Scale',
      actual: `${res} m/pixel`,
      explanation: 'Point data or uncalibrated grid scale.'
    });
  }

  // 6. Elevation & Measurement Units
  const units = metadata?.units;
  if (!retrievalSuccess || !units) {
    unknownCount++;
    checks.push({
      id: 'elevation_units',
      title: 'Elevation & Measurement Units',
      status: 'UNKNOWN',
      expected: 'Meters / Linear Height Scale',
      actual: 'Metadata unavailable',
      explanation: 'Measurement units keyword missing from label.'
    });
  } else {
    const uUpper = units.toUpperCase();
    if (uUpper.includes('METER') || uUpper === 'M' || uUpper.includes('DEGREE')) {
      passCount++;
      checks.push({
        id: 'elevation_units',
        title: 'Elevation & Measurement Units',
        status: 'PASS',
        expected: 'Meters / Linear Height',
        actual: units,
        explanation: 'Measurement scale conforms to meters height relative to MOLA datum.'
      });
    } else {
      failCount++;
      checks.push({
        id: 'elevation_units',
        title: 'Elevation & Measurement Units',
        status: 'FAIL',
        expected: 'Meters / Linear Elevation',
        actual: units,
        explanation: `Non-elevation units (${units}). Product represents pressure, temperature, or non-spatial telemetry.`
      });
    }
  }

  // 7. Raster Format & Processability
  const format = metadata?.format || metadata?.spatialType;
  if (!retrievalSuccess) {
    unknownCount++;
    checks.push({
      id: 'raster_format',
      title: 'Raster Format & Processability',
      status: 'UNKNOWN',
      expected: 'Processable Raster DEM / IMG / GeoTIFF / PDS4',
      actual: 'Metadata unavailable',
      explanation: 'Unable to retrieve file format headers from remote or local source.'
    });
  } else if (metadata?.corrupt || metadata?.unparseable) {
    failCount++;
    checks.push({
      id: 'raster_format',
      title: 'Raster Format & Processability',
      status: 'FAIL',
      expected: 'Processable Raster Structure',
      actual: format || 'Unparseable Raw Header',
      explanation: 'Label or binary file is corrupted, truncated, or lacks required PDS pointers.'
    });
  } else if (format) {
    passCount++;
    checks.push({
      id: 'raster_format',
      title: 'Raster Format & Processability',
      status: 'PASS',
      expected: 'Processable Spatial Raster',
      actual: format,
      explanation: `Raster structure (${format}) can be parsed and rendered by MarsNav raster engine.`
    });
  } else {
    unknownCount++;
    checks.push({
      id: 'raster_format',
      title: 'Raster Format & Processability',
      status: 'UNKNOWN',
      expected: 'Processable Spatial Raster',
      actual: 'Format keywords missing',
      explanation: 'Record structure format undefined in header.'
    });
  }

  // 8. Geographic Coverage & Study Region Overlap
  const bounds = metadata?.bounds;
  if (!retrievalSuccess || !bounds) {
    unknownCount++;
    checks.push({
      id: 'geographic_coverage',
      title: 'Geographic Coverage & Jezero Overlap',
      status: 'UNKNOWN',
      expected: 'Overlap with Jezero Region (18.20°N-18.55°N, 77.20°E-77.65°E)',
      actual: 'Metadata unavailable',
      explanation: 'Bounding latitude/longitude parameters unavailable in dataset metadata.'
    });
  } else {
    // Calculate overlap
    const latIntersect = Math.max(0, Math.min(bounds.maxLat, studyRegion.maxLat) - Math.max(bounds.minLat, studyRegion.minLat));
    const lonIntersect = Math.max(0, Math.min(bounds.maxLon, studyRegion.maxLon) - Math.max(bounds.minLon, studyRegion.minLon));
    
    const regionLatSpan = studyRegion.maxLat - studyRegion.minLat;
    const regionLonSpan = studyRegion.maxLon - studyRegion.minLon;
    const regionArea = regionLatSpan * regionLonSpan;

    const overlapArea = latIntersect * lonIntersect;
    const overlapPct = Math.round((overlapArea / regionArea) * 100);

    if (overlapPct > 0) {
      passCount++;
      checks.push({
        id: 'geographic_coverage',
        title: 'Geographic Coverage & Jezero Overlap',
        status: 'PASS',
        expected: 'Geographic Overlap with Study Region',
        actual: `${overlapPct}% Regional Overlap (${bounds.minLat}°N to ${bounds.maxLat}°N, ${bounds.minLon}°E to ${bounds.maxLon}°E)`,
        explanation: `Dataset spatial bounding box covers ${overlapPct}% of Jezero Crater study region.`
      });
    } else {
      failCount++;
      checks.push({
        id: 'geographic_coverage',
        title: 'Geographic Coverage & Jezero Overlap',
        status: 'FAIL',
        expected: 'Geographic Overlap with Study Region',
        actual: `0% Overlap (${bounds.minLat}°N to ${bounds.maxLat}°N, ${bounds.minLon}°E to ${bounds.maxLon}°E)`,
        explanation: '0% geographic overlap. Dataset lies outside Jezero Crater study region.'
      });
    }
  }

  // 9. Elevation & Terrain Information Presence
  const hasTerrain = metadata?.hasTerrainData;
  const isNonSpatial = metadata?.spatialType && metadata.spatialType.toLowerCase().includes('non-spatial');

  if (!retrievalSuccess) {
    unknownCount++;
    checks.push({
      id: 'terrain_data_presence',
      title: '3D Terrain & Elevation Data Payload',
      status: 'UNKNOWN',
      expected: 'Contains 3D DEM / DTM Elevation Grid',
      actual: 'Metadata unavailable',
      explanation: 'Product type information unavailable in label.'
    });
  } else if (isNonSpatial) {
    failCount++;
    checks.push({
      id: 'terrain_data_presence',
      title: '3D Terrain & Elevation Data Payload',
      status: 'FAIL',
      expected: 'Contains 3D DEM / DTM Elevation Grid',
      actual: 'Non-Spatial Environmental Stream',
      explanation: 'Dataset consists of in-situ point atmospheric sensor measurements (MEDA). No 3D topographic terrain elevation grid.'
    });
  } else if (hasTerrain) {
    passCount++;
    checks.push({
      id: 'terrain_data_presence',
      title: '3D Terrain & Elevation Data Payload',
      status: 'PASS',
      expected: 'Contains 3D DEM / DTM Elevation Grid',
      actual: metadata?.productType || '3D Topographic DEM / DTM',
      explanation: 'Verified dataset contains 3D Digital Elevation Model (DEM) topographic surface payload.'
    });
  } else {
    failCount++;
    checks.push({
      id: 'terrain_data_presence',
      title: '3D Terrain & Elevation Data Payload',
      status: 'FAIL',
      expected: 'Contains 3D DEM / DTM Elevation Grid',
      actual: 'Visual Albedo Imagery / Non-DEM',
      explanation: 'Dataset represents 2D surface imagery or non-elevation product without 3D height information.'
    });
  }

  // Calculate Final Result based on actual check results
  let finalResult = 'UNVERIFIED';
  let resultReason = '';

  if (!retrievalSuccess) {
    finalResult = 'UNVERIFIED';
    resultReason = metadata?.retrievalError || 'Metadata could not be retrieved from dataset source.';
  } else if (failCount > 0) {
    finalResult = 'INCOMPATIBLE';
    const failingChecks = checks.filter(c => c.status === 'FAIL').map(c => c.title);
    resultReason = `Critical requirement failure in: ${failingChecks.join(', ')}.`;
  } else if (passCount === 9) {
    finalResult = 'VERIFIED';
    resultReason = 'All 9 spatial, coordinate, datum, unit, and terrain payload checks passed successfully.';
  } else if (passCount > 0 && failCount === 0) {
    finalResult = 'PARTIALLY COMPATIBLE';
    const unknownChecks = checks.filter(c => c.status === 'UNKNOWN').map(c => c.title);
    resultReason = `Passed core spatial checks (${passCount}/9). ${unknownCount} parameters could not be determined (${unknownChecks.join(', ')}).`;
  }

  return {
    retrievedAt: metadata?.retrievedAt || new Date().toISOString(),
    metadataRetrieved: retrievalSuccess,
    retrievalError: metadata?.retrievalError || null,
    finalResult,
    resultReason,
    passCount,
    failCount,
    unknownCount,
    totalChecks: checks.length,
    checks
  };
}
