import React, { useState, useEffect } from 'react';
import { Compass, Menu, X, Cloud, BookOpen } from 'lucide-react';

export default function Navbar({ activeSection, setActiveSection, backendStatus, onOpenMissions, onOpenGuide }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'overview', label: 'Overview' },
    { id: 'terrain-3d', label: '3D Map' },
    { id: 'terrain-ai', label: 'Terrain AI' },
    { id: 'dataset-catalogue', label: 'Data Cat' },
    { id: 'hazard-analysis', label: 'Hazards' },
    { id: 'route-laboratory', label: 'Routes' },
    { id: 'scenario-testing', label: 'Stress Test' },
    { id: 'validation-harness', label: 'Tests' },
    { id: 'audit-report', label: 'Audit' },
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
                  v1.0
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

          {/* Right Action Buttons: Guide & Missions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Guide Button */}
            <button
              onClick={onOpenGuide}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-orange-600/10 hover:bg-orange-600/20 border border-orange-500/30 hover:border-orange-500 text-xs font-mono text-orange-300 hover:text-white transition-all shadow-sm cursor-pointer"
              title="Open MARSNAV Guide & Manual"
            >
              <BookOpen className="w-4 h-4 text-orange-400" />
              <span className="font-medium tracking-wide hidden sm:inline">Guide</span>
            </button>

            {/* Missions Drawer Trigger Button */}
            <button
              onClick={onOpenMissions}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-cyan-500/40 text-xs font-mono text-slate-200 hover:text-white transition-all shadow-sm cursor-pointer"
              title="Open Cloud Missions Log"
            >
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span className="font-medium tracking-wide">Missions</span>
            </button>

            {/* Mobile Menu Icon with responsive padding next to mission button */}
            <div className="flex lg:hidden items-center pl-1">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-colors focus:outline-none cursor-pointer"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
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
                  onOpenGuide();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/40 text-orange-300 text-xs font-mono cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-orange-400" />
                <span>MARSNAV Interactive Guide</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenMissions();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-mono cursor-pointer"
              >
                <Cloud className="w-4 h-4 text-cyan-400" />
                <span>Cloud Missions Database</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
