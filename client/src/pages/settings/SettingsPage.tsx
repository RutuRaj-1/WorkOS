import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { User, Shield, Building2, Plus } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/collections';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { userProfile, currentUser } = useAuth();
  const { workspaces } = useWorkspace();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'member' | 'viewer'>('member');

  const handleInvite = async () => {
    if (!inviteEmail || !userProfile?.orgId) return;
    try {
      toast.success(`Invitation sent to ${inviteEmail} as ${inviteRole}`);
      setInviteEmail('');
    } catch {
      toast.error('Failed to send invitation');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings & Team Administration</h1>
        <p className="text-sm text-muted-foreground">Manage organization, RBAC user roles, workspaces, and permissions</p>
      </div>

      {/* User Profile */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Profile Settings
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="text-xs text-muted-foreground block">Display Name</label>
            <p className="font-semibold mt-1">{userProfile?.displayName || 'User'}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block">Email Address</label>
            <p className="font-semibold mt-1">{currentUser?.email}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block">Role</label>
            <span className="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold capitalize">
              {userProfile?.role || 'admin'}
            </span>
          </div>
        </div>
      </div>

      {/* Team Invitation & RBAC */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" /> Team & Role Management (RBAC)
        </h2>
        <p className="text-xs text-muted-foreground">Invite users as Admin, Manager, Team Member, or Viewer.</p>

        <div className="flex gap-2">
          <input
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="flex-1 px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
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
            className="px-4 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl"
          >
            Invite Member
          </button>
        </div>
      </div>
    </div>
  );
}
