import React, { useState } from 'react';
import { X, Cloud, CheckCircle2, AlertCircle, Save, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { saveMissionPlan } from '../utils/missionService';

export default function SaveMissionModal({
  isOpen,
  onClose,
  initialData = {
    title: 'Jezero Delta Traverse',
    routeType: 'Energy Efficient (A*)',
    distanceM: 1240,
    energyWh: 430,
    notes: 'Multi-objective traverse avoiding slopes > 15° and loose sand ripples.'
  },
  onSuccess
}) {
  const { user, login } = useAuth();
  const [title, setTitle] = useState(initialData.title || '');
  const [routeType, setRouteType] = useState(initialData.routeType || 'Energy-Optimized');
  const [notes, setNotes] = useState(initialData.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setError(null);

    try {
      await saveMissionPlan({
        id: `mission_${Date.now()}`,
        title: title.trim() || 'Untitled Mars Traverse',
        routeType,
        distanceM: Number(initialData.distanceM) || 1000,
        energyWh: Number(initialData.energyWh) || 350,
        notes: notes.trim()
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to persist mission to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0B1020] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-orange-950/40 to-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Save Mission to Firestore
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Persist trajectory telemetry in Google Cloud Firestore
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

        {/* Body */}
        <div className="p-6">
          {!user ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <LogIn className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">Sign In to Save Mission</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Google authentication secures your rover exploration plans in your personal Cloud Firestore database.
                </p>
              </div>
              <button
                type="button"
                onClick={login}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-medium text-xs tracking-wider uppercase shadow-lg shadow-orange-600/30 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign in with Google</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 text-xs font-mono">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mission successfully stored in Firestore!</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-300 block font-semibold">Mission Title</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Jezero Delta Fan Exploration"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-orange-500 font-sans text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 block font-semibold">Route Profile</label>
                  <input
                    type="text"
                    value={routeType}
                    onChange={(e) => setRouteType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-orange-500 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 block font-semibold">Distance / Energy</label>
                  <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-slate-300 text-xs flex justify-between">
                    <span>{initialData.distanceM || 0} m</span>
                    <span className="text-orange-400 font-bold">{initialData.energyWh || 0} Wh</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 block font-semibold">Scientific & Operational Notes</label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key geological targets, slope constraints, battery allocation..."
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-orange-500 font-sans text-xs resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || success}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-medium shadow-lg shadow-orange-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Confirm & Save'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
