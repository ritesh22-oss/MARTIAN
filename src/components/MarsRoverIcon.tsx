import React from 'react';

interface MarsRoverIconProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

/**
 * Clean, realistic 2D Mars exploration rover visual element.
 * Features:
 * - Detailed chassis body & instrument solar deck
 * - 6 articulated rocker-bogie wheels
 * - Mastcam camera assembly & antenna
 * - Metallic grey/silver metallic body with subtle orange accents
 * - Oriented horizontally (facing right at 0 degrees) for smooth rotational alignment
 */
export const MarsRoverIcon: React.FC<MarsRoverIconProps> = ({ size = 24, className = '', glow = true }) => {
  return (
    <g className={`mars-rover-icon ${className}`}>
      {/* Outer Cyan Traversal Aura Glow */}
      {glow && (
        <circle r="12" fill="rgba(6, 182, 212, 0.25)" className="animate-pulse" />
      )}

      {/* Scaled Rover Chassis SVG Group */}
      <g transform="scale(0.85)">
        {/* Rocker-Bogie Suspension Linkages */}
        <path d="M -7 -4.5 L -3 -6.5 L 3 -6.5 L 7 -4.5" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M -7 4.5 L -3 6.5 L 3 6.5 L 7 4.5" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* 6 Articulated Rover Wheels (Top side: 3, Bottom side: 3) */}
        {/* Top Row Wheels */}
        <rect x="-8.5" y="-8.5" width="3.2" height="3" rx="0.8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />
        <rect x="-1.6" y="-9" width="3.2" height="3" rx="0.8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />
        <rect x="5.2" y="-8.5" width="3.2" height="3" rx="0.8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />

        {/* Bottom Row Wheels */}
        <rect x="-8.5" y="5.5" width="3.2" height="3" rx="0.8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />
        <rect x="-1.6" y="6" width="3.2" height="3" rx="0.8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />
        <rect x="5.2" y="5.5" width="3.2" height="3" rx="0.8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="0.6" />

        {/* Main Body Chassis Box */}
        <rect x="-6" y="-5" width="12" height="10" rx="1.5" fill="#334155" stroke="#94a3b8" strokeWidth="0.8" />

        {/* Top Deck Solar Panel Grid & Gold Insulated Foil Accent */}
        <rect x="-4.5" y="-3.5" width="9" height="7" rx="1" fill="#0f172a" stroke="#f97316" strokeWidth="0.5" />
        <line x1="-4.5" y1="0" x2="4.5" y2="0" stroke="#ea580c" strokeWidth="0.4" />
        <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#ea580c" strokeWidth="0.4" />

        {/* Mastcam-Z Front Mast & Camera Stereo Head (Facing Right / Forward) */}
        <line x1="3" y1="-1" x2="7.5" y2="-1" stroke="#f8fafc" strokeWidth="1" strokeLinecap="round" />
        <circle cx="7.5" cy="-1" r="1.6" fill="#06b6d4" stroke="#ffffff" strokeWidth="0.5" />

        {/* High-Gain Antenna (Rear Deck) */}
        <circle cx="-4" cy="-2" r="1.2" fill="#cbd5e1" stroke="#475569" strokeWidth="0.4" />
      </g>
    </g>
  );
};

export default MarsRoverIcon;
