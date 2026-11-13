/**
 * Planetary Geospatial Capabilities & Metadata XML Parser
 * Parses live NASA JPL Mars Trek WMTSCapabilities.xml,
 * USGS Astrogeology Planetarymaps WMS 1.3.0 GetCapabilities XML,
 * and USGS FGDC SIM 3292 metadata XML without mocked assumptions.
 */

export interface WmtsTileMatrixSummary {
  identifier: string;
  scaleDenominator: number;
  topLeftCorner: string;
  tileWidth: number;
  tileHeight: number;
  matrixWidth: number;
  matrixHeight: number;
}

export interface ParsedWmtsLayerCapability {
  id: string;
  identifier: string;
  title: string;
  abstract: string;
  styles: string[];
  defaultStyle: string;
  formats: string[];
  defaultFormat: string;
  tileMatrixSet: string;
  tileMatrixSetCrs: string;
  zoomLevels: string[];
  minZoom: number;
  maxZoom: number;
  zoomCount: number;
  tileMatrices: WmtsTileMatrixSummary[];
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  resourceUrlTemplate: string;
  capabilitiesUrl: string;
  retrievedAt: string;
}

export interface ParsedWmsLayerCapability {
  name: string;
  title: string;
  abstract: string;
  crsList: string[];
  bbox: [number, number, number, number] | null; // [minLon, minLat, maxLon, maxLat]
}

export interface ParsedWmsCapabilities {
  serviceTitle: string;
  serviceAbstract: string;
  version: string;
  formats: string[];
  supportedCrs: string[];
  layers: ParsedWmsLayerCapability[];
  layerNames: string[];
  capabilitiesUrl: string;
  retrievedAt: string;
}

export interface ParsedFgdcMetadata {
  title: string;
  originators: string[];
  pubDate: string;
  publisher: string;
  abstract: string;
  purpose: string;
  bounding: {
    west: number | null;
    east: number | null;
    north: number | null;
    south: number | null;
  };
  onlineLinks: string[];
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

function extractFirstTag(xml: string, tagPattern: string): string {
  const re = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagPattern}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tagPattern}>`, 'i');
  const m = xml.match(re);
  return m ? decodeXmlEntities(m[1]) : '';
}

function extractAllTags(xml: string, tagPattern: string): string[] {
  const re = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagPattern}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tagPattern}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function parseAttr(tagFragment: string, attrName: string): string {
  const re = new RegExp(`${attrName}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = tagFragment.match(re);
  return m ? decodeXmlEntities(m[1]) : '';
}

/**
 * Parse live NASA JPL Mars Trek WMTSCapabilities.xml
 */
