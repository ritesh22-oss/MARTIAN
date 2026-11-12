import React, { useState } from 'react';
import { Target, MapPin, CheckCircle2, FileText, Image as ImageIcon, Plus, Check, X, Tag } from 'lucide-react';
import { useAstronautExploration, GeologicalTarget } from '../../context/AstronautExplorationContext';

export const GeologicalTargetExplorer: React.FC = () => {
  const { geologicalTargets, updateTargetStatus, addTargetNote } = useAstronautExploration();
  const [selectedTargetId, setSelectedTargetId] = useState<string>(geologicalTargets[0]?.id || '');
  const [noteText, setNoteText] = useState('');

  const activeTarget = geologicalTargets.find(t => t.id === selectedTargetId) || geologicalTargets[0];

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || !activeTarget) return;
    addTargetNote(activeTarget.id, noteText.trim());
    setNoteText('');
  };

  const statuses: GeologicalTarget['status'][] = [
    'Not Investigated',
    'Planned',
    'In Progress',
    'Sample Collected',
    'Completed',
    'Rejected'
  ];

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Header Banner */}
      <div className="bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              GEOLOGICAL TARGET EXPLORER
            </span>
            <span className="text-xs text-slate-400 font-mono">Sample Cask & Outcrop Catalog</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Surface Scientific Target Identification</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Inspect sedimentary rock formations, deltaic siltstones, boxwork vein networks, crater floor impact breccias, and manage sample collection status.
          </p>
        </div>

        {/* Target Count Summary */}
        <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
          <Target className="w-4 h-4 text-emerald-400" />
          <span>Cataloged: <strong className="text-white font-bold">{geologicalTargets.length} Outcrops</strong></span>
        </div>
      </div>

      {/* Main Grid: Target List (5 cols) + Target Detail Card (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Target Cards List */}
        <div className="lg:col-span-5 bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Identified Targets Queue ({geologicalTargets.length})
            </h3>
          </div>

          <div className="space-y-3">
            {geologicalTargets.map((tgt) => {
              const isSelected = tgt.id === activeTarget?.id;

              return (
                <div
                  key={tgt.id}
                  onClick={() => setSelectedTargetId(tgt.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-950/20'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-white">{tgt.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                      tgt.status === 'Sample Collected' || tgt.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      tgt.status === 'In Progress' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                      tgt.status === 'Planned' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      tgt.status === 'Rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {tgt.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 font-sans line-clamp-1">{tgt.classification}</p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                    <span>Coords: <strong className="text-slate-200">{tgt.lat}°N, {tgt.lon}°E</strong></span>
                    <span className="text-emerald-400 font-bold">Confidence {tgt.confidencePct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Target Inspector */}
        {activeTarget && (
          <div className="lg:col-span-7 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">{activeTarget.id}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{activeTarget.name}</h3>
              </div>

              {/* Coordinates Badge */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                <span>{activeTarget.lat}°N, {activeTarget.lon}°E</span>
              </div>
            </div>

            {/* Target Image Preview Frame */}
            <div className="h-48 rounded-xl overflow-hidden relative border border-slate-800 bg-slate-950">
              <img
                src={activeTarget.supportingImage}
                alt={activeTarget.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-slate-300">
                Source: {activeTarget.dataSource} · Instrument: {activeTarget.instrument}
              </div>
            </div>

            {/* Status Change Selector Buttons */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Update Target Exploration Status</span>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map(s => (
                  <button
                    key={s}
                    onClick={() => updateTargetStatus(activeTarget.id, s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      activeTarget.status === s
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Description & Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Geological Relevance</span>
                <p className="text-xs text-slate-200 font-sans">{activeTarget.relevance}</p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Recommended Investigation Method</span>
                <p className="text-xs text-slate-200 font-sans">{activeTarget.recommendedMethod}</p>
              </div>
            </div>

            {/* Field Notes & Observations List */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold block flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Field Astronaut Observations & Notes ({activeTarget.notes.length})</span>
              </span>

              {activeTarget.notes.length === 0 ? (
                <p className="text-xs text-slate-500 italic font-mono">No field notes recorded for this target yet.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-300 font-sans list-disc list-inside">
                  {activeTarget.notes.map((n, i) => (
                    <li key={i} className="bg-slate-900 p-2 rounded-lg border border-slate-800">{n}</li>
                  ))}
                </ul>
              )}

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add astronaut observation..."
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Add Note
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
