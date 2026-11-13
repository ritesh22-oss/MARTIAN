/**
 * NASA JPL Mars Trek Service
 * Fetches live parsed WMTSCapabilities.xml catalogs, ArcGIS REST service metadata,
 * WMTS tiles, tile-preview cutouts, and calibrated MOLA / Gale DEM elevation points.
 */

import type { ParsedWmtsLayerCapability } from './marsCapabilitiesParser';
import {
  MarsTrekLayerSpec,
  TrekElevationSample,
  TrekElevationProfileResponse,
  getTrekTilePreviewUrl,
  fetchTrekLayers,
  fetchTrekElevationPoint,
  fetchTrekElevationProfile
} from './marsGeospatialService';

export interface TrekWmtsCapabilitiesResponse {
  success: boolean;
  source: string;
  wmtsLayers: ParsedWmtsLayerCapability[];
  arcgisServices: Array<{ name: string; type: string; url: string }>;
  failedEndpoints: Array<{ id: string; url: string; error: string }>;
  retrievedAt: string;
}

export async function fetchTrekWmtsCapabilities(): Promise<TrekWmtsCapabilitiesResponse> {
  const resp = await fetch('/api/trek/wmts/capabilities');
  if (!resp.ok) {
    throw new Error(`NASA Mars Trek WMTS Capabilities HTTP ${resp.status}`);
  }
  return resp.json();
}

export function getTrekWmtsTileUrl(
  layerId: string,
  z: number,
  row: number,
  col: number
): string {
  return `/api/trek/wmts/tile/${encodeURIComponent(layerId)}/${z}/${row}/${col}`;
}

export {
  type MarsTrekLayerSpec,
  type TrekElevationSample,
  type TrekElevationProfileResponse,
  getTrekTilePreviewUrl,
  fetchTrekLayers,
  fetchTrekElevationPoint,
  fetchTrekElevationProfile
};