export function parseWmtsCapabilitiesXml(
  xml: string,
  layerId: string,
  capabilitiesUrl: string
): ParsedWmtsLayerCapability {
  const layerBlocks = extractAllTags(xml, 'Layer');
  const layerXml = layerBlocks[0] || xml;

  const identifier = extractFirstTag(layerXml, 'Identifier') || layerId;
  const title = extractFirstTag(layerXml, 'Title') || identifier;
  const abstract = extractFirstTag(layerXml, 'Abstract') || '';

  // Bounding Box (<ows:WGS84BoundingBox> or <ows:BoundingBox>)
  const wgsBoxXml = extractFirstTag(layerXml, 'WGS84BoundingBox') || extractFirstTag(layerXml, 'BoundingBox');
  const lowerCorner = extractFirstTag(wgsBoxXml, 'LowerCorner').split(/\s+/).map(Number);
  const upperCorner = extractFirstTag(wgsBoxXml, 'UpperCorner').split(/\s+/).map(Number);
  const bbox: [number, number, number, number] =
    lowerCorner.length >= 2 && upperCorner.length >= 2 && lowerCorner.every(Number.isFinite) && upperCorner.every(Number.isFinite)
      ? [lowerCorner[0], lowerCorner[1], upperCorner[0], upperCorner[1]]
      : [-180, -90, 180, 90];

  // Styles
  const styleBlocks = extractAllTags(layerXml, 'Style');
  const styles = styleBlocks
    .map(sb => extractFirstTag(sb, 'Identifier'))
    .filter(Boolean);
  const defaultStyle = styles[0] || 'default';

  // Formats
  const formats = extractAllTags(layerXml, 'Format')
    .map(decodeXmlEntities)
    .filter(Boolean);
  const defaultFormat = formats[0] || 'image/jpeg';

  // TileMatrixSetLink
  const matrixSetLinkXml = extractFirstTag(layerXml, 'TileMatrixSetLink');
  const tileMatrixSet = extractFirstTag(matrixSetLinkXml, 'TileMatrixSet') || 'default028mm';

  // TileMatrixSet definition from <Contents>
  const tmsBlocks = extractAllTags(xml, 'TileMatrixSet');
  let matchedTmsXml = '';
  for (const block of tmsBlocks) {
    const tmsId = extractFirstTag(block, 'Identifier');
    if (tmsId === tileMatrixSet || !matchedTmsXml) {
      matchedTmsXml = block;
      if (tmsId === tileMatrixSet) break;
    }
  }
  const tileMatrixSetCrs = extractFirstTag(matchedTmsXml, 'SupportedCRS') || 'IAU2000:49900';

  const matrixBlocks = extractAllTags(matchedTmsXml, 'TileMatrix');
  const tileMatrices: WmtsTileMatrixSummary[] = matrixBlocks.map(mb => ({
    identifier: extractFirstTag(mb, 'Identifier'),
    scaleDenominator: parseFloat(extractFirstTag(mb, 'ScaleDenominator')) || 0,
    topLeftCorner: extractFirstTag(mb, 'TopLeftCorner'),
    tileWidth: parseInt(extractFirstTag(mb, 'TileWidth'), 10) || 256,
    tileHeight: parseInt(extractFirstTag(mb, 'TileHeight'), 10) || 256,
    matrixWidth: parseInt(extractFirstTag(mb, 'MatrixWidth'), 10) || 1,
    matrixHeight: parseInt(extractFirstTag(mb, 'MatrixHeight'), 10) || 1,
  })).filter(m => m.identifier !== '');

  const zoomLevels = tileMatrices.map(m => m.identifier);
  const numericZooms = zoomLevels.map(z => parseInt(z, 10)).filter(n => !isNaN(n));
  const minZoom = numericZooms.length > 0 ? Math.min(...numericZooms) : 0;
  const maxZoom = numericZooms.length > 0 ? Math.max(...numericZooms) : 0;

  // ResourceURL template
  const resourceTagMatch = layerXml.match(/<[^>]*ResourceURL\b[^>]*>/i);
  const resourceUrlTemplate = resourceTagMatch ? parseAttr(resourceTagMatch[0], 'template') : '';

  return {
    id: layerId,
    identifier,
    title,
    abstract,
    styles: styles.length > 0 ? styles : ['default'],
    defaultStyle,
    formats: formats.length > 0 ? formats : [defaultFormat],
    defaultFormat,
    tileMatrixSet,
    tileMatrixSetCrs,
    zoomLevels,
    minZoom,
    maxZoom,
    zoomCount: tileMatrices.length,
    tileMatrices,
    bbox,
    resourceUrlTemplate,
    capabilitiesUrl,
    retrievedAt: new Date().toISOString()
  };
}

/**
 * Resolve an upstream Mars Trek WMTS tile URL from a parsed ResourceURL template
 */
export function buildWmtsTileUrl(
  cap: ParsedWmtsLayerCapability,
  z: number | string,
  row: number | string,
  col: number | string
): string {
  if (!cap.resourceUrlTemplate) {
    throw new Error(`No ResourceURL template available in WMTS capabilities for ${cap.id}`);
  }
  return cap.resourceUrlTemplate
    .replace(/\{Style\}/gi, encodeURIComponent(cap.defaultStyle || 'default'))
    .replace(/\{TileMatrixSet\}/gi, encodeURIComponent(cap.tileMatrixSet || 'default028mm'))
    .replace(/\{TileMatrix\}/gi, String(z))
    .replace(/\{TileRow\}/gi, String(row))
    .replace(/\{TileCol\}/gi, String(col));
}

/**
 * Parse live USGS Astrogeology WMS 1.3.0 GetCapabilities XML
 */
