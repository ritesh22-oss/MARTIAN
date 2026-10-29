import React, { useState } from 'react';
import {
  Database,
  Download,
  BookOpen,
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
    setCommandPaletteOpen,
    activeMission,
    setMissionManagerOpen
  } = useWorkspace();

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleOpenMissionManager = () => {
    setMissionManagerOpen(true);
    if (onOpenMissions) onOpenMissions();
  };

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
      case 'marsnav-v4':
        return { category: 'Navigation', title: 'MARSWALK OPS Simulator' };
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

      {/* Zone 2: Active Mission Indicator */}
      <div className="flex items-center">
        {activeMission && (
          <button
            onClick={handleOpenMissionManager}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-200 hover:text-white transition-all cursor-pointer shadow-sm text-xs font-mono group"
            title="Active Mission workspace - click to switch or manage missions"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                activeMission.status === 'Completed' ? 'bg-emerald-400' :
                activeMission.status === 'Blocked' ? 'bg-rose-400' :
                activeMission.status === 'In Progress' ? 'bg-cyan-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                activeMission.status === 'Completed' ? 'bg-emerald-500' :
                activeMission.status === 'Blocked' ? 'bg-rose-500' :
                activeMission.status === 'In Progress' ? 'bg-cyan-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">ACTIVE MSN:</span>
            <span className="font-semibold text-slate-100 max-w-[160px] sm:max-w-[220px] truncate">{activeMission.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-cyan-300 border border-cyan-800/60 hidden md:inline">
              {activeMission.status || 'In Progress'}
            </span>
          </button>
        )}
      </div>

      {/* Zone 3: Actions & Controls */}
      <div className="flex items-center gap-2">
        {/* Cloud Missions Modal Action */}
        <button
          onClick={handleOpenMissionManager}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
          title="Open mission manager"
        >
          <Cloud className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">All Missions</span>
        </button>

        {/* Prominent Guide & Tutorials Action */}
        <button
          onClick={() => {
            try {
              localStorage.setItem('marsnav_guide_visited', 'true');
            } catch (e) {}
            onOpenGuideModal();
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600/30 to-amber-600/30 hover:from-orange-600/40 hover:to-amber-600/40 border border-orange-500/50 text-orange-200 hover:text-white transition-all cursor-pointer text-xs font-mono font-bold shadow-md ${
            typeof window !== 'undefined' && !localStorage.getItem('marsnav_guide_visited') ? 'animate-pulse ring-2 ring-orange-500/50' : ''
          }`}
          title="Open MARSNAV Mission Academy & Tutorials"
        >
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>GUIDE &amp; TUTORIALS</span>
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
