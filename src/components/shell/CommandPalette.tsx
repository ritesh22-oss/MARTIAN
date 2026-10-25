import React, { useState, useEffect } from 'react';
import {
  Search,
  LayoutDashboard,
  Compass,
  Layers,
  Sliders,
  Cpu,
  Database,
  ShieldAlert,
  ShieldCheck,
  Navigation,
  Route,
  AlertOctagon,
  Terminal,
  BarChart3,
  FileSpreadsheet,
  BookOpen,
  Bot,
  Settings,
  X
} from 'lucide-react';
import { useWorkspace, WorkspaceId } from '../../context/WorkspaceContext';

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveWorkspace } = useWorkspace();
  const [searchTerm, setSearchTerm] = useState('');

  const commands = [
    { id: 'overview', label: 'Go to Mission Overview', category: 'MISSION', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'explorer-3d', label: 'Launch 3D Terrain Explorer', category: 'MISSION', icon: <Compass className="w-4 h-4 text-orange-400" /> },
    { id: 'mission-data', label: 'Inspect Mission Data & Provenance', category: 'MISSION', icon: <Layers className="w-4 h-4" /> },
    { id: 'configuration', label: 'Configure Rover Parameters', category: 'MISSION', icon: <Sliders className="w-4 h-4" /> },
    { id: 'terrain-intelligence', label: 'Run AI4Mars Terrain Segmentation', category: 'ANALYSIS', icon: <Cpu className="w-4 h-4 text-cyan-400" /> },
    { id: 'dataset-catalogue', label: 'Browse NASA Dataset Catalogue', category: 'ANALYSIS', icon: <Database className="w-4 h-4 text-emerald-400" /> },
    { id: 'hazard-analysis', label: 'Open Hazard Analysis Lab', category: 'ANALYSIS', icon: <ShieldAlert className="w-4 h-4 text-red-400" /> },
    { id: 'risk-assessment', label: 'Evaluate Risk Cost Weighting', category: 'ANALYSIS', icon: <ShieldCheck className="w-4 h-4 text-amber-400" /> },
    { id: 'route-lab', label: 'Open Interactive Route Laboratory (A*)', category: 'NAVIGATION', icon: <Navigation className="w-4 h-4 text-orange-400" /> },
    { id: 'route-comparison', label: 'Compare Multi-Objective Routes', category: 'NAVIGATION', icon: <Route className="w-4 h-4 text-blue-400" /> },
    { id: 'scenario-testing', label: 'Run Failure Rehearsal Scenarios', category: 'NAVIGATION', icon: <AlertOctagon className="w-4 h-4 text-rose-400" /> },
    { id: 'validation-harness', label: 'Execute Validation Test Harness', category: 'VALIDATION', icon: <Terminal className="w-4 h-4 text-emerald-400" /> },
    { id: 'model-eval', label: 'Review Model Evaluation Metrics', category: 'VALIDATION', icon: <BarChart3 className="w-4 h-4 text-indigo-400" /> },
    { id: 'audit', label: 'View Mission Audit & Reports', category: 'VALIDATION', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'guide', label: 'Open Interactive Guide & Manual', category: 'ASSISTANCE', icon: <BookOpen className="w-4 h-4 text-amber-300" /> },
    { id: 'orbit-terminal', label: 'Open ORBIT AI Mission Terminal', category: 'ASSISTANCE', icon: <Bot className="w-4 h-4 text-red-400" /> },
    { id: 'settings', label: 'System Settings & Graphics Options', category: 'ASSISTANCE', icon: <Settings className="w-4 h-4 text-slate-400" /> }
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-xl bg-[#0B1020] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col font-mono text-xs">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800 bg-[#070B16]">
          <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or jump to workspace..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No matching commands found.</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveWorkspace(item.id as WorkspaceId);
                  setCommandPaletteOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-1 rounded bg-slate-800/80 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <span className="font-medium text-xs">{item.label}</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest">{item.category}</span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-[#050813] text-[10px] text-slate-500 flex items-center justify-between">
          <span>Navigate with mouse or keyboard</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