export function parseWmsCapabilitiesXml(
  xml: string,
  capabilitiesUrl: string
): ParsedWmsCapabilities {
  const versionMatch = xml.match(/WMS_Capabilities[^>]*version=["']([^"']+)["']/i);
  const version = versionMatch ? versionMatch[1] : '1.3.0';

  const serviceBlock = extractFirstTag(xml, 'Service');
  const serviceTitle = extractFirstTag(serviceBlock, 'Title') || 'USGS Astrogeology Mars WMS';
  const serviceAbstract = extractFirstTag(serviceBlock, 'Abstract') || '';

  const getMapBlock = extractFirstTag(xml, 'GetMap');
  const formats = extractAllTags(getMapBlock, 'Format').map(decodeXmlEntities).filter(Boolean);

  const capabilityBlock = extractFirstTag(xml, 'Capability');
  const rootCrs = extractAllTags(capabilityBlock, 'CRS').map(decodeXmlEntities);
  const supportedCrs = Array.from(new Set(rootCrs)).filter(Boolean);

  // Extract individual <Layer ...>...</Layer> nodes that have a <Name>
  // Use a non-nested scan across <Layer> tags from Capability onwards
  const layers: ParsedWmsLayerCapability[] = [];
  const searchSpace = capabilityBlock || xml;

  // Walk tags cleanly to extract innermost or named Layer blocks
  const stack: number[] = [];
  const tokenRe = /<\/?Layer(?:\s[^>]*)?>/gi;
  let tok: RegExpExecArray | null;
  while ((tok = tokenRe.exec(searchSpace)) !== null) {
    if (!tok[0].startsWith('</')) {
      stack.push(tok.index);
    } else if (stack.length > 0) {
      const start = stack.pop()!;
      const block = searchSpace.slice(start, tok.index + tok[0].length);
      // Only check direct child tags (strip nested <Layer>...</Layer> first)
      const innerOnly = block
        .replace(/^<Layer[^>]*>/i, '')
        .replace(/<\/Layer>$/i, '')
        .replace(/<Layer[\s\S]*<\/Layer>/i, '');

      const name = extractFirstTag(innerOnly, 'Name');
      const title = extractFirstTag(innerOnly, 'Title') || name;
      const abstract = extractFirstTag(innerOnly, 'Abstract');
      const crsList = extractAllTags(innerOnly, 'CRS').map(decodeXmlEntities).filter(Boolean);

      let bbox: [number, number, number, number] | null = null;
      const geoBox = extractFirstTag(innerOnly, 'EX_GeographicBoundingBox');
      if (geoBox) {
        const w = parseFloat(extractFirstTag(geoBox, 'westBoundLongitude'));
        const e = parseFloat(extractFirstTag(geoBox, 'eastBoundLongitude'));
        const s = parseFloat(extractFirstTag(geoBox, 'southBoundLatitude'));
        const n = parseFloat(extractFirstTag(geoBox, 'northBoundLatitude'));
        if ([w, s, e, n].every(Number.isFinite)) {
          bbox = [w, s, e, n];
        }
      }

      if (name) {
        layers.push({
          name,
          title,
          abstract,
          crsList: crsList.length > 0 ? crsList : supportedCrs,
          bbox
        });
      }
    }
  }

  // Preserve capabilities document order (reverse inner-first pop back to doc order by deduplicating)
  const uniqueLayers: ParsedWmsLayerCapability[] = [];
  const seen = new Set<string>();
  for (const l of layers.reverse()) {
    if (!seen.has(l.name)) {
      seen.add(l.name);
      uniqueLayers.push(l);
    }
  }

  return {
    serviceTitle,
    serviceAbstract,
    version,
    formats: Array.from(new Set(formats)),
    supportedCrs,
    layers: uniqueLayers,
    layerNames: uniqueLayers.map(l => l.name),
    capabilitiesUrl,
    retrievedAt: new Date().toISOString()
  };
}

/**
 * Parse USGS FGDC Metadata XML (e.g. sim3292_metadata.xml)
 */
export function parseFgdcMetadataXml(xml: string): ParsedFgdcMetadata {
  const citeinfo = extractFirstTag(xml, 'citeinfo');
  const title = extractFirstTag(citeinfo, 'title') || extractFirstTag(xml, 'title');
  const originators = extractAllTags(citeinfo, 'origin').map(decodeXmlEntities).filter(Boolean);
  const pubDate = extractFirstTag(citeinfo, 'pubdate');
  const publisher = extractFirstTag(citeinfo, 'publish');
  const onlineLinks = extractAllTags(citeinfo, 'onlink').map(decodeXmlEntities).filter(Boolean);

  const abstract = extractFirstTag(xml, 'abstract');
  const purpose = extractFirstTag(xml, 'purpose');

  const boundingXml = extractFirstTag(xml, 'bounding');
  const parseNum = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    title,
    originators,
    pubDate,
    publisher,
    abstract,
    purpose,
    bounding: {
      west: parseNum(extractFirstTag(boundingXml, 'westbc')),
      east: parseNum(extractFirstTag(boundingXml, 'eastbc')),
      north: parseNum(extractFirstTag(boundingXml, 'northbc')),
      south: parseNum(extractFirstTag(boundingXml, 'southbc'))
    },
    onlineLinks
  };
}
