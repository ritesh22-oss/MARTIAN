import React, { useState, useEffect } from 'react';
import { Compass, Menu, X, Rocket, Cloud, LogIn, LogOut, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeSection, setActiveSection, backendStatus, onOpenMissions }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, userProfile, login, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'overview', label: 'Overview' },
    { id: 'terrain-3d', label: '3D Terrain' },
    { id: 'terrain-ai', label: 'Terrain AI' },
    { id: 'route-planner', label: 'Route Planner' },
    { id: 'dataset', label: 'Dataset' },
    { id: 'methodology', label: 'Methodology' },
  ];

  const scrollToSection = (id) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#050813]/90 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => scrollToSection('hero')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center shadow-lg shadow-orange-600/30 group-hover:scale-105 transition-transform duration-300 border border-orange-400/30">
              <Compass className="w-6 h-6 text-white animate-spin-slow" />
              <div className="absolute -inset-0.5 rounded-xl bg-orange-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wider text-lg bg-gradient-to-r from-white via-orange-100 to-orange-400 bg-clip-text text-transparent">
                  MARSNAV
                </span>
                <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-300 font-mono">
                  v2.4
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                AI TERRAIN INTELLIGENCE
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 bg-white/[0.03] border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer ${
                  activeSection === link.id
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md shadow-orange-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Right Action & Status */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Missions Cloud Drawer Button */}
            <button
              onClick={onOpenMissions}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Open Cloud Missions Log"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Missions</span>
            </button>

            {/* Auth / Profile Button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-slate-200 transition-colors cursor-pointer"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-5 h-5 rounded-full border border-orange-500/50"
                    />
                  ) : (
                    <User className="w-3.5 h-3.5 text-orange-400" />
                  )}
                  <span className="truncate max-w-[100px] text-[11px]">
                    {user.displayName?.split(' ')[0] || 'Commander'}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#0B1020] border border-white/20 rounded-xl shadow-2xl p-2 z-50 text-xs font-mono space-y-1">
                    <div className="p-2 border-b border-white/10 text-slate-400 text-[10px]">
                      Signed in as:
                      <div className="text-white truncate font-sans text-xs font-semibold">{user.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenMissions();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                    >
                      <Cloud className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Saved Missions</span>
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={login}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-orange-400" />
                <span>Sign In</span>
              </button>
            )}

            {/* Launch Console Button */}
            <button
              onClick={() => scrollToSection('route-planner')}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 hover:from-orange-500 hover:to-red-500 text-white text-xs font-semibold tracking-wider uppercase shadow-lg shadow-orange-600/25 transition-all duration-200 hover:scale-105 active:scale-95 border border-orange-400/40 cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Launch</span>
            </button>
          </div>

          {/* Mobile Hamburger */}
          <div className="flex lg:hidden items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-200 hover:text-white focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-[#0B1020]/95 backdrop-blur-xl border-b border-white/10 p-6 shadow-2xl animate-fade-in">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeSection === link.id
                    ? 'bg-orange-600/20 border border-orange-500/40 text-orange-400'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="pt-4 border-t border-white/10 flex flex-col space-y-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenMissions();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-xs font-mono"
              >
                <Cloud className="w-4 h-4 text-cyan-400" />
                <span>Cloud Missions Database</span>
              </button>

              {user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out ({user.displayName?.split(' ')[0] || user.email})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    login();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-mono"
                >
                  <LogIn className="w-4 h-4 text-orange-400" />
                  <span>Sign In with Google</span>
                </button>
              )}

              <button
                onClick={() => scrollToSection('route-planner')}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-semibold tracking-wider uppercase shadow-lg shadow-orange-600/30"
              >
                <Rocket className="w-4 h-4" />
                <span>Launch Console</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
