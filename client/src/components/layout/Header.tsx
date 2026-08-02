import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Command, Menu, Check, X, ExternalLink, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setCommandPaletteOpen, toggleTheme, setSidebarOpen } from '@/store/slices/uiSlice';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/collections';
import { Notification } from '@/types';
import { respondToCompetitionInvite } from '@/lib/notificationHelper';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const STATIC_CRUMBS: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'My Tasks',
  calendar: 'Calendar',
  documents: 'Documents',
  analytics: 'Analytics',
  finance: 'Finance',
  notifications: 'Notifications',
  settings: 'Settings',
  workspace: 'Workspace',
  automations: 'Automations',
};

function useBreadcrumbs() {
  const location = useLocation();
  const { workspaces } = useWorkspace();
  const parts = location.pathname.split('/').filter(Boolean);

  return parts.map(p => {
    if (STATIC_CRUMBS[p]) return STATIC_CRUMBS[p];
    const ws = workspaces.find(w => w.id === p);
    if (ws) return ws.name;
    return p;
  });
}

export default function Header() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useAppSelector(state => state.ui.theme);
  const { userProfile, currentUser } = useAuth();
  const breadcrumbs = useBreadcrumbs();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const userId = userProfile?.id || currentUser?.uid;
  const userName = userProfile?.displayName || currentUser?.email || 'Admin';

  // Listen to Firestore notifications for the logged in user
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
    }, err => {
      console.error('Header notifications listener error:', err);
    });

    return unsub;
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (nId: string) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, nId), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

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
    <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-30 shrink-0">
      <button
        onClick={() => dispatch(setSidebarOpen(true))}
        className="lg:hidden w-10 h-10 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm flex-1 overflow-hidden">
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-muted-foreground/40">/</span>}
            <span className={cn(
              'truncate max-w-[180px]',
              i === breadcrumbs.length - 1
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground cursor-pointer transition-colors'
            )}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2 relative">
        {/* Command Search */}
        <button
          onClick={() => dispatch(setCommandPaletteOpen(true))}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/60 hover:bg-muted rounded-lg border border-border/40 transition-all hover:border-border"
          id="header-search-btn"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Search...</span>
          <span className="hidden sm:flex items-center gap-0.5 text-xs bg-background rounded px-1 py-0.5 ml-2 border border-border/40">
            <Command className="w-2.5 h-2.5" />K
          </span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
          id="theme-toggle-btn"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Bell */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={cn(
            'relative w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground',
            showNotifications && 'bg-muted text-foreground'
          )}
          id="notifications-btn"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Live Notifications Popover */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="absolute right-0 top-11 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-3.5 border-b border-border/60 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">Notifications & Triggers</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-primary/20 text-primary font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-border/40 p-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        'p-3.5 rounded-xl transition-all space-y-2',
                        !n.read ? 'bg-primary/[0.04]' : 'hover:bg-muted/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold leading-tight text-foreground flex items-center gap-1.5">
                          {n.type === 'competition_invite' && <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />}
                          {n.title}
                        </h4>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>

                      {/* Interactive Invite Buttons */}
                      {n.type === 'competition_invite' && (
                        <div className="pt-1 flex items-center gap-2">
                          {n.invitedStatus === 'accepted' ? (
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                              <Check className="w-3 h-3" /> You Accepted (Ready)
                            </span>
                          ) : n.invitedStatus === 'declined' ? (
                            <span className="text-[11px] text-red-400 font-semibold flex items-center gap-1 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                              <X className="w-3 h-3" /> You Declined
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleInviteAction(n, 'accepted'); }}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
                              >
                                <Check className="w-3 h-3" /> Join & Approve
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleInviteAction(n, 'declined'); }}
                                className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg text-xs font-medium transition-colors"
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

              <div className="p-2.5 border-t border-border/40 text-center bg-muted/20">
                <button
                  onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  View full Notification Center <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
