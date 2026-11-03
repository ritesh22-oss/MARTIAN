import React from 'react';

interface MarsNavLogoProps {
  variant?: 'full' | 'icon';
  className?: string;
  height?: number;
}

export default function MarsNavLogo({ variant = 'full', className = '', height = 48 }: MarsNavLogoProps) {
  const fullLogoSrc = '/assets/aistudio/MarsNav_Planetary_Navigation_Logo_transparent.png';
  const iconLogoSrc = '/assets/aistudio/MarsNav_Icon_transparent.png';

  if (variant === 'icon') {
    return (
      <div
        className={`relative overflow-hidden rounded-xl shrink-0 flex items-center justify-center bg-transparent border border-orange-500/30 shadow-lg shadow-orange-500/10 ${className}`}
        style={{ width: height, height }}
      >
        <img
          src={iconLogoSrc}
          alt="MarsNav Logo Icon"
          className="h-full w-auto object-contain select-none drop-shadow-[0_2px_8px_rgba(255,100,20,0.3)] transition-transform duration-200 hover:scale-110"
          style={{ mixBlendMode: 'screen' }}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center shrink-0 ${className}`}>
      <img
        src={fullLogoSrc}
        alt="MarsNav Official Logo"
        style={{ height, mixBlendMode: 'screen' }}
        className="w-auto object-contain select-none drop-shadow-[0_4px_16px_rgba(255,100,20,0.35)] transition-all duration-200 hover:brightness-110"
      />
    </div>
  );
}
