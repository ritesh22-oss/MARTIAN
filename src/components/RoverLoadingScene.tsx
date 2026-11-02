import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createDetailedMarsRover } from '../utils/roverModel';

interface RoverLoadingSceneProps {
  progress: number; // 0 to 100
}

export const RoverLoadingScene: React.FC<RoverLoadingSceneProps> = ({ progress }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    rover: any;
    track: THREE.Mesh;
    rocks: THREE.Group;
    dustParticles: THREE.Points;
  } | null>(null);

  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    // Using a lower FOV and closer camera for a more "macro" detailed look
    const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 1000);
    // Position camera to look slightly down and from the side
    camera.position.set(0, 0.8, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);

    // --- Lighting ---
    // Ambient light for general visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Main directional light (Sun-like)
    const mainLight = new THREE.DirectionalLight(0xffccaa, 1.5);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    // Front-fill light to reveal mechanical details
    const frontLight = new THREE.PointLight(0xffffff, 1.2);
    frontLight.position.set(0, 2, 8);
    scene.add(frontLight);

    // Side-rim light for silhouette
    const rimLight = new THREE.PointLight(0xff8844, 0.8);
    rimLight.position.set(-10, 1, -5);
    scene.add(rimLight);

    // --- Track / Loading Bar Base ---
    // Aligning the 3D track with the HTML bar position
    const trackWidth = 8; // Narrower track range for better framing
    const trackY = -0.45; // Adjusted to sit clearly above the bar in BootScreen
    
    const trackGeo = new THREE.BoxGeometry(trackWidth + 4, 0.05, 2);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x050810,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.4
    });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.position.y = trackY - 0.025;
    track.receiveShadow = true;
    scene.add(track);

    // --- Rover ---
    const roverData = createDetailedMarsRover();
    const rover = roverData.roverRoot;
    // Scale reduced by ~20% from previous 0.5 to 0.4 for better framing
    rover.scale.set(0.4, 0.4, 0.4);
    // Base of rover (wheels) should be at trackY
    rover.position.y = trackY;
    // Rotate to face right (X-axis)
    rover.rotation.y = Math.PI / 2;
    scene.add(rover);

    // --- Environment: Martian Rocks ---
    const rocks = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x884433, roughness: 0.9 });
    for (let i = 0; i < 40; i++) {
      const size = 0.01 + Math.random() * 0.05;
      const rockGeo = new THREE.DodecahedronGeometry(size, 0);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(
        (Math.random() - 0.5) * (trackWidth + 6),
        trackY,
        (Math.random() - 0.5) * 1.5
      );
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      rocks.add(rock);
    }
    scene.add(rocks);

    // --- Environment: Dust Particles ---
    const dustCount = 300;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * (trackWidth + 4);
      dustPositions[i * 3 + 1] = trackY + Math.random() * 0.4;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    
    const dustMat = new THREE.PointsMaterial({
      color: 0xffa544,
      size: 0.012,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    scene.add(dustParticles);

    sceneRef.current = { scene, camera, renderer, rover: roverData, track, rocks, dustParticles };

    let lastTime = 0;
    let lastProgressValue = progress;
    
    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (sceneRef.current) {
        const roverX = sceneRef.current.rover.roverRoot.position.x;
        
        // Calculate instantaneous velocity based on progress change
        // This ensures wheels rotate proportionally to linear movement
        const currentProgress = progressRef.current;
        const progressDelta = Math.abs(currentProgress - lastProgressValue);
        lastProgressValue = currentProgress;

        // Base rotation speed scaled by how much the progress has moved this frame
        // If progress is stuck or finished (100%), drivingSpeed becomes 0
        const drivingSpeed = delta > 0 ? (progressDelta / delta) * 0.45 : 0;

        // Update rover animation (wheels, mast, vibration)
        sceneRef.current.rover.updateAnimation(time / 1000, delta, drivingSpeed);
        
        // --- Animate Dust Particles ---
        const posAttr = sceneRef.current.dustParticles.geometry.attributes.position;
        const positions = posAttr.array as Float32Array;
        
        for (let i = 0; i < dustCount; i++) {
          positions[i * 3] -= 0.003; 
          positions[i * 3 + 1] += Math.sin(time * 0.001 + i) * 0.0003;

          const distFromRover = Math.abs(positions[i * 3] - roverX);
          if (positions[i * 3] < -(trackWidth/2 + 2) || distFromRover > 2.0) {
            positions[i * 3] = roverX + (Math.random() - 0.3) * 0.4;
            positions[i * 3 + 1] = trackY + Math.random() * 0.08;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1.0;
          }
        }
        posAttr.needsUpdate = true;

        sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera);
      }
      
      requestAnimationFrame(animate);
    };

    const animReq = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      sceneRef.current.camera.aspect = w / h;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animReq);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // Update rover position based on progress
  useEffect(() => {
    if (sceneRef.current) {
      const trackWidth = 8;
      // Rover length at scale 1.0 is ~2.32. At scale 0.4, length is ~0.928.
      // Half-width + safety margin = ~0.5 units
      const boundaryOffset = 0.5;
      const minX = -trackWidth / 2 + boundaryOffset;
      const maxX = trackWidth / 2 - boundaryOffset;
      
      const p = Math.min(100, Math.max(0, progress)) / 100;
      const currentX = minX + p * (maxX - minX);
      
      sceneRef.current.rover.roverRoot.position.x = currentX;
    }
  }, [progress]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
};
