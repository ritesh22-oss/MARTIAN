import * as THREE from 'three';

/**
 * Procedurally generates realistic photorealistic Mars planetary surface maps
 * Includes albedo texture with volcanic regions, crater basins, and polar caps,
 * plus matching bump/elevation maps.
 */
export function createMarsPlanetaryTextures() {
  const width = 2048;
  const height = 1024;

  // 1. Albedo Map
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const ctx = albedoCanvas.getContext('2d');

  // Base Martian rust red & iron-oxide gradient
  const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0, '#601f11');
  baseGrad.addColorStop(0.2, '#96331a');
  baseGrad.addColorStop(0.5, '#b84423');
  baseGrad.addColorStop(0.8, '#8e2d16');
  baseGrad.addColorStop(1, '#521a0d');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Large-scale geological formations (Syrtis Major, Terra Sabaea, Valles Marineris dark swaths)
  const darkRegions = [
    { x: 0.35, y: 0.48, rx: 280, ry: 160, color: 'rgba(40, 14, 8, 0.78)' }, // Syrtis Major
    { x: 0.70, y: 0.52, rx: 340, ry: 110, color: 'rgba(32, 12, 7, 0.82)' }, // Acidalia Planitia
    { x: 0.48, y: 0.62, rx: 420, ry: 90, color: 'rgba(36, 13, 8, 0.72)' },  // Valles Marineris belt
    { x: 0.20, y: 0.55, rx: 250, ry: 130, color: 'rgba(44, 16, 10, 0.68)' }, // Mare Tyrrhenum
    { x: 0.85, y: 0.42, rx: 300, ry: 140, color: 'rgba(38, 13, 8, 0.72)' },
  ];

  darkRegions.forEach(region => {
    const rx = region.x * width;
    const ry = region.y * height;
    const grad = ctx.createRadialGradient(rx, ry, 10, rx, ry, region.rx);
    grad.addColorStop(0, region.color);
    grad.addColorStop(0.6, region.color.replace('0.7', '0.35').replace('0.8', '0.35'));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(rx, ry, region.rx, region.ry, Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();
  });

  // Hundreds of craters & topographic micro-features
  for (let i = 0; i < 700; i++) {
    const cx = Math.random() * width;
    const cy = Math.random() * (height - 180) + 90;
    const cr = Math.random() * 45 + 3;

    // Rim highlight (sun-facing rim)
    ctx.strokeStyle = 'rgba(235, 145, 110, 0.28)';
    ctx.lineWidth = Math.max(1, cr * 0.14);
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.stroke();

    // Crater shadow pit
    const pitGrad = ctx.createRadialGradient(cx - cr * 0.2, cy - cr * 0.2, 1, cx, cy, cr);
    pitGrad.addColorStop(0, 'rgba(20, 6, 4, 0.65)');
    pitGrad.addColorStop(0.7, 'rgba(50, 16, 10, 0.35)');
    pitGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = pitGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Northern & Southern polar ice caps (Planum Boreum & Planum Australe)
  const northCap = ctx.createLinearGradient(0, 0, 0, 95);
  northCap.addColorStop(0, 'rgba(245, 248, 255, 0.96)');
  northCap.addColorStop(0.5, 'rgba(215, 222, 238, 0.72)');
  northCap.addColorStop(0.85, 'rgba(175, 155, 155, 0.32)');
  northCap.addColorStop(1, 'transparent');
  ctx.fillStyle = northCap;
  ctx.fillRect(0, 0, width, 95);

  const southCap = ctx.createLinearGradient(0, height - 75, 0, height);
  southCap.addColorStop(0, 'transparent');
  southCap.addColorStop(0.2, 'rgba(175, 155, 155, 0.32)');
  southCap.addColorStop(0.6, 'rgba(215, 222, 238, 0.68)');
  southCap.addColorStop(1, 'rgba(245, 248, 255, 0.96)');
  ctx.fillStyle = southCap;
  ctx.fillRect(0, height - 75, width, 75);

  const albedoTexture = new THREE.CanvasTexture(albedoCanvas);
  albedoTexture.colorSpace = THREE.SRGBColorSpace;
  albedoTexture.wrapS = THREE.RepeatWrapping;
  albedoTexture.wrapT = THREE.ClampToEdgeWrapping;

  // 2. Bump / Displacement Map
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 1024;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d');

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 1024, 512);

  for (let i = 0; i < 450; i++) {
    const bx = Math.random() * 1024;
    const by = Math.random() * 512;
    const br = Math.random() * 32 + 4;

    const bGrad = bCtx.createRadialGradient(bx, by, 1, bx, by, br);
    bGrad.addColorStop(0, '#1c1c1c');
    bGrad.addColorStop(0.65, '#505050');
    bGrad.addColorStop(0.85, '#ffffff');
    bGrad.addColorStop(1, '#808080');
    bCtx.fillStyle = bGrad;
    bCtx.beginPath();
    bCtx.arc(bx, by, br, 0, Math.PI * 2);
    bCtx.fill();
  }

  const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
  bumpTexture.wrapS = THREE.RepeatWrapping;
  bumpTexture.wrapT = THREE.ClampToEdgeWrapping;

  return { albedoTexture, bumpTexture };
}

