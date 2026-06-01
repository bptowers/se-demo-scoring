import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getFirebaseAuth, isFirebaseConfigured, signOut as serviceSignOut } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void; // Exposed for demo mode manual setting
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          console.log('🔍 Firebase User Data:', {
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            photoURLType: typeof firebaseUser.photoURL,
          });

          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // If no firebase config, we just finish loading.
      // User remains null until they hit "Demo Login"
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    await serviceSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};