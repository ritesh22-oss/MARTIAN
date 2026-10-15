import React from 'react';
import { X, MapPin, Compass, ShieldCheck, ExternalLink, Bookmark, CheckCircle2 } from 'lucide-react';

export default function SciencePOIModal({ poi, onClose }) {
  if (!poi) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-lg w-full bg-[#0B1020] border border-orange-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          aria-label="Close POI modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold border border-orange-500/40">
                Science Target
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                {poi.category}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">{poi.name}</h3>
          </div>
        </div>

        {/* Coordinates & Physical Metadata */}
        <div className="grid grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-slate-500 block text-[10px] uppercase">Planetocentric Lat</span>
            <span className="text-white font-bold">{poi.lat}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-slate-500 block text-[10px] uppercase">East Longitude</span>
            <span className="text-white font-bold">{poi.lon}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-slate-500 block text-[10px] uppercase">MOLA Elevation</span>
            <span className="text-cyan-400 font-bold">{poi.elevationM} m</span>
          </div>
        </div>

        {/* Geological Context */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase text-slate-400 block font-bold">Geological Context:</span>
          <p className="text-sm text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
            {poi.geology}
          </p>
        </div>

        {/* Scientific Goals */}
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase text-slate-400 block font-bold">Investigation Objective:</span>
          <p className="text-sm text-slate-300 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
            {poi.scienceGoal}
          </p>
        </div>

        {/* Source Verification */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{poi.verifiedBy}</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold uppercase tracking-wider text-xs shadow-md shadow-orange-600/30"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
