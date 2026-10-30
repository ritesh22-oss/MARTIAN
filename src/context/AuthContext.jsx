import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, signOutUser, isFirestoreQuotaExceeded, markFirestoreQuotaExceeded } from '../firebase';

const AuthContext = createContext({
  user: null,
  userProfile: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const fallbackProfile = {
          uid: currentUser.uid,
          email: currentUser.email || 'commander@marsnav.space',
          displayName: currentUser.displayName || 'Mars Commander',
          photoURL: currentUser.photoURL || '',
          createdAt: new Date().toISOString()
        };

        const cachedProfileKey = `marsnav_profile_${currentUser.uid}`;
        let localProfile = null;
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

        setUserProfile(localProfile);

        // Only attempt reading remote profile if quota is not exhausted
        if (!isFirestoreQuotaExceeded()) {
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap && docSnap.exists()) {
              const remoteData = docSnap.data();
              if (remoteData) {
                setUserProfile(remoteData);
                try {
                  localStorage.setItem(cachedProfileKey, JSON.stringify(remoteData));
                } catch {}
              }
            }
          } catch (err) {
            if (err?.code === 'resource-exhausted' || (err?.message && err.message.includes('resource-exhausted'))) {
              markFirestoreQuotaExceeded();
            }
          }
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });


    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      return await signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
