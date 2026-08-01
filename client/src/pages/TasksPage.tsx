import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc,
  deleteDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { COLLECTIONS } from '@/lib/collections';
import { Task, TaskStatus, TaskPriority } from '@/types';
import {
  Kanban, Table as TableIcon, List,
  Plus, CheckSquare, Trash2, X, AlertCircle,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

const KANBAN_COLUMNS: { id: TaskStatus; title: string; color: string; dot: string }[] = [
  { id: 'backlog',     title: 'Backlog',     color: 'border-t-slate-500',   dot: 'bg-slate-500' },
  { id: 'todo',        title: 'To Do',       color: 'border-t-blue-500',    dot: 'bg-blue-500' },
  { id: 'in-progress', title: 'In Progress', color: 'border-t-amber-500',   dot: 'bg-amber-500' },
  { id: 'in-review',   title: 'In Review',   color: 'border-t-violet-500',  dot: 'bg-violet-500' },
  { id: 'done',        title: 'Done',        color: 'border-t-emerald-500', dot: 'bg-emerald-500' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  none:   'text-muted-foreground',
  low:    'text-blue-400',
  medium: 'text-amber-400',
  high:   'text-orange-400',
  urgent: 'text-red-400',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog:      'bg-slate-500/20 text-slate-400',
  todo:         'bg-blue-500/20 text-blue-400',
  'in-progress':'bg-amber-500/20 text-amber-400',
  'in-review':  'bg-violet-500/20 text-violet-400',
  done:         'bg-emerald-500/20 text-emerald-400',
  cancelled:    'bg-red-500/20 text-red-400',
};

export default function TasksPage() {
  const { userProfile } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'list'>('kanban');

  // Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userProfile?.orgId) return;

    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('orgId', '==', userProfile.orgId)
    );

    const unsub = onSnapshot(
      q,
      snap => {
        setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      },
      err => {
        console.error('Tasks snapshot error:', err);
        toast.error('Failed to load tasks. Check Firestore rules.');
      }
    );

    return unsub;
  }, [userProfile?.orgId]);

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TaskStatus;

    // Optimistic update
    setTasks(prev =>
      prev.map(t => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateDoc(doc(db, COLLECTIONS.TASKS, draggableId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      toast.error('Failed to update task status');
      // Revert
      setTasks(prev =>
        prev.map(t => (t.id === draggableId ? { ...t, status: source.droppableId as TaskStatus } : t))
      );
    }
  };

  const handleOpenModal = () => {
    if (!userProfile?.orgId) {
      toast.error('Please complete onboarding first — you need an organization to create tasks.');
      return;
    }
    setIsTaskModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsTaskModalOpen(false);
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('medium');
    setTaskStatus('todo');
    setTaskDueDate('');
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) {
      toast.error('Task title is required');
      return;
    }
    if (!userProfile?.orgId) {
      toast.error('Organization not set up. Please complete onboarding first.');
      return;
    }

    setSaving(true);
    try {
      const taskData: Record<string, any> = {
        orgId: userProfile.orgId,
        workspaceId: activeWorkspace?.id || '',
        projectId: '',
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        status: taskStatus,
        priority: taskPriority,
        assigneeId: userProfile.id,
        assigneeName: userProfile.displayName,
        assigneePhoto: userProfile.photoURL || '',
        tags: [],
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (taskDueDate) {
        taskData.dueDate = Timestamp.fromDate(new Date(taskDueDate));
      }

      await addDoc(collection(db, COLLECTIONS.TASKS), taskData);

      handleCloseModal();
      toast.success(`Task "${taskTitle.trim()}" created!`);
    } catch (err: any) {
      console.error('Task creation error:', err);
      toast.error(`Failed to create task: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.TASKS, id));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleToggleDone = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await updateDoc(doc(db, COLLECTIONS.TASKS, task.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error('Failed to update task');
    }
  };

  if (!userProfile?.orgId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-indigo-400" />
        </div>
        <h2 className="text-lg font-bold">Organization Required</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Complete onboarding to create tasks and track your work.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Task Management</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.length} tasks · {tasks.filter(t => t.status === 'done').length} completed
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40">
            {[
              { id: 'kanban', icon: Kanban, label: 'Kanban' },
              { id: 'table', icon: TableIcon, label: 'Table' },
              { id: 'list', icon: List, label: 'List' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id as typeof viewMode)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  viewMode === v.id
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <v.icon className="w-3.5 h-3.5" /> {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleOpenModal}
            id="create-task-btn"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-indigo-500/25"
          >
            <Plus className="w-4 h-4" /> Create Task
          </button>
        </div>
      </div>

      {/* ── KANBAN VIEW ─────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {KANBAN_COLUMNS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className={cn(
                    'shrink-0 w-72 flex flex-col glass-card p-3 border-t-2',
                    col.color
                  )}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', col.dot)} />
                      <span className="font-semibold text-sm">{col.title}</span>
                    </div>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                      {colTasks.length}
                    </span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'space-y-2 min-h-[200px] rounded-xl transition-colors p-1',
                          snapshot.isDraggingOver && 'bg-primary/5'
                        )}
                      >
                        {colTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  'bg-card border border-border/60 p-3 rounded-xl hover:border-primary/30 cursor-grab active:cursor-grabbing transition-all space-y-2 group',
                                  snapshot.isDragging && 'shadow-lg border-primary/40 rotate-1'
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2">
                                    <button
                                      onClick={() => handleToggleDone(task)}
                                      className={cn(
                                        'mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 transition-all',
                                        task.status === 'done'
                                          ? 'bg-emerald-500 border-emerald-500'
                                          : 'border-border hover:border-primary'
                                      )}
                                    />
                                    <h4 className={cn(
                                      'text-sm font-semibold line-clamp-2',
                                      task.status === 'done' && 'line-through text-muted-foreground'
                                    )}>
                                      {task.title}
                                    </h4>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {task.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
                                    {task.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between pt-1.5 border-t border-border/30 text-xs pl-6">
                                  <span className={cn('capitalize font-semibold text-[11px]', PRIORITY_COLORS[task.priority])}>
                                    {task.priority !== 'none' ? task.priority : ''}
                                  </span>
                                  {task.dueDate && (
                                    <span className="text-muted-foreground text-[11px]">
                                      {format(
                                        task.dueDate instanceof Timestamp
                                          ? task.dueDate.toDate()
                                          : new Date(task.dueDate as string),
                                        'MMM d'
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* ── TABLE VIEW ──────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border/50">
              <tr>
                <th className="p-4 w-8"></th>
                <th className="p-4">Title</th>
                <th className="p-4">Status</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Assignee</th>
                <th className="p-4">Due Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    No tasks yet. Click "Create Task" to add one.
                  </td>
                </tr>
              ) : (
                tasks.map(task => (
                  <tr key={task.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleDone(task)}
                        className={cn(
                          'w-4 h-4 rounded-full border-2 transition-all',
                          task.status === 'done'
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-border hover:border-primary'
                        )}
                      />
                    </td>
                    <td className={cn('p-4 font-medium', task.status === 'done' && 'line-through text-muted-foreground')}>
                      {task.title}
                    </td>
                    <td className="p-4">
                      <span className={cn('text-xs px-2.5 py-1 rounded-full capitalize font-medium', STATUS_COLORS[task.status])}>
                        {task.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={cn('capitalize font-semibold text-xs', PRIORITY_COLORS[task.priority])}>
                        {task.priority !== 'none' ? task.priority : '—'}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">{task.assigneeName || 'Unassigned'}</td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {task.dueDate
                        ? format(
                            task.dueDate instanceof Timestamp
                              ? task.dueDate.toDate()
                              : new Date(task.dueDate as string),
                            'MMM d, yyyy'
                          )
                        : '—'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── LIST VIEW ───────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {tasks.length === 0 && (
            <div className="glass-card p-10 text-center text-sm text-muted-foreground">
              No tasks yet. Click "Create Task" to add your first task.
            </div>
          )}
          {tasks.map(task => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-4 flex items-center gap-4 hover:border-primary/20 group transition-all"
            >
              <button
                onClick={() => handleToggleDone(task)}
                className={cn(
                  'w-5 h-5 rounded-full border-2 shrink-0 transition-all',
                  task.status === 'done'
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-border hover:border-primary'
                )}
              />
              <div className="flex-1 min-w-0">
                <h4 className={cn('font-medium text-sm', task.status === 'done' && 'line-through text-muted-foreground')}>
                  {task.title}
                </h4>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn('text-xs font-medium capitalize', PRIORITY_COLORS[task.priority])}>
                  {task.priority !== 'none' ? task.priority : ''}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize font-medium', STATUS_COLORS[task.status])}>
                  {task.status.replace('-', ' ')}
                </span>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Task Creation Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">New Task</h3>
                <button onClick={handleCloseModal} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Title *</label>
                <input
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCreateTask()}
                  placeholder="Task title"
                  autoFocus
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
                <textarea
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  placeholder="Task description (optional)"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Status</label>
                  <select
                    value={taskStatus}
                    onChange={e => setTaskStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="in-review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-xs outline-none focus:border-primary"
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Due Date (optional)</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={e => setTaskDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
                />
              </div>

              {activeWorkspace && (
                <p className="text-xs text-muted-foreground">
                  Workspace: <span className="text-foreground font-medium">{activeWorkspace.name}</span>
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 text-sm text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={saving || !taskTitle.trim()}
                  className="flex-1 py-2.5 text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
