/**
 * DETERMINISTIC PIXEL-LEVEL TERRAIN SEGMENTATION ENGINE
 * Replaces fixed grids with genuine SLIC superpixel + adjacency feature-distance merging.
 * Computes reproducible, image-specific pixel measurements per segmented region
 * without hardcoded categories or fabricated % confidences.
 */

export interface SegmentedRegionMeasurement {
  regionId: string;
  areaPx: number;
  analysisAreaPx: number;
  areaPct: number;
  boundingBox: {
    normX: number;
    normY: number;
    normWidth: number;
    normHeight: number;
    pixelX: number;
    pixelY: number;
    pixelWidth: number;
    pixelHeight: number;
  };
  centroid: {
    normX: number;
    normY: number;
    xPct: number;
    yPct: number;
  };
  colorDistribution: {
    meanRgb: [number, number, number];
    stdRgb: [number, number, number];
    redBlueRatio: number;
    redGreenRatio: number;
    dominantTone: string;
  };
  textureAndRoughness: {
    meanLuminance: number;
    luminanceStd: number;
    meanEdgeGradient: number;
    edgeDensityPct: number;
    roughnessIndex: number; // 0..1 measured pixel-gradient + local-std proxy
    localTextureStd: number;
  };
  shapeAndSpatial: {
    perimeterPx: number;
    compactness: number; // 4*pi*A / P^2 (0..1)
    aspectRatio: number;
    spatialZone: string;
  };
  provisionalVisualClass: string;
  isAmbiguous: boolean;
  ambiguityReason: string | null;
  maskColor: string;
  maskRgb: [number, number, number];
  overlayMaskDataUrl?: string;
}

export interface CompletePixelSegmentationResult {
  naturalWidth: number;
  naturalHeight: number;
  analysisWidth: number;
  analysisHeight: number;
  pixelSignatureHash: string;
  globalStats: {
    meanBrightness: number;
    rmsContrast: number;
    edgeDensityPct: number;
    roughnessScore: number; // 0..1
    shadowFraction: number;
    brightFraction: number;
    isLowInformationImage: boolean;
    lowInfoReason: string | null;
  };
  regions: SegmentedRegionMeasurement[];
  labelMap: Int32Array;
  segmentationMaskUrl?: string;
  processingMethod: string;
}

const REGION_PALETTE: Array<{ hex: string; rgb: [number, number, number] }> = [
  { hex: '#22d3ee', rgb: [34, 211, 238] },   // Cyan
  { hex: '#f97316', rgb: [249, 115, 22] },   // Orange
  { hex: '#a855f7', rgb: [168, 85, 247] },   // Purple
  { hex: '#10b981', rgb: [16, 185, 129] },   // Emerald
  { hex: '#f43f5e', rgb: [244, 63, 94] },    // Rose
  { hex: '#eab308', rgb: [234, 179, 8] },    // Amber
  { hex: '#3b82f6', rgb: [59, 130, 246] },   // Blue
  { hex: '#ec4899', rgb: [236, 72, 153] }    // Pink
];

