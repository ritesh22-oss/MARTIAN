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
  BookOpen,
  Search,
  Menu,
  X,
  Compass,
  Layers,
  Sliders,
  Navigation
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useAuth } from '../../context/AuthContext';
import MarsNavLogo from '../MarsNavLogo';

interface AppTopBarProps {
  onOpenMissions: () => void;
  onOpenGuideModal: () => void;
}

export default function AppTopBar({ onOpenMissions, onOpenGuideModal }: AppTopBarProps) {
  const {
    activeWorkspace,
    setActiveWorkspace,
    activeMission,
    setMissionManagerOpen,
    setCommandPaletteOpen
  } = useWorkspace();

  const { user, userProfile, login, logout } = useAuth();
  const network = useNetworkStatus();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="bg-[#0A0E1A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-2xl select-none z-30 transition-all duration-300 w-full min-w-0 flex flex-col relative">
      {/* Primary Top Navbar Bar Row */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2.5 w-full min-w-0">
        {/* 1. LEFT ZONE: Brand Logo & Desktop Navigation Categories */}
        <div className="flex items-center gap-2 lg:gap-3 shrink-0 min-w-0">
          <div className="flex items-center shrink-0">
            <MarsNavLogo variant="full" height={34} className="hidden sm:flex" />
            <MarsNavLogo variant="icon" height={32} className="flex sm:hidden" />
          </div>

          {/* Desktop & Tablet Navigation Categories Hub */}
          <nav className="hidden md:flex items-center gap-0.5 sm:gap-1 bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
            {categories.map((cat) => {
              const isActive = currentCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => setActiveWorkspace(cat.defaultWorkspace as any)}
                  className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-bold tracking-widest transition-all cursor-pointer relative shrink-0 ${
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

        {/* 2. CENTER ZONE: Flexible Integrated Search Field (Shrinks first) */}
        <div className="hidden lg:flex items-center flex-1 min-w-0 max-w-[180px] xl:max-w-xs mx-1">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full h-8 sm:h-9 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-orange-500/40 rounded-xl px-2.5 flex items-center justify-between text-slate-400 hover:text-white transition-all group cursor-pointer min-w-0"
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              <Search className="w-3.5 h-3.5 text-orange-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-[10px] lg:text-[11px] font-medium tracking-wide truncate">Search missions...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono border border-white/10 text-slate-300 shrink-0 hidden xl:inline">⌘K</kbd>
          </button>
        </div>

        {/* 3. RIGHT ZONE: Active Mission, Controls & Operator Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
          {/* Quick Search Button for medium/mobile screens */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex lg:hidden items-center justify-center w-8 h-8 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-orange-400 transition-colors cursor-pointer shrink-0"
            title="Search Missions & Tools (⌘K)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Compact Active Mission Monitor (Visible on 2XL wide screens) */}
          {activeMission && (
            <div className="hidden 2xl:flex items-center h-8 sm:h-9 px-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-200 shrink-0">
              <div className="flex items-center gap-1.5 max-w-[120px]">
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
                <span className="text-[10px] font-semibold text-slate-100 truncate">{activeMission.name}</span>
              </div>
            </div>
          )}

          {/* Action Controls Box */}
          <div className="flex items-center gap-0.5 sm:gap-1 h-8 sm:h-9 p-0.5 rounded-xl bg-white/5 border border-white/5 shrink-0">
            <button
              onClick={() => setMissionManagerOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[10px] sm:text-[11px] font-medium cursor-pointer shrink-0"
              title="Open Mission Archive"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Archive</span>
            </button>

            <button
              onClick={onOpenGuideModal}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[10px] sm:text-[11px] font-medium cursor-pointer shrink-0"
              title="Open Mission Guide & Manual"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Manual</span>
            </button>
          </div>

          {/* Network Status Badge */}
          <div className="hidden sm:flex items-center gap-1 h-8 sm:h-9 px-2 rounded-xl bg-white/5 border border-white/5 text-[11px] shrink-0">
            {network.isOnline ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <Wifi className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono text-[9px] lg:text-[10px]">ONLINE</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-rose-400">
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono text-[9px] lg:text-[10px]">OFFLINE</span>
              </div>
            )}
          </div>

          {/* User Account / Profile Section (Protected Space shrink-0) */}
          <div className="relative shrink-0 flex-shrink-0 z-40">
            <button
              onClick={() => setUserDropdownOpen(prev => !prev)}
              className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white transition-all cursor-pointer text-[11px] shrink-0 font-semibold shadow-sm"
              title="Operator Profile & Authentication"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-orange-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                <UserIcon className="w-3 h-3" />
              </div>
              <span className="inline-block truncate max-w-[80px] sm:max-w-[120px] text-slate-100 font-semibold">
                {user ? (user.displayName || user.email?.split('@')[0] || 'Operator') : 'Operator'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-[#0B1020] border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 font-mono text-xs">
                <div className="px-4 py-2 border-b border-slate-800">
                  <span className="text-[10px] text-slate-400 block">AUTHENTICATED OPERATOR</span>
                  <span className="text-white font-bold truncate block">
                    {user ? (user.email || user.displayName || 'MarsNav Operator') : 'Guest Operator'}
                  </span>
                  {userProfile && (
                    <span className="mt-1 inline-block px-2 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                      {userProfile.role || 'Operator'}
                    </span>
                  )}
                </div>

                <div className="py-1">
                  {user ? (
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 hover:bg-rose-500/10 text-rose-300 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleLogin}
                      className="w-full text-left px-4 py-2 hover:bg-cyan-500/10 text-cyan-300 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button (Visible on screens smaller than md) */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="flex md:hidden items-center justify-center w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-orange-400" /> : <Menu className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Tray (Renders when mobileMenuOpen is active) */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 pt-2.5 border-t border-white/10 flex flex-col gap-2.5 w-full">
          {/* Mobile Categories Navigation Grid */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
            {categories.map((cat) => {
              const isActive = currentCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => {
                    setActiveWorkspace(cat.defaultWorkspace as any);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer text-center ${
                    isActive
                      ? 'text-cyan-400 bg-cyan-400/20 border border-cyan-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Mobile Utilities Quick Links */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            {activeMission && (
              <span className="text-slate-400 text-[10px] truncate max-w-[150px]">
                Active: <strong className="text-cyan-300">{activeMission.name}</strong>
              </span>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              {network.isOnline ? (
                <span className="text-emerald-400 text-[10px] font-mono flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> ONLINE
                </span>
              ) : (
                <span className="text-rose-400 text-[10px] font-mono flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> OFFLINE
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
