import exifr from 'exifr';

export interface ExtractedExifMetadata {
  exifStatus: 'present' | 'none_present' | 'remote_url_uninspected' | 'unreadable';
  detectedFormat: string;
  fileSizeBytes: number | null;
  make: string | null;
  model: string | null;
  software: string | null;
  dateTimeOriginal: string | null;
  exposureTime: string | null;
  fNumber: number | null;
  iso: number | null;
  focalLengthMm: number | null;
  colorSpace: string | null;
  orientation: number | string | null;
  embeddedWidth: number | null;
  embeddedHeight: number | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsCaveat: string | null;
  rawTagCount: number;
  summary: string;
}

export function detectFormatFromBytes(bytes: Uint8Array, fallbackName = ''): string {
  if (bytes.length >= 4) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'JPEG';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'PNG';
    if ((bytes[0] === 0x49 && bytes[1] === 0x49) || (bytes[0] === 0x4d && bytes[1] === 0x4d)) return 'TIFF';
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return 'WEBP';
    }
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'GIF';
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) return 'BMP';
  }
  const lower = fallbackName.toLowerCase();
  if (lower.endsWith('.png')) return 'PNG';
  if (lower.endsWith('.webp')) return 'WEBP';
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'TIFF';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'JPEG';
  return 'UNKNOWN';
}

export async function computeDeterministicBytesHash(bytes: Uint8Array): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
      return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32);
    }
  } catch {
    // fallback below
  }
  // Deterministic 64-bit FNV-1a pair fallback
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const step = Math.max(1, Math.floor(bytes.length / 8192));
  for (let i = 0; i < bytes.length; i += step) {
    h1 ^= bytes[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= bytes[bytes.length - 1 - i];
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}_${bytes.length}`;
}

function formatExposureTime(val: any): string | null {
  if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) return null;
  if (val >= 1) return `${val.toFixed(2)}s`;
  return `1/${Math.round(1 / val)}s`;
}

export async function extractImageMetadataAndHash(
  fileOrBlob: File | Blob | null,
  fileName = ''
): Promise<{ exif: ExtractedExifMetadata; contentHash: string | null }> {
  if (!fileOrBlob) {
    return {
      contentHash: null,
      exif: {
        exifStatus: 'remote_url_uninspected',
        detectedFormat: detectFormatFromBytes(new Uint8Array(0), fileName),
        fileSizeBytes: null,
        make: null,
        model: null,
        software: null,
        dateTimeOriginal: null,
        exposureTime: null,
        fNumber: null,
        iso: null,
        focalLengthMm: null,
        colorSpace: null,
        orientation: null,
        embeddedWidth: null,
        embeddedHeight: null,
        gpsLatitude: null,
        gpsLongitude: null,
        gpsCaveat: null,
        rawTagCount: 0,
        summary: 'Remote URL asset — file binary EXIF headers not directly attached.'
      }
    };
  }

  try {
    const buffer = await fileOrBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const detectedFormat = detectFormatFromBytes(bytes, fileName);
    const contentHash = await computeDeterministicBytesHash(bytes);

    let parsed: Record<string, any> | null = null;
    try {
      parsed = (await exifr.parse(buffer, {
        tiff: true,
        exif: true,
        gps: true,
        xmp: true,
        icc: false
      })) as Record<string, any> | null;
    } catch {
      parsed = null;
    }

    const keys = parsed ? Object.keys(parsed).filter(k => parsed![k] !== undefined && parsed![k] !== null) : [];
    if (!parsed || keys.length === 0) {
      return {
        contentHash,
        exif: {
          exifStatus: 'none_present',
          detectedFormat,
          fileSizeBytes: bytes.byteLength,
          make: null,
          model: null,
          software: null,
          dateTimeOriginal: null,
          exposureTime: null,
          fNumber: null,
          iso: null,
          focalLengthMm: null,
          colorSpace: null,
          orientation: null,
          embeddedWidth: null,
          embeddedHeight: null,
          gpsLatitude: null,
          gpsLongitude: null,
          gpsCaveat: null,
          rawTagCount: 0,
          summary: `No embedded EXIF/XMP metadata present in ${detectedFormat} file (${bytes.byteLength.toLocaleString()} bytes).`
        }
      };
    }

    const dt = parsed.DateTimeOriginal || parsed.CreateDate || parsed.ModifyDate || null;
    const dateTimeOriginal =
      dt instanceof Date && !Number.isNaN(dt.getTime())
        ? dt.toISOString()
        : typeof dt === 'string'
          ? dt
          : null;

    const gpsLat = typeof parsed.latitude === 'number' && Number.isFinite(parsed.latitude) ? parsed.latitude : null;
    const gpsLon = typeof parsed.longitude === 'number' && Number.isFinite(parsed.longitude) ? parsed.longitude : null;

    const make = parsed.Make ? String(parsed.Make).trim() : null;
    const model = parsed.Model ? String(parsed.Model).trim() : null;
    const software = parsed.Software ? String(parsed.Software).trim() : null;
    const summaryParts = [
      make || model ? `Camera: ${[make, model].filter(Boolean).join(' ')}` : null,
      dateTimeOriginal ? `Captured: ${dateTimeOriginal}` : null,
      parsed.ISO ? `ISO ${parsed.ISO}` : null,
      parsed.FocalLength ? `${parsed.FocalLength}mm` : null,
      `${keys.length} EXIF/XMP tags`
    ].filter(Boolean);

    return {
      contentHash,
      exif: {
        exifStatus: 'present',
        detectedFormat,
        fileSizeBytes: bytes.byteLength,
        make,
        model,
        software,
        dateTimeOriginal,
        exposureTime: formatExposureTime(parsed.ExposureTime),
        fNumber: typeof parsed.FNumber === 'number' ? Number(parsed.FNumber.toFixed(1)) : null,
        iso: typeof parsed.ISO === 'number' ? parsed.ISO : null,
        focalLengthMm: typeof parsed.FocalLength === 'number' ? Number(parsed.FocalLength.toFixed(1)) : null,
        colorSpace: parsed.ColorSpace ? String(parsed.ColorSpace) : null,
        orientation: parsed.Orientation ?? null,
        embeddedWidth: typeof parsed.ExifImageWidth === 'number' ? parsed.ExifImageWidth : null,
        embeddedHeight: typeof parsed.ExifImageHeight === 'number' ? parsed.ExifImageHeight : null,
        gpsLatitude: gpsLat,
        gpsLongitude: gpsLon,
        gpsCaveat:
          gpsLat !== null && gpsLon !== null
            ? 'Embedded EXIF GPS tags use Earth WGS84 coordinates and are NOT automatically mapped to Mars SIM 3292.'
            : null,
        rawTagCount: keys.length,
        summary: summaryParts.join(' · ')
      }
    };
  } catch {
    return {
      contentHash: null,
      exif: {
        exifStatus: 'unreadable',
        detectedFormat: detectFormatFromBytes(new Uint8Array(0), fileName),
        fileSizeBytes: fileOrBlob.size || null,
        make: null,
        model: null,
        software: null,
        dateTimeOriginal: null,
        exposureTime: null,
        fNumber: null,
        iso: null,
        focalLengthMm: null,
        colorSpace: null,
        orientation: null,
        embeddedWidth: null,
        embeddedHeight: null,
        gpsLatitude: null,
        gpsLongitude: null,
        gpsCaveat: null,
        rawTagCount: 0,
        summary: 'Binary EXIF header inspection failed; continuing with pixel buffer analysis.'
      }
    };
  }
}
