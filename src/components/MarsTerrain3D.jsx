import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, PanelLeftOpen, PanelRightOpen, Eye, EyeOff } from 'lucide-react';
import { createDetailedMarsRover } from '../utils/roverModel';

export default function MarsTerrain3D({ onOpenMissions }) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  useEffect(() => {
    const container = document.getElementById('threejs-container-ANIMATION_5');
    if (!container || container.dataset.initialized === 'true') return;
    container.dataset.initialized = 'true';

    container.innerHTML = '';

    const initThree = () => {
      if (!window.THREE) {
        const script = document.createElement('script');
        script.src = 'https://ajax.googleapis.com/ajax/libs/threejs/r125/three.min.js';
        script.onload = () => runSimulation();
        document.head.appendChild(script);
      } else {
        runSimulation();
      }
    };

    const runSimulation = () => {
      const THREE = window.THREE;
      if (!THREE || !container) return;

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x180905);
      scene.fog = new THREE.FogExp2(0xc85929, 0.0075);

      const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1200);
      camera.position.set(32, 20, 42);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      container.appendChild(renderer.domElement);

      // Lighting
      const sunLight = new THREE.DirectionalLight(0xffecd0, 3.8);
      sunLight.position.set(65, 42, -50);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 260;
      const d = 75;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0004;
      scene.add(sunLight);

      const ambientLight = new THREE.AmbientLight(0x6e2814, 1.35);
      scene.add(ambientLight);

      const hemiLight = new THREE.HemisphereLight(0xfa8d52, 0x1a0602, 1.1);
      scene.add(hemiLight);

      // Terrain Elevation Function
      const terrainSize = 220;
      const terrainSegments = 220;
      const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
      terrainGeo.rotateX(-Math.PI / 2);

      function getMarsElevation(x, z) {
        let y = Math.sin(x * 0.028) * Math.cos(z * 0.024) * 4.6;
        y += Math.cos(x * 0.015 - z * 0.018) * 3.2;
        y += Math.sin(x * 0.075 + z * 0.045) * 1.35;
        y += Math.cos(x * 0.05 - z * 0.08) * 1.1;

        const duneCoord = x * 0.45 + z * 0.28;
        y += Math.sin(duneCoord) * 0.22;

        const crater1Dist = Math.hypot(x + 24, z - 12);
        if (crater1Dist < 18) {
          const t = crater1Dist / 18;
          y -= (Math.cos(t * Math.PI) + 1.0) * 3.4;
          y += Math.sin(t * Math.PI * 2) * 0.85;
        }

        const crater2Dist = Math.hypot(x - 30, z + 22);
        if (crater2Dist < 24) {
          const t2 = crater2Dist / 24;
          y -= (Math.cos(t2 * Math.PI) + 1.0) * 4.2;
          y += Math.sin(t2 * Math.PI * 2) * 1.1;
        }

        y += Math.sin(x * 0.8) * Math.sin(z * 0.8) * 0.06;
        return y;
      }

      const posAttr = terrainGeo.attributes.position;
      const colorAttr = [];
      const colIronLow = new THREE.Color(0x6e210b);
      const colHematite = new THREE.Color(0x993514);
      const colOchre = new THREE.Color(0xbf491b);
      const colSunLit = new THREE.Color(0xe26a2c);
      const colRimSand = new THREE.Color(0xf2914b);

      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        const vy = getMarsElevation(vx, vz);
        posAttr.setY(i, vy);

        const normY = (vy + 6.0) / 16.0;
        const col = new THREE.Color().lerpColors(colIronLow, colOchre, Math.min(Math.max(normY, 0), 1));
        if (vy > 0.8) col.lerp(colSunLit, 0.5);
        if (vy > 3.0) col.lerp(colRimSand, 0.45);

        const noise = (Math.sin(vx * 1.7) * Math.cos(vz * 1.7)) * 0.04;
        col.r += noise;
        col.g += noise * 0.7;

        colorAttr.push(col.r, col.g, col.b);
      }

      terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colorAttr, 3));
      terrainGeo.computeVertexNormals();

      const canvasTex = document.createElement('canvas');
      canvasTex.width = 512;
      canvasTex.height = 512;
      const ctx = canvasTex.getContext('2d');
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 512, 512);
      const imgData = ctx.getImageData(0, 0, 512, 512);
      const dArr = imgData.data;
      for (let i = 0; i < dArr.length; i += 4) {
        const val = 128 + (Math.random() - 0.5) * 65;
        dArr[i] = val;
        dArr[i + 1] = val;
        dArr[i + 2] = val;
        dArr[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      const marsNoiseTex = new THREE.CanvasTexture(canvasTex);
      marsNoiseTex.wrapS = THREE.RepeatWrapping;
      marsNoiseTex.wrapT = THREE.RepeatWrapping;
      marsNoiseTex.repeat.set(36, 36);

      const terrainMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.88,
        metalness: 0.12,
        bumpMap: marsNoiseTex,
        bumpScale: 0.08,
        flatShading: false
      });
      const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
      terrainMesh.receiveShadow = true;
      scene.add(terrainMesh);

      // Horizon rim backdrop
      const horizonGeo = new THREE.CylinderGeometry(150, 150, 42, 64, 8, true);
      const horizonMat = new THREE.MeshBasicMaterial({ color: 0x9e3814, side: THREE.BackSide, transparent: true, opacity: 0.45 });
      const horizonMesh = new THREE.Mesh(horizonGeo, horizonMat);
      horizonMesh.position.y = 12;
      scene.add(horizonMesh);

      // Boulders
      const rockGroup = new THREE.Group();
      const rockGeo = new THREE.DodecahedronGeometry(1, 1);
      const rockMats = [
        new THREE.MeshStandardMaterial({ color: 0x822912, roughness: 0.94, metalness: 0.06, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x5a1a0c, roughness: 0.92, metalness: 0.15, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0xaa421e, roughness: 0.88, metalness: 0.08, flatShading: true })
      ];

      for (let i = 0; i < 160; i++) {
        const mat = rockMats[i % rockMats.length];
        const rock = new THREE.Mesh(rockGeo, mat);
        const rx = (Math.random() - 0.5) * 140;
        const rz = (Math.random() - 0.5) * 140;
        const ry = getMarsElevation(rx, rz);
        const scaleBase = 0.2 + Math.random() * 1.1;
        const sx = scaleBase * (0.8 + Math.random() * 0.6);
        const sy = scaleBase * (0.45 + Math.random() * 0.55);
        const sz = scaleBase * (0.8 + Math.random() * 0.6);

        rock.scale.set(sx, sy, sz);
        rock.position.set(rx, ry + sy * 0.35, rz);
        rock.rotation.set(Math.random() * 0.6, Math.random() * Math.PI * 2, Math.random() * 0.6);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rockGroup.add(rock);
      }
      scene.add(rockGroup);

      // Atmospheric Dust Particles
      const atmosDustCount = 350;
      const atmosDustGeo = new THREE.BufferGeometry();
      const atmosDustPos = new Float32Array(atmosDustCount * 3);
      const atmosDustVels = [];

      for (let i = 0; i < atmosDustCount; i++) {
        atmosDustPos[i * 3] = (Math.random() - 0.5) * 120;
        atmosDustPos[i * 3 + 1] = 0.5 + Math.random() * 18;
        atmosDustPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
        atmosDustVels.push({
          vx: 0.4 + Math.random() * 0.6,
          vy: (Math.random() - 0.5) * 0.15,
          vz: 0.2 + Math.random() * 0.3
        });
      }
      atmosDustGeo.setAttribute('position', new THREE.BufferAttribute(atmosDustPos, 3));
      const atmosDustMat = new THREE.PointsMaterial({
        color: 0xe57e45,
        size: 0.5,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
      });
      const atmosDustParticles = new THREE.Points(atmosDustGeo, atmosDustMat);
      scene.add(atmosDustParticles);

      // Hazards
      const hazards = [
        { x: -14, z: 4, radius: 2.4 },
        { x: 6, z: -12, radius: 3.2 },
        { x: 16, z: 14, radius: 3.6 },
        { x: -8, z: 24, radius: 2.8 },
        { x: 28, z: -6, radius: 3.4 }
      ];

      const hazardMeshGroup = new THREE.Group();
      hazards.forEach(h => {
        const hy = getMarsElevation(h.x, h.z) + 0.16;
        const ringGeo = new THREE.RingGeometry(h.radius * 0.72, h.radius, 36);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, side: THREE.DoubleSide, transparent: true, opacity: 0.78 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(h.x, hy, h.z);
        hazardMeshGroup.add(ring);

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(h.x, hy, h.z),
          new THREE.Vector3(h.x, hy + 5.2, h.z)
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xff453a, transparent: true, opacity: 0.85 });
        const beacon = new THREE.Line(lineGeo, lineMat);
        hazardMeshGroup.add(beacon);
      });
      scene.add(hazardMeshGroup);

      // --- PERFECT STRAIGHT LINE TRAJECTORY VECTOR (X Axis from -45 to +45) ---
      const straightStart = new THREE.Vector3(-45, 0, 0);
      const straightEnd = new THREE.Vector3(45, 0, 0);
      straightStart.y = getMarsElevation(straightStart.x, straightStart.z);
      straightEnd.y = getMarsElevation(straightEnd.x, straightEnd.z);

      const altStart = new THREE.Vector3(-45, 0, -12);
      const altEnd = new THREE.Vector3(45, 0, -12);
      altStart.y = getMarsElevation(altStart.x, altStart.z);
      altEnd.y = getMarsElevation(altEnd.x, altEnd.z);

      const optimalCurve = new THREE.LineCurve3(straightStart, straightEnd);
      const altCurve = new THREE.LineCurve3(altStart, altEnd);

      // Optimal Line Ribbon
      const optimalSplinePoints = optimalCurve.getPoints(100);
      optimalSplinePoints.forEach(pt => { pt.y = getMarsElevation(pt.x, pt.z) + 0.22; });
      const optimalPathGeo = new THREE.BufferGeometry().setFromPoints(optimalSplinePoints);
      const optimalPathMat = new THREE.LineBasicMaterial({ color: 0x30d158, linewidth: 3, transparent: true, opacity: 0.95 });
      const optimalLine = new THREE.Line(optimalPathGeo, optimalPathMat);
      scene.add(optimalLine);

      // Alternative Line Ribbon
      const altSplinePoints = altCurve.getPoints(100);
      altSplinePoints.forEach(pt => { pt.y = getMarsElevation(pt.x, pt.z) + 0.2; });
      const altPathGeo = new THREE.BufferGeometry().setFromPoints(altSplinePoints);
      const altPathMat = new THREE.LineDashedMaterial({ color: 0xff9f0a, dashSize: 0.9, gapSize: 0.45, linewidth: 2, transparent: true, opacity: 0.85 });
      const altLine = new THREE.Line(altPathGeo, altPathMat);
      altLine.computeLineDistances();
      scene.add(altLine);

      function createMarker(pos, colorHex) {
        const group = new THREE.Group();
        const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.5, 8);
        const poleMat = new THREE.MeshBasicMaterial({ color: colorHex });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2.75;
        group.add(pole);

        const ringGeo = new THREE.RingGeometry(0.9, 1.4, 28);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.06;
        group.add(ring);

        const beaconGeo = new THREE.OctahedronGeometry(0.75);
        const beaconMat = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.75, roughness: 0.25 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = 5.9;
        group.add(beacon);

        group.position.copy(pos);
        return group;
      }

      const startMarker = createMarker(straightStart, 0x0a84ff);
      const endMarker = createMarker(straightEnd, 0x30d158);
      scene.add(startMarker);
      scene.add(endMarker);

      // Realistic NASA Mars 2020 Perseverance Exploration Rover Assembly
      const roverContainer = new THREE.Group();
      const roverAsset = createDetailedMarsRover();
      roverContainer.add(roverAsset.roverRoot);
      scene.add(roverContainer);

      const dustCount = 100;
      const dustGeo = new THREE.BufferGeometry();
      const dustPositions = new Float32Array(dustCount * 3);
      for (let i = 0; i < dustCount; i++) {
        dustPositions[i * 3] = 0;
        dustPositions[i * 3 + 1] = -100;
        dustPositions[i * 3 + 2] = 0;
      }
      dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
      const dustMat = new THREE.PointsMaterial({
        color: 0xde7944,
        size: 0.55,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      });
      const dustParticles = new THREE.Points(dustGeo, dustMat);
      scene.add(dustParticles);

      let dustIndex = 0;
      function emitDust(pos) {
        const idx = (dustIndex % dustCount) * 3;
        dustPositions[idx] = pos.x + (Math.random() - 0.5) * 0.9;
        dustPositions[idx + 1] = pos.y + 0.1 + Math.random() * 0.35;
        dustPositions[idx + 2] = pos.z + (Math.random() - 0.5) * 0.9;
        dustGeo.attributes.position.needsUpdate = true;
        dustIndex++;
      }

      let missionActive = true;
      let progress = 0.08;
      const missionSpeed = 0.00035;
      let currentPathCurve = optimalCurve;
      let activeRouteName = 'OPTIMAL_DELTA_01';
      let camTargetMode = 'orbit';

      window.MarsSimulator = {
        toggleMission: function(state) {
          if (typeof state === 'boolean') missionActive = state;
          else missionActive = !missionActive;
          return missionActive;
        },
        resetMission: function() {
          progress = 0.0;
          missionActive = true;
        },
        setRoute: function(routeType) {
          if (routeType === 'alt') {
            currentPathCurve = altCurve;
            activeRouteName = 'ALTERNATIVE_VALLEY_02';
            optimalLine.visible = false;
            altLine.visible = true;
          } else {
            currentPathCurve = optimalCurve;
            activeRouteName = 'OPTIMAL_DELTA_01';
            optimalLine.visible = true;
            altLine.visible = true;
          }
          progress = 0.0;
        },
        toggleHazards: function(visible) {
          if (typeof visible === 'boolean') hazardMeshGroup.visible = visible;
          else hazardMeshGroup.visible = !hazardMeshGroup.visible;
        },
        toggleRoute: function(visible) {
          if (typeof visible === 'boolean') {
            optimalLine.visible = visible;
            altLine.visible = visible;
          } else {
            optimalLine.visible = !optimalLine.visible;
            altLine.visible = !altLine.visible;
          }
        },
        setCamera: function(viewMode) {
          camTargetMode = viewMode;
        }
      };

      let isDragging = false;
      let prevPointerX = 0;
      let prevPointerY = 0;
      let spherical = { radius: 48, theta: 0.85, phi: 1.05 };
      const targetLookAt = new THREE.Vector3(0, 2, 0);

      renderer.domElement.addEventListener('pointerdown', (e) => {
        isDragging = true;
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;
      });

      window.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - prevPointerX;
        const dy = e.clientY - prevPointerY;
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;

        spherical.theta -= dx * 0.0055;
        spherical.phi = Math.max(0.18, Math.min(Math.PI / 2.05, spherical.phi - dy * 0.0055));
      });

      window.addEventListener('pointerup', () => { isDragging = false; });
      window.addEventListener('pointercancel', () => { isDragging = false; });

      renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        spherical.radius = Math.max(10, Math.min(115, spherical.radius + e.deltaY * 0.04));
      }, { passive: false });

      function onResize() {
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
      window.addEventListener('resize', onResize);

      let lastTime = performance.now();

      function animate(time) {
        requestAnimationFrame(animate);

        const delta = (time - lastTime) * 0.001;
        lastTime = time;

        if (missionActive) {
          progress += missionSpeed;
          if (progress > 1.0) progress = 0.0;
        }

        const roverPos = currentPathCurve.getPointAt(progress);
        const lookAheadProgress = Math.min(progress + 0.015, 1.0);
        const lookTarget = currentPathCurve.getPointAt(lookAheadProgress);

        // Normalized horizontal travel heading vector
        const travelDir = new THREE.Vector3(lookTarget.x - roverPos.x, 0, lookTarget.z - roverPos.z).normalize();
        if (travelDir.lengthSq() < 0.0001) travelDir.set(1, 0, 0);

        // Calculate lateral vector perpendicular to heading
        const sideDir = new THREE.Vector3(-travelDir.z, 0, travelDir.x).normalize();

        // 4-CORNER GROUND PHYSICS: Sample elevation at front, rear, left, and right wheel contact patches
        const frontPos = roverPos.clone().addScaledVector(travelDir, 1.15);
        const rearPos = roverPos.clone().addScaledVector(travelDir, -1.22);
        const leftPos = roverPos.clone().addScaledVector(sideDir, 1.05);
        const rightPos = roverPos.clone().addScaledVector(sideDir, -1.05);

        const frontY = getMarsElevation(frontPos.x, frontPos.z);
        const rearY = getMarsElevation(rearPos.x, rearPos.z);
        const leftY = getMarsElevation(leftPos.x, leftPos.z);
        const rightY = getMarsElevation(rightPos.x, rightPos.z);

        // Average ground level directly beneath all 6 wheels
        const groundY = (frontY + rearY + leftY + rightY) * 0.25;

        // Position rover firmly on top of the ground (wheels touch surface at y=0 in model)
        roverContainer.position.set(roverPos.x, groundY, roverPos.z);

        // Orient rover forward (-Z axis in createDetailedMarsRover faces travel destination)
        roverContainer.lookAt(lookTarget.x, groundY, lookTarget.z);

        // Slope Pitch (climbing/descending) and Roll (lateral bank)
        const pitch = Math.atan2(frontY - rearY, 2.37);
        const roll = Math.atan2(rightY - leftY, 2.1);
        roverAsset.roverRoot.rotation.x = pitch;
        roverAsset.roverRoot.rotation.z = roll;

        if (missionActive) {
          roverAsset.updateAnimation(time * 0.001, delta, 3.2);
          if (Math.random() < 0.45) {
            emitDust(rearPos);
          }
        }

        for (let i = 0; i < dustCount; i++) {
          const py = dustPositions[i * 3 + 1];
          if (py > -50) {
            dustPositions[i * 3 + 1] += delta * 0.45;
            dustPositions[i * 3] += delta * 0.25;
          }
        }
        dustGeo.attributes.position.needsUpdate = true;

        const pArr = atmosDustGeo.attributes.position.array;
        for (let i = 0; i < atmosDustCount; i++) {
          const v = atmosDustVels[i];
          pArr[i * 3] += v.vx * delta * 2.0;
          pArr[i * 3 + 1] += v.vy * delta;
          pArr[i * 3 + 2] += v.vz * delta * 2.0;
          if (pArr[i * 3] > 60) pArr[i * 3] = -60;
          if (pArr[i * 3 + 2] > 60) pArr[i * 3 + 2] = -60;
        }
        atmosDustGeo.attributes.position.needsUpdate = true;

        hazardMeshGroup.children.forEach((c, idx) => {
          if (c.isMesh) {
            c.material.opacity = 0.45 + Math.sin(time * 0.004 + idx) * 0.35;
          }
        });

        if (camTargetMode === 'follow' || camTargetMode === 'chase') {
          targetLookAt.lerp(new THREE.Vector3(roverPos.x, groundY + 1.2, roverPos.z), 0.08);
          const offset = new THREE.Vector3(0, 6.5, 11.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), roverContainer.rotation.y);
          camera.position.lerp(new THREE.Vector3(roverPos.x + offset.x, groundY + offset.y, roverPos.z + offset.z), 0.06);
          camera.lookAt(targetLookAt);
        } else if (camTargetMode === 'topdown' || camTargetMode === 'ortho') {
          targetLookAt.lerp(new THREE.Vector3(roverPos.x, groundY, roverPos.z), 0.05);
          camera.position.lerp(new THREE.Vector3(roverPos.x, groundY + 68, roverPos.z + 0.01), 0.05);
          camera.lookAt(targetLookAt);
        } else {
          targetLookAt.lerp(new THREE.Vector3(roverPos.x, groundY + 1.2, roverPos.z), 0.04);
          const camX = targetLookAt.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
          const camY = targetLookAt.y + spherical.radius * Math.cos(spherical.phi);
          const camZ = targetLookAt.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
          camera.position.set(camX, camY, camZ);
          camera.lookAt(targetLookAt);
        }

        if (window.updateTelemetryHUD) {
          const totalDist = 4820;
          const traveled = Math.round(progress * totalDist);
          const remaining = totalDist - traveled;
          const estSec = Math.round((1.0 - progress) * 240);
          const mins = Math.floor(estSec / 60);
          const secs = estSec % 60;
          window.updateTelemetryHUD({
            status: missionActive ? 'EXPLORING / ACTIVE DRIVE' : 'TELEOP IDLE / HOLD',
            isActive: missionActive,
            progressPct: Math.round(progress * 100),
            lat: (18.3842 + roverPos.z * 0.001).toFixed(4) + '° N',
            lon: (77.5819 + roverPos.x * 0.001).toFixed(4) + '° E',
            elevation: Math.round(groundY * 3.8 - 2548) + ' m (Jezero Floor)',
            tilt: `${(Math.abs(pitch) * (180 / Math.PI)).toFixed(1)}° / ${(Math.abs(roll) * (180 / Math.PI)).toFixed(1)}°`,
            traveledMeters: traveled,
            remainingM: remaining,
            eta: `${mins}m ${secs < 10 ? '0' : ''}${secs}s`,
            route: activeRouteName
          });
        }

        renderer.render(scene, camera);
      }

      animate(performance.now());
    };

    window.updateTelemetryHUD = (data) => {
      const s = document.getElementById('telemetry-status');
      if (s) s.textContent = data.status;
      const lat = document.getElementById('telemetry-lat');
      if (lat) lat.textContent = data.lat;
      const lon = document.getElementById('telemetry-lon');
      if (lon) lon.textContent = data.lon;
      const el = document.getElementById('telemetry-elev');
      if (el) el.textContent = data.elevation;
      const tilt = document.getElementById('telemetry-tilt');
      if (tilt) tilt.textContent = data.tilt;
      const trav = document.getElementById('telemetry-traveled');
      if (trav) trav.textContent = `${data.traveledMeters.toLocaleString()} m`;
      const rem = document.getElementById('telemetry-remaining');
      if (rem) rem.textContent = `${data.remainingM.toLocaleString()} m`;
      const eta = document.getElementById('telemetry-eta');
      if (eta) eta.textContent = data.eta;
      const pb = document.getElementById('telemetry-progress-bar');
      if (pb) pb.style.width = `${data.progressPct}%`;
    };

    initThree();

    return () => {
      delete window.updateTelemetryHUD;
    };
  }, []);

  return (
    <section id="terrain-3d" className="relative w-full h-[85vh] min-h-[650px] bg-[#10131a] overflow-hidden select-none font-mono">
      <div id="threejs-container-ANIMATION_5" className="absolute inset-0 w-full h-full" />

      <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none p-4">
        <header className="pointer-events-auto flex justify-between items-center w-full px-4 h-14 border border-white/10 bg-[#0b0e14]/90 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[#ffb59d] font-bold tracking-widest text-sm uppercase">NASA JPL // ARES-OS</span>
              <span className="px-2 py-0.5 text-[9px] bg-white/10 border border-white/20 text-[#e1bfb5]">PERSEVERANCE M20</span>
            </div>
            <div className="hidden xl:flex items-center gap-3 pl-4 border-l border-white/10 text-xs">
              <span className="text-[#ffb955]">SOL 1042 // UTC 14:22:09.4</span>
              <span className="text-[#00daf3]">MRO ORBITER UPLINK ACTIVE (438 MHz)</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-black/40 px-3 py-1 border border-white/10 text-xs">
              <span className="text-gray-400">SIGNAL LATENCY:</span>
              <span className="text-[#ffb955]">11m 42s EARTH DELAY</span>
            </div>

            {/* Quick Clean 3D / HUD Master Toggle */}
            <button
              onClick={() => {
                if (leftPanelOpen || rightPanelOpen) {
                  setLeftPanelOpen(false);
                  setRightPanelOpen(false);
                } else {
                  setLeftPanelOpen(true);
                  setRightPanelOpen(true);
                }
              }}
              className={`px-2.5 py-1 text-[10px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                !leftPanelOpen && !rightPanelOpen
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
                  : 'bg-white/5 border-white/20 text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Toggle clean unobstructed 3D scene"
            >
              {!leftPanelOpen && !rightPanelOpen ? (
                <>
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>RESTORE PANELS</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                  <span className="hidden sm:inline">CLEAN 3D VIEW</span>
                  <span className="sm:hidden">CLEAN</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] font-bold bg-orange-500/20 border border-orange-500 text-[#ffb59d] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                AUTONAV V4.2 ENGAGED
              </span>
            </div>
          </div>
        </header>

        <main className="relative flex-1 flex justify-between items-start pt-4 overflow-hidden pointer-events-none">
          {/* Left Dock Tab (appears on left edge when left panel is collapsed) */}
          {!leftPanelOpen && (
            <button
              onClick={() => setLeftPanelOpen(true)}
              className="pointer-events-auto absolute left-2 top-4 z-30 flex items-center gap-2 px-3 py-2 bg-[#0b0e14]/95 hover:bg-[#151c29] border border-orange-500/50 hover:border-orange-400 text-[#ffb59d] hover:text-white rounded-lg shadow-2xl shadow-black/80 backdrop-blur-xl transition-all duration-200 group cursor-pointer animate-fade-in"
              title="Slide open Telemetry Panel"
            >
              <PanelLeftOpen className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold tracking-wider">TELEMETRY</span>
              <ChevronRight className="w-3.5 h-3.5 text-orange-400/80 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Left Sidebar (Telemetry, Traversal Metrics, Route Vectors) */}
          <aside
            className={`pointer-events-auto w-80 lg:w-96 max-w-[calc(100vw-32px)] flex flex-col gap-3 z-20 transition-all duration-300 ease-in-out ${
              leftPanelOpen
                ? 'translate-x-0 opacity-100'
                : '-translate-x-[120%] opacity-0 pointer-events-none'
            }`}
          >
            <div className="border border-white/10 bg-[#0b0e14]/90 backdrop-blur-xl p-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffb59d] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ffb59d]" />
                  </span>
                  <span className="text-xs text-[#ffb59d] font-bold" id="telemetry-status">STATUS: ACTIVE DRIVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-400">MOD-801 // AUTONAV</span>
                  <button
                    onClick={() => setLeftPanelOpen(false)}
                    className="p-1 px-1.5 hover:bg-white/10 rounded border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                    title="Slide telemetry panel to the left"
                  >
                    <span>HIDE</span>
                    <ChevronLeft className="w-3.5 h-3.5 text-orange-400" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/40 p-2 border border-white/10">
                  <span className="text-[9px] text-gray-400 block">LATITUDE</span>
                  <span className="text-[#ffb955] font-semibold" id="telemetry-lat">18.3842° N</span>
                </div>
                <div className="bg-black/40 p-2 border border-white/10">
                  <span className="text-[9px] text-gray-400 block">LONGITUDE</span>
                  <span className="text-[#ffb955] font-semibold" id="telemetry-lon">77.5819° E</span>
                </div>
                <div className="bg-black/40 p-2 border border-white/10">
                  <span className="text-[9px] text-gray-400 block">ELEVATION</span>
                  <span className="text-white" id="telemetry-elev">-2,548 m</span>
                </div>
                <div className="bg-black/40 p-2 border border-white/10">
                  <span className="text-[9px] text-gray-400 block">PITCH / ROLL</span>
                  <span className="text-white" id="telemetry-tilt">4.8° / 1.2°</span>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-[#0b0e14]/90 backdrop-blur-xl p-3 shadow-lg flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-xs border-b border-white/10 pb-1.5">
                <span className="text-white flex items-center gap-1.5 font-bold">TRAVERSAL METRICS</span>
                <span className="text-[#00daf3]">STRAIGHT VECTOR</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Traveled / Total</span>
                  <span className="text-white"><span className="text-[#ffb59d] font-bold" id="telemetry-traveled">1,420 m</span> / 4,820 m</span>
                </div>
                <div className="w-full bg-gray-800 h-2 relative overflow-hidden border border-white/10">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300" id="telemetry-progress-bar" style={{ width: '29.4%' }} />
                </div>
                <div className="flex justify-between items-center pt-1">
                  <div>
                    <span className="text-[9px] text-gray-400 block">REMAINING</span>
                    <span className="text-[#ffb955] font-semibold" id="telemetry-remaining">3,400 m</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-gray-400 block">ESTIMATED ARRIVAL</span>
                    <span className="text-[#00daf3] font-bold" id="telemetry-eta">12m 45s</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-[#0b0e14]/90 backdrop-blur-xl p-3 shadow-lg">
              <span className="text-[9px] text-gray-400 tracking-wider block mb-2">TRAJECTORY COMPUTATION VECTORS</span>
              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2.5 p-2 bg-black/40 hover:bg-black/60 border border-[#00daf3]/40 cursor-pointer transition-all">
                  <input defaultChecked className="mt-1 accent-[#00daf3]" name="traversal-route" onChange={() => window.MarsSimulator?.setRoute('alpha')} type="radio" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[#00daf3] font-bold">ROUTE ALPHA: Direct Vector</span>
                      <span className="text-[9px] px-1 bg-[#00daf3]/20 text-[#00daf3] border border-[#00daf3]/50">OPTIMAL</span>
                    </div>
                    <div className="text-gray-400 text-[10px] mt-0.5">Length: 4.82 km • Hazard Index: 0.14</div>
                  </div>
                </label>
                <label className="flex items-start gap-2.5 p-2 bg-black/20 hover:bg-black/40 border border-white/10 cursor-pointer transition-all">
                  <input className="mt-1 accent-[#ffb955]" name="traversal-route" onChange={() => window.MarsSimulator?.setRoute('alt')} type="radio" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[#ffb955] font-bold">ROUTE BETA: Alternate Vector</span>
                      <span className="text-[9px] px-1 bg-[#ffb955]/20 text-[#ffb955] border border-[#ffb955]/50">AMBER</span>
                    </div>
                    <div className="text-gray-400 text-[10px] mt-0.5">Length: 5.94 km • Hazard Index: 0.42</div>
                  </div>
                </label>
              </div>
            </div>
          </aside>

          {/* Right Dock Tab (appears on right edge when right panel is collapsed) */}
          {!rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className="pointer-events-auto absolute right-2 top-4 z-30 flex items-center gap-2 px-3 py-2 bg-[#0b0e14]/95 hover:bg-[#151c29] border border-red-500/50 hover:border-red-400 text-red-300 hover:text-white rounded-lg shadow-2xl shadow-black/80 backdrop-blur-xl transition-all duration-200 group cursor-pointer animate-fade-in"
              title="Slide open Hazards & Sensors Panel"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-red-400/80 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[10px] font-bold tracking-wider">HAZARDS & SENSORS</span>
              <PanelRightOpen className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* Right Sidebar (Danger Zones, Environmental Sensors) */}
          <aside
            className={`pointer-events-auto w-80 lg:w-88 max-w-[calc(100vw-32px)] flex flex-col gap-3 z-20 transition-all duration-300 ease-in-out ${
              rightPanelOpen
                ? 'translate-x-0 opacity-100'
                : 'translate-x-[120%] opacity-0 pointer-events-none'
            }`}
          >
            <div className="border border-white/10 bg-[#0b0e14]/90 backdrop-blur-xl p-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold">
                  <span>5 DANGER ZONES MAPPED</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-[10px] text-gray-400 hover:text-white cursor-pointer" onClick={() => window.MarsSimulator?.toggleHazards()}>TOGGLE HAZARDS</button>
                  <button
                    onClick={() => setRightPanelOpen(false)}
                    className="p-1 px-1.5 hover:bg-white/10 rounded border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                    title="Slide hazards panel to the right"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-red-400" />
                    <span>HIDE</span>
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-black/40 border-l-2 border-orange-500 border border-white/10">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[#ffb59d]">[CRITICAL] Boulder Field #02</span>
                    <span className="text-[10px] text-orange-400">PROX: 42m</span>
                  </div>
                  <div className="text-gray-400 text-[10px] mt-1 flex justify-between">
                    <span>Avoidance Angle: +14°</span>
                    <span className="text-red-400 font-semibold">COLLISION RISK</span>
                  </div>
                </div>
                <div className="p-2 bg-black/40 border-l-2 border-[#ffb955] border border-white/10">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-[#ffb955]">[MODERATE] Jezero Sand Pit #03</span>
                    <span className="text-[10px] text-[#ffb955]">SLIP: HIGH</span>
                  </div>
                  <div className="text-gray-400 text-[10px] mt-1 flex justify-between">
                    <span>Friction Coeff: 0.18</span>
                    <span className="text-[#ffb955]">WHEEL TRENCHING</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-white/10 bg-[#0b0e14]/90 backdrop-blur-xl p-3 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2 text-xs">
                <span className="text-white font-bold">ENVIRONMENTAL SENSORS (MEDA)</span>
                <span className="text-[#00daf3] text-[10px]">NOMINAL</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/40 p-2 border border-white/10">
                  <span className="text-[9px] text-gray-400 block">SURFACE TEMP</span>
                  <span className="text-white font-semibold">-42°C</span>
                </div>
                <div className="bg-black/40 p-2 border border-white/10">
                  <span className="text-[9px] text-gray-400 block">ATMOS DENSITY</span>
                  <span className="text-white font-semibold">0.020 kg/m³</span>
                </div>
                <div className="bg-black/40 p-2 border border-white/10">
                  <span className="text-[9px] text-gray-400 block">WIND VELOCITY</span>
                  <span className="text-[#ffb955] font-semibold">14.8 m/s ENE</span>
                </div>
                <div className="bg-black/40 p-2 border border-white/10">
                  <span className="text-[9px] text-gray-400 block">SOLAR IRRADIANCE</span>
                  <span className="text-[#00daf3] font-semibold">590 W/m²</span>
                </div>
              </div>
            </div>
          </aside>
        </main>

        <footer className="pointer-events-auto w-full pb-2 px-4 flex flex-col md:flex-row items-center justify-between gap-3 z-30">
          <div className="flex items-center gap-2 px-3 py-1 bg-black/80 border border-white/20 text-[10px] text-gray-400">
            <span>DRAG TO ORBIT • SCROLL TO ZOOM</span>
          </div>
          <div className="flex items-center gap-2 bg-[#0b0e14]/90 backdrop-blur-xl p-1.5 border border-white/20 shadow-xl">
            <button className="px-3 py-1.5 bg-[#ffb59d] text-black font-bold text-xs uppercase transition-all flex items-center gap-1.5" id="btn-toggle-mission" onClick={() => {
              const active = window.MarsSimulator?.toggleMission();
              const el = document.getElementById('btn-toggle-mission');
              if (el) el.textContent = active ? 'PAUSE MISSION' : 'RESUME MISSION';
            }}>
              PAUSE MISSION
            </button>
            <button className="px-3 py-1.5 bg-gray-800 text-white text-xs uppercase border border-white/20 transition-all" onClick={() => window.MarsSimulator?.resetMission()}>
              RESET PATH
            </button>
            <div className="h-5 w-px bg-white/20 mx-1" />
            <button className="px-2.5 py-1.5 bg-[#00daf3]/20 border border-[#00daf3] text-[#00daf3] text-xs flex items-center gap-1" onClick={() => window.MarsSimulator?.toggleRoute()}>
              TOGGLE ROUTE
            </button>
            <button className="px-2.5 py-1.5 bg-red-500/20 border border-red-500 text-red-400 text-xs flex items-center gap-1" onClick={() => window.MarsSimulator?.toggleHazards()}>
              HAZARDS HUD
            </button>
            <div className="h-5 w-px bg-white/20 mx-1" />
            {/* Clean View Dock Button */}
            <button
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                !leftPanelOpen && !rightPanelOpen
                  ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
                  : 'bg-white/5 border border-white/20 text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              onClick={() => {
                if (leftPanelOpen || rightPanelOpen) {
                  setLeftPanelOpen(false);
                  setRightPanelOpen(false);
                } else {
                  setLeftPanelOpen(true);
                  setRightPanelOpen(true);
                }
              }}
              title="Toggle clean view for 3D scene"
            >
              {!leftPanelOpen && !rightPanelOpen ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
              <span>{!leftPanelOpen && !rightPanelOpen ? 'RESTORE PANELS' : 'CLEAN VIEW'}</span>
            </button>
          </div>
          <div className="flex items-center gap-1 bg-[#0b0e14]/90 backdrop-blur-xl p-1 border border-white/20 shadow-xl text-xs">
            <button className="px-2.5 py-1.5 bg-orange-500/20 text-[#ffb59d] border border-orange-500/50" onClick={() => window.MarsSimulator?.setCamera('orbit')}>
              ORBIT
            </button>
            <button className="px-2.5 py-1.5 text-gray-300 hover:text-white" onClick={() => window.MarsSimulator?.setCamera('follow')}>
              CHASE CAM
            </button>
            <button className="px-2.5 py-1.5 text-gray-300 hover:text-white" onClick={() => window.MarsSimulator?.setCamera('topdown')}>
              SAT-MAP
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
}
