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

    return {
      key,
      href,
      title,
      type,
      roles,
      isImageFile,
      isTiffFile
    };
  });

  // Priority 1: Thumbnail asset (web image format or GeoTIFF)
  const thumbAsset = assetEntries.find(a => a.key === 'thumbnail' || a.roles.includes('thumbnail'));
  if (thumbAsset) {
    if (thumbAsset.isImageFile) {
      return {
        imageUrl: `/api/nasa/proxy-image?url=${encodeURIComponent(thumbAsset.href)}`,
        originalAssetUrl: thumbAsset.href,
        assetKey: thumbAsset.key,
        assetTypeLabel: 'Thumbnail',
        observationId: obsId,
        attribution,
        isGeoTiff: false
      };
    }
  }

  // Priority 2: Browse asset (web image format or GeoTIFF)
  const browseAsset = assetEntries.find(a => a.key === 'browse' || a.roles.includes('browse') || a.title.includes('browse'));
  if (browseAsset) {
    if (browseAsset.isImageFile) {
      return {
        imageUrl: `/api/nasa/proxy-image?url=${encodeURIComponent(browseAsset.href)}`,
        originalAssetUrl: browseAsset.href,
        assetKey: browseAsset.key,
        assetTypeLabel: 'Browse Image',
        observationId: obsId,
        attribution,
        isGeoTiff: false
      };
    }
  }

  // Priority 3: Orthoimage asset
  const orthoAsset = assetEntries.find(a => a.key === 'orthoimage' || a.key === 'ortho' || a.title.includes('ortho'));
  if (orthoAsset) {
    if (orthoAsset.isImageFile) {
      return {
        imageUrl: `/api/nasa/proxy-image?url=${encodeURIComponent(orthoAsset.href)}`,
        originalAssetUrl: orthoAsset.href,
        assetKey: orthoAsset.key,
        assetTypeLabel: 'Orthophoto',
        observationId: obsId,
        attribution,
        isGeoTiff: false
      };
    } else if (orthoAsset.isTiffFile) {
      return {
        imageUrl: `/api/stac/render-geotiff?url=${encodeURIComponent(orthoAsset.href)}`,
        originalAssetUrl: orthoAsset.href,
        assetKey: orthoAsset.key,
        assetTypeLabel: 'Orthophoto (GeoTIFF)',
        observationId: obsId,
        attribution,
        isGeoTiff: true
      };
    }
  }

  // Priority 4: Hillshade asset
  const hillshadeAsset = assetEntries.find(a => a.key === 'hillshade' || a.title.includes('hillshade'));
  if (hillshadeAsset) {
    if (hillshadeAsset.isImageFile) {
      return {
        imageUrl: `/api/nasa/proxy-image?url=${encodeURIComponent(hillshadeAsset.href)}`,
        originalAssetUrl: hillshadeAsset.href,
        assetKey: hillshadeAsset.key,
        assetTypeLabel: 'Shaded Relief',
        observationId: obsId,
        attribution,
        isGeoTiff: false
      };
    } else if (hillshadeAsset.isTiffFile) {
      return {
        imageUrl: `/api/stac/render-geotiff?url=${encodeURIComponent(hillshadeAsset.href)}`,
        originalAssetUrl: hillshadeAsset.href,
        assetKey: hillshadeAsset.key,
        assetTypeLabel: 'Shaded Relief (GeoTIFF)',
        observationId: obsId,
        attribution,
        isGeoTiff: true
      };
    }
  }

  // Priority 5: HiRISE PDS Extras direct browse URL (if valid observation ID)
  const pdsBrowseUrl = getHiRisePdsBrowseUrl(obsId);
  if (pdsBrowseUrl) {
    return {
      imageUrl: `/api/nasa/proxy-image?url=${encodeURIComponent(pdsBrowseUrl)}`,
      originalAssetUrl: pdsBrowseUrl,
      assetKey: 'pds_extras',
      assetTypeLabel: 'HiRISE PDS Browse',
      observationId: obsId,
      attribution,
      isGeoTiff: false
    };
  }

  // Priority 6: Any image asset file found
  const anyImageAsset = assetEntries.find(a => a.isImageFile);
  if (anyImageAsset) {
    return {
      imageUrl: `/api/nasa/proxy-image?url=${encodeURIComponent(anyImageAsset.href)}`,
      originalAssetUrl: anyImageAsset.href,
      assetKey: anyImageAsset.key,
      assetTypeLabel: 'Preview',
      observationId: obsId,
      attribution,
      isGeoTiff: false
    };
  }

  // Priority 7: DTM GeoTIFF rendering
  const dtmAsset = assetEntries.find(a => a.key === 'dtm' || a.key === 'DTM' || a.isTiffFile);
  if (dtmAsset) {
    return {
      imageUrl: `/api/stac/render-geotiff?url=${encodeURIComponent(dtmAsset.href)}`,
      originalAssetUrl: dtmAsset.href,
      assetKey: dtmAsset.key,
      assetTypeLabel: 'DTM Elevation Raster',
      observationId: obsId,
      attribution,
      isGeoTiff: true
    };
  }

  // Fallback
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
