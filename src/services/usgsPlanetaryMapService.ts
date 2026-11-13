/**
 * USGS Astrogeology Planetary Map & Geologic Mapping Service
 * Connects to live USGS Planetarymaps WMS 1.3.0 GetCapabilities,
 * USGS-NASA SIM 3292 GeoJSON geologic polygons, DOI 10.5066/P9UGAC18 release metadata,
 * and USGS Astrogeology STAC DTM search.
 */

import type { ParsedWmsCapabilities, ParsedFgdcMetadata } from './marsCapabilitiesParser';
import {
  UsgsGeologicUnitInfo,
  UsgsGeologyResponse,
  fetchUsgsGeologyContext
} from './marsGeospatialService';

export interface UsgsWmsCapabilitiesResponse {
  success: boolean;
  capabilities: ParsedWmsCapabilities;
  source: string;
  retrievedAt: string;
}

export interface UsgsSim3292ReleaseMetadata {
  doi: string;
  doiResolvedUrl: string | null;
  scienceBaseStatus: string;
  pubsApiUrl: string;
  title: string;
  year: string;
  authors: string[];
  mapScale: string;
  downloads: Array<{ label: string; url: string; fileType: string }>;
  fgdcMetadata: ParsedFgdcMetadata | null;
}

export async function fetchUsgsWmsCapabilities(): Promise<UsgsWmsCapabilitiesResponse> {
  const resp = await fetch('/api/usgs/wms/capabilities');
  if (!resp.ok) {
    throw new Error(`USGS WMS GetCapabilities HTTP ${resp.status}`);
  }
  return resp.json();
}

export {
  type UsgsGeologicUnitInfo,
  type UsgsGeologyResponse,
  fetchUsgsGeologyContext
};
