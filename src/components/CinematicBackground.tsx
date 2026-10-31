import React, { useState } from 'react';
import RealisticMarsPlanet from './RealisticMarsPlanet';

interface CinematicBackgroundProps {
  mode?: 'globe' | 'horizon';
  showStars?: boolean;
  ambientColor?: string;
  glowOpacity?: number;
  showRover?: boolean;
}

/**
 * Photorealistic 3D NASA Mars Background Component with Animated Rover Traversal
 * 
 * Features:
 * - Genuine 3D Three.js rotating Mars sphere with procedural cratering, Valles Marineris canyon rift, Tharsis volcanoes, limb atmospheric scattering, and starfield
 * - High-resolution authentic NASA JPL photographic overlay
 * - Animated Perseverance Rover traversing the Martian terrain surface with wheel tracks and dust particle trail
 * - Deep space dark background with atmospheric scatter & dark vignette
 */
export const CinematicBackground: React.FC<CinematicBackgroundProps> = ({
  mode = 'horizon',
  ambientColor = 'rgba(255, 68, 38, 0.28)',
  glowOpacity = 1,
  showRover = true
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="absolute inset-0 z-0 bg-[#030105] overflow-hidden pointer-events-none select-none">
      {/* 1. 3D WebGL Photorealistic Mars Planet Canvas */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <RealisticMarsPlanet mode={mode} parallax={true} className="pointer-events-none" />
      </div>

      {/* 2. Authentic High-Resolution NASA JPL Mars Background Layer */}
      {!imgError && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30 mix-blend-screen">
          <img
            src="/images/mars-hero.jpg"
            alt="NASA Mars Surface & Horizon"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-center scale-105"
            style={{
              filter: 'brightness(0.9) contrast(1.1) saturate(1.1)'
            }}
          />
        </div>
      )}

      {/* 3. Animated Perseverance Rover Surface Traversal Scene */}
      {showRover && (
        <div className="absolute bottom-16 left-0 right-0 h-40 pointer-events-none z-15 overflow-hidden">
          {/* Wheel Track Marks on Surface Horizon */}
          <div className="absolute bottom-8 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-900/40 to-transparent border-b border-dashed border-orange-800/30" />
          
          {/* Traversing Perseverance Rover Graphic */}
          <div className="absolute bottom-6 animate-[roverTraverse_28s_linear_infinite] flex items-center">
            {/* Dust Trail behind Rover */}
            <div className="flex items-center -space-x-1 pr-2">
              <span className="w-3 h-3 rounded-full bg-orange-600/30 blur-xs animate-ping" style={{ animationDuration: '1.2s' }} />
              <span className="w-4 h-4 rounded-full bg-amber-700/25 blur-sm animate-pulse" style={{ animationDuration: '0.8s' }} />
              <span className="w-6 h-6 rounded-full bg-red-900/20 blur-md animate-pulse" style={{ animationDuration: '1.5s' }} />
            </div>

            {/* Stylized Perseverance Rover SVG Icon */}
            <svg className="w-14 h-10 text-orange-400/90 drop-shadow-[0_2px_10px_rgba(255,90,54,0.6)]" viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Masthead Camera */}
              <path d="M 28 8 L 28 18 M 24 8 H 32 V 12 H 24 Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="28" cy="10" r="1.5" fill="#FF8A65" />
              {/* Chassis Body */}
              <rect x="16" y="18" width="28" height="14" rx="2" fill="#1E293B" stroke="currentColor" strokeWidth="2" />
              {/* Solar / RTG Power Deck */}
              <line x1="14" y1="20" x2="46" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              {/* Rocker-Bogie Suspension & Wheels */}
              <path d="M 14 32 L 8 40 M 30 32 L 28 40 M 44 32 L 48 40" stroke="currentColor" strokeWidth="2.5" />
              <circle cx="8" cy="40" r="4.5" fill="#0F172A" stroke="currentColor" strokeWidth="2" />
              <circle cx="28" cy="40" r="4.5" fill="#0F172A" stroke="currentColor" strokeWidth="2" />
              <circle cx="48" cy="40" r="4.5" fill="#0F172A" stroke="currentColor" strokeWidth="2" />
              {/* Robotic Arm */}
              <path d="M 40 26 L 52 28 L 56 34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      {/* 4. Realistic NASA Atmospheric Horizon Glow & Scatter */}
      <div
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-1000"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(ellipse 85% 65% at 50% 45%, ${ambientColor} 0%, rgba(185, 42, 18, 0.15) 45%, rgba(3, 1, 5, 0.65) 85%)`
        }}
      />

      {/* 5. Deep Space Vignette Overlay for Crisp HUD & Text Contrast */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(3,1,5,0.75)_90%)]" />
    </div>
  );
};

export default CinematicBackground;
