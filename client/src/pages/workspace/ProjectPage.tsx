import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  doc, onSnapshot, collection, query, where, orderBy, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { Project, Task, Expense, Comment, WorkDocument } from '@/types';
import {
  Trophy, Globe, Calendar as CalendarIcon, CheckSquare, IndianRupee,
  FileText, MessageSquare, Activity, ExternalLink, Plus, Sparkles, User
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'expenses' | 'discussion' | 'documents'>('overview');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [documents, setDocuments] = useState<WorkDocument[]>([]);

  const [newComment, setNewComment] = useState('');

  // Fetch Project
  useEffect(() => {
    if (!projectId) return;
    const unsub = onSnapshot(doc(db, COLLECTIONS.PROJECTS, projectId), snap => {
      if (snap.exists()) {
        setProject({ id: snap.id, ...snap.data() } as Project);
      }
    });
    return unsub;
  }, [projectId]);

  // Fetch Tasks
  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, COLLECTIONS.TASKS), where('projectId', '==', projectId));
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
    return unsub;
  }, [projectId]);

  // Fetch Expenses
  useEffect(() => {
    if (!projectId) return;
    const q = query(collection(db, COLLECTIONS.EXPENSES), where('projectId', '==', projectId));
    const unsub = onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    });
    return unsub;
  }, [projectId]);

  // Fetch Comments
  useEffect(() => {
    if (!projectId) return;
    const q = query(
      collection(db, COLLECTIONS.COMMENTS),
      where('entityId', '==', projectId),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });
    return unsub;
  }, [projectId]);

  const handlePostComment = async () => {
    if (!newComment || !projectId || !userProfile) return;
    try {
      await addDoc(collection(db, COLLECTIONS.COMMENTS), {
        entityType: 'project',
        entityId: projectId,
        userId: userProfile.id,
        userName: userProfile.displayName || 'User',
        content: newComment,
        createdAt: serverTimestamp(),
      });
      setNewComment('');
      toast.success('Comment posted');
    } catch {
      toast.error('Failed to post comment');
    }
  };

  const totalExpense = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  if (!project) return <div className="p-8 text-center text-muted-foreground">Loading project...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Project Header Banner */}
      <div className="glass-card p-6 border-l-4 border-indigo-500 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <span className={cn('text-xs px-2.5 py-0.5 rounded-full capitalize font-medium', `status-${project.status}`)}>
                {project.status}
              </span>
              {project.isScraped && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Scraped
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground max-w-2xl">{project.description}</p>
            )}
          </div>

          {project.website && (
            <a
              href={project.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl transition-colors font-medium self-start md:self-auto"
            >
              <Globe className="w-3.5 h-3.5" /> Visit Competition Site <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Quick Metadata Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border/40 text-xs">
          <div>
            <span className="text-muted-foreground block">Organizer</span>
            <span className="font-semibold">{project.organizer || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Prize Pool</span>
            <span className="font-semibold text-emerald-400">{project.prize || 'N/A'}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Tasks</span>
            <span className="font-semibold">{tasks.length} tasks</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Total Expenses</span>
            <span className="font-semibold text-amber-400">₹{totalExpense.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border/50 gap-4">
        {[
          { id: 'overview', label: 'Overview', icon: Trophy },
          { id: 'tasks', label: `Tasks (${tasks.length})`, icon: CheckSquare },
          { id: 'expenses', label: `Expenses (₹${totalExpense})`, icon: IndianRupee },
          { id: 'discussion', label: `Discussion (${comments.length})`, icon: MessageSquare },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Rounds */}
            {project.rounds && project.rounds.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" /> Competition Rounds
                </h3>
                <div className="space-y-2">
                  {project.rounds.map((round: { name: string; status?: string }, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                      <span className="text-sm font-medium">{round.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {round.status || 'Upcoming'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements / Eligibility */}
            <div className="glass-card p-5 space-y-4">
              {project.eligibility && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Eligibility</h4>
                  <p className="text-sm text-foreground">{project.eligibility}</p>
                </div>
              )}
              {project.timeline && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Timeline</h4>
                  <p className="text-sm text-foreground">{project.timeline}</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-3">Project Actions</h3>
              <button
                onClick={() => navigate('/tasks')}
                className="w-full py-2.5 bg-primary text-white text-xs font-semibold rounded-xl"
              >
                Manage Tasks in Kanban
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-semibold text-base mb-2">Project Tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned to this project yet.</p>
          ) : (
            tasks.map(t => (
              <div key={t.id} className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                <span className="text-sm font-medium">{t.title}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded capitalize', `status-${t.status}`)}>
                  {t.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-semibold text-base mb-2">Expenses Breakdown</h3>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded for this project.</p>
          ) : (
            expenses.map(e => (
              <div key={e.id} className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{e.description}</p>
                  <span className="text-xs text-muted-foreground capitalize">{e.category}</span>
                </div>
                <span className="text-sm font-bold text-amber-400">₹{e.amount}</span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'discussion' && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-semibold text-base">Discussion & Comments</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet. Start the conversation!</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="p-3 bg-muted/40 rounded-xl flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-xs">
                    {c.userName[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{c.userName}</span>
                    </div>
                    <p className="text-sm text-foreground/90 mt-1">{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Write a comment or @mention team..."
              className="flex-1 px-4 py-2 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handlePostComment}
              className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
