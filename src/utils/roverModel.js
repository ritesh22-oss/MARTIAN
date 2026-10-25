import * as THREE from 'three';

/**
 * Constructs a physically accurate, realistically proportioned NASA Mars 2020 Perseverance Rover.
 * Modeled according to NASA JPL engineering blueprints:
 * - Low-slung Warm Electronics Box (WEB) chassis with white thermal ceramic finish and gold MLI top deck
 * - Proportional Remote Sensing Mast (RSM) with SuperCam head and Mastcam-Z stereo optics
 * - Realistically STOWED robotic arm locked in driving flight configuration
 * - True 6-wheel Rocker-Bogie suspension with differential rocker bars, bogie links, and steering knuckles
 * - 6 machined titanium wheels with chevron cleats and curved flexure spokes (touching ground at y = 0)
 * - Rear MMRTG nuclear generator with 8 radial cooling fins
 * - High-Gain Antenna (HGA) dish and UHF rover-orbiter relay
 */
export function createDetailedMarsRover() {
  const roverRoot = new THREE.Group();
  roverRoot.name = 'PerseveranceRover';

  // --- Aerospace PBR Materials ---
  const whiteCeramicMat = new THREE.MeshStandardMaterial({
    color: 0xe6e9ea, // White thermal insulation blanket
    roughness: 0.42,
    metalness: 0.45
  });

  const darkTitaniumMat = new THREE.MeshStandardMaterial({
    color: 0x22252a, // Anodized aerospace titanium
    roughness: 0.35,
    metalness: 0.85
  });

  const goldMliMat = new THREE.MeshStandardMaterial({
    color: 0xd4a53d, // Multi-Layer Insulation (MLI) gold foil
    roughness: 0.28,
    metalness: 0.9
  });

  const wheelTireMat = new THREE.MeshStandardMaterial({
    color: 0x181a1d, // Machined aluminum-titanium tread
    roughness: 0.75,
    metalness: 0.5
  });

  const goldHubMat = new THREE.MeshStandardMaterial({
    color: 0xcaa03e, // Anodized titanium flexure hub
    roughness: 0.35,
    metalness: 0.85
  });

  const lensGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x00daf3,
    roughness: 0.1,
    metalness: 0.2,
    transmission: 0.8,
    ior: 1.5
  });

  // 1. MAIN CHASSIS: WARM ELECTRONICS BOX (WEB)
  const chassisGroup = new THREE.Group();
  chassisGroup.position.y = 0.82; // Center of chassis above ground clearance

  // Main central body (Length 2.2m along Z, Width 1.5m along X, Height 0.65m along Y)
  const mainBodyGeo = new THREE.BoxGeometry(1.5, 0.62, 2.2);
  const mainBody = new THREE.Mesh(mainBodyGeo, whiteCeramicMat);
  mainBody.castShadow = true;
  chassisGroup.add(mainBody);

  // Angled lower belly pan
  const bellyPanGeo = new THREE.BoxGeometry(1.3, 0.18, 1.9);
  const bellyPan = new THREE.Mesh(bellyPanGeo, darkTitaniumMat);
  bellyPan.position.y = -0.36;
  chassisGroup.add(bellyPan);

  // Top Equipment Deck (Gold MLI thermal insulation)
  const deckGeo = new THREE.BoxGeometry(1.42, 0.12, 2.1);
  const deck = new THREE.Mesh(deckGeo, goldMliMat);
  deck.position.y = 0.34;
  deck.castShadow = true;
  chassisGroup.add(deck);

  // Front & Rear Hazard Avoidance Camera (HAZCAM) sensor blocks
  const hazcamGeo = new THREE.BoxGeometry(0.32, 0.14, 0.14);
  const frontHazcam = new THREE.Mesh(hazcamGeo, darkTitaniumMat);
  frontHazcam.position.set(0, 0.12, -1.16);
  chassisGroup.add(frontHazcam);

  // Hazcam dual lenses
  [-0.09, 0.09].forEach(x => {
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), lensGlassMat);
    lens.rotateX(Math.PI / 2);
    lens.position.set(x, 0.12, -1.24);
    chassisGroup.add(lens);
  });

  // Rear Hazcam
  const rearHazcam = frontHazcam.clone();
  rearHazcam.position.set(0, 0.12, 1.16);
  chassisGroup.add(rearHazcam);

  // MMRTG (Multi-Mission Radioisotope Thermoelectric Generator at Rear)
  const rtgGroup = new THREE.Group();
  const rtgCoreGeo = new THREE.CylinderGeometry(0.28, 0.3, 0.95, 20);
  rtgCoreGeo.rotateX(Math.PI / 2);
  const rtgCore = new THREE.Mesh(rtgCoreGeo, darkTitaniumMat);
  rtgCore.castShadow = true;
  rtgGroup.add(rtgCore);

  // 8 Radial cooling fins
  for (let i = 0; i < 8; i++) {
    const finAngle = (i / 8) * Math.PI * 2;
    const finGeo = new THREE.BoxGeometry(0.02, 0.8, 0.85);
    const fin = new THREE.Mesh(finGeo, darkTitaniumMat);
    fin.rotation.z = finAngle;
    rtgGroup.add(fin);
  }
  rtgGroup.position.set(0, 0.22, 1.55);
  rtgGroup.rotation.x = -0.25; // Authentic ~15° upward angle
  chassisGroup.add(rtgGroup);

  // High-Gain Antenna (HGA) Steerable Hexagonal Dish (Rear-Left Deck)
  const hgaGroup = new THREE.Group();
  const hgaDishGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.05, 6);
  const hgaDish = new THREE.Mesh(hgaDishGeo, whiteCeramicMat);
  hgaDish.rotation.x = Math.PI / 5;
  hgaGroup.add(hgaDish);

  const hgaFeed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8), darkTitaniumMat);
  hgaFeed.position.set(0, 0.14, 0);
  hgaGroup.add(hgaFeed);

  hgaGroup.position.set(-0.48, 0.48, 0.55);
  chassisGroup.add(hgaGroup);

  // UHF Relay Antenna & Weather Sensor Boom (MEDA)
  const uhfMast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8), darkTitaniumMat);
  uhfMast.position.set(0.52, 0.65, 0.65);
  chassisGroup.add(uhfMast);

  roverRoot.add(chassisGroup);

  // 2. REMOTE SENSING MAST (RSM - SuperCam & Mastcam-Z)
  // Realistically proportioned height (~1.05m tall mast, not a towering crane!)
  const mastBaseGroup = new THREE.Group();
  mastBaseGroup.position.set(0.42, 1.2, -0.68); // Front-right of equipment deck

  const mastTubeGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.95, 12);
  const mastTube = new THREE.Mesh(mastTubeGeo, darkTitaniumMat);
  mastTube.position.y = 0.47;
  mastTube.castShadow = true;
  mastBaseGroup.add(mastTube);

  // Articulated Camera Head
  const mastHead = new THREE.Group();
  mastHead.position.y = 0.95;

  const headBoxGeo = new THREE.BoxGeometry(0.38, 0.22, 0.32);
  const headBox = new THREE.Mesh(headBoxGeo, whiteCeramicMat);
  headBox.castShadow = true;
  mastHead.add(headBox);

  // SuperCam circular laser aperture
  const superCamGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.16, 16);
  superCamGeo.rotateX(Math.PI / 2);
  const superCam = new THREE.Mesh(superCamGeo, darkTitaniumMat);
  superCam.position.set(0, 0.16, -0.09);
  mastHead.add(superCam);

  // Binocular Mastcam-Z Stereo Zoom Optics
  [-0.12, 0.12].forEach(x => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.22, 12), darkTitaniumMat);
    barrel.rotateX(Math.PI / 2);
    barrel.position.set(x, -0.02, -0.16);
    mastHead.add(barrel);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 12), lensGlassMat);
    lens.rotateX(Math.PI / 2);
    lens.position.set(x, -0.02, -0.28);
    mastHead.add(lens);
  });

  mastBaseGroup.add(mastHead);
  roverRoot.add(mastBaseGroup);

  // 3. REALISTICALLY STOWED ROBOTIC ARM (Flight travel configuration during driving)
  // Folded tightly along front bumper cradle — no crane boom dangling!
  const stowedArmGroup = new THREE.Group();
  stowedArmGroup.position.set(-0.48, 0.92, -1.02);

  const shoulderBracket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), darkTitaniumMat);
  stowedArmGroup.add(shoulderBracket);

  // Upper arm folded horizontally across front
  const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8), darkTitaniumMat);
  upperArm.rotateZ(Math.PI / 2);
  upperArm.position.set(0.32, 0, 0);
  stowedArmGroup.add(upperArm);

  // Forearm folded back towards chassis
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), whiteCeramicMat);
  forearm.rotateX(Math.PI / 2);
  forearm.position.set(0.55, -0.08, 0.25);
  stowedArmGroup.add(forearm);

  // SHERLOC / PIXL coring drill turret locked in cradle
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 12), darkTitaniumMat);
  turret.rotateX(Math.PI / 2);
  turret.position.set(0.55, -0.12, 0.52);
  stowedArmGroup.add(turret);

  roverRoot.add(stowedArmGroup);

  // 4. AUTHENTIC ROCKER-BOGIE SUSPENSION & 6 WHEELS
  const wheels = [];

  // Wheel constructor: authentic Perseverance wheel
  // Diameter: 0.70m (radius 0.35m), Width: 0.34m
  const createWheel = () => {
    const wheelGroup = new THREE.Group();

    // Tire rim
    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.34, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, wheelTireMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Chevron traction cleats (grousers around tread)
    for (let c = 0; c < 16; c++) {
      const angle = (c / 16) * Math.PI * 2;
      const cleatGeo = new THREE.BoxGeometry(0.36, 0.025, 0.05);
      const cleat = new THREE.Mesh(cleatGeo, darkTitaniumMat);
      cleat.position.set(0, Math.cos(angle) * 0.355, Math.sin(angle) * 0.355);
      cleat.rotation.x = angle;
      wheelGroup.add(cleat);
    }

    // Curved titanium flexure spokes
    for (let s = 0; s < 6; s++) {
      const sAngle = (s / 6) * Math.PI * 2;
      const spokeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.32, 6);
      const spoke = new THREE.Mesh(spokeGeo, darkTitaniumMat);
      spoke.position.set(0, Math.cos(sAngle) * 0.16, Math.sin(sAngle) * 0.16);
      spoke.rotation.x = sAngle + 0.3;
      wheelGroup.add(spoke);
    }

    // Gold titanium central hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.38, 12), goldHubMat);
    hub.rotateZ(Math.PI / 2);
    wheelGroup.add(hub);

    return wheelGroup;
  };

  // 6 Wheel Placements
  // Ground contact is exactly y = 0.35 (radius 0.35) so wheel bottom touches ground at y = 0.0!
  const wheelLayout = [
    { name: 'front_left',  x: -1.05, y: 0.35, z: -1.1 },
    { name: 'front_right', x:  1.05, y: 0.35, z: -1.1 },
    { name: 'mid_left',    x: -1.15, y: 0.35, z:  0.08 },
    { name: 'mid_right',   x:  1.15, y: 0.35, z:  0.08 },
    { name: 'rear_left',   x: -1.05, y: 0.35, z:  1.22 },
    { name: 'rear_right',  x:  1.05, y: 0.35, z:  1.22 }
  ];

  wheelLayout.forEach(loc => {
    const wheel = createWheel();
    wheel.position.set(loc.x, loc.y, loc.z);
    roverRoot.add(wheel);
    wheels.push(wheel);
  });

  // Authentic Rocker-Bogie Linkage Arms (Left and Right side)
  [-1, 1].forEach(side => {
    const sideX = side * 0.88;

    // Main Rocker Arm: Pivots at center of chassis (y: 0.82, z: 0.0)
    // Runs forward to front wheel knuckle, and rearward to bogie pivot
    const rockerBarGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.35, 8);
    rockerBarGeo.rotateX(Math.PI / 4.5);
    const rockerBarFront = new THREE.Mesh(rockerBarGeo, darkTitaniumMat);
    rockerBarFront.position.set(sideX, 0.62, -0.55);
    roverRoot.add(rockerBarFront);

    // Front steering knuckle over front wheel
    const frontKnuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.32, 8), darkTitaniumMat);
    frontKnuckle.position.set(side * 1.05, 0.48, -1.1);
    roverRoot.add(frontKnuckle);

    // Rearward rocker leg to bogie pivot
    const rockerBarRear = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), darkTitaniumMat);
    rockerBarRear.rotateX(-Math.PI / 4.8);
    rockerBarRear.position.set(sideX, 0.64, 0.35);
    roverRoot.add(rockerBarRear);

    // Bogie Pivot joint
    const bogieJoint = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), goldHubMat);
    bogieJoint.position.set(sideX, 0.52, 0.62);
    roverRoot.add(bogieJoint);

    // Bogie Link: Pivots between middle wheel and rear wheel
    const bogieBar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.25, 8), darkTitaniumMat);
    bogieBar.rotateX(Math.PI / 2);
    bogieBar.position.set(side * 1.02, 0.42, 0.65);
    roverRoot.add(bogieBar);
  });

  // Ground Ambient Occlusion Contact Shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d');
  const sGrad = sCtx.createRadialGradient(64, 64, 12, 64, 64, 58);
  sGrad.addColorStop(0, 'rgba(12, 4, 2, 0.82)');
  sGrad.addColorStop(0.6, 'rgba(18, 6, 3, 0.4)');
  sGrad.addColorStop(1, 'transparent');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowGeo = new THREE.PlaneGeometry(3.6, 4.2);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false
  });
  const groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
  groundShadow.position.y = 0.02; // Sits just above ground plane
  roverRoot.add(groundShadow);

  return {
    roverRoot,
    wheels,
    mastHead,
    chassisGroup,
    updateAnimation: (time, delta, drivingSpeed = 1.0) => {
      // 1. Rotate all 6 wheels with true ground displacement rolling forward
      wheels.forEach(w => {
        w.rotation.x -= delta * 3.4 * drivingSpeed;
      });

      // 2. Subtle chassis vibration and suspension bounce over regolith
      chassisGroup.position.y = 0.82 + Math.sin(time * 5.0) * 0.015;
      chassisGroup.rotation.x = Math.sin(time * 2.8) * 0.012;
      chassisGroup.rotation.z = Math.cos(time * 2.2) * 0.008;

      // 3. Proportional mast camera scan
      mastHead.rotation.y = Math.sin(time * 0.75) * 0.35;
      mastHead.rotation.x = Math.sin(time * 1.1) * 0.08 - 0.04;
    }
  };
}
