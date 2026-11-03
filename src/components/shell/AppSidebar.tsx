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
  Radio
} from 'lucide-react';
import { useWorkspace, WorkspaceId } from '../../context/WorkspaceContext';
import { PWAInstallButton } from '../PWAInstallButton';
import MarsNavLogo from '../MarsNavLogo';

interface NavItem {
  id: WorkspaceId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  shortcut?: string;
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
        { id: 'overview', label: 'Mission Overview', icon: <LayoutDashboard className="w-4 h-4 text-cyan-400" />, shortcut: '1' },
        { id: 'marsnav-v4', label: 'MARSWALK OPS Simulator', icon: <Navigation className="w-4 h-4 text-orange-400" />, badge: 'EVA' },
        { id: 'field-notebook', label: 'Spatial Field Notebook', icon: <BookOpen className="w-4 h-4 text-amber-300" />, badge: 'NOTES' },
        { id: 'live-mission-data', label: 'Live NASA Stream', icon: <Radio className="w-4 h-4 text-emerald-400" />, badge: 'LIVE' },
        { id: 'explorer-3d', label: '3D Terrain Explorer', icon: <Compass className="w-4 h-4 text-orange-400" />, badge: '3D', shortcut: '2' },
        { id: 'mission-data', label: 'Mission Data & DEM', icon: <Layers className="w-4 h-4 text-blue-400" /> },
        { id: 'configuration', label: 'Mission Configuration', icon: <Sliders className="w-4 h-4 text-purple-400" /> }
      ]
    },
    {
      name: 'Analysis',
      items: [
        { id: 'base-camp-intel', label: 'Base Camp Intelligence', icon: <Compass className="w-4 h-4 text-cyan-400" />, badge: 'SITES' },
        { id: 'nasa-raw-feed', label: 'NASA Raw Image Feed', icon: <Radio className="w-4 h-4 text-orange-400" />, badge: 'JPL' },
        { id: 'terrain-intelligence', label: 'Terrain Intelligence', icon: <Cpu className="w-4 h-4 text-cyan-400" /> },
        { id: 'dataset-catalogue', label: 'Dataset Catalogue', icon: <Database className="w-4 h-4 text-emerald-400" />, shortcut: '3' },
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
        { id: 'audit', label: 'Mission Audit', icon: <FileSpreadsheet className="w-4 h-4 text-teal-300" /> }
      ]
    },
    {
      name: 'Assistance',
      items: [
        { id: 'guide', label: 'Mission Manual', icon: <BookOpen className="w-4 h-4 text-amber-300" /> },
        { id: 'orbit-terminal', label: 'ORBIT AI Assistant', icon: <Bot className="w-4 h-4 text-rose-400" /> },
        { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4 text-slate-300" /> }
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
      <div className="sticky top-0 h-[84px] py-3 px-3 border-b border-slate-800/80 flex items-center bg-[#060812]/95 backdrop-blur-md z-20 transition-all duration-200">
        <div className="flex items-center gap-2 overflow-hidden w-full h-full">
          {sidebarCollapsed ? (
            <MarsNavLogo variant="icon" height={44} />
          ) : (
            <div className="flex items-center justify-between w-full px-1">
              <MarsNavLogo variant="full" height={44} />
              <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30 rounded shadow-sm">
                v1.0
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Groups List - No local overflow to prevent clipping */}
      <div className="flex-1 px-3 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.name} className="space-y-1.5">
            {!sidebarCollapsed ? (
              <div className="px-2 py-1 text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">
                {group.name}
              </div>
            ) : (
              <div className="h-px bg-slate-800/40 my-2 mx-1" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeWorkspace === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveWorkspace(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-600/20 via-amber-600/10 to-transparent text-white border-l-2 border-orange-500 font-semibold shadow-inner'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <span className="shrink-0 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>

                    {!sidebarCollapsed && (
                      <span className="truncate flex-1 text-left">
                        {item.label}
                      </span>
                    )}

                    {!sidebarCollapsed && item.badge && (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        item.badge === 'EVA' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                        item.badge === '3D' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                        item.badge === 'LIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {sidebarCollapsed && item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom PWA Install & Collapse Toggle Footer */}
      <div className="sticky bottom-0 bg-[#060812]/95 backdrop-blur-md border-t border-slate-800/80 p-3 space-y-2 z-20">
        {!sidebarCollapsed && <PWAInstallButton />}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-mono"
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-orange-400" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 text-orange-400" />
              <span className="text-[11px] font-semibold">Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
