/**
 * MARSNAV Hardware & WebGL Profiler
 * Dynamically assesses GPU, CPU, RAM, and display specs to configure optimal
 * 3D visual fidelity without stutter or battery drain.
 */

export type HardwareTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DeviceProfile {
  tier: HardwareTier;
  hardwareConcurrency: number;
  deviceMemoryGb: number;
  devicePixelRatio: number;
  gpuRenderer: string;
  isSoftwareRenderer: boolean;
  prefersReducedMotion: boolean;
  sphereSegments: number;
  textureResolution: { width: number; height: number };
  starfieldCount: number;
  maxPixelRatio: number;
  enableNormalMap: boolean;
  enableAtmosphericShader: boolean;
}

export function detectDeviceCapabilities(): DeviceProfile {
  const hardwareConcurrency = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
  const deviceMemoryGb = typeof navigator !== 'undefined' && 'deviceMemory' in navigator 
    ? (navigator as any).deviceMemory || 4 
    : 4;
  const devicePixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  let gpuRenderer = 'Standard WebGL Accelerator';
  let isSoftwareRenderer = false;

  if (typeof document !== 'undefined') {
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'WebGL Engine';
        } else {
          gpuRenderer = gl.getParameter(gl.RENDERER) || 'Generic GPU';
        }

        const lowerGpu = gpuRenderer.toLowerCase();
        if (
          lowerGpu.includes('swiftshader') ||
          lowerGpu.includes('llvmpipe') ||
          lowerGpu.includes('software') ||
          lowerGpu.includes('mesa off-screen') ||
          lowerGpu.includes('basic render')
        ) {
          isSoftwareRenderer = true;
        }
      }
    } catch {
      // Fallback safe values if WebGL probe fails
    }
  }

  // Determine performance tier
  let tier: HardwareTier = 'MEDIUM';
  if (isSoftwareRenderer || hardwareConcurrency <= 2 || deviceMemoryGb < 3) {
    tier = 'LOW';
  } else if (hardwareConcurrency >= 8 && deviceMemoryGb >= 8 && !isSoftwareRenderer) {
    tier = 'HIGH';
  } else {
    tier = 'MEDIUM';
  }

  const sphereSegments = tier === 'HIGH' ? 84 : tier === 'MEDIUM' ? 64 : 36;
  const textureResolution = tier === 'HIGH'
    ? { width: 2048, height: 1024 }
    : tier === 'MEDIUM'
    ? { width: 1536, height: 768 }
    : { width: 1024, height: 512 };

  const starfieldCount = tier === 'HIGH' ? 1600 : tier === 'MEDIUM' ? 900 : 400;
  const maxPixelRatio = tier === 'HIGH' ? 2.0 : tier === 'MEDIUM' ? 1.5 : 1.0;

  return {
    tier,
    hardwareConcurrency,
    deviceMemoryGb,
    devicePixelRatio,
    gpuRenderer,
    isSoftwareRenderer,
    prefersReducedMotion,
    sphereSegments,
    textureResolution,
    starfieldCount,
    maxPixelRatio,
    enableNormalMap: tier !== 'LOW',
    enableAtmosphericShader: true
  };
}
