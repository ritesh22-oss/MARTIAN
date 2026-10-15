import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError } from '../firebase';

/**
 * Saves a rover mission plan to user's Firestore subcollection
 */
export async function saveMissionPlan({
  id = `msn_${Date.now()}`,
  title = 'Jezero Crater Traverse',
  routeType = 'A* Cost-Aware',
  distanceM = 1200,
  energyWh = 450,
  notes = 'Optimized for hazard avoidance and solar insolation'
}) {
  if (!auth.currentUser) {
    throw new Error('User must be signed in to save mission plans.');
  }

  const userId = auth.currentUser.uid;
  const path = `users/${userId}/missions/${id}`;
  
  const missionPayload = {
    id,
    userId,
    title: String(title).slice(0, 200),
    routeType: String(routeType).slice(0, 50),
    distanceM: Number(distanceM) || 0,
    energyWh: Number(energyWh) || 0,
    notes: String(notes).slice(0, 5000),
    createdAt: new Date().toISOString()
  };

  try {
    const missionRef = doc(db, 'users', userId, 'missions', id);
    await setDoc(missionRef, missionPayload);
    return missionPayload;
  } catch (error) {
    handleFirestoreError(error, 'write', path);
  }
}

/**
 * Fetches user's saved mission plans
 */
export async function fetchUserMissions() {
  if (!auth.currentUser) return [];
  const userId = auth.currentUser.uid;
  const path = `users/${userId}/missions`;

  try {
    const missionsCol = collection(db, 'users', userId, 'missions');
    const snapshot = await getDocs(missionsCol);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, 'list', path);
    return [];
  }
}

/**
 * Deletes a mission plan
 */
export async function deleteMissionPlan(missionId) {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const path = `users/${userId}/missions/${missionId}`;

  try {
    const missionRef = doc(db, 'users', userId, 'missions', missionId);
    await deleteDoc(missionRef);
  } catch (error) {
    handleFirestoreError(error, 'delete', path);
  }
}

/**
 * Subscribes to real-time mission updates for the current user
 */
export function subscribeToUserMissions(callback) {
  if (!auth.currentUser) {
    callback([]);
    return () => {};
  }

  const userId = auth.currentUser.uid;
  const path = `users/${userId}/missions`;
  const missionsCol = collection(db, 'users', userId, 'missions');

  return onSnapshot(
    missionsCol,
    (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data());
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, 'list', path);
    }
  );
}
