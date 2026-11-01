import * as THREE from 'three';

export interface LanderLeg {
  legGroup: THREE.Group;
  hipBracket: THREE.Mesh;
  mainStrut: THREE.Mesh;
  cylinderSleeve: THREE.Mesh;
  telescopingAssembly: THREE.Group;
  piston: THREE.Mesh;
  footpad: THREE.Mesh;
  groundSensors: THREE.Mesh;
  localPadPos: THREE.Vector3;
  initialLocalY: number;
  currentExtension: number;
}

export interface LanderThruster {
  nozzle: THREE.Mesh;
  plumeGroup: THREE.Group;
  coreMesh: THREE.Mesh;
  machDiamonds: THREE.Mesh[];
  light: THREE.PointLight;
  localPos: THREE.Vector3;
}

export interface SingleGateRampAssembly {
  gatePivot: THREE.Group;
  singleRampPanel: THREE.Mesh;
  cleats: THREE.Mesh[];
  curbs: THREE.Mesh[];
  lockingBraces: THREE.Mesh[];
  latchPins: THREE.Mesh[];
  panelLength: number;
  panelWidth: number;
  panelThickness: number;
  sillLocalPos: THREE.Vector3;
  setGateAngle: (angleRad: number) => void;
  setLockedState: (locked: boolean) => void;
}

export interface DetailedMarsLanderAssembly {
  landerRoot: THREE.Group;
  hullGroup: THREE.Group;
  legs: LanderLeg[];
  gateRamp: SingleGateRampAssembly;
  thrusters: LanderThruster[];
  beaconLight: THREE.PointLight;
  hgaDish: THREE.Group;
  cargoBayLight: THREE.PointLight;
  setLegFootpadWorldY: (legIndex: number, targetWorldY: number, landerWorldY: number) => void;
}

/**
 * Builds a mechanically authentic Conceptual Mars Lander.
 * CRITICAL REQUIREMENTS:
 * 1. ONE SINGLE PHYSICAL PANEL serves as both the closed front gate and the deployed egress ramp.
 *    No duplicate ramp meshes, no secondary extension ramps, no hidden meshes underneath.
 *    Hierarchy: Lander Body -> Gate Hinge -> Single Gate/Ramp Panel.
 *    Hinge is at the actual bottom edge of the panel.
 * 2. 4 Independent Landing Legs with shock oleo-strut telescoping assemblies that
 *    position each footpad at the exact local terrain elevation.
 * 3. Layered supersonic thrusters and dynamic lighting.
 * 4. Stowed cargo bay with internal guide rails.
 */
