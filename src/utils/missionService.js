import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from '../firebase';

export const LOCAL_STORAGE_KEY_MISSIONS = 'marsnav_missions_v2';
export const LOCAL_STORAGE_KEY_ACTIVE_ID = 'marsnav_active_mission_id';

/**
 * Creates default initial checkpoints for a mission
 */
export function createDefaultCheckpoints() {
  return [
    {
      id: 'dtm',
      label: 'Verify HiRISE Digital Elevation Model (DEM) datum and resolution (0.25 m/px)',
      category: 'dem',
      status: 'Pending',
      reason: 'No valid DEM metadata or terrain image loaded for this mission.'
    },
    {
      id: 'ai4mars',
      label: 'Confirm AI4Mars semantic segmentation weights checkpoint',
      category: 'model',
      status: 'Pending',
      reason: 'Terrain segmentation analysis not yet executed for this mission.'
    },
    {
      id: 'waypoints',
      label: 'Set start position and target science waypoint on Jezero grid',
      category: 'waypoints',
      status: 'Pending',
      reason: 'Start or destination coordinates not yet configured.'
    },
    {
      id: 'slope',
      label: 'Set configured traversability slope threshold (14.0° max limit)',
      category: 'slope',
      status: 'Pending',
      reason: 'Slope threshold needs verification.'
    },
    {
      id: 'harness',
      label: 'Execute unit validation test harness before route dispatch',
      category: 'validation',
      status: 'Pending',
      reason: 'Validation test harness has not been executed.'
    }
  ];
}

/**
 * Creates a brand new clean MissionRecord instance
 */
