import { auth, db } from '../firebase';

export interface SavedNote {
  id: string;
  title: string;
  description: string;
  category: 'Geology' | 'Ice/Water' | 'Hazard' | 'Operations' | 'Biosignature' | 'Sample Target' | 'Base Site' | 'Surface Feature' | 'Regolith' | 'General';
  priority: 'High' | 'Medium' | 'Low';
  x: number; // 0-256 canvas normalized coordinate
  y: number; // 0-256 canvas normalized coordinate
  imageUrl: string;
  imageIdentifier?: string;
  createdAt: string;
  updatedAt?: string;
  tags: string[];
  pinNumber?: number;
}

export interface SavedMeasurement {
  id: string;
  name: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distPx: number;
  isPhysicalCalibrated: boolean;
  physicalDistM: number | null;
  imageUrl: string;
  imageIdentifier?: string;
  createdAt: string;
  visible: boolean;
}

const NOTES_KEY = 'marsnav_saved_field_notes';
const MEASUREMENTS_KEY = 'marsnav_saved_measurements';

// Initial default seed notes if empty
const INITIAL_NOTES: SavedNote[] = [
  {
    id: 'note_1',
    title: 'Western Delta Clay Strata Exposure',
    description: 'Laminated fine-grained smectite clay beds identified in scarp face. High probability of preserved organic carbon.',
    category: 'Biosignature',
    priority: 'High',
    x: 128,
    y: 95,
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24424/PIA24424~orig.jpg',
    imageIdentifier: 'PSP_001414_1780',
    createdAt: new Date().toISOString(),
    tags: ['Smectite', 'Delta Scarp', 'Sample Target'],
    pinNumber: 1
  },
  {
    id: 'note_2',
    title: 'Basaltic Regolith Scree Hazard',
    description: 'Unconsolidated angular basalt rocks with wheel slip potential > 18%. Recommend +12° steering offset.',
    category: 'Hazard',
    priority: 'Medium',
    x: 88,
    y: 142,
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24424/PIA24424~orig.jpg',
    imageIdentifier: 'PSP_001414_1780',
    createdAt: new Date().toISOString(),
    tags: ['Basalt', 'Wheel Slip', 'Terrain Hazard'],
    pinNumber: 2
  },
  {
    id: 'note_3',
    title: 'Potential Shallow Sheet Ice Deposit',
    description: 'Thermal inertia anomaly aligns with SHARAD radar reflection layer at ~1.4m depth.',
    category: 'Ice/Water',
    priority: 'High',
    x: 180,
    y: 70,
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24424/PIA24424~orig.jpg',
    imageIdentifier: 'PSP_001414_1780',
    createdAt: new Date().toISOString(),
    tags: ['Radar Anomaly', 'ISRU Water', 'SHARAD'],
    pinNumber: 3
  }
];

const INITIAL_MEASUREMENTS: SavedMeasurement[] = [
  {
    id: 'meas_1',
    name: 'Scarp Slope Width Vector',
    startX: 110,
    startY: 90,
    endX: 146,
    endY: 100,
    distPx: 37,
    isPhysicalCalibrated: true,
    physicalDistM: 3.7,
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24424/PIA24424~orig.jpg',
    imageIdentifier: 'PSP_001414_1780',
    createdAt: new Date().toISOString(),
    visible: true
  }
];

// Helper to broadcast custom window events for sync across components
const dispatchNotesUpdate = () => {
  window.dispatchEvent(new Event('marsnav_notes_updated'));
};

const dispatchMeasurementsUpdate = () => {
  window.dispatchEvent(new Event('marsnav_measurements_updated'));
};

// NOTES STORAGE METHODS
export function getSavedNotes(): SavedNote[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) {
      localStorage.setItem(NOTES_KEY, JSON.stringify(INITIAL_NOTES));
      return INITIAL_NOTES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_NOTES;
  } catch (err) {
    console.warn('Error reading saved field notes:', err);
    return INITIAL_NOTES;
  }
}

export function saveNote(note: Omit<SavedNote, 'createdAt'> & { createdAt?: string }): SavedNote {
  const current = getSavedNotes();
  const now = new Date().toISOString();
  const existingIdx = current.findIndex(n => n.id === note.id);

  let updatedNote: SavedNote;

  if (existingIdx >= 0) {
    updatedNote = {
      ...current[existingIdx],
      ...note,
      updatedAt: now,
      createdAt: current[existingIdx].createdAt || now
    };
    current[existingIdx] = updatedNote;
  } else {
    updatedNote = {
      ...note,
      createdAt: note.createdAt || now,
      pinNumber: current.length + 1
    } as SavedNote;
    current.push(updatedNote);
  }

  localStorage.setItem(NOTES_KEY, JSON.stringify(current));
  dispatchNotesUpdate();
  return updatedNote;
}

export function deleteNote(id: string): void {
  const current = getSavedNotes().filter(n => n.id !== id);
  localStorage.setItem(NOTES_KEY, JSON.stringify(current));
  dispatchNotesUpdate();
}

export function clearAllNotes(): void {
  localStorage.setItem(NOTES_KEY, JSON.stringify([]));
  dispatchNotesUpdate();
}

// MEASUREMENTS STORAGE METHODS
export function getSavedMeasurements(): SavedMeasurement[] {
  try {
    const raw = localStorage.getItem(MEASUREMENTS_KEY);
    if (!raw) {
      localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(INITIAL_MEASUREMENTS));
      return INITIAL_MEASUREMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_MEASUREMENTS;
  } catch (err) {
    console.warn('Error reading saved measurements:', err);
    return INITIAL_MEASUREMENTS;
  }
}

export function saveMeasurement(meas: Omit<SavedMeasurement, 'createdAt'> & { createdAt?: string }): SavedMeasurement {
  const current = getSavedMeasurements();
  const now = new Date().toISOString();
  const existingIdx = current.findIndex(m => m.id === meas.id);

  let updatedMeas: SavedMeasurement;

  if (existingIdx >= 0) {
    updatedMeas = {
      ...current[existingIdx],
      ...meas,
      createdAt: current[existingIdx].createdAt || now
    };
    current[existingIdx] = updatedMeas;
  } else {
    updatedMeas = {
      ...meas,
      createdAt: meas.createdAt || now,
      visible: meas.visible !== undefined ? meas.visible : true
    } as SavedMeasurement;
    current.push(updatedMeas);
  }

  localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(current));
  dispatchMeasurementsUpdate();
  return updatedMeas;
}

export function toggleMeasurementVisibility(id: string): void {
  const current = getSavedMeasurements();
  const updated = current.map(m => m.id === id ? { ...m, visible: !m.visible } : m);
  localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(updated));
  dispatchMeasurementsUpdate();
}

export function deleteMeasurement(id: string): void {
  const current = getSavedMeasurements().filter(m => m.id !== id);
  localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(current));
  dispatchMeasurementsUpdate();
}

export function clearAllMeasurements(): void {
  localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify([]));
  dispatchMeasurementsUpdate();
}
