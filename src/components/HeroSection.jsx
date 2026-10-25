import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Rocket, ArrowRight, ShieldCheck, Eye, Compass, Info, X, ChevronDown, Camera, RotateCcw } from 'lucide-react';
import { createMarsPlanetaryTextures, createMartianGroundPBRTextures, createRealisticMartianBoulder, createMassiveMartianMonolith, createStratifiedRockSlab } from '../utils/marsTextures';
import { createDetailedMarsRover } from '../utils/roverModel';

export default function HeroSection({ setActiveSection }) {
  const containerRef = useRef(null);
  const [selectedObject, setSelectedObject] = useState(null); // 'rover' or marker
  const [cameraMode, setCameraMode] = useState('cinematic'); // 'cinematic', 'rover', 'planet'
  const [hoveredObject, setHoveredObject] = useState(null);

  // References for animation controls
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef({
    targetCamPos: new THREE.Vector3(12, 8, 22),
    targetLookAt: new THREE.Vector3(0, 2, 0),
    isDragging: false,
    prevMouse: { x: 0, y: 0 },
    orbitAngles: { theta: 0.35, phi: 0.25 },
    orbitDist: 26
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. SCENE & CAMERA
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x050813, 0.007);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 2000);
    cameraRef.current = camera;
    
    // Initial intro position (approaching from orbit)
    camera.position.set(35, 45, 90);
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. LIGHTING (NASA Martian Solar Rig)
    const ambientLight = new THREE.AmbientLight(0x351812, 1.9); // Warm iron-oxide ground bounce
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffb894, 4.2); // Distant pale Sun
    sunLight.position.set(120, 95, 70);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Rim / Back light for Mars atmospheric silhouette
    const atmosphericRim = new THREE.DirectionalLight(0x1d4e78, 1.8);
    atmosphericRim.position.set(-90, 50, -90);
    scene.add(atmosphericRim);

    // 3. BACKGROUND STARS & DUST
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starCoords = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starCoords[i] = (Math.random() - 0.5) * 1200;
      starCoords[i + 1] = Math.random() * 600 - 100;
      starCoords[i + 2] = (Math.random() - 0.5) * 1200;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.2,
      transparent: true,
      opacity: 0.8
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 4. PLANETARY 3D MARS SPHERE (Massive textured body in backdrop)
    const marsGroup = new THREE.Group();
    const marsRadius = 45;
    const marsGeo = new THREE.SphereGeometry(marsRadius, 72, 72);

    const { albedoTexture: marsAlbedo, bumpTexture: marsBump } = createMarsPlanetaryTextures();
    const marsMat = new THREE.MeshStandardMaterial({
      map: marsAlbedo,
      bumpMap: marsBump,
      bumpScale: 0.18,
      roughness: 0.88,
      metalness: 0.08
    });

    const marsSphere = new THREE.Mesh(marsGeo, marsMat);
    marsSphere.castShadow = false;
    marsSphere.receiveShadow = false;
    marsGroup.add(marsSphere);

    // Atmospheric Glow Shell (Fresnel atmosphere illusion)
    const atmosGeo = new THREE.SphereGeometry(marsRadius * 1.035, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0xff6642,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide
    });
    const atmosSphere = new THREE.Mesh(atmosGeo, atmosMat);
    marsGroup.add(atmosSphere);

    // Position Mars high in upper background
    marsGroup.position.set(38, 22, -95);
    marsGroup.rotation.z = -0.44; // Axial tilt (Mars is 25.2°)
    scene.add(marsGroup);

    // 5. ROCKY MARTIAN FOREGROUND TERRAIN (Actual 3D Geometry with Big Depths & Mountains)
    const terrainSize = 110;
    const terrainSegments = 100;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const getHeroTerrainY = (vx, vz) => {
      let vy = 0;
      // Multi-octave natural terrain relief (ridges, slopes, wind ripples)
      vy += Math.sin(vx * 0.045) * Math.cos(vz * 0.045) * 3.5;
      vy += Math.sin(vx * 0.11 + 1.2) * Math.sin(vz * 0.09 - 0.7) * 1.8;

      // Flatten an access roadway under rover path (around x: 1.5, z: 3.5)
      const distToRover = Math.hypot(vx - 1.5, vz - 3.5);
      if (distToRover < 8) {
        vy *= (distToRover / 8);
      }

      // "Big Big Depths & Holes": Prominent Martian Impact Crater in midground right (x: 20, z: 12)
      const craterDist = Math.hypot(vx - 20, vz - 12);
      if (craterDist < 16) {
        const cNorm = craterDist / 16;
        vy -= Math.cos(cNorm * Math.PI * 0.5) * 8.5; // deep depression
      }

      // "Big Big Mountains": Towering Crater Rim Mountain Massif in background (vz < -8)
      if (vz < -8) {
        const rimDist = Math.abs(vz + 28);
        const rimPeaks = Math.sin(vx * 0.14) * 3.5;
        vy += Math.exp(-Math.pow(rimDist / 12, 2)) * 18.5 + rimPeaks * Math.max(0, 1 - rimDist / 20);
      }

      return vy;
    };

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      pos.setY(i, getHeroTerrainY(vx, vz));
    }
    terrainGeo.computeVertexNormals();

    const { albedoTexture: groundAlbedo, normalTexture: groundNormal, roughnessTexture: groundRoughness } = createMartianGroundPBRTextures();
    const terrainMat = new THREE.MeshStandardMaterial({
      map: groundAlbedo,
      normalMap: groundNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: groundRoughness,
      roughness: 0.92,
      metalness: 0.06,
      flatShading: false
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    const terrainBaseY = -2.5;
    terrainMesh.position.set(0, terrainBaseY, 0);
    scene.add(terrainMesh);

    // 6. SCATTERED 3D REALISTIC BOULDERS FIRMLY EMBEDDED IN TERRAIN (ZERO FLOATING)
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x521f14,
      roughness: 0.94,
      metalness: 0.08,
      flatShading: false
    });

    const rocksGroup = new THREE.Group();

    // Helper to position and orient rocks solidly flush on the terrain surface
    const addGroundedRock = (geometry, rx, rz, customRot = 0) => {
      // Calculate true world ground elevation at (rx, rz)
      const surfaceY = terrainBaseY + getHeroTerrainY(rx, rz);
      const rock = new THREE.Mesh(geometry, rockMat);
      rock.position.set(rx, surfaceY, rz);

      // Align rock orientation to local ground slope normal so no corners float on inclines
      const eps = 0.5;
      const nX = (getHeroTerrainY(rx - eps, rz) - getHeroTerrainY(rx + eps, rz)) / (2 * eps);
      const nZ = (getHeroTerrainY(rx, rz - eps) - getHeroTerrainY(rx, rz + eps)) / (2 * eps);
      const normal = new THREE.Vector3(nX, 1.0, nZ).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);
      rock.quaternion.copy(quat);
      rock.rotateY(customRot || Math.random() * Math.PI * 2);

      rock.castShadow = true;
      rock.receiveShadow = true;
      rocksGroup.add(rock);
    };

    // A. "Stones Big Big": Colossal Monoliths perched on mountain ridge and crater rim (6 pieces)
    const monolithCoords = [
      { x: -18, z: -22, s: 3.8 },
      { x: 12, z: -26, s: 4.2 },
      { x: 30, z: -18, s: 3.5 },
      { x: -28, z: -10, s: 3.2 },
      { x: 26, z: 20, s: 3.0 },
      { x: -22, z: 16, s: 2.8 }
    ];
    monolithCoords.forEach((coord, idx) => {
      const geo = createMassiveMartianMonolith(coord.s, idx * 29 + 17);
      addGroundedRock(geo, coord.x, coord.z);
    });

    // B. Large Stratified Rock Slabs (8 pieces)
    const slabCoords = [
      { x: 16, z: 4, s: 2.2 },
      { x: -10, z: -8, s: 2.5 },
      { x: 24, z: 6, s: 2.0 },
      { x: -14, z: 8, s: 1.8 },
      { x: 8, z: -16, s: 2.4 },
      { x: -6, z: 14, s: 2.1 },
      { x: 28, z: -4, s: 2.3 },
      { x: -32, z: 4, s: 2.0 }
    ];
    slabCoords.forEach((coord, idx) => {
      const geo = createStratifiedRockSlab(coord.s, idx * 37 + 55);
      addGroundedRock(geo, coord.x, coord.z);
    });

    // C. Weathered Boulders & Scree (38 pieces across the terrain)
    for (let i = 0; i < 38; i++) {
      const rSize = 0.5 + Math.random() * 1.2;
      const rx = (Math.random() - 0.5) * 80;
      const rz = (Math.random() - 0.5) * 80;

      // Keep clearance around the rover's staging area
      if (Math.hypot(rx - 1.5, rz - 3.5) < 5.0) continue;

      const rockGeo = createRealisticMartianBoulder(rSize, i * 43);
      addGroundedRock(rockGeo, rx, rz, i * 1.1);
    }

    scene.add(rocksGroup);

    // 7. DETAILED 3D MARS ROVER (Firmly seated on ground)
    const { roverRoot, updateAnimation } = createDetailedMarsRover();
    roverRoot.scale.set(1.15, 1.15, 1.15);
    const roverGroundY = terrainBaseY + getHeroTerrainY(1.5, 3.5);
    roverRoot.position.set(1.5, roverGroundY, 3.5);
    roverRoot.rotation.y = -0.55; // Angled nicely toward camera
    scene.add(roverRoot);

    // 8. INTERACTIVE 3D WAYPOINT & TERRAIN MARKERS
    const waypoints = [
      {
        id: 'rover',
        name: 'Perseverance Rover (M2020)',
        pos: new THREE.Vector3(1.5, 1.2, 3.5),
        type: 'rover',
        color: 0x00f0ff,
        title: 'NASA Perseverance Exploration Rover',
        desc: 'Autonomous robotic explorer equipped with Mastcam-Z, PIXL, RIMFAX subsurface radar, and MOXIE oxygen generation system.'
      },
      {
        id: 'wp1',
        name: 'Waypoint Alpha',
        pos: new THREE.Vector3(-14, -0.8, -8),
        type: 'waypoint',
        color: 0x39ff14,
        title: 'Jezero Delta Front Outcrop',
        desc: 'Clay-bearing sediment delta. Primary target for astrobiological biosignature analysis. Slope hazard: 3.2° (Low Risk).'
      },
      {
        id: 'wp2',
        name: 'Hazard Zone',
        pos: new THREE.Vector3(16, -0.6, -14),
        type: 'hazard',
        color: 0xff3b52,
        title: 'Megaripple Sand Dune Field',
        desc: 'Loose drift sand with high wheel sinkage factor. Classified as impassable (Traversability Cost: ∞).'
      }
    ];

    const markerGroup = new THREE.Group();
    const markerMeshes = [];

    waypoints.forEach(wp => {
      // Pin stem
      const stemGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 12);
      const stemMat = new THREE.MeshBasicMaterial({ color: wp.color, transparent: true, opacity: 0.8 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.copy(wp.pos);
      stem.position.y += 1.4;

      // Floating beacon head
      const headGeo = new THREE.SphereGeometry(0.42, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({
        color: wp.color,
        emissive: wp.color,
        emissiveIntensity: 0.9,
        roughness: 0.2
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.copy(wp.pos);
      head.position.y += 2.8;
      head.userData = wp;

      markerGroup.add(stem);
      markerGroup.add(head);
      markerMeshes.push(head);
    });
    scene.add(markerGroup);

    // Glowing Waypoint Trajectory Line on ground
    const pathPoints = [
      new THREE.Vector3(1.5, -2.3, 3.5),
      new THREE.Vector3(-4, -2.1, 0),
      new THREE.Vector3(-9, -2.0, -4),
      new THREE.Vector3(-14, -1.9, -8)
    ];
    const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
    const pathGeo = new THREE.TubeGeometry(pathCurve, 40, 0.16, 8, false);
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.85
    });
    const trajectoryLine = new THREE.Mesh(pathGeo, pathMat);
    scene.add(trajectoryLine);

    // 9. DUST PARTICLES AROUND ROVER WHEELS
    const dustCount = 80;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 6 + 1.5;
      dustPos[i + 1] = Math.random() * 1.5 - 2.2;
      dustPos[i + 2] = (Math.random() - 0.5) * 6 + 3.5;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xdf8458,
      size: 0.45,
      transparent: true,
      opacity: 0.55
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    // 10. INTERACTIVE RAYCASTING FOR ROVER & MARKERS
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Cursor parallax on controls
      controlsRef.current.orbitAngles.theta += (mouse.x * 0.05 - (controlsRef.current.orbitAngles.theta - 0.35)) * 0.02;

      // Raycast checks
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([...markerMeshes, roverRoot], true);

      if (intersects.length > 0) {
        let topObj = intersects[0].object;
        let foundData = null;

        while (topObj && !foundData) {
          if (topObj.userData && topObj.userData.title) {
            foundData = topObj.userData;
          } else if (topObj.name === 'MarsRover') {
            foundData = waypoints[0]; // Rover
          }
          topObj = topObj.parent;
        }

        if (foundData) {
          setHoveredObject(foundData);
          renderer.domElement.style.cursor = 'pointer';
        } else {
          setHoveredObject(null);
          renderer.domElement.style.cursor = 'default';
        }
      } else {
        setHoveredObject(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handlePointerDown = (e) => {
      // Only drag if left click
      if (e.button !== 0) return;
      controlsRef.current.isDragging = true;
      controlsRef.current.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handleDragMove = (e) => {
      if (!controlsRef.current.isDragging) return;
      const dx = e.clientX - controlsRef.current.prevMouse.x;
      const dy = e.clientY - controlsRef.current.prevMouse.y;

      controlsRef.current.orbitAngles.theta -= dx * 0.005;
      controlsRef.current.orbitAngles.phi = Math.max(
        0.05,
        Math.min(0.85, controlsRef.current.orbitAngles.phi + dy * 0.004)
      );

      controlsRef.current.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e) => {
      controlsRef.current.isDragging = false;

      // Handle click selection
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([...markerMeshes, roverRoot], true);
      if (intersects.length > 0) {
        let topObj = intersects[0].object;
        let clickedData = null;
        while (topObj && !clickedData) {
          if (topObj.userData && topObj.userData.title) {
            clickedData = topObj.userData;
          } else if (topObj.name === 'MarsRover') {
            clickedData = waypoints[0];
          }
          topObj = topObj.parent;
        }
        if (clickedData) {
          setSelectedObject(clickedData);
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointermove', handlePointerMove);
    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handleDragMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 11. ANIMATION LOOP
    const clock = new THREE.Clock();
    let animId;
    let introProgress = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Intro Camera Swoop (Smooth ease-in from orbit to rover composition)
      if (introProgress < 1.0) {
        introProgress += delta * 0.45;
        const t = Math.min(1.0, introProgress);
        const ease = t * (2 - t); // ease-out
        camera.position.lerpVectors(new THREE.Vector3(35, 45, 90), controlsRef.current.targetCamPos, ease);
        camera.lookAt(controlsRef.current.targetLookAt);
      } else {
        // Continuous Cinematic Camera Orbit
        if (cameraMode === 'cinematic') {
          const theta = controlsRef.current.orbitAngles.theta + Math.sin(time * 0.2) * 0.08;
          const phi = controlsRef.current.orbitAngles.phi + Math.cos(time * 0.18) * 0.04;
          const dist = controlsRef.current.orbitDist;

          const cx = Math.sin(theta) * Math.cos(phi) * dist;
          const cy = Math.sin(phi) * dist + 4.0;
          const cz = Math.cos(theta) * Math.cos(phi) * dist;

          camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.05);
          camera.lookAt(controlsRef.current.targetLookAt);
        } else if (cameraMode === 'rover') {
          // Close-up follow angle on rover
          const roverPos = roverRoot.position;
          camera.position.lerp(new THREE.Vector3(roverPos.x + 5.5, roverPos.y + 3.2, roverPos.z + 7.5), 0.06);
          camera.lookAt(roverPos.x, roverPos.y + 1.2, roverPos.z);
        } else if (cameraMode === 'planet') {
          // High orbital viewpoint focusing on planetary Mars
          camera.position.lerp(new THREE.Vector3(25, 30, 45), 0.05);
          camera.lookAt(marsGroup.position.x * 0.6, marsGroup.position.y * 0.8, marsGroup.position.z * 0.6);
        }
      }

      // Rotate Mars planetary body
      marsSphere.rotation.y += delta * 0.025;
      atmosSphere.rotation.y += delta * 0.028;

      // Animate rover systems (wheels, suspension, mast head, arm)
      updateAnimation(time, delta, 1.0);

      // Pulse waypoints
      markerMeshes.forEach((mesh, idx) => {
        mesh.scale.setScalar(1 + Math.sin(time * 3 + idx) * 0.15);
      });

      // Drift dust particles
      dustParticles.rotation.y = time * 0.08;

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('pointermove', handlePointerMove);
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handleDragMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [cameraMode]);

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden select-none">
      {/* FULL-VIEWPORT 3D CANVAS */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing" />

      {/* Atmospheric Vignette & Contrast Gradients (Keeps typography crystal-clear without flat cards) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050813] via-transparent to-[#050813]/70 pointer-events-none z-10" />
      <div className="absolute inset-y-0 left-0 w-full lg:w-3/5 bg-gradient-to-r from-[#050813]/90 via-[#050813]/50 to-transparent pointer-events-none z-10" />

      {/* FLOATING HOVER RETICLE TOOLTIP */}
      {hoveredObject && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fade-in bg-[#0B1020]/90 backdrop-blur-md border border-orange-500/50 px-4 py-2 rounded-xl text-xs font-mono text-orange-300 shadow-xl flex items-center space-x-2">
          <Eye className="w-4 h-4 text-orange-400 animate-pulse" />
          <span>{hoveredObject.title} • CLICK TO INSPECT</span>
        </div>
      )}

      {/* CAMERA VIEWPORT MODE SELECTOR */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center space-x-2 bg-[#0B1020]/80 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-2xl">
        <span className="text-[10px] font-mono uppercase text-slate-400 px-2 flex items-center space-x-1">
          <Camera className="w-3 h-3 text-orange-400" />
          <span>View:</span>
        </span>
        <button
          onClick={() => setCameraMode('cinematic')}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
            cameraMode === 'cinematic' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          Cinematic
        </button>
        <button
          onClick={() => setCameraMode('rover')}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
            cameraMode === 'rover' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          Rover Cam
        </button>
        <button
          onClick={() => setCameraMode('planet')}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
            cameraMode === 'planet' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30' : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          Orbit View
        </button>
      </div>

      {/* HERO TEXT & INTERACTIVE BRANDING OVERLAY */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-20 pt-28 pb-16 pointer-events-none">
        <div className="max-w-2xl space-y-7 pointer-events-auto text-left">
          {/* Top Label with Unique Micro Radar Sweep */}
          <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:border-cyan-400/40 backdrop-blur-md transition-colors">
            {/* Unique Micro Radar Sweep Scanner (Replaces generic blinking dot) */}
            <div className="relative w-3.5 h-3.5 rounded-full border border-cyan-400/50 bg-[#040814] flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_6px_rgba(0,218,243,0.35)]">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-px bg-cyan-400/25" />
                <div className="h-full w-px bg-cyan-400/25 absolute" />
              </div>
              <div className="absolute inset-0 rounded-full animate-spin [animation-duration:2.5s] bg-[conic-gradient(from_0deg,_transparent_0deg,_transparent_270deg,_rgba(0,218,243,0.85)_360deg)]" />
              <div className="relative w-1 h-1 rounded-full bg-cyan-300" />
            </div>

            {/* Simple Clean Title */}
            <span className="text-xs font-mono tracking-widest uppercase text-slate-200 font-semibold">
              MARSNAV • AI TERRAIN INTELLIGENCE
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.04]">
              Navigate the <br />
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-amber-300 bg-clip-text text-transparent">
                Unknown.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-200 font-medium leading-relaxed max-w-xl">
              Explore the red planet with AI-powered terrain intelligence and cost-aware autonomous rover navigation.
            </p>
          </div>

          {/* Supporting Text */}
          <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
            Real-time pixel-level segmentation from rover navigation cameras coupled with dynamic A* graph search across Martian elevation grids.
          </p>

          {/* Working Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => scrollTo('overview')}
              className="flex items-center space-x-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold text-sm tracking-wider uppercase shadow-2xl shadow-orange-600/40 hover:shadow-orange-500/60 hover:scale-105 active:scale-95 transition-all border border-orange-400/40"
            >
              <Rocket className="w-4 h-4" />
              <span>Explore the Mission</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
            <button
              onClick={() => scrollTo('route-planner')}
              className="flex items-center space-x-3 px-7 py-4 rounded-2xl bg-[#0B1020]/90 hover:bg-[#121932] text-slate-200 hover:text-white font-semibold text-sm tracking-wider uppercase border border-white/20 backdrop-blur-xl transition-all hover:scale-105 active:scale-95 shadow-xl"
            >
              <Compass className="w-4 h-4 text-orange-400" />
              <span>Launch Navigation</span>
            </button>
          </div>

          {/* Live Telemetry Pill */}
          <div className="pt-6 border-t border-white/10 flex items-center space-x-6 text-xs font-mono text-slate-400">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-200">Autonomous Drive: ENGAGED</span>
            </div>
            <div>Jezero Crater Sector 4</div>
            <div className="hidden sm:block text-orange-400">Drag to Orbit 3D Scene &bull; Click Objects</div>
          </div>
        </div>
      </div>

      {/* 3D OBJECT INSPECTION MODAL (When clicking Rover or Waypoint) */}
      {selectedObject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-lg w-full bg-[#0B1020] border border-orange-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
            <button
              onClick={() => setSelectedObject(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange-400">3D Telemetry Inspection</span>
                <h3 className="text-xl font-bold text-white">{selectedObject.title}</h3>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedObject.desc}
            </p>

            {/* Rover-Specific Subsystem Breakdown */}
            {selectedObject.type === 'rover' && (
              <div className="space-y-3 pt-2 border-t border-white/10">
                <span className="text-xs font-mono uppercase text-slate-400">Key Subsystems & Specifications:</span>
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="text-orange-400 block font-bold">Mastcam-Z Head</span>
                    <span className="text-slate-300">Dual stereo 3:1 optical zoom multispectral camera</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="text-orange-400 block font-bold">5-DOF Robotic Arm</span>
                    <span className="text-slate-300">Carries coring drill, PIXL, & SHERLOC spectrometers</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="text-orange-400 block font-bold">110W MMRTG Power</span>
                    <span className="text-slate-300">Plutonium-238 decay with radial convection cooling fins</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <span className="text-orange-400 block font-bold">Rocker-Bogie 6WD</span>
                    <span className="text-slate-300">Titanium chevron cleats, 0.16 km/h nominal traversal</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedObject(null)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30"
              >
                Close Telemetry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Scroll Indicator */}
      <div
        onClick={() => scrollTo('overview')}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center space-y-1.5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Scroll to Explore</span>
        <ChevronDown className="w-4 h-4 text-orange-400 animate-bounce" />
      </div>
    </section>
  );
}