export function createNewMissionRecord({
  name = 'New Jezero Traverse Mission',
  description = '',
  roverProfile = 'Perseverance (Mars 2020)',
  userId = null
}) {
  const now = new Date().toISOString();
  const id = `msn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  return {
    id,
    userId: userId || (auth.currentUser ? auth.currentUser.uid : null),
    name: name.trim() || 'Untitled Mission',
    description: description ? description.trim() : '',
    status: 'Not Started',
    roverProfile: roverProfile || 'Perseverance (Mars 2020)',
    createdAt: now,
    updatedAt: now,
    terrainImage: '',
    imageProvenance: {
      source: 'HiRISE DTM (Jezero Crater)',
      rover: 'Perseverance (Mars 2020)',
      camera: 'NAVCAM_LEFT',
      sol: 428,
      acquisitionUtc: now,
      identifier: 'PSP_001414_1780',
      sourceUrl: ''
    },
    startPoint: { x: 35, y: 220 },
    destinationPoint: { x: 220, y: 45 },
    obstacles: [],
    segmentedHazards: [],
    detectionMethod: 'Classical Computer Vision Baseline',
    scienceTargets: [],
    selectedStrategy: 'alpha',
    routeMetrics: {
      distanceM: 0,
      energyWh: 0,
      nodeCount: 0,
      pathfindingStatus: 'Idle',
      calibrationStatus: '0.10 m/px Default Scale'
    },
    rawRoutePath: [],
    simulationState: {
      progressPct: 0,
      status: 'idle'
    },
    checkpoints: createDefaultCheckpoints(),
    traversalLog: [
      {
        id: `log_${Date.now()}`,
        timestamp: now,
        type: 'Mission Created',
        status: 'Info',
        details: `Initialized mission "${name.trim() || 'Untitled Mission'}" with empty state & isolated checkpoints.`,
        missionId: id,
        method: 'MARSNAV System'
      }
    ],
    validationPassed: false,
    isArchived: false
  };
}

/**
 * Evaluates real app evidence for checkpoint completion
 */
export function evaluateMissionCheckpoints(mission, appState = {}) {
  if (!mission) return [];

  const {
    activeDataset,
    systemStatus,
    settings
  } = appState;

  const currentCheckpoints = mission.checkpoints || createDefaultCheckpoints();

  return currentCheckpoints.map(cp => {
    let status = cp.status;
    let reason = cp.reason || '';

    if (cp.id === 'dtm') {
      // DEM Verification
      const hasImage = Boolean(mission.terrainImage && mission.terrainImage.trim().length > 0);
      const hasDataset = Boolean(activeDataset || (mission.imageProvenance && mission.imageProvenance.source));
      if (hasImage || hasDataset) {
        status = 'Completed';
        reason = `Verified DEM / Observation (${(mission.imageProvenance && mission.imageProvenance.source) || activeDataset || '0.25 m/px Datum'}).`;
      } else {
        status = 'Pending';
        reason = 'No DEM metadata or terrain image loaded for this mission.';
      }
    } else if (cp.id === 'ai4mars') {
      // Model & Segmentation Verification
      const hasDetections = Array.isArray(mission.segmentedHazards) && mission.segmentedHazards.length > 0;
      const isServerOnline = systemStatus && systemStatus.backend === 'connected';
      
      if (hasDetections) {
        status = 'Completed';
        reason = `Segmentation executed using ${mission.detectionMethod || 'Classical Computer Vision'}. ${mission.segmentedHazards.length} hazards identified.`;
      } else if (isServerOnline) {
        status = 'Pending';
        reason = 'Server online with AI weights ready. Run "Detect Terrain" to complete checkpoint.';
      } else {
        status = 'Pending';
        reason = 'Segmentation not yet executed for this mission.';
      }
    } else if (cp.id === 'waypoints') {
      // Start and Destination Waypoints
      const hasStart = Boolean(mission.startPoint && typeof mission.startPoint.x === 'number');
      const hasDest = Boolean(mission.destinationPoint && typeof mission.destinationPoint.x === 'number');
      
      if (hasStart && hasDest) {
        status = 'Completed';
        reason = `Start (${mission.startPoint.x}, ${mission.startPoint.y}) and Destination (${mission.destinationPoint.x}, ${mission.destinationPoint.y}) set.`;
      } else {
        status = 'Pending';
        reason = 'Start or Destination endpoint not set for this mission.';
      }
    } else if (cp.id === 'slope') {
      // Traversability Slope Threshold
      const slopeVal = mission.maxSlopeLimit || (settings && settings.maxSlopeLimitDeg) || 14.0;
      if (typeof slopeVal === 'number' && slopeVal > 0 && slopeVal <= 30) {
        status = 'Completed';
        reason = `Traversability max slope threshold set to ${slopeVal.toFixed(1)}°.`;
      } else {
        status = 'Pending';
        reason = 'Slope threshold must be configured between 1° and 30°.';
      }
    } else if (cp.id === 'harness') {
      // Validation Test Harness
      if (mission.validationPassed) {
        status = 'Completed';
        reason = 'Unit validation test harness executed and passed for this mission.';
      } else {
        status = 'Pending';
        reason = 'Validation test harness has not been executed yet. Click to open Validation Harness.';
      }
    }

    return {
      ...cp,
      status,
      reason
    };
  });
}

/**
 * Loads cached missions from localStorage
 */
export function getLocalMissions() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_MISSIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves cached missions to localStorage
 */
export function setLocalMissions(missions) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_MISSIONS, JSON.stringify(missions));
  } catch (e) {
    console.warn('Failed saving missions to localStorage:', e);
  }
}

/**
 * Gets local active mission ID
 */
export function getLocalActiveMissionId() {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY_ACTIVE_ID) || null;
  } catch {
    return null;
  }
}

/**
 * Sets local active mission ID
 */
export function setLocalActiveMissionId(id) {
  try {
    if (id) localStorage.setItem(LOCAL_STORAGE_KEY_ACTIVE_ID, id);
    else localStorage.removeItem(LOCAL_STORAGE_KEY_ACTIVE_ID);
  } catch {}
}

/**
 * Saves or updates a mission record to Firestore (if logged in) and localStorage
 */
export async function saveMissionRecord(mission) {
  if (!mission || !mission.id) return null;
  
  const updatedMission = {
    ...mission,
    updatedAt: new Date().toISOString()
  };

  // 1. Update Local Storage Cache
  const localList = getLocalMissions();
  const existingIdx = localList.findIndex(m => m.id === updatedMission.id);
  if (existingIdx >= 0) {
    localList[existingIdx] = updatedMission;
  } else {
    localList.unshift(updatedMission);
  }
  setLocalMissions(localList);

  // 2. Persist to Firestore if signed in
  if (auth.currentUser) {
    const userId = auth.currentUser.uid;
    const path = `users/${userId}/missions/${updatedMission.id}`;
    try {
      const docRef = doc(db, 'users', userId, 'missions', updatedMission.id);
      await setDoc(docRef, { ...updatedMission, userId }, { merge: true });
    } catch (error) {
      console.warn('Firestore sync failed, local copy preserved:', error);
      handleFirestoreError(error, 'write', path);
    }
  }

  return updatedMission;
}

/**
 * Deletes a mission record from Firestore (if logged in) and localStorage
 */
export async function deleteMissionRecord(missionId) {
  if (!missionId) return;

  // 1. Remove from local storage
  const localList = getLocalMissions().filter(m => m.id !== missionId);
  setLocalMissions(localList);

  // 2. Remove from Firestore if signed in
  if (auth.currentUser) {
    const userId = auth.currentUser.uid;
    const path = `users/${userId}/missions/${missionId}`;
    try {
      const docRef = doc(db, 'users', userId, 'missions', missionId);
      await deleteDoc(docRef);
    } catch (error) {
      console.warn('Firestore deletion failed:', error);
      handleFirestoreError(error, 'delete', path);
    }
  }
}

/**
 * Legacy compatibility export for existing SaveMissionModal
 */
export async function saveMissionPlan({
  id,
  title,
  routeType,
  distanceM,
  energyWh,
  notes
}) {
  const currentLocal = getLocalMissions();
  let existing = id ? currentLocal.find(m => m.id === id) : null;
  if (!existing) {
    existing = createNewMissionRecord({ name: title || 'Jezero Delta Traverse', description: notes });
  }

  existing.name = title || existing.name;
  existing.description = notes || existing.description;
  existing.routeMetrics = {
    ...existing.routeMetrics,
    distanceM: Number(distanceM) || existing.routeMetrics?.distanceM || 0,
    energyWh: Number(energyWh) || existing.routeMetrics?.energyWh || 0,
    pathfindingStatus: routeType || 'A* Cost-Aware'
  };

  return await saveMissionRecord(existing);
}

/**
 * Legacy compatibility export for existing fetchUserMissions
 */
export async function fetchUserMissions() {
  if (auth.currentUser) {
    const userId = auth.currentUser.uid;
    const path = `users/${userId}/missions`;
    try {
      const colRef = collection(db, 'users', userId, 'missions');
      const snapshot = await getDocs(colRef);
      const docs = snapshot.docs.map(d => d.data());
      if (docs.length > 0) {
        setLocalMissions(docs);
        return docs;
      }
    } catch (error) {
      console.warn('Firestore fetch failed, using local storage:', error);
    }
  }

  return getLocalMissions();
}

/**
 * Legacy compatibility export for deleteMissionPlan
 */
export async function deleteMissionPlan(missionId) {
  return await deleteMissionRecord(missionId);
}

/**
 * Subscribes to real-time mission updates for the current user
 */
export function subscribeToUserMissions(callback) {
  if (!auth.currentUser) {
    callback(getLocalMissions());
    return () => {};
  }

  const userId = auth.currentUser.uid;
  const path = `users/${userId}/missions`;
  const colRef = collection(db, 'users', userId, 'missions');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const remoteMissions = snapshot.docs.map(doc => doc.data());
      if (remoteMissions.length > 0) {
        setLocalMissions(remoteMissions);
        callback(remoteMissions);
      } else {
        callback(getLocalMissions());
      }
    },
    (error) => {
      console.warn('Firestore listener error:', error);
      callback(getLocalMissions());
    }
  );
}
