import React from 'react';

interface GuidedTourSpotlightProps {
  targetRect: DOMRect | null;
  padding?: number;
}

export const GuidedTourSpotlight: React.FC<GuidedTourSpotlightProps> = ({
  targetRect,
  padding = 5,
}) => {
  const hasRect = Boolean(targetRect && targetRect.width > 0 && targetRect.height > 0);
  const x = hasRect ? Math.max(2, targetRect!.left - padding) : 0;
  const y = hasRect ? Math.max(2, targetRect!.top - padding) : 0;
  const width = hasRect ? targetRect!.width + padding * 2 : 0;
  const height = hasRect ? targetRect!.height + padding * 2 : 0;

  return (
    <div
      className="fixed inset-0 z-[80] pointer-events-auto"
      aria-hidden="true"
    >
      {/* Fullscreen SVG Dimming Mask with Crisp Cutout Window */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="orbit-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hasRect && (
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx="12"
                ry="12"
                fill="black"
                className="transition-all duration-200 ease-out"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(3, 6, 15, 0.78)"
          mask="url(#orbit-spotlight-mask)"
        />
      </svg>

      {/* Glowing Telemetry Ring Around Highlighted Sidebar Element */}
      {hasRect && (
        <div
          className="fixed rounded-xl pointer-events-none transition-all duration-200 ease-out border-2 border-orange-400/90 shadow-[0_0_0_2px_rgba(34,211,238,0.35),0_0_24px_rgba(249,115,22,0.55),inset_0_0_12px_rgba(34,211,238,0.2)]"
          style={{
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`,
          }}
        >
          {/* Corner calibration ticks */}
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.95)]" />
        </div>
      )}
    </div>
  );
};

export default GuidedTourSpotlight;
