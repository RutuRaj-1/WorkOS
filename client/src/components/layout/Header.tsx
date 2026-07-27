import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Bell, Sun, Moon, Plus, Command } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setGlobalSearchOpen, setCommandPaletteOpen, toggleTheme } from '@/store/slices/uiSlice';
import { togglePanel } from '@/store/slices/notificationSlice';
import { cn } from '@/lib/utils';

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'My Tasks',
  calendar: 'Calendar',
  documents: 'Documents',
  analytics: 'Analytics',
  finance: 'Finance',
  notifications: 'Notifications',
  settings: 'Settings',
  workspace: 'Workspace',
};

function useBreadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  return parts.map(p => breadcrumbMap[p] || p);
}

export default function Header() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(state => state.ui.theme);
  const unreadCount = useAppSelector(state => state.notifications.unreadCount);
  const breadcrumbs = useBreadcrumbs();

  return (
    <header className="h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-30 shrink-0">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm flex-1">
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-muted-foreground/40">/</span>}
            <span className={cn(
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
      <div className="flex items-center gap-2">
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

        {/* Notifications */}
        <button
          onClick={() => dispatch(togglePanel())}
          className="relative w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
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
      </div>
    </header>
  );
}
