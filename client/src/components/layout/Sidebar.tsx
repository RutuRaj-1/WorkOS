import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Calendar, FileText,
  BarChart3, DollarSign, Zap, Settings, Bell, ChevronLeft,
  ChevronRight, ChevronDown, Plus, User, LogOut, Layers, X,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAppSelector, useAppDispatch } from '@/store';
import { toggleSidebarCollapse, setSidebarOpen } from '@/store/slices/uiSlice';
import { toast } from 'sonner';

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

const WORKSPACE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#06b6d4',
];

const WORKSPACE_EMOJIS = ['🚀', '💼', '🎯', '⚡', '🔥', '💡', '🌟', '🏆'];

function NavItemComp({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const dispatch = useAppDispatch();

  return (
    <NavLink
      to={item.href}
      end={item.exact}
      onClick={() => dispatch(setSidebarOpen(false))}
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

// ── Inline Create Workspace Modal ─────────────────────────────────────────────
function CreateWorkspaceModal({ onClose }: { onClose: () => void }) {
  const { createWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [color, setColor] = useState(WORKSPACE_COLORS[0]);
  const [emoji, setEmoji] = useState(WORKSPACE_EMOJIS[0]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }
    setCreating(true);
    try {
      const ws = await createWorkspace({ name: name.trim(), color, emoji });
      toast.success(`Workspace "${ws.name}" created! 🎉`);
      onClose();
      navigate(`/workspace/${ws.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Create New Workspace</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-2xl"
          style={{ background: color + '20', border: `2px solid ${color}50` }}
        >
          {emoji}
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
            Workspace Name *
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Startup Projects, SkillBridge..."
            autoFocus
            className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
          />
        </div>

        {/* Emoji picker */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Emoji</label>
          <div className="flex flex-wrap gap-2">
            {WORKSPACE_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={cn(
                  'w-9 h-9 rounded-xl text-lg transition-all',
                  emoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted hover:bg-muted/80'
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Color</label>
          <div className="flex gap-2 flex-wrap">
            {WORKSPACE_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'w-7 h-7 rounded-lg transition-all',
                  color === c && 'ring-2 ring-offset-2 ring-offset-card ring-white scale-110'
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="flex-1 py-2.5 text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {creating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Create <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { workspaces } = useWorkspace();
  const collapsed = useAppSelector(state => state.ui.sidebarCollapsed);
  const sidebarOpen = useAppSelector(state => state.ui.sidebarOpen);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [workspacesExpanded, setWorkspacesExpanded] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-sidebar flex flex-col z-40 border-r border-sidebar-border overflow-hidden transition-all duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-16' : 'w-64'
        )}
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

          {/* Workspaces Section */}
          <div className="mt-4">
            {!collapsed && (
              <div className="flex items-center justify-between px-3 py-1 group">
                <button
                  onClick={() => setWorkspacesExpanded(!workspacesExpanded)}
                  className="flex items-center gap-1.5 flex-1"
                >
                  <span className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-widest">
                    Workspaces
                  </span>
                  {workspacesExpanded
                    ? <ChevronDown className="w-3 h-3 text-sidebar-foreground/40" />
                    : <ChevronRight className="w-3 h-3 text-sidebar-foreground/40" />
                  }
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    title="Create workspace"
                    className="w-5 h-5 flex items-center justify-center rounded text-sidebar-foreground/40 hover:text-sidebar-primary hover:bg-sidebar-primary/10 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
                    title="Manage workspaces"
                    className="w-5 h-5 flex items-center justify-center rounded text-sidebar-foreground/40 hover:text-sidebar-primary hover:bg-sidebar-primary/10 transition-all"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {collapsed && (
              <button
                onClick={() => setShowCreateModal(true)}
                title="Create workspace"
                className="w-full flex items-center justify-center py-2 text-sidebar-foreground/40 hover:text-sidebar-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            <AnimatePresence>
              {(workspacesExpanded || collapsed) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden space-y-0.5 mt-1"
                >
                  {workspaces.length === 0 && !collapsed && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="w-full px-3 py-2 text-xs text-sidebar-foreground/30 hover:text-sidebar-primary text-left transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3 h-3" />
                      Create your first workspace
                    </button>
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
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 overflow-hidden">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="" className="w-7 h-7 object-cover" />
              ) : (
                <User className="w-3.5 h-3.5 text-white" />
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {userProfile?.displayName || currentUser?.email}
                </p>
                <p className="text-xs text-sidebar-foreground/40 capitalize">{userProfile?.role}</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="text-sidebar-foreground/30 hover:text-red-400 transition-colors"
                title="Sign out"
              >
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
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-sidebar-foreground/60" />
            : <ChevronLeft className="w-3 h-3 text-sidebar-foreground/60" />
          }
        </button>
      </aside>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateWorkspaceModal onClose={() => setShowCreateModal(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
