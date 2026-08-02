import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { Notification } from '@/types';
import { respondToCompetitionInvite } from '@/lib/notificationHelper';
import { Bell, Check, CheckCheck, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { userProfile, currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const userId = userProfile?.id || currentUser?.uid;
  const userName = userProfile?.displayName || currentUser?.email || 'Admin';

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId)
    );

    const unsub = onSnapshot(q, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Notification))
        .sort((a, b) => {
          const timeA = (a.createdAt as any)?.toMillis?.() || 0;
          const timeB = (b.createdAt as any)?.toMillis?.() || 0;
          return timeB - timeA;
        });
      setNotifications(list);
    });

    return unsub;
  }, [userId]);

  const markAllRead = async () => {
    for (const n of notifications) {
      if (!n.read) {
        await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, n.id), { read: true });
      }
    }
  };

  const handleInviteAction = async (n: Notification, response: 'accepted' | 'declined') => {
    if (!n.eventId) return;
    await respondToCompetitionInvite({
      eventId: n.eventId,
      eventName: n.eventName || 'Competition',
      workspaceId: n.workspaceId || '',
      userUid: userId || '',
      userName,
      response,
      notificationId: n.id,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification & Invite Center</h1>
          <p className="text-sm text-muted-foreground">Real-time alerts, competition invites, and teammate response triggers</p>
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

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={cn(
                'glass-card p-5 space-y-3 border-l-4 transition-all',
                !n.read ? 'border-l-primary bg-primary/[0.03]' : 'border-l-transparent'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {n.type === 'competition_invite' && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
                  <h4 className="text-sm font-semibold">{n.title}</h4>
                </div>
                {!n.read && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">New</span>}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>

              {/* Interactive Invite Approval Buttons */}
              {n.type === 'competition_invite' && (
                <div className="pt-2 border-t border-border/40 flex items-center gap-3">
                  {n.invitedStatus === 'accepted' ? (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      <Check className="w-3.5 h-3.5" /> You Accepted (Ready)
                    </span>
                  ) : n.invitedStatus === 'declined' ? (
                    <span className="text-xs text-red-400 font-semibold flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20">
                      <X className="w-3.5 h-3.5" /> You Declined
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleInviteAction(n, 'accepted')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept & Join Competition
                      </button>
                      <button
                        onClick={() => handleInviteAction(n, 'declined')}
                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl text-xs font-medium transition-colors"
                      >
                        Decline
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
