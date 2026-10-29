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
        { id: 'marsnav-v4', label: 'MARSWALK OPS Simulator', icon: <Navigation className="w-4 h-4 text-orange-400" />, badge: 'EVA' },
        { id: 'field-notebook', label: 'Spatial Field Notebook', icon: <BookOpen className="w-4 h-4 text-orange-300" />, badge: 'NOTES' },
        { id: 'live-mission-data', label: 'Live NASA Stream', icon: <Radio className="w-4 h-4 text-emerald-400" />, badge: 'LIVE' },
        { id: 'explorer-3d', label: '3D Terrain Explorer', icon: <Compass className="w-4 h-4 text-orange-400" />, badge: '3D' },
        { id: 'mission-data', label: 'Mission Data & DEM', icon: <Layers className="w-4 h-4" /> },
        { id: 'configuration', label: 'Mission Configuration', icon: <Sliders className="w-4 h-4" /> }
      ]
    },
    {
      name: 'Analysis',
      items: [
        { id: 'base-camp-intel', label: 'Base Camp Intelligence', icon: <Compass className="w-4 h-4 text-cyan-400" />, badge: 'SITES' },
        { id: 'nasa-raw-feed', label: 'NASA Raw Image Feed', icon: <Radio className="w-4 h-4 text-orange-400" />, badge: 'JPL' },
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
      className={`h-screen bg-[#080B14] border-r border-slate-800/80 flex flex-col shrink-0 select-none z-30 transition-all duration-200 relative overflow-y-auto overflow-x-visible ${
        sidebarCollapsed ? 'w-[58px]' : 'w-[230px]'
      }`}
    >
      {/* Top Application Brand Header - Sticky */}
      <div className="sticky top-0 h-16 px-4 border-b border-slate-800/80 flex items-center justify-between bg-[#060812]/95 backdrop-blur-md z-20 transition-all duration-200">
        <div className="flex items-center gap-3 overflow-hidden w-full">
          <div className="relative group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-950/40 ring-1 ring-white/20">
              <Orbit className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#060812] flex items-center justify-center">
              <span className={`w-2 h-2 rounded-full ${systemStatus.backend === 'connected' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'} animate-pulse`} />
            </div>
          </div>

          {!sidebarCollapsed && (
            <div className="leading-tight truncate flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-extrabold text-xs tracking-widest text-white font-mono uppercase">MARSNAV</span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30 rounded-md tracking-tight shrink-0 shadow-sm">
                  v1.00
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono tracking-tight flex items-center gap-1.5 mt-1">
                <span className="text-slate-400 font-medium truncate">
                  {systemStatus.backend === 'connected' ? 'ARES-OS Online' : 'Autonomous Node'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Groups List - No local overflow to prevent clipping */}
      <div className="flex-1 px-2 py-3 space-y-4">
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
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-normal transition-colors text-left group cursor-pointer relative ${
                      isActive
                        ? 'bg-orange-500/15 text-orange-200 font-medium'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className={`shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-400 group-hover:text-slate-300'}`}>
                      {item.icon}
                    </div>

                    {!sidebarCollapsed ? (
                      <div className="flex-1 flex items-center justify-between truncate">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5 shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Custom Tooltip - positioned slightly offset to ensure visibility */
                      <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-800 border border-slate-600 text-white text-[11px] font-semibold rounded-lg hidden group-hover:block pointer-events-none z-[9999] shadow-2xl whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                          {item.label}
                          {item.badge && <span className="ml-1 text-[9px] text-slate-400 font-mono">[{item.badge}]</span>}
                        </div>
                        {/* Simple Triangle */}
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-slate-600 rotate-45" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Collapse / Expand Toggle Button - Sticky */}
      <div className="sticky bottom-0 p-2 border-t border-slate-800/80 bg-[#060812] z-20">
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
