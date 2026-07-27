import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { COLLECTIONS } from '@/lib/collections';
import { Task, TaskStatus, TaskPriority } from '@/types';
import {
  Kanban, Table as TableIcon, Calendar as CalendarIcon, List,
  Clock, Plus, CheckSquare, Trash2, Tag, AlertCircle, X, ChevronRight
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const KANBAN_COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'backlog', title: 'Backlog', color: 'border-slate-500' },
  { id: 'todo', title: 'To Do', color: 'border-blue-500' },
  { id: 'in-progress', title: 'In Progress', color: 'border-amber-500' },
  { id: 'in-review', title: 'In Review', color: 'border-violet-500' },
  { id: 'done', title: 'Done', color: 'border-emerald-500' },
];

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

  useEffect(() => {
    if (!userProfile?.orgId) return;

    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('orgId', '==', userProfile.orgId)
    );

    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    return unsub;
  }, [userProfile?.orgId]);

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TaskStatus;

    // Optimistic UI update
    setTasks(prev =>
      prev.map(t => (t.id === draggableId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateDoc(doc(db, COLLECTIONS.TASKS, draggableId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch {
      toast.error('Failed to update task status');
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle || !userProfile?.orgId) return;
    try {
      await addDoc(collection(db, COLLECTIONS.TASKS), {
        orgId: userProfile.orgId,
        workspaceId: activeWorkspace?.id || '',
        projectId: '',
        title: taskTitle,
        description: taskDesc,
        status: taskStatus,
        priority: taskPriority,
        assigneeId: userProfile.id,
        assigneeName: userProfile.displayName,
        createdBy: userProfile.id,
        createdAt: serverTimestamp(),
      });

      setTaskTitle('');
      setTaskDesc('');
      setIsTaskModalOpen(false);
      toast.success('Task created');
    } catch {
      toast.error('Failed to create task');
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Task Management</h1>
          <p className="text-sm text-muted-foreground">Manage, track, and organize team tasks</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-muted/60 p-1 rounded-xl border border-border/40">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'kanban' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Kanban className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <TableIcon className="w-3.5 h-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>

          <button
            onClick={() => setIsTaskModalOpen(true)}
            id="create-task-btn"
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Create Task
          </button>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {KANBAN_COLUMNS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.id);
              return (
                <div key={col.id} className="kanban-col shrink-0 border-t-2" style={{ borderColor: col.color.replace('border-', '') }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{col.title}</span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                      {colTasks.length}
                    </span>
                  </div>

                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2 min-h-[350px]"
                      >
                        {colTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className="glass-card p-4 hover:border-primary/40 cursor-grab active:cursor-grabbing transition-all space-y-2 group"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-semibold line-clamp-2">{task.title}</h4>
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-opacity"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                                )}
                                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                                  <span className={cn('capitalize font-medium text-[11px]', `priority-${task.priority}`)}>
                                    {task.priority}
                                  </span>
                                  <span className="text-muted-foreground">{task.assigneeName || 'Unassigned'}</span>
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

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border/50">
              <tr>
                <th className="p-4">Title</th>
                <th className="p-4">Status</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Assignee</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium">{task.title}</td>
                  <td className="p-4">
                    <span className={cn('text-xs px-2.5 py-1 rounded-full capitalize font-medium', `status-${task.status}`)}>
                      {task.status}
                    </span>
                  </td>
                  <td className="p-4 capitalize font-semibold text-xs">
                    <span className={`priority-${task.priority}`}>{task.priority}</span>
                  </td>
                  <td className="p-4 text-muted-foreground">{task.assigneeName || 'Unassigned'}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDeleteTask(task.id)} className="text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="glass-card p-4 flex items-center justify-between hover:border-primary/20">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-4 h-4 text-primary" />
                <div>
                  <h4 className="font-medium text-sm">{task.title}</h4>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn('text-xs px-2.5 py-0.5 rounded-full capitalize font-medium', `status-${task.status}`)}>
                  {task.status}
                </span>
                <button onClick={() => handleDeleteTask(task.id)} className="text-muted-foreground hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border p-6 rounded-2xl w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">New Task</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder="Task title"
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary"
            />

            <textarea
              value={taskDesc}
              onChange={e => setTaskDesc(e.target.value)}
              placeholder="Task description"
              rows={3}
              className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-sm outline-none focus:border-primary resize-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1">Status</label>
                <select
                  value={taskStatus}
                  onChange={e => setTaskStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs outline-none"
                >
                  <option value="todo">To Do</option>
                  <option value="in-progress">In Progress</option>
                  <option value="in-review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1">Priority</label>
                <select
                  value={taskPriority}
                  onChange={e => setTaskPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground">Cancel</button>
              <button onClick={handleCreateTask} className="px-4 py-2 text-sm bg-primary text-white rounded-xl font-medium">Create Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
