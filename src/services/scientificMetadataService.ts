/**
 * Scientific Provenance & Metadata Normalization Service
 * Standardizes source attribution, CRS, instrument, calibration status,
 * acquisition/publication date, and retrieval timestamps across all NASA & USGS feeds.
 */

export interface ScientificProvenanceMetadata {
  sourceOrganization: string;
  datasetOrMissionName: string;
  instrumentOrModel: string;
  coordinateReferenceSystem: string;
  datum: string;
  publicationOrAcquisitionDate: string;
  retrievedAt: string;
  calibrationStatus: string;
  sourceUrl: string;
  isCalibrated: boolean;
}

export function createScientificProvenance(
  partial: Partial<ScientificProvenanceMetadata>
): ScientificProvenanceMetadata {
  return {
    sourceOrganization: partial.sourceOrganization || 'NASA / USGS',
    datasetOrMissionName: partial.datasetOrMissionName || 'Planetary Science Dataset',
    instrumentOrModel: partial.instrumentOrModel || 'Orbital / Surface Sensor',
    coordinateReferenceSystem: partial.coordinateReferenceSystem || 'IAU2000:49900 (Mars Equirectangular)',
    datum: partial.datum || 'MOLA Areoid',
    publicationOrAcquisitionDate: partial.publicationOrAcquisitionDate || 'See upstream catalog',
    retrievedAt: partial.retrievedAt || new Date().toISOString(),
    calibrationStatus: partial.calibrationStatus || 'Unverified',
    sourceUrl: partial.sourceUrl || '',
    isCalibrated: Boolean(partial.isCalibrated)
  };
}

export function formatMarsCoordinate(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${lon.toFixed(4)}° E`;
  return `${latStr}, ${lonStr}`;
}