/**
 * Creates high-fidelity, photorealistic Martian ground PBR texture set
 * (Albedo, Normal map, and Roughness map) with natural regolith, gravel, and ripples.
 */
export function createMartianGroundPBRTextures() {
  const size = 1024;

  // 1. ALBEDO CANVAS
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const ctx = albedoCanvas.getContext('2d');

  // Rich iron-oxide bedrock and dust foundation
  const baseGrad = ctx.createRadialGradient(size / 2, size / 2, 80, size / 2, size / 2, size * 0.7);
  baseGrad.addColorStop(0, '#a43d22');
  baseGrad.addColorStop(0.4, '#8e321b');
  baseGrad.addColorStop(0.8, '#742714');
  baseGrad.addColorStop(1, '#5c1e0e');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Micro-granularity & mineral speckling (fine regolith dust & dark basaltic sand)
  for (let i = 0; i < 28000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const s = Math.random() * 2.2 + 0.6;
    const rnd = Math.random();
    let col;
    if (rnd < 0.4) {
      col = 'rgba(38, 12, 6, 0.45)'; // dark basalt sand
    } else if (rnd < 0.75) {
      col = 'rgba(210, 105, 68, 0.35)'; // oxidized bright dust
    } else {
      col = 'rgba(145, 52, 28, 0.4)'; // medium iron silt
    }
    ctx.fillStyle = col;
    ctx.fillRect(x, y, s, s);
  }

  // Aeolian wind ripple striations (Mars wind drift)
  for (let y = 0; y < size; y += 14) {
    ctx.strokeStyle = 'rgba(50, 15, 8, 0.28)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 32) {
      const rippleWave = Math.sin(x * 0.04) * 4.5 + Math.cos(x * 0.015) * 2;
      ctx.lineTo(x, y + rippleWave);
    }
    ctx.stroke();
  }

  // Weathered pebbles & stone clusters
  for (let i = 0; i < 450; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    const rw = Math.random() * 8 + 2;
    const rh = Math.random() * 6 + 2;

    // Contact drop shadow
    ctx.fillStyle = 'rgba(20, 5, 2, 0.65)';
    ctx.beginPath();
    ctx.ellipse(rx + rw * 0.35, ry + rh * 0.35, rw * 1.15, rh * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock body with highlighted facet
    const rGrad = ctx.createLinearGradient(rx - rw, ry - rh, rx + rw, ry + rh);
    rGrad.addColorStop(0, '#42160d');
    rGrad.addColorStop(0.5, '#782d1a');
    rGrad.addColorStop(1, '#ba5736');
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.ellipse(rx, ry, rw, rh, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const albedoTexture = new THREE.CanvasTexture(albedoCanvas);
  albedoTexture.colorSpace = THREE.SRGBColorSpace;
  albedoTexture.wrapS = THREE.RepeatWrapping;
  albedoTexture.wrapT = THREE.RepeatWrapping;
  albedoTexture.repeat.set(6, 6);

  // 2. NORMAL MAP CANVAS (High-detail surface bump & ripple illumination)
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = 512;
  normalCanvas.height = 512;
  const nCtx = normalCanvas.getContext('2d');

  // Base neutral flat normal (RGB: 128, 128, 255)
  nCtx.fillStyle = '#8080ff';
  nCtx.fillRect(0, 0, 512, 512);

  // Micro gravel normals
  for (let i = 0; i < 8000; i++) {
    const nx = Math.random() * 512;
    const ny = Math.random() * 512;
    const rad = Math.random() * 3 + 1;
    const ng = nCtx.createRadialGradient(nx - 0.5, ny - 0.5, 0.2, nx, ny, rad);
    ng.addColorStop(0, '#9870ff');
    ng.addColorStop(0.7, '#8080ff');
    ng.addColorStop(1, 'transparent');
    nCtx.fillStyle = ng;
    nCtx.beginPath();
    nCtx.arc(nx, ny, rad, 0, Math.PI * 2);
    nCtx.fill();
  }

  // Normal ripples
  for (let y = 0; y < 512; y += 12) {
    nCtx.strokeStyle = 'rgba(155, 115, 255, 0.4)';
    nCtx.lineWidth = 2.5;
    nCtx.beginPath();
    nCtx.moveTo(0, y);
    for (let x = 0; x < 512; x += 24) {
      nCtx.lineTo(x, y + Math.sin(x * 0.05) * 3);
    }
    nCtx.stroke();
  }

  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.RepeatWrapping;
  normalTexture.repeat.set(6, 6);

  // 3. ROUGHNESS MAP CANVAS
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rCtx = roughCanvas.getContext('2d');
  rCtx.fillStyle = '#e5e5e5'; // high roughness default for dust (~0.9)
  rCtx.fillRect(0, 0, 256, 256);

  // Darker patches for slightly more compacted bedrock (roughness ~0.7)
  for (let i = 0; i < 150; i++) {
    const cx = Math.random() * 256;
    const cy = Math.random() * 256;
    const cr = Math.random() * 20 + 5;
    const cg = rCtx.createRadialGradient(cx, cy, 2, cx, cy, cr);
    cg.addColorStop(0, '#b0b0b0');
    cg.addColorStop(1, 'transparent');
    rCtx.fillStyle = cg;
    rCtx.beginPath();
    rCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    rCtx.fill();
  }

  const roughnessTexture = new THREE.CanvasTexture(roughCanvas);
  roughnessTexture.wrapS = THREE.RepeatWrapping;
  roughnessTexture.wrapT = THREE.RepeatWrapping;
  roughnessTexture.repeat.set(6, 6);

  return { albedoTexture, normalTexture, roughnessTexture };
}

/**
 * Creates legacy single ground texture for backwards compatibility
 */
export function createMartianGroundTexture() {
  const { albedoTexture } = createMartianGroundPBRTextures();
  return albedoTexture;
}

/**
 * Creates realistic procedural multi-faceted rock geometry with natural erosion,
 * fractures, and flattened bases so boulders sit naturally in Martian regolith.
 * Geometries are calibrated so their bottom vertices extend into negative Y (-scale * 0.35)
 * ensuring rocks are deeply embedded in the soil with ZERO risk of floating.
 */
export function createRealisticMartianBoulder(scale = 1.0, seed = 0) {
  const geo = new THREE.DodecahedronGeometry(scale, 2);
  const pos = geo.attributes.position;
  const count = pos.count;

  const pseudoRand = (v) => {
    const s = Math.sin(v * 12.9898 + seed * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };

  let minY = Infinity;

  for (let i = 0; i < count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const len = Math.hypot(x, y, z);
    const noise = (pseudoRand(x * 2.3 + y * 1.7 + z * 3.1) - 0.5) * 0.45 * scale;
    const layer = Math.sin(y * 4.5 / scale) * 0.15 * scale;

    // Flatten bottom face so rock base is stable in sand
    if (y < 0) {
      y *= 0.55;
    }

    const factor = (len + noise + layer) / (len || 1);
    const finalY = y * factor;
    pos.setXYZ(i, x * factor, finalY, z * factor);

    if (finalY < minY) minY = finalY;
  }

  // Offset geometry vertically so its lowest point sinks -scale * 0.35 into the ground
  const targetMinY = -scale * 0.35;
  const yShift = targetMinY - minY;
  for (let i = 0; i < count; i++) {
    pos.setY(i, pos.getY(i) + yShift);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates massive colossal Martian monoliths (scale 3m - 7m)
 * Features sheer fracture faces, horizontal stratification layers, and massive embedded bedrock foundations.
 */
export function createMassiveMartianMonolith(scale = 4.0, seed = 0) {
  const geo = new THREE.BoxGeometry(scale * 1.3, scale * 1.6, scale * 1.1, 8, 12, 8);
  const pos = geo.attributes.position;
  const count = pos.count;

  const pseudoRand = (v) => {
    const s = Math.sin(v * 17.135 + seed * 91.41) * 43758.5453;
    return s - Math.floor(s);
  };

  let minY = Infinity;

  for (let i = 0; i < count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Bedrock sedimentary terrace step cuts
    const terrace = Math.sin(y * 2.2 / scale) * 0.25 * scale;
    // Cleavage fractures along diagonal joint planes
    const cleavage = (pseudoRand(x * 1.2 + z * 1.4) - 0.5) * 0.38 * scale;
    // Taper toward peak
    const heightFactor = Math.max(0.3, 1.0 - (y / (scale * 0.8)) * 0.35);

    x = (x + cleavage) * heightFactor;
    z = (z + terrace) * heightFactor;

    pos.setXYZ(i, x, y, z);
    if (y < minY) minY = y;
  }

  // Ensure bottom is solidly embedded 35% below terrain datum
  const targetMinY = -scale * 0.35;
  const yShift = targetMinY - minY;
  for (let i = 0; i < count; i++) {
    pos.setY(i, pos.getY(i) + yShift);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates flat, fractured sedimentary slabs and shelf outcrops
 */
export function createStratifiedRockSlab(scale = 2.5, seed = 0) {
  const geo = new THREE.CylinderGeometry(scale * 1.2, scale * 1.4, scale * 0.45, 10, 3);
  const pos = geo.attributes.position;
  const count = pos.count;

  const pseudoRand = (v) => {
    const s = Math.sin(v * 19.87 + seed * 53.21) * 43758.5453;
    return s - Math.floor(s);
  };

  let minY = Infinity;

  for (let i = 0; i < count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const noise = (pseudoRand(x * 2.1 + z * 2.1) - 0.5) * 0.3 * scale;
    pos.setXYZ(i, x + noise, y, z + noise);
    if (y < minY) minY = y;
  }

  const targetMinY = -scale * 0.25;
  const yShift = targetMinY - minY;
  for (let i = 0; i < count; i++) {
    pos.setY(i, pos.getY(i) + yShift);
  }

  geo.computeVertexNormals();
  return geo;
}

