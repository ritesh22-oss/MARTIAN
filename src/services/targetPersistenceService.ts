import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  isFirestoreQuotaExceeded
} from '../firebase';

export type TargetLifecycleStatus =
  | 'DETECTED'
  | 'Not Investigated'
  | 'Planned'
  | 'In Progress'
  | 'Sample Collected'
  | 'Completed'
  | 'Rejected';

export interface PersistedTargetObservation {
  id: string;
  imageKey: string;
  imageName: string;
  targetId: string;
  regionId: string;
  targetName: string;
  status: TargetLifecycleStatus;
  notes: string[];
  createdAt: string;
  updatedAt: string;
  syncState: 'firestore' | 'local_guest' | 'local_pending_sync';
}

const LOCAL_STORAGE_KEY = 'marsnav_geotarget_observations_v1';

function sanitizeDocToken(raw: string, maxLen: number): string {
  const cleaned = String(raw || 'unknown')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');
  return (cleaned || 'unknown').slice(0, maxLen);
}

export function makeTargetObservationDocId(imageKey: string, regionId: string): string {
  const safeImg = sanitizeDocToken(imageKey, 90);
  const safeReg = sanitizeDocToken(regionId, 28);
  return `${safeImg}__${safeReg}`.slice(0, 124);
}

function readLocalStore(): Record<string, PersistedTargetObservation> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalStore(map: Record<string, PersistedTargetObservation>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota overflow
  }
}

/**
 * Loads saved target statuses and notes for a given imageKey from local cache + Firestore (when signed in).
 */
export async function loadSavedTargetsForImage(
  imageKey: string
): Promise<Record<string, PersistedTargetObservation>> {
  const safeImgKey = String(imageKey || '').slice(0, 160);
  if (!safeImgKey) return {};

  const localMap = readLocalStore();
  const byRegion: Record<string, PersistedTargetObservation> = {};

  for (const obs of Object.values(localMap)) {
    if (obs && obs.imageKey === safeImgKey) {
      byRegion[obs.regionId] = obs;
    }
  }

  const currentUser = auth.currentUser;
  if (!currentUser || isFirestoreQuotaExceeded()) {
    return byRegion;
  }

  try {
    const colRef = collection(db, 'users', currentUser.uid, 'geologicalTargets');
    const q = query(colRef, where('imageKey', '==', safeImgKey));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      const data = docSnap.data() as any;
      if (data && data.regionId) {
        const merged: PersistedTargetObservation = {
          id: String(data.id || docSnap.id),
          imageKey: String(data.imageKey || safeImgKey),
          imageName: String(data.imageName || ''),
          targetId: String(data.targetId || ''),
          regionId: String(data.regionId),
          targetName: String(data.targetName || ''),
          status: data.status as TargetLifecycleStatus,
          notes: Array.isArray(data.notes) ? data.notes.map(String) : [],
          createdAt: String(data.createdAt || new Date().toISOString()),
          updatedAt: String(data.updatedAt || new Date().toISOString()),
          syncState: 'firestore'
        };
        const existingLocal = byRegion[merged.regionId];
        if (!existingLocal || merged.updatedAt >= existingLocal.updatedAt) {
          byRegion[merged.regionId] = merged;
          localMap[merged.id] = merged;
        }
      }
    });
    writeLocalStore(localMap);
  } catch (err) {
    handleFirestoreError(err, 'list', `users/${currentUser.uid}/geologicalTargets`);
  }

  return byRegion;
}

/**
 * Persists operator status / note updates to localStorage immediately and syncs to Firestore when signed in.
 */
export async function saveTargetObservation(input: {
  imageKey: string;
  imageName: string;
  targetId: string;
  regionId: string;
  targetName: string;
  status: TargetLifecycleStatus;
  notes: string[];
}): Promise<PersistedTargetObservation> {
  const safeImgKey = String(input.imageKey || 'unknown').slice(0, 160);
  const safeRegionId = sanitizeDocToken(input.regionId || input.targetId || 'REG', 64);
  const docId = makeTargetObservationDocId(safeImgKey, safeRegionId);
  const nowIso = new Date().toISOString();

  const localMap = readLocalStore();
  const prev = localMap[docId];
  const cleanNotes = (input.notes || []).slice(0, 50).map(n => String(n).slice(0, 1000));

  const currentUser = auth.currentUser;
  const record: PersistedTargetObservation = {
    id: docId,
    imageKey: safeImgKey,
    imageName: String(input.imageName || '').slice(0, 240),
    targetId: String(input.targetId || '').slice(0, 128),
    regionId: safeRegionId,
    targetName: String(input.targetName || '').slice(0, 200),
    status: input.status,
    notes: cleanNotes,
    createdAt: prev?.createdAt || nowIso,
    updatedAt: nowIso,
    syncState: currentUser && !isFirestoreQuotaExceeded() ? 'firestore' : currentUser ? 'local_pending_sync' : 'local_guest'
  };

  localMap[docId] = record;
  writeLocalStore(localMap);

  if (!currentUser || isFirestoreQuotaExceeded()) {
    return record;
  }

  const docPath = `users/${currentUser.uid}/geologicalTargets/${docId}`;
  const docRef = doc(db, 'users', currentUser.uid, 'geologicalTargets', docId);

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        status: record.status,
        notes: record.notes,
        updatedAt: record.updatedAt,
        targetName: record.targetName
      });
    } else {
      await setDoc(docRef, {
        id: record.id,
        userId: currentUser.uid,
        imageKey: record.imageKey,
        imageName: record.imageName,
        targetId: record.targetId,
        regionId: record.regionId,
        targetName: record.targetName,
        status: record.status,
        notes: record.notes,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      });
    }
    record.syncState = 'firestore';
    localMap[docId] = record;
    writeLocalStore(localMap);
  } catch (err) {
    record.syncState = 'local_pending_sync';
    localMap[docId] = record;
    writeLocalStore(localMap);
    handleFirestoreError(err, 'write', docPath);
  }

  return record;
}

/**
 * Syncs any locally saved target observations to Firestore right after the user signs in.
 */
export async function syncPendingTargetObservationsToFirestore(): Promise<number> {
  const currentUser = auth.currentUser;
  if (!currentUser || isFirestoreQuotaExceeded()) return 0;

  const localMap = readLocalStore();
  let synced = 0;

  for (const obs of Object.values(localMap)) {
    if (!obs || obs.syncState === 'firestore') continue;
    try {
      await saveTargetObservation({
        imageKey: obs.imageKey,
        imageName: obs.imageName,
        targetId: obs.targetId,
        regionId: obs.regionId,
        targetName: obs.targetName,
        status: obs.status,
        notes: obs.notes
      });
      synced++;
    } catch {
      // stop on permission/quota failure
      break;
    }
  }
  return synced;
}
