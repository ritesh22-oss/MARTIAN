import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  consumeLastSignInIsNewUser,
  handleFirestoreError,
  isFirestoreQuotaExceeded,
  markFirestoreQuotaExceeded
} from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { UnauthorizedDomainModal } from '../components/UnauthorizedDomainModal';

export const ORBIT_ONBOARDING_VERSION = '1.0.0';

export interface OnboardingState {
  onboarding_completed: boolean;
  onboarding_skipped: boolean;
  onboarding_version: string;
  onboarding_completed_at: string | null;
  onboarding_current_step: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  updatedAt?: string;
  role?: string;
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
  onboarding_version?: string;
  onboarding_completed_at?: string | null;
  onboarding_current_step?: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileSynced: boolean;
  unauthorizedDomainError: { domain: string; projectId: string } | null;
  login: () => Promise<User | null>;
  logout: () => Promise<void>;
  enableGuestMode: () => void;
  clearUnauthorizedDomainError: () => void;
  updateOnboardingState: (partial: Partial<OnboardingState>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  profileSynced: false,
  unauthorizedDomainError: null,
  login: async () => null,
  logout: async () => {},
  enableGuestMode: () => {},
  clearUnauthorizedDomainError: () => {},
  updateOnboardingState: async () => {},
});

const clampStep = (step: unknown): number => {
  if (typeof step !== 'number' || !Number.isFinite(step)) return 0;
  return Math.max(0, Math.min(14, Math.trunc(step)));
};

const getOnboardingCacheKey = (uid: string) => `marsnav_onboarding_${uid}`;
const getProfileCacheKey = (uid: string) => `marsnav_profile_${uid}`;

