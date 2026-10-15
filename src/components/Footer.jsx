import React from 'react';
import { Compass, Rocket, ShieldCheck, Github, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#03050a] border-t border-white/10 pt-16 pb-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-600 to-red-700 flex items-center justify-center shadow-lg shadow-orange-600/30 border border-orange-400/30">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold tracking-wider text-lg bg-gradient-to-r from-white via-orange-100 to-orange-400 bg-clip-text text-transparent">
                MARSNAV
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Cinematic Mars mission control platform featuring AI terrain intelligence, 3D HiRISE elevation models, and A* pathfinding.
            </p>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">Navigation</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><a href="#overview" className="hover:text-orange-400 transition-colors">Mission Overview</a></li>
              <li><a href="#terrain-3d" className="hover:text-orange-400 transition-colors">3D DEM Terrain</a></li>
              <li><a href="#terrain-ai" className="hover:text-orange-400 transition-colors">Terrain AI Lab</a></li>
              <li><a href="#route-planner" className="hover:text-orange-400 transition-colors">Route Planner</a></li>
            </ul>
          </div>

          {/* Research & Data */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">Resources & Disclaimer</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Experimental research prototype developed for educational and mission planning simulation. Built with React, Three.js, and Tailwind CSS.
            </p>
            <div className="flex items-center space-x-2 text-xs font-mono text-orange-400 pt-2">
              <ShieldCheck className="w-4 h-4" />
              <span>NASA AI4Mars Open Science Compliant</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
          <p>© 2026 MarsNav Systems • All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 cursor-pointer">Telemetry Feed</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
