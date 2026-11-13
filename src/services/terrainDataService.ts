/**
 * Terrain Data Service
 * Unifies calibrated USGS STAC GeoTIFF DTM rasters and NASA Mars Trek MOLA elevation profiles.
 * Explicitly distinguishes calibrated elevation/slope from 2D rover photo visual estimates.
 */

import type { ProcessedDtmData } from './stacProcessor';
import {
  fetchTrekElevationPoint,
  fetchTrekElevationProfile,
  TrekElevationSample,
  TrekElevationProfileResponse
} from './marsGeospatialService';

export async function processStacDtm(params: {
  dtmUrl: string;
  itemId?: string;
  title?: string;
  stacCollection?: string;
  targetGridSize?: number;
}): Promise<ProcessedDtmData> {
  const resp = await fetch('/api/stac/dtm/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!resp.ok) {
    throw new Error(`STAC DTM process HTTP ${resp.status}`);
  }
  const payload = await resp.json();
  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message || 'STAC DTM processing failed');
  }
  return payload.data;
}

export {
  type ProcessedDtmData,
  type TrekElevationSample,
  type TrekElevationProfileResponse,
  fetchTrekElevationPoint,
  fetchTrekElevationProfile
};
