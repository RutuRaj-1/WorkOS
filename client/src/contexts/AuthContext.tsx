import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';
import { COLLECTIONS } from '@/lib/collections';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  profileLoading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  // loading = true until Firebase auth state is known
  const [loading, setLoading] = useState(true);
  // profileLoading = true while fetching Firestore profile (separate from auth loading)
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchUserProfile = async (uid: string): Promise<User | null> => {
    try {
      const docRef = doc(db, COLLECTIONS.USERS, uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as User;
      }
      return null;
    } catch (err) {
      console.error('[AuthContext] fetchUserProfile error:', err);
      return null;
    }
  };

  const createUserProfile = async (user: FirebaseUser, displayName?: string): Promise<User> => {
    const now = serverTimestamp();
    const profile: Omit<User, 'id'> = {
      email: user.email || '',
      displayName: displayName || user.displayName || 'User',
      photoURL: user.photoURL || undefined,
      role: 'admin',
      isActive: true,
      createdAt: now as never,
      updatedAt: now as never,
    };

    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), profile);
    return { id: user.uid, ...profile };
  };

  const refreshProfile = async () => {
    if (!currentUser) return;
    setProfileLoading(true);
    try {
      const profile = await fetchUserProfile(currentUser.uid);
      setUserProfile(profile);
    } finally {
      setProfileLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    const profile = await createUserProfile(user, displayName);
    setUserProfile(profile);
    await sendEmailVerification(user);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    const existing = await fetchUserProfile(user.uid);
    if (!existing) {
      const profile = await createUserProfile(user);
      setUserProfile(profile);
    } else {
      setUserProfile(existing);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const sendVerification = async () => {
    if (currentUser) {
      await sendEmailVerification(currentUser);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        setProfileLoading(true);
        try {
          const profile = await fetchUserProfile(user.uid);
          setUserProfile(profile);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    profileLoading,
    signUp,
    signIn,
    signInWithGoogle,
    logout,
    resetPassword,
    sendVerification,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