function fnvHashRgba(data: Uint8ClampedArray, w: number, h: number): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  const total = data.length;
  const step = Math.max(4, Math.floor(total / 16000) * 4);
  for (let i = 0; i < total; i += step) {
    h1 ^= data[i];
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= data[total - 1 - i];
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `px_${w}x${h}_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

function describeSpatialZone(cxNorm: number, cyNorm: number): string {
  const v = cyNorm < 0.33 ? 'Upper (Far-field)' : cyNorm < 0.67 ? 'Mid-frame' : 'Lower (Foreground)';
  const h = cxNorm < 0.33 ? 'Left' : cxNorm < 0.67 ? 'Center' : 'Right';
  return `${v} ${h}`;
}

function describeTone(meanRgb: [number, number, number], meanLum: number, rbRatio: number): string {
  if (meanLum < 38) return 'Very dark / deep shadow tone';
  if (meanLum > 220) return 'Near-saturated bright highlight';
  if (rbRatio >= 1.45 && meanRgb[0] > 110) return 'Warm iron-oxide / ochre-rust tone';
  if (rbRatio >= 1.18) return 'Moderately warm tan / dusty regolith tone';
  if (rbRatio <= 1.05 && meanLum < 120) return 'Cool neutral / dark gray-basalt tone';
  return 'Neutral muted gray-buff tone';
}

function rgbaBufferToPngDataUrl(rgba: Uint8ClampedArray, width: number, height: number): string | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    const imgData = new ImageData(new Uint8ClampedArray(rgba), width, height);
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}

/**
 * Downsamples an HTMLImageElement proportionally for segmentation while keeping exact aspect ratio.
 */
export function segmentHtmlImageElement(img: HTMLImageElement, maxSide = 260): CompletePixelSegmentationResult {
  const nw = img.naturalWidth || img.width || 256;
  const nh = img.naturalHeight || img.height || 256;
  const scale = Math.min(1, maxSide / Math.max(1, Math.max(nw, nh)));
  const aw = Math.max(24, Math.round(nw * scale));
  const ah = Math.max(24, Math.round(nh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = aw;
  canvas.height = ah;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable for pixel segmentation.');
  }
  ctx.drawImage(img, 0, 0, aw, ah);
  const { data } = ctx.getImageData(0, 0, aw, ah);
  return segmentRgbaPixels(data, aw, ah, nw, nh);
}

/**
 * Core deterministic SLIC + adjacency feature-distance region merging segmentation.
 * Works identically on browser ImageData buffers and Node RGBA test fixtures.
 */
export function segmentRgbaPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  naturalWidth = width,
  naturalHeight = height
): CompletePixelSegmentationResult {
  const N = width * height;
  const pixelSignatureHash = fnvHashRgba(data, naturalWidth, naturalHeight);

  const rArr = new Float32Array(N);
  const gArr = new Float32Array(N);
  const bArr = new Float32Array(N);
  const lumArr = new Float32Array(N);
  const rgArr = new Float32Array(N);
  const rbArr = new Float32Array(N);
  const gradArr = new Float32Array(N);
  const localStdArr = new Float32Array(N);

  let sumLum = 0;
  let sumLumSq = 0;
  let shadowPx = 0;
  let brightPx = 0;

  for (let i = 0; i < N; i++) {
    const p = i * 4;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    rArr[i] = r;
    gArr[i] = g;
    bArr[i] = b;
    lumArr[i] = lum;
    rgArr[i] = r - g;
    rbArr[i] = r - b;
    sumLum += lum;
    sumLumSq += lum * lum;
    if (lum < 40) shadowPx++;
    if (lum > 225) brightPx++;
  }

  const meanBrightness = sumLum / Math.max(1, N);
  const rmsContrast = Math.sqrt(Math.max(0, sumLumSq / Math.max(1, N) - meanBrightness * meanBrightness));

  let edgePxCount = 0;
  let gradSum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -lumArr[(y - 1) * width + (x - 1)] + lumArr[(y - 1) * width + (x + 1)] +
        -2 * lumArr[y * width + (x - 1)] + 2 * lumArr[y * width + (x + 1)] +
        -lumArr[(y + 1) * width + (x - 1)] + lumArr[(y + 1) * width + (x + 1)];
      const gy =
        -lumArr[(y - 1) * width + (x - 1)] - 2 * lumArr[(y - 1) * width + x] - lumArr[(y - 1) * width + (x + 1)] +
        lumArr[(y + 1) * width + (x - 1)] + 2 * lumArr[(y + 1) * width + x] + lumArr[(y + 1) * width + (x + 1)];
      const g = Math.sqrt(gx * gx + gy * gy) / 4; // normalized Sobel magnitude ~[0..255]
      gradArr[i] = g;
      gradSum += g;
      if (g > 18) edgePxCount++;
    }
  }

  // 5x5 local luminance std as deterministic micro-texture proxy
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - 2);
    const y1 = Math.min(height - 1, y + 2);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - 2);
      const x1 = Math.min(width - 1, x + 2);
      let s = 0;
      let s2 = 0;
      let c = 0;
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          const v = lumArr[yy * width + xx];
          s += v;
          s2 += v * v;
          c++;
        }
      }
      const m = s / c;
      localStdArr[y * width + x] = Math.sqrt(Math.max(0, s2 / c - m * m));
    }
  }

  const edgeDensityPct = Number(((edgePxCount / Math.max(1, N)) * 100).toFixed(1));
  const meanGrad = gradSum / Math.max(1, N);
  const roughnessScore = Number(Math.min(1, Math.max(0, meanGrad / 48 * 0.65 + (edgeDensityPct / 100) * 0.35)).toFixed(3));
  const shadowFraction = Number((shadowPx / Math.max(1, N)).toFixed(3));
  const brightFraction = Number((brightPx / Math.max(1, N)).toFixed(3));

  const isLowInformationImage = rmsContrast < 7.5 || shadowFraction > 0.9 || brightFraction > 0.9;
  const lowInfoReason =
    rmsContrast < 7.5
      ? `Uniform or near-flat pixel field (RMS contrast ${rmsContrast.toFixed(1)}) — insufficient visual contrast for reliable geological classification.`
      : shadowFraction > 0.9
        ? `Severely underexposed frame (${Math.round(shadowFraction * 100)}% dark pixels) — terrain morphology obscured.`
        : brightFraction > 0.9
          ? `Overexposed/clipped highlight frame (${Math.round(brightFraction * 100)}% clipped pixels) — surface features washed out.`
          : null;

  // Step 1: Deterministic SLIC superpixel initialization
  const targetK = isLowInformationImage ? 16 : 120;
  const step = Math.max(6, Math.round(Math.sqrt(N / targetK)));

  interface Seed {
    x: number;
    y: number;
    lum: number;
    rg: number;
    rb: number;
    grad: number;
    tex: number;
  }
  const seeds: Seed[] = [];
  for (let y = Math.floor(step / 2); y < height; y += step) {
    for (let x = Math.floor(step / 2); x < width; x += step) {
      // Shift seed to lowest gradient in 3x3 window
      let bestX = x;
      let bestY = y;
      let bestG = Number.POSITIVE_INFINITY;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const g = gradArr[ny * width + nx];
          if (g < bestG) {
            bestG = g;
            bestX = nx;
            bestY = ny;
          }
        }
      }
      const idx = bestY * width + bestX;
      seeds.push({
        x: bestX,
        y: bestY,
        lum: lumArr[idx],
        rg: rgArr[idx],
        rb: rbArr[idx],
        grad: gradArr[idx],
        tex: localStdArr[idx]
      });
    }
  }

  if (seeds.length === 0) {
    seeds.push({ x: Math.floor(width / 2), y: Math.floor(height / 2), lum: meanBrightness, rg: 0, rb: 0, grad: 0, tex: 0 });
  }

  const spLabels = new Int32Array(N).fill(-1);
  const spDist = new Float32Array(N);
  const K = seeds.length;
  const spatialWeight = 0.28 / Math.max(1, step);

  for (let iter = 0; iter < 5; iter++) {
    spDist.fill(Number.POSITIVE_INFINITY);
    const searchRad = Math.ceil(step * 1.6);

    for (let k = 0; k < K; k++) {
      const s = seeds[k];
      const y0 = Math.max(0, Math.round(s.y) - searchRad);
      const y1 = Math.min(height - 1, Math.round(s.y) + searchRad);
      const x0 = Math.max(0, Math.round(s.x) - searchRad);
      const x1 = Math.min(width - 1, Math.round(s.x) + searchRad);

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const idx = y * width + x;
          const dLum = (lumArr[idx] - s.lum) / 85;
          const dRg = (rgArr[idx] - s.rg) / 65;
          const dRb = (rbArr[idx] - s.rb) / 70;
          const dTex = (localStdArr[idx] - s.tex) / 28;
          const dSpatial = Math.hypot(x - s.x, y - s.y) * spatialWeight;
          const d = dLum * dLum + 0.7 * dRg * dRg + 0.7 * dRb * dRb + 0.4 * dTex * dTex + dSpatial * dSpatial;
          if (d < spDist[idx]) {
            spDist[idx] = d;
            spLabels[idx] = k;
          }
        }
      }
    }

    // Recompute superpixel centroids
    const sumX = new Float64Array(K);
    const sumY = new Float64Array(K);
    const sumL = new Float64Array(K);
    const sumRg = new Float64Array(K);
    const sumRb = new Float64Array(K);
    const sumTex = new Float64Array(K);
    const cnt = new Int32Array(K);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const k = spLabels[idx];
        if (k >= 0) {
          sumX[k] += x;
          sumY[k] += y;
          sumL[k] += lumArr[idx];
          sumRg[k] += rgArr[idx];
          sumRb[k] += rbArr[idx];
          sumTex[k] += localStdArr[idx];
          cnt[k]++;
        }
      }
    }

    for (let k = 0; k < K; k++) {
      if (cnt[k] > 0) {
        seeds[k].x = sumX[k] / cnt[k];
        seeds[k].y = sumY[k] / cnt[k];
        seeds[k].lum = sumL[k] / cnt[k];
        seeds[k].rg = sumRg[k] / cnt[k];
        seeds[k].rb = sumRb[k] / cnt[k];
        seeds[k].tex = sumTex[k] / cnt[k];
      }
    }
  }

  // Fill any unassigned pixel by nearest neighbor propagation
  for (let i = 0; i < N; i++) {
    if (spLabels[i] < 0) spLabels[i] = 0;
  }

  // Step 2: Deterministic Connected-Component Relabeling so no superpixel is spatially disjoint
  const compLabels = new Int32Array(N).fill(-1);
  let numComps = 0;
  const queue = new Int32Array(N);

  for (let i = 0; i < N; i++) {
    if (compLabels[i] !== -1) continue;
    const targetSp = spLabels[i];
    const compId = numComps++;
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    compLabels[i] = compId;

    while (head < tail) {
      const curr = queue[head++];
      const cx = curr % width;
      const cy = (curr - cx) / width;

      if (cx > 0) {
        const n = curr - 1;
        if (compLabels[n] === -1 && spLabels[n] === targetSp) {
          compLabels[n] = compId;
          queue[tail++] = n;
        }
      }
      if (cx < width - 1) {
        const n = curr + 1;
        if (compLabels[n] === -1 && spLabels[n] === targetSp) {
          compLabels[n] = compId;
          queue[tail++] = n;
        }
      }
      if (cy > 0) {
        const n = curr - width;
        if (compLabels[n] === -1 && spLabels[n] === targetSp) {
          compLabels[n] = compId;
          queue[tail++] = n;
        }
      }
      if (cy < height - 1) {
        const n = curr + width;
        if (compLabels[n] === -1 && spLabels[n] === targetSp) {
          compLabels[n] = compId;
          queue[tail++] = n;
        }
      }
    }
  }

  // Step 3: Build Region Graph & Greedy Deterministic Adjacency Merging
  interface ClusterNode {
    id: number;
    parent: number;
    count: number;
    sumR: number;
    sumG: number;
    sumB: number;
    sumLum: number;
    sumRg: number;
    sumRb: number;
    sumGrad: number;
    sumTex: number;
    neighbors: Set<number>;
  }

  const nodes: ClusterNode[] = Array.from({ length: numComps }, (_, id) => ({
    id,
    parent: id,
    count: 0,
    sumR: 0,
    sumG: 0,
    sumB: 0,
    sumLum: 0,
    sumRg: 0,
    sumRb: 0,
    sumGrad: 0,
    sumTex: 0,
    neighbors: new Set<number>()
  }));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const c = compLabels[idx];
      const node = nodes[c];
      node.count++;
      node.sumR += rArr[idx];
      node.sumG += gArr[idx];
      node.sumB += bArr[idx];
      node.sumLum += lumArr[idx];
      node.sumRg += rgArr[idx];
      node.sumRb += rbArr[idx];
      node.sumGrad += gradArr[idx];
      node.sumTex += localStdArr[idx];

      if (x + 1 < width) {
        const rc = compLabels[idx + 1];
        if (rc !== c) {
          node.neighbors.add(rc);
          nodes[rc].neighbors.add(c);
        }
      }
      if (y + 1 < height) {
        const bc = compLabels[idx + width];
        if (bc !== c) {
          node.neighbors.add(bc);
          nodes[bc].neighbors.add(c);
        }
      }
    }
  }

  const findRoot = (id: number): number => {
    let curr = id;
    while (nodes[curr].parent !== curr) {
      nodes[curr].parent = nodes[nodes[curr].parent].parent;
      curr = nodes[curr].parent;
    }
    return curr;
  };

  const clusterDistance = (a: ClusterNode, b: ClusterNode): number => {
    const ca = Math.max(1, a.count);
    const cb = Math.max(1, b.count);
    const dLum = (a.sumLum / ca - b.sumLum / cb) / 38;
    const dRg = (a.sumRg / ca - b.sumRg / cb) / 28;
    const dRb = (a.sumRb / ca - b.sumRb / cb) / 34;
    const dTex = (a.sumTex / ca - b.sumTex / cb) / 14;
    const dGrad = (a.sumGrad / ca - b.sumGrad / cb) / 22;
    return Math.sqrt(dLum * dLum + 0.8 * dRg * dRg + 0.8 * dRb * dRb + 0.55 * dTex * dTex + 0.5 * dGrad * dGrad);
  };

  const mergeRoots = (aId: number, bId: number) => {
    const ra = findRoot(aId);
    const rb = findRoot(bId);
    if (ra === rb) return ra;
    const keep = nodes[ra].count >= nodes[rb].count ? ra : rb;
    const absorb = keep === ra ? rb : ra;
    const kn = nodes[keep];
    const an = nodes[absorb];
    an.parent = keep;
    kn.count += an.count;
    kn.sumR += an.sumR;
    kn.sumG += an.sumG;
    kn.sumB += an.sumB;
    kn.sumLum += an.sumLum;
    kn.sumRg += an.sumRg;
    kn.sumRb += an.sumRb;
    kn.sumGrad += an.sumGrad;
    kn.sumTex += an.sumTex;
    for (const nb of an.neighbors) {
      const nbRoot = findRoot(nb);
      if (nbRoot !== keep) {
        kn.neighbors.add(nbRoot);
        nodes[nbRoot].neighbors.add(keep);
      }
    }
    kn.neighbors.delete(keep);
    kn.neighbors.delete(absorb);
    return keep;
  };

  // First pass: absorb tiny slivers (< 0.8% of image) into closest neighbor
  const minRegionPx = Math.max(12, Math.round(N * 0.008));
  for (let i = 0; i < nodes.length; i++) {
    const root = findRoot(i);
    if (nodes[root].count >= minRegionPx || nodes[root].neighbors.size === 0) continue;
    let bestNb = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const nb of nodes[root].neighbors) {
      const nbRoot = findRoot(nb);
      if (nbRoot === root) continue;
      const d = clusterDistance(nodes[root], nodes[nbRoot]);
      if (d < bestDist) {
        bestDist = d;
        bestNb = nbRoot;
      }
    }
    if (bestNb !== -1) {
      mergeRoots(root, bestNb);
    }
  }

  // Second pass: iterative deterministic feature-similarity merging down to adaptive target region count
  const maxRegions = isLowInformationImage ? 2 : 6;
  const minRegions = isLowInformationImage ? 1 : 3;
  const maxMergeDist = isLowInformationImage ? 3.5 : Math.max(0.75, Math.min(1.65, rmsContrast / 34));

  const getActiveRoots = () => {
    const set = new Set<number>();
    for (let i = 0; i < nodes.length; i++) {
      set.add(findRoot(i));
    }
    return Array.from(set).sort((a, b) => a - b);
  };

  while (true) {
    const active = getActiveRoots();
    if (active.length <= minRegions) break;

    let bestA = -1;
    let bestB = -1;
    let bestD = Number.POSITIVE_INFINITY;

    for (const a of active) {
      for (const nb of nodes[a].neighbors) {
        const b = findRoot(nb);
        if (b <= a) continue;
        const d = clusterDistance(nodes[a], nodes[b]);
        if (d < bestD) {
          bestD = d;
          bestA = a;
          bestB = b;
        }
      }
    }

    if (bestA === -1 || (bestD > maxMergeDist && active.length <= maxRegions)) {
      break;
    }
    mergeRoots(bestA, bestB);
  }

  // Third pass: ensure every final region is >= 2.2% of frame if > 1 region exists
  const minFinalPx = Math.round(N * 0.022);
  while (true) {
    const active = getActiveRoots();
    if (active.length <= 1) break;
    const smallest = active.find(r => nodes[r].count < minFinalPx);
    if (smallest === undefined) break;
    let bestNb = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const nb of nodes[smallest].neighbors) {
      const nbRoot = findRoot(nb);
      if (nbRoot === smallest) continue;
      const d = clusterDistance(nodes[smallest], nodes[nbRoot]);
      if (d < bestDist) {
        bestDist = d;
        bestNb = nbRoot;
      }
    }
    if (bestNb === -1) break;
    mergeRoots(smallest, bestNb);
  }

  // Assign contiguous ordered region indices [0..R-1] sorted by area descending (largest primary region -> REG-01)
  const finalRoots = getActiveRoots().sort((a, b) => nodes[b].count - nodes[a].count);
  const rootToIndex = new Map<number, number>();
  finalRoots.forEach((r, idx) => rootToIndex.set(r, idx));

  const labelMap = new Int32Array(N);
  const R = finalRoots.length;

  interface RegionAccumulator {
    count: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    sumX: number;
    sumY: number;
    sumR: number;
    sumG: number;
    sumB: number;
    sumR2: number;
    sumG2: number;
    sumB2: number;
    sumLum: number;
    sumLum2: number;
    sumGrad: number;
    sumTex: number;
    edgeCount: number;
    perimeterPx: number;
  }

  const acc: RegionAccumulator[] = Array.from({ length: R }, () => ({
    count: 0,
    minX: width,
    minY: height,
    maxX: 0,
    maxY: 0,
    sumX: 0,
    sumY: 0,
    sumR: 0,
    sumG: 0,
    sumB: 0,
    sumR2: 0,
    sumG2: 0,
    sumB2: 0,
    sumLum: 0,
    sumLum2: 0,
    sumGrad: 0,
    sumTex: 0,
    edgeCount: 0,
    perimeterPx: 0
  }));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const regIdx = rootToIndex.get(findRoot(compLabels[idx])) ?? 0;
      labelMap[idx] = regIdx;
      const a = acc[regIdx];
      const r = rArr[idx];
      const g = gArr[idx];
      const b = bArr[idx];
      const lum = lumArr[idx];
      const grad = gradArr[idx];

      a.count++;
      if (x < a.minX) a.minX = x;
      if (x > a.maxX) a.maxX = x;
      if (y < a.minY) a.minY = y;
      if (y > a.maxY) a.maxY = y;
      a.sumX += x;
      a.sumY += y;
      a.sumR += r;
      a.sumG += g;
      a.sumB += b;
      a.sumR2 += r * r;
      a.sumG2 += g * g;
      a.sumB2 += b * b;
      a.sumLum += lum;
      a.sumLum2 += lum * lum;
      a.sumGrad += grad;
      a.sumTex += localStdArr[idx];
      if (grad > 18) a.edgeCount++;
    }
  }

  // Compute true perimeter pixels (4-neighborhood boundary)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const regIdx = labelMap[idx];
      const isBoundary =
        x === 0 ||
        x === width - 1 ||
        y === 0 ||
        y === height - 1 ||
        labelMap[idx - 1] !== regIdx ||
        labelMap[idx + 1] !== regIdx ||
        labelMap[idx - width] !== regIdx ||
        labelMap[idx + width] !== regIdx;
      if (isBoundary) {
        acc[regIdx].perimeterPx++;
      }
    }
  }

  // Render full multi-region segmentation overlay mask (interior tint + crisp boundary)
  const fullOverlayRgba = new Uint8ClampedArray(N * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const regIdx = labelMap[idx];
      const pal = REGION_PALETTE[regIdx % REGION_PALETTE.length];
      const isBoundary =
        (x > 0 && labelMap[idx - 1] !== regIdx) ||
        (x < width - 1 && labelMap[idx + 1] !== regIdx) ||
        (y > 0 && labelMap[idx - width] !== regIdx) ||
        (y < height - 1 && labelMap[idx + width] !== regIdx);

      const p = idx * 4;
      fullOverlayRgba[p] = pal.rgb[0];
      fullOverlayRgba[p + 1] = pal.rgb[1];
      fullOverlayRgba[p + 2] = pal.rgb[2];
      fullOverlayRgba[p + 3] = isBoundary ? 235 : 88;
    }
  }
  const segmentationMaskUrl = rgbaBufferToPngDataUrl(fullOverlayRgba, width, height);

  const scaleAreaFactor = (naturalWidth * naturalHeight) / Math.max(1, N);
  const scaleLenFactor = naturalWidth / Math.max(1, width);

  const regions: SegmentedRegionMeasurement[] = acc.map((a, regIdx) => {
    const cnt = Math.max(1, a.count);
    const meanR = Math.round(a.sumR / cnt);
    const meanG = Math.round(a.sumG / cnt);
    const meanB = Math.round(a.sumB / cnt);
    const stdR = Math.round(Math.sqrt(Math.max(0, a.sumR2 / cnt - meanR * meanR)));
    const stdG = Math.round(Math.sqrt(Math.max(0, a.sumG2 / cnt - meanG * meanG)));
    const stdB = Math.round(Math.sqrt(Math.max(0, a.sumB2 / cnt - meanB * meanB)));

    const meanLum = Number((a.sumLum / cnt).toFixed(1));
    const lumStd = Number(Math.sqrt(Math.max(0, a.sumLum2 / cnt - meanLum * meanLum)).toFixed(1));
    const meanGrad = Number((a.sumGrad / cnt).toFixed(1));
    const localTexStd = Number((a.sumTex / cnt).toFixed(1));
    const regEdgeDensity = Number(((a.edgeCount / cnt) * 100).toFixed(1));
    const regRoughness = Number(Math.min(1, Math.max(0, meanGrad / 48 * 0.65 + (regEdgeDensity / 100) * 0.35)).toFixed(3));

    const redBlueRatio = Number((meanR / Math.max(1, meanB)).toFixed(2));
    const redGreenRatio = Number((meanR / Math.max(1, meanG)).toFixed(2));
    const dominantTone = describeTone([meanR, meanG, meanB], meanLum, redBlueRatio);

    const normX = Number((a.minX / width).toFixed(4));
    const normY = Number((a.minY / height).toFixed(4));
    const normWidth = Number(Math.max(0.01, (a.maxX - a.minX + 1) / width).toFixed(4));
    const normHeight = Number(Math.max(0.01, (a.maxY - a.minY + 1) / height).toFixed(4));

    const cxNorm = Number(((a.sumX / cnt) / width).toFixed(4));
    const cyNorm = Number(((a.sumY / cnt) / height).toFixed(4));

    const naturalAreaPx = Math.round(cnt * scaleAreaFactor);
    const areaPct = Number(((cnt / N) * 100).toFixed(1));
    const naturalPerimeterPx = Math.round(a.perimeterPx * scaleLenFactor);
    const compactness = Number(Math.min(1, (4 * Math.PI * cnt) / Math.max(1, a.perimeterPx * a.perimeterPx)).toFixed(3));
    const aspectRatio = Number(((a.maxX - a.minX + 1) / Math.max(1, a.maxY - a.minY + 1)).toFixed(2));

    // Honest deterministic visual morphology class (with explicit UNCLASSIFIED / UNKNOWN guardrails)
    let provisionalVisualClass = 'Regolith Matrix / Mixed Fines';
    let isAmbiguous = false;
    let ambiguityReason: string | null = null;

    if (isLowInformationImage || (lumStd < 1.2 && meanGrad < 1.2 && R === 1)) {
      provisionalVisualClass = 'UNCLASSIFIED';
      isAmbiguous = true;
      ambiguityReason =
        lowInfoReason ||
        `Low local contrast (lum std ${lumStd}, edge gradient ${meanGrad}) prevents reliable morphological separation.`;
    } else if (meanLum < 36 && lumStd < 18) {
      provisionalVisualClass = 'UNKNOWN';
      isAmbiguous = true;
      ambiguityReason = `Deep shadow / low-albedo occlusion (mean luminance ${meanLum}/255); surface clast structure obscured.`;
    } else if (meanLum > 228 && lumStd < 14) {
      provisionalVisualClass = 'UNKNOWN';
      isAmbiguous = true;
      ambiguityReason = `Near-saturated bright pixels (mean luminance ${meanLum}/255); texture clipped.`;
    } else if (regEdgeDensity >= 22 || (meanGrad >= 19 && lumStd >= 24)) {
      provisionalVisualClass =
        meanLum < meanBrightness - 0.35 * rmsContrast
          ? 'Fractured Rock / High-Relief Clasts'
          : 'Rocky Outcrop / Angular Clast Field';
    } else if (redBlueRatio >= 1.32 && regEdgeDensity < 16 && localTexStd < 18) {
      provisionalVisualClass = 'Warm Fine-Grained Aeolian Drift / Sand';
    } else if (meanLum >= meanBrightness + 0.3 * rmsContrast && regEdgeDensity < 18 && redBlueRatio < 1.32) {
      provisionalVisualClass = 'Light-Toned Coherent Outcrop / Slab';
    } else if (lumStd < 4.5 && meanGrad < 4) {
      provisionalVisualClass = 'UNCLASSIFIED';
      isAmbiguous = true;
      ambiguityReason = `Near-featureless region (lum σ=${lumStd}, edge gradient ${meanGrad}) lacks diagnostic surface texture.`;
    }

    // Build isolated highlight mask for this specific region
    const pal = REGION_PALETTE[regIdx % REGION_PALETTE.length];
    const singleRgba = new Uint8ClampedArray(N * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (labelMap[idx] !== regIdx) continue;
        const isEdge =
          x === 0 ||
          x === width - 1 ||
          y === 0 ||
          y === height - 1 ||
          labelMap[idx - 1] !== regIdx ||
          labelMap[idx + 1] !== regIdx ||
          labelMap[idx - width] !== regIdx ||
          labelMap[idx + width] !== regIdx;
        const p = idx * 4;
        singleRgba[p] = pal.rgb[0];
        singleRgba[p + 1] = pal.rgb[1];
        singleRgba[p + 2] = pal.rgb[2];
        singleRgba[p + 3] = isEdge ? 255 : 108;
      }
    }
    const overlayMaskDataUrl = rgbaBufferToPngDataUrl(singleRgba, width, height);

    const regionId = `REG-${String(regIdx + 1).padStart(2, '0')}`;

    return {
      regionId,
      areaPx: naturalAreaPx,
      analysisAreaPx: cnt,
      areaPct,
      boundingBox: {
        normX,
        normY,
        normWidth,
        normHeight,
        pixelX: Math.round(normX * naturalWidth),
        pixelY: Math.round(normY * naturalHeight),
        pixelWidth: Math.max(1, Math.round(normWidth * naturalWidth)),
        pixelHeight: Math.max(1, Math.round(normHeight * naturalHeight))
      },
      centroid: {
        normX: cxNorm,
        normY: cyNorm,
        xPct: Number((cxNorm * 100).toFixed(1)),
        yPct: Number((cyNorm * 100).toFixed(1))
      },
      colorDistribution: {
        meanRgb: [meanR, meanG, meanB],
        stdRgb: [stdR, stdG, stdB],
        redBlueRatio,
        redGreenRatio,
        dominantTone
      },
      textureAndRoughness: {
        meanLuminance: meanLum,
        luminanceStd: lumStd,
        meanEdgeGradient: meanGrad,
        edgeDensityPct: regEdgeDensity,
        roughnessIndex: regRoughness,
        localTextureStd: localTexStd
      },
      shapeAndSpatial: {
        perimeterPx: naturalPerimeterPx,
        compactness,
        aspectRatio,
        spatialZone: describeSpatialZone(cxNorm, cyNorm)
      },
      provisionalVisualClass,
      isAmbiguous,
      ambiguityReason,
      maskColor: pal.hex,
      maskRgb: pal.rgb,
      overlayMaskDataUrl
    };
  });

  return {
    naturalWidth,
    naturalHeight,
    analysisWidth: width,
    analysisHeight: height,
    pixelSignatureHash,
    globalStats: {
      meanBrightness: Number(meanBrightness.toFixed(1)),
      rmsContrast: Number(rmsContrast.toFixed(1)),
      edgeDensityPct,
      roughnessScore,
      shadowFraction,
      brightFraction,
      isLowInformationImage,
      lowInfoReason
    },
    regions,
    labelMap,
    segmentationMaskUrl,
    processingMethod: 'Deterministic SLIC Superpixel + Adjacency Feature-Distance Region Merging (CV)'
  };
}
