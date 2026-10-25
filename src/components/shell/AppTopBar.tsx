import React, { useState } from 'react';
import {
  ChevronRight,
  Database,
  Download,
  BookOpen,
  PanelRightOpen,
  PanelRightClose,
  Search,
  Cloud,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { useWorkspace, WorkspaceId } from '../../context/WorkspaceContext';

interface AppTopBarProps {
  onOpenMissions: () => void;
  onOpenGuideModal: () => void;
}

export default function AppTopBar({ onOpenMissions, onOpenGuideModal }: AppTopBarProps) {
  const {
    activeWorkspace,
    activeDataset,
    systemStatus,
    checkSystemHealth,
    inspectorOpen,
    setInspectorOpen,
    setCommandPaletteOpen
  } = useWorkspace();

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const getWorkspaceCategory = (id: WorkspaceId): { category: string; title: string } => {
    switch (id) {
      case 'overview':
        return { category: 'Mission', title: 'Mission Overview' };
      case 'explorer-3d':
        return { category: 'Mission', title: '3D Terrain Explorer' };
      case 'live-mission-data':
        return { category: 'Mission', title: 'Live NASA Stream' };
      case 'mission-data':
        return { category: 'Mission', title: 'Mission Data & DEM' };
      case 'configuration':
        return { category: 'Mission', title: 'Configuration' };
      case 'terrain-intelligence':
        return { category: 'Analysis', title: 'Terrain Intelligence' };
      case 'dataset-catalogue':
        return { category: 'Analysis', title: 'Dataset Catalogue' };
      case 'hazard-analysis':
        return { category: 'Analysis', title: 'Hazard Analysis' };
      case 'risk-assessment':
        return { category: 'Analysis', title: 'Risk Assessment' };
      case 'route-lab':
        return { category: 'Navigation', title: 'Route Laboratory' };
      case 'route-comparison':
        return { category: 'Navigation', title: 'Route Comparison' };
      case 'scenario-testing':
        return { category: 'Navigation', title: 'Scenario Testing' };
      case 'validation-harness':
        return { category: 'Validation', title: 'Validation Harness' };
      case 'model-eval':
        return { category: 'Validation', title: 'Model Evaluation' };
      case 'audit':
        return { category: 'Validation', title: 'Mission Audit' };
      case 'guide':
        return { category: 'Assistance', title: 'Mission Manual' };
      case 'orbit-terminal':
        return { category: 'Assistance', title: 'ORBIT AI Terminal' };
      case 'settings':
        return { category: 'Assistance', title: 'System Settings' };
      default:
        return { category: 'Workspace', title: 'Mission Control' };
    }
  };

  const { category, title } = getWorkspaceCategory(activeWorkspace);

  const handleQuickExport = () => {
    const exportData = {
      system: 'MARSNAV Planetary Robotics Workstation',
      version: '3.8.4',
      activeWorkspace,
      dataset: activeDataset,
      exportTimestamp: new Date().toISOString(),
      systemStatus
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marsnav_${activeWorkspace}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportNotice('Exported workspace state (JSON)');
    setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <header className="h-12 bg-[#090C16] border-b border-slate-800/80 px-4 flex items-center justify-between text-xs shrink-0 select-none z-20">
      {/* Zone 1: Brand & Clean Unboxed Breadcrumbs */}
      <div className="flex items-center gap-2 text-slate-400 font-sans truncate">
        <span className="font-bold text-white text-sm tracking-tight whitespace-nowrap">MARSNAV</span>
        <span className="text-slate-600" aria-hidden="true">/</span>
        <span className="text-slate-400 text-xs font-medium whitespace-nowrap">{category}</span>
        <span className="text-slate-600" aria-hidden="true">/</span>
        <span className="text-orange-300 text-xs font-semibold whitespace-nowrap truncate">{title}</span>
      </div>

      {/* Zone 2: Active Dataset Indicator (Single Line, Middle) */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900/60 rounded-md border border-slate-800/80 text-xs text-slate-300 max-w-sm truncate">
        <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="text-slate-400 shrink-0 text-[11px]">Dataset:</span>
        <span className="text-slate-200 font-medium truncate text-[11px]">{activeDataset}</span>
      </div>

      {/* Zone 3: Actions & Controls */}
      <div className="flex items-center gap-2">
        {/* Real Backend / AI Status Indicator (Text-First, Non-Hue-Only) */}
        <button
          onClick={checkSystemHealth}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/40 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
          title="Click to probe backend and model health"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              systemStatus.backend === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="font-medium whitespace-nowrap">
            {systemStatus.backend === 'connected'
              ? `Online ${systemStatus.backendLatencyMs ? `· ${systemStatus.backendLatencyMs}ms` : ''}`
              : 'Autonomous Core'}
          </span>
        </button>

        {/* Command Palette Button */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer text-[11px]"
          title="Search tools and actions (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="font-sans">Search</span>
          <kbd className="px-1 py-0.2 rounded bg-black/40 text-[10px] text-slate-400 font-mono border border-slate-700/60">⌘K</kbd>
        </button>

        {/* Cloud Missions Modal Action */}
        <button
          onClick={onOpenMissions}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
          title="Open saved missions"
        >
          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Missions</span>
        </button>

        {/* Quick Export Button */}
        <button
          onClick={handleQuickExport}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
          title="Export workspace state (JSON)"
        >
          <Download className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Guide Modal Action */}
        <button
          onClick={onOpenGuideModal}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
          title="Open Mission Manual & Guide"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden sm:inline">Guide</span>
        </button>

        {/* Right Inspector Toggle */}
        <button
          onClick={() => setInspectorOpen(!inspectorOpen)}
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            inspectorOpen
              ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
              : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title={inspectorOpen ? 'Collapse Inspector (Ctrl+\\)' : 'Expand Inspector'}
          aria-label={inspectorOpen ? 'Collapse Inspector' : 'Expand Inspector'}
        >
          {inspectorOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>

        {/* Export Notification Toast */}
        {exportNotice && (
          <div className="absolute top-14 right-4 px-3 py-1.5 bg-[#0D182A] border border-emerald-500/40 text-emerald-300 rounded-md text-xs flex items-center gap-2 shadow-xl z-50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{exportNotice}</span>
          </div>
        )}
      </div>
    </header>
  );
}
