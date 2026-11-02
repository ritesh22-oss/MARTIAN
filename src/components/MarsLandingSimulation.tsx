import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  Pause,
  RotateCcw,
  Camera,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Radio,
  Lock,
  Unlock
} from 'lucide-react';
import { createDetailedMarsRover } from '../utils/roverModel';
import { createDetailedMarsLander, DetailedMarsLanderAssembly } from '../utils/landerModel';

export interface MarsLandingSimulationProps {
  onSwitchToNavigation?: () => void;
}

export type LandingStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface StageInfo {
  id: LandingStage;
  key: string;
  name: string;
  shortLabel: string;
  desc: string;
  nominalDurationSec: number;
}

export const LANDING_STAGES: StageInfo[] = [
  {
    id: 1,
    key: 'DESCENT',
    name: 'Stage 01 — DESCENT',
    shortLabel: '01: Descent',
    desc: 'Powered vertical descent from 65m AGL. 4 descent engines throttle at high thrust with supersonic core plumes and Mach shock diamonds.',
    nominalDurationSec: 4.5
  },
  {
    id: 2,
    key: 'APPROACH',
    name: 'Stage 02 — APPROACH',
    shortLabel: '02: Approach',
    desc: 'Controlled deceleration through 28m to 10m AGL. Velocity slows to -1.8 m/s; high-speed exhaust impingement initiates ground dust displacement.',
    nominalDurationSec: 4.0
  },
  {
    id: 3,
    key: 'ENGINE_DECELERATION',
    name: 'Stage 03 — ENGINE DECELERATION',
    shortLabel: '03: Decel Burn',
    desc: 'Terminal deceleration burn from 10m to 2.2m AGL. Radial regolith dust clouds billow outward from under the 4 engine clusters.',
    nominalDurationSec: 4.0
  },
  {
    id: 4,
    key: 'LEG_CONTACT',
    name: 'Stage 04 — LEG CONTACT',
    shortLabel: '04: Leg Contact',
    desc: 'Each of the 4 self-leveling hexagonal footpads makes physical contact with the actual local terrain height. Contact switches trip.',
    nominalDurationSec: 2.2
  },
  {
    id: 5,
    key: 'TOUCHDOWN',
    name: 'Stage 05 — TOUCHDOWN',
    shortLabel: '05: Touchdown',
    desc: 'Spacecraft chassis descends into suspension; telescoping chrome oleo-strut pistons compress independently to absorb kinetic impact.',
    nominalDurationSec: 2.5
  },
  {
    id: 6,
    key: 'STABILIZATION',
    name: 'Stage 06 — STABILIZATION',
    shortLabel: '06: Settle',
    desc: 'Damped harmonic body settling brings spacecraft chassis to rest at nominal sill height. Vehicle attitude locks onto terrain contour.',
    nominalDurationSec: 2.5
  },
  {
    id: 7,
    key: 'ENGINE_SHUTDOWN',
    name: 'Stage 07 — ENGINE SHUTDOWN',
    shortLabel: '07: Engine Cut',
    desc: 'Descent engines shut down only after touchdown is complete. Exhaust plumes extinguish; billowing dust gradually settles into the soil.',
    nominalDurationSec: 2.5
  },
  {
    id: 8,
    key: 'GATE_UNLOCK',
    name: 'Stage 08 — GATE UNLOCK',
    shortLabel: '08: Gate Unlock',
    desc: 'Rover remains locked inside bay. Pneumatic latch cylinders depressurize and structural locking pins visibly retract from gate frame.',
    nominalDurationSec: 2.2
  },
  {
    id: 9,
    key: 'GATE_OPENING',
    name: 'Stage 09 — GATE OPENING',
    shortLabel: '09: Gate Open',
    desc: 'The single black deployment gate rotates downward on its sill hinge (90° vertical -> 18.6° incline) to become the rover egress ramp.',
    nominalDurationSec: 4.5
  },
  {
    id: 10,
    key: 'RAMP_DEPLOYMENT',
    name: 'Stage 10 — RAMP DEPLOYMENT',
    shortLabel: '10: Ramp Lower',
    desc: 'The single gate panel lowers into direct contact with the Martian terrain. Panel edge remains securely hinged to the lander body.',
    nominalDurationSec: 2.5
  },
  {
    id: 11,
    key: 'RAMP_LOCKING',
    name: 'Stage 11 — RAMP LOCKING',
    shortLabel: '11: Ramp Lock',
    desc: 'Structural scissor braces lock the ramp rigidly. Panel tip contacts the ground flush. Ramp is now rigid; rover egress authorized.',
    nominalDurationSec: 2.2
  },
  {
    id: 12,
    key: 'ROVER_ACTIVATION',
    name: 'Stage 12 — ROVER ACTIVATION',
    shortLabel: '12: Rover Boot',
    desc: 'Perseverance wakes up inside bay: avionics boot, twin high-intensity LED headlights power on, and camera mast pans in diagnostic sweep.',
    nominalDurationSec: 3.5
  },
  {
    id: 13,
    key: 'ROVER_DESCENT',
    name: 'Stage 13 — ROVER DESCENT',
    shortLabel: '13: Ramp Roll',
    desc: 'Rover drives down the single locked ramp panel. All 6 wheels maintain continuous contact; wheel rotation matches linear speed; pitch aligns with ramp.',
    nominalDurationSec: 6.0
  },
  {
    id: 14,
    key: 'GROUND_CONTACT',
    name: 'Stage 14 — GROUND CONTACT',
    shortLabel: '14: Ground Step',
    desc: 'Front, middle, and rear rocker-bogie wheels transition off the ramp panel onto Martian regolith; vehicle pitch smoothly levels out to horizontal.',
    nominalDurationSec: 3.5
  },
  {
    id: 15,
    key: 'DEPLOYMENT_COMPLETE',
    name: 'Stage 15 — DEPLOYMENT COMPLETE',
    shortLabel: '15: Ready',
    desc: 'Rover parked safely at 11.8m standoff distance. Panoramic science survey begins; lander establishes high-gain surface relay.',
    nominalDurationSec: 999
  }
];

function getElevation(x: number, z: number): number {
  const distFromCenter = Math.hypot(x, z);
  const flatFactor = Math.min(1.0, Math.max(0.0, (distFromCenter - 12) / 32));

  let y = Math.sin(x * 0.035) * Math.cos(z * 0.032) * 3.6;
  y += Math.cos(x * 0.018 - z * 0.022) * 2.4;
  y += Math.sin(x * 0.09 + z * 0.065) * 0.8;

  const craterDist = Math.hypot(x + 45, z - 35);
  if (craterDist < 26) {
    const t = craterDist / 26;
    y -= (Math.cos(t * Math.PI) + 1.0) * 3.2;
  }
  return y * flatFactor;
}

