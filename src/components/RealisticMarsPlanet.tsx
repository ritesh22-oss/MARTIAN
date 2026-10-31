import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { detectDeviceCapabilities, DeviceProfile } from '../utils/deviceCapabilities';

export interface RealisticMarsPlanetProps {
  interactive?: boolean;
  onRendererReady?: () => void;
  className?: string;
  mode?: 'horizon' | 'globe';
  parallax?: boolean;
}

/**
 * Photorealistic 3D Mars Planet with physically based rendering,
 * scientific terrain features (dunes, craters, canyon rifts, rocks, basalt plains),
 * atmospheric limb scattering, floating dust particles, and smooth pointer parallax.
 */
export const RealisticMarsPlanet: React.FC<RealisticMarsPlanetProps> = ({
  interactive = true,
  onRendererReady,
  className = '',
  mode = 'horizon',
  parallax = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const marsMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const dustParticlesRef = useRef<THREE.Points | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Parallax coordinates
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const pointerCurrentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const deviceProfile: DeviceProfile = detectDeviceCapabilities();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / height;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const cameraFov = 38;
    const cameraZ = 5.0;
    const camera = new THREE.PerspectiveCamera(cameraFov, aspect, 0.1, 1000);
    camera.position.set(0, 0, cameraZ);
    cameraRef.current = camera;

    // 2. WebGL Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: deviceProfile.tier !== 'LOW',
        alpha: true,
        powerPreference: deviceProfile.tier === 'HIGH' ? 'high-performance' : 'default',
        stencil: false,
        depth: true
      });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    }

    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, deviceProfile.maxPixelRatio));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const domElement = renderer.domElement;
    container.appendChild(domElement);

    // Context loss handlers
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
    const handleContextRestored = () => {
      startAnimation();
    };
    domElement.addEventListener('webglcontextlost', handleContextLost, false);
    domElement.addEventListener('webglcontextrestored', handleContextRestored, false);

    // 3. Dynamic Planet Sizing & Placement for Horizon View
    const computePlacement = (curAspect: number) => {
      if (mode === 'globe') {
        return {
          radius: 1.82,
          centerY: 0,
          tiltZ: 0.4396
        };
      }

      // In horizon mode:
      const vHeight = 2.0 * cameraZ * Math.tan(THREE.MathUtils.degToRad(cameraFov / 2));
      const vWidth = vHeight * curAspect;

      // Sphere radius chosen so the curved planetary horizon spans well beyond
      // the left, right, and bottom screen boundaries on all aspect ratios.
      const radius = Math.max(4.35, vWidth * 0.69);

      // Apex of the horizon sits at ~38% from the top of the viewport
      const targetApexY = vHeight * 0.5 - vHeight * 0.38;
      const centerY = targetApexY - radius;

      return {
        radius,
        centerY,
        tiltZ: 0.22
      };
    };

    let placement = computePlacement(aspect);

    // 4. Lighting Rig
    // Primary Directional Sunlight angled from upper-right to graze across terrain ridges
    const sunLight = new THREE.DirectionalLight(0xfff6ec, 4.0);
    sunLight.position.set(2.4, 5.6, 4.2);
    sunLightRef.current = sunLight;
    scene.add(sunLight);

    // Deep space ambient: warm dark regolith tone
    const deepSpaceAmbient = new THREE.AmbientLight(0x1c1014, 1.2);
    scene.add(deepSpaceAmbient);

    // Secondary fill light for soft Mars-surface bounce
    const scatterLight = new THREE.DirectionalLight(0xff6a3d, 0.8);
    scatterLight.position.set(-3.6, 1.2, 3.0);
    scene.add(scatterLight);

    // 5. Procedural High-Fidelity Martian Terrain Synthesis
    const { width: texW, height: texH } = deviceProfile.textureResolution;

    // Albedo Canvas
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = texW;
    colorCanvas.height = texH;
    const cCtx = colorCanvas.getContext('2d')!;

    // Bump Map Canvas
    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = Math.min(texW, 2048);
    bumpCanvas.height = Math.min(texH, 1024);
    const bCtx = bumpCanvas.getContext('2d')!;

    const bScaleX = bumpCanvas.width / texW;
    const bScaleY = bumpCanvas.height / texH;

    // A) Latitudinal Base Tone Gradient: authentic scientific Martian palette
    const baseGrad = cCtx.createLinearGradient(0, 0, 0, texH);
    baseGrad.addColorStop(0.0, '#5a2214'); // North polar dark fringe
    baseGrad.addColorStop(0.18, '#88371c'); // Vastitas Borealis lowlands
    baseGrad.addColorStop(0.42, '#a44922'); // Warm equatorial regolith (Amazonis / Elysium)
    baseGrad.addColorStop(0.65, '#7b3117'); // Noachian cratered highlands
    baseGrad.addColorStop(0.85, '#521d0e'); // Rugged southern plateau
    baseGrad.addColorStop(1.0, '#361208');
    cCtx.fillStyle = baseGrad;
    cCtx.fillRect(0, 0, texW, texH);

    // Flat mid-grey bump base (neutral altitude)
    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, bumpCanvas.width, bumpCanvas.height);

    // B) Wind-Shaped Sand Ripples & Transverse Aeolian Ridges (TARs) across dust plains
    cCtx.save();
    for (let y = texH * 0.25; y < texH * 0.75; y += 18) {
      cCtx.beginPath();
      cCtx.moveTo(0, y);
      for (let x = 0; x < texW; x += 40) {
        const rippleOffset = Math.sin(x * 0.03 + y * 0.02) * 3.0;
        cCtx.lineTo(x, y + rippleOffset);
      }
      cCtx.lineWidth = 3;
      cCtx.strokeStyle = 'rgba(160, 70, 35, 0.12)';
      cCtx.stroke();
    }
    cCtx.restore();

    // Bump ripples
    bCtx.save();
    bCtx.lineWidth = 2;
    for (let y = bumpCanvas.height * 0.25; y < bumpCanvas.height * 0.75; y += 14) {
      bCtx.beginPath();
      bCtx.moveTo(0, y);
      for (let x = 0; x < bumpCanvas.width; x += 30) {
        const rOff = Math.sin(x * 0.04 + y * 0.03) * 2.0;
        bCtx.lineTo(x, y + rOff);
      }
      bCtx.strokeStyle = 'rgba(140, 140, 140, 0.25)';
      bCtx.stroke();
    }
    bCtx.restore();

    // C) Dark Basaltic Volcanic Lowlands (Syrtis Major, Acidalia, Sinus Sabaeus, Solis Lacus)
    const darkBasalts = [
      { x: texW * 0.72, y: texH * 0.46, rx: texW * 0.14, ry: texH * 0.17, rot: -0.32, col: 'rgba(28, 12, 9, 0.78)' },
      { x: texW * 0.28, y: texH * 0.32, rx: texW * 0.18, ry: texH * 0.20, rot: 0.18, col: 'rgba(32, 14, 10, 0.72)' },
      { x: texW * 0.49, y: texH * 0.52, rx: texW * 0.16, ry: texH * 0.10, rot: 0.12, col: 'rgba(35, 15, 11, 0.75)' },
      { x: texW * 0.88, y: texH * 0.60, rx: texW * 0.19, ry: texH * 0.15, rot: -0.15, col: 'rgba(26, 11, 8, 0.70)' },
      { x: texW * 0.15, y: texH * 0.56, rx: texW * 0.16, ry: texH * 0.13, rot: 0.35, col: 'rgba(30, 13, 9, 0.72)' }
    ];

    darkBasalts.forEach((feat) => {
      cCtx.save();
      cCtx.translate(feat.x, feat.y);
      cCtx.rotate(feat.rot);
      cCtx.fillStyle = feat.col;
      cCtx.beginPath();
      cCtx.ellipse(0, 0, feat.rx, feat.ry, 0, 0, Math.PI * 2);
      cCtx.fill();
      cCtx.restore();

      // Depress in bump
      bCtx.save();
      bCtx.translate(feat.x * bScaleX, feat.y * bScaleY);
      bCtx.rotate(feat.rot);
      bCtx.fillStyle = 'rgba(65, 65, 65, 0.45)';
      bCtx.beginPath();
      bCtx.ellipse(0, 0, feat.rx * bScaleX, feat.ry * bScaleY, 0, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.restore();
    });

    // D) Valles Marineris Canyon Rift System (Melas, Candor, Ophir Chasmata)
    const vmStartX = texW * 0.31;
    const vmCenterY = texH * 0.54;
    const vmLim = texW * 0.26;

    // Main trench
    cCtx.strokeStyle = 'rgba(20, 8, 5, 0.88)';
    cCtx.lineWidth = Math.max(3, texW * 0.007);
    cCtx.beginPath();
    cCtx.moveTo(vmStartX, vmCenterY);
    cCtx.bezierCurveTo(
      vmStartX + vmLim * 0.35, vmCenterY + 14,
      vmStartX + vmLim * 0.7, vmCenterY - 16,
      vmStartX + vmLim, vmCenterY + 8
    );
    cCtx.stroke();

    // Branching tributary chasmata
    cCtx.lineWidth = Math.max(2, texW * 0.0035);
    cCtx.beginPath();
    cCtx.moveTo(vmStartX + vmLim * 0.3, vmCenterY + 8);
    cCtx.lineTo(vmStartX + vmLim * 0.42, vmCenterY + 28);
    cCtx.moveTo(vmStartX + vmLim * 0.6, vmCenterY - 10);
    cCtx.lineTo(vmStartX + vmLim * 0.72, vmCenterY - 32);
    cCtx.stroke();

    // Bump trench
    bCtx.strokeStyle = 'rgba(15, 15, 15, 0.90)';
    bCtx.lineWidth = Math.max(2, bumpCanvas.width * 0.008);
    bCtx.beginPath();
    bCtx.moveTo(vmStartX * bScaleX, vmCenterY * bScaleY);
    bCtx.bezierCurveTo(
      (vmStartX + vmLim * 0.35) * bScaleX, (vmCenterY + 14) * bScaleY,
      (vmStartX + vmLim * 0.7) * bScaleX, (vmCenterY - 16) * bScaleY,
      (vmStartX + vmLim) * bScaleX, (vmCenterY + 8) * bScaleY
    );
    bCtx.stroke();

    // Raised shoulder ridges on canyon rims
    bCtx.strokeStyle = 'rgba(200, 200, 200, 0.60)';
    bCtx.lineWidth = Math.max(1, bumpCanvas.width * 0.003);
    bCtx.beginPath();
    bCtx.moveTo(vmStartX * bScaleX, (vmCenterY - 6) * bScaleY);
    bCtx.bezierCurveTo(
      (vmStartX + vmLim * 0.35) * bScaleX, (vmCenterY + 8) * bScaleY,
      (vmStartX + vmLim * 0.7) * bScaleX, (vmCenterY - 22) * bScaleY,
      (vmStartX + vmLim) * bScaleX, (vmCenterY + 2) * bScaleY
    );
    bCtx.stroke();

    // E) Tharsis Shield Volcanoes (Olympus Mons + Tharsis Montes)
    const volcanoes = [
      { x: texW * 0.22, y: texH * 0.42, r: texW * 0.038 },
      { x: texW * 0.27, y: texH * 0.38, r: texW * 0.022 },
      { x: texW * 0.29, y: texH * 0.46, r: texW * 0.020 },
      { x: texW * 0.31, y: texH * 0.54, r: texW * 0.021 },
      { x: texW * 0.58, y: texH * 0.35, r: texW * 0.025 }
    ];

    volcanoes.forEach((v) => {
      const vGrad = cCtx.createRadialGradient(v.x, v.y, 0, v.x, v.y, v.r);
      vGrad.addColorStop(0.0, '#2a0e07');
      vGrad.addColorStop(0.28, '#a24b22');
      vGrad.addColorStop(0.70, '#b85629');
      vGrad.addColorStop(1.0, 'rgba(160, 70, 30, 0)');
      cCtx.fillStyle = vGrad;
      cCtx.beginPath();
      cCtx.arc(v.x, v.y, v.r, 0, Math.PI * 2);
      cCtx.fill();

      const bVx = v.x * bScaleX;
      const bVy = v.y * bScaleY;
      const bVr = v.r * bScaleX;
      const bGrad = bCtx.createRadialGradient(bVx, bVy, 0, bVx, bVy, bVr);
      bGrad.addColorStop(0.0, '#1a1a1a'); // Caldera pit
      bGrad.addColorStop(0.25, '#f0f0f0'); // Caldera rim elevation
      bGrad.addColorStop(0.75, '#a8a8a8');
      bGrad.addColorStop(1.0, 'rgba(128, 128, 128, 0)');
      bCtx.fillStyle = bGrad;
      bCtx.beginPath();
      bCtx.arc(bVx, bVy, bVr, 0, Math.PI * 2);
      bCtx.fill();
    });

    // F) Natural Impact Craters (NO artificial stroke rings!)
    const craterCount = deviceProfile.tier === 'HIGH' ? 320 : 180;
    for (let i = 0; i < craterCount; i++) {
      const cx = Math.random() * texW;
      const cy = texH * 0.12 + Math.random() * (texH * 0.76);
      const cr = 2 + Math.pow(Math.random(), 2.8) * (texW * 0.022);

      // Natural shading: soft shadowed interior gradient instead of vector strokes
      const craterGrad = cCtx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      craterGrad.addColorStop(0.0, 'rgba(28, 10, 7, 0.65)');
      craterGrad.addColorStop(0.7, 'rgba(40, 15, 10, 0.40)');
      craterGrad.addColorStop(0.9, 'rgba(175, 80, 40, 0.18)');
      craterGrad.addColorStop(1.0, 'rgba(140, 60, 30, 0)');
      cCtx.fillStyle = craterGrad;
      cCtx.beginPath();
      cCtx.arc(cx, cy, cr, 0, Math.PI * 2);
      cCtx.fill();

      // Bump map handles physical crater geometry (depressed center + raised rim)
      const bcx = cx * bScaleX;
      const bcy = cy * bScaleY;
      const bcr = cr * bScaleX;

      bCtx.fillStyle = 'rgba(45, 45, 45, 0.65)';
      bCtx.beginPath();
      bCtx.arc(bcx, bcy, bcr * 0.78, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.strokeStyle = 'rgba(215, 215, 215, 0.6)';
      bCtx.lineWidth = Math.max(1, bcr * 0.18);
      bCtx.beginPath();
      bCtx.arc(bcx, bcy, bcr, 0, Math.PI * 2);
      bCtx.stroke();

      if (bcr > 8) {
        bCtx.fillStyle = 'rgba(230, 230, 230, 0.75)';
        bCtx.beginPath();
        bCtx.arc(bcx, bcy, bcr * 0.2, 0, Math.PI * 2);
        bCtx.fill();
      }
    }

    // G) Micro Terrain Roughness
    const rockClusters = deviceProfile.tier === 'HIGH' ? 500 : 220;
    for (let i = 0; i < rockClusters; i++) {
      const rx = Math.random() * texW;
      const ry = texH * 0.15 + Math.random() * (texH * 0.7);
      const rSize = 1 + Math.random() * 2.2;

      cCtx.fillStyle = Math.random() > 0.5 ? 'rgba(180, 85, 45, 0.25)' : 'rgba(22, 9, 5, 0.35)';
      cCtx.fillRect(rx, ry, rSize, rSize);

      const brx = rx * bScaleX;
      const bry = ry * bScaleY;
      bCtx.fillStyle = 'rgba(200, 200, 200, 0.45)';
      bCtx.fillRect(brx, bry, rSize, rSize);
    }

    // H) North Polar Ice Cap (Planum Boreum)
    const northCap = cCtx.createRadialGradient(
      texW * 0.5, 20, 6,
      texW * 0.5, 20, texH * 0.14
    );
    northCap.addColorStop(0.0, 'rgba(240, 246, 252, 0.95)');
    northCap.addColorStop(0.5, 'rgba(215, 230, 245, 0.70)');
    northCap.addColorStop(0.8, 'rgba(180, 200, 220, 0.25)');
    northCap.addColorStop(1.0, 'rgba(150, 175, 195, 0)');
    cCtx.fillStyle = northCap;
    cCtx.fillRect(0, 0, texW, texH * 0.16);

    // Textures
    const marsTexture = new THREE.CanvasTexture(colorCanvas);
    marsTexture.colorSpace = THREE.SRGBColorSpace;
    marsTexture.wrapS = THREE.RepeatWrapping;
    marsTexture.wrapT = THREE.ClampToEdgeWrapping;

    const bumpTexture = new THREE.CanvasTexture(bumpCanvas);
    bumpTexture.wrapS = THREE.RepeatWrapping;
    bumpTexture.wrapT = THREE.ClampToEdgeWrapping;

    // 6. Mars Mesh Assembly
    let sphereGeometry = new THREE.SphereGeometry(
      placement.radius,
      deviceProfile.sphereSegments,
      deviceProfile.sphereSegments
    );

    const marsMaterial = new THREE.MeshStandardMaterial({
      map: marsTexture,
      bumpMap: deviceProfile.enableNormalMap ? bumpTexture : null,
      bumpScale: 0.042,
      roughness: 0.88,
      metalness: 0.02
    });

    const marsMesh = new THREE.Mesh(sphereGeometry, marsMaterial);
    marsMesh.rotation.z = placement.tiltZ;

    const startY = placement.centerY - 0.55;
    marsMesh.position.set(0, startY, 0);
    marsMeshRef.current = marsMesh;
    scene.add(marsMesh);

    // 7. Atmospheric Limb Shader (Authentic Scientific Martian Haze)
    const atmosGeometry = new THREE.SphereGeometry(placement.radius * 1.016, 54, 54);
    const atmosUniforms = {
      uTime: { value: 0 },
      uIntensity: { value: 1.0 }
    };

    const atmosVertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const atmosFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform float uTime;
      uniform float uIntensity;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        float dotNV = max(dot(viewDir, normal), 0.0);
        float fresnel = 1.0 - dotNV;

        float edgeGlow = pow(fresnel, 3.2) * 1.8;
        float upFactor = smoothstep(-0.35, 0.45, normal.y);
        float breath = 1.0 + 0.03 * sin(uTime * 1.2);

        float alpha = edgeGlow * upFactor * uIntensity * breath;

        // Scientific Mars Atmosphere: Muted dust red fading to subtle high-altitude sky blue scatter
        vec3 dustRed = vec3(0.78, 0.32, 0.18);
        vec3 limbSkyBlue = vec3(0.40, 0.52, 0.68);
        vec3 color = mix(dustRed, limbSkyBlue, pow(fresnel, 4.5));

        gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.85));
      }
    `;

    const atmosMaterial = new THREE.ShaderMaterial({
      uniforms: atmosUniforms,
      vertexShader: atmosVertexShader,
      fragmentShader: atmosFragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    atmosMaterialRef.current = atmosMaterial;

    const atmosphereMesh = new THREE.Mesh(atmosGeometry, atmosMaterial);
    atmosphereMesh.position.copy(marsMesh.position);
    atmosphereMeshRef.current = atmosphereMesh;
    scene.add(atmosphereMesh);

    // 8. Floating Atmospheric Martian Dust Particles
    const dustCount = deviceProfile.tier === 'HIGH' ? 240 : 130;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustVelocities = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 9.0;
      dustPositions[i * 3 + 1] = Math.random() * 4.5 - 2.2;
      dustPositions[i * 3 + 2] = 2.0 + Math.random() * 2.6; // floating in foreground

      dustVelocities[i * 3] = (Math.random() - 0.5) * 0.04;
      dustVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.03 + 0.015;
      dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      // Dust colors: warm amber-orange and dusty terracotta
      if (Math.random() > 0.4) {
        dustColors[i * 3] = 1.0; dustColors[i * 3 + 1] = 0.55; dustColors[i * 3 + 2] = 0.35;
      } else {
        dustColors[i * 3] = 0.85; dustColors[i * 3 + 1] = 0.42; dustColors[i * 3 + 2] = 0.25;
      }
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));

    const dustMat = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const dustField = new THREE.Points(dustGeo, dustMat);
    dustParticlesRef.current = dustField;
    scene.add(dustField);

    // 9. Distant Starfield Background
    const starCount = deviceProfile.starfieldCount;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 80;
      starPositions[i + 1] = Math.random() * 40 - 5;
      starPositions[i + 2] = (Math.random() - 0.5) * 80 - 15;

      const temp = Math.random();
      if (temp > 0.85) {
        starColors[i] = 0.8; starColors[i + 1] = 0.9; starColors[i + 2] = 1.0;
      } else if (temp > 0.3) {
        starColors[i] = 0.96; starColors[i + 1] = 0.96; starColors[i + 2] = 0.94;
      } else {
        starColors[i] = 1.0; starColors[i + 1] = 0.72; starColors[i + 2] = 0.58;
      }
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 10. Pointer Movement & Subtle Parallax Listeners
    const handlePointerMove = (e: PointerEvent) => {
      if (!parallax) return;
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      pointerTargetRef.current.x = normX * 0.22;
      pointerTargetRef.current.y = normY * 0.12;
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // 11. Animation Loop with Parallax & Dust Drift
    const clock = new THREE.Clock();
    let isVisible = true;
    let currentY = startY;

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const startAnimation = () => {
      const render = () => {
        if (isVisible) {
          const delta = clock.getDelta();
          const reducedMotion = deviceProfile.prefersReducedMotion;

          // Smooth rise on initial reveal
          if (reducedMotion) {
            currentY = placement.centerY;
          } else {
            currentY = THREE.MathUtils.damp(currentY, placement.centerY, 2.5, delta);
          }

          marsMesh.position.y = currentY;
          atmosphereMesh.position.y = currentY;

          // Continuous slow axial rotation
          const rotSpeed = reducedMotion ? 0.0001 : 0.00035;
          marsMesh.rotation.y += rotSpeed;
          atmosphereMesh.rotation.y += rotSpeed;

          // Smooth parallax damping
          if (!reducedMotion && parallax) {
            pointerCurrentRef.current.x = THREE.MathUtils.damp(
              pointerCurrentRef.current.x,
              pointerTargetRef.current.x,
              2.0,
              delta
            );
            pointerCurrentRef.current.y = THREE.MathUtils.damp(
              pointerCurrentRef.current.y,
              pointerTargetRef.current.y,
              2.0,
              delta
            );

            camera.position.x = pointerCurrentRef.current.x;
            camera.position.y = pointerCurrentRef.current.y;
            camera.lookAt(0, currentY * 0.2, 0);

            // Subtle sunlight shift
            if (sunLightRef.current) {
              sunLightRef.current.position.x = 2.4 + pointerCurrentRef.current.x * 0.8;
              sunLightRef.current.position.y = 5.6 + pointerCurrentRef.current.y * 0.5;
            }
          }

          // Animate floating dust motes
          if (dustParticlesRef.current && !reducedMotion) {
            const posAttr = dustGeo.attributes.position as THREE.BufferAttribute;
            const posArray = posAttr.array as Float32Array;
            for (let i = 0; i < dustCount; i++) {
              posArray[i * 3] += dustVelocities[i * 3];
              posArray[i * 3 + 1] += dustVelocities[i * 3 + 1];
              posArray[i * 3 + 2] += dustVelocities[i * 3 + 2];

              // Boundary wrap
              if (posArray[i * 3 + 1] > 2.5) posArray[i * 3 + 1] = -2.2;
              if (posArray[i * 3] > 4.5) posArray[i * 3] = -4.5;
              if (posArray[i * 3] < -4.5) posArray[i * 3] = 4.5;
            }
            posAttr.needsUpdate = true;
          }

          // Atmosphere uniform
          if (atmosMaterialRef.current) {
            atmosMaterialRef.current.uniforms.uTime.value = clock.getElapsedTime();
          }

          renderer.render(scene, camera);
        }
        animFrameRef.current = requestAnimationFrame(render);
      };

      animFrameRef.current = requestAnimationFrame(render);
    };

    startAnimation();
    onRendererReady?.();

    // 12. Responsive Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      const newAspect = newW / newH;

      cameraRef.current.aspect = newAspect;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);

      const newPlacement = computePlacement(newAspect);
      placement = newPlacement;

      if (Math.abs((marsMesh.geometry.boundingSphere?.radius || 0) - newPlacement.radius) > 0.15) {
        marsMesh.geometry.dispose();
        marsMesh.geometry = new THREE.SphereGeometry(
          newPlacement.radius,
          deviceProfile.sphereSegments,
          deviceProfile.sphereSegments
        );

        atmosphereMesh.geometry.dispose();
        atmosphereMesh.geometry = new THREE.SphereGeometry(
          newPlacement.radius * 1.018,
          54,
          54
        );
      }
    };
    window.addEventListener('resize', handleResize);

    // 13. Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

      domElement.removeEventListener('webglcontextlost', handleContextLost);
      domElement.removeEventListener('webglcontextrestored', handleContextRestored);

      sphereGeometry.dispose();
      marsMaterial.dispose();
      marsTexture.dispose();
      bumpTexture.dispose();
      atmosGeometry.dispose();
      atmosMaterial.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();

      if (container && domElement && container.contains(domElement)) {
        container.removeChild(domElement);
      }
    };
  }, [interactive, mode, onRendererReady, parallax]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      aria-label="Photorealistic 3D Mars Planet Horizon"
    />
  );
};

export default RealisticMarsPlanet;