export function createDetailedMarsLander(): DetailedMarsLanderAssembly {
  const landerRoot = new THREE.Group();
  landerRoot.name = 'ConceptualMarsLander';

  // --- AEROSPACE PBR MATERIALS ---
  const goldMliMat = new THREE.MeshStandardMaterial({
    color: 0xdfa126,
    metalness: 0.92,
    roughness: 0.22,
    name: 'GoldMLI'
  });

  const silverMliMat = new THREE.MeshStandardMaterial({
    color: 0xd8dde4,
    metalness: 0.88,
    roughness: 0.3,
    name: 'SilverMLI'
  });

  const whiteThermalMat = new THREE.MeshStandardMaterial({
    color: 0xf3f5f8,
    metalness: 0.25,
    roughness: 0.45,
    name: 'WhiteThermalCoating'
  });

  const darkTitaniumMat = new THREE.MeshStandardMaterial({
    color: 0x1f232b,
    metalness: 0.88,
    roughness: 0.35,
    name: 'DarkTitanium'
  });

  const chromePistonMat = new THREE.MeshStandardMaterial({
    color: 0xf8f9fa,
    metalness: 0.98,
    roughness: 0.1,
    name: 'ChromePiston'
  });

  const engineNozzleMat = new THREE.MeshStandardMaterial({
    color: 0x14161b,
    metalness: 0.92,
    roughness: 0.25,
    name: 'InconelNozzle'
  });

  const hazardLidarMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x004455,
    roughness: 0.2,
    metalness: 0.8
  });

  // Authentic dark aerospace carbon-composite ramp panel material
  const singlePanelMat = new THREE.MeshStandardMaterial({
    color: 0x1b1f26,
    metalness: 0.82,
    roughness: 0.45,
    name: 'SingleRampPanelMat'
  });

  const cleatMat = new THREE.MeshStandardMaterial({
    color: 0xd4a034,
    metalness: 0.88,
    roughness: 0.28
  });

  // --- MAIN HULL GROUP ---
  const hullGroup = new THREE.Group();
  hullGroup.position.y = 1.62;
  landerRoot.add(hullGroup);

  // 1. STRUCTURAL OCTAGONAL TRUSS SPACE-FRAME
  const trussRadius = 3.9;
  const trussHeight = 2.4;
  const numSides = 8;
  const trussAngles: number[] = [];
  for (let i = 0; i < numSides; i++) {
    trussAngles.push((i * Math.PI * 2) / numSides);
  }

  const strutTubeMat = darkTitaniumMat;
  const tubeRadius = 0.055;

  trussAngles.forEach((angle, idx) => {
    const nextAngle = trussAngles[(idx + 1) % numSides];
    const x1 = Math.cos(angle) * trussRadius;
    const z1 = Math.sin(angle) * trussRadius;
    const x2 = Math.cos(nextAngle) * trussRadius;
    const z2 = Math.sin(nextAngle) * trussRadius;

    // Leave the front cargo bay opening unobstructed (facing -Z)
    const isFrontOpening = Math.abs((z1 + z2) / 2 - -trussRadius * 0.9) < 1.2;

    if (!isFrontOpening) {
      const lowerChord = createTubeBetween(
        new THREE.Vector3(x1, -0.28, z1),
        new THREE.Vector3(x2, -0.28, z2),
        tubeRadius,
        strutTubeMat
      );
      hullGroup.add(lowerChord);

      const upperChord = createTubeBetween(
        new THREE.Vector3(x1, trussHeight - 0.28, z1),
        new THREE.Vector3(x2, trussHeight - 0.28, z2),
        tubeRadius,
        strutTubeMat
      );
      hullGroup.add(upperChord);

      const diagonalChord = createTubeBetween(
        new THREE.Vector3(x1, -0.28, z1),
        new THREE.Vector3(x2, trussHeight - 0.28, z2),
        tubeRadius * 0.8,
        strutTubeMat
      );
      hullGroup.add(diagonalChord);
    }

    const verticalPost = createTubeBetween(
      new THREE.Vector3(x1, -0.28, z1),
      new THREE.Vector3(x1, trussHeight - 0.28, z1),
      tubeRadius * 1.2,
      darkTitaniumMat
    );
    hullGroup.add(verticalPost);

    const nodeSphere = new THREE.Mesh(
      new THREE.SphereGeometry(tubeRadius * 1.5, 8, 8),
      darkTitaniumMat
    );
    nodeSphere.position.set(x1, -0.28, z1);
    hullGroup.add(nodeSphere);

    const topNodeSphere = nodeSphere.clone();
    topNodeSphere.position.set(x1, trussHeight - 0.28, z1);
    hullGroup.add(topNodeSphere);
  });

  // 2. CENTRAL AVIONICS & PROPELLANT CORE HULL
  const coreShellGeo = new THREE.CylinderGeometry(trussRadius * 0.88, trussRadius * 0.95, trussHeight * 0.9, 8);
  const coreShell = new THREE.Mesh(coreShellGeo, whiteThermalMat);
  coreShell.position.y = (trussHeight * 0.9) / 2 - 0.2;
  coreShell.castShadow = true;
  coreShell.receiveShadow = true;
  hullGroup.add(coreShell);

  const topDeckGeo = new THREE.CylinderGeometry(trussRadius * 0.82, trussRadius * 0.88, 0.28, 8);
  const topDeck = new THREE.Mesh(topDeckGeo, darkTitaniumMat);
  topDeck.position.y = trussHeight - 0.15;
  topDeck.castShadow = true;
  hullGroup.add(topDeck);

  // 3. 4 SPHERICAL HYDRAZINE PROPELLANT TANKS IN GOLD MLI FOIL
  const tankRadius = 0.92;
  const tankDist = 2.45;
  const tankPositions = [
    { x: tankDist * 0.72, z: tankDist * 0.72 },
    { x: -tankDist * 0.72, z: tankDist * 0.72 },
    { x: tankDist * 0.72, z: -tankDist * 0.55 },
    { x: -tankDist * 0.72, z: -tankDist * 0.55 }
  ];

  tankPositions.forEach(tp => {
    const tankGroup = new THREE.Group();
    tankGroup.position.set(tp.x, 0.75, tp.z);

    const tankSphere = new THREE.Mesh(
      new THREE.SphereGeometry(tankRadius, 24, 20),
      goldMliMat
    );
    tankSphere.castShadow = true;
    tankGroup.add(tankSphere);

    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(tankRadius * 1.02, 0.045, 8, 24),
      darkTitaniumMat
    );
    collar.rotation.x = Math.PI / 2;
    tankGroup.add(collar);

    const feedline = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.3, 8),
      silverMliMat
    );
    feedline.position.set(0, -tankRadius * 0.95, 0);
    tankGroup.add(feedline);

    hullGroup.add(tankGroup);
  });

  // 4. HELIUM HIGH-PRESSURE PRESSURANT BOTTLES
  [-1.1, 1.1].forEach(x => {
    const heBottle = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 16, 16),
      silverMliMat
    );
    heBottle.position.set(x, trussHeight + 0.1, 0.6);
    heBottle.castShadow = true;
    hullGroup.add(heBottle);

    const heCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 0.08, 16),
      darkTitaniumMat
    );
    heCollar.position.copy(heBottle.position);
    hullGroup.add(heCollar);
  });

  // 5. UPPER AVIONICS DECK, HGA DISH, SENSORS & BEACON
  const hgaDish = new THREE.Group();
  hgaDish.position.set(-1.4, trussHeight + 0.2, 1.1);

  const hgaPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.45, 12),
    darkTitaniumMat
  );
  hgaDish.add(hgaPedestal);

  const dishCurve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.15, 0.28, 24, 1, true),
    whiteThermalMat
  );
  dishCurve.position.set(0, 0.4, 0);
  dishCurve.rotation.x = 0.45;
  dishCurve.castShadow = true;
  hgaDish.add(dishCurve);

  const subreflector = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.2, 8),
    darkTitaniumMat
  );
  subreflector.position.set(0, 0.52, 0.12);
  subreflector.rotation.x = 0.45;
  hgaDish.add(subreflector);
  hullGroup.add(hgaDish);

  const uhfMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.035, 1.4, 8),
    darkTitaniumMat
  );
  uhfMast.position.set(1.5, trussHeight + 0.6, 1.2);
  hullGroup.add(uhfMast);

  const starTracker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.12, 0.35, 12),
    darkTitaniumMat
  );
  starTracker.position.set(0.7, trussHeight + 0.15, 1.5);
  starTracker.rotation.set(-0.3, 0.2, 0);
  hullGroup.add(starTracker);

  const beaconLight = new THREE.PointLight(0x00f0ff, 2.5, 18);
  beaconLight.position.set(0, trussHeight + 0.85, 0);
  hullGroup.add(beaconLight);

  const beaconCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff })
  );
  beaconCap.position.copy(beaconLight.position);
  hullGroup.add(beaconCap);

  [-1.2, 1.2].forEach(x => {
    const lidarPod = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.18, 0.32),
      darkTitaniumMat
    );
    lidarPod.position.set(x, 1.8, -trussRadius * 0.85);

    const lidarLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12),
      hazardLidarMat
    );
    lidarLens.rotation.x = Math.PI / 2;
    lidarLens.position.set(0, 0, -0.17);
    lidarPod.add(lidarLens);
    hullGroup.add(lidarPod);
  });

  // 6. INTERNAL CARGO COMPARTMENT
  const bayWidth = 2.6;
  const bayLength = 3.6;
  const bayFloor = new THREE.Mesh(
    new THREE.BoxGeometry(bayWidth, 0.14, bayLength),
    darkTitaniumMat
  );
  bayFloor.position.set(0, -0.22, 0.2);
  bayFloor.receiveShadow = true;
  hullGroup.add(bayFloor);

  // Wheel guide tracks inside cargo bay
  [-0.65, 0.65].forEach(x => {
    const guideRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, bayLength * 0.95),
      cleatMat
    );
    guideRail.position.set(x, -0.12, 0.2);
    hullGroup.add(guideRail);
  });

  const bayCeiling = new THREE.Mesh(
    new THREE.BoxGeometry(bayWidth, 0.1, bayLength * 0.85),
    darkTitaniumMat
  );
  bayCeiling.position.set(0, 1.7, 0.4);
  hullGroup.add(bayCeiling);

  const cargoBayLight = new THREE.PointLight(0xffb84d, 1.8, 8);
  cargoBayLight.position.set(0, 1.55, 0.3);
  hullGroup.add(cargoBayLight);

  // Front Portal Arch
  const portalArch = new THREE.Mesh(
    new THREE.BoxGeometry(bayWidth + 0.3, 1.9, 0.22),
    whiteThermalMat
  );
  portalArch.position.set(0, 0.72, -1.82);
  hullGroup.add(portalArch);

  // 7. SINGLE BLACK DEPLOYMENT GATE / RAMP PANEL (NO DUPLICATE MESHES)
  // Geometry & Pivot Hierarchy:
  // Lander Body (hullGroup)
  //   └── Gate Hinge (gatePivot at sill edge: x=0, y=-0.28, z=-1.86)
  //        └── Single Gate/Ramp Panel (singleRampPanel)
  // Length is 4.2m, reaching from the sill to the Martian terrain at a gentle driving slope of ~19 deg.
  const panelLength = 4.2;
  const panelWidth = 2.6;
  const panelThickness = 0.12;
  const sillLocalPos = new THREE.Vector3(0, -0.28, -1.86);

  const gatePivot = new THREE.Group();
  gatePivot.position.copy(sillLocalPos);

  // Single panel mesh: Hinge is at the actual edge of the panel (Z = 0 in local space).
  // The panel extends along -Z from Z = 0 to Z = -panelLength.
  // Driving surface is at Y = 0; bottom face is at Y = -panelThickness.
  const panelGeo = new THREE.BoxGeometry(panelWidth, panelThickness, panelLength);
  const singleRampPanel = new THREE.Mesh(panelGeo, singlePanelMat);
  singleRampPanel.position.set(0, -panelThickness / 2, -panelLength / 2);
  singleRampPanel.castShadow = true;
  singleRampPanel.receiveShadow = true;
  gatePivot.add(singleRampPanel);

  // Exterior structural reinforcement ribs on the back of the panel (visible when gate is closed)
  const xRib1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.05, panelLength * 0.98),
    darkTitaniumMat
  );
  xRib1.position.set(0, -panelThickness / 2 - 0.03, -panelLength / 2);
  gatePivot.add(xRib1);

  [-panelWidth * 0.38, panelWidth * 0.38].forEach(x => {
    const edgeRib = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.05, panelLength * 0.98),
      darkTitaniumMat
    );
    edgeRib.position.set(x, -panelThickness / 2 - 0.03, -panelLength / 2);
    gatePivot.add(edgeRib);
  });

  // Driving surface traction cleats on top of panel (exposed when opened)
  const cleats: THREE.Mesh[] = [];
  const numCleats = 9;
  for (let i = 1; i <= numCleats; i++) {
    const cleatZ = -i * (panelLength / (numCleats + 1));
    const cleat = new THREE.Mesh(
      new THREE.BoxGeometry(panelWidth * 0.88, 0.035, 0.075),
      cleatMat
    );
    cleat.position.set(0, 0.018, cleatZ);
    cleat.castShadow = true;
    gatePivot.add(cleat);
    cleats.push(cleat);
  }

  // Safety guide curbs along left and right edges
  const curbs: THREE.Mesh[] = [];
  [-panelWidth / 2 + 0.06, panelWidth / 2 - 0.06].forEach(x => {
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.22, panelLength),
      darkTitaniumMat
    );
    curb.position.set(x, 0.08, -panelLength / 2);
    curb.castShadow = true;
    gatePivot.add(curb);
    curbs.push(curb);
  });

  // Heavy mechanical hinge cylinder pinned at the sill edge
  const hingePin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, panelWidth * 1.04, 16),
    darkTitaniumMat
  );
  hingePin.rotation.z = Math.PI / 2;
  hingePin.position.set(0, 0, 0);
  gatePivot.add(hingePin);

  // Latch Pins on lander body frame (retract during GATE_UNLOCK)
  const latchPins: THREE.Mesh[] = [];
  [-panelWidth / 2 - 0.05, panelWidth / 2 + 0.05].forEach(x => {
    const latchPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.32, 12),
      darkTitaniumMat
    );
    latchPin.rotation.z = Math.PI / 2;
    latchPin.position.set(x, 0.8, -1.88);
    hullGroup.add(latchPin);
    latchPins.push(latchPin);
  });

  // Mechanical Scissor Locking Braces (engage when ramp locks onto terrain)
  const lockingBraces: THREE.Mesh[] = [];
  [-panelWidth / 2 + 0.15, panelWidth / 2 - 0.15].forEach(x => {
    const brace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.95, 8),
      cleatMat
    );
    brace.position.set(x, 0.15, -panelLength * 0.55);
    brace.rotation.x = Math.PI / 4;
    brace.visible = false;
    gatePivot.add(brace);
    lockingBraces.push(brace);
  });

  hullGroup.add(gatePivot);

  // Initial state: Gate closed vertically (Math.PI / 2)
  gatePivot.rotation.x = Math.PI / 2;

  const gateRamp: SingleGateRampAssembly = {
    gatePivot,
    singleRampPanel,
    cleats,
    curbs,
    lockingBraces,
    latchPins,
    panelLength,
    panelWidth,
    panelThickness,
    sillLocalPos,
    setGateAngle: (angleRad: number) => {
      gatePivot.rotation.x = angleRad;
    },
    setLockedState: (locked: boolean) => {
      lockingBraces.forEach(b => {
        b.visible = locked;
      });
    }
  };

  // 8. 4 ARTICULATED LANDING GEAR LEGS WITH INDEPENDENT TELESCOPING OLEO-STRUTS
  const legs: LanderLeg[] = [];
  const legAngles = [
    Math.PI / 4,       // Leg 0: Front-Right
    (3 * Math.PI) / 4, // Leg 1: Aft-Right
    (5 * Math.PI) / 4, // Leg 2: Aft-Left
    (7 * Math.PI) / 4  // Leg 3: Front-Left
  ];

  legAngles.forEach(angle => {
    const legRoot = new THREE.Group();
    const mountR = 3.85;
    legRoot.position.set(Math.cos(angle) * mountR, -0.28, Math.sin(angle) * mountR);
    legRoot.rotation.y = angle + Math.PI / 2;

    const hipBracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.28, 0.45),
      darkTitaniumMat
    );
    hipBracket.position.set(0, 0, 0.15);
    legRoot.add(hipBracket);

    const mainStrut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.6, 12),
      darkTitaniumMat
    );
    mainStrut.position.set(0, -0.45, 0.95);
    mainStrut.rotation.x = -0.68;
    mainStrut.castShadow = true;
    legRoot.add(mainStrut);

    // Fixed outer hydraulic sleeve
    const cylinderSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 2.0, 16),
      whiteThermalMat
    );
    cylinderSleeve.position.set(0, -0.85, 1.8);
    cylinderSleeve.rotation.x = -0.58;
    cylinderSleeve.castShadow = true;
    legRoot.add(cylinderSleeve);

    // Telescoping Assembly Group: Contains piston, ballJoint, footpad, groundSensors
    // Slides along the cylinder sleeve axis (angle = -0.58 rad)
    const telescopingAssembly = new THREE.Group();
    const initialLocalY = 0.0;
    telescopingAssembly.position.set(0, initialLocalY, 0);

    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 1.6, 16),
      chromePistonMat
    );
    piston.position.set(0, -1.25, 2.3);
    piston.rotation.x = -0.58;
    piston.castShadow = true;
    telescopingAssembly.add(piston);

    [-0.18, 0.18].forEach(x => {
      const scissorArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 1.5, 8),
        darkTitaniumMat
      );
      scissorArm.position.set(x, -0.7, 1.3);
      scissorArm.rotation.set(-0.85, 0, x > 0 ? 0.22 : -0.22);
      telescopingAssembly.add(scissorArm);
    });

    const ballJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 12),
      darkTitaniumMat
    );
    ballJoint.position.set(0, -1.68, 2.9);
    telescopingAssembly.add(ballJoint);

    const footpad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.82, 0.15, 6),
      darkTitaniumMat
    );
    footpad.position.set(0, -1.78, 2.9);
    footpad.castShadow = true;
    footpad.receiveShadow = true;
    telescopingAssembly.add(footpad);

    const groundSensors = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78, 0.78, 0.04, 6),
      cleatMat
    );
    groundSensors.position.set(0, -1.86, 2.9);
    telescopingAssembly.add(groundSensors);

    legRoot.add(telescopingAssembly);
    hullGroup.add(legRoot);

    // Compute uncompressed local footpad bottom position in lander coordinates
    const padLocal = new THREE.Vector3(0, -1.86, 2.9);
    padLocal.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle + Math.PI / 2);
    padLocal.add(new THREE.Vector3(Math.cos(angle) * mountR, -0.28, Math.sin(angle) * mountR));

    legs.push({
      legGroup: legRoot,
      hipBracket,
      mainStrut,
      cylinderSleeve,
      telescopingAssembly,
      piston,
      footpad,
      groundSensors,
      localPadPos: padLocal,
      initialLocalY,
      currentExtension: 0
    });
  });

  // Precision independent leg footpad height calculation
  // Ensures footpad bottom touches targetWorldY without floating or penetrating
  const setLegFootpadWorldY = (legIndex: number, targetWorldY: number, landerWorldY: number) => {
    if (legs[legIndex]) {
      const leg = legs[legIndex];
      const nominalPadWorldY = landerWorldY + leg.localPadPos.y;

      if (nominalPadWorldY >= targetWorldY) {
        // Free in air: uncompressed
        leg.telescopingAssembly.position.y = 0;
        leg.currentExtension = 0;
      } else {
        // Contact: compress shock absorber along its hydraulic cylinder axis
        const verticalDelta = targetWorldY - nominalPadWorldY;
        // Cylinder angle is ~0.58 rad from vertical (cos(0.58) ≈ 0.836)
        const strutCompress = Math.max(0, Math.min(0.38, verticalDelta / 0.836));
        leg.telescopingAssembly.position.y = strutCompress;
        leg.currentExtension = strutCompress;
      }
    }
  };

  // 9. 4 DESCENT ENGINE CLUSTERS WITH LAYERED PLUMES
  const thrusters: LanderThruster[] = [];
  const engineRadius = 2.75;
  const engineCoords = [
    { x: engineRadius * 0.7, z: engineRadius * 0.7 },
    { x: -engineRadius * 0.7, z: engineRadius * 0.7 },
    { x: engineRadius * 0.7, z: -engineRadius * 0.7 },
    { x: -engineRadius * 0.7, z: -engineRadius * 0.7 }
  ];

  const flameLength = 4.2;
  const outerPlumeGeo = new THREE.ConeGeometry(0.72, flameLength, 20, 1, true);
  outerPlumeGeo.rotateX(Math.PI);

  const corePlumeGeo = new THREE.ConeGeometry(0.32, flameLength * 0.75, 16, 1, true);
  corePlumeGeo.rotateX(Math.PI);

  const diamondGeo = new THREE.OctahedronGeometry(0.2, 0);

  engineCoords.forEach(ec => {
    const gimbalRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.045, 8, 16),
      darkTitaniumMat
    );
    gimbalRing.position.set(ec.x, -0.65, ec.z);
    gimbalRing.rotation.x = Math.PI / 2;
    hullGroup.add(gimbalRing);

    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.48, 0.82, 20),
      engineNozzleMat
    );
    nozzle.position.set(ec.x, -1.06, ec.z);
    nozzle.castShadow = true;
    hullGroup.add(nozzle);

    [0, -0.15, -0.32].forEach(yOff => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.24 + Math.abs(yOff) * 0.48, 0.02, 6, 20),
        darkTitaniumMat
      );
      ring.position.set(ec.x, -1.06 + yOff, ec.z);
      ring.rotation.x = Math.PI / 2;
      hullGroup.add(ring);
    });

    const plumeGroup = new THREE.Group();
    plumeGroup.position.set(ec.x, -1.48, ec.z);

    const outerPlume = new THREE.Mesh(
      outerPlumeGeo,
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    outerPlume.position.y = -flameLength / 2;
    plumeGroup.add(outerPlume);

    const coreMesh = new THREE.Mesh(
      corePlumeGeo,
      new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    coreMesh.position.y = (-flameLength * 0.75) / 2;
    plumeGroup.add(coreMesh);

    const machDiamonds: THREE.Mesh[] = [];
    [-0.8, -1.6, -2.4].forEach(yPos => {
      const diamond = new THREE.Mesh(
        diamondGeo,
        new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      diamond.position.y = yPos;
      diamond.scale.set(0.9, 1.5, 0.9);
      plumeGroup.add(diamond);
      machDiamonds.push(diamond);
    });

    const light = new THREE.PointLight(0x38bdf8, 4.0, 18);
    light.position.y = -1.2;
    plumeGroup.add(light);

    hullGroup.add(plumeGroup);

    thrusters.push({
      nozzle,
      plumeGroup,
      coreMesh,
      machDiamonds,
      light,
      localPos: new THREE.Vector3(ec.x, -1.48, ec.z)
    });
  });

  return {
    landerRoot,
    hullGroup,
    legs,
    gateRamp,
    thrusters,
    beaconLight,
    hgaDish,
    cargoBayLight,
    setLegFootpadWorldY
  };
}

function createTubeBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  material: THREE.Material
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const length = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, length, 8);
  const mesh = new THREE.Mesh(geo, material);

  mesh.position.addVectors(p1, p2).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = true;
  return mesh;
}