export default function MarsLandingSimulation({ onSwitchToNavigation }: MarsLandingSimulationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback & UI State
  const [currentStage, setCurrentStage] = useState<LandingStage>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'free' | 'descent' | 'touchdown' | 'ramp' | 'rover'>('descent');

  // Real-time Telemetry HUD
  const [telemetry, setTelemetry] = useState({
    altitudeM: 63.4,
    verticalSpeedMps: -5.8,
    thrusterPct: 100,
    gateAngleDeg: 90,
    rampLocked: false,
    roverStandoffM: 0.0,
    landerStatus: 'DESCENT',
    leg0Contact: false,
    leg1Contact: false,
    leg2Contact: false,
    leg3Contact: false
  });

  // Animation internal mutable state ref (guarantees 60fps loop with zero React re-render latency)
  const animStateRef = useRef({
    currentStage: 1 as LandingStage,
    isPlaying: true,
    simSpeed: 1.0,
    stageProgress: 0.0,
    elapsedTime: 0,

    // Spacecraft Kinematics
    landerY: 65.0,
    settledLanderY: 1.62,
    legCompressions: [0, 0, 0, 0],
    thrustersOn: true,
    thrusterLevel: 1.0,
    dustLevel: 0.0,

    // SINGLE Physical Gate/Ramp Panel
    gateAngle: Math.PI / 2, // 90 deg = vertical closed
    finalRampAngle: -0.325, // Calculated precisely from terrain elevation
    rampLocked: false,
    latchUnlocked: false,

    // Rover Kinematics (Stowed inside cargo bay at starting transform)
    roverZ: 0.2, // Stowed completely behind closed gate at Z = 0.2
    roverY: 1.62 - 0.22,
    roverPitch: 0.0,
    roverHeadlightsOn: false,
    wheelRotations: 0,

    // Camera Orbit
    cameraMode: 'descent' as 'free' | 'descent' | 'touchdown' | 'ramp' | 'rover',
    orbitAngles: { theta: 0.52, phi: 0.32 },
    orbitDist: 38,
    isDragging: false,
    prevMouse: { x: 0, y: 0 }
  });

  useEffect(() => {
    animStateRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    animStateRef.current.simSpeed = simSpeed;
  }, [simSpeed]);

  useEffect(() => {
    animStateRef.current.cameraMode = cameraMode;
  }, [cameraMode]);

  // Jump deterministically to any stage
  const jumpToStage = useCallback((stage: LandingStage) => {
    const s = animStateRef.current;
    s.currentStage = stage;
    s.stageProgress = 0.0;
    setCurrentStage(stage);

    const rampTarget = s.finalRampAngle;
    const settledY = s.settledLanderY;
    const yOffset = settledY - 1.62;

    if (stage <= 1) {
      s.landerY = 65.0 + yOffset;
      s.legCompressions = [0, 0, 0, 0];
      s.thrustersOn = true;
      s.thrusterLevel = 1.0;
      s.dustLevel = 0.0;
      s.gateAngle = Math.PI / 2;
      s.rampLocked = false;
      s.latchUnlocked = false;
      s.roverZ = 0.2;
      s.roverY = s.landerY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 2) {
      s.landerY = 28.0 + yOffset;
      s.legCompressions = [0, 0, 0, 0];
      s.thrustersOn = true;
      s.thrusterLevel = 0.85;
      s.dustLevel = 0.25;
      s.gateAngle = Math.PI / 2;
      s.rampLocked = false;
      s.latchUnlocked = false;
      s.roverZ = 0.2;
      s.roverY = s.landerY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 3) {
      s.landerY = 10.0 + yOffset;
      s.legCompressions = [0, 0, 0, 0];
      s.thrustersOn = true;
      s.thrusterLevel = 0.7;
      s.dustLevel = 0.7;
      s.gateAngle = Math.PI / 2;
      s.rampLocked = false;
      s.latchUnlocked = false;
      s.roverZ = 0.2;
      s.roverY = s.landerY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 4) {
      s.landerY = 2.2 + yOffset;
      s.legCompressions = [0.03, 0.02, 0.04, 0.03];
      s.thrustersOn = true;
      s.thrusterLevel = 0.45;
      s.dustLevel = 0.95;
      s.gateAngle = Math.PI / 2;
      s.rampLocked = false;
      s.latchUnlocked = false;
      s.roverZ = 0.2;
      s.roverY = s.landerY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 5) {
      s.landerY = 1.75 + yOffset;
      s.legCompressions = [0.15, 0.14, 0.16, 0.15];
      s.thrustersOn = true;
      s.thrusterLevel = 0.2;
      s.dustLevel = 0.8;
      s.gateAngle = Math.PI / 2;
      s.rampLocked = false;
      s.latchUnlocked = false;
      s.roverZ = 0.2;
      s.roverY = s.landerY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 6) {
      s.landerY = settledY;
      s.legCompressions = [0.24, 0.23, 0.25, 0.24];
      s.thrustersOn = true;
      s.thrusterLevel = 0.05;
      s.dustLevel = 0.4;
      s.gateAngle = Math.PI / 2;
      s.rampLocked = false;
      s.latchUnlocked = false;
      s.roverZ = 0.2;
      s.roverY = settledY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 7) {
      s.landerY = settledY;
      s.legCompressions = [0.24, 0.23, 0.25, 0.24];
      s.thrustersOn = false;
      s.thrusterLevel = 0.0;
      s.dustLevel = 0.1;
      s.gateAngle = Math.PI / 2;
      s.rampLocked = false;
      s.latchUnlocked = false;
      s.roverZ = 0.2;
      s.roverY = settledY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 8) {
      s.landerY = settledY;
      s.legCompressions = [0.24, 0.23, 0.25, 0.24];
      s.thrustersOn = false;
      s.thrusterLevel = 0.0;
      s.dustLevel = 0.0;
      s.gateAngle = Math.PI / 2;
      s.rampLocked = false;
      s.latchUnlocked = true;
      s.roverZ = 0.2;
      s.roverY = settledY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 9) {
      s.landerY = settledY;
      s.legCompressions = [0.24, 0.23, 0.25, 0.24];
      s.thrustersOn = false;
      s.thrusterLevel = 0.0;
      s.dustLevel = 0.0;
      s.gateAngle = Math.PI / 2 + (rampTarget - Math.PI / 2) * 0.5;
      s.rampLocked = false;
      s.latchUnlocked = true;
      s.roverZ = 0.2;
      s.roverY = settledY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 10) {
      s.landerY = settledY;
      s.legCompressions = [0.24, 0.23, 0.25, 0.24];
      s.thrustersOn = false;
      s.thrusterLevel = 0.0;
      s.dustLevel = 0.0;
      s.gateAngle = rampTarget;
      s.rampLocked = false;
      s.latchUnlocked = true;
      s.roverZ = 0.2;
      s.roverY = settledY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 11) {
      s.landerY = settledY;
      s.legCompressions = [0.24, 0.23, 0.25, 0.24];
      s.thrustersOn = false;
      s.thrusterLevel = 0.0;
      s.dustLevel = 0.0;
      s.gateAngle = rampTarget;
      s.rampLocked = true;
      s.latchUnlocked = true;
      s.roverZ = 0.2;
      s.roverY = settledY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = false;
    } else if (stage === 12) {
      s.landerY = settledY;
      s.legCompressions = [0.24, 0.23, 0.25, 0.24];
      s.thrustersOn = false;
      s.thrusterLevel = 0.0;
      s.dustLevel = 0.0;
      s.gateAngle = rampTarget;
      s.rampLocked = true;
      s.latchUnlocked = true;
      s.roverZ = 0.2;
      s.roverY = settledY - 0.22;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = true;
    } else if (stage === 13) {
      s.landerY = settledY;
      s.legCompressions = [0.24, 0.23, 0.25, 0.24];
      s.thrustersOn = false;
      s.thrusterLevel = 0.0;
      s.dustLevel = 0.0;
      s.gateAngle = rampTarget;
      s.rampLocked = true;
      s.latchUnlocked = true;
      s.roverZ = -2.5;
      s.roverPitch = rampTarget;
      s.roverHeadlightsOn = true;
    } else if (stage === 14) {
      s.landerY = settledY;
      s.legCompressions = [0.24, 0.23, 0.25, 0.24];
      s.thrustersOn = false;
      s.thrusterLevel = 0.0;
      s.dustLevel = 0.0;
      s.gateAngle = rampTarget;
      s.rampLocked = true;
      s.latchUnlocked = true;
      s.roverZ = -5.0;
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = true;
    } else if (stage === 15) {
      s.landerY = settledY;
      s.legCompressions = [0.24, 0.23, 0.25, 0.24];
      s.thrustersOn = false;
      s.thrusterLevel = 0.0;
      s.dustLevel = 0.0;
      s.gateAngle = rampTarget;
      s.rampLocked = true;
      s.latchUnlocked = true;
      s.roverZ = -10.0;
      s.roverY = getElevation(0, -10.0);
      s.roverPitch = 0.0;
      s.roverHeadlightsOn = true;
    }
  }, []);

  const handleReset = useCallback(() => {
    jumpToStage(1);
    setIsPlaying(true);
    setCameraMode('descent');
  }, [jumpToStage]);

  const handleDeployRover = useCallback(() => {
    jumpToStage(8);
    setIsPlaying(true);
    setCameraMode('ramp');
  }, [jumpToStage]);

  // Main Three.js Scene Setup & Animation Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x130704);
    scene.fog = new THREE.FogExp2(0xc85929, 0.007);

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1600);
    camera.position.set(30, 36, 44);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 2. Atmospheric & Directional Lighting
    const sunLight = new THREE.DirectionalLight(0xfff0db, 3.8);
    sunLight.position.set(65, 55, -45);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 320;
    const d = 65;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x732915, 1.3);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfa9157, 0x1b0602, 1.1);
    scene.add(hemiLight);

    // 3. Martian Jezero Crater Terrain Topography
    // SINGLE SOURCE OF TRUTH for visual rendering, landing footpads, ramp ground contact, and rover wheels
    const terrainSize = 250;
    const terrainSegments = 160;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors: number[] = [];
    const colLow = new THREE.Color(0x6e210b);
    const colOchre = new THREE.Color(0xbf491b);
    const colHigh = new THREE.Color(0xe26a2c);

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = getElevation(vx, vz);
      pos.setY(i, vy);

      const normY = (vy + 4.0) / 10.0;
      const c = new THREE.Color().lerpColors(colLow, colOchre, Math.min(Math.max(normY, 0), 1));
      if (vy > 0.8) c.lerp(colHigh, 0.45);
      colors.push(c.r, c.g, c.b);
    }
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.12,
      flatShading: false
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Scattered Mars Boulders outside touchdown footprint
    const boulderGeo = new THREE.DodecahedronGeometry(0.85, 1);
    const boulderMat = new THREE.MeshStandardMaterial({ color: 0x5a1e10, roughness: 0.94 });
    const boulderGroup = new THREE.Group();
    for (let i = 0; i < 48; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 18 + Math.random() * 85;
      const bx = Math.cos(angle) * r;
      const bz = Math.sin(angle) * r;
      const by = getElevation(bx, bz);
      const rock = new THREE.Mesh(boulderGeo, boulderMat);
      rock.position.set(bx, by + 0.35, bz);
      const scale = 0.5 + Math.random() * 1.6;
      rock.scale.set(scale, scale * (0.6 + Math.random() * 0.4), scale);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = true;
      rock.receiveShadow = true;
      boulderGroup.add(rock);
    }
    scene.add(boulderGroup);

    // 4. DETAILED PROCEDURAL SPACECRAFT LANDER (Single Gate-As-Ramp Panel)
    const landerAssembly: DetailedMarsLanderAssembly = createDetailedMarsLander();
    scene.add(landerAssembly.landerRoot);

    // Calculate exact terrain-settled lander height from the 4 footpads
    const footpadGroundHeights = landerAssembly.legs.map(leg => {
      return getElevation(leg.localPadPos.x, leg.localPadPos.z);
    });
    const avgFootpadTerrainY = footpadGroundHeights.reduce((a, b) => a + b, 0) / footpadGroundHeights.length;
    // Settled height should allow the 3.2m ramp to reach the ground comfortably.
    // At sillHeight = 1.34m, ramp angle is ~24 deg.
    const nominalSettledY = avgFootpadTerrainY + 1.62;
    animStateRef.current.settledLanderY = nominalSettledY;

    // Calculate exact deployed ramp angle so the single panel tip touches terrain
    const panelL = landerAssembly.gateRamp.panelLength;
    const sillWorldY = nominalSettledY - 0.28;
    const sillWorldZ = -1.86;
    
    // Iterate slightly to find best contact angle on potentially uneven terrain
    let bestAngle = -0.42; // default ~24 deg
    for (let i = 0; i < 5; i++) {
      const currentToeZ = sillWorldZ - panelL * Math.cos(bestAngle);
      const terrainAtToe = getElevation(0, currentToeZ);
      bestAngle = -Math.asin(Math.min(0.9, Math.max(0.1, (sillWorldY - terrainAtToe) / panelL)));
    }
    animStateRef.current.finalRampAngle = bestAngle;

    // 5. NASA MARS 2020 PERSEVERANCE ROVER MODEL
    const { roverRoot, wheels, mastHead } = createDetailedMarsRover();
    scene.add(roverRoot);

    // Rover Headlights
    const headlightLeft = new THREE.SpotLight(0xe0f2fe, 0, 22, Math.PI / 5.5, 0.45);
    headlightLeft.position.set(-0.45, 0.85, -1.2);
    headlightLeft.target.position.set(-0.45, 0, -9);
    roverRoot.add(headlightLeft);
    roverRoot.add(headlightLeft.target);

    const headlightRight = new THREE.SpotLight(0xe0f2fe, 0, 22, Math.PI / 5.5, 0.45);
    headlightRight.position.set(0.45, 0.85, -1.2);
    headlightRight.target.position.set(0.45, 0, -9);
    roverRoot.add(headlightRight);
    roverRoot.add(headlightRight.target);

    const lensGlowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 });
    [-0.45, 0.45].forEach(x => {
      const g = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), lensGlowMat);
      g.position.set(x, 0.85, -1.21);
      g.rotation.y = Math.PI;
      roverRoot.add(g);
    });

    // 6. LAYERED EXHAUST STREAKS & REGOLITH DUST PARTICLES
    const streakCount = 60;
    const streakGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.8, 6);
    streakGeo.rotateX(Math.PI / 2);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const streakGroup = new THREE.Group();
    const streakParticles: Array<{ mesh: THREE.Mesh; engineIdx: number; t: number; speed: number }> = [];

    for (let i = 0; i < streakCount; i++) {
      const mesh = new THREE.Mesh(streakGeo, streakMat);
      const engineIdx = i % 4;
      mesh.visible = false;
      streakGroup.add(mesh);
      streakParticles.push({
        mesh,
        engineIdx,
        t: Math.random(),
        speed: 8.0 + Math.random() * 12.0
      });
    }
    scene.add(streakGroup);

    const dustCount = 160;
    const dustGroup = new THREE.Group();
    const dustParticles: Array<{
      mesh: THREE.Mesh;
      engineIdx: number;
      curDist: number;
      angle: number;
      curY: number;
      speed: number;
      updraftSpeed: number;
      scale: number;
    }> = [];

    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = 64;
    dustCanvas.height = 64;
    const ctx = dustCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(235, 138, 75, 0.95)');
      grad.addColorStop(0.45, 'rgba(195, 92, 38, 0.6)');
      grad.addColorStop(1, 'rgba(140, 45, 15, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const dustTexture = new THREE.CanvasTexture(dustCanvas);

    const dustGeo = new THREE.PlaneGeometry(1.8, 1.8);
    const dustMat = new THREE.MeshBasicMaterial({
      map: dustTexture,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < dustCount; i++) {
      const p = new THREE.Mesh(dustGeo, dustMat.clone());
      const engineIdx = i % 4;
      const angle = (i / dustCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = 0.5 + Math.random() * 3.0;
      p.visible = false;
      dustGroup.add(p);
      dustParticles.push({
        mesh: p,
        engineIdx,
        curDist: dist,
        angle,
        curY: 0.2 + Math.random() * 0.4,
        speed: 1.5 + Math.random() * 3.0,
        updraftSpeed: 0.3 + Math.random() * 0.5,
        scale: 0.8 + Math.random() * 1.6
      });
    }
    scene.add(dustGroup);

    // 7. MOUSE ORBIT CONTROLS
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        animStateRef.current.isDragging = true;
        animStateRef.current.prevMouse = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!animStateRef.current.isDragging) return;
      const dx = e.clientX - animStateRef.current.prevMouse.x;
      const dy = e.clientY - animStateRef.current.prevMouse.y;
      animStateRef.current.prevMouse = { x: e.clientX, y: e.clientY };

      animStateRef.current.orbitAngles.theta -= dx * 0.0075;
      animStateRef.current.orbitAngles.phi = Math.max(
        0.06,
        Math.min(Math.PI / 2 - 0.06, animStateRef.current.orbitAngles.phi + dy * 0.0075)
      );

      animStateRef.current.cameraMode = 'free';
      setCameraMode('free');
    };

    const onMouseUp = () => {
      animStateRef.current.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      animStateRef.current.orbitDist = Math.max(10, Math.min(110, animStateRef.current.orbitDist + e.deltaY * 0.04));
      animStateRef.current.cameraMode = 'free';
      setCameraMode('free');
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // 8. HIGH-PRECISION 60FPS SIMULATION ANIMATION LOOP
    let animationFrameId: number;
    let lastClockTime = performance.now();

    const animate = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = Math.min((timestamp - lastClockTime) / 1000, 0.1);
      lastClockTime = timestamp;

      const state = animStateRef.current;
      const speed = state.simSpeed;

      if (state.isPlaying) {
        state.elapsedTime += delta * speed;

        const activeStageDef = LANDING_STAGES.find(s => s.id === state.currentStage) || LANDING_STAGES[0];
        const stageDuration = activeStageDef.nominalDurationSec;

        if (state.currentStage < 15) {
          state.stageProgress += (delta * speed) / stageDuration;
        } else {
          state.stageProgress = 1.0;
        }

        const settledY = state.settledLanderY;
        const rampContactAngle = state.finalRampAngle;

        // Pre-calculate current ramp geometry for use in state machine
        const sillZ = -1.86;
        const currentPanelAngle = state.gateAngle;
        const panelL = landerAssembly.gateRamp.panelLength;
        const toeZ = sillZ - panelL * Math.cos(currentPanelAngle);

        // --- 15-STAGE STATE MACHINE ---
        switch (state.currentStage) {
          case 1: {
            // 1. DESCENT
            const t = Math.min(1.0, state.stageProgress);
            state.landerY = THREE.MathUtils.lerp(65.0, 28.0, t);
            state.thrustersOn = true;
            state.thrusterLevel = 1.0;
            state.dustLevel = 0.0;
            state.gateAngle = Math.PI / 2;
            state.rampLocked = false;
            state.latchUnlocked = false;
            state.roverZ = 0.2;
            state.roverPitch = 0.0;
            state.roverHeadlightsOn = false;

            landerAssembly.hullGroup.rotation.z = Math.sin(state.elapsedTime * 3.5) * 0.012;
            landerAssembly.hullGroup.rotation.x = Math.cos(state.elapsedTime * 2.8) * 0.01;

            if (state.stageProgress >= 1.0) {
              state.currentStage = 2;
              state.stageProgress = 0.0;
              setCurrentStage(2);
            }
            break;
          }
          case 2: {
            // 2. APPROACH
            const t = Math.min(1.0, state.stageProgress);
            state.landerY = THREE.MathUtils.lerp(28.0, 10.0, t);
            state.thrustersOn = true;
            state.thrusterLevel = 0.85;
            state.dustLevel = THREE.MathUtils.lerp(0.0, 0.5, t);
            state.gateAngle = Math.PI / 2;
            state.rampLocked = false;
            state.latchUnlocked = false;
            state.roverZ = 0.2;

            landerAssembly.hullGroup.rotation.z = Math.sin(state.elapsedTime * 2.5) * 0.007;
            landerAssembly.hullGroup.rotation.x = Math.cos(state.elapsedTime * 2.2) * 0.005;

            if (state.stageProgress >= 1.0) {
              state.currentStage = 3;
              state.stageProgress = 0.0;
              setCurrentStage(3);
            }
            break;
          }
          case 3: {
            // 3. ENGINE DECELERATION
            const t = Math.min(1.0, state.stageProgress);
            const easeY = Math.pow(t, 0.88);
            state.landerY = THREE.MathUtils.lerp(10.0, 2.2, easeY);
            state.thrustersOn = true;
            state.thrusterLevel = 0.7;
            state.dustLevel = THREE.MathUtils.lerp(0.5, 1.0, t);
            state.gateAngle = Math.PI / 2;
            state.rampLocked = false;
            state.latchUnlocked = false;
            state.roverZ = 0.2;

            landerAssembly.hullGroup.rotation.z = THREE.MathUtils.damp(landerAssembly.hullGroup.rotation.z, 0, 4, delta);
            landerAssembly.hullGroup.rotation.x = THREE.MathUtils.damp(landerAssembly.hullGroup.rotation.x, 0, 4, delta);

            if (state.stageProgress >= 1.0) {
              state.currentStage = 4;
              state.stageProgress = 0.0;
              setCurrentStage(4);
            }
            break;
          }
          case 4: {
            // 4. LEG CONTACT
            // Footpads contact local terrain without penetrating or floating
            const t = Math.min(1.0, state.stageProgress);
            state.landerY = THREE.MathUtils.lerp(2.2, 1.85, t);
            state.thrustersOn = true;
            state.thrusterLevel = 0.55;
            state.dustLevel = 1.0;
            state.gateAngle = Math.PI / 2;
            state.rampLocked = false;
            state.latchUnlocked = false;
            state.roverZ = 0.2;

            if (state.stageProgress >= 1.0) {
              state.currentStage = 5;
              state.stageProgress = 0.0;
              setCurrentStage(5);
            }
            break;
          }
          case 5: {
            // 5. TOUCHDOWN
            // Shock absorbers compress independently to absorb kinetic energy
            const t = Math.min(1.0, state.stageProgress);
            state.landerY = THREE.MathUtils.lerp(1.85, 1.68, t);
            state.thrustersOn = true;
            state.thrusterLevel = THREE.MathUtils.lerp(0.4, 0.15, t);
            state.dustLevel = 0.85;
            state.gateAngle = Math.PI / 2;
            state.rampLocked = false;
            state.latchUnlocked = false;
            state.roverZ = 0.2;

            if (state.stageProgress >= 1.0) {
              state.currentStage = 6;
              state.stageProgress = 0.0;
              setCurrentStage(6);
            }
            break;
          }
          case 6: {
            // 6. STABILIZATION
            // Damped harmonic body settling into stable height
            const t = Math.min(1.0, state.stageProgress);
            const bounce = Math.sin(t * Math.PI) * 0.05 * Math.exp(-t * 2.8);
            state.landerY = THREE.MathUtils.lerp(1.68, settledY, t) - bounce;
            state.thrustersOn = t < 0.3;
            state.thrusterLevel = Math.max(0, 0.15 * (1 - t * 3.3));
            state.dustLevel = Math.max(0.15, 0.6 * (1 - t));
            state.gateAngle = Math.PI / 2;
            state.rampLocked = false;
            state.latchUnlocked = false;
            state.roverZ = 0.2;

            if (state.stageProgress >= 1.0) {
              state.currentStage = 7;
              state.stageProgress = 0.0;
              setCurrentStage(7);
            }
            break;
          }
          case 7: {
            // 7. ENGINE SHUTDOWN
            // Flame cutoff; residual dust billows and settles
            const t = Math.min(1.0, state.stageProgress);
            state.landerY = settledY;
            state.thrustersOn = false;
            state.thrusterLevel = 0.0;
            state.dustLevel = Math.max(0.0, 0.25 * (1 - t));
            state.gateAngle = Math.PI / 2;
            state.rampLocked = false;
            state.latchUnlocked = false;
            state.roverZ = 0.2;

            if (state.stageProgress >= 1.0) {
              state.currentStage = 8;
              state.stageProgress = 0.0;
              setCurrentStage(8);
            }
            break;
          }
          case 8: {
            // 8. GATE UNLOCK
            // Latches unclamp and pins retract; rover strictly held inside
            const t = Math.min(1.0, state.stageProgress);
            state.landerY = settledY;
            state.thrustersOn = false;
            state.dustLevel = 0.0;
            state.gateAngle = Math.PI / 2;
            state.rampLocked = false;
            state.latchUnlocked = t > 0.4;
            state.roverZ = 0.2;

            landerAssembly.gateRamp.latchPins.forEach(pin => {
              pin.position.z = THREE.MathUtils.lerp(-1.88, -1.72, t);
            });

            if (state.stageProgress >= 1.0) {
              state.currentStage = 9;
              state.stageProgress = 0.0;
              setCurrentStage(9);
            }
            break;
          }
          case 9: {
            // 9. GATE OPENING
            // The single black panel rotates downward on its sill hinge
            const t = Math.min(1.0, state.stageProgress);
            const gateEase = 0.5 - Math.cos(t * Math.PI) * 0.5;
            state.gateAngle = THREE.MathUtils.lerp(Math.PI / 2, rampContactAngle, gateEase);
            state.rampLocked = false;
            state.latchUnlocked = true;
            state.roverZ = 0.2;

            if (state.stageProgress >= 1.0) {
              state.currentStage = 10;
              state.stageProgress = 0.0;
              setCurrentStage(10);
            }
            break;
          }
          case 10: {
            // 10. RAMP DEPLOYMENT
            // The same single panel reaches the terrain
            state.gateAngle = rampContactAngle;
            state.rampLocked = false;
            state.latchUnlocked = true;
            state.roverZ = 0.2;

            if (state.stageProgress >= 1.0) {
              state.currentStage = 11;
              state.stageProgress = 0.0;
              setCurrentStage(11);
            }
            break;
          }
          case 11: {
            // 11. RAMP LOCKING
            // Scissor braces lock, ramp is rigid, rover egress authorized
            const t = Math.min(1.0, state.stageProgress);
            state.gateAngle = rampContactAngle;
            state.rampLocked = t > 0.4;
            state.latchUnlocked = true;
            state.roverZ = 0.2;

            if (state.stageProgress >= 1.0) {
              state.currentStage = 12;
              state.stageProgress = 0.0;
              setCurrentStage(12);
            }
            break;
          }
          case 12: {
            // 12. ROVER ACTIVATION
            // Systems initialize, lights on, masthead pan/tilt
            const t = Math.min(1.0, state.stageProgress);
            state.gateAngle = rampContactAngle;
            state.rampLocked = true;
            state.roverHeadlightsOn = true;
            state.roverZ = 0.2;
            state.roverPitch = 0.0;

            mastHead.rotation.y = Math.sin(t * Math.PI * 2) * 0.42;
            mastHead.rotation.x = Math.sin(t * Math.PI) * 0.18 - 0.1;

            if (state.stageProgress >= 1.0) {
              state.currentStage = 13;
              state.stageProgress = 0.0;
              setCurrentStage(13);
            }
            break;
          }
          case 13: {
            // 13. ROVER DESCENT
            // Rover rolls down the single ramp panel: Z: 0.2 -> toeZ.
            const t = Math.min(1.0, state.stageProgress);
            state.gateAngle = rampContactAngle;
            state.rampLocked = true;
            state.roverHeadlightsOn = true;

            const startZ = 0.2;
            const endZ = toeZ + 0.5; // Offset to ensure front wheels are near ground
            const curZ = THREE.MathUtils.lerp(startZ, endZ, t);
            state.roverZ = curZ;

            const wheelRadius = 0.35;
            const dZ = (delta * speed * (endZ - startZ)) / stageDuration;
            const dRot = -dZ / wheelRadius;
            wheels.forEach(w => {
              w.rotation.x -= dRot;
            });

            if (state.stageProgress >= 1.0) {
              state.currentStage = 14;
              state.stageProgress = 0.0;
              setCurrentStage(14);
            }
            break;
          }
          case 14: {
            // 14. GROUND CONTACT
            // Rocker-bogie wheels transition off the ramp panel onto Martian terrain
            const t = Math.min(1.0, state.stageProgress);
            state.gateAngle = rampContactAngle;
            state.rampLocked = true;
            state.roverHeadlightsOn = true;

            const startZ = toeZ + 0.5;
            const endZ = toeZ - 2.5;
            const curZ = THREE.MathUtils.lerp(startZ, endZ, t);
            state.roverZ = curZ;

            const wheelRadius = 0.35;
            const dZ = (delta * speed * (endZ - startZ)) / stageDuration;
            const dRot = -dZ / wheelRadius;
            wheels.forEach(w => {
              w.rotation.x -= dRot;
            });

            if (state.stageProgress >= 1.0) {
              state.currentStage = 15;
              state.stageProgress = 0.0;
              setCurrentStage(15);
            }
            break;
          }
          case 15: {
            // 15. DEPLOYMENT COMPLETE
            // Rolls forward to final standoff (Z = -11.8m), parks safely, panoramic mastcam sweep
            state.gateAngle = rampContactAngle;
            state.rampLocked = true;
            state.roverHeadlightsOn = true;

            if (state.roverZ > -11.8) {
              const rollSpeed = 1.8 * delta * speed;
              state.roverZ = Math.max(-11.8, state.roverZ - rollSpeed);

              const wheelRadius = 0.35;
              const dRot = rollSpeed / wheelRadius;
              wheels.forEach(w => {
                w.rotation.x -= dRot;
              });
            } else {
              mastHead.rotation.y = Math.sin(state.elapsedTime * 0.6) * 0.65;
              mastHead.rotation.x = Math.sin(state.elapsedTime * 1.1) * 0.08 - 0.05;
              landerAssembly.hgaDish.rotation.y = Math.sin(state.elapsedTime * 0.4) * 0.4;
            }
            break;
          }
        }
      }

      // --- APPLY KINEMATICS TO 3D LANDER SCENE ---
      landerAssembly.landerRoot.position.y = state.landerY;

      // Independent 4-leg footpad positioning and oleo-strut compression
      // Pins each footpad to the exact local terrain height
      landerAssembly.legs.forEach((leg, idx) => {
        const footWorldX = leg.localPadPos.x;
        const footWorldZ = leg.localPadPos.z;
        const terrainHeight = getElevation(footWorldX, footWorldZ);
        landerAssembly.setLegFootpadWorldY(idx, terrainHeight, state.landerY);
      });

      // Single Gate/Ramp Panel Articulation
      landerAssembly.gateRamp.setGateAngle(state.gateAngle);
      landerAssembly.gateRamp.setLockedState(state.rampLocked);

      // --- ROVER PHYSICAL SURFACE HEIGHT & PITCH CALCULATION ---
      // Evaluates the continuous driving surface along the path:
      // Inside Bay -> Single Ramp Panel -> Martian Terrain
      const curLanderY = state.landerY;
      const sillY = curLanderY - 0.28;
      const sillZ = -1.86;
      const currentPanelAngle = state.gateAngle;
      const panelL = landerAssembly.gateRamp.panelLength;
      
      const toeZ = sillZ - panelL * Math.cos(currentPanelAngle);
      const toeY = sillY + panelL * Math.sin(currentPanelAngle);

      function getPhysicalSurfaceHeightAtZ(z: number): number {
        if (z >= sillZ) {
          // Inside cargo bay floor
          return sillY + 0.06;
        } else if (z >= toeZ) {
          // On the single ramp panel (only valid if gate is opening/open)
          const t = (z - sillZ) / (toeZ - sillZ);
          // Add a tiny offset (0.02) to prevent wheel clipping through panel
          return THREE.MathUtils.lerp(sillY + 0.06, toeY + 0.02, t);
        } else {
          // On Martian terrain
          return getElevation(0, z);
        }
      }

      // The 3 axles along rover length
      const frontAxleZ = state.roverZ - 1.1;
      const rearAxleZ = state.roverZ + 1.22;
      const frontSurfaceY = getPhysicalSurfaceHeightAtZ(frontAxleZ);
      const rearSurfaceY = getPhysicalSurfaceHeightAtZ(rearAxleZ);

      // Chassis height and pitch calculated from physical contact points
      if (state.currentStage <= 12) {
        // While stowed inside the lander compartment
        state.roverY = sillY + 0.06; // Bottom of wheels at floor
        state.roverPitch = 0.0;
      } else {
        // While rolling down ramp and transitioning onto terrain
        const axleDeltaZ = rearAxleZ - frontAxleZ; 
        const axleDeltaY = frontSurfaceY - rearSurfaceY;
        state.roverPitch = Math.atan2(axleDeltaY, axleDeltaZ);
        state.roverY = (frontSurfaceY + rearSurfaceY) / 2; // roverRoot is at wheel bottom
      }

      // Adjustment: The roverRoot position in its model is at the bottom of the wheels (y=0).
      // But the chassis center is at y=0.82.
      // So setting roverRoot.position.y to the surface height puts wheels on surface.
      roverRoot.position.set(0, state.roverY, state.roverZ);
      roverRoot.rotation.x = state.roverPitch;
      roverRoot.rotation.y = 0;

      // Headlights & Lenses
      const headIntensity = state.roverHeadlightsOn ? 4.8 : 0;
      headlightLeft.intensity = headIntensity;
      headlightRight.intensity = headIntensity;
      lensGlowMat.opacity = state.roverHeadlightsOn ? 0.95 : 0.0;

      // Layered Supersonic Thrusters
      landerAssembly.thrusters.forEach(th => {
        th.plumeGroup.visible = state.thrustersOn;
        if (state.thrustersOn) {
          const flicker = (0.92 + Math.sin(state.elapsedTime * 50) * 0.08) * state.thrusterLevel;
          th.plumeGroup.scale.set(flicker, flicker * (1.0 + Math.random() * 0.1), flicker);
          th.light.intensity = 4.2 * state.thrusterLevel;
          th.machDiamonds.forEach((md, idx) => {
            md.scale.set(
              (0.85 + Math.sin(state.elapsedTime * 40 + idx) * 0.15) * state.thrusterLevel,
              (1.3 + Math.cos(state.elapsedTime * 40 + idx) * 0.2) * state.thrusterLevel,
              (0.85 + Math.sin(state.elapsedTime * 40 + idx) * 0.15) * state.thrusterLevel
            );
          });
        } else {
          th.light.intensity = 0;
        }
      });

      // High-speed downward exhaust streaks
      streakParticles.forEach(sp => {
        sp.mesh.visible = state.thrustersOn;
        if (state.thrustersOn) {
          sp.t += delta * sp.speed;
          if (sp.t > 1.0) sp.t = 0.0;

          const engine = landerAssembly.thrusters[sp.engineIdx];
          const worldEnginePos = engine.localPos.clone().applyMatrix4(landerAssembly.hullGroup.matrixWorld);
          const streakY = THREE.MathUtils.lerp(worldEnginePos.y, 0.1, sp.t);

          sp.mesh.position.set(worldEnginePos.x, streakY, worldEnginePos.z);
          sp.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        }
      });

      // Ground-level regolith dust expansion originating from under the 4 engines
      dustParticles.forEach(dp => {
        const mat = dp.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = state.dustLevel * 0.75;
        dp.mesh.visible = state.dustLevel > 0.02;

        if (state.dustLevel > 0.02) {
          dp.curDist += delta * dp.speed * (0.8 + state.dustLevel * 1.5);
          dp.curY += delta * dp.updraftSpeed * state.dustLevel;

          const engine = landerAssembly.thrusters[dp.engineIdx];
          const engineWorldPos = engine.localPos.clone().applyMatrix4(landerAssembly.hullGroup.matrixWorld);

          const px = engineWorldPos.x + Math.cos(dp.angle) * dp.curDist;
          const pz = engineWorldPos.z + Math.sin(dp.angle) * dp.curDist;
          const groundY = getElevation(px, pz);

          if (dp.curDist > 25.0) {
            dp.curDist = 0.4 + Math.random() * 2.0;
            dp.curY = 0.2 + Math.random() * 0.3;
          }

          dp.mesh.position.set(px, groundY + dp.curY, pz);
          dp.mesh.quaternion.copy(camera.quaternion);
        }
      });

      // Status Beacon
      landerAssembly.beaconLight.intensity = 1.5 + Math.sin(state.elapsedTime * 5.0) * 1.2;

      // Camera Tracking Modes
      if (state.cameraMode === 'descent') {
        const targetCamY = Math.max(16, state.landerY + 16);
        camera.position.x = THREE.MathUtils.damp(camera.position.x, 30, 4, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 4, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, 36, 4, delta);
        camera.lookAt(0, state.landerY, 0);
      } else if (state.cameraMode === 'touchdown') {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, 11, 5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 3.2, 5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, 9.5, 5, delta);
        camera.lookAt(0, 1.2, 0);
      } else if (state.cameraMode === 'ramp') {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, 9.2, 5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 4.0, 5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, -4.5, 5, delta);
        camera.lookAt(0, 1.1, -3.0);
      } else if (state.cameraMode === 'rover') {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, 4.6, 5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, state.roverY + 2.8, 5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, state.roverZ + 6.8, 5, delta);
        camera.lookAt(0, state.roverY + 0.8, state.roverZ - 2.5);
      } else {
        // Free Orbit Mode
        const focusY = state.currentStage >= 13 ? state.roverY + 0.9 : state.landerY * 0.45;
        const focusZ = state.currentStage >= 13 ? state.roverZ * 0.7 : 0;

        const theta = state.orbitAngles.theta;
        const phi = state.orbitAngles.phi;
        const dist = state.orbitDist;

        const targetX = Math.sin(theta) * Math.cos(phi) * dist;
        const targetY = Math.sin(phi) * dist + focusY;
        const targetZ = Math.cos(theta) * Math.cos(phi) * dist + focusZ;

        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 10, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 10, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 10, delta);
        camera.lookAt(0, focusY, focusZ);
      }

      // Telemetry Calculation
      const altAgl = Math.max(0, Number((state.landerY - 1.62).toFixed(1)));
      let vSpeed = 0.0;
      if (state.currentStage === 1) vSpeed = -5.8;
      else if (state.currentStage === 2) vSpeed = -2.8;
      else if (state.currentStage === 3) vSpeed = -0.8;
      else if (state.currentStage === 4) vSpeed = -0.2;

      setTelemetry({
        altitudeM: altAgl,
        verticalSpeedMps: vSpeed,
        thrusterPct: Math.round(state.thrusterLevel * 100),
        gateAngleDeg: Math.round(state.gateAngle * (180 / Math.PI)),
        rampLocked: state.rampLocked,
        roverStandoffM: state.roverZ < -1.8 ? Number((-state.roverZ - 1.8).toFixed(1)) : 0.0,
        landerStatus: LANDING_STAGES.find(s => s.id === state.currentStage)?.key || 'DESCENT',
        leg0Contact: landerAssembly.legs[0].currentExtension > 0.01,
        leg1Contact: landerAssembly.legs[1].currentExtension > 0.01,
        leg2Contact: landerAssembly.legs[2].currentExtension > 0.01,
        leg3Contact: landerAssembly.legs[3].currentExtension > 0.01
      });

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Unmount Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);

      terrainGeo.dispose();
      terrainMat.dispose();
      boulderGeo.dispose();
      boulderMat.dispose();
      streakGeo.dispose();
      streakMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      dustTexture.dispose();
      renderer.dispose();
      if (container && domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  const activeStageInfo = LANDING_STAGES.find(s => s.id === currentStage) || LANDING_STAGES[0];

  return (
    <div className="relative w-full h-full flex flex-col bg-[#05070E] select-none overflow-hidden">
      {/* 1. TOP ENGINEERING MISSION HEADER */}
      <div className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Left: Scientific Labeling & Active Stage Badge */}
        <div className="bg-[#090D1A]/90 border border-slate-700/80 rounded-xl px-4 py-2.5 backdrop-blur-md shadow-xl flex items-center gap-3 pointer-events-auto">
          <div className="p-1.5 rounded-lg bg-orange-600/20 border border-orange-500/40 text-orange-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-bold">
                CONCEPTUAL MARS LANDER &amp; ROVER DEPLOYMENT
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                STAGE {currentStage}/15
              </span>
            </div>
            <h2 className="text-xs font-bold text-white tracking-wide font-sans mt-0.5">
              {activeStageInfo.name}
            </h2>
          </div>
        </div>

        {/* Right: Camera Presets & Orbit Selection */}
        <div className="bg-[#090D1A]/90 border border-slate-700/80 rounded-xl p-1 backdrop-blur-md shadow-xl flex items-center gap-1 pointer-events-auto text-xs font-mono">
          <span className="text-slate-400 text-[10px] px-2 flex items-center gap-1">
            <Camera className="w-3 h-3 text-cyan-400" />
            <span>Cam:</span>
          </span>

          <button
            onClick={() => setCameraMode('descent')}
            className={`px-2.5 py-1 rounded text-[10px] transition-all cursor-pointer ${
              cameraMode === 'descent' ? 'bg-orange-600 text-white font-bold shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            Descent
          </button>

          <button
            onClick={() => setCameraMode('touchdown')}
            className={`px-2.5 py-1 rounded text-[10px] transition-all cursor-pointer ${
              cameraMode === 'touchdown' ? 'bg-orange-600 text-white font-bold shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            Touchdown
          </button>

          <button
            onClick={() => setCameraMode('ramp')}
            className={`px-2.5 py-1 rounded text-[10px] transition-all cursor-pointer ${
              cameraMode === 'ramp' ? 'bg-orange-600 text-white font-bold shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            Ramp
          </button>

          <button
            onClick={() => setCameraMode('rover')}
            className={`px-2.5 py-1 rounded text-[10px] transition-all cursor-pointer ${
              cameraMode === 'rover' ? 'bg-orange-600 text-white font-bold shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            Rover Follow
          </button>

          <button
            onClick={() => setCameraMode('free')}
            className={`px-2.5 py-1 rounded text-[10px] transition-all cursor-pointer ${
              cameraMode === 'free' ? 'bg-cyan-600 text-white font-bold shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            Free Orbit
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME FLIGHT TELEMETRY HUD (Floating Right Overlay) */}
      <div className="absolute top-18 right-4 z-20 pointer-events-none hidden sm:block">
        <div className="bg-[#050813]/90 border border-slate-800/90 rounded-2xl p-3.5 backdrop-blur-md shadow-2xl space-y-2 text-xs font-mono w-64">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[10px] text-slate-400">
            <span className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>TELEMETRY STREAM</span>
            </span>
            <span className="text-[9px] text-emerald-400 font-bold">LIVE 50Hz</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">System State:</span>
              <strong className="text-cyan-300 text-[10px] truncate max-w-[140px]">{telemetry.landerStatus}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Altitude AGL:</span>
              <strong className="text-white">{telemetry.altitudeM} m</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Descent Velocity:</span>
              <strong className={telemetry.verticalSpeedMps < 0 ? 'text-amber-400' : 'text-emerald-400'}>
                {telemetry.verticalSpeedMps} m/s
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Descent Engines:</span>
              <strong className={telemetry.thrusterPct > 0 ? 'text-cyan-400' : 'text-slate-500'}>
                {telemetry.thrusterPct}%
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Deployment Gate:</span>
              <strong className="text-emerald-400">
                {telemetry.gateAngleDeg}° ({telemetry.gateAngleDeg <= -15 ? 'DEPLOYED RAMP' : 'CLOSED'})
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Ramp Integrity:</span>
              <strong className={telemetry.rampLocked ? 'text-emerald-400 flex items-center gap-1' : 'text-amber-400 flex items-center gap-1'}>
                {telemetry.rampLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>{telemetry.rampLocked ? 'LOCKED RIGID' : 'STOWED/UNLOCKING'}</span>
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Footpad Contacts:</span>
              <div className="flex gap-1 text-[9px]">
                <span className={`px-1 rounded ${telemetry.leg0Contact ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>L0</span>
                <span className={`px-1 rounded ${telemetry.leg1Contact ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>L1</span>
                <span className={`px-1 rounded ${telemetry.leg2Contact ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>L2</span>
                <span className={`px-1 rounded ${telemetry.leg3Contact ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>L3</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Rover Standoff:</span>
              <strong className="text-orange-400">{telemetry.roverStandoffM} m</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 3D WEBGL CANVAS MOUNT */}
      <div ref={containerRef} className="w-full h-full flex-1 relative cursor-grab active:cursor-grabbing" />

      {/* 4. SUCCESS BANNER UPON COMPLETION */}
      {currentStage === 15 && onSwitchToNavigation && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-[#070B18]/95 border border-emerald-500/60 rounded-3xl p-6 shadow-2xl backdrop-blur-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              DEPLOYMENT SEQUENCE COMPLETED
            </span>
            <h3 className="text-lg font-bold text-white font-sans mt-0.5">
              Rover Disembarked &amp; Ready for Traverse
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Perseverance is safely parked at 11.8m standoff distance on Martian regolith. All 6 wheels, suspension, headlights, and remote sensing masthead are operational.
            </p>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={handleReset}
              className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono font-bold transition-all cursor-pointer"
            >
              Replay Landing
            </button>
            <button
              onClick={onSwitchToNavigation}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-mono font-bold shadow-lg shadow-orange-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Rover Navigation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. COLLAPSIBLE BOTTOM 15-STAGE TIMELINE & CONTROLS */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 max-w-6xl w-[96vw] ${
          dockCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
        }`}
      >
        <div className="flex flex-col items-center">
          <button
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="px-4 py-1 rounded-t-xl bg-[#090D1A] border-t border-x border-slate-700 text-slate-300 hover:text-white text-[10px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg"
          >
            {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{dockCollapsed ? 'EXPAND 15-STAGE TIMELINE' : 'COLLAPSE DOCK'}</span>
          </button>

          <div className="w-full bg-[#080B16]/95 border border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-xl space-y-3 font-mono">
            {/* 15 Stage Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-15 gap-1">
              {LANDING_STAGES.map(stage => {
                const isActive = stage.id === currentStage;
                const isPassed = stage.id < currentStage;

                return (
                  <button
                    key={stage.id}
                    onClick={() => jumpToStage(stage.id)}
                    className={`py-1 px-1 rounded-lg text-[9px] font-bold text-center transition-all cursor-pointer border truncate ${
                      isActive
                        ? 'bg-orange-600 text-white border-orange-400 shadow-md shadow-orange-600/30'
                        : isPassed
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/40'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-slate-200'
                    }`}
                    title={`${stage.name}\n${stage.desc}`}
                  >
                    {stage.shortLabel}
                  </button>
                );
              })}
            </div>

            {/* Stage Description Bar */}
            <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 text-[10px] text-slate-300 flex items-center justify-between gap-2">
              <span className="truncate">
                <strong className="text-orange-400 mr-1.5">{activeStageInfo.name}:</strong>
                {activeStageInfo.desc}
              </span>
              <span className="text-slate-500 shrink-0 font-mono text-[9px]">
                {activeStageInfo.nominalDurationSec < 100 ? `~${activeStageInfo.nominalDurationSec}s` : 'Continuous'}
              </span>
            </div>

            {/* Playback Controls & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>

                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  title="Reset to Stage 1 Powered Descent"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET</span>
                </button>

                {/* Speed Multipliers */}
                <div className="flex items-center bg-black/50 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                  {[0.5, 1.0, 2.0].map(s => (
                    <button
                      key={s}
                      onClick={() => setSimSpeed(s)}
                      className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                        simSpeed === s ? 'bg-orange-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Sequence Shortcuts */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Replay Landing</span>
                </button>

                <button
                  onClick={handleDeployRover}
                  className="px-3.5 py-1.5 rounded-xl bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500 text-orange-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-orange-950/40"
                >
                  <span>Deploy Rover</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
