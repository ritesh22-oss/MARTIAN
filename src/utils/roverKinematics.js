import * as THREE from 'three';

/**
 * Forward Kinematics Controller for 6-Wheeled Rocker-Bogie Mars Rover.
 * Computes individual wheel-terrain contact vectors using Three.js Raycaster
 * against the terrain mesh with temporal damping to eliminate jitter and clipping.
 */
export class RoverKinematicsController {
  constructor(options = {}) {
    this.terrainMesh = options.terrainMesh || null;
    this.roverGroup = options.roverGroup || null;
    this.wheels = options.wheels || [];
    this.wheelOffsets = options.wheelOffsets || [
      { x: 1.25, z: 1.35, name: 'FL' },
      { x: 1.25, z: -1.35, name: 'FR' },
      { x: 0.05, z: 1.45, name: 'ML' },
      { x: 0.05, z: -1.45, name: 'MR' },
      { x: -1.25, z: 1.35, name: 'RL' },
      { x: -1.25, z: -1.35, name: 'RR' }
    ];
    this.wheelRadius = options.wheelRadius || 0.38;
    this.wheelbase = options.wheelbase || 2.5;
    this.trackWidth = options.trackWidth || 2.7;
    this.elevationFallback = options.elevationFallback || null;
    this.damping = options.damping || 0.28; // Anti-jitter exponential lerp

    // Dedicated raycaster configured for ground intersections
    this.raycaster = new THREE.Raycaster();
    this.downVector = new THREE.Vector3(0, -1, 0);
    this.rayOrigin = new THREE.Vector3();

    // Smoothed state variables
    this.smoothedChassisY = 0;
    this.smoothedPitch = 0;
    this.smoothedRoll = 0;
    this.wheelContactHeights = new Float32Array(6);
    this.wheelNormals = [
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 1, 0)
    ];

