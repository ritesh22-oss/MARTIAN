import React, { useState } from 'react';
import { Target, Plus, CheckCircle, Clock, AlertTriangle, ShieldCheck, Database, Award, Info, Sparkles } from 'lucide-react';
import { useAstronautExploration, ScientificObjective } from '../../context/AstronautExplorationContext';

export const MissionSciencePlanner: React.FC = () => {
  const { objectives, addObjective, updateObjectiveStatus } = useAstronautExploration();

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>(objectives[0]?.id || '');

  // Form State for new objective
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Past Habitability & Aqueous History');
  const [newQuestion, setNewQuestion] = useState('');
  const [newFormation, setNewFormation] = useState('');
  const [newInstruments, setNewInstruments] = useState('SuperCam LIBS, PIXL Micro-XRF');
  const [newDatasets, setNewDatasets] = useState('HiRISE PSP_001414_1780, CRISM Mineralogy');
  const [newImportance, setNewImportance] = useState(8);
  const [newAccessibility, setNewAccessibility] = useState(8);
  const [newSafety, setNewSafety] = useState(8);
  const [newTimeHours, setNewTimeHours] = useState(3.5);
  const [newConstraints, setNewConstraints] = useState('Slope < 15°, suit power > 30%');

  // Compute Priority Score: Score = (Importance * 0.45) + (Accessibility * 0.25) + (Safety * 0.30) - (Time * 0.2)
  const computePriorityScore = (obj: ScientificObjective) => {
    const raw = (obj.importanceScore * 0.45) + (obj.accessibilityScore * 0.25) + (obj.safetyScore * 0.30) - (obj.timeRequiredHours * 0.2);
    return Math.max(1, Math.min(10, Number(raw.toFixed(1))));
  };

  // Sorted objectives by Priority Score descending
  const sortedObjectives = [...objectives].sort((a, b) => computePriorityScore(b) - computePriorityScore(a));

  const activeObj = objectives.find(o => o.id === selectedObjectiveId) || sortedObjectives[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newQuestion.trim()) return;

    const newObj: ScientificObjective = {
      id: `obj_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      question: newQuestion.trim(),
      targetFormation: newFormation.trim() || 'Unclassified Geological Outcrop',
      requiredInstruments: newInstruments.split(',').map(s => s.trim()).filter(Boolean),
      nasaDatasets: newDatasets.split(',').map(s => s.trim()).filter(Boolean),
      recommendedLocations: [{ name: 'Primary Target Coordinate', lat: 18.382, lon: 77.420 }],
      expectedValue: newImportance >= 9 ? 'Critical' : newImportance >= 7 ? 'High' : 'Moderate',
      importanceScore: newImportance,
      accessibilityScore: newAccessibility,
      safetyScore: newSafety,
      timeRequiredHours: newTimeHours,
      constraints: newConstraints.trim() || 'Standard EVA operating boundaries',
      status: 'Planned'
    };

    addObjective(newObj);
    setSelectedObjectiveId(newObj.id);
    setShowNewModal(false);
    setNewTitle('');
    setNewQuestion('');
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
              MISSION SCIENCE PLANNER
            </span>
            <span className="text-xs text-slate-400 font-mono">NASA Science Goals Matrix</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Surface Exploration Scientific Objectives</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Prioritize scientific inquiries, identify required analytical instruments, match NASA datasets, and evaluate mobility constraints before commencing surface traverses.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-lg shadow-cyan-950/40"
        >
          <Plus className="w-4 h-4" />
          <span>Add Science Objective</span>
        </button>
      </div>

      {/* Main Grid: Priority List + Detailed Objective Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Ranked List (5 cols) */}
        <div className="lg:col-span-5 bg-[#0B1021] border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Ranked Priorities ({sortedObjectives.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Ranked by Feasibility & Value</span>
          </div>

          <div className="space-y-3">
            {sortedObjectives.map((obj, idx) => {
              const priorityScore = computePriorityScore(obj);
              const isSelected = activeObj?.id === obj.id;

              return (
                <div
                  key={obj.id}
                  onClick={() => setSelectedObjectiveId(obj.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-950/20'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white line-clamp-1">{obj.title}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      Score {priorityScore}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 italic font-sans">{obj.question}</p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                    <span>Category: <strong className="text-slate-300">{obj.category}</strong></span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      obj.status === 'Achieved' ? 'bg-emerald-500/20 text-emerald-300' :
                      obj.status === 'In Progress' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {obj.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Objective Inspector (7 cols) */}
        {activeObj && (
          <div className="lg:col-span-7 bg-[#0B1021] border border-slate-800 rounded-2xl p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">{activeObj.category}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{activeObj.title}</h3>
              </div>

              {/* Status Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                {(['Planned', 'In Progress', 'Achieved'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => updateObjectiveStatus(activeObj.id, st)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      activeObj.status === st
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Scientific Question Block */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold block">Scientific Question & Inquiry</span>
              <p className="text-sm text-slate-200 leading-relaxed font-sans font-medium">{activeObj.question}</p>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Target Geological Formation</span>
                <span className="text-xs font-bold text-white block">{activeObj.targetFormation}</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Expected Scientific Value</span>
                <span className="text-xs font-bold text-amber-300 block">{activeObj.expectedValue} Priority Target</span>
              </div>
            </div>

            {/* Required Instruments & Datasets */}
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Required Analytical Instruments</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeObj.requiredInstruments.map((inst, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                      {inst}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold block flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>NASA Datasets & Catalogs</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeObj.nasaDatasets.map((ds, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                      {ds}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Priority Matrix Slider Scores */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-white">Priority Score Breakdown</span>
                <span className="text-amber-300 font-bold">Composite Rank: {computePriorityScore(activeObj)} / 10</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-[11px] font-mono">
                <div className="p-2 bg-slate-800/80 rounded-lg text-center">
                  <span className="text-slate-400 block text-[9px]">Importance</span>
                  <strong className="text-white text-sm">{activeObj.importanceScore}/10</strong>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-lg text-center">
                  <span className="text-slate-400 block text-[9px]">Accessibility</span>
                  <strong className="text-cyan-300 text-sm">{activeObj.accessibilityScore}/10</strong>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-lg text-center">
                  <span className="text-slate-400 block text-[9px]">Safety</span>
                  <strong className="text-emerald-400 text-sm">{activeObj.safetyScore}/10</strong>
                </div>
              </div>
            </div>

            {/* Constraints Note */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-mono text-[10px] uppercase block text-amber-300">Environmental & Mobility Constraints:</strong>
                <span>{activeObj.constraints}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Create New Objective */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-[#0B1021] border border-cyan-500/40 rounded-2xl p-6 max-w-xl w-full space-y-4 text-slate-100 relative">
            <h3 className="text-base font-bold text-white tracking-wide">Define New Surface Science Objective</h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Objective Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Investigate Clay-Rich Fan Sediments"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-cyan-500"
                >
                  <option value="Past Habitability & Aqueous History">Past Habitability & Aqueous History</option>
                  <option value="Resource Utilization & Subsurface Geology">Resource Utilization & Subsurface Geology</option>
                  <option value="Biosignature Preservation & Mineralogy">Biosignature Preservation & Mineralogy</option>
                  <option value="Volcanic & Impact Structural Geology">Volcanic & Impact Structural Geology</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Scientific Question</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Detail the specific scientific hypothesis or question..."
                  value={newQuestion}
                  onChange={e => setNewQuestion(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Target Geological Formation</label>
                <input
                  type="text"
                  placeholder="e.g., Delta Front Cross-Bedded Sandstone"
                  value={newFormation}
                  onChange={e => setNewFormation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-sans focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Importance (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newImportance}
                    onChange={e => setNewImportance(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">Est Time (Hours)</label>
                  <input
                    type="number"
                    step={0.5}
                    min={0.5}
                    value={newTimeHours}
                    onChange={e => setNewTimeHours(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Save Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
