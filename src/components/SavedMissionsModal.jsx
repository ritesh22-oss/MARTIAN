import React, { useState, useEffect } from 'react';
import { X, Cloud, Trash2, Rocket, Compass, Calendar, Zap, AlertCircle, CheckCircle2, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserMissions, deleteMissionPlan } from '../utils/missionService';

export default function SavedMissionsModal({ isOpen, onClose }) {
  const { user, login } = useAuth();
  const [missions, setMissions] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!isOpen || !user) {
      setMissions([]);
      return;
    }

    const unsubscribe = subscribeToUserMissions((data) => {
      // Sort newest first
      const sorted = [...data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMissions(sorted);
    });

    return () => unsubscribe();
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await deleteMissionPlan(id);
      setNotification('Mission removed from cloud storage.');
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error(err);
      setNotification('Failed to delete mission.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0B1020] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-orange-950/40 to-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Cloud className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">Cloud Mission Database</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  Firestore Active
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Persistent rover traverse plans & telemetry logs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification banner */}
        {notification && (
          <div className="px-6 py-2 bg-orange-500/20 border-b border-orange-500/30 text-orange-300 text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!user ? (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <LogIn className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-semibold text-white">Authentication Required</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Sign in with Google to access your persistent rover navigation logs stored in Cloud Firestore.
                </p>
              </div>
              <button
                onClick={login}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-medium text-xs tracking-wider uppercase shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : missions.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                <Rocket className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">No Saved Missions Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Calculate an optimal route in the 3D Martian Map or Route Planner, then click "Save Mission" to persist it in Firestore.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pb-1">
                <span>Total Plans: {missions.length}</span>
                <span className="text-emerald-400">Synced to Firebase</span>
              </div>
              {missions.map((m) => (
                <div
                  key={m.id}
                  className="bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl p-4 transition-all duration-200 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                        <span>{m.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/30 text-orange-300 font-normal">
                          {m.routeType || 'Traverse'}
                        </span>
                      </h4>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono mt-1">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span>•</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deletingId === m.id}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Delete Mission"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {m.notes && (
                    <p className="text-xs text-slate-300 bg-black/30 p-2.5 rounded-lg border border-white/5 font-mono">
                      {m.notes}
                    </p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px] font-mono">
                    <div className="bg-white/[0.02] p-2 rounded-lg">
                      <span className="text-slate-500 block text-[9px] uppercase">Distance</span>
                      <span className="text-orange-400 font-bold">{m.distanceM} m</span>
                    </div>
                    <div className="bg-white/[0.02] p-2 rounded-lg">
                      <span className="text-slate-500 block text-[9px] uppercase">Est. Energy</span>
                      <span className="text-amber-400 font-bold">{m.energyWh} Wh</span>
                    </div>
                    <div className="bg-white/[0.02] p-2 rounded-lg col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block text-[9px] uppercase">Storage</span>
                      <span className="text-emerald-400 font-bold">Cloud Sync</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#070b16] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Target: Jezero Crater Datum (MOLA)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
