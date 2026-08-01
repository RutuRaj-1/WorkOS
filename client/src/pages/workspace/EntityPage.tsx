import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, onSnapshot, collection, query, where, orderBy, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { Entity, Task, Expense, Comment, WorkDocument } from '@/types';
import DynamicFieldRenderer from '@/components/fields/DynamicFieldRenderer';
import {
  Trophy, Globe, CheckSquare, DollarSign, FileText, MessageSquare,
  Zap, ExternalLink, Plus, Sparkles, User, ArrowLeft, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EntityPage() {
  const { workspaceId, moduleId, entityId } = useParams<{ workspaceId: string; moduleId: string; entityId: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [entity, setEntity] = useState<Entity | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'knowledge' | 'finance' | 'discussion'>('overview');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [documents, setDocuments] = useState<WorkDocument[]>([]);
  const [newComment, setNewComment] = useState('');

  // Fetch Entity Record
  useEffect(() => {
    if (!entityId) return;
    const unsub = onSnapshot(doc(db, COLLECTIONS.ENTITIES, entityId), snap => {
      if (snap.exists()) {
        setEntity({ id: snap.id, ...snap.data() } as Entity);
      }
    });
    return unsub;
  }, [entityId]);

  // Fetch Tasks
  useEffect(() => {
    if (!entityId) return;
    const q = query(collection(db, COLLECTIONS.TASKS), where('entityId', '==', entityId));
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });
    return unsub;
  }, [entityId]);

  // Fetch Expenses
  useEffect(() => {
    if (!entityId) return;
    const q = query(collection(db, COLLECTIONS.EXPENSES), where('entityId', '==', entityId));
    const unsub = onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    });
    return unsub;
  }, [entityId]);

  // Fetch Comments
  useEffect(() => {
    if (!entityId) return;
    const q = query(
      collection(db, COLLECTIONS.COMMENTS),
      where('entityId', '==', entityId),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });
    return unsub;
  }, [entityId]);

  const handlePostComment = async () => {
    if (!newComment || !entityId || !userProfile) return;
    try {
      await addDoc(collection(db, COLLECTIONS.COMMENTS), {
        entityType: 'entity',
        entityId,
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

  if (!entity) return <div className="p-8 text-center text-muted-foreground">Loading Entity Workspace...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => navigate(`/workspace/${workspaceId}/module/${moduleId}`)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Module Grid
      </button>

      {/* Entity Banner */}
      <div className="glass-card p-6 border-l-4 border-indigo-500 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{entity.name}</h1>
              {entity.isScraped && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Auto-Scraped
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">Entity ID: {entity.id}</p>
          </div>

          {Boolean(entity.fieldValues?.website) && (
            <a
              href={String(entity.fieldValues.website)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl transition-colors font-medium self-start md:self-auto"
            >
              <Globe className="w-3.5 h-3.5" /> Visit Site <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/50 gap-4">
        {[
          { id: 'overview', label: 'Overview & Custom Fields', icon: Trophy },
          { id: 'tasks', label: `Tasks (${tasks.length})`, icon: CheckSquare },
          { id: 'knowledge', label: 'Knowledge & Notes', icon: FileText },
          { id: 'finance', label: `Finance (₹${totalExpense})`, icon: DollarSign },
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

      {/* Overview Tab: Dynamic Field Values Grid */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 glass-card p-6 space-y-4">
            <h3 className="font-semibold text-base border-b border-border/40 pb-2">Custom Field Values</h3>
            {Object.keys(entity.fieldValues || {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">No field values recorded yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(entity.fieldValues).map(([key, val]) => (
                  <div key={key} className="p-3 bg-muted/30 rounded-xl border border-border/40">
                    <span className="text-xs font-bold uppercase text-muted-foreground block mb-1">{key}</span>
                    <span className="text-sm font-semibold">{String(val || '')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Quick Actions</h3>
            <button
              onClick={() => navigate('/tasks')}
              className="w-full py-2.5 bg-primary text-white text-xs font-semibold rounded-xl"
            >
              Open Global Kanban
            </button>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-semibold text-base mb-2">Entity Tasks</h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned to this entity yet.</p>
          ) : (
            tasks.map(t => (
              <div key={t.id} className="p-3 bg-muted/40 rounded-xl flex items-center justify-between">
                <span className="text-sm font-medium">{t.title}</span>
                <span className={cn('text-xs px-2.5 py-0.5 rounded capitalize font-medium', `status-${t.status}`)}>
                  {t.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Discussion Tab */}
      {activeTab === 'discussion' && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-semibold text-base">Discussion Thread</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet. Start the conversation!</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="p-3 bg-muted/40 rounded-xl flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-xs">
                    {c.userName[0]}
                  </div>
                  <div>
                    <span className="text-xs font-semibold">{c.userName}</span>
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
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
            />
            <button onClick={handlePostComment} className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl">
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