function readLocalOnboarding(uid: string): Partial<OnboardingState> | null {
  try {
    const raw = localStorage.getItem(getOnboardingCacheKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalOnboarding(uid: string, state: OnboardingState) {
  try {
    localStorage.setItem(getOnboardingCacheKey(uid), JSON.stringify(state));
  } catch {}
}

function sanitizeProfilePayload(profile: UserProfile): Record<string, any> {
  return {
    uid: profile.uid.slice(0, 128),
    email: (profile.email || 'commander@marsnav.space').slice(0, 254),
    displayName: (profile.displayName || 'Mars Commander').slice(0, 100),
    photoURL: (profile.photoURL || '').slice(0, 2000),
    role: (profile.role || 'Flight Commander').slice(0, 64),
    createdAt: (profile.createdAt || new Date().toISOString()).slice(0, 64),
    updatedAt: new Date().toISOString().slice(0, 64),
    onboarding_completed: Boolean(profile.onboarding_completed),
    onboarding_skipped: Boolean(profile.onboarding_skipped),
    onboarding_version: (profile.onboarding_version || ORBIT_ONBOARDING_VERSION).slice(0, 32),
    onboarding_completed_at: profile.onboarding_completed_at
      ? String(profile.onboarding_completed_at).slice(0, 64)
      : null,
    onboarding_current_step: clampStep(profile.onboarding_current_step),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseProfile, setFirebaseProfile] = useState<UserProfile | null>(null);
  const firebaseProfileRef = useRef<UserProfile | null>(null);
  firebaseProfileRef.current = firebaseProfile;

  const [guestUser, setGuestUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('marsnav_guest_session');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [profileSynced, setProfileSynced] = useState(false);
  const [unauthorizedDomainError, setUnauthorizedDomainError] = useState<{ domain: string; projectId: string } | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (isCancelled) return;
      setFirebaseUser(currentUser);

      if (!currentUser) {
        setFirebaseProfile(null);
        setProfileSynced(true);
        setLoading(false);
        return;
      }

      setProfileSynced(false);
      setGuestUser(null);
      try {
        localStorage.removeItem('marsnav_guest_session');
      } catch {}

      const cachedProfileKey = getProfileCacheKey(currentUser.uid);
      let cachedProfile: UserProfile | null = null;
      try {
        const cached = localStorage.getItem(cachedProfileKey);
        if (cached) cachedProfile = JSON.parse(cached);
      } catch {}

      const cachedOnboarding = readLocalOnboarding(currentUser.uid);
      const justCreatedViaPopup = consumeLastSignInIsNewUser(currentUser.uid);

      const createdAtMs = currentUser.metadata?.creationTime ? Date.parse(currentUser.metadata.creationTime) : 0;
      const lastSignInMs = currentUser.metadata?.lastSignInTime ? Date.parse(currentUser.metadata.lastSignInTime) : 0;
      const isFirstAuthLoginWindow =
        createdAtMs > 0 &&
        lastSignInMs > 0 &&
        Math.abs(lastSignInMs - createdAtMs) <= 15000 &&
        Date.now() - createdAtMs <= 300000;

      const baseCreatedAt = currentUser.metadata?.creationTime
        ? new Date(currentUser.metadata.creationTime).toISOString()
        : (cachedProfile?.createdAt || new Date().toISOString());

      const buildFallbackProfile = (isBrandNew: boolean): UserProfile => ({
        uid: currentUser.uid,
        email: currentUser.email || cachedProfile?.email || 'commander@marsnav.space',
        displayName: currentUser.displayName || cachedProfile?.displayName || 'Mars Commander',
        photoURL: currentUser.photoURL || cachedProfile?.photoURL || '',
        createdAt: baseCreatedAt,
        updatedAt: new Date().toISOString(),
        role: cachedProfile?.role || 'Flight Commander',
        onboarding_completed:
          cachedOnboarding?.onboarding_completed ??
          cachedProfile?.onboarding_completed ??
          !isBrandNew,
        onboarding_skipped:
          cachedOnboarding?.onboarding_skipped ??
          cachedProfile?.onboarding_skipped ??
          false,
        onboarding_version:
          cachedOnboarding?.onboarding_version ??
          cachedProfile?.onboarding_version ??
          ORBIT_ONBOARDING_VERSION,
        onboarding_completed_at:
          cachedOnboarding?.onboarding_completed_at ??
          cachedProfile?.onboarding_completed_at ??
          (isBrandNew ? null : baseCreatedAt),
        onboarding_current_step: clampStep(
          cachedOnboarding?.onboarding_current_step ?? cachedProfile?.onboarding_current_step ?? 0
        ),
      });

      // Set optimistic local profile before async Firestore sync completes
      const optimisticNew = justCreatedViaPopup === true || (!cachedProfile && !cachedOnboarding && isFirstAuthLoginWindow);
      const optimisticProfile = buildFallbackProfile(optimisticNew);
      setFirebaseProfile(optimisticProfile);

      if (isFirestoreQuotaExceeded()) {
        try {
          localStorage.setItem(cachedProfileKey, JSON.stringify(optimisticProfile));
        } catch {}
        if (!isCancelled) {
          setProfileSynced(true);
          setLoading(false);
        }
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (isCancelled) return;

        if (docSnap && docSnap.exists()) {
          const remoteData = docSnap.data() as UserProfile;
          const hasExplicitOnboardingFields =
            typeof remoteData.onboarding_completed === 'boolean' ||
            typeof remoteData.onboarding_skipped === 'boolean';

          // Legacy user profile created prior to onboarding rollout retains completed status
          const resolvedCompleted = hasExplicitOnboardingFields
            ? Boolean(remoteData.onboarding_completed)
            : !(justCreatedViaPopup === true || isFirstAuthLoginWindow);

          const resolvedProfile: UserProfile = {
            ...optimisticProfile,
            ...remoteData,
            uid: currentUser.uid,
            email: remoteData.email || optimisticProfile.email,
            displayName: remoteData.displayName || optimisticProfile.displayName,
            photoURL: remoteData.photoURL || optimisticProfile.photoURL,
            createdAt: remoteData.createdAt || baseCreatedAt,
            onboarding_completed: resolvedCompleted,
            onboarding_skipped: Boolean(remoteData.onboarding_skipped),
            onboarding_version: remoteData.onboarding_version || ORBIT_ONBOARDING_VERSION,
            onboarding_completed_at: remoteData.onboarding_completed_at ?? (resolvedCompleted ? (remoteData.createdAt || baseCreatedAt) : null),
            onboarding_current_step: clampStep(remoteData.onboarding_current_step ?? 0),
          };

          // Sync legacy user doc once so its completed status is permanently explicit
          if (!hasExplicitOnboardingFields && resolvedCompleted) {
            setDoc(userDocRef, sanitizeProfilePayload(resolvedProfile), { merge: true }).catch(() => {});
          }

          setFirebaseProfile(resolvedProfile);
          writeLocalOnboarding(currentUser.uid, {
            onboarding_completed: Boolean(resolvedProfile.onboarding_completed),
            onboarding_skipped: Boolean(resolvedProfile.onboarding_skipped),
            onboarding_version: resolvedProfile.onboarding_version || ORBIT_ONBOARDING_VERSION,
            onboarding_completed_at: resolvedProfile.onboarding_completed_at ?? null,
            onboarding_current_step: clampStep(resolvedProfile.onboarding_current_step),
          });
          try {
            localStorage.setItem(cachedProfileKey, JSON.stringify(resolvedProfile));
          } catch {}
        } else {
          // No Firestore profile doc yet: determine accurately if brand-new account or pre-existing returning user
          let hasExistingMissions = false;
          try {
            const missionsSnap = await getDocs(
              query(collection(db, 'users', currentUser.uid, 'missions'), limit(1))
            );
            hasExistingMissions = !missionsSnap.empty;
          } catch {}

          const isBrandNewUser =
            !cachedOnboarding &&
            !hasExistingMissions &&
            (justCreatedViaPopup === true ||
              (justCreatedViaPopup !== false && isFirstAuthLoginWindow && !cachedProfile));

          const initialProfile = buildFallbackProfile(isBrandNewUser);
          setFirebaseProfile(initialProfile);
          writeLocalOnboarding(currentUser.uid, {
            onboarding_completed: Boolean(initialProfile.onboarding_completed),
            onboarding_skipped: Boolean(initialProfile.onboarding_skipped),
            onboarding_version: initialProfile.onboarding_version || ORBIT_ONBOARDING_VERSION,
            onboarding_completed_at: initialProfile.onboarding_completed_at ?? null,
            onboarding_current_step: clampStep(initialProfile.onboarding_current_step),
          });
          try {
            localStorage.setItem(cachedProfileKey, JSON.stringify(initialProfile));
          } catch {}

          try {
            await setDoc(userDocRef, sanitizeProfilePayload(initialProfile), { merge: true });
          } catch (writeErr: any) {
            if (writeErr?.code === 'resource-exhausted' || writeErr?.message?.includes('resource-exhausted')) {
              markFirestoreQuotaExceeded();
            }
          }
        }
      } catch (err: any) {
        if (err?.code === 'resource-exhausted' || (err?.message && err.message.includes('resource-exhausted'))) {
          markFirestoreQuotaExceeded();
        }
      } finally {
        if (!isCancelled) {
          setProfileSynced(true);
          setLoading(false);
        }
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  const updateOnboardingState = useCallback(async (partial: Partial<OnboardingState>) => {
    const activeFirebaseUser = firebaseUser;
    if (!activeFirebaseUser) return;

    const current = firebaseProfileRef.current || {
      uid: activeFirebaseUser.uid,
      email: activeFirebaseUser.email || 'commander@marsnav.space',
      displayName: activeFirebaseUser.displayName || 'Mars Commander',
      photoURL: activeFirebaseUser.photoURL || '',
      createdAt: activeFirebaseUser.metadata?.creationTime
        ? new Date(activeFirebaseUser.metadata.creationTime).toISOString()
        : new Date().toISOString(),
      role: 'Flight Commander',
    };

    const nextProfile: UserProfile = {
      ...current,
      ...partial,
      onboarding_current_step: clampStep(
        partial.onboarding_current_step ?? current.onboarding_current_step ?? 0
      ),
      onboarding_version: partial.onboarding_version || current.onboarding_version || ORBIT_ONBOARDING_VERSION,
      updatedAt: new Date().toISOString(),
    };

    setFirebaseProfile(nextProfile);

    const nextOnboardingState: OnboardingState = {
      onboarding_completed: Boolean(nextProfile.onboarding_completed),
      onboarding_skipped: Boolean(nextProfile.onboarding_skipped),
      onboarding_version: nextProfile.onboarding_version || ORBIT_ONBOARDING_VERSION,
      onboarding_completed_at: nextProfile.onboarding_completed_at ?? null,
      onboarding_current_step: clampStep(nextProfile.onboarding_current_step),
    };

    writeLocalOnboarding(activeFirebaseUser.uid, nextOnboardingState);
    try {
      localStorage.setItem(getProfileCacheKey(activeFirebaseUser.uid), JSON.stringify(nextProfile));
    } catch {}

    if (isFirestoreQuotaExceeded()) return;

    try {
      const userDocRef = doc(db, 'users', activeFirebaseUser.uid);
      await setDoc(userDocRef, sanitizeProfilePayload(nextProfile), { merge: true });
    } catch (err: any) {
      if (err?.code === 'resource-exhausted' || err?.message?.includes('resource-exhausted')) {
        markFirestoreQuotaExceeded();
        return;
      }
      try {
        handleFirestoreError(err, 'update', `users/${activeFirebaseUser.uid}`);
      } catch {
        // Error logged by handleFirestoreError; local state & cache remain intact
      }
    }
  }, [firebaseUser]);

  const enableGuestMode = () => {
    const mockGuest: any = {
      uid: 'guest-commander-session',
      displayName: 'Commander (Guest)',
      email: 'commander@marsnav.space',
      photoURL: '',
      emailVerified: true,
      isAnonymous: true
    };
    setGuestUser(mockGuest);
    setUnauthorizedDomainError(null);
    setProfileSynced(true);
    try {
      localStorage.setItem('marsnav_guest_session', JSON.stringify(mockGuest));
    } catch {}
  };

  const login = async (): Promise<User | null> => {
    setUnauthorizedDomainError(null);
    try {
      const res = await signInWithGoogle();
      return res;
    } catch (error: any) {
      const isUnauthorized = error?.code === 'auth/unauthorized-domain' ||
        (typeof error?.message === 'string' && error.message.includes('auth/unauthorized-domain'));
      
      if (isUnauthorized) {
        const domain = window.location.hostname || 'localhost';
        const projectId = firebaseConfig?.projectId || 'idyllic-orbit-445507-q5';
        setUnauthorizedDomainError({ domain, projectId });
        return null;
      }
      throw error;
    }
  };

  const logout = async () => {
    setGuestUser(null);
    setUnauthorizedDomainError(null);
    try {
      localStorage.removeItem('marsnav_guest_session');
    } catch {}
    try {
      await signOutUser();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const effectiveUser = firebaseUser || guestUser;
  const effectiveProfile: UserProfile | null = firebaseUser
    ? firebaseProfile
    : (guestUser ? {
        uid: guestUser.uid,
        email: guestUser.email || 'commander@marsnav.space',
        displayName: guestUser.displayName || 'Commander (Guest)',
        photoURL: '',
        createdAt: new Date().toISOString(),
        role: 'Guest Commander',
        onboarding_completed: true,
        onboarding_skipped: false,
        onboarding_version: ORBIT_ONBOARDING_VERSION,
        onboarding_current_step: 0,
      } : null);

  return (
    <AuthContext.Provider value={{
      user: effectiveUser,
      userProfile: effectiveProfile,
      loading,
      profileSynced,
      unauthorizedDomainError,
      login,
      logout,
      enableGuestMode,
      clearUnauthorizedDomainError: () => setUnauthorizedDomainError(null),
      updateOnboardingState,
    }}>
      {children}
      {unauthorizedDomainError && (
        <UnauthorizedDomainModal
          domain={unauthorizedDomainError.domain}
          projectId={unauthorizedDomainError.projectId}
          onClose={() => setUnauthorizedDomainError(null)}
          onContinueAsGuest={enableGuestMode}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
