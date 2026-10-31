import React, { useState, useEffect, useRef } from 'react';
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
  X,
  FolderOpen
} from 'lucide-react';
import { useWorkspace, WorkspaceId } from '../../context/WorkspaceContext';

export default function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setActiveWorkspace,
    toggleRightInspector,
    setMissionManagerOpen
  } = useWorkspace();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = [
    // Primary Global Shortcuts
    {
      id: 'overview',
      label: 'Open Mission Overview',
      category: 'NAVIGATION',
      shortcut: '1',
      icon: <LayoutDashboard className="w-4 h-4 text-orange-400" />,
      action: () => setActiveWorkspace('overview')
    },
    {
      id: 'explorer-3d',
      label: 'Open 3D Terrain Explorer',
      category: 'NAVIGATION',
      shortcut: '2',
      icon: <Compass className="w-4 h-4 text-orange-400" />,
      action: () => setActiveWorkspace('explorer-3d')
    },
    {
      id: 'dataset-catalogue',
      label: 'Open Mission Data Catalog',
      category: 'NAVIGATION',
      shortcut: '3',
      icon: <Database className="w-4 h-4 text-emerald-400" />,
      action: () => setActiveWorkspace('dataset-catalogue')
    },
    {
      id: 'toggle-inspector',
      label: 'Toggle Right Inspector Panel',
      category: 'ACTIONS',
      shortcut: 'I',
      icon: <Sliders className="w-4 h-4 text-cyan-400" />,
      action: () => toggleRightInspector()
    },
    // Other Workspaces & Actions
    {
      id: 'marsnav-v4',
      label: 'Open MarsNav Interactive Ops / 2D Planner',
      category: 'NAVIGATION',
      icon: <Navigation className="w-4 h-4 text-cyan-400" />,
      action: () => setActiveWorkspace('marsnav-v4')
    },
    {
      id: 'mission-manager',
      label: 'Open Mission Workspace Manager',
      category: 'ACTIONS',
      icon: <FolderOpen className="w-4 h-4 text-amber-400" />,
      action: () => setMissionManagerOpen(true)
    },
    {
      id: 'terrain-intelligence',
      label: 'Run AI4Mars Terrain Segmentation',
      category: 'ANALYSIS',
      icon: <Cpu className="w-4 h-4 text-cyan-400" />,
      action: () => setActiveWorkspace('terrain-intelligence')
    },
    {
      id: 'hazard-analysis',
      label: 'Open Hazard Analysis Lab',
      category: 'ANALYSIS',
      icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
      action: () => setActiveWorkspace('hazard-analysis')
    },
    {
      id: 'risk-assessment',
      label: 'Evaluate Risk Cost Weighting',
      category: 'ANALYSIS',
      icon: <ShieldCheck className="w-4 h-4 text-amber-400" />,
      action: () => setActiveWorkspace('risk-assessment')
    },
    {
      id: 'route-lab',
      label: 'Open Interactive Route Laboratory (A*)',
      category: 'NAVIGATION',
      icon: <Navigation className="w-4 h-4 text-orange-400" />,
      action: () => setActiveWorkspace('route-lab')
    },
    {
      id: 'route-comparison',
      label: 'Compare Multi-Objective Routes',
      category: 'NAVIGATION',
      icon: <Route className="w-4 h-4 text-blue-400" />,
      action: () => setActiveWorkspace('route-comparison')
    },
    {
      id: 'scenario-testing',
      label: 'Run Failure Rehearsal Scenarios',
      category: 'NAVIGATION',
      icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
      action: () => setActiveWorkspace('scenario-testing')
    },
    {
      id: 'validation-harness',
      label: 'Execute Validation Test Harness',
      category: 'VALIDATION',
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
      action: () => setActiveWorkspace('validation-harness')
    },
    {
      id: 'model-eval',
      label: 'Review Model Evaluation Metrics',
      category: 'VALIDATION',
      icon: <BarChart3 className="w-4 h-4 text-indigo-400" />,
      action: () => setActiveWorkspace('model-eval')
    },
    {
      id: 'audit',
      label: 'View Mission Audit & Reports',
      category: 'VALIDATION',
      icon: <FileSpreadsheet className="w-4 h-4 text-slate-300" />,
      action: () => setActiveWorkspace('audit')
    },
    {
      id: 'guide',
      label: 'Open Interactive Guide & Manual',
      category: 'ASSISTANCE',
      icon: <BookOpen className="w-4 h-4 text-amber-300" />,
      action: () => setActiveWorkspace('guide')
    },
    {
      id: 'orbit-terminal',
      label: 'Open ORBIT AI Mission Terminal',
      category: 'ASSISTANCE',
      icon: <Bot className="w-4 h-4 text-red-400" />,
      action: () => setActiveWorkspace('orbit-terminal')
    },
    {
      id: 'settings',
      label: 'System Settings & Keyboard Shortcuts',
      category: 'ASSISTANCE',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      action: () => setActiveWorkspace('settings')
    }
  ];

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.shortcut && c.shortcut.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Reset index when search term changes or palette opens
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm, commandPaletteOpen]);

  // Autofocus input when palette opens
  useEffect(() => {
    if (commandPaletteOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm('');
    }
  }, [commandPaletteOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        setCommandPaletteOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCommandPaletteOpen(false);
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#090D1A] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col font-mono text-xs ring-1 ring-white/10"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-[#060A14]">
          <Search className="w-4 h-4 text-orange-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, workspace, or shortcut (1, 2, 3, I)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-500 font-sans text-xs">
              No matching commands or workspaces found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer group ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/10 text-white border border-orange-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-1.5 rounded-lg border transition-transform ${
                      isSelected ? 'bg-orange-500/20 border-orange-500/50 scale-105' : 'bg-slate-800/80 border-slate-700/60'
                    }`}>
                      {item.icon}
                    </div>
                    <span className="font-medium text-xs truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    {item.shortcut && (
                      <kbd className="px-2 py-0.5 rounded bg-black/60 text-orange-400 border border-orange-500/40 font-mono text-[10px] font-bold shadow">
                        {item.shortcut}
                      </kbd>
                    )}
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest px-1.5 py-0.5 rounded bg-black/40 border border-slate-800">
                      {item.category}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-[#040711] text-[10px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-slate-300 font-mono text-[9px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-slate-300 font-mono text-[9px]">↓</kbd>
              <span className="text-slate-500 ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-slate-300 font-mono text-[9px]">↵</kbd>
              <span className="text-slate-500 ml-1">Select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-slate-300 font-mono text-[9px]">ESC</kbd>
            <span className="text-slate-500 ml-1">Close</span>
          </span>
        </div>
      </div>
    </div>
  );
}
