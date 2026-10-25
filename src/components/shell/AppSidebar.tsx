import React from 'react';
import {
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
  ChevronLeft,
  ChevronRight,
  Orbit,
  Radio
} from 'lucide-react';
import { useWorkspace, WorkspaceId } from '../../context/WorkspaceContext';

interface NavItem {
  id: WorkspaceId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

export default function AppSidebar() {
  const {
    activeWorkspace,
    setActiveWorkspace,
    sidebarCollapsed,
    setSidebarCollapsed,
    systemStatus
  } = useWorkspace();

  const groups: NavGroup[] = [
    {
      name: 'Mission',
      items: [
        { id: 'overview', label: 'Mission Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'live-mission-data', label: 'Live NASA Stream', icon: <Radio className="w-4 h-4 text-emerald-400" />, badge: 'LIVE' },
        { id: 'explorer-3d', label: '3D Terrain Explorer', icon: <Compass className="w-4 h-4 text-orange-400" />, badge: '3D' },
        { id: 'mission-data', label: 'Mission Data & DEM', icon: <Layers className="w-4 h-4" /> },
        { id: 'configuration', label: 'Mission Configuration', icon: <Sliders className="w-4 h-4" /> }
      ]
    },
    {
      name: 'Analysis',
      items: [
        { id: 'terrain-intelligence', label: 'Terrain Intelligence', icon: <Cpu className="w-4 h-4 text-cyan-400" /> },
        { id: 'dataset-catalogue', label: 'Dataset Catalogue', icon: <Database className="w-4 h-4 text-emerald-400" /> },
        { id: 'hazard-analysis', label: 'Hazard Analysis', icon: <ShieldAlert className="w-4 h-4 text-amber-400" /> },
        { id: 'risk-assessment', label: 'Risk Assessment', icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> }
      ]
    },
    {
      name: 'Navigation',
      items: [
        { id: 'route-lab', label: 'Route Laboratory', icon: <Navigation className="w-4 h-4 text-orange-400" /> },
        { id: 'route-comparison', label: 'Route Comparison', icon: <Route className="w-4 h-4 text-blue-400" /> },
        { id: 'scenario-testing', label: 'Scenario Testing', icon: <AlertOctagon className="w-4 h-4 text-amber-400" /> }
      ]
    },
    {
      name: 'Validation',
      items: [
        { id: 'validation-harness', label: 'Validation Harness', icon: <Terminal className="w-4 h-4 text-emerald-400" /> },
        { id: 'model-eval', label: 'Model Evaluation', icon: <BarChart3 className="w-4 h-4 text-indigo-400" /> },
        { id: 'audit', label: 'Mission Audit', icon: <FileSpreadsheet className="w-4 h-4 text-slate-300" /> }
      ]
    },
    {
      name: 'Assistance',
      items: [
        { id: 'guide', label: 'Mission Manual', icon: <BookOpen className="w-4 h-4 text-amber-300" /> },
        { id: 'orbit-terminal', label: 'ORBIT AI Assistant', icon: <Bot className="w-4 h-4 text-red-400" /> },
        { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4 text-slate-400" /> }
      ]
    }
  ];

  return (
    <aside
      className={`h-screen bg-[#080B14] border-r border-slate-800/80 flex flex-col shrink-0 select-none z-30 transition-all duration-200 relative ${
        sidebarCollapsed ? 'w-[58px]' : 'w-[230px]'
      }`}
    >
      {/* Top Application Brand Header */}
      <div className="h-12 px-3.5 border-b border-slate-800/80 flex items-center justify-between bg-[#060812]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-red-600 via-orange-600 to-amber-700 flex items-center justify-center shrink-0 shadow-sm">
            <Orbit className="w-4 h-4 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="leading-tight truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs tracking-wider text-white">MARSNAV</span>
                <span className="text-[10px] text-slate-400 font-mono">v3.8</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-tight flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${systemStatus.backend === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{systemStatus.backend === 'connected' ? 'Connected' : 'Autonomous'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Groups List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {groups.map((group) => (
          <div key={group.name} className="space-y-0.5">
            {!sidebarCollapsed ? (
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                {group.name}
              </div>
            ) : (
              <div className="h-px bg-slate-800/50 my-1.5 mx-1" />
            )}

            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeWorkspace === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveWorkspace(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-normal transition-colors text-left group cursor-pointer ${
                      isActive
                        ? 'bg-orange-500/15 text-orange-200 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className={`shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-400 group-hover:text-slate-300'}`}>
                      {item.icon}
                    </div>

                    {!sidebarCollapsed && (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Collapse / Expand Toggle Button */}
      <div className="p-2 border-t border-slate-800/80 bg-[#060812]">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-md hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px] font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
