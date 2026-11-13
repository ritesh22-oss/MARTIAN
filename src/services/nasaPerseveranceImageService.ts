/**
 * NASA Perseverance & Multi-Rover Image Service
 * Connects to live Mars 2020 raw RSS API (search-filtered & paginated),
 * Curiosity/Opportunity/Spirit raw & NASA Image Library endpoints,
 * and full asset manifest resolution (/api/nasa/images-library/asset/:nasaId).
 */

import { apiGet } from '../utils/apiClient';
import {
  MarsRawImage,
  FetchRawImagesParams,
  SyncLatestResult,
  fetchMarsRawImages,
  syncLatestObservation,
  fetchHiRISEProducts,
  fetchSourcesHealth
} from './nasaDataService';

export interface NasaLibraryImageRecord {
  id: string;
  nasaId: string;
  title: string;
  description: string;
  dateCreated: string;
  center: string;
  credit: string;
  keywords: string[];
  thumbnailUrl: string;
  assetManifestApiUrl: string;
  resolvedFullResUrl?: string;
}

export interface NasaAssetManifestResponse {
  success: boolean;
  nasaId: string;
  origUrl: string | null;
  largeUrl: string | null;
  mediumUrl: string | null;
  thumbUrl: string | null;
  assets: string[];
  retrievedAt: string;
}

export const ROVER_CAMERA_CATALOG: Record<string, Array<{ id: string; label: string }>> = {
  mars2020: [
    { id: 'ALL', label: 'All Perseverance Cameras' },
    { id: 'NAVCAM_LEFT', label: 'NavCam Left' },
    { id: 'NAVCAM_RIGHT', label: 'NavCam Right' },
    { id: 'MCZ_LEFT', label: 'Mastcam-Z Left' },
    { id: 'MCZ_RIGHT', label: 'Mastcam-Z Right' },
    { id: 'FRONT_HAZCAM_LEFT_A', label: 'Front HazCam Left' },
    { id: 'FRONT_HAZCAM_RIGHT_A', label: 'Front HazCam Right' },
    { id: 'REAR_HAZCAM_LEFT', label: 'Rear HazCam Left' },
    { id: 'SUPERCAM_RMI', label: 'SuperCam RMI' },
    { id: 'SHERLOC_WATSON', label: 'SHERLOC WATSON' }
  ],
  msl: [
    { id: 'ALL', label: 'All Curiosity Cameras' },
    { id: 'MAST', label: 'Mastcam' },
    { id: 'NAV_LEFT', label: 'NavCam Left' },
    { id: 'FHAZ', label: 'Front HazCam' },
    { id: 'RHAZ', label: 'Rear HazCam' },
    { id: 'CHEMCAM_RMI', label: 'ChemCam RMI' },
    { id: 'MAHLI', label: 'MAHLI Hand Lens' }
  ],
  opportunity: [
    { id: 'ALL', label: 'All Opportunity Imagery' },
    { id: 'PANCAM', label: 'Panoramic Camera (Pancam)' },
    { id: 'NAVCAM', label: 'Navigation Camera (Navcam)' },
    { id: 'HAZCAM', label: 'Hazard Camera (Hazcam)' },
    { id: 'MI', label: 'Microscopic Imager (MI)' }
  ],
  spirit: [
    { id: 'ALL', label: 'All Spirit Imagery' },
    { id: 'PANCAM', label: 'Panoramic Camera (Pancam)' },
    { id: 'NAVCAM', label: 'Navigation Camera (Navcam)' },
    { id: 'HAZCAM', label: 'Hazard Camera (Hazcam)' },
    { id: 'MI', label: 'Microscopic Imager (MI)' }
  ],
  all: [
    { id: 'ALL', label: 'All Rover Cameras' },
    { id: 'NAVCAM', label: 'Navigation Cameras (Navcam)' },
    { id: 'MASTCAM', label: 'Mastcam / Mastcam-Z' },
    { id: 'PANCAM', label: 'Panoramic Camera (Pancam)' },
    { id: 'HAZCAM', label: 'Hazard Cameras (Hazcam)' },
    { id: 'SUPERCAM_RMI', label: 'SuperCam RMI' }
  ]
};

export async function searchNasaImageLibrary(params: {
  query: string;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}): Promise<{
  items: NasaLibraryImageRecord[];
  totalHits: number;
  page: number;
  hasMore: boolean;
  retrievedAt: string;
}> {
  const { query, page = 1, pageSize = 24, signal } = params;
  const qs = new URLSearchParams({
    q: query || 'Mars',
    page: String(page),
    page_size: String(pageSize)
  });

  const { data, error, isHtml } = await apiGet<any>(`/api/nasa/images-library/search?${qs.toString()}`, { signal });
  if (error || isHtml || !data) {
    throw new Error(error || 'Failed to query NASA Image and Video Library');
  }

  const rawItems: any[] = data.collection?.items || [];
  const totalHits: number = data.collection?.metadata?.total_hits ?? rawItems.length;

  const items: NasaLibraryImageRecord[] = rawItems.map((item: any) => {
    const meta = item.data?.[0] || {};
    const preview = (item.links || []).find((l: any) => l.rel === 'preview')?.href || '';
    const nasaId = String(meta.nasa_id || '');
    return {
      id: nasaId,
      nasaId,
      title: String(meta.title || nasaId || 'NASA Image'),
      description: String(meta.description || ''),
      dateCreated: String(meta.date_created || ''),
      center: String(meta.center || 'JPL'),
      credit: String(meta.secondary_creator || meta.center || 'NASA'),
      keywords: Array.isArray(meta.keywords) ? meta.keywords : [],
      thumbnailUrl: preview,
      assetManifestApiUrl: `/api/nasa/images-library/asset/${encodeURIComponent(nasaId)}`,
      resolvedFullResUrl: preview ? preview.replace('~thumb.jpg', '~large.jpg') : ''
    };
  });

  return {
    items,
    totalHits,
    page,
    hasMore: page * pageSize < totalHits && items.length > 0,
    retrievedAt: data._metadata?.timestamp || new Date().toISOString()
  };
}

export async function fetchNasaImageAssetManifest(nasaId: string): Promise<NasaAssetManifestResponse> {
  const { data, error, isHtml } = await apiGet<NasaAssetManifestResponse>(
    `/api/nasa/images-library/asset/${encodeURIComponent(nasaId)}`
  );
  if (error || isHtml || !data) {
    throw new Error(error || `Failed to resolve asset manifest for ${nasaId}`);
  }
  return data;
}

export {
  type MarsRawImage,
  type FetchRawImagesParams,
  type SyncLatestResult,
  fetchMarsRawImages,
  syncLatestObservation,
  fetchHiRISEProducts,
  fetchSourcesHealth
};