    this.isInitialized = false;
  }

  /**
   * Samples terrain contact height at world (x, z) using Raycaster intersection
   * with fallback to analytical elevation function.
   */
  sampleContactPoint(worldX, worldZ, estimatedY = 0) {
    if (this.terrainMesh) {
      // Cast ray downward from above the estimated surface height
      this.rayOrigin.set(worldX, estimatedY + 8.0, worldZ);
      this.raycaster.set(this.rayOrigin, this.downVector);
      this.raycaster.far = 24.0;

      const hits = this.raycaster.intersectObject(this.terrainMesh, false);
      if (hits.length > 0) {
        return {
          height: hits[0].point.y,
          normal: hits[0].face ? hits[0].face.normal.clone() : new THREE.Vector3(0, 1, 0)
        };
      }
    }

    // Mathematical elevation fallback
    if (this.elevationFallback) {
      const elev = this.elevationFallback(worldX, worldZ);
      return {
        height: typeof elev === 'object' ? elev.localRelY : elev,
        normal: new THREE.Vector3(0, 1, 0)
      };
    }

    return { height: estimatedY, normal: new THREE.Vector3(0, 1, 0) };
  }

  /**
   * Computes forward kinematics for chassis and all 6 wheels.
   *
   * @param {THREE.Vector3} roverPathPos - Position on 2D navigation trajectory curve
   * @param {THREE.Vector3} lookTarget - Look-ahead destination for forward orientation
   * @param {number} delta - Frame delta time in seconds
   * @param {boolean} isMoving - Whether rover is driving
   */
  update(roverPathPos, lookTarget, delta = 0.016, isMoving = true) {
    if (!this.roverGroup) return;

    // 1. Calculate horizontal travel direction vector
    const travelDir = new THREE.Vector3(
      lookTarget.x - roverPathPos.x,
      0,
      lookTarget.z - roverPathPos.z
    ).normalize();
    if (travelDir.lengthSq() < 0.0001) travelDir.set(1, 0, 0);

    // Lateral direction vector (+90 deg around Y)
    const sideDir = new THREE.Vector3(-travelDir.z, 0, travelDir.x).normalize();

    // 2. Independently raycast ground contact for each of the 6 wheels in world coordinates
    const estimatedCenterY = this.isInitialized ? this.smoothedChassisY : roverPathPos.y;
    const contactPoints = [];

    for (let i = 0; i < this.wheelOffsets.length; i++) {
      const offset = this.wheelOffsets[i];
      // Map local offset (x: forward/back, z: left/right) to world coordinate space
      const wheelWorldX = roverPathPos.x + travelDir.x * offset.x + sideDir.x * offset.z;
      const wheelWorldZ = roverPathPos.z + travelDir.z * offset.x + sideDir.z * offset.z;

      const contact = this.sampleContactPoint(wheelWorldX, wheelWorldZ, estimatedCenterY);
      contactPoints.push(contact);

      // Smooth individual wheel contact heights to eliminate polygon edge jitter
      if (!this.isInitialized) {
        this.wheelContactHeights[i] = contact.height;
      } else {
        this.wheelContactHeights[i] = THREE.MathUtils.lerp(
          this.wheelContactHeights[i],
          contact.height,
          this.damping
        );
      }
      this.wheelNormals[i].copy(contact.normal);
    }

    // 3. Rocker-Bogie Forward Kinematics
    // Left side: FL (idx 0), ML (idx 2), RL (idx 4)
    // Right side: FR (idx 1), MR (idx 3), RR (idx 5)
    const leftFrontY = this.wheelContactHeights[0];
    const rightFrontY = this.wheelContactHeights[1];
    const leftMidY = this.wheelContactHeights[2];
    const rightMidY = this.wheelContactHeights[3];
    const leftRearY = this.wheelContactHeights[4];
    const rightRearY = this.wheelContactHeights[5];

    const leftRockerY = (leftFrontY + leftMidY + leftRearY) / 3.0;
    const rightRockerY = (rightFrontY + rightMidY + rightRearY) / 3.0;

    const frontAvgY = (leftFrontY + rightFrontY) * 0.5;
    const rearAvgY = (leftRearY + rightRearY) * 0.5;
    const targetChassisY = (leftRockerY + rightRockerY) * 0.5 + this.wheelRadius;

    // Pitch: angle between front and rear wheel baselines along forward travel vector
    const targetPitch = Math.atan2(frontAvgY - rearAvgY, this.wheelbase);

    // Roll: angle between left and right rocker differential pivots
    const targetRoll = Math.atan2(rightRockerY - leftRockerY, this.trackWidth);

    // 4. Anti-Jitter Temporal Damping (Exponential Filter)
    if (!this.isInitialized) {
      this.smoothedChassisY = targetChassisY;
      this.smoothedPitch = targetPitch;
      this.smoothedRoll = targetRoll;
      this.isInitialized = true;
    } else {
      this.smoothedChassisY = THREE.MathUtils.lerp(this.smoothedChassisY, targetChassisY, this.damping);
      this.smoothedPitch = THREE.MathUtils.lerp(this.smoothedPitch, targetPitch, this.damping);
      this.smoothedRoll = THREE.MathUtils.lerp(this.smoothedRoll, targetRoll, this.damping);
    }

    // 5. Apply Rigid Body Position & Orientation
    this.roverGroup.position.set(roverPathPos.x, this.smoothedChassisY, roverPathPos.z);

    // Heading orientation: align chassis with lookTarget
    this.roverGroup.lookAt(lookTarget.x, this.smoothedChassisY, lookTarget.z);
    this.roverGroup.rotateY(Math.PI / 2); // Align forward (+X) with movement vector

    // Apply pitch and roll to chassis
    this.roverGroup.rotation.x = this.smoothedPitch * 0.85;
    this.roverGroup.rotation.z = this.smoothedRoll * 0.65;

    // 6. Independent Wheel Suspension Travel & Ground Contact Adjustment
    if (this.wheels && this.wheels.length >= 6) {
      for (let i = 0; i < 6; i++) {
        const wheelMesh = this.wheels[i];
        if (wheelMesh) {
          // Adjust local Y position so wheel stays exactly on top of ground contact
          const contactH = this.wheelContactHeights[i];
          const relativeH = contactH - (this.smoothedChassisY - this.wheelRadius);
          wheelMesh.position.y = this.wheelRadius + THREE.MathUtils.clamp(relativeH, -0.35, 0.35);

          // Rotate wheels when driving
          if (isMoving) {
            wheelMesh.rotation.z += delta * 3.8;
          }
        }
      }
    }

    return {
      chassisY: this.smoothedChassisY,
      pitch: this.smoothedPitch,
      roll: this.smoothedRoll,
      wheelHeights: this.wheelContactHeights
    };
  }
}
