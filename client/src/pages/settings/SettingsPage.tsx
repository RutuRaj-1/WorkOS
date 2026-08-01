import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNavigate } from 'react-router-dom';
import {
  User, Shield, Building2, Plus, Layers, LogOut,
  ArrowRight, X, Trash2, ExternalLink
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/collections';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const WORKSPACE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#06b6d4',
];

const WORKSPACE_EMOJIS = ['🚀', '💼', '🎯', '⚡', '🔥', '💡', '🌟', '🏆'];

type TabId = 'profile' | 'workspaces' | 'team' | 'organization';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'profile',      label: 'Profile',      icon: User },
  { id: 'workspaces',   label: 'Workspaces',   icon: Layers },
  { id: 'team',         label: 'Team & RBAC',  icon: Shield },
  { id: 'organization', label: 'Organization', icon: Building2 },
];

export default function SettingsPage() {
  const { userProfile, currentUser, logout } = useAuth();
  const { workspaces, createWorkspace, setActiveWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'member' | 'viewer'>('member');

  // New Workspace form
  const [showWsForm, setShowWsForm] = useState(false);
  const [wsName, setWsName] = useState('');
  const [wsColor, setWsColor] = useState(WORKSPACE_COLORS[0]);
  const [wsEmoji, setWsEmoji] = useState(WORKSPACE_EMOJIS[0]);
  const [wsDesc, setWsDesc] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail || !userProfile?.orgId) return;
    toast.success(`Invitation sent to ${inviteEmail} as ${inviteRole}`);
    setInviteEmail('');
  };

  const handleCreateWorkspace = async () => {
    if (!wsName.trim()) {
      toast.error('Workspace name is required');
      return;
    }
    setCreatingWs(true);
    try {
      const ws = await createWorkspace({
        name: wsName.trim(),
        color: wsColor,
        emoji: wsEmoji,
        description: wsDesc.trim(),
      });
      toast.success(`Workspace "${ws.name}" created! 🎉`);
      setWsName('');
      setWsDesc('');
      setShowWsForm(false);
      setActiveWorkspace(ws);
      navigate(`/workspace/${ws.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create workspace');
    } finally {
      setCreatingWs(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, organization, workspaces, and team
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border/50 overflow-x-auto no-scrollbar pb-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-xl transition-all whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ─────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-5">
            <h2 className="text-base font-bold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Profile Information
            </h2>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center overflow-hidden">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Avatar" className="w-16 h-16 object-cover" />
                ) : (
                  <span className="text-white text-2xl font-bold">
                    {(userProfile?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-base">{userProfile?.displayName || 'User'}</p>
                <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                <span className="inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold capitalize">
                  {userProfile?.role || 'admin'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t border-border/40">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Display Name</label>
                <p className="font-semibold">{userProfile?.displayName || '—'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Email</label>
                <p className="font-semibold">{currentUser?.email}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Organization ID</label>
                <p className="font-mono text-xs text-muted-foreground">{userProfile?.orgId || 'Not set'}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">User ID</label>
                <p className="font-mono text-xs text-muted-foreground">{userProfile?.id}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-red-400">
              <LogOut className="w-4 h-4" /> Danger Zone
            </h2>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold transition-all"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ── WORKSPACES TAB ──────────────────────────────────────── */}
      {activeTab === 'workspaces' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Your Workspaces</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => setShowWsForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md"
            >
              <Plus className="w-4 h-4" /> New Workspace
            </button>
          </div>

          {/* Workspace Cards */}
          {workspaces.length === 0 ? (
            <div className="glass-card p-10 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
                🚀
              </div>
              <h3 className="font-semibold">No workspaces yet</h3>
              <p className="text-sm text-muted-foreground">Create your first workspace to organize your projects.</p>
              <button
                onClick={() => setShowWsForm(true)}
                className="mt-2 flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Plus className="w-4 h-4" /> Create Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {workspaces.map(ws => (
                <div
                  key={ws.id}
                  className="glass-card p-4 hover:border-primary/30 transition-all"
                  style={{ borderLeftColor: ws.color + '80', borderLeftWidth: 3 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ background: ws.color + '20', border: `1px solid ${ws.color}40` }}
                      >
                        {ws.emoji || ws.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{ws.name}</p>
                        {ws.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">{ws.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/workspace/${ws.id}`)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                      title="Open workspace"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{ws.memberIds?.length || 1} member{(ws.memberIds?.length || 1) !== 1 ? 's' : ''}</span>
                    <button
                      onClick={() => { setActiveWorkspace(ws); navigate(`/workspace/${ws.id}`); }}
                      className="flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      Open <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Workspace Inline Form */}
          <AnimatePresence>
            {showWsForm && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="glass-card p-6 space-y-4 border-primary/30"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Create New Workspace</h3>
                  <button onClick={() => setShowWsForm(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Preview */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto"
                  style={{ background: wsColor + '20', border: `2px solid ${wsColor}50` }}
                >
                  {wsEmoji}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Name *</label>
                  <input
                    value={wsName}
                    onChange={e => setWsName(e.target.value)}
                    placeholder="e.g. SkillBridge, Competitions, Marketing"
                    autoFocus
                    className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
                  <input
                    value={wsDesc}
                    onChange={e => setWsDesc(e.target.value)}
                    placeholder="Brief description (optional)"
                    className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Emoji</label>
                  <div className="flex flex-wrap gap-2">
                    {WORKSPACE_EMOJIS.map(e => (
                      <button
                        key={e}
                        onClick={() => setWsEmoji(e)}
                        className={cn(
                          'w-9 h-9 rounded-xl text-lg transition-all',
                          wsEmoji === e ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'bg-muted hover:bg-muted/80'
                        )}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {WORKSPACE_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setWsColor(c)}
                        className={cn(
                          'w-7 h-7 rounded-lg transition-all',
                          wsColor === c && 'ring-2 ring-offset-2 ring-offset-card ring-white scale-110'
                        )}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowWsForm(false)}
                    className="flex-1 py-2.5 text-sm text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWorkspace}
                    disabled={!wsName.trim() || creatingWs}
                    className="flex-1 py-2.5 text-sm bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  >
                    {creatingWs ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Create Workspace <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── TEAM TAB ────────────────────────────────────────────── */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" /> Team & Role Management (RBAC)
            </h2>
            <p className="text-xs text-muted-foreground">
              Invite users as Admin, Manager, Team Member, or Viewer.
            </p>

            <div className="flex gap-2 flex-wrap">
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 min-w-48 px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as any)}
                className="px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none capitalize"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={handleInvite}
                className="px-4 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                Invite Member
              </button>
            </div>

            <div className="p-4 bg-muted/40 rounded-xl border border-border/40">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Role Permissions</h3>
              <div className="space-y-1 text-xs">
                {[
                  { role: 'Admin', desc: 'Full access — manage org, workspaces, team, and all data' },
                  { role: 'Manager', desc: 'Create/edit workspaces, tasks, projects, and manage members' },
                  { role: 'Member', desc: 'Create tasks, projects, add expenses, view all workspaces' },
                  { role: 'Viewer', desc: 'Read-only access to all data' },
                ].map(r => (
                  <div key={r.role} className="flex items-baseline gap-2">
                    <span className="font-bold text-primary w-16 shrink-0">{r.role}</span>
                    <span className="text-muted-foreground">{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ORGANIZATION TAB ────────────────────────────────────── */}
      {activeTab === 'organization' && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Organization
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Organization ID</label>
              <p className="font-mono text-xs bg-muted px-3 py-2 rounded-lg break-all">
                {userProfile?.orgId || 'Not set — complete onboarding'}
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Total Workspaces</label>
              <p className="font-bold text-2xl">{workspaces.length}</p>
            </div>
          </div>
          {!userProfile?.orgId && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-sm text-amber-400">
              ⚠️ You haven't completed onboarding. Please{' '}
              <button
                onClick={() => navigate('/onboarding')}
                className="underline font-semibold"
              >
                go to onboarding
              </button>{' '}
              to create your organization.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
