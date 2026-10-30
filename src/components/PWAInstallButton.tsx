import React, { useState } from 'react';
import { Download, Smartphone, X, Info, ChevronRight, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'sidebar' | 'topbar' }> = ({ variant = 'sidebar' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else if (isInstallable) {
      await install();
    }
  };

  // Chromium / Android / Desktop / iOS Safari flow
  if (!isInstallable && !isIOS) return null;

  if (variant === 'topbar') {
    return (
      <>
        <button
          onClick={handleInstall}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 hover:text-white transition-all cursor-pointer text-xs font-semibold uppercase tracking-wider"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install MarsNav</span>
        </button>

        {showIOSGuide && <IOSInstallGuide onClose={() => setShowIOSGuide(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstall}
        className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600/20 to-orange-600/10 hover:from-cyan-600/30 hover:to-orange-600/20 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer group"
      >
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-lg">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="text-left">
          <div className="text-[11px] font-bold text-white uppercase tracking-wider">Install App</div>
          <div className="text-[9px] text-slate-400 font-medium">Native MarsNav Experience</div>
        </div>
        <ChevronRight className="w-3 h-3 ml-auto text-slate-600 group-hover:text-cyan-400 transition-colors" />
      </button>

      {showIOSGuide && <IOSInstallGuide onClose={() => setShowIOSGuide(false)} />}
    </>
  );
};

const IOSInstallGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/10 p-6 shadow-2xl shadow-black">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Install on iOS</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xs shrink-0">1</div>
            <p className="text-sm text-slate-300 pt-1.5">
              Tap the <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-white mx-1"><Share className="w-3 h-3 mr-1" /> Share</span> button in the Safari toolbar.
            </p>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xs shrink-0">2</div>
            <p className="text-sm text-slate-300 pt-1.5">
              Scroll down and tap <span className="font-bold text-white">"Add to Home Screen"</span>.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start space-x-3">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              This will enable the full cinematic MarsNav experience, including offline capabilities and a distraction-free fullscreen interface.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-8 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-xs tracking-widest uppercase transition-all"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
