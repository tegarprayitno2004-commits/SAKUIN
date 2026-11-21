import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { buildDemoDataset } from '@/src/constants/demoData';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
  translateAuthError,
} from '@/src/lib/firebase';
import type { UserProfile } from '@/src/types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  isDemoMode: boolean;
  firestoreOnline: boolean;
  loginEmail: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  registerEmail: (name: string, email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: { displayName: string; photoURL: string }) => Promise<void>;
  changeUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteUserAccount: (currentPassword?: string) => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [firestoreOnline, setFirestoreOnline] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    testFirestoreConnection().then((ok) => setFirestoreOnline(ok));
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!user) {
        setFirebaseUser(null);
        if (!isDemoMode) {
          setProfile(null);
        }
        setAuthReady(true);
        return;
      }

      setIsDemoMode(false);
      setFirebaseUser(user);

      const userRef = doc(db, 'users', user.uid);
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const initialName = (user.displayName || user.email?.split('@')[0] || 'Pengguna Sakuin').slice(0, 80);
          const initialEmail = (user.email || 'pengguna@sakuin.web.id').slice(0, 120);
          const initialPhoto = (user.photoURL || '').slice(0, 500);
          await setDoc(userRef, {
            displayName: initialName,
            email: initialEmail,
            photoURL: initialPhoto,
            lastWorkspace: 'personal',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        } catch (wrapped) {
          setFatalError(wrapped instanceof Error ? wrapped.message : String(wrapped));
        }
      }

      unsubProfile = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            const d = snap.data();
            setProfile({
              uid: user.uid,
              displayName: String(d.displayName || user.displayName || 'Pengguna'),
              email: String(d.email || user.email || ''),
              photoURL: String(d.photoURL || ''),
              lastWorkspace: String(d.lastWorkspace || 'personal'),
              createdAt: d.createdAt ?? null,
              updatedAt: d.updatedAt ?? null,
            });
          }
          setAuthReady(true);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          } catch (wrapped) {
            setFatalError(wrapped instanceof Error ? wrapped.message : String(wrapped));
          }
          setAuthReady(true);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, [isDemoMode]);

  const loginEmail = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setIsDemoMode(false);
    } catch (err) {
      throw new Error(translateAuthError(err));
    }
  }, []);

  const registerEmail = useCallback(async (name: string, email: string, password: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const cleanName = name.trim().slice(0, 80);
      await updateProfile(cred.user, { displayName: cleanName });
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: cleanName,
        email: email.trim().slice(0, 120),
        photoURL: '',
        lastWorkspace: 'personal',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setIsDemoMode(false);
    } catch (err) {
      throw new Error(translateAuthError(err));
    }
  }, []);

  const loginGoogle = useCallback(async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleProvider);
      setIsDemoMode(false);
    } catch (err) {
      throw new Error(translateAuthError(err));
    }
  }, []);

  const logout = useCallback(async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setProfile(null);
      return;
    }
    await signOut(auth);
  }, [isDemoMode]);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      throw new Error(translateAuthError(err));
    }
  }, []);

  const updateUserProfile = useCallback(
    async (data: { displayName: string; photoURL: string }) => {
      if (!firebaseUser) return;
      const cleanName = data.displayName.trim().slice(0, 80);
      const cleanPhoto = data.photoURL.trim().slice(0, 500);

      await updateProfile(firebaseUser, {
        displayName: cleanName,
        photoURL: cleanPhoto || null,
      });

      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        await updateDoc(userRef, {
          displayName: cleanName,
          photoURL: cleanPhoto,
          updatedAt: serverTimestamp(),
        });

        // Keep groupMembers records synchronized
        const qMembers = query(
          collection(db, 'groupMembers'),
          where('uid', '==', firebaseUser.uid)
        );
        const snap = await getDocs(qMembers);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.forEach((mDoc) => {
            batch.update(mDoc.ref, {
              displayName: cleanName,
              photoURL: cleanPhoto,
            });
          });
          await batch.commit();
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    },
    [firebaseUser]
  );

  const changeUserPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!firebaseUser || !firebaseUser.email) {
        throw new Error('Akun tidak memiliki kredensial email/kata sandi.');
      }
      try {
        const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);
        await updatePassword(firebaseUser, newPassword);
      } catch (err) {
        throw new Error(translateAuthError(err));
      }
    },
    [firebaseUser]
  );

  const deleteUserAccount = useCallback(
    async (currentPassword?: string) => {
      if (!firebaseUser) return;
      try {
        if (
          currentPassword &&
          firebaseUser.email &&
          firebaseUser.providerData.some((p) => p.providerId === 'password')
        ) {
          const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
          await reauthenticateWithCredential(firebaseUser, credential);
        }
        await deleteDoc(doc(db, 'users', firebaseUser.uid));
        await deleteUser(firebaseUser);
      } catch (err) {
        throw new Error(translateAuthError(err));
      }
    },
    [firebaseUser]
  );

  const enterDemoMode = useCallback(() => {
    const demo = buildDemoDataset();
    setIsDemoMode(true);
    setProfile(demo.user);
    setAuthReady(true);
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    setProfile(null);
  }, []);

  if (fatalError) {
    throw new Error(fatalError);
  }

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        authReady,
        isDemoMode,
        firestoreOnline,
        loginEmail,
        registerEmail,
        loginGoogle,
        logout,
        resetPassword,
        updateUserProfile,
        changeUserPassword,
        deleteUserAccount,
        enterDemoMode,
        exitDemoMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus digunakan di dalam AuthProvider');
  return ctx;
}
