import React from 'react';
import RealisticMarsPlanet from './RealisticMarsPlanet';

interface CinematicBackgroundProps {
  mode?: 'globe' | 'horizon';
  showStars?: boolean;
  ambientColor?: string;
  glowOpacity?: number;
}

/**
 * Shared Cinematic Background for MARSNAV (Used in Boot, Offline, and Network screens)
 * Features:
 * - Fullscreen deep-space background
 * - Subtle distant stars
 * - Photorealistic 3D Mars (procedurally textured)
 * - Atmospheric glow and light scattering
 */
export const CinematicBackground: React.FC<CinematicBackgroundProps> = ({
  mode = 'horizon',
  showStars = true,
  ambientColor = 'rgba(255, 75, 38, 0.22)',
  glowOpacity = 1
}) => {
  return (
    <div className="absolute inset-0 z-0 bg-[#030105] overflow-hidden">
      {/* 1. 3D Photorealistic Mars Planet Canvas Background */}
      <div className="absolute inset-0 z-0">
        <RealisticMarsPlanet mode={mode} parallax={true} />
      </div>

      {/* 2. Atmospheric Diffuse Flare & Scatter */}
      <div
        className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-1000"
        style={{
          opacity: glowOpacity,
          background: `radial-gradient(ellipse 75% 55% at 50% 36%, ${ambientColor} 0%, rgba(205, 42, 18, 0.09) 38%, rgba(3, 1, 5, 0) 72%)`
        }}
      />

      {/* 3. Subtle Space Vignette */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
};

export default CinematicBackground;
