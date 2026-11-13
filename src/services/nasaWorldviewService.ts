/**
 * NASA Worldview / GIBS Earth-Observation Analog Service
 * Strictly isolated as Earth-observation testbed reference (isMarsTerrain: false).
 * Must NEVER be used for Martian navigation, slope analysis, or geology.
 */

import { EarthAnalogSite, EARTH_ANALOG_SITES, fetchWorldviewAnalogSites } from './marsGeospatialService';

export { type EarthAnalogSite, EARTH_ANALOG_SITES, fetchWorldviewAnalogSites };

export function getWorldviewTileUrl(siteId: string): string {
  return `/api/worldview/tile?site=${encodeURIComponent(siteId)}`;
}
