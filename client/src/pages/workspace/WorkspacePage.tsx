import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, onSnapshot, addDoc, serverTimestamp,
  doc, updateDoc, deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { COLLECTIONS } from '@/lib/collections';
import { MainTab, Project, CompetitionRound, InvitedMember } from '@/types';
import { sendCompetitionInvites, respondToCompetitionInvite, TEAM_ADMINS, AdminTeammate } from '@/lib/notificationHelper';
import {
  Plus, FolderKanban, Trophy, Sparkles, Link as LinkIcon,
  Trash2, X, ExternalLink, Pencil, Check, AlertTriangle,
  Globe, MapPin, Users, Calendar, Clock, Award, Target,
  Info, Loader2, ChevronRight, Layers, ArrowRight, Play, CheckCircle2, XCircle, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// Mandatory 4 Sub-Tab Status Categories
export type StatusCategoryTab = 'upcoming' | 'ongoing' | 'completed' | 'not_selected';

export const STATUS_SUB_TABS: { id: StatusCategoryTab; label: string; icon: string; color: string; bg: string; border: string }[] = [
  { id: 'upcoming',     label: 'Upcoming',                icon: '🔵', color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30' },
  { id: 'ongoing',      label: 'Ongoing',                 icon: '🟡', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  { id: 'completed',    label: 'Completed (Successful)',   icon: '🟢', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { id: 'not_selected', label: 'Not Selected (Unsuccessful)', icon: '🔴', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30' },
];

const STATUS_OPTIONS = [
  'Upcoming',
  'Ongoing',
  'Won / 1st Place',
  'Runner Up',
  'Finalist',
  'Selected / Qualified',
  'Completed',
  'Not Selected',
  'Eliminated',
  'Disqualified',
  'Cancelled',
] as const;

const MODE_OPTIONS   = ['Online', 'Offline', 'Hybrid'] as const;
const ROUND_NAMES   = ['R-1', 'R-2', 'R-3', 'Final Event'] as const;

const TAB_COLORS = [
  { bg: 'from-indigo-500/20 to-violet-600/20',  border: 'border-indigo-500/30',  icon: 'bg-indigo-500/20 text-indigo-400',  dot: 'bg-indigo-400'  },
  { bg: 'from-emerald-500/20 to-teal-600/20',   border: 'border-emerald-500/30', icon: 'bg-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400' },
  { bg: 'from-amber-500/20 to-orange-600/20',   border: 'border-amber-500/30',   icon: 'bg-amber-500/20 text-amber-400',    dot: 'bg-amber-400'   },
  { bg: 'from-rose-500/20 to-pink-600/20',      border: 'border-rose-500/30',    icon: 'bg-rose-500/20 text-rose-400',     dot: 'bg-rose-400'    },
  { bg: 'from-cyan-500/20 to-blue-600/20',      border: 'border-cyan-500/30',    icon: 'bg-cyan-500/20 text-cyan-400',     dot: 'bg-cyan-400'    },
  { bg: 'from-purple-500/20 to-fuchsia-600/20', border: 'border-purple-500/30',  icon: 'bg-purple-500/20 text-purple-400', dot: 'bg-purple-400'  },
];

const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
const emptyRounds = (): CompetitionRound[] => ROUND_NAMES.map(name => ({ name, deadline: '', requirement: '', status: 'upcoming' as const }));

// Determine which of the 4 mandatory sub-tabs an event belongs to
function getStatusTabCategory(status?: string, outcome?: string): StatusCategoryTab {
  const st = (status || '').toLowerCase();
  const out = (outcome || '').toLowerCase();
  const combined = `${st} ${out}`;

  // 🔴 Not Selected / Unsuccessful / Eliminated
  if (
    ['not selected', 'eliminated', 'disqualified', 'lost', 'rejected', 'unsuccessful', 'out'].some(k => combined.includes(k)) ||
    ['not selected', 'eliminated', 'disqualified'].includes(st)
  ) {
    return 'not_selected';
  }

  // 🟢 Completed / Successful
  if (
    ['won', 'winner', '1st', '2nd', '3rd', 'runner up', 'finalist', 'selected', 'qualified', 'completed'].some(k => combined.includes(k)) ||
    ['won / 1st place', 'runner up', 'finalist', 'selected / qualified', 'completed'].includes(st)
  ) {
    return 'completed';
  }

  // 🟡 Ongoing
  if (st === 'ongoing' || combined.includes('ongoing')) {
    return 'ongoing';
  }

  // 🔵 Upcoming (default)
  return 'upcoming';
}

// Color scheme generator for card styling
function getEventColorScheme(project: Project) {
  const cat = getStatusTabCategory(project.status, project.outcome);

  if (cat === 'not_selected') {
    return {
      type: 'red',
      border: 'border-l-red-500',
      glow: 'shadow-red-500/10',
      bg: 'bg-red-500/[0.04]',
      badge: 'bg-red-500/15 text-red-400 border-red-500/30',
      outcomeBg: 'bg-red-500/10 text-red-400 border border-red-500/20',
      iconColor: 'text-red-400',
    };
  }

  if (cat === 'ongoing') {
    return {
      type: 'amber',
      border: 'border-l-amber-400',
      glow: 'shadow-amber-500/10',
      bg: 'bg-amber-500/[0.03]',
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      outcomeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      iconColor: 'text-amber-400',
    };
  }

  if (cat === 'completed') {
    return {
      type: 'green',
      border: 'border-l-emerald-400',
      glow: 'shadow-emerald-500/10',
      bg: 'bg-emerald-500/[0.03]',
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      outcomeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      iconColor: 'text-emerald-400',
    };
  }

  return {
    type: 'blue',
    border: 'border-l-blue-500/60',
    glow: '',
    bg: '',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    outcomeBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    iconColor: 'text-blue-400',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Card with Admin Teammate Approvals & Action Buttons
// ─────────────────────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  currentUserId,
  currentUserName,
  onClick,
  onUpdateStatus,
}: {
  project: Project;
  currentUserId: string;
  currentUserName: string;
  onClick: () => void;
  onUpdateStatus: (projectId: string, newStatus: string, outcomeMessage?: string) => void;
}) {
  const done  = project.rounds?.filter(r => r.status === 'completed').length || 0;
  const total = project.rounds?.filter(r => r.name !== 'Final Event').length || 0;
  const next  = project.rounds?.find(r => r.deadline && r.status !== 'completed' && r.status !== 'skipped');
  const colors = getEventColorScheme(project);
  const cat = getStatusTabCategory(project.status, project.outcome);

  const invited = project.invitedMembers || [];
  const myInvite = invited.find(m => m.uid === currentUserId || m.name.toLowerCase() === currentUserName.toLowerCase());
  const isPendingMyResponse = myInvite && myInvite.status === 'pending';

  const handleRespond = (e: React.MouseEvent, resp: 'accepted' | 'declined') => {
    e.stopPropagation();
    respondToCompetitionInvite({
      eventId: project.id,
      eventName: project.name,
      workspaceId: project.workspaceId,
      userUid: currentUserId,
      userName: currentUserName,
      response: resp,
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onClick={onClick}
      className={cn(
        'glass-card p-5 cursor-pointer transition-all duration-200 group flex flex-col gap-3.5',
        'border-l-4 hover:scale-[1.01]',
        colors.border, colors.glow && `shadow-lg ${colors.glow}`, colors.bg,
        'hover:brightness-110'
      )}>

      {/* Header & Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-2 leading-tight">{project.name}</h3>
          {project.createdByName && (
            <p className="text-[11px] text-muted-foreground mt-0.5">Created by <span className="font-medium text-foreground">{project.createdByName}</span></p>
          )}
        </div>
        {project.status && (
          <span className={cn('text-xs px-2.5 py-0.5 rounded-full capitalize font-semibold shrink-0 border', colors.badge)}>
            {project.status}
          </span>
        )}
      </div>

      {/* Teammate Admin Participation & Approval Badges */}
      {invited.length > 0 && (
        <div className="p-2.5 bg-muted/40 rounded-xl space-y-1.5 border border-border/50">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-3 h-3 text-cyan-400" /> Admin Teammates ({invited.filter(m => m.status === 'accepted').length}/{invited.length} Ready)</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {invited.map(m => (
              <span key={m.name} className={cn('text-[10px] px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1',
                m.status === 'accepted' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                m.status === 'declined' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                'bg-amber-500/15 text-amber-400 border-amber-500/30'
              )}>
                {m.name} {m.role ? `(${m.role})` : ''}: {m.status === 'accepted' ? 'Ready ✅' : m.status === 'declined' ? 'Declined ❌' : 'Pending ⏳'}
              </span>
            ))}
          </div>

          {/* Quick Respond inside Card if current user is invited */}
          {isPendingMyResponse && (
            <div className="pt-1.5 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> You are invited!
              </span>
              <div className="flex gap-1.5">
                <button onClick={e => handleRespond(e, 'accepted')} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-sm transition-colors">
                  <Check className="w-3 h-3" /> Join (Ready)
                </button>
                <button onClick={e => handleRespond(e, 'declined')} className="px-2 py-1 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-lg text-[11px] font-medium transition-colors">
                  Decline
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meta tags */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {project.organizer  && <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-400"/>{project.organizer}</span>}
        {project.mode       && <span className="flex items-center gap-1"><Globe  className="w-3 h-3 text-indigo-400"/>{project.mode}</span>}
        {project.location   && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-400"/>{project.location}</span>}
      </div>

      {project.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{project.description}</p>}

      {/* Rounds list */}
      {project.rounds && project.rounds.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Rounds</span><span className="text-muted-foreground">{done}/{total} done</span></div>
          <div className="flex gap-1.5 flex-wrap">
            {project.rounds.map(r => (
              <span key={r.name} title={r.deadline ? `${r.name}: ${fmt(r.deadline)}${r.requirement ? '\n' + r.requirement : ''}` : r.name}
                className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium',
                  r.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                  r.status === 'ongoing'   ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                  r.status === 'skipped'   ? 'bg-muted text-muted-foreground border-border line-through' :
                  'bg-muted/60 text-muted-foreground border-border/50')}>
                {r.name}{r.deadline && <span className="ml-1 opacity-70">{fmt(r.deadline)}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Outcome detail badge */}
      {project.outcome ? (
        <div className={cn('flex items-start gap-1.5 text-xs rounded-lg p-2 font-medium', colors.outcomeBg)}>
          <Award className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', colors.iconColor)}/>
          <span className="line-clamp-2">{project.outcome}</span>
        </div>
      ) : next?.deadline ? (
        <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-2.5 py-1.5">
          <Clock className="w-3 h-3"/><span>Next: {next.name} — {fmt(next.deadline)}</span>
        </div>
      ) : null}

      {/* Workflow Transition Buttons */}
      <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
        {cat === 'upcoming' && (
          <button
            onClick={() => onUpdateStatus(project.id, 'Ongoing')}
            className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Move to Ongoing
          </button>
        )}

        {cat === 'ongoing' && (
          <div className="flex gap-2 w-full">
            <button
              onClick={() => onUpdateStatus(project.id, 'Won / 1st Place', 'Won / Successful Competition')}
              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Successful
            </button>
            <button
              onClick={() => onUpdateStatus(project.id, 'Not Selected', 'Not Selected / Eliminated')}
              className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all shadow-sm"
            >
              <XCircle className="w-3.5 h-3.5" /> Not Selected
            </button>
          </div>
        )}

        {project.link && (
          <a href={project.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary ml-auto text-xs flex items-center gap-1">
            <span>Link</span> <ExternalLink className="w-3 h-3"/>
          </a>
        )}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Tab Card
// ─────────────────────────────────────────────────────────────────────────────
function MainTabCard({ tab, colorIdx, isActive, projectCount, onSelect, onEdit, onDelete }:
  { tab: MainTab; colorIdx: number; isActive: boolean; projectCount: number;
    onSelect: () => void; onEdit: () => void; onDelete: () => void }) {
  const c = TAB_COLORS[colorIdx % TAB_COLORS.length];
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      onClick={onSelect}
      className={cn('relative group/card rounded-2xl border-2 p-5 cursor-pointer transition-all duration-200 flex flex-col gap-3 min-h-[120px]',
        `bg-gradient-to-br ${c.bg}`, isActive ? `${c.border} shadow-lg shadow-black/20 scale-[1.02]` : 'border-border/40 hover:border-border/70')}>

      {isActive && <motion.div layoutId="tab-dot" className={cn('absolute top-3 right-3 w-2.5 h-2.5 rounded-full', c.dot)}/>}

      <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-all z-10">
        <button onClick={e => { e.stopPropagation(); onEdit(); }} className="w-6 h-6 rounded-lg bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground">
          <Pencil className="w-3 h-3"/>
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="w-6 h-6 rounded-lg bg-red-500/20 backdrop-blur flex items-center justify-center text-red-400 hover:bg-red-500/40">
          <Trash2 className="w-3 h-3"/>
        </button>
      </div>

      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.icon)}>
        <Layers className="w-5 h-5"/>
      </div>
      <h3 className="font-bold text-sm leading-tight">{tab.name}</h3>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t border-white/10 pt-2 mt-auto">
        <FolderKanban className="w-3 h-3"/>
        <span>{projectCount} events</span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace Page
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { userProfile, currentUser }  = useAuth();
  const { workspaces, updateWorkspace, deleteWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const currentUserId = userProfile?.id || currentUser?.uid || '';
  const currentUserName = userProfile?.displayName || currentUser?.email || 'Admin';

  const ws = workspaces.find(w => w.id === workspaceId);

  // ── State ──────────────────────────────────────────────────────────────────
  const [mainTabs,       setMainTabs]       = useState<MainTab[]>([]);
  const [activeTabId,    setActiveTabId]    = useState<string | null>(null);
  const [projectCounts,  setProjectCounts]  = useState<Record<string, number>>({});
  const [projects,       setProjects]       = useState<Project[]>([]);
  const [loading,        setLoading]        = useState(true);

  // Active Mandatory Sub-Tab Filter (Upcoming, Ongoing, Completed, Not Selected)
  const [activeSubTab, setActiveSubTab] = useState<StatusCategoryTab>('upcoming');

  // Workspace rename/delete
  const [editingWsName,  setEditingWsName]  = useState(false);
  const [wsNameVal,      setWsNameVal]      = useState('');
  const [showDeleteWs,   setShowDeleteWs]   = useState(false);
  const [deletingWs,     setDeletingWs]     = useState(false);
  const wsNameRef = useRef<HTMLInputElement>(null);

  // Main tab create/edit/delete
  const [showTabModal,   setShowTabModal]   = useState(false);
  const [newTabName,     setNewTabName]     = useState('');
  const [editingTab,     setEditingTab]     = useState<MainTab | null>(null);
  const [editTabName,    setEditTabName]    = useState('');
  const [deletingTabId,  setDeletingTabId]  = useState<string | null>(null);

  // Project event modal
  const [showEventModal,   setShowEventModal]   = useState(false);
  const [editingProject,   setEditingProject]   = useState<Project | null>(null);
  const [isScraping,       setIsScraping]       = useState(false);
  const [isSaving,         setIsSaving]         = useState(false);

  // Form fields
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pLink, setPLink] = useState('');
  const [pStatus, setPStatus] = useState('Upcoming');
  const [pOrg,  setPOrg]  = useState('');
  const [pMode, setPMode] = useState('Online');
  const [pLoc,  setPLoc]  = useState('');
  const [pTeam, setPTeam] = useState('');
  const [pRounds, setPRounds] = useState<CompetitionRound[]>(emptyRounds());
  const [pOutcome, setPOutcome] = useState('');
  const [pPrize,   setPPrize]   = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');

  // Selected Admin Teammates for Invite Flow
  const [selectedInvites, setSelectedInvites] = useState<AdminTeammate[]>([]);

  const resetForm = () => {
    setEditingProject(null); setPName(''); setPDesc(''); setPLink(''); setPStatus('Upcoming');
    setPOrg(''); setPMode('Online'); setPLoc(''); setPTeam('');
    setPRounds(emptyRounds()); setPOutcome(''); setPPrize(''); setScrapeUrl('');
    // Default selected invites: include creator and all admins
    setSelectedInvites(TEAM_ADMINS);
  };

  const openEvent = (proj?: Project) => {
    if (proj) {
      setEditingProject(proj);
      setPName(proj.name || ''); setPDesc(proj.description || ''); setPLink(proj.link || proj.website || '');
      setPStatus(proj.status || 'Upcoming'); setPOrg(proj.organizer || ''); setPMode(proj.mode || 'Online');
      setPLoc(proj.location || ''); setPTeam(proj.teamMembers?.join(', ') || '');
      setPRounds(proj.rounds?.length ? proj.rounds : emptyRounds());
      setPOutcome(proj.outcome || ''); setPPrize(proj.prize || ''); setScrapeUrl('');

      // Populate selected invites from project
      if (proj.invitedMembers && proj.invitedMembers.length > 0) {
        const matched = TEAM_ADMINS.filter(a =>
          proj.invitedMembers?.some(m => m.uid === a.uid || m.name.toLowerCase() === a.name.toLowerCase())
        );
        setSelectedInvites(matched.length > 0 ? matched : TEAM_ADMINS);
      } else {
        setSelectedInvites(TEAM_ADMINS);
      }
    } else {
      resetForm();
    }
    setShowEventModal(true);
  };

  // Load Main Tabs
  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    const q = query(collection(db, COLLECTIONS.MAIN_TABS), where('workspaceId', '==', workspaceId));
    return onSnapshot(q, snap => {
      const tabs = snap.docs.map(d => ({ id: d.id, ...d.data() } as MainTab))
        .sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0));
      setMainTabs(tabs);
      setActiveTabId(prev => (prev && tabs.find(t => t.id === prev)) ? prev : tabs[0]?.id || null);
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });
  }, [workspaceId]);

  // Project counts per tab
  useEffect(() => {
    if (!mainTabs.length) return;
    const unsubs = mainTabs.map(tab =>
      onSnapshot(query(collection(db, COLLECTIONS.PROJECTS), where('mainTabId', '==', tab.id)), snap =>
        setProjectCounts(prev => ({ ...prev, [tab.id]: snap.size }))
      )
    );
    return () => unsubs.forEach(u => u());
  }, [mainTabs]);

  // Projects for active tab
  useEffect(() => {
    if (!activeTabId) { setProjects([]); return; }
    return onSnapshot(
      query(collection(db, COLLECTIONS.PROJECTS), where('mainTabId', '==', activeTabId)),
      snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)))
    );
  }, [activeTabId]);

  // Main tab CRUD
  const createTab = async () => {
    if (!newTabName.trim() || !workspaceId || !userProfile?.orgId) return;
    try {
      const ref = await addDoc(collection(db, COLLECTIONS.MAIN_TABS), {
        workspaceId, orgId: userProfile.orgId, name: newTabName.trim(),
        order: mainTabs.length, fields: [], views: [], createdBy: userProfile.id, createdAt: serverTimestamp(),
      });
      setNewTabName(''); setShowTabModal(false); setActiveTabId(ref.id); toast.success('Category created');
    } catch { toast.error('Failed to create category'); }
  };

  const saveTabEdit = async () => {
    if (!editingTab || !editTabName.trim()) { setEditingTab(null); return; }
    try { await updateDoc(doc(db, COLLECTIONS.MAIN_TABS, editingTab.id), { name: editTabName.trim(), updatedAt: serverTimestamp() }); toast.success('Renamed'); }
    catch { toast.error('Failed to rename'); }
    setEditingTab(null);
  };

  const deleteTab = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.MAIN_TABS, id));
      if (activeTabId === id) setActiveTabId(mainTabs.find(t => t.id !== id)?.id || null);
      toast.success('Category deleted');
    } catch { toast.error('Failed to delete'); }
    setDeletingTabId(null);
  };

  // Quick Status Updates from Event Card (e.g. Move to Ongoing, Mark Successful/Unsuccessful)
  const handleUpdateStatus = async (projectId: string, newStatus: string, outcomeMessage?: string) => {
    try {
      const payload: Record<string, unknown> = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };
      if (outcomeMessage) payload.outcome = outcomeMessage;

      await updateDoc(doc(db, COLLECTIONS.PROJECTS, projectId), payload);
      toast.success(`Event status updated to "${newStatus}"! Automatically moved to respective tab.`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update status');
    }
  };

  // Save Event with Teammate Admin Invites & Trigger Notifications/Emails
  const saveEvent = async () => {
    if (!pName.trim() || !activeTabId || !workspaceId || !userProfile?.orgId) {
      toast.error('Enter an event name');
      return;
    }
    setIsSaving(true);

    // Format invited members array
    const invitedMembersData: InvitedMember[] = selectedInvites.map(admin => {
      const existing = editingProject?.invitedMembers?.find(m => m.uid === admin.uid || m.name === admin.name);
      return {
        uid: admin.uid,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: existing ? existing.status : (admin.name === currentUserName || admin.name === 'Ruturaj' ? 'accepted' : 'pending'),
        respondedAt: existing?.respondedAt || (admin.name === currentUserName ? new Date().toISOString() : undefined),
      };
    });

    const teamNames = invitedMembersData.filter(m => m.status === 'accepted').map(m => m.name);

    const payload: Partial<Project> = {
      name: pName.trim(),
      description: pDesc.trim(),
      link: pLink.trim(),
      status: pStatus,
      organizer: pOrg.trim(),
      mode: pMode as any,
      location: pLoc.trim(),
      teamMembers: teamNames.length > 0 ? teamNames : pTeam.split(',').map(s => s.trim()).filter(Boolean),
      invitedMembers: invitedMembersData,
      rounds: pRounds,
      outcome: pOutcome.trim(),
      prize: pPrize.trim(),
      isScraped: !!scrapeUrl,
      scrapedUrl: scrapeUrl || '',
      fieldValues: {},
    };

    try {
      if (editingProject) {
        await updateDoc(doc(db, COLLECTIONS.PROJECTS, editingProject.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        toast.success('Event updated');
      } else {
        const docRef = await addDoc(collection(db, COLLECTIONS.PROJECTS), {
          ...payload,
          mainTabId: activeTabId,
          subTabId: '',
          workspaceId,
          orgId: userProfile.orgId,
          createdBy: currentUserId,
          createdByName: currentUserName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Trigger Notifications & Email Alerts to Invited Admins!
        await sendCompetitionInvites({
          eventId: docRef.id,
          eventName: pName.trim(),
          workspaceId,
          senderId: currentUserId,
          senderName: currentUserName,
          invitedMembers: invitedMembersData,
        });
      }

      resetForm();
      setShowEventModal(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to save event');
    }
    setIsSaving(false);
  };

  const deleteEvent = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"?`)) return;
    try { await deleteDoc(doc(db, COLLECTIONS.PROJECTS, id)); toast.success('Deleted'); }
    catch { toast.error('Failed'); }
  };

  const updateRound = (i: number, f: keyof CompetitionRound, v: string) =>
    setPRounds(prev => prev.map((r, idx) => idx === i ? { ...r, [f]: v } : r));

  const activeTab = mainTabs.find(t => t.id === activeTabId);

  // Filter projects into the 4 mandatory sub-tabs
  const filteredProjects = projects.filter(p => getStatusTabCategory(p.status, p.outcome) === activeSubTab);

  // Counts per mandatory sub-tab
  const subTabCounts = {
    upcoming: projects.filter(p => getStatusTabCategory(p.status, p.outcome) === 'upcoming').length,
    ongoing: projects.filter(p => getStatusTabCategory(p.status, p.outcome) === 'ongoing').length,
    completed: projects.filter(p => getStatusTabCategory(p.status, p.outcome) === 'completed').length,
    not_selected: projects.filter(p => getStatusTabCategory(p.status, p.outcome) === 'not_selected').length,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Workspace Banner */}
      <div className="glass-card p-6 border-l-4" style={{ borderLeftColor: ws?.color || '#6366f1' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-3xl">{ws?.emoji || '💼'}</span>
            <div className="flex-1 min-w-0">
              {editingWsName ? (
                <div className="flex items-center gap-2">
                  <input ref={wsNameRef} value={wsNameVal} onChange={e => setWsNameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { updateWorkspace(workspaceId!, { name: wsNameVal.trim() }); setEditingWsName(false); } }}
                    className="text-xl font-bold bg-input border border-primary rounded-lg px-3 py-1 outline-none max-w-xs w-full" />
                  <button onClick={() => { updateWorkspace(workspaceId!, { name: wsNameVal.trim() }); setEditingWsName(false); }} className="p-1.5 rounded-lg bg-primary text-white"><Check className="w-4 h-4"/></button>
                  <button onClick={() => setEditingWsName(false)} className="p-1.5 rounded-lg bg-muted text-muted-foreground"><X className="w-4 h-4"/></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/n">
                  <h1 className="text-2xl font-bold truncate">{ws?.name || 'Workspace'}</h1>
                  <button onClick={() => { setWsNameVal(ws?.name || ''); setEditingWsName(true); }} className="opacity-0 group-hover/n:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-all"><Pencil className="w-3.5 h-3.5"/></button>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-0.5">{ws?.description || 'Track projects, tasks, competitions, and events'}</p>
            </div>
          </div>
          <button onClick={() => setShowDeleteWs(true)} className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4"/></button>
        </div>
      </div>

      {/* Competition Categories (Main Tabs Grid) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</h2>
          <button onClick={() => setShowTabModal(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40 px-3 py-1.5 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5"/> Add Category
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground p-4"><Loader2 className="w-4 h-4 animate-spin"/> Loading…</div>
        ) : mainTabs.length === 0 ? (
          <div className="glass-card p-8 text-center flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Layers className="w-5 h-5"/></div>
            <p className="text-sm text-muted-foreground">No categories yet. Create your first one.</p>
            <button onClick={() => setShowTabModal(true)} className="text-sm text-primary font-medium hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> Create Category</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {mainTabs.map((tab, idx) => (
              <MainTabCard key={tab.id} tab={tab} colorIdx={idx}
                isActive={activeTabId === tab.id}
                projectCount={projectCounts[tab.id] || 0}
                onSelect={() => setActiveTabId(tab.id)}
                onEdit={() => { setEditingTab(tab); setEditTabName(tab.name); }}
                onDelete={() => setDeletingTabId(tab.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Active Category Panel with 4 Mandatory Status Sub-Tabs */}
      <AnimatePresence mode="wait">
        {activeTab && (
          <motion.div key={activeTabId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            
            {/* Category Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-muted-foreground"/>
                <h3 className="font-bold text-lg">{activeTab.name}</h3>
                <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">{projects.length} total events</span>
              </div>
              <button onClick={() => openEvent()}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-all">
                <Plus className="w-4 h-4"/> New Event
              </button>
            </div>

            {/* ── 4 Mandatory Status Sub-Tabs ───────────────────────────────────── */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1.5 bg-muted/30 border border-border/50 rounded-2xl">
              {STATUS_SUB_TABS.map(tab => {
                const count = subTabCounts[tab.id];
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
                      isActive
                        ? 'bg-card text-foreground shadow-md border border-border'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', tab.bg, tab.color, tab.border)}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Events Grid for selected Sub-Tab */}
            {filteredProjects.length === 0 ? (
              <div className="glass-card p-10 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><FolderKanban className="w-6 h-6"/></div>
                <h3 className="font-semibold">No events in "{STATUS_SUB_TABS.find(t => t.id === activeSubTab)?.label}"</h3>
                <p className="text-sm text-muted-foreground max-w-sm">Events will automatically move here as their status progresses.</p>
                <button onClick={() => openEvent()} className="mt-2 text-sm text-primary font-medium hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> Create Event</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map(proj => (
                  <div key={proj.id} className="relative group/card">
                    <ProjectCard
                      project={proj}
                      currentUserId={currentUserId}
                      currentUserName={currentUserName}
                      onClick={() => openEvent(proj)}
                      onUpdateStatus={handleUpdateStatus}
                    />
                    <button onClick={e => deleteEvent(proj.id, proj.name, e)}
                      className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 p-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all z-10">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════ MODALS ══════════════════════ */}

      {/* Event Create / Edit Modal with Admin Teammate Selection & Trigger */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="bg-card border border-border rounded-2xl w-full max-w-2xl my-8 shadow-2xl">
              
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div>
                  <h3 className="text-lg font-bold">{editingProject ? 'Edit Event' : `Add Event to ${activeTab?.name}`}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Created by <span className="font-semibold text-foreground">{currentUserName} (Owner / Admin)</span></p>
                </div>
                <button onClick={() => { resetForm(); setShowEventModal(false); }} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">

                {/* Select Admin Teammates & Trigger Notifications/Emails */}
                <div className="p-4 bg-primary/[0.04] border border-primary/20 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                      <Users className="w-4 h-4" /> Select Teammate Admins to Invite / Request Participation
                    </label>
                    <span className="text-[11px] text-muted-foreground">All 4 members are Admins</span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Invited Admins will receive an in-app Notification Alert + Email Trigger to respond (Join / Decline) on their screen.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {TEAM_ADMINS.map(admin => {
                      const isSelected = selectedInvites.some(a => a.uid === admin.uid || a.name === admin.name);
                      return (
                        <div
                          key={admin.name}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedInvites(selectedInvites.filter(a => a.name !== admin.name));
                            } else {
                              setSelectedInvites([...selectedInvites, admin]);
                            }
                          }}
                          className={cn(
                            'p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all',
                            isSelected
                              ? 'bg-primary/10 border-primary/40 text-foreground'
                              : 'bg-muted/40 border-border/60 text-muted-foreground hover:border-border'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                              {admin.name[0]}
                            </div>
                            <div>
                              <p className="text-xs font-semibold">{admin.name}</p>
                              <p className="text-[10px] text-muted-foreground">{admin.role}</p>
                            </div>
                          </div>
                          <div className={cn('w-4 h-4 rounded-md border flex items-center justify-center text-white text-[10px]', isSelected ? 'bg-primary border-primary' : 'border-border')}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Basic info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Info className="w-3.5 h-3.5"/> Basic Information</h4>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Event Name *</label>
                    <input value={pName} onChange={e => setPName(e.target.value)} placeholder="e.g. Hacksagon 2026, AIBoomi, Startup Bootcamp"
                      className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                      <select value={pStatus} onChange={e => setPStatus(e.target.value)} className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary">
                        <option value="Upcoming">🔵 Upcoming (Initial Stage)</option>
                        <option value="Ongoing">🟡 Ongoing (In Progress)</option>
                        <option value="Completed">🟢 Completed (Successful)</option>
                        <option value="Not Selected">🔴 Not Selected (Unsuccessful)</option>
                        <option value="Eliminated">🔴 Eliminated</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Mode</label>
                      <select value={pMode} onChange={e => setPMode(e.target.value)} className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary">
                        {MODE_OPTIONS.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Organized By</label>
                      <input value={pOrg} onChange={e => setPOrg(e.target.value)} placeholder="e.g. SPPU, IIT Bombay" className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"/></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Location & Venue</label>
                      <input value={pLoc} onChange={e => setPLoc(e.target.value)} placeholder="e.g. Pune, SIT Lonavala" className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"/></div>
                  </div>

                  <div><label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><LinkIcon className="w-3 h-3"/> Competition Link</label>
                    <input value={pLink} onChange={e => setPLink(e.target.value)} placeholder="https://…" className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"/></div>
                  <div><label className="text-xs text-muted-foreground mb-1 block">Description</label>
                    <textarea value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="What the competition is about…" rows={2}
                      className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary resize-none"/></div>
                </div>

                {/* Rounds */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Target className="w-3.5 h-3.5"/> Rounds & Deadlines</h4>
                  {pRounds.map((r, i) => (
                    <div key={r.name} className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{r.name}</span>
                        <select value={r.status || 'upcoming'} onChange={e => updateRound(i, 'status', e.target.value)}
                          className="text-xs bg-input border border-border rounded-lg px-2 py-1 outline-none focus:border-primary">
                          <option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option>
                          <option value="completed">Completed</option><option value="skipped">Skipped</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] text-muted-foreground mb-1 block flex items-center gap-1"><Calendar className="w-2.5 h-2.5"/> Deadline</label>
                          <input type="date" value={r.deadline || ''} onChange={e => updateRound(i, 'deadline', e.target.value)}
                            className="w-full px-2 py-1.5 bg-input border border-border rounded-lg text-xs outline-none focus:border-primary"/></div>
                        <div><label className="text-[10px] text-muted-foreground mb-1 block">Requirement</label>
                          <input value={r.requirement || ''} onChange={e => updateRound(i, 'requirement', e.target.value)} placeholder="What to submit…"
                            className="w-full px-2 py-1.5 bg-input border border-border rounded-lg text-xs outline-none focus:border-primary"/></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Result & Outcome */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Award className="w-3.5 h-3.5"/> Result & Outcome Detail</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Prize / Reward</label>
                      <input value={pPrize} onChange={e => setPPrize(e.target.value)} placeholder="e.g. ₹50,000 / 1st Place"
                        className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"/></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Overall Outcome Note</label>
                      <input value={pOutcome} onChange={e => setPOutcome(e.target.value)} placeholder="e.g. Won 1st Place, Finalist, Not Selected For Zonal Round"
                        className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"/></div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-2 p-6 border-t border-border">
                <button onClick={() => { resetForm(); setShowEventModal(false); }} className="px-5 py-2.5 text-sm text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl">Cancel</button>
                <button onClick={saveEvent} disabled={!pName.trim() || isSaving}
                  className="px-5 py-2.5 text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                  {editingProject ? 'Save Changes' : 'Create Event & Trigger Invites'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Create Main Tab Category */}
      {showTabModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold">New Competition Category</h3>
            <input value={newTabName} onChange={e => setNewTabName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createTab()}
              placeholder="e.g. Business Competitions, Tech Hackathons…" autoFocus
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"/>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowTabModal(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={createTab} className="px-4 py-2 text-sm bg-primary text-white rounded-xl font-medium">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Category */}
      <AnimatePresence>
        {editingTab && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4">
              <h3 className="text-lg font-bold">Rename Category</h3>
              <input value={editTabName} onChange={e => setEditTabName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTabEdit(); if (e.key === 'Escape') setEditingTab(null); }} autoFocus
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"/>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingTab(null)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
                <button onClick={saveTabEdit} className="px-4 py-2 text-sm bg-primary text-white rounded-xl font-medium">Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Delete Category */}
      <AnimatePresence>
        {deletingTabId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-red-500/30 p-6 rounded-2xl w-full max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400"><AlertTriangle className="w-5 h-5"/></div>
                <h3 className="font-bold">Delete Category?</h3>
              </div>
              <p className="text-sm text-muted-foreground">Delete <span className="font-semibold text-foreground">"{mainTabs.find(t => t.id === deletingTabId)?.name}"</span>? All events inside will be deleted.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeletingTabId(null)} className="flex-1 py-2.5 text-sm bg-muted rounded-xl">Cancel</button>
                <button onClick={() => deleteTab(deletingTabId)} className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4"/> Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Delete Workspace */}
      <AnimatePresence>
        {showDeleteWs && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-red-500/30 p-6 rounded-2xl w-full max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400"><AlertTriangle className="w-5 h-5"/></div>
                <div><h3 className="font-bold">Delete Workspace?</h3><p className="text-xs text-muted-foreground">This cannot be undone.</p></div>
              </div>
              <p className="text-sm text-muted-foreground">Delete <span className="font-semibold text-foreground">"{ws?.name}"</span> and all its content?</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteWs(false)} className="flex-1 py-2.5 text-sm bg-muted rounded-xl">Cancel</button>
                <button onClick={async () => {
                  setDeletingWs(true);
                  await deleteWorkspace(workspaceId!);
                  toast.success('Workspace deleted');
                  const rem = workspaces.filter(w => w.id !== workspaceId);
                  navigate(rem.length ? `/workspace/${rem[0].id}` : '/dashboard');
                }} disabled={deletingWs} className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                  {deletingWs ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4"/>} Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
