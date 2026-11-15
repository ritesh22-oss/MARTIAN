import React from 'react';
import type { OrbitMood } from '../../context/OnboardingContext';

interface OrbitRobotProps {
  mood?: OrbitMood;
  lookDirection?: 'left' | 'right' | 'center';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OrbitRobot: React.FC<OrbitRobotProps> = ({
  mood = 'idle',
  lookDirection = 'center',
  size = 'md',
  className = '',
}) => {
  const dimensions =
    size === 'sm' ? 'w-14 h-14' : size === 'lg' ? 'w-28 h-28' : 'w-20 h-20';

  const headTurnClass =
    lookDirection === 'left'
      ? '-translate-x-1 -rotate-3'
      : lookDirection === 'right'
        ? 'translate-x-1 rotate-3'
        : 'translate-x-0 rotate-0';

  const eyeShiftX =
    lookDirection === 'left' ? -3 : lookDirection === 'right' ? 3 : 0;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${dimensions} ${className}`}
      aria-hidden="true"
    >
      <style>{`
        @keyframes orbitFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes orbitCelebrate {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-7px) rotate(-3deg); }
          75% { transform: translateY(-7px) rotate(3deg); }
        }
        @keyframes orbitBlink {
          0%, 46%, 50%, 96%, 100% { transform: scaleY(1); }
          48%, 98% { transform: scaleY(0.12); }
        }
        @keyframes orbitAntennaPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.82); }
        }
        @keyframes orbitVoiceWave {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1); }
        }
        @keyframes orbitArmWave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-18deg); }
        }
        @keyframes orbitSparkle {
          0%, 100% { opacity: 0.25; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        .orbit-bob {
          animation: orbitFloat 3.4s ease-in-out infinite;
        }
        .orbit-celebrate {
          animation: orbitCelebrate 1.3s ease-in-out infinite;
        }
        .orbit-eye {
          transform-box: fill-box;
          transform-origin: center;
          animation: orbitBlink 4.6s ease-in-out infinite;
        }
        .orbit-beacon {
          transform-box: fill-box;
          transform-origin: center;
          animation: orbitAntennaPulse 1.5s ease-in-out infinite;
        }
        .orbit-wave-1 {
          transform-box: fill-box;
          transform-origin: center;
          animation: orbitVoiceWave 0.45s ease-in-out infinite;
        }
        .orbit-wave-2 {
          transform-box: fill-box;
          transform-origin: center;
          animation: orbitVoiceWave 0.45s ease-in-out 0.14s infinite;
        }
        .orbit-wave-3 {
          transform-box: fill-box;
          transform-origin: center;
          animation: orbitVoiceWave 0.45s ease-in-out 0.28s infinite;
        }
        .orbit-arm-wave {
          transform-box: fill-box;
          transform-origin: top center;
          animation: orbitArmWave 1.1s ease-in-out infinite;
        }
        .orbit-spark {
          transform-box: fill-box;
          transform-origin: center;
          animation: orbitSparkle 1.6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .orbit-bob, .orbit-celebrate, .orbit-eye, .orbit-beacon,
          .orbit-wave-1, .orbit-wave-2, .orbit-wave-3, .orbit-arm-wave, .orbit-spark {
            animation: none !important;
          }
        }
      `}</style>

      {/* Ambient under-thruster / cyan glow */}
      <div
        className={`absolute inset-1 rounded-full blur-xl pointer-events-none transition-colors duration-300 ${
          mood === 'celebrating'
            ? 'bg-gradient-to-tr from-orange-500/35 via-amber-400/25 to-cyan-400/35'
            : 'bg-gradient-to-tr from-cyan-500/25 to-orange-500/20'
        }`}
      />

      <svg
        viewBox="0 0 120 120"
        className={`relative w-full h-full drop-shadow-[0_6px_16px_rgba(6,182,212,0.28)] ${
          mood === 'celebrating' ? 'orbit-celebrate' : 'orbit-bob'
        }`}
      >
        <defs>
          <linearGradient id="orbitShell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="55%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>
          <linearGradient id="orbitOrange" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="orbitVisor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="orbitChassis" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        {/* Celebration Particles */}
        {mood === 'celebrating' && (
          <g>
            <circle cx="16" cy="24" r="2.5" fill="#22D3EE" className="orbit-spark" />
            <circle cx="104" cy="22" r="2.5" fill="#FB923C" className="orbit-spark" />
            <path d="M22 44 L25 40 L28 44 L25 48 Z" fill="#FACC15" className="orbit-spark" />
            <path d="M96 42 L99 38 L102 42 L99 46 Z" fill="#38BDF8" className="orbit-spark" />
          </g>
        )}

        {/* Ground hover shadow */}
        <ellipse cx="60" cy="111" rx="28" ry="4" fill="#06B6D4" opacity="0.22" />

        {/* Left & Right Rover Mobility Wheels */}
        <g>
          <rect x="27" y="90" width="14" height="16" rx="5" fill="#0F172A" stroke="#475569" strokeWidth="1.5" />
          <line x1="29" y1="95" x2="39" y2="95" stroke="#EA580C" strokeWidth="1.5" />
          <line x1="29" y1="101" x2="39" y2="101" stroke="#EA580C" strokeWidth="1.5" />

          <rect x="79" y="90" width="14" height="16" rx="5" fill="#0F172A" stroke="#475569" strokeWidth="1.5" />
          <line x1="81" y1="95" x2="91" y2="95" stroke="#EA580C" strokeWidth="1.5" />
          <line x1="81" y1="101" x2="91" y2="101" stroke="#EA580C" strokeWidth="1.5" />

          <rect x="41" y="94" width="38" height="7" rx="3.5" fill="url(#orbitChassis)" stroke="#475569" strokeWidth="1" />
        </g>

        {/* Torso / Science Chassis */}
        <g>
          {/* Left Arm */}
          <g className={mood === 'happy' || mood === 'celebrating' ? 'orbit-arm-wave' : ''}>
            <rect x="24" y="64" width="9" height="20" rx="4.5" fill="url(#orbitChassis)" stroke="#64748B" strokeWidth="1.2" />
            <circle cx="28.5" cy="66" r="3.5" fill="url(#orbitOrange)" />
          </g>

          {/* Right Arm */}
          <g className={mood === 'celebrating' ? 'orbit-arm-wave' : ''}>
            <rect x="87" y="64" width="9" height="20" rx="4.5" fill="url(#orbitChassis)" stroke="#64748B" strokeWidth="1.2" />
            <circle cx="91.5" cy="66" r="3.5" fill="url(#orbitOrange)" />
          </g>

          {/* Main Body */}
          <rect x="36" y="61" width="48" height="33" rx="11" fill="url(#orbitShell)" stroke="#94A3B8" strokeWidth="1.4" />
          {/* Mars-Orange Chest Plate */}
          <rect x="43" y="67" width="34" height="19" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="1" />
          <rect x="43" y="67" width="34" height="4" rx="2" fill="url(#orbitOrange)" />

          {/* Telemetry Core Indicator */}
          <circle cx="52" cy="79" r="3" fill={mood === 'thinking' ? '#FACC15' : '#22D3EE'} />
          <rect x="59" y="77" width="13" height="2" rx="1" fill="#38BDF8" opacity="0.85" />
          <rect x="59" y="81" width="9" height="1.5" rx="0.75" fill="#94A3B8" opacity="0.7" />
        </g>

        {/* Neck Connector */}
        <rect x="53" y="55" width="14" height="8" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1" />

        {/* Articulated Head + Antenna */}
        <g className={`transition-transform duration-300 ease-out ${headTurnClass}`}>
          {/* Antenna Mast & Beacon */}
          <line x1="60" y1="22" x2="60" y2="11" stroke="#94A3B8" strokeWidth="2.4" strokeLinecap="round" />
          <circle
            cx="60"
            cy="9.5"
            r="4"
            fill={mood === 'thinking' ? '#FACC15' : '#22D3EE'}
            className="orbit-beacon"
          />
          <circle cx="60" cy="9.5" r="7" fill="#22D3EE" opacity="0.2" className="orbit-beacon" />

          {/* Side Ear Pods (Mars Orange) */}
          <rect x="27" y="31" width="7" height="16" rx="3.5" fill="url(#orbitOrange)" />
          <rect x="86" y="31" width="7" height="16" rx="3.5" fill="url(#orbitOrange)" />

          {/* Head Shell */}
          <rect x="33" y="21" width="54" height="36" rx="14" fill="url(#orbitShell)" stroke="#CBD5E1" strokeWidth="1.5" />

          {/* Dark Visor Screen */}
          <rect x="39" y="27" width="42" height="24" rx="9" fill="url(#orbitVisor)" stroke="#1E293B" strokeWidth="1.2" />

          {/* Eyes (Cyan Glowing Sensors) */}
          <g transform={`translate(${eyeShiftX}, 0)`}>
            {mood === 'happy' || mood === 'celebrating' ? (
              <>
                {/* Cheerful ^ ^ arc eyes */}
                <path
                  d="M46 38 Q50 32 54 38"
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <path
                  d="M66 38 Q70 32 74 38"
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <rect x="46" y="33.5" width="7" height="7" rx="3" fill="#22D3EE" className="orbit-eye" />
                <rect x="67" y="33.5" width="7" height="7" rx="3" fill="#22D3EE" className="orbit-eye" />
                <circle cx="48.5" cy="35.5" r="1.2" fill="#ECFEFF" />
                <circle cx="69.5" cy="35.5" r="1.2" fill="#ECFEFF" />
              </>
            )}

            {/* Speaking Waveform / Thinking / Idle Mouth */}
            {mood === 'speaking' ? (
              <g>
                <rect x="53" y="43.5" width="2.2" height="4.5" rx="1" fill="#38BDF8" className="orbit-wave-1" />
                <rect x="57" y="42.5" width="2.2" height="6" rx="1" fill="#22D3EE" className="orbit-wave-2" />
                <rect x="61" y="42.5" width="2.2" height="6" rx="1" fill="#22D3EE" className="orbit-wave-3" />
                <rect x="65" y="43.5" width="2.2" height="4.5" rx="1" fill="#38BDF8" className="orbit-wave-1" />
              </g>
            ) : mood === 'thinking' ? (
              <g>
                <circle cx="55" cy="45.5" r="1.4" fill="#FACC15" />
                <circle cx="60" cy="45.5" r="1.4" fill="#FACC15" opacity="0.65" />
                <circle cx="65" cy="45.5" r="1.4" fill="#FACC15" opacity="0.35" />
              </g>
            ) : (
              <path
                d="M54 44.5 Q60 48 66 44.5"
                fill="none"
                stroke="#22D3EE"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.85"
              />
            )}
          </g>
        </g>
      </svg>
    </div>
  );
};

export default OrbitRobot;
