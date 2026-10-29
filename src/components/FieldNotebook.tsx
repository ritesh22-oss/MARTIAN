import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  Download,
  Upload,
  MapPin,
  Tag,
  Calendar,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Info,
  X,
  Check
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export interface FieldNote {
  id: string;
  title: string;
  description: string;
  category: 'Geology' | 'Ice/Water' | 'Hazard' | 'Operations' | 'Biosignature' | 'Sample Target';
  priority: 'High' | 'Medium' | 'Low';
  x: number; // 0-256 canvas normalized or percent
  y: number; // 0-256 canvas normalized or percent
  imageUrl: string;
  createdAt: string;
  tags: string[];
}

const CATEGORIES = [
  'ALL',
  'Geology',
  'Ice/Water',
  'Hazard',
  'Operations',
  'Biosignature',
  'Sample Target'
];

import {
  getSavedNotes,
  saveNote,
  deleteNote,
  clearAllNotes,
  SavedNote
} from '../services/notesAndMeasurementsStorage';

export default function FieldNotebook() {
  const { sharedSession, updateSharedSession, setActiveWorkspace } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  const [notes, setNotes] = useState<SavedNote[]>(() => getSavedNotes());

  useEffect(() => {
    const handleUpdate = () => {
      setNotes(getSavedNotes());
    };
    window.addEventListener('marsnav_notes_updated', handleUpdate);
    return () => {
      window.removeEventListener('marsnav_notes_updated', handleUpdate);
    };
  }, []);

  const [editingNote, setEditingNote] = useState<SavedNote | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDesc, setFormDesc] = useState<string>('');
  const [formCategory, setFormCategory] = useState<SavedNote['category']>('Geology');
  const [formPriority, setFormPriority] = useState<SavedNote['priority']>('Medium');
  const [formTags, setFormTags] = useState<string>('Observation, Mars');

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.tags && n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesCategory = selectedCategory === 'ALL' || n.category === selectedCategory;
    const matchesPriority = selectedPriority === 'ALL' || n.priority === selectedPriority;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const handleOpenCreate = () => {
    setFormTitle('');
    setFormDesc('');
    setFormCategory('Geology');
    setFormPriority('Medium');
    setFormTags('Surface, Delta');
    setIsCreating(true);
    setEditingNote(null);
  };

  const handleSaveNote = () => {
    if (!formTitle.trim()) return;

    const tagArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingNote) {
      saveNote({
        ...editingNote,
        title: formTitle,
        description: formDesc,
        category: formCategory,
        priority: formPriority,
        tags: tagArray
      });
    } else {
      saveNote({
        id: `note_${Date.now()}`,
        title: formTitle,
        description: formDesc,
        category: formCategory,
        priority: formPriority,
        x: 128,
        y: 128,
        imageUrl: sharedSession.terrainImage || '/assets/aistudio/vis_0_f6a9756b.png',
        createdAt: new Date().toISOString(),
        tags: tagArray
      });
    }

    setIsCreating(false);
    setEditingNote(null);
  };

  const handleDeleteNote = (id: string) => {
    deleteNote(id);
  };

  const handleRestoreOnMap = (note: SavedNote) => {
    updateSharedSession({
      terrainImage: note.imageUrl,
    });
    // Broadcast focus target event to workspace
    window.dispatchEvent(new CustomEvent('marsnav_locate_note', {
      detail: { noteId: note.id, x: note.x, y: note.y }
    }));
    setActiveWorkspace('marsnav-v4');
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `MARSNAV_FieldNotes_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          setNotes(imported);
        }
      } catch (err) {
        alert('Invalid JSON field notebook format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 lg:p-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-[#090D1A] border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex items-center space-x-2 text-orange-400 text-xs font-mono uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Spatial Field Notebook & Geological Journal</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Mars Surface Traverse Field Notes ({notes.length})
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
            Georeferenced spatial annotations, rock sampling observations, and hazard telemetry notes recorded directly on Martian terrain imagery.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <label className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" /> Import JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            onClick={handleExportJSON}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold tracking-wide flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Field Note
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 bg-[#080B16] border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, observations, or tags..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs font-mono text-slate-400">Category:</span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-black font-bold shadow-md'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid / Editor Modal */}
      {isCreating || editingNote ? (
        <div className="bg-[#080B16] border border-slate-800 rounded-2xl p-6 space-y-4 max-w-2xl mx-auto shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">
              {editingNote ? 'Edit Field Note' : 'Create Spatial Field Note'}
            </h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingNote(null);
              }}
              className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Title:</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Scarp Basalt Boundary Contact"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Category:</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="Geology">Geology</option>
                  <option value="Ice/Water">Ice/Water</option>
                  <option value="Hazard">Hazard</option>
                  <option value="Operations">Operations</option>
                  <option value="Biosignature">Biosignature</option>
                  <option value="Sample Target">Sample Target</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Priority:</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Observations / Telemetry Notes:</label>
              <textarea
                rows={4}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Detailed scientific observations, rock texture, slope angle, or sampling notes..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Tags (comma separated):</label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="Clay, Scarp, Sample"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingNote(null);
                }}
                className="px-4 py-2 bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-mono cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note, idx) => (
            <div
              key={note.id}
              className="bg-[#080B16] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all shadow-md group relative flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800">
                    #{idx + 1} {note.category}
                  </span>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      note.priority === 'High'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : note.priority === 'Medium'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {note.priority}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                  {note.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {note.description}
                </p>

                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {note.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {note.createdAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-orange-400" /> ({note.x}, {note.y})
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingNote(note);
                        setFormTitle(note.title);
                        setFormDesc(note.description);
                        setFormCategory(note.category);
                        setFormPriority(note.priority);
                        setFormTags(note.tags.join(', '));
                      }}
                      className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      title="Edit Note"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 rounded bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleRestoreOnMap(note)}
                    className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/40 text-orange-300 border border-orange-500/40 rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    View Map <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
