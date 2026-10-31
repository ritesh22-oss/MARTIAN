import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  Wifi,
  WifiOff,
  User as UserIcon,
  LogOut,
  LogIn,
  ChevronDown,
  Orbit,
  BookOpen
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAuth } from '../../context/AuthContext';

interface AppTopBarProps {
  onOpenMissions: () => void;
  onOpenGuideModal: () => void;
}

export default function AppTopBar({ onOpenMissions, onOpenGuideModal }: AppTopBarProps) {
  const {
    activeWorkspace,
    setActiveWorkspace,
    activeMission,
    setMissionManagerOpen
  } = useWorkspace();

  const { user, userProfile, login, logout, loading: authLoading } = useAuth();
  const network = useNetworkStatus();
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Mapping workspaces to categories for active state highlighting
  const workspaceToCategory: Record<string, string> = {
    'overview': 'MISSION',
    'explorer-3d': 'MISSION',
    'live-mission-data': 'MISSION',
    'mission-data': 'MISSION',
    'configuration': 'MISSION',
    'base-camp-intel': 'ANALYSIS',
    'nasa-raw-feed': 'ANALYSIS',
    'terrain-intelligence': 'ANALYSIS',
    'dataset-catalogue': 'ANALYSIS',
    'hazard-analysis': 'ANALYSIS',
    'risk-assessment': 'ANALYSIS',
    'marsnav-v4': 'NAVIGATION',
    'route-lab': 'NAVIGATION',
    'route-comparison': 'NAVIGATION',
    'scenario-testing': 'NAVIGATION',
    'validation-harness': 'VALIDATION',
    'model-eval': 'VALIDATION',
    'audit': 'VALIDATION',
    'field-notebook': 'MISSION'
  };

  const currentCategory = workspaceToCategory[activeWorkspace] || 'MISSION';

  const categories = [
    { label: 'MISSION', defaultWorkspace: 'overview' },
    { label: 'ANALYSIS', defaultWorkspace: 'terrain-intelligence' },
    { label: 'NAVIGATION', defaultWorkspace: 'marsnav-v4' },
    { label: 'VALIDATION', defaultWorkspace: 'validation-harness' }
  ];

  const handleLogin = async () => {
    try {
      await login();
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUserDropdownOpen(false);
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <header className="h-14 bg-[#0A0E1A]/80 backdrop-blur-xl border border-white/10 rounded-xl px-5 flex items-center justify-between shadow-2xl select-none z-30 transition-all duration-300">
      {/* LEFT ZONE: Brand & Core Navigation */}
      <div className="flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-950/20 ring-1 ring-white/10">
            <Orbit className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-extrabold text-white text-base tracking-tighter font-mono hidden sm:inline">MARSNAV</span>
        </div>

        {/* Global Navigation Hub */}
        <nav className="hidden xl:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
          {categories.map((cat) => {
            const isActive = currentCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => setActiveWorkspace(cat.defaultWorkspace as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-widest transition-all cursor-pointer relative ${
                  isActive 
                    ? 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat.label}
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* RIGHT ZONE: Context, Intelligence, & Identity */}
      <div className="flex items-center gap-3">
        {/* Compact Mission Monitor */}
        {activeMission && (
          <div className="hidden md:flex items-center h-9 px-3 rounded-xl bg-cyan-950/15 border border-cyan-500/20 text-cyan-200">
            <div className="flex items-center gap-2 max-w-[180px]">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  activeMission.status === 'Completed' ? 'bg-emerald-400' :
                  activeMission.status === 'Blocked' ? 'bg-rose-400' :
                  activeMission.status === 'In Progress' ? 'bg-cyan-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  activeMission.status === 'Completed' ? 'bg-emerald-500' :
                  activeMission.status === 'Blocked' ? 'bg-rose-500' :
                  activeMission.status === 'In Progress' ? 'bg-cyan-500' : 'bg-amber-500'
                }`}></span>
              </span>
              <span className="text-[11px] font-semibold text-slate-100 truncate">{activeMission.name}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 h-9 p-1 rounded-xl bg-white/5 border border-white/5">
          <button
            onClick={() => setMissionManagerOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all text-[11px] font-medium cursor-pointer"
            title="Open Mission Archive"
          >
            <Cloud className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">Archive</span>
          </button>
          <div className="w-px h-4 bg-white/10" />
          <button
            onClick={onOpenGuideModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all text-[11px] font-medium cursor-pointer"
            title="Open Training Manual"
          >
            <BookOpen className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden lg:inline">Guide</span>
          </button>
        </div>

        {/* System Telemetry */}
        <div 
          className={`hidden sm:flex items-center gap-2 px-2.5 h-9 rounded-xl border transition-colors cursor-help ${
            network.state === 'OFFLINE' ? 'bg-rose-950/20 border-rose-500/30 text-rose-400' :
            network.state === 'SLOW_CONNECTION' ? 'bg-amber-950/20 border-amber-500/30 text-amber-400' :
            'bg-emerald-950/10 border-emerald-500/20 text-emerald-400'
          }`}
          title={`DSN Uplink: ${network.state} (${network.latencyMs || 'Local'})`}
        >
          {network.state === 'OFFLINE' ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          <span className="text-[9px] font-bold tracking-widest font-mono uppercase hidden lg:inline">
            {network.state === 'OFFLINE' ? 'LOST' : 'LINK'}
          </span>
        </div>

        <div className="w-px h-6 bg-white/10 mx-1" />

        {/* Global Notifications & Account */}
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="w-9 h-9 rounded-full bg-slate-900 border border-white/10 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all cursor-pointer overflow-hidden group"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-cyan-900/40">
                    <UserIcon className="w-4 h-4 text-cyan-400" />
                  </div>
                )}
              </button>

              {userDropdownOpen && (
                <div className="absolute top-12 right-0 w-56 bg-[#0B101D] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in duration-200">
                  <div className="px-4 py-3 border-b border-white/5 mb-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Auth Verified</p>
                    <p className="text-xs font-semibold text-white truncate">{userProfile?.displayName || user.email}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors text-left font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>End Session</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={authLoading}
              className="h-9 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all cursor-pointer text-xs font-bold active:scale-95 disabled:opacity-50 shadow-lg shadow-cyan-900/30 flex items-center gap-2"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SIGN IN</span>
            </button>
          )}
        </div>
      </div>

      {/* Export/Status Overlay */}
      {exportNotice && (
        <div className="absolute -bottom-14 right-0 px-4 py-2 bg-[#0D182A] border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2 shadow-2xl animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{exportNotice}</span>
        </div>
      )}
    </header>
  );
}
