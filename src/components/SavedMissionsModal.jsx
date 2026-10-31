import React, { useState } from 'react';
import {
  X,
  Cloud,
  Trash2,
  Rocket,
  Calendar,
  Zap,
  CheckCircle2,
  LogIn,
  Plus,
  Edit2,
  Archive,
  Play,
  CheckSquare,
  HardDrive,
  Database,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';

export default function SavedMissionsModal({ isOpen, onClose }) {
  const { user, login } = useAuth();
  const {
    missions,
    activeMissionId,
    createNewMission,
    switchActiveMission,
    deleteMission,
    renameMission,
    archiveMission,
    missionManagerOpen,
    setMissionManagerOpen
  } = useWorkspace();

  const isModalVisible = isOpen || missionManagerOpen;

  const [isCreating, setIsCreating] = useState(false);
  const [newMissionName, setNewMissionName] = useState('');
  const [newMissionDesc, setNewMissionDesc] = useState('');
  const [newRoverProfile, setNewRoverProfile] = useState('Perseverance (Mars 2020)');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  React.useEffect(() => {
    if (!isModalVisible) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalVisible]);

  if (!isModalVisible) return null;

  const handleClose = () => {
    setIsCreating(false);
    setEditingId(null);
    setConfirmDeleteId(null);
    if (onClose) onClose();
    setMissionManagerOpen(false);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newMissionName.trim()) return;
    await createNewMission({
      name: newMissionName.trim(),
      description: newMissionDesc.trim(),
      roverProfile: newRoverProfile
    });
    setNewMissionName('');
    setNewMissionDesc('');
    setIsCreating(false);
  };

  const handleSaveRename = async (id) => {
    if (editingName.trim()) {
      await renameMission(id, editingName.trim());
    }
    setEditingId(null);
  };

  const handleConfirmDelete = async (id) => {
    await deleteMission(id);
    setConfirmDeleteId(null);
  };

  const filteredMissions = (missions || []).filter(m => showArchived ? m.isArchived : !m.isArchived);

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-[#0B1020] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">MARSNAV Mission Workspace Manager</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1 border ${
                  user ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {user ? <Database className="w-3 h-3 text-emerald-400" /> : <HardDrive className="w-3 h-3 text-amber-400" />}
                  <span>{user ? 'Cloud Firestore Persistent' : 'Local Storage Workspace'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Manage mission state, checkpoint telemetry, hazard masks & traversal logs
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Mission</span>
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Create Mission Form Panel */}
        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="p-6 bg-slate-900/90 border-b border-cyan-500/30 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-cyan-300 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Create New Jezero Traverse Mission</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Mission Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sol 430 Belva Crater Rim Traverse"
                  value={newMissionName}
                  onChange={(e) => setNewMissionName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Rover Profile</label>
                <select
                  value={newRoverProfile}
                  onChange={(e) => setNewRoverProfile(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 font-sans"
                >
                  <option value="Perseverance (Mars 2020)">Perseverance (Mars 2020) — 1,025 kg</option>
                  <option value="Curiosity (MSL)">Curiosity (MSL) — 899 kg</option>
                  <option value="Sample Retrieval Rover (SRR)">Sample Retrieval Rover (SRR) — 450 kg</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-slate-300 font-semibold block">Mission Scope &amp; Objectives (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Conduct spectrographic analysis of delta front clay deposits..."
                  value={newMissionDesc}
                  onChange={(e) => setNewMissionDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 font-sans resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-lg transition-colors cursor-pointer"
              >
                Initialize Isolated Mission Workspace
              </button>
            </div>
          </form>
        )}

        {/* Mission List Controls Bar */}
        <div className="px-6 py-2.5 bg-slate-950 border-b border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center space-x-4">
            <span>Total Missions: {missions.length}</span>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`hover:text-cyan-300 transition-colors ${showArchived ? 'text-cyan-400 underline font-semibold' : ''}`}
            >
              {showArchived ? 'Showing Archived Missions' : 'View Archived'}
            </button>
          </div>
          {!user && (
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 text-[11px]">Sign in to sync across devices:</span>
              <button
                onClick={login}
                className="px-2.5 py-1 rounded-lg bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500/40 text-orange-200 text-[11px] font-sans flex items-center space-x-1"
              >
                <LogIn className="w-3 h-3" />
                <span>Google Sign In</span>
              </button>
            </div>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredMissions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Rocket className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-slate-400 text-sm">No {showArchived ? 'archived' : 'active'} missions found.</p>
              {!showArchived && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500 transition-colors"
                >
                  Create First Mission
                </button>
              )}
            </div>
          ) : (
            filteredMissions.map((m) => {
              const isActive = m.id === activeMissionId;
              const checkpointsList = m.checkpoints || [];
              const completedCount = checkpointsList.filter(c => c.status === 'Completed').length;
              const isEditing = editingId === m.id;

              return (
                <div
                  key={m.id}
                  className={`border rounded-2xl p-5 transition-all duration-200 space-y-4 relative ${
                    isActive
                      ? 'bg-cyan-950/20 border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/30'
                      : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/10'
                  }`}
                >
                  {/* Top Header Row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2.5">
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                            Active Workspace
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                          m.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                          m.status === 'Blocked' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                          m.status === 'In Progress' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                          'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {m.status || 'Not Started'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{m.roverProfile || 'Perseverance'}</span>
                      </div>

                      {isEditing ? (
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-3 py-1 rounded bg-black border border-cyan-400 text-white text-sm font-bold flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(m.id)}
                            className="px-3 py-1 rounded bg-cyan-600 text-white text-xs"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <h4 className="text-base font-bold text-white tracking-wide mt-1.5 flex items-center space-x-2 group">
                          <span>{m.name}</span>
                          <button
                            onClick={() => {
                              setEditingId(m.id);
                              setEditingName(m.name);
                            }}
                            className="text-slate-500 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Rename Mission"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </h4>
                      )}

                      {m.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.description}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => {
                            switchActiveMission(m.id);
                            handleClose();
                          }}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600 border border-cyan-500/50 text-cyan-200 hover:text-white text-xs font-medium transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Open Mission</span>
                        </button>
                      )}

                      <button
                        onClick={() => archiveMission(m.id, !m.isArchived)}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title={m.isArchived ? 'Unarchive Mission' : 'Archive Mission'}
                      >
                        <Archive className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setConfirmDeleteId(m.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Mission"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Confirm Delete Banner */}
                  {confirmDeleteId === m.id && (
                    <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl flex items-center justify-between text-xs text-rose-200 animate-fade-in">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Are you sure you want to permanently delete this mission?</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleConfirmDelete(m.id)}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Metrics & Checkpoint Progress Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Checkpoints</span>
                      <span className="text-cyan-300 font-bold">{completedCount} / {checkpointsList.length} Passed</span>
                    </div>

                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Start &rarr; Dest</span>
                      <span className="text-slate-300 font-medium">
                        ({m.startPoint?.x || 35}, {m.startPoint?.y || 220}) &rarr; ({m.destinationPoint?.x || 220}, {m.destinationPoint?.y || 45})
                      </span>
                    </div>

                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Strategy &amp; Hazards</span>
                      <span className="text-orange-300 font-medium">
                        {(m.selectedStrategy || 'alpha').toUpperCase()} strategy · {Array.isArray(m.segmentedHazards) ? m.segmentedHazards.length : 0} hazards
                      </span>
                    </div>

                    <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Last Activity</span>
                      <span className="text-slate-400 text-[11px]">
                        {m.updatedAt ? new Date(m.updatedAt).toLocaleDateString() + ' ' + new Date(m.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#070b16] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Active Datum: {activeMissionId || 'None'}</span>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer"
          >
            Close Manager
          </button>
        </div>

      </div>
    </div>
  );
}
