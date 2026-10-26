import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * MARSNAV Cinematic 3D Mars Boot Screen
 * Immersive full-screen Three.js WebGL experience featuring a seamless, 360-degree
 * photorealistic 3D Mars globe matching the user's attached model (polar ice cap,
 * dark volcanic basalt plains, and warm rusty-orange Martian crust), atmospheric
 * rim lighting, twinkling starfield, and elegant UI overlay.
 */
export default function BootScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Initializing navigation systems...');
  const [isExiting, setIsExiting] = useState(false);
  const containerRef = useRef(null);
  const hasFinishedRef = useRef(false);

  const handleComplete = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onComplete?.();
    }, 700);
  };

  // Keyboard shortcut listener for instantaneous dismissal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simulation initialization progression
  useEffect(() => {
    const startTime = performance.now();
    const targetDurationMs = 2800; // Cinematic 2.8s boot sequence

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const p = Math.min(100, Math.round((elapsed / targetDurationMs) * 100));

      setProgress(p);

      if (p < 20) {
        setStage('Initializing navigation systems...');
      } else if (p < 45) {
        setStage('Loading MRO HiRISE DTMs & orbital maps...');
      } else if (p < 70) {
        setStage('Synthesizing AI4Mars hazard cost raster...');
      } else if (p < 90) {
        setStage('Calibrating rover kinematic models...');
      } else {
        setStage('Mission systems ready.');
      }

      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          handleComplete();
        }, 350);
      }
    }, 45);

    return () => clearInterval(interval);
  }, []);

  // Three.js 3D Mars Globe Scene Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x33222a, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5ee, 3.2);
    sunLight.position.set(5, 3, 4);
    scene.add(sunLight);

    // Rim/Fill Light (Aerospace cyan accent)
    const rimLight = new THREE.DirectionalLight(0x00daf3, 0.8);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    // Generate Seamless 360-degree Equirectangular Mars Texture Matching User Attachments
    function createSeamlessMarsTexture() {
      const canvas = document.createElement('canvas');
      canvas.width = 2048;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      // Base Martian warm rusty-orange gradient (#d86c43 tone)
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#c4552b');
      grad.addColorStop(0.35, '#d86c43');
      grad.addColorStop(0.7, '#b24118');
      grad.addColorStop(1, '#8c2d0c');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add dark volcanic basalt regions (Syrtis Major & Tharsis volcanic province)
      ctx.fillStyle = 'rgba(55, 20, 10, 0.65)';
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = 200 + Math.random() * (canvas.height - 400);
        const rx = 100 + Math.random() * 250;
        const ry = 60 + Math.random() * 140;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add impact craters and radial depressions
      for (let i = 0; i < 350; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = 5 + Math.random() * 22;

        ctx.strokeStyle = 'rgba(230, 140, 90, 0.35)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(45, 12, 4, 0.5)';
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, r * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }

      // North & South Polar Ice Caps (bright white cap exactly matching user attachment)
      const northCapGrad = ctx.createRadialGradient(
        canvas.width * 0.5, 60, 10,
        canvas.width * 0.5, 60, 140
      );
      northCapGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      northCapGrad.addColorStop(0.5, 'rgba(240, 240, 250, 0.75)');
      northCapGrad.addColorStop(1, 'rgba(200, 200, 220, 0)');
      ctx.fillStyle = northCapGrad;
      ctx.fillRect(0, 0, canvas.width, 180);

      const southCapGrad = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height - 40, 5,
        canvas.width * 0.5, canvas.height - 40, 90
      );
      southCapGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      southCapGrad.addColorStop(0.6, 'rgba(230, 230, 240, 0.5)');
      southCapGrad.addColorStop(1, 'rgba(180, 180, 200, 0)');
      ctx.fillStyle = southCapGrad;
      ctx.fillRect(0, canvas.height - 120, canvas.width, 120);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    }

    const marsTexture = createSeamlessMarsTexture();

    // Mars Sphere Geometry & Material
    const sphereGeometry = new THREE.SphereGeometry(1.8, 64, 64);
    const marsMaterial = new THREE.MeshStandardMaterial({
      map: marsTexture,
      roughness: 0.82,
      metalness: 0.05
    });

    const marsMesh = new THREE.Mesh(sphereGeometry, marsMaterial);
    marsMesh.rotation.z = 0.44; // Authentic Mars axial tilt (~25.19 degrees)
    scene.add(marsMesh);

    // Atmospheric Glow / Rim Sphere
    const atmosGeometry = new THREE.SphereGeometry(1.88, 64, 64);
    const atmosMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const atmosMesh = new THREE.Mesh(atmosGeometry, atmosMaterial);
    scene.add(atmosMesh);

    // Starfield Background
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 1400;
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 60;
      starPositions[i + 1] = (Math.random() - 0.5) * 60;
      starPositions[i + 2] = (Math.random() - 0.5) * 60 - 10;

      const shade = 0.6 + Math.random() * 0.4;
      starColors[i] = shade;
      starColors[i + 1] = shade * 0.95;
      starColors[i + 2] = shade * 1.15; // cyan/blue star tint
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Continuous smooth rotation
      marsMesh.rotation.y += 0.0012;
      atmosMesh.rotation.y += 0.001;

      // Subtle cinematic camera floating drift
      camera.position.x = Math.sin(elapsedTime * 0.25) * 0.12;
      camera.position.y = Math.cos(elapsedTime * 0.2) * 0.08;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      sphereGeometry.dispose();
      marsMaterial.dispose();
      marsTexture.dispose();
      atmosGeometry.dispose();
      atmosMaterial.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#03050c] select-none overflow-hidden transition-opacity duration-700 ease-in-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="region"
      aria-label="MARSNAV 3D Planetary Loading"
    >
      {/* Three.js WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 pointer-events-none" />

      {/* Cinematic Vignette & Ambient Gradient Overlay */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#03050c]/50 to-[#020307]/90 pointer-events-none" />

      {/* Top Header Branding */}
      <div className="absolute top-8 left-0 right-0 flex flex-col items-center pointer-events-none z-10 px-4">
        <div className="flex items-center space-x-2.5 mb-1.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-cyan-400 font-mono text-xs uppercase tracking-[0.25em] font-semibold">
            MARSNAV ORBITAL SYS v4.2
          </span>
        </div>
        <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-black tracking-wider uppercase font-sans drop-shadow-[0_2px_10px_rgba(0,218,243,0.3)]">
          MARS<span className="text-cyan-400">NAV</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm tracking-[0.18em] font-medium uppercase mt-1 text-center">
          Martian Terrain Intelligence &amp; Rover Navigation
        </p>
      </div>

      {/* Bottom Progress & Mission Status Section */}
      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center pointer-events-auto z-10 px-4">
        <div className="w-full max-w-lg bg-[#0a0d18]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          {/* Stage & Percentage Header */}
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-slate-200 font-medium tracking-wide">
                {stage}
              </span>
            </div>
            <span className="text-cyan-400 font-mono font-bold tracking-wider">
              {progress}%
            </span>
          </div>

          {/* Slim Animated Progress Track */}
          <div className="relative w-full h-3 bg-[#131826] rounded-full overflow-hidden border border-white/10 p-0.5 mb-4">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00daf3] via-[#3b82f6] to-[#f97316] transition-all duration-100 ease-out shadow-[0_0_15px_rgba(0,218,243,0.7)] relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              {/* Light Sweep Highlight */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>

          {/* Footer Controls / Skip Intro */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
            <span>MRO HiRISE Telemetry Connected</span>
            <button
              onClick={handleComplete}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 font-medium tracking-wide transition-all cursor-pointer border border-cyan-500/20 active:scale-95"
            >
              Skip Intro [Esc / Space]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
