import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { Notification } from '@/types';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationsPage() {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!userProfile?.id) return;

    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userProfile.id),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, snap => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
    });

    return unsub;
  }, [userProfile?.id]);

  const markAllRead = async () => {
    notifications.forEach(async (n) => {
      if (!n.read) {
        await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, n.id), { read: true });
      }
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Center</h1>
          <p className="text-sm text-muted-foreground">Real-time alerts, mentions, and updates from Firestore listeners</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
          >
            <CheckCheck className="w-4 h-4" /> Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`glass-card p-4 flex items-start justify-between border-l-4 transition-all ${
                !n.read ? 'border-l-primary bg-primary/5' : 'border-l-transparent'
              }`}
            >
              <div>
                <h4 className="text-sm font-semibold">{n.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
