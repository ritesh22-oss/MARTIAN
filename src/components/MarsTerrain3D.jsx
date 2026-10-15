import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  Globe2, Play, Pause, RotateCcw, Layers, Compass, Eye, ShieldCheck,
  MapPin, Sliders, Info, Thermometer, Wind, Sun, AlertTriangle, ExternalLink,
  ChevronRight, ChevronDown, Check, Sparkles, Cloud, Save
} from 'lucide-react';
import {
  MARS_REFERENCE_DATUM,
  NASA_DATA_SOURCES,
  JEZERO_ENVIRONMENTAL_CONTEXT,
  JEZERO_SCIENCE_POIS,
  getMartianElevation,
  calculateLocalSlope
} from '../utils/marsScienceData';
import { createMartianGroundPBRTextures, createRealisticMartianBoulder, createMassiveMartianMonolith, createStratifiedRockSlab } from '../utils/marsTextures';
import { createDetailedMarsRover } from '../utils/roverModel';
import { computeScientificTrajectories } from '../utils/trajectorySolver';
import RouteInspectorModal from './RouteInspectorModal';
import SciencePOIModal from './SciencePOIModal';
import MapLayerControls from './MapLayerControls';
import SaveMissionModal from './SaveMissionModal';

export default function MarsTerrain3D({ onOpenMissions }) {
  const containerRef = useRef(null);

  // Application State
  const [isDriving, setIsDriving] = useState(true);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState('energy'); // 'energy', 'shortest', 'configured'
  const [isRealDataMode, setIsRealDataMode] = useState(true);
  const [isInfiniteMode, setIsInfiniteMode] = useState(true);
  const [infiniteSpeed, setInfiniteSpeed] = useState(1); // 1x, 2x, 4x
  const [traversedMeters, setTraversedMeters] = useState(0);
  const streamOffsetRef = useRef({ x: 0, z: 0 });
  const isInfiniteModeRef = useRef(true);
  isInfiniteModeRef.current = isInfiniteMode;
  const infiniteSpeedRef = useRef(infiniteSpeed);
  infiniteSpeedRef.current = infiniteSpeed;
  const [layerDrawerOpen, setLayerDrawerOpen] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState(null);
  const [selectedRouteForInspector, setSelectedRouteForInspector] = useState(null);
  
  // Real-time Picked Terrain Coordinate
  const [pickedTerrain, setPickedTerrain] = useState({
    lat: '18.420° N',
    lon: '77.450° E',
    elevationM: -2458,
    slopeDeg: 4.8,
    surfaceType: 'Bedrock / Firm Regolith',
    traversability: 'Optimal (Cost 1.0)'
  });

  // Layer Opacities State for Smooth Transitions
  const [layerOpacities, setLayerOpacities] = useState({
    elevation: 1.0,
    slope: 0.0,
    labels: 1.0,
    contours: 0.6,
    grid: 0.4
  });

  const handleOpacityChange = (layer, value) => {
    setLayerOpacities(prev => ({ ...prev, [layer]: value }));
  };

  const handlePresetApply = (presetValues) => {
    setLayerOpacities(prev => ({ ...prev, ...presetValues }));
  };

  // Multi-Objective Dynamic Trajectory Weights
  const [userWeights, setUserWeights] = useState({
    distanceWeight: 1.0,
    slopeWeight: 2.5,
    obstaclePenalty: 5.0,
    looseSandPenalty: 2.0
  });

  // Compute trajectories dynamically based on user weights
  const routesData = useMemo(() => {
    return computeScientificTrajectories(
      { x: -25, z: 32 },
      { x: 22, z: -28 },
      userWeights
    );
  }, [userWeights]);

  const activeRoute = routesData[
    activeRouteId === 'energy'
      ? 'energyEfficient'
      : activeRouteId === 'shortest'
      ? 'shortestDistance'
      : 'configuredCost'
  ];

  const handleWeightChange = (key, value) => {
    setUserWeights(prev => ({ ...prev, [key]: value }));
  };

  // THREE.JS SCENE MANAGEMENT
  const sceneRef = useRef(null);
  const terrainMeshRef = useRef(null);
  const contourMeshRef = useRef(null);
  const gridMeshRef = useRef(null);
  const trajectoryGroupRef = useRef(null);
  const roverGroupRef = useRef(null);
  const poiGroupRef = useRef(null);
  const hazardGroupRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 580;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x050813, 0.0022);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1800);
    camera.position.set(40, 55, 75);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. Lighting (Sunlight + Atmospheric bounce)
    const ambientLight = new THREE.AmbientLight(0x2a1410, 2.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffa278, 3.8);
    sunLight.position.set(70, 95, 45);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x1a4568, 1.8);
    rimLight.position.set(-60, 45, -60);
    scene.add(rimLight);

    // 3. World Group
    const marsWorld = new THREE.Group();
    scene.add(marsWorld);

    // 4. Digital Elevation Model (DEM) Geometry - Local High-Resolution Survey Plane
    // 4. Digital Elevation Model (DEM) Geometry - Local High-Resolution Survey Plane
    const gridSegments = 140;
    const terrainSize = 140;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, gridSegments, gridSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const posAttr = terrainGeo.attributes.position;
    const vCount = posAttr.count;

    // Cache original (x, z) coordinates for real-time infinite procedural streaming
    const origX = new Float32Array(vCount);
    const origZ = new Float32Array(vCount);
    const colors = new Float32Array(vCount * 3);

    for (let i = 0; i < vCount; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      origX[i] = vx;
      origZ[i] = vz;

      const elev = getMartianElevation(vx, vz);
      posAttr.setY(i, elev.localRelY);

      // Natural Martian Regolith Elevation Tinting (-22m to +48m calibrated)
      const normY = THREE.MathUtils.clamp((elev.localRelY + 22) / 68, 0, 1);
      let r = 0.65, g = 0.22, b = 0.12;
      if (normY < 0.25) {
        // Deep crater depths / collapse shadows: dark iron-basalt
        r = 0.22 + normY * 0.45;
        g = 0.07 + normY * 0.22;
        b = 0.05 + normY * 0.16;
      } else if (normY < 0.65) {
        // Plains and slopes: rich Jezero ochre-red regolith
        const t = (normY - 0.25) / 0.4;
        r = 0.62 + t * 0.22;
        g = 0.22 + t * 0.15;
        b = 0.12 + t * 0.08;
      } else {
        // High mountain ridges & sunlit rim peaks: bright oxidized dust
        const t = (normY - 0.65) / 0.35;
        r = 0.84 + t * 0.14;
        g = 0.42 + t * 0.26;
        b = 0.22 + t * 0.22;
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    terrainGeo.userData.origX = origX;
    terrainGeo.userData.origZ = origZ;
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const { albedoTexture, normalTexture, roughnessTexture } = createMartianGroundPBRTextures();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: albedoTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: roughnessTexture,
      vertexColors: true,
      roughness: 0.90,
      metalness: 0.06,
      flatShading: false
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    terrainMeshRef.current = terrainMesh;
    marsWorld.add(terrainMesh);

    // 4b. "Big Big Mountains": Infinite Horizon Martian Landscape with Soaring Rim Peaks
    const horizonGeo = new THREE.PlaneGeometry(1500, 1500, 100, 100);
    horizonGeo.rotateX(-Math.PI / 2);
    const hPos = horizonGeo.attributes.position;
    const hCount = hPos.count;
    const hColors = new Float32Array(hCount * 3);

    for (let i = 0; i < hCount; i++) {
      const hx = hPos.getX(i);
      const hz = hPos.getZ(i);
      const distFromCenter = Math.hypot(hx, hz);

      if (distFromCenter < 69) {
        // Drop underneath local high-res survey mesh to avoid z-fighting
        hPos.setY(i, -35);
        hColors[i * 3] = 0.02;
        hColors[i * 3 + 1] = 0.01;
        hColors[i * 3 + 2] = 0.01;
      } else {
        const hElev = getMartianElevation(hx, hz);
        // Towering crater rims and mountain massifs rising +55m to +95m on the horizon!
        const rimAngle = Math.atan2(hz, hx);
        const rimWave = Math.sin(rimAngle * 4.0) * 18.0 + Math.cos(rimAngle * 7.0) * 9.0;
        const mountainClimb = Math.min(85.0, Math.pow((distFromCenter - 69) / 120, 1.3) * 60.0);
        const yVal = hElev.localRelY * 0.85 + mountainClimb + rimWave;
        hPos.setY(i, yVal);

        // Natural atmospheric depth fading towards deep space navy fog (#050813)
        const fogBlend = Math.min(1.0, Math.max(0, (distFromCenter - 140) / 480));
        const baseR = 0.58;
        const baseG = 0.22;
        const baseB = 0.14;

        const fogR = 0.02;
        const fogG = 0.03;
        const fogB = 0.075;

        hColors[i * 3] = baseR * (1 - fogBlend) + fogR * fogBlend;
        hColors[i * 3 + 1] = baseG * (1 - fogBlend) + fogG * fogBlend;
        hColors[i * 3 + 2] = baseB * (1 - fogBlend) + fogB * fogBlend;
      }
    }
    horizonGeo.setAttribute('color', new THREE.BufferAttribute(hColors, 3));
    horizonGeo.computeVertexNormals();

    const horizonMat = new THREE.MeshStandardMaterial({
      map: albedoTexture,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: false
    });
    const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
    horizonMesh.receiveShadow = true;
    marsWorld.add(horizonMesh);

    // 4c. "Stones Big Big": Procedural Realistic Weathered Martian Boulders & Monoliths (ZERO FLOATING)
    const rockGroup = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x4d1c10,
      roughness: 0.94,
      metalness: 0.08,
      flatShading: false
    });

    // Helper to solidly plant rocks with zero floating and slope-aligned orientation
    const addGroundedRock = (geometry, rx, rz, customRot = 0) => {
      const surfaceY = getMartianElevation(rx, rz).localRelY;
      const rock = new THREE.Mesh(geometry, rockMat);
      rock.position.set(rx, surfaceY, rz);

      // Sample local slope normal and orient rock to match terrain incline
      const eps = 0.5;
      const hL = getMartianElevation(rx - eps, rz).localRelY;
      const hR = getMartianElevation(rx + eps, rz).localRelY;
      const hD = getMartianElevation(rx, rz - eps).localRelY;
      const hU = getMartianElevation(rx, rz + eps).localRelY;
      const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);
      rock.quaternion.copy(quat);
      rock.rotateY(customRot || Math.random() * Math.PI * 2);

      rock.castShadow = true;
      rock.receiveShadow = true;
      rockGroup.add(rock);
    };

    // A. "Stones Big Big": Colossal Monoliths perched on mountain ridges, crater rims, and plateau shoulders
    const giantMonoliths = [
      { x: -16, z: -4, s: 5.5 }, // Near Kodiak Butte shoulder
      { x: 26, z: -10, s: 6.2 }, // Belva crater northern rim crest
      { x: 38, z: -32, s: 5.8 }, // Belva crater southern rampart
      { x: -38, z: 24, s: 6.0 }, // Delta mountain scarp
      { x: -44, z: -8, s: 5.2 }, // Western mountain pass
      { x: 12, z: 26, s: 4.8 }, // Secondary crater lip
      { x: -28, z: 36, s: 4.5 }, // Delta front pinnacle
      { x: 32, z: 12, s: 5.0 }, // Eastern bedrock bluff
      { x: -6, z: -20, s: 4.2 }, // Canyon gully rim
      { x: 18, z: -38, s: 4.6 }  // Deep basin edge
    ];
    giantMonoliths.forEach((m, idx) => {
      const geo = createMassiveMartianMonolith(m.s, idx * 31 + 7);
      addGroundedRock(geo, m.x, m.z);
    });

    // B. Large Stratified Bedrock Slabs (16 pieces)
    for (let r = 0; r < 16; r++) {
      const angle = (r / 16) * Math.PI * 2 + 0.3;
      const dist = 22 + (r % 4) * 10;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const rScale = 2.4 + (r % 3) * 0.7;
      const slabGeo = createStratifiedRockSlab(rScale, r * 47 + 200);
      addGroundedRock(slabGeo, rx, rz, r * 1.3);
    }

    // C. Medium Weathered Martian Boulders (36 pieces)
    for (let r = 0; r < 36; r++) {
      const rx = (Math.random() - 0.5) * 115;
      const rz = (Math.random() - 0.5) * 115;
      if (Math.hypot(rx + 25, rz - 32) < 4) continue;
      const rScale = 1.2 + Math.random() * 1.1;
      const rockGeo = createRealisticMartianBoulder(rScale, r * 59 + 400);
      addGroundedRock(rockGeo, rx, rz, r * 0.9);
    }

    // D. Scattered Scree & Gravel near slopes (48 pieces)
    for (let r = 0; r < 48; r++) {
      const rx = (Math.random() - 0.5) * 120;
      const rz = (Math.random() - 0.5) * 120;
      const rScale = 0.35 + Math.random() * 0.45;
      const rockGeo = createRealisticMartianBoulder(rScale, r * 19 + 800);
      addGroundedRock(rockGeo, rx, rz, r * 1.7);
    }
    marsWorld.add(rockGroup);

    // 5. Contour Lines Wireframe Layer
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x5a1d12,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const contourMesh = new THREE.Mesh(terrainGeo, wireMat);
    contourMesh.position.y += 0.05;
    contourMeshRef.current = contourMesh;
    marsWorld.add(contourMesh);

    // 6. Subterranean Coordinate Datum Grid (Positioned at -32m so it never floats across craters)
    const gridHelper = new THREE.GridHelper(terrainSize, 12, 0xff9366, 0xffffff);
    gridHelper.position.y = -32.0;
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    gridMeshRef.current = gridHelper;
    marsWorld.add(gridHelper);

    // 7. Trajectories Group
    const trajectoryGroup = new THREE.Group();
    trajectoryGroupRef.current = trajectoryGroup;
    marsWorld.add(trajectoryGroup);

    // 8. Science POI Beacons
    const poiGroup = new THREE.Group();
    poiGroupRef.current = poiGroup;
    const poiMeshes = [];

    JEZERO_SCIENCE_POIS.forEach(poi => {
      const pElev = getMartianElevation(poi.x, poi.z);
      const beaconGroup = new THREE.Group();
      beaconGroup.position.set(poi.x, pElev.localRelY, poi.z);

      // Vertical Laser Line
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 14, 8),
        new THREE.MeshBasicMaterial({ color: 0xff9366, transparent: true, opacity: 0.75 })
      );
      stem.position.y = 7;
      beaconGroup.add(stem);

      // Pulsing Marker Orb
      const orb = new THREE.Mesh(
        new THREE.SphereGeometry(0.85, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xff4820,
          emissive: 0xff2a00,
          emissiveIntensity: 1.2
        })
      );
      orb.position.y = 14;
      orb.userData = poi;
      beaconGroup.add(orb);
      poiMeshes.push(orb);

      // Ground Target Ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.8, 24),
        new THREE.MeshBasicMaterial({ color: 0xff9366, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
      );
      ring.rotateX(-Math.PI / 2);
      ring.position.y = 0.2;
      beaconGroup.add(ring);

      poiGroup.add(beaconGroup);
    });
    marsWorld.add(poiGroup);

    // 9. Hazard Zones (Megaripple sand dune fields & boulder clusters)
    const hazardGroup = new THREE.Group();
    hazardGroupRef.current = hazardGroup;
    
    // South Séítah Dune Hazard Mesh
    const sandGeo = new THREE.PlaneGeometry(16, 16, 12, 12);
    sandGeo.rotateX(-Math.PI / 2);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xc8752d,
      roughness: 0.98,
      transparent: true,
      opacity: 0.85
    });
    const sandDune = new THREE.Mesh(sandGeo, sandMat);
    sandDune.position.set(-4, getMartianElevation(-4, -14).localRelY + 0.15, -14);
    hazardGroup.add(sandDune);
    marsWorld.add(hazardGroup);

    // 10. Detailed NASA 6-Wheel Exploration Rover (Rocker-Bogie, Mastcam-Z, Robotic Arm, MMRTG)
    const roverController = createDetailedMarsRover();
    const roverGroup = roverController.roverRoot;
    roverGroup.scale.set(0.68, 0.68, 0.68);
    roverGroupRef.current = roverGroup;
    marsWorld.add(roverGroup);

    // 11. Mouse & Orbit Controls & Wheel Zoom
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let rotY = 0.28;
    let rotX = 0.18;
    let driveProgress = 0;

    const dom = renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onDown = (e) => {
      isDragging = true;
      prevMouse = {
        x: e.clientX || e.touches?.[0]?.clientX,
        y: e.clientY || e.touches?.[0]?.clientY
      };
    };

    const onMove = (e) => {
      const cx = e.clientX || e.touches?.[0]?.clientX;
      const cy = e.clientY || e.touches?.[0]?.clientY;

      if (isDragging) {
        const dx = cx - prevMouse.x;
        const dy = cy - prevMouse.y;
        rotY += dx * 0.007;
        rotX = Math.max(-0.25, Math.min(0.65, rotX + dy * 0.005));
        prevMouse = { x: cx, y: cy };
      }

      // Raycast on terrain for live Lat/Lon/Elevation picker
      const rect = dom.getBoundingClientRect();
      mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects([terrainMesh, ...poiMeshes]);

      if (hits.length > 0) {
        const hit = hits[0];
        if (hit.object.userData && hit.object.userData.name) {
          dom.style.cursor = 'pointer';
        } else {
          dom.style.cursor = 'crosshair';
          const px = hit.point.x;
          const pz = hit.point.z;
          const elev = getMartianElevation(px + streamOffsetRef.current.x, pz + streamOffsetRef.current.z);
          const slope = calculateLocalSlope(px + streamOffsetRef.current.x, pz + streamOffsetRef.current.z);

          // Convert local x,z to planetocentric Jezero coordinates
          const latVal = (18.38 + (pz + streamOffsetRef.current.z) * 0.002).toFixed(3);
          const lonVal = (77.45 + (px + streamOffsetRef.current.x) * 0.002).toFixed(3);

          let sType = 'Bedrock / Firm Regolith';
          let tCost = 'Optimal (Cost 1.0)';
          if (slope > 14) {
            sType = 'Steep Crater Scarp / Rubble';
            tCost = 'High Risk (Cost 5.0+)';
          } else if (Math.abs(px - -4) < 8 && Math.abs(pz - -14) < 8) {
            sType = 'Séítah Basaltic Sand Dune';
            tCost = 'Slip Hazard (Cost 2.0)';
          }

          setPickedTerrain({
            lat: `${latVal}° N`,
            lon: `${lonVal}° E`,
            elevationM: elev.molaElevationM,
            slopeDeg: slope,
            surfaceType: sType,
            traversability: tCost
          });
        }
      } else {
        dom.style.cursor = 'default';
      }
    };

    const onUp = (e) => {
      isDragging = false;
      // Click selection on Science POIs
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(poiMeshes);
      if (hits.length > 0) {
        setSelectedPOI(hits[0].object.userData);
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.04;
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      const camDist = camera.position.length();
      if ((zoomDelta > 0 && camDist < 350) || (zoomDelta < 0 && camDist > 18)) {
        camera.position.addScaledVector(camDir, -zoomDelta * 0.35);
      }
    };

    dom.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);

    // 12. Animation Loop
    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth orbit dampening
      marsWorld.rotation.y += (rotY - marsWorld.rotation.y) * 0.06;
      marsWorld.rotation.x += (rotX - marsWorld.rotation.x) * 0.06;

      // INFINITE 3D TERRAIN STREAMING MODE
      if (isInfiniteModeRef.current && isDriving) {
        const speedMultiplier = infiniteSpeedRef.current;
        const moveStep = delta * 6.5 * speedMultiplier;

        // Diagonal traverse across Mars
        streamOffsetRef.current.x += moveStep * 0.707;
        streamOffsetRef.current.z -= moveStep * 0.707;

        const offX = streamOffsetRef.current.x;
        const offZ = streamOffsetRef.current.z;

        // Dynamic vertex streaming for infinite landscape
        const pos = terrainGeo.attributes.position;
        const col = terrainGeo.attributes.color;
        const origXArr = terrainGeo.userData.origX;
        const origZArr = terrainGeo.userData.origZ;

        if (origXArr && origZArr) {
          for (let i = 0; i < vCount; i++) {
            const worldX = origXArr[i] + offX;
            const worldZ = origZArr[i] + offZ;
            const el = getMartianElevation(worldX, worldZ);
            pos.setY(i, el.localRelY);

            // Continuous elevation coloring (-22m to +48m calibrated)
            const normY = THREE.MathUtils.clamp((el.localRelY + 22) / 68, 0, 1);
            let r = 0.65, g = 0.22, b = 0.12;
            if (normY < 0.25) {
              r = 0.22 + normY * 0.45;
              g = 0.07 + normY * 0.22;
              b = 0.05 + normY * 0.16;
            } else if (normY < 0.65) {
              const t = (normY - 0.25) / 0.4;
              r = 0.62 + t * 0.22;
              g = 0.22 + t * 0.15;
              b = 0.12 + t * 0.08;
            } else {
              const t = (normY - 0.65) / 0.35;
              r = 0.84 + t * 0.14;
              g = 0.42 + t * 0.26;
              b = 0.22 + t * 0.22;
            }
            col.setXYZ(i, r, g, b);
          }
          pos.needsUpdate = true;
          col.needsUpdate = true;
          terrainGeo.computeVertexNormals();
        }

        // Center rover on streamed terrain (wheels flush with ground)
        const centerEl = getMartianElevation(offX, offZ);
        roverGroup.position.set(0, centerEl.localRelY, 0);

        // Dynamic pitch and roll based on local slopes
        const slopeEast = getMartianElevation(offX + 1.2, offZ).localRelY - centerEl.localRelY;
        const slopeNorth = getMartianElevation(offX, offZ - 1.2).localRelY - centerEl.localRelY;
        roverGroup.rotation.x = slopeNorth * 0.35;
        roverGroup.rotation.z = -slopeEast * 0.35;
        roverGroup.rotation.y = -Math.PI / 4;

        // Animate 6 wheels, rocker-bogie oscillation, mastcam scanning, and robotic arm
        roverController.updateAnimation(time, delta, isDriving ? speedMultiplier : 0);

        // Live Odometer update
        const cumulativeDist = Math.round(Math.hypot(offX, offZ) * 40);
        setTraversedMeters(cumulativeDist);

        // Hide fixed-quadrant trajectory tubes and POI beacons while in infinite cruise
        if (trajectoryGroupRef.current) trajectoryGroupRef.current.visible = false;
        if (poiGroupRef.current) poiGroupRef.current.visible = false;
      } else {
        // FIXED SECTOR CALIBRATED MODE (Jezero Crater 3 Paths)
        if (trajectoryGroupRef.current) trajectoryGroupRef.current.visible = true;
        if (poiGroupRef.current) poiGroupRef.current.visible = true;

        if (isDriving && activeRoute && activeRoute.points && activeRoute.points.length > 1) {
          driveProgress = (driveProgress + delta * 0.045) % 1.0;
          const curve = new THREE.CatmullRomCurve3(activeRoute.points);
          const pt = curve.getPointAt(driveProgress);
          const tangent = curve.getTangentAt(driveProgress).normalize();

          // Plant rover wheels squarely on ground (no floating)
          const groundElev = getMartianElevation(pt.x, pt.z).localRelY;
          roverGroup.position.set(pt.x, groundElev, pt.z);

          // Dynamic pitch and roll based on local slopes so chassis rocks realistically
          const slopeEast = getMartianElevation(pt.x + 0.8, pt.z).localRelY - groundElev;
          const slopeNorth = getMartianElevation(pt.x, pt.z - 0.8).localRelY - groundElev;

          const lookTarget = pt.clone().add(tangent);
          lookTarget.y = groundElev;
          roverGroup.lookAt(lookTarget);
          roverGroup.rotateX(slopeNorth * 0.25);
          roverGroup.rotateZ(-slopeEast * 0.25);
        }

        roverController.updateAnimation(time, delta, isDriving ? 1.0 : 0);
      }

      // Pulse POI heads
      poiMeshes.forEach((mesh, idx) => {
        mesh.scale.setScalar(1 + Math.sin(time * 3 + idx) * 0.15);
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeRoute, isDriving]);

  // UPDATE 3D TRAJECTORY TUBES WHEN ACTIVE ROUTE OR WEIGHTS CHANGE
  useEffect(() => {
    if (!trajectoryGroupRef.current) return;
    const group = trajectoryGroupRef.current;
    
    // Clear previous tubes
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    // Helper to build surface-draped holographic trajectory ribbon that hugs Martian contours
    const createDrapedTrajectory = (points, colorHex, radius, opacity = 0.9, isActive = false) => {
      const subGroup = new THREE.Group();

      // Sample along continuous 2D horizontal spline and evaluate exact surface elevation
      // at high resolution (240 samples) so the tube never bridges across holes or dips
      const pts2D = points.map(p => new THREE.Vector2(p.x, p.z));
      const spline2D = new THREE.SplineCurve(pts2D);
      const denseDraped = [];
      const numSteps = 240;

      for (let s = 0; s <= numSteps; s++) {
        const t = s / numSteps;
        const p2 = spline2D.getPoint(t);
        const gY = getMartianElevation(p2.x, p2.y).localRelY + 0.08;
        denseDraped.push(new THREE.Vector3(p2.x, gY, p2.y));
      }

      const curve = new THREE.CatmullRomCurve3(denseDraped);
      const tubeGeo = new THREE.TubeGeometry(curve, 240, radius, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: isActive ? 1.5 : 0.6,
        transparent: true,
        opacity,
        roughness: 0.15
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      subGroup.add(tubeMesh);

      // For active candidate, place subtle holographic waypoint rings flush on ground aligned to slope normal
      if (isActive) {
        const step = Math.max(1, Math.floor(points.length / 8));
        for (let i = 0; i < points.length; i += step) {
          const wp = points[i];
          const gY = getMartianElevation(wp.x, wp.z).localRelY + 0.08;
          const ringGeo = new THREE.RingGeometry(0.35, 0.65, 24);
          ringGeo.rotateX(-Math.PI / 2);
          const ringMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.set(wp.x, gY, wp.z);

          // Align ring to local slope normal so it hugs the incline
          const eps = 0.4;
          const hL = getMartianElevation(wp.x - eps, wp.z).localRelY;
          const hR = getMartianElevation(wp.x + eps, wp.z).localRelY;
          const hD = getMartianElevation(wp.x, wp.z - eps).localRelY;
          const hU = getMartianElevation(wp.x, wp.z + eps).localRelY;
          const norm = new THREE.Vector3(hL - hR, 2 * eps, hD - hU).normalize();
          const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
          ring.quaternion.copy(quat);

          subGroup.add(ring);
        }
      }

      return subGroup;
    };

    // Draw all three candidate paths
    const energyTube = createDrapedTrajectory(
      routesData.energyEfficient.points,
      routesData.energyEfficient.colorHex,
      activeRouteId === 'energy' ? 0.32 : 0.16,
      activeRouteId === 'energy' ? 1.0 : 0.45,
      activeRouteId === 'energy'
    );
    const shortTube = createDrapedTrajectory(
      routesData.shortestDistance.points,
      routesData.shortestDistance.colorHex,
      activeRouteId === 'shortest' ? 0.32 : 0.16,
      activeRouteId === 'shortest' ? 1.0 : 0.45,
      activeRouteId === 'shortest'
    );
    const configTube = createDrapedTrajectory(
      routesData.configuredCost.points,
      routesData.configuredCost.colorHex,
      activeRouteId === 'configured' ? 0.32 : 0.16,
      activeRouteId === 'configured' ? 1.0 : 0.45,
      activeRouteId === 'configured'
    );

    group.add(energyTube);
    group.add(shortTube);
    group.add(configTube);

    // Goal Laser Beacon & Concentric Target Rings (Firmly aligned to terrain)
    const goalPos = routesData.energyEfficient.points[routesData.energyEfficient.points.length - 1];
    const goalGroundY = getMartianElevation(goalPos.x, goalPos.z).localRelY;
    const laserGeo = new THREE.CylinderGeometry(0.12, 0.12, 28, 12);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff2a45, transparent: true, opacity: 0.85 });
    const goalLaser = new THREE.Mesh(laserGeo, laserMat);
    goalLaser.position.set(goalPos.x, goalGroundY + 14, goalPos.z);
    group.add(goalLaser);

    // Sample terrain normal at goal for concentric rings
    const epsG = 0.5;
    const gnL = getMartianElevation(goalPos.x - epsG, goalPos.z).localRelY;
    const gnR = getMartianElevation(goalPos.x + epsG, goalPos.z).localRelY;
    const gnD = getMartianElevation(goalPos.x, goalPos.z - epsG).localRelY;
    const gnU = getMartianElevation(goalPos.x, goalPos.z + epsG).localRelY;
    const goalNormal = new THREE.Vector3(gnL - gnR, 2 * epsG, gnD - gnU).normalize();
    const goalQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), goalNormal);

    [1.0, 2.2, 3.4].forEach((rad, idx) => {
      const ringGeo = new THREE.RingGeometry(rad - 0.12, rad, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff3b52,
        transparent: true,
        opacity: 0.8 - idx * 0.22,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(goalPos.x, goalGroundY + 0.08, goalPos.z);
      ring.quaternion.copy(goalQuat);
      group.add(ring);
    });

  }, [routesData, activeRouteId]);

  // SMOOTH OPACITY TRANSITIONS ACROSS MAP LAYERS
  useEffect(() => {
    // 1. Dynamic Multi-Layer Shading Blend on Terrain Mesh
    if (terrainMeshRef.current) {
      const geo = terrainMeshRef.current.geometry;
      const pos = geo.attributes.position;
      const colors = geo.attributes.color.array;

      const elevAlpha = layerOpacities.elevation;
      const slopeAlpha = layerOpacities.slope;

      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i);
        const vz = pos.getZ(i);
        const vy = pos.getY(i);
        const slope = calculateLocalSlope(vx, vz);

        // A. Natural Base Bedrock / Shaded Relief (-22m to +48m calibrated)
        const normElev = THREE.MathUtils.clamp((vy + 22) / 68, 0, 1);
        const shadeRelief = THREE.MathUtils.clamp((vy + 22) / 65, 0.15, 0.95);
        
        let r = 0.58 * shadeRelief;
        let g = 0.22 * shadeRelief;
        let b = 0.12 * shadeRelief;

        // B. Elevation Hypsometric Tint
        let elevR, elevG, elevB;
        if (normElev < 0.25) {
          elevR = 0.22 + normElev * 0.45;
          elevG = 0.07 + normElev * 0.22;
          elevB = 0.05 + normElev * 0.16;
        } else if (normElev < 0.65) {
          const t = (normElev - 0.25) / 0.4;
          elevR = 0.62 + t * 0.22;
          elevG = 0.22 + t * 0.15;
          elevB = 0.12 + t * 0.08;
        } else {
          const t = (normElev - 0.65) / 0.35;
          elevR = 0.84 + t * 0.14;
          elevG = 0.42 + t * 0.26;
          elevB = 0.22 + t * 0.22;
        }

        // Interpolate Elevation
        r = r * (1 - elevAlpha) + elevR * elevAlpha;
        g = g * (1 - elevAlpha) + elevG * elevAlpha;
        b = b * (1 - elevAlpha) + elevB * elevAlpha;

        // C. Slope Overlay Heatmap (0-5° Green Safe, 5-14° Yellow Caution, >14° Red Hazard)
        let slopeR, slopeG, slopeB;
        if (slope < 6) {
          slopeR = 0.1; slopeG = 0.85; slopeB = 0.2;
        } else if (slope < 14) {
          slopeR = 0.95; slopeG = 0.75; slopeB = 0.1;
        } else {
          slopeR = 0.95; slopeG = 0.1; slopeB = 0.1;
        }

        // Interpolate Slope Overlay
        r = r * (1 - slopeAlpha) + slopeR * slopeAlpha;
        g = g * (1 - slopeAlpha) + slopeG * slopeAlpha;
        b = b * (1 - slopeAlpha) + slopeB * slopeAlpha;

        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
      }
      geo.attributes.color.needsUpdate = true;
    }

    // 2. Geological Feature Labels & Science Target Beacons (Smooth Opacity)
    if (poiGroupRef.current) {
      const lblAlpha = layerOpacities.labels;
      poiGroupRef.current.visible = lblAlpha > 0.02;
      poiGroupRef.current.children.forEach(beacon => {
        beacon.traverse(child => {
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = lblAlpha * 0.9;
          }
        });
      });
    }

    // 3. Contour Lines (Smooth Opacity)
    if (contourMeshRef.current) {
      contourMeshRef.current.material.transparent = true;
      contourMeshRef.current.material.opacity = layerOpacities.contours * 0.35;
      contourMeshRef.current.visible = layerOpacities.contours > 0.02;
    }

    // 4. Coordinate Grid (Smooth Opacity)
    if (gridMeshRef.current) {
      gridMeshRef.current.material.transparent = true;
      gridMeshRef.current.material.opacity = layerOpacities.grid * 0.3;
      gridMeshRef.current.visible = layerOpacities.grid > 0.02;
    }

  }, [layerOpacities]);

  return (
    <section id="terrain-3d" className="py-24 px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl mx-auto select-none">
      <div className="space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-xs font-mono text-orange-400 uppercase tracking-widest">
              <Globe2 className="w-3.5 h-3.5" />
              <span>NASA Space Apps 2026 &bull; Martian Map System</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Interactive 3D Martian <br />
              <span className="bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                Surface Exploration System
              </span>
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Jezero Crater Western Fan DTM with MOLA topographic datum, multi-spectral layers, science targets, and transparent multi-candidate route optimization.
            </p>
          </div>

          {/* Mode Switcher & Map Layers Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Infinite 3D Terrain Mode Button */}
            <button
              onClick={() => setIsInfiniteMode(!isInfiniteMode)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                isInfiniteMode
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white border-orange-400 shadow-lg shadow-orange-600/30'
                  : 'bg-[#0B1020]/90 text-slate-300 border-white/20 hover:border-white/40'
              }`}
              title="Toggle Infinite Continuous Procedural Terrain Generation"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isInfiniteMode ? 'text-amber-300' : 'text-slate-400'}`} />
              <span>{isInfiniteMode ? 'INFINITE 3D TERRAIN: ACTIVE' : 'INFINITE TERRAIN: OFF'}</span>
            </button>

            {/* Real Data vs Simulation Mode Badge */}
            <button
              onClick={() => setIsRealDataMode(!isRealDataMode)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all border cursor-pointer ${
                isRealDataMode
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-950'
                  : 'bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-md shadow-amber-950'
              }`}
              title="Click to toggle between calibrated NASA datasets and procedural simulation mode"
            >
              <span className={`w-2 h-2 rounded-full ${isRealDataMode ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{isRealDataMode ? 'REAL DATA MODE (MOLA/HiRISE)' : 'SIMULATION BENCHMARK'}</span>
            </button>

            {/* Collapsible MAP LAYERS Drawer Toggle */}
            <button
              onClick={() => setLayerDrawerOpen(!layerDrawerOpen)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                layerDrawerOpen
                  ? 'bg-orange-600 text-white border-orange-400 shadow-lg shadow-orange-600/30'
                  : 'bg-[#0B1020]/90 text-slate-200 border-white/20 hover:border-white/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              <span>Map Layer Controls</span>
              {layerDrawerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 3D CANVAS EXPLORATION INTERFACE */}
        <div className="relative rounded-3xl overflow-hidden border border-white/20 bg-[#0B1020] shadow-2xl">
          {/* Main Three.js Container */}
          <div ref={containerRef} className="w-full h-[600px] cursor-grab active:cursor-grabbing" />

          {/* Scale Indicator & North Compass Rose (Upper Right) */}
          <div className="absolute top-4 right-4 z-20 flex flex-col items-end space-y-2 pointer-events-none">
            {/* North Compass Rose */}
            <div className="w-12 h-12 rounded-full bg-[#050813]/85 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shadow-xl">
              <span className="text-[10px] font-mono font-black text-orange-400 leading-none">N</span>
              <Compass className="w-5 h-5 text-slate-300 transform -rotate-12" />
            </div>

            {/* 500m Scale Bar */}
            <div className="bg-[#050813]/85 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl text-[10px] font-mono text-slate-300 shadow-xl flex flex-col items-center">
              <div className="w-20 h-1 bg-white/40 relative">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white" />
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white" />
              </div>
              <span className="mt-1">{isInfiniteMode ? 'Infinite 1.5km Horizon' : '500 meters'}</span>
            </div>

            {/* Orbit / Zoom Hint */}
            <div className="bg-[#050813]/85 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg text-[9px] font-mono text-slate-400">
              Drag to Orbit &bull; Scroll to Zoom
            </div>
          </div>

          {/* Minimap / Region Context Locator (Upper Left HUD) */}
          <div className="absolute top-4 left-4 z-20 bg-[#050813]/90 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl shadow-xl max-w-xs space-y-2.5 pointer-events-none sm:pointer-events-auto">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-white uppercase tracking-wider">
              <span className="flex items-center space-x-1.5">
                <Globe2 className="w-3.5 h-3.5 text-orange-400" />
                <span>{isInfiniteMode ? 'Infinite Terrain Stream' : 'Sector Overview'}</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-normal ${isInfiniteMode ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'text-orange-400'}`}>
                {isInfiniteMode ? 'Endless Mesh' : 'HiRISE DTM'}
              </span>
            </div>

            {/* Graphical HUD Locator */}
            <div className="w-52 h-20 rounded-xl bg-gradient-to-tr from-[#3b120a] via-[#852a14] to-[#c55530] border border-white/10 relative overflow-hidden shadow-inner flex items-center justify-center">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
              <div className="absolute inset-x-4 top-6 bottom-3 border-t-2 border-r-2 border-cyan-400/80 border-dashed rounded-tr-xl" />
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/80 animate-ping absolute top-6 right-10" />
              <div className="w-2 h-2 rounded-full bg-white absolute top-6 right-10" />
              <div className="w-2 h-2 rounded-full bg-red-500 absolute bottom-3 left-6" />
              <span className="absolute bottom-1 right-2 text-[8px] font-mono text-slate-300/80">
                {isInfiniteMode ? 'Infinite Planetary Grid' : 'Jezero Quad 4'}
              </span>
            </div>
            
            <div className="text-[10px] font-mono text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Continuous Traverse:</span>
                <span className="text-orange-400 font-bold">{traversedMeters} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Datum:</span>
                <span className="text-cyan-300">MOLA Aeroid</span>
              </div>
            </div>

            {/* Infinite Speed & Reset Toolbar */}
            {isInfiniteMode && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400 text-[9px] uppercase mr-1">Speed:</span>
                  {[1, 2, 4].map(s => (
                    <button
                      key={s}
                      onClick={() => setInfiniteSpeed(s)}
                      className={`px-2 py-0.5 rounded border ${
                        infiniteSpeed === s
                          ? 'bg-orange-600 text-white border-orange-400 font-bold'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    streamOffsetRef.current = { x: 0, z: 0 };
                    setTraversedMeters(0);
                  }}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10"
                  title="Reset Coordinates back to Jezero Crater Datum"
                >
                  Reset Base
                </button>
              </div>
            )}
          </div>

          {/* DEDICATED MAPLAYERCONTROLS COMPONENT OVERLAY */}
          {layerDrawerOpen && (
            <div className="absolute top-16 right-4 z-30 animate-fade-in max-h-[500px] overflow-y-auto">
              <MapLayerControls
                layerOpacities={layerOpacities}
                onOpacityChange={handleOpacityChange}
                onPresetApply={handlePresetApply}
              />
            </div>
          )}

          {/* LIVE PICKED TERRAIN TELEMETRY BADGE (Bottom-Left HUD) */}
          <div className="absolute bottom-20 left-4 z-20 bg-[#050813]/90 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl shadow-xl max-w-sm text-xs font-mono space-y-1.5 pointer-events-none">
            <div className="flex items-center justify-between text-slate-400 border-b border-white/10 pb-1">
              <span className="font-bold text-orange-400 uppercase">Selected Surface Coordinate</span>
              <span>{pickedTerrain.lat}, {pickedTerrain.lon}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 text-[11px]">
              <div>Elevation: <span className="text-cyan-400 font-bold">{pickedTerrain.elevationM} m</span></div>
              <div>Slope: <span className="text-orange-300 font-bold">{pickedTerrain.slopeDeg}°</span></div>
              <div className="col-span-2 text-slate-300 truncate">Material: <span className="text-white">{pickedTerrain.surfaceType}</span></div>
            </div>
          </div>

          {/* SCIENTIFIC 3-CANDIDATE TRAJECTORY COMPARISON TRAY (Bottom Bar) */}
          <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#050813]/92 backdrop-blur-xl border border-white/20 px-4 py-3 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            {/* Trajectory Selectors or Infinite Mode Active Indicator */}
            <div className="flex flex-wrap items-center gap-2">
              {isInfiniteMode ? (
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span className="font-bold">Infinite Procedural Landscape:</span>
                    <span className="text-white">Active</span>
                  </div>
                  <span className="text-slate-400 text-[11px] hidden sm:inline">
                    Continuous 1.5km horizon &bull; Dynamic FBM dunes, craters & rock fields
                  </span>
                  <button
                    onClick={() => setIsInfiniteMode(false)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] transition-colors cursor-pointer"
                  >
                    View 3 Route Trajectories
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-slate-400 uppercase text-[10px] font-bold mr-1">Candidate Path:</span>

                  {/* 1. Energy-Efficient */}
                  <button
                    onClick={() => setActiveRouteId('energy')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 border cursor-pointer ${
                      activeRouteId === 'energy'
                        ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-900/50 font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span>Energy-Efficient ({routesData.energyEfficient.metrics.totalDistanceM}m &bull; {routesData.energyEfficient.metrics.wattHours}Wh)</span>
                  </button>

                  {/* 2. Shortest-Distance */}
                  <button
                    onClick={() => setActiveRouteId('shortest')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 border cursor-pointer ${
                      activeRouteId === 'shortest'
                        ? 'bg-fuchsia-950/80 border-fuchsia-400 text-fuchsia-300 shadow-md shadow-fuchsia-900/50 font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400" />
                    <span>Shortest ({routesData.shortestDistance.metrics.totalDistanceM}m &bull; {routesData.shortestDistance.metrics.wattHours}Wh)</span>
                  </button>

                  {/* 3. Lowest-Configured-Cost */}
                  <button
                    onClick={() => setActiveRouteId('configured')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 border cursor-pointer ${
                      activeRouteId === 'configured'
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-900/50 font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span>Configured Cost ({routesData.configuredCost.metrics.totalDistanceM}m)</span>
                  </button>
                </>
              )}
            </div>

            {/* Trajectory Controls & Inspector Launcher */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsDriving(!isDriving)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                  isDriving
                    ? 'bg-orange-600 text-white border-orange-400 shadow-md shadow-orange-600/30'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:text-white'
                }`}
              >
                {isDriving ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isDriving ? 'Pause Drive' : 'Drive Rover'}</span>
              </button>

              <button
                onClick={() => setSelectedRouteForInspector(activeRoute)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold border border-white/20 transition-all cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-orange-400" />
                <span>Elevation & Weights</span>
              </button>

              <button
                onClick={() => setIsSaveModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold uppercase tracking-wider border border-orange-400/40 shadow-lg shadow-orange-600/30 transition-all hover:scale-105 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Mission</span>
              </button>
            </div>
          </div>
        </div>

        {/* DATA SOURCE ATTRIBUTION FOOTER (Authoritative NASA Citations) */}
        <div className="bg-[#0B1020]/90 border border-white/15 p-6 rounded-3xl backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-left">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center space-x-2 text-xs font-mono uppercase text-orange-400 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>NASA Planetary Data System (PDS) & Bull; Open Science Baseline</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Topography calibrated against MGS MOLA MEGDR and MRO HiRISE DTM (Product PSP_001414_1780 Jezero Crater Fan). In-situ atmospheric data sourced from Perseverance MEDA weather archive.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0 text-xs font-mono">
            <a
              href="https://pds-geosciences.wustl.edu/missions/mgs/mola.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
            >
              <span>MOLA Archive</span>
              <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
            </a>
            <a
              href="https://hirise.lpl.arizona.edu/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
            >
              <span>HiRISE Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
            </a>
          </div>
        </div>
      </div>

      {/* ROUTE INSPECTOR MODAL */}
      {selectedRouteForInspector && (
        <RouteInspectorModal
          route={selectedRouteForInspector}
          userWeights={userWeights}
          onWeightChange={handleWeightChange}
          onClose={() => setSelectedRouteForInspector(null)}
          isRealDataMode={isRealDataMode}
        />
      )}

      {/* SCIENCE POI MODAL */}
      {selectedPOI && (
        <SciencePOIModal
          poi={selectedPOI}
          onClose={() => setSelectedPOI(null)}
        />
      )}

      {/* SAVE MISSION MODAL (Firestore Cloud Persistence) */}
      <SaveMissionModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        initialData={{
          title: `Jezero Traverse (${activeRoute?.name || 'Scientific Route'})`,
          routeType: activeRoute?.name || 'Scientific Route',
          distanceM: activeRoute?.metrics?.totalDistanceM || 1200,
          energyWh: activeRoute?.metrics?.wattHours || 450,
          notes: `Waypoints: ${activeRoute?.points?.length || activeRoute?.path?.length || 0}. Max Slope: ${activeRoute?.metrics?.maxSlopeDeg || 0}°. Surface: ${activeRoute?.metrics?.hazardSummary || 'Regolith'}.`
        }}
        onSuccess={() => {
          if (onOpenMissions) onOpenMissions();
        }}
      />
    </section>
  );
}
