import React, { useState, useEffect, useRef } from 'react';

/**
 * MARSNAV BootScreen
 * High-fidelity 2D cinematic loading screen utilizing the authentic NASA Space Apps
 * MARSNAV terrain collage & rover background asset (/assets/aistudio/image_044b7094.png).
 * 
 * Features:
 * - Edge-to-edge responsive layout preserving original 1586x992 composition
 * - Lightweight 2D DOM (zero Three.js / WebGL overhead on startup)
 * - Seamless functional overlay matching the progress bar, live percentages, and stages
 * - Responsive interactive "Skip Intro" control with keyboard shortcut (Esc / Space / Enter)
 * - Smooth 700ms crossfade transition into the operational MARSNAV mission console
 * - Resilient fallback if asset loading encounters network or offline latency
 */
export default function BootScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('Initializing terrain systems...');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const hasFinishedRef = useRef(false);

  // Responsive image dimensions & offset calculation
  const [imgLayout, setImgLayout] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    isCroppedHorizontally: false
  });

  // Calculate layout to align functional overlay with image features at any screen size
  useEffect(() => {
    function updateLayout() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const naturalAspect = 1585 / 992; // 1.59778
      const screenAspect = vw / vh;

      let w, h, offX, offY;
      let croppedH = false;

      if (screenAspect > naturalAspect) {
        // Wider than image aspect: fit width, crop vertical excess symmetrically
        w = vw;
        h = vw / naturalAspect;
        offX = 0;
        offY = (vh - h) / 2;
      } else {
        // Taller than image aspect: fit height, crop horizontal excess symmetrically
        h = vh;
        w = vh * naturalAspect;
        offX = (vw - w) / 2;
        offY = 0;
        croppedH = offX + w * 0.88 > vw;
      }

      setImgLayout({
        width: w,
        height: h,
        offsetX: offX,
        offsetY: offY,
        scale: w / 1585,
        isCroppedHorizontally: croppedH
      });
    }

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

  const handleComplete = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onComplete?.();
    }, 650);
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

  // Application initialization progression linked to mission modules
  useEffect(() => {
    // Preload background asset
    const img = new Image();
    img.src = '/assets/aistudio/image_e58e8f79.png';
    img.onload = () => setImageLoaded(true);
    img.onerror = () => {
      console.warn('Boot image failed to load, engaging resilient fallback');
      setImageError(true);
      setImageLoaded(true);
    };

    const startTime = performance.now();
    const targetDurationMs = 2400; // ~2.4s cinematic initialization progression

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const p = Math.min(100, Math.round((elapsed / targetDurationMs) * 100));

      setProgress(p);

      if (p < 22) {
        setStage('Initializing terrain systems...');
      } else if (p < 48) {
        setStage('Loading MRO HiRISE DTMs & orbital maps...');
      } else if (p < 72) {
        setStage('Synthesizing AI4Mars hazard cost raster...');
      } else if (p < 92) {
        setStage('Calibrating rover kinematic models...');
      } else {
        setStage('Mission environment ready.');
      }

      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          handleComplete();
        }, 320);
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#050813] select-none overflow-hidden transition-opacity duration-700 ease-in-out ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="region"
      aria-label="MARSNAV Application Loading"
    >
      {/* Fallback Martian Gradient if image fails or before load */}
      <div className="absolute inset-0 bg-[#050813] flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-orange-600/20 via-red-900/10 to-transparent blur-3xl pointer-events-none" />
      </div>

      {/* Main Container Scaled Symmetrically to Cover Screen with Zero Distortion */}
      <div
        className="absolute transition-all duration-150 ease-out"
        style={{
          width: `${imgLayout.width}px`,
          height: `${imgLayout.height}px`,
          left: `${imgLayout.offsetX}px`,
          top: `${imgLayout.offsetY}px`
        }}
      >
        {/* Exact Attached 2D MARSNAV Background Image */}
        <img
          src="/assets/aistudio/image_e58e8f79.png"
          alt="MARSNAV: AI-Powered Terrain Analysis and Rover Navigation"
          className={`w-full h-full object-cover object-center select-none pointer-events-none transition-opacity duration-500 ${
            imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'
          }`}
          draggable={false}
        />

        {/* Dynamic Functional Overlay: Progress Bar & Milestone Text */}
        <div
          className="absolute flex flex-col items-center pointer-events-none"
          style={{
            left: '50%',
            top: '79.5%',
            transform: 'translateX(-50%)',
            width: `${Math.max(340, Math.min(540, imgLayout.width * 0.35))}px`
          }}
        >
          {/* Milestone Status Text */}
          <div className="px-4 py-1.5 rounded-full bg-[#0a0707]/80 backdrop-blur-md mb-2 flex items-center justify-center space-x-2 border border-cyan-500/20 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-white text-xs sm:text-sm font-sans font-medium tracking-wide whitespace-nowrap drop-shadow-sm">
              {stage}
            </span>
          </div>

          {/* Active Functional Progress Track & Percentage Indicator */}
          <div className="w-full flex items-center space-x-3 px-3.5 py-1.5 rounded-full bg-[#0a0707]/85 backdrop-blur-md border border-white/15 shadow-xl">
            {/* Animated Cyan Glow Progress Track */}
            <div className="relative flex-1 h-3 rounded-full bg-[#14171f] overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00daf3] via-[#00a6ff] to-[#38bdf8] transition-all duration-75 ease-out shadow-[0_0_12px_rgba(0,218,243,0.8)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Live Percentage */}
            <span className="text-white font-mono font-bold text-xs sm:text-sm w-9 text-right tracking-tight drop-shadow-sm">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Interactive Desktop Skip Intro Area (matches image bottom-right position) */}
        {!imgLayout.isCroppedHorizontally && (
          <button
            onClick={handleComplete}
            aria-label="Skip Intro"
            className="absolute group flex items-center space-x-2 px-3 py-1.5 rounded-lg text-transparent hover:text-white cursor-pointer border border-transparent hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:shadow-[0_0_20px_rgba(0,218,243,0.35)] transition-all duration-200"
            style={{
              left: '88.2%',
              top: '90.2%',
              width: '9.8%',
              height: '4.8%',
              transform: 'translateY(-50%)'
            }}
            title="Press Esc, Space, or Enter to skip"
          >
            <span className="sr-only">Skip Intro</span>
            {/* Visual subtle cue on hover */}
            <div className="w-full h-full rounded border border-cyan-400/0 group-hover:border-cyan-400/50 transition-all pointer-events-none" />
          </button>
        )}
      </div>

      {/* Floating Skip Intro Button for Mobile & Narrow Screens (ensures control is never off-screen) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <button
          onClick={handleComplete}
          aria-label="Skip Intro"
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-black/65 hover:bg-black/85 border border-white/20 hover:border-cyan-400/60 text-slate-200 hover:text-white text-xs font-mono tracking-wider backdrop-blur-md shadow-2xl transition-all cursor-pointer active:scale-95"
        >
          <svg
            className="w-3.5 h-3.5 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <span>Skip Intro</span>
        </button>
      </div>
    </div>
  );
}
