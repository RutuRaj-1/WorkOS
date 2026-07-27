import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Calendar, FileText,
  BarChart3, DollarSign, Zap, Settings, Bell, ChevronLeft,
  ChevronRight, ChevronDown, Plus, User, LogOut, Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAppSelector, useAppDispatch } from '@/store';
import { toggleSidebarCollapse } from '@/store/slices/uiSlice';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  exact?: boolean;
}

const mainNav: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
      { label: 'My Tasks', href: '/tasks', icon: CheckSquare },
      { label: 'Calendar', href: '/calendar', icon: Calendar },
      { label: 'Documents', href: '/documents', icon: FileText },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { label: 'Finance', href: '/finance', icon: DollarSign },
      { label: 'Automations', href: '/automations', icon: Zap },
    ],
  },
];

function NavItemComp({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.href}
      end={item.exact}
      className={({ isActive }) =>
        cn(
          'sidebar-item group relative',
          isActive && 'sidebar-item-active',
          collapsed && 'justify-center px-0'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="active-nav"
              className="absolute inset-0 bg-sidebar-primary/10 rounded-xl"
              transition={{ type: 'spring', duration: 0.4 }}
            />
          )}
          <item.icon className={cn('w-4 h-4 shrink-0 relative z-10', isActive ? 'text-sidebar-primary' : '')} />
          {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

function WorkspaceItem({ ws, collapsed }: { ws: { id: string; name: string; color: string; emoji?: string }; collapsed: boolean }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(`/workspace/${ws.id}`);

  return (
    <NavLink
      to={`/workspace/${ws.id}`}
      className={cn(
        'sidebar-item group',
        isActive && 'sidebar-item-active',
        collapsed && 'justify-center px-0'
      )}
    >
      <span
        className="w-5 h-5 rounded-lg flex items-center justify-center text-xs shrink-0"
        style={{ background: ws.color + '33', border: `1px solid ${ws.color}50` }}
      >
        {ws.emoji || ws.name[0]}
      </span>
      {!collapsed && <span className="truncate text-sm">{ws.name}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { workspaces } = useWorkspace();
  const collapsed = useAppSelector(state => state.ui.sidebarCollapsed);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [workspacesExpanded, setWorkspacesExpanded] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-sidebar flex flex-col z-40 border-r border-sidebar-border overflow-hidden"
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 shrink-0', collapsed && 'justify-center px-0')}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="ml-2.5">
            <span className="text-sidebar-foreground font-bold text-base tracking-tight">Work</span>
            <span className="text-sidebar-primary font-bold text-base tracking-tight">OS</span>
          </div>
        )}
      </div>

      {/* Scrollable Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-1 no-scrollbar">
        {mainNav.map((section, idx) => (
          <div key={idx} className="mb-2">
            {section.title && !collapsed && (
              <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-widest mb-1 px-3 py-1">
                {section.title}
              </p>
            )}
            {section.items.map(item => (
              <NavItemComp key={item.href} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}

        {/* Workspaces */}
        <div className="mt-4">
          {!collapsed && (
            <button
              onClick={() => setWorkspacesExpanded(!workspacesExpanded)}
              className="w-full flex items-center justify-between px-3 py-1 group"
            >
              <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
                Workspaces
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate('/settings'); }}
                  className="opacity-0 group-hover:opacity-100 w-4 h-4 text-sidebar-foreground/40 hover:text-sidebar-primary transition-opacity"
                >
                  <Plus className="w-3 h-3" />
                </button>
                {workspacesExpanded ? <ChevronDown className="w-3 h-3 text-sidebar-foreground/40" /> : <ChevronRight className="w-3 h-3 text-sidebar-foreground/40" />}
              </div>
            </button>
          )}

          <AnimatePresence>
            {(workspacesExpanded || collapsed) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-0.5 mt-1"
              >
                {workspaces.length === 0 && !collapsed && (
                  <div className="px-3 py-2 text-xs text-sidebar-foreground/30">No workspaces yet</div>
                )}
                {workspaces.map(ws => (
                  <WorkspaceItem key={ws.id} ws={ws} collapsed={collapsed} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom User Section */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-1 shrink-0">
        <NavItemComp item={{ label: 'Settings', href: '/settings', icon: Settings }} collapsed={collapsed} />
        <NavItemComp item={{ label: 'Notifications', href: '/notifications', icon: Bell }} collapsed={collapsed} />

        <div className={cn('flex items-center gap-2.5 p-2 rounded-xl hover:bg-sidebar-accent cursor-pointer transition-colors mt-2', collapsed && 'justify-center')}>
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="" className="w-7 h-7 rounded-lg object-cover" />
            ) : (
              <User className="w-3.5 h-3.5 text-white" />
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{userProfile?.displayName || currentUser?.email}</p>
              <p className="text-xs text-sidebar-foreground/40 capitalize">{userProfile?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="text-sidebar-foreground/30 hover:text-red-400 transition-colors" title="Sign out">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => dispatch(toggleSidebarCollapse())}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 bg-sidebar-border hover:bg-sidebar-accent rounded-full flex items-center justify-center transition-colors z-50"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-sidebar-foreground/60" /> : <ChevronLeft className="w-3 h-3 text-sidebar-foreground/60" />}
      </button>
    </motion.aside>
  );
}
