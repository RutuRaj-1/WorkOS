import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
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
    if (!currentUser || !userProfile?.orgId) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.WORKSPACES),
      where('orgId', '==', userProfile.orgId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Workspace));
      setWorkspaces(data);
      if (data.length > 0 && !activeWorkspace) {
        setActiveWorkspace(data[0]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser, userProfile?.orgId]);

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, setActiveWorkspace, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
