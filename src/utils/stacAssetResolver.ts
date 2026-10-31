export interface ResolvedStacImage {
  imageUrl: string;
  originalAssetUrl: string;
  assetKey: string;
  assetTypeLabel: string;
  observationId: string;
  attribution: string;
  isGeoTiff: boolean;
}

/**
 * Extract Observation ID from STAC item id, title, or assets
 * e.g. DTEEC_048842_1985_048908_1985_U01 -> ESP_048842_1985
 */
export function extractObservationId(item: any): string {
  if (!item) return 'UNKNOWN_OBSERVATION';
  const strToTest = `${item.id || ''} ${item.properties?.title || ''} ${item.properties?.description || ''}`;

  // Match full HiRISE ID e.g. ESP_048842_1985 or PSP_001414_1780
  const matchFull = strToTest.match(/(ESP|PSP)_[0-9]{6}_[0-9]{4}/i);
  if (matchFull) return matchFull[0].toUpperCase();

  // Match 6 digit orbit number
  const match6 = strToTest.match(/[0-9]{6}/);
  if (match6) return `ESP_${match6[0]}_1985`;

  return item.id || 'MRO_HIRISE_DTM';
}

/**
 * Generate HiRISE PDS Extras direct browse image URL if observation ID is present
 */
export function getHiRisePdsBrowseUrl(obsId: string): string | null {
  const match = obsId.match(/(ESP|PSP)_([0-9]{6})_([0-9]{4})/i);
  if (!match) return null;
  const prefix = match[1].toUpperCase();
  const orbitNum = parseInt(match[2], 10);
  const orbitStart = Math.floor(orbitNum / 100) * 100;
  const orbitEnd = orbitStart + 99;
  const startStr = String(orbitStart).padStart(6, '0');
  const endStr = String(orbitEnd).padStart(6, '0');

  return `https://hirise-pds.lpl.arizona.edu/PDS/EXTRAS/RDR/${prefix}/ORB_${startStr}_${endStr}/${obsId}/${obsId}_RED.NOMAP.browse.jpg`;
}

/**
 * Main function to resolve the optimal image display URL for any STAC Item
 */
export function resolveStacItemImage(item: any): ResolvedStacImage {
  const obsId = extractObservationId(item);
  const assets = item?.assets || {};
  const attribution = item?.properties?.missions?.[0] || 'NASA / JPL-Caltech / UA / USGS';

  // 1. Inspect all assets and build asset list
  const assetEntries = Object.entries(assets).map(([key, asset]: [string, any]) => {
    const href = asset?.href || '';
    const title = (asset?.title || '').toLowerCase();
    const type = (asset?.type || '').toLowerCase();
    const roles = Array.isArray(asset?.roles) ? asset.roles.map((r: string) => r.toLowerCase()) : [];
    const isImageFile = Boolean(href.toLowerCase().match(/\.(jpg|jpeg|png|webp)($|\?)/));
    const isTiffFile = Boolean(href.toLowerCase().match(/\.(tif|tiff)($|\?)/) || type.includes('tiff') || type.includes('geotiff'));
    const isBrokenTopLevelDtepd = href.includes('/DTEPD_') && (href.endsWith('.jpg') || href.endsWith('.tif'));

    return {
      key,
      href,
      title,
      type,
      roles,
      isImageFile,
      isTiffFile,
      isBrokenTopLevelDtepd
    };
  });

  // Priority 1: Orthophoto Thumbnail JPEG asset (known 200 OK live images in USGS S3)
  const orthoThumb = assetEntries.find(a =>
    !a.isBrokenTopLevelDtepd &&
    a.isImageFile &&
    (a.key.toLowerCase().includes('ortho_thumbnail') || a.key.toLowerCase().includes('ortho_browse') || a.title.includes('ortho') || a.title.includes('browse'))
  );
  if (orthoThumb) {
    return {
      imageUrl: `/api/stac/image?url=${encodeURIComponent(orthoThumb.href)}`,
      originalAssetUrl: orthoThumb.href,
      assetKey: orthoThumb.key,
      assetTypeLabel: 'Orthophoto Thumbnail',
      observationId: obsId,
      attribution,
      isGeoTiff: false
    };
  }

  // Priority 2: Any other valid non-DTEPD JPEG asset
  const validJpeg = assetEntries.find(a => !a.isBrokenTopLevelDtepd && a.isImageFile);
  if (validJpeg) {
    return {
      imageUrl: `/api/stac/image?url=${encodeURIComponent(validJpeg.href)}`,
      originalAssetUrl: validJpeg.href,
      assetKey: validJpeg.key,
      assetTypeLabel: 'Browse Image',
      observationId: obsId,
      attribution,
      isGeoTiff: false
    };
  }

  // Priority 3: Orthophoto GeoTIFF asset (rendered server-side)
  const orthoTiff = assetEntries.find(a => !a.isBrokenTopLevelDtepd && a.isTiffFile && a.key.toLowerCase().includes('ortho'));
  if (orthoTiff) {
    return {
      imageUrl: `/api/stac/image?url=${encodeURIComponent(orthoTiff.href)}`,
      originalAssetUrl: orthoTiff.href,
      assetKey: orthoTiff.key,
      assetTypeLabel: 'Orthophoto (GeoTIFF)',
      observationId: obsId,
      attribution,
      isGeoTiff: true
    };
  }

  // Priority 4: HiRISE PDS Extras direct browse image URL
  const pdsBrowseUrl = getHiRisePdsBrowseUrl(obsId);
  if (pdsBrowseUrl) {
    return {
      imageUrl: `/api/stac/image?url=${encodeURIComponent(pdsBrowseUrl)}`,
      originalAssetUrl: pdsBrowseUrl,
      assetKey: 'pds_extras',
      assetTypeLabel: 'HiRISE PDS Browse',
      observationId: obsId,
      attribution,
      isGeoTiff: false
    };
  }

  // Priority 5: DTM GeoTIFF raster asset (if not broken)
  const dtmTiff = assetEntries.find(a => !a.isBrokenTopLevelDtepd && a.isTiffFile);
  if (dtmTiff) {
    return {
      imageUrl: `/api/stac/image?url=${encodeURIComponent(dtmTiff.href)}`,
      originalAssetUrl: dtmTiff.href,
      assetKey: dtmTiff.key,
      assetTypeLabel: 'DTM Elevation Raster',
      observationId: obsId,
      attribution,
      isGeoTiff: true
    };
  }

  // Fallback: Preview unavailable
  return {
    imageUrl: '',
    originalAssetUrl: '',
    assetKey: 'none',
    assetTypeLabel: 'Preview unavailable',
    observationId: obsId,
    attribution,
    isGeoTiff: false
  };
}
