import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, signOutUser, isFirestoreQuotaExceeded, markFirestoreQuotaExceeded } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { UnauthorizedDomainModal } from '../components/UnauthorizedDomainModal';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  unauthorizedDomainError: { domain: string; projectId: string } | null;
  login: () => Promise<User | null>;
  logout: () => Promise<void>;
  enableGuestMode: () => void;
  clearUnauthorizedDomainError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  unauthorizedDomainError: null,
  login: async () => null,
  logout: async () => {},
  enableGuestMode: () => {},
  clearUnauthorizedDomainError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseProfile, setFirebaseProfile] = useState<UserProfile | null>(null);
  
  const [guestUser, setGuestUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem('marsnav_guest_session');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [unauthorizedDomainError, setUnauthorizedDomainError] = useState<{ domain: string; projectId: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        // Clear guest user if real Firebase auth succeeds
        setGuestUser(null);
        try {
          localStorage.removeItem('marsnav_guest_session');
        } catch {}

        const fallbackProfile: UserProfile = {
          uid: currentUser.uid,
          email: currentUser.email || 'commander@marsnav.space',
          displayName: currentUser.displayName || 'Mars Commander',
          photoURL: currentUser.photoURL || '',
          createdAt: new Date().toISOString(),
          role: 'Flight Commander'
        };

        const cachedProfileKey = `marsnav_profile_${currentUser.uid}`;
        let localProfile: UserProfile | null = null;
        try {
          const cached = localStorage.getItem(cachedProfileKey);
          if (cached) localProfile = JSON.parse(cached);
        } catch {}

        if (!localProfile) {
          localProfile = fallbackProfile;
          try {
            localStorage.setItem(cachedProfileKey, JSON.stringify(localProfile));
          } catch {}
        }

        setFirebaseProfile(localProfile);

        // Only attempt reading remote profile if quota is not exhausted
        if (!isFirestoreQuotaExceeded()) {
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap && docSnap.exists()) {
              const remoteData = docSnap.data() as UserProfile;
              if (remoteData) {
                setFirebaseProfile(remoteData);
                try {
                  localStorage.setItem(cachedProfileKey, JSON.stringify(remoteData));
                } catch {}
              }
            }
          } catch (err: any) {
            if (err?.code === 'resource-exhausted' || (err?.message && err.message.includes('resource-exhausted'))) {
              markFirestoreQuotaExceeded();
            }
          }
        }
      } else {
        setFirebaseProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        role: 'Guest Commander'
      } : null);

  return (
    <AuthContext.Provider value={{
      user: effectiveUser,
      userProfile: effectiveProfile,
      loading,
      unauthorizedDomainError,
      login,
      logout,
      enableGuestMode,
      clearUnauthorizedDomainError: () => setUnauthorizedDomainError(null)
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
