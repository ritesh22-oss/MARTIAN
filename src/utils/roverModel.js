import * as THREE from 'three';

/**
 * Constructs a highly detailed, procedurally modeled NASA Mars 2020 / Curiosity
 * exploration rover with 6-wheel rocker-bogie suspension, articulated mast,
 * and robotic arm.
 */
export function createDetailedMarsRover() {
  const roverRoot = new THREE.Group();
  roverRoot.name = 'MarsRover';

  // Materials
  const bodyMetalMat = new THREE.MeshStandardMaterial({
    color: 0xd4dad2,
    metalness: 0.82,
    roughness: 0.32,
    bumpScale: 0.02
  });

  const darkTitaniumMat = new THREE.MeshStandardMaterial({
    color: 0x242629,
    metalness: 0.92,
    roughness: 0.22
  });

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xdfab33,
    metalness: 0.88,
    roughness: 0.38
  });

  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x18191b,
    metalness: 0.75,
    roughness: 0.65
  });

  const cameraLensMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a1828,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.85,
    ior: 1.52,
    reflectivity: 0.9
  });

  const glowSensorMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff
  });

  // 1. MAIN CHASSIS (WEB: Warm Electronics Box)
  const chassisGroup = new THREE.Group();
  
  // Base body box
  const mainBoxGeo = new THREE.BoxGeometry(2.8, 1.1, 4.0);
  const mainBox = new THREE.Mesh(mainBoxGeo, bodyMetalMat);
  mainBox.position.set(0, 1.4, 0);
  mainBox.castShadow = true;
  chassisGroup.add(mainBox);

  // Top Equipment Deck (tapered top cover)
  const deckGeo = new THREE.BoxGeometry(2.6, 0.25, 3.8);
  const deck = new THREE.Mesh(deckGeo, goldFoilMat);
  deck.position.set(0, 2.05, 0);
  chassisGroup.add(deck);

  // Front & Rear HAZCAM Housings (Hazards Avoidance Cameras)
  const hazcamGeo = new THREE.BoxGeometry(0.5, 0.25, 0.25);
  const frontHazcam = new THREE.Mesh(hazcamGeo, darkTitaniumMat);
  frontHazcam.position.set(0, 1.5, -2.05);
  chassisGroup.add(frontHazcam);

  // Dual front hazcam lenses
  [-0.15, 0.15].forEach(x => {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), cameraLensMat);
    lens.rotateX(Math.PI / 2);
    lens.position.set(x, 1.5, -2.18);
    chassisGroup.add(lens);
  });

  const rearHazcam = frontHazcam.clone();
  rearHazcam.position.set(0, 1.5, 2.05);
  chassisGroup.add(rearHazcam);

  // MMRTG (Multi-Mission Radioisotope Thermoelectric Generator at Rear)
  const rtgGroup = new THREE.Group();
  const rtgCoreGeo = new THREE.CylinderGeometry(0.48, 0.52, 1.6, 24);
  rtgCoreGeo.rotateX(Math.PI / 2);
  const rtgCore = new THREE.Mesh(rtgCoreGeo, darkTitaniumMat);
  rtgGroup.add(rtgCore);

  // Radial cooling fins around MMRTG
  for (let i = 0; i < 8; i++) {
    const finAngle = (i / 8) * Math.PI * 2;
    const finGeo = new THREE.BoxGeometry(0.04, 1.3, 1.4);
    const fin = new THREE.Mesh(finGeo, darkTitaniumMat);
    fin.rotation.z = finAngle;
    rtgGroup.add(fin);
  }
  rtgGroup.position.set(0, 1.65, 2.7);
  rtgGroup.rotation.x = -0.15; // angled upwards
  chassisGroup.add(rtgGroup);

  // High-Gain Antenna (HGA) steerable hexagonal dish
  const hgaGroup = new THREE.Group();
  const hgaDishGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 6);
  const hgaDish = new THREE.Mesh(hgaDishGeo, bodyMetalMat);
  hgaDish.rotation.x = Math.PI / 4;
  hgaGroup.add(hgaDish);

  const hgaFeed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 12), darkTitaniumMat);
  hgaFeed.position.set(0, 0.2, 0);
  hgaGroup.add(hgaFeed);

  hgaGroup.position.set(-0.9, 2.3, 0.8);
  chassisGroup.add(hgaGroup);

  // UHF Antenna & Low-Gain Spire
  const uhfGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.9, 16);
  const uhf = new THREE.Mesh(uhfGeo, darkTitaniumMat);
  uhf.position.set(0.9, 2.45, 1.2);
  chassisGroup.add(uhf);

  roverRoot.add(chassisGroup);

  // 2. REMOTE SENSING MAST (RSM - Mastcam-Z and SuperCam)
  const mastBaseGroup = new THREE.Group();
  mastBaseGroup.position.set(0.85, 2.1, -1.2); // front-right of chassis

  // Mast vertical tube
  const mastPoleGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.4, 16);
  const mastPole = new THREE.Mesh(mastPoleGeo, darkTitaniumMat);
  mastPole.position.y = 1.2;
  mastBaseGroup.add(mastPole);

  // Mast pan/tilt head (articulates)
  const mastHead = new THREE.Group();
  mastHead.position.y = 2.4;

  // Head chassis box
  const headBoxGeo = new THREE.BoxGeometry(0.9, 0.45, 0.7);
  const headBox = new THREE.Mesh(headBoxGeo, bodyMetalMat);
  mastHead.add(headBox);

  // SuperCam circular laser telescope (top center)
  const superCamGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.35, 24);
  superCamGeo.rotateX(Math.PI / 2);
  const superCam = new THREE.Mesh(superCamGeo, darkTitaniumMat);
  superCam.position.set(0, 0.35, -0.2);
  mastHead.add(superCam);

  // Mastcam-Z Stereo Zoom Lenses (Left and Right binocular barrels)
  [-0.28, 0.28].forEach(x => {
    const barrelGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.5, 20);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, darkTitaniumMat);
    barrel.position.set(x, -0.05, -0.38);
    mastHead.add(barrel);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 20), cameraLensMat);
    lens.rotateX(Math.PI / 2);
    lens.position.set(x, -0.05, -0.63);
    mastHead.add(lens);
  });

  mastBaseGroup.add(mastHead);
  roverRoot.add(mastBaseGroup);

  // 3. ARTICULATED ROBOTIC ARM (Front Left)
  const armGroup = new THREE.Group();
  armGroup.position.set(-0.85, 1.4, -1.85);

  // Shoulder azimuth & elevation
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), darkTitaniumMat);
  armGroup.add(shoulder);

  const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.3, 16), darkTitaniumMat);
  upperArm.position.set(0, -0.5, -0.4);
  upperArm.rotation.x = Math.PI / 4;
  armGroup.add(upperArm);

  const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), darkTitaniumMat);
  elbow.position.set(0, -0.9, -0.8);
  armGroup.add(elbow);

  // Forearm extending down toward rock
  const forearmGroup = new THREE.Group();
  forearmGroup.position.copy(elbow.position);

  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 16), bodyMetalMat);
  forearm.position.set(0, -0.4, 0.2);
  forearm.rotation.x = -Math.PI / 6;
  forearmGroup.add(forearm);

  // Scientific Turret Tool (PIXL & SHERLOC spectrometer & coring drill)
  const turret = new THREE.Group();
  turret.position.set(0, -0.85, 0.35);

  const turretBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 12), darkTitaniumMat);
  turretBody.rotateX(Math.PI / 2);
  turret.add(turretBody);

  const drillBit = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 16), bodyMetalMat);
  drillBit.rotateX(-Math.PI / 2);
  drillBit.position.set(0, 0, -0.3);
  turret.add(drillBit);

  forearmGroup.add(turret);
  armGroup.add(forearmGroup);
  roverRoot.add(armGroup);

  // 4. ROCKER-BOGIE SUSPENSION & 6 WHEELS
  const wheels = [];
  const suspensionArms = [];

  // Wheel geometry with visible cleats/treads
  const createWheel = () => {
    const wheelGroup = new THREE.Group();

    // Outer tire cylinder
    const tireGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.68, 28);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, wheelMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Chevron treads (raised cleats around circumference)
    for (let c = 0; c < 14; c++) {
      const angle = (c / 14) * Math.PI * 2;
      const cleatGeo = new THREE.BoxGeometry(0.72, 0.05, 0.12);
      const cleat = new THREE.Mesh(cleatGeo, darkTitaniumMat);
      cleat.position.set(0, Math.cos(angle) * 0.63, Math.sin(angle) * 0.63);
      cleat.rotation.x = angle;
      wheelGroup.add(cleat);
    }

    // Curved spiral titanium spokes
    for (let s = 0; s < 6; s++) {
      const sAngle = (s / 6) * Math.PI * 2;
      const spokeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.58, 8);
      const spoke = new THREE.Mesh(spokeGeo, bodyMetalMat);
      spoke.position.set(0, Math.cos(sAngle) * 0.28, Math.sin(sAngle) * 0.28);
      spoke.rotation.x = sAngle + 0.35;
      wheelGroup.add(spoke);
    }

    // Center hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.72, 16), darkTitaniumMat);
    hub.rotateZ(Math.PI / 2);
    wheelGroup.add(hub);

    return wheelGroup;
  };

  // Wheel Positions: Left (+X) and Right (-X), Front, Middle, Rear
  const wheelLayout = [
    { name: 'front_left',  x: -1.85, y: 0.62, z: -1.7 },
    { name: 'front_right', x:  1.85, y: 0.62, z: -1.7 },
    { name: 'mid_left',    x: -2.05, y: 0.62, z:  0.1 },
    { name: 'mid_right',   x:  2.05, y: 0.62, z:  0.1 },
    { name: 'rear_left',   x: -1.85, y: 0.62, z:  1.9 },
    { name: 'rear_right',  x:  1.85, y: 0.62, z:  1.9 },
  ];

  wheelLayout.forEach(loc => {
    const wheel = createWheel();
    wheel.position.set(loc.x, loc.y, loc.z);
    wheel.name = loc.name;
    roverRoot.add(wheel);
    wheels.push(wheel);

    // Connecting suspension strut
    const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 12);
    const strut = new THREE.Mesh(strutGeo, darkTitaniumMat);
    strut.position.set(loc.x * 0.75, loc.y + 0.5, loc.z * 0.85);
    strut.rotation.z = loc.x > 0 ? -0.4 : 0.4;
    roverRoot.add(strut);
    suspensionArms.push(strut);
  });

  // Soft ground contact shadow plane directly beneath rover
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  const sGrad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
  sGrad.addColorStop(0, 'rgba(10, 3, 2, 0.85)');
  sGrad.addColorStop(0.5, 'rgba(20, 6, 4, 0.5)');
  sGrad.addColorStop(1, 'transparent');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.PlaneGeometry(5.5, 6.5);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.7,
    depthWrite: false
  });
  const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
  groundShadow.position.y = 0.02;
  roverRoot.add(groundShadow);

  // Return rover container with animation hooks
  return {
    roverRoot,
    wheels,
    mastHead,
    forearmGroup,
    turret,
    chassisGroup,
    updateAnimation: (time, delta, drivingSpeed = 1.0) => {
      // 1. Rotate all wheels with forward velocity
      wheels.forEach(w => {
        w.rotation.x += delta * 2.2 * drivingSpeed;
      });

      // 2. Gentle suspension and chassis oscillation (pitch & roll over uneven Martian rocks)
      chassisGroup.position.y = Math.sin(time * 3.5) * 0.04;
      chassisGroup.rotation.x = Math.sin(time * 2.0) * 0.02;
      chassisGroup.rotation.z = Math.cos(time * 1.8) * 0.015;

      // 3. Mast camera head scans surroundings
      mastHead.rotation.y = Math.sin(time * 0.6) * 0.45;
      mastHead.rotation.x = Math.sin(time * 0.8) * 0.12 - 0.05;

      // 4. Robotic arm inspects surface
      forearmGroup.rotation.x = -Math.PI / 6 + Math.sin(time * 0.7) * 0.15;
      turret.rotation.z = time * 0.4;
    }
  };
}
