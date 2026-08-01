import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Workspace } from '@/types';
import { COLLECTIONS } from '@/lib/collections';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (ws: Workspace | null) => void;
  loading: boolean;
  createWorkspace: (data: {
    name: string;
    color: string;
    emoji: string;
    description?: string;
  }) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextType>({} as WorkspaceContextType);

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No orgId → no workspaces to load
    if (!currentUser || !userProfile?.orgId) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, COLLECTIONS.WORKSPACES),
      where('orgId', '==', userProfile.orgId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Workspace))
          .sort((a, b) => {
            const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.toMillis?.() || 0;
            const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.toMillis?.() || 0;
            return timeA - timeB;
          });
        setWorkspaces(data);
        // Auto-select first workspace if none selected
        setActiveWorkspace(prev => {
          if (prev) {
            // Keep the currently selected one if it still exists
            const stillExists = data.find(w => w.id === prev.id);
            return stillExists || (data.length > 0 ? data[0] : null);
          }
          return data.length > 0 ? data[0] : null;
        });
        setLoading(false);
      },
      (err) => {
        console.error('[WorkspaceContext] Snapshot error:', err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser, userProfile?.orgId]);

  /**
   * createWorkspace — callable from anywhere (Sidebar, Settings, etc.)
   */
  const createWorkspace = useCallback(
    async (data: { name: string; color: string; emoji: string; description?: string }) => {
      if (!currentUser || !userProfile?.orgId) {
        throw new Error('You must complete onboarding before creating a workspace.');
      }

      const docRef = await addDoc(collection(db, COLLECTIONS.WORKSPACES), {
        orgId: userProfile.orgId,
        name: data.name,
        description: data.description || '',
        color: data.color,
        emoji: data.emoji,
        icon: 'briefcase',
        memberIds: [currentUser.uid],
        createdBy: currentUser.uid,
        isArchived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const newWs: Workspace = {
        id: docRef.id,
        orgId: userProfile.orgId,
        name: data.name,
        description: data.description || '',
        color: data.color,
        emoji: data.emoji,
        icon: 'briefcase',
        memberIds: [currentUser.uid],
        createdBy: currentUser.uid,
        isArchived: false,
        createdAt: new Date(),
      };

      setActiveWorkspace(newWs);
      return newWs;
    },
    [currentUser, userProfile]
  );

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, activeWorkspace, setActiveWorkspace, loading, createWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
