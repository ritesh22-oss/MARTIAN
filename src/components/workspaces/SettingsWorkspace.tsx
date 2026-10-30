import React, { useState } from 'react';
import {
  Settings,
  Monitor,
  Cpu,
  Database,
  Keyboard,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Flame,
  Info
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { MARS_REFERENCE_DATUM } from '../../utils/marsScienceData';

export default function SettingsWorkspace() {
  const { settings, updateSettings, systemStatus, checkSystemHealth } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'display' | 'ai' | 'shortcuts' | 'about'>('display');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const shortcuts = [
    { key: 'Ctrl + K / ⌘K', desc: 'Open Command Palette & Workspace Jump' },
    { key: '1', desc: 'Switch to Mission Overview' },
    { key: '2', desc: 'Switch to 3D Terrain Explorer' },
    { key: '3', desc: 'Switch to Mission Data Catalog' },
    { key: 'I', desc: 'Toggle Right Inspector Panel' },
    { key: 'Esc', desc: 'Close modals / dialogs' }
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto font-mono text-xs">
      {/* Header */}
      <div className="bg-[#0B1020] border border-slate-800 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 uppercase tracking-widest font-bold mb-1">
            <Settings className="w-4 h-4 text-orange-400" />
            <span>SYSTEM CONFIGURATION & DIAGNOSTICS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-sans tracking-tight">
            Workstation Settings & Runtime Options
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Configure WebGL rendering pipelines, AI backend telemetry, keyboard bindings, and geodetic reference datums.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('display')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'display' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Graphics
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'ai' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            AI & Backend
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'shortcuts' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Shortcuts
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'about' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            About
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Workstation settings saved successfully.</span>
        </div>
      )}

      {/* Tab 1: Graphics & Display */}
      {activeTab === 'display' && (
        <div className="bg-[#090E1C] border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-orange-400" />
              <span>Three.js WebGL Rendering Pipeline</span>
            </h2>
          </div>

          <div className="space-y-4 max-w-xl">
            <div>
              <span className="text-slate-300 font-semibold block mb-1">Visualization Performance Level:</span>
              <div className="grid grid-cols-3 gap-2">
                {(['high', 'balanced', 'eco'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      updateSettings({ renderQuality: q });
                      handleSave();
                    }}
                    className={`p-3 rounded-xl border text-center uppercase font-bold text-xs cursor-pointer ${
                      settings.renderQuality === q
                        ? 'bg-orange-600/30 border-orange-500 text-orange-300 shadow-sm'
                        : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div>{q}</div>
                    <span className="text-[9px] font-normal text-slate-400 capitalize">
                      {q === 'high' ? '2048px Shadows' : q === 'balanced' ? '1024px Shadows' : 'No Shadows'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">Measurement Units:</span>
              <div className="flex space-x-3">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="unit"
                    checked={settings.unitSystem === 'metric'}
                    onChange={() => {
                      updateSettings({ unitSystem: 'metric' });
                      handleSave();
                    }}
                    className="accent-orange-500"
                  />
                  <span>Metric System (m, km/h, kg, °C, Pa)</span>
                </label>
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="unit"
                    checked={settings.unitSystem === 'imperial'}
                    onChange={() => {
                      updateSettings({ unitSystem: 'imperial' });
                      handleSave();
                    }}
                    className="accent-orange-500"
                  />
                  <span>Imperial System (ft, mph, lbs, °F, psi)</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-white font-semibold block text-xs">Planetary 3D Intro & Diagnostics</span>
                <span className="text-slate-400 text-[11px] block">Rerun the photorealistic 3D Mars bootloader and subsystem verification.</span>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('marsnav:replay-intro'))}
                className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 hover:text-white font-bold text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                Replay 3D Intro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI & Backend Status */}
      {activeTab === 'ai' && (
        <div className="bg-[#090E1C] border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>AI Service Diagnostics & Telemetry</span>
            </h2>
            <button
              onClick={checkSystemHealth}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              Run Diagnostic Check
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-black/40 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">GEMINI AI INTEGRATION</span>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white text-sm">gemini-3.8-flash</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Server-side proxy mounted via <code className="text-cyan-300">/api/orbit/chat</code> and <code className="text-cyan-300">/api/analyze-terrain</code> with strict 3.5s timeout protection and autonomous knowledge core.
              </p>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">DATABASE STORAGE</span>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-white text-sm">Google Cloud Firestore</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Project database: <code className="text-cyan-300">ai-studio-marsnavaipowered-...</code> with security rules and saved mission persistence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Keyboard Shortcuts */}
      {activeTab === 'shortcuts' && (
        <div className="bg-[#090E1C] border border-slate-800 p-6 rounded-2xl space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span>Keyboard Navigation & Quick Actions</span>
            </h2>
          </div>

          <div className="divide-y divide-slate-800">
            {shortcuts.map((sc, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-300">{sc.desc}</span>
                <kbd className="px-2 py-1 rounded bg-black/60 text-orange-400 border border-slate-700 font-mono text-[11px] shadow">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: About MARSNAV */}
      {activeTab === 'about' && (
        <div className="bg-[#090E1C] border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center text-white shadow-lg">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">MARSNAV Workstation</h2>
              <div className="text-[11px] text-orange-400">Version 3.8.4 Engineering Release (Desktop-Ready)</div>
            </div>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-400">
            <p>
              MARSNAV is an advanced scientific planetary robotics workstation designed for terrain analysis, computer vision inspection, and autonomous route planning in Martian exploration environments.
            </p>
            <div className="p-3 bg-black/40 rounded-xl border border-slate-800 text-[11px] space-y-1">
              <span className="text-white font-bold block">Scientific Provenance & Citations:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-400 text-[10px]">
                <li>NASA Planetary Data System (PDS) Geosciences & Imaging Nodes</li>
                <li>Mars Reconnaissance Orbiter (MRO) HiRISE Camera (University of Arizona)</li>
                <li>Mars Global Surveyor (MGS) Mars Orbiter Laser Altimeter (MOLA)</li>
                <li>AI4Mars: A Dataset for Rover Driving on Mars (NASA JPL / Caltech)</li>
                <li>Mars Environmental Dynamics Analyzer (MEDA, CAB / NASA JPL)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
