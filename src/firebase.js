import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, disableNetwork } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with configured databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
}

/**
 * Standard Firestore Error Handler conforming to the FirestoreErrorInfo contract
 */
export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const QUOTA_KEY = 'marsnav_firestore_quota_exceeded';

/**
 * Checks if the Firestore free tier daily write quota has been exceeded for this project.
 * Defaults to true to protect against free tier resource-exhausted write loops.
 */
export function isFirestoreQuotaExceeded() {
  try {
    const val = localStorage.getItem(QUOTA_KEY);
    if (val === null) {
      localStorage.setItem(QUOTA_KEY, 'false');
      return false;
    }
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * Marks Firestore quota as exceeded and immediately disables network requests
 * so that no mutations are queued and no exponential backoff occurs.
 */
export function markFirestoreQuotaExceeded() {
  try {
    localStorage.setItem(QUOTA_KEY, 'true');
  } catch {}
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
}

// Proactively disable network if quota is already exhausted on load
if (isFirestoreQuotaExceeded()) {
  try {
    disableNetwork(db).catch(() => {});
  } catch {}
}

// Test Connection on Initial Boot
export async function testFirestoreConnection() {
  if (isFirestoreQuotaExceeded()) {
    try {
      await disableNetwork(db);
    } catch {}
    return;
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('resource-exhausted') || error.message.includes('Quota limit exceeded'))) {
      markFirestoreQuotaExceeded();
      console.warn("Firestore connection switched to local cache mode (Daily write quota reached).");
    }
  }
}
testFirestoreConnection();

