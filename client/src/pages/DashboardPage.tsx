import React from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { COLLECTIONS } from '@/lib/collections';
import { Task, ActivityLog, Goal, Expense } from '@/types';
import {
  CheckSquare, Clock, TrendingUp, DollarSign, Target,
  Activity, Zap, ArrowUpRight, Calendar, Plus, Folder, Bell
} from 'lucide-react';
import { format, isToday, isTomorrow, startOfDay, endOfDay, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell
} from 'recharts';

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useDashboardData() {
  const { userProfile } = useAuth();
  const { workspaces, activeWorkspace } = useWorkspace();
  const [todayTasks, setTodayTasks] = React.useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = React.useState<Task[]>([]);
  const [recentActivity, setRecentActivity] = React.useState<ActivityLog[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userProfile?.orgId) { setLoading(false); return; }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = addDays(now, 7);

    // Today's tasks
    const todayQ = query(
      collection(db, COLLECTIONS.TASKS),
      where('orgId', '==', userProfile.orgId),
      where('assigneeId', '==', userProfile.id || ''),
      where('status', 'in', ['todo', 'in-progress', 'in-review']),
      orderBy('dueDate', 'asc'),
      limit(10)
    );

    const unsubToday = onSnapshot(todayQ, snap => {
      setTodayTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    }, () => setLoading(false));

    // Recent activity
    const actQ = query(
      collection(db, COLLECTIONS.ACTIVITY_LOGS),
      where('orgId', '==', userProfile.orgId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubAct = onSnapshot(actQ, snap => {
      setRecentActivity(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
    });

    // Goals
    const goalsQ = query(
      collection(db, COLLECTIONS.GOALS),
      where('orgId', '==', userProfile.orgId),
      orderBy('createdAt', 'desc'),
      limit(6)
    );

    const unsubGoals = onSnapshot(goalsQ, snap => {
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal)));
    });

    return () => { unsubToday(); unsubAct(); unsubGoals(); };
  }, [userProfile?.orgId]);

  return { todayTasks, upcomingTasks, recentActivity, goals, loading };
}

// ── Sub Components ──────────────────────────────────────────────────────────

function StatCard({
  title, value, icon: Icon, trend, color, subtitle
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  color: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="kpi-card hover:border-primary/20 transition-colors cursor-default"
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
            trend >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'
          )}>
            <ArrowUpRight className={cn('w-3 h-3', trend < 0 && 'rotate-90')} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold mt-2">{value}</p>
        <p className="text-sm font-medium text-foreground/80">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

function TaskItem({ task }: { task: Task }) {
  const navigate = useNavigate();

  const dueDate = task.dueDate instanceof Timestamp
    ? task.dueDate.toDate()
    : task.dueDate ? new Date(task.dueDate as string) : null;

  const dueDateLabel = dueDate
    ? isToday(dueDate) ? 'Today' : isTomorrow(dueDate) ? 'Tomorrow' : format(dueDate, 'MMM d')
    : null;

  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={() => navigate(`/workspace/${task.workspaceId}/project/${task.projectId}`)}
    >
      <div className={cn(
        'w-4 h-4 rounded-full border-2 shrink-0 transition-colors',
        task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-border group-hover:border-primary'
      )} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', task.status === 'done' && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.priority !== 'none' && task.priority && (
          <span className={cn('text-xs font-medium capitalize', `priority-${task.priority}`)}>
            {task.priority}
          </span>
        )}
        {dueDateLabel && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-md',
            isOverdue ? 'text-red-400 bg-red-400/10' : 'text-muted-foreground bg-muted'
          )}>
            {dueDateLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function ActivityItem({ log }: { log: ActivityLog }) {
  const timeAgo = (date: Timestamp | Date | string): string => {
    const d = date instanceof Timestamp ? date.toDate() : new Date(date as string);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return format(d, 'MMM d');
  };

  const actionColors: Record<string, string> = {
    created: 'text-emerald-400', updated: 'text-blue-400', deleted: 'text-red-400',
    completed: 'text-indigo-400', commented: 'text-violet-400', uploaded: 'text-cyan-400',
  };

  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <span className="text-xs font-bold">{log.userName?.[0] || '?'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className="font-medium">{log.userName}</span>
          {' '}
          <span className={cn('font-medium', actionColors[log.action] || 'text-muted-foreground')}>
            {log.action}
          </span>
          {' '}
          <span className="text-muted-foreground">{log.entity}</span>
          {' '}
          <span className="text-foreground">{log.entityName}</span>
        </p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {timeAgo(log.createdAt)}
      </span>
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <div className="p-4 glass-card hover:border-primary/20 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium truncate">{goal.title}</p>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">{goal.current} / {goal.target} {goal.unit}</span>
        <span className="text-xs text-muted-foreground capitalize">{goal.period}</span>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description: string; action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="empty-state">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <Plus className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const { workspaces, activeWorkspace } = useWorkspace();
  const { todayTasks, recentActivity, goals, loading } = useDashboardData();
  const navigate = useNavigate();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const doneTasks = todayTasks.filter(t => t.status === 'done').length;
  const pendingTasks = todayTasks.filter(t => t.status !== 'done').length;

  // Mock productivity chart data (will be replaced with real data)
  const productivityData = [
    { day: 'Mon', tasks: 0 }, { day: 'Tue', tasks: 0 }, { day: 'Wed', tasks: 0 },
    { day: 'Thu', tasks: 0 }, { day: 'Fri', tasks: 0 }, { day: 'Sat', tasks: 0 }, { day: 'Sun', tasks: 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold"
        >
          {greeting()}, {userProfile?.displayName?.split(' ')[0] || 'there'} 👋
        </motion.h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tasks Today"
          value={todayTasks.length}
          icon={CheckSquare}
          color="bg-gradient-to-br from-indigo-500 to-indigo-600"
          subtitle={`${doneTasks} completed`}
        />
        <StatCard
          title="Workspaces"
          value={workspaces.length}
          icon={Folder}
          color="bg-gradient-to-br from-violet-500 to-violet-600"
          subtitle="Active workspaces"
        />
        <StatCard
          title="Goals"
          value={goals.length}
          icon={Target}
          color="bg-gradient-to-br from-emerald-500 to-emerald-600"
          subtitle="Being tracked"
        />
        <StatCard
          title="Pending"
          value={pendingTasks}
          icon={Clock}
          color="bg-gradient-to-br from-amber-500 to-amber-600"
          subtitle="Tasks remaining"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Today's Tasks</h2>
              {todayTasks.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  {todayTasks.length}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/tasks')}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-xl" />
              ))}
            </div>
          ) : todayTasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks yet"
              description="Tasks assigned to you will appear here"
              action={{ label: 'Go to My Tasks', onClick: () => navigate('/tasks') }}
            />
          ) : (
            <div className="space-y-0.5">
              {todayTasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Activity</h2>
          </div>

          {recentActivity.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="Actions across your org will show here"
            />
          ) : (
            <div className="space-y-0 divide-y divide-border/40">
              {recentActivity.map(log => (
                <ActivityItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Goals + Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goals */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Goals</h2>
            </div>
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>

          {goals.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No goals yet"
              description="Track your team's progress with goals"
            />
          ) : (
            <div className="space-y-3">
              {goals.map(goal => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </div>

        {/* Productivity Chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Weekly Productivity</h2>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={productivityData}>
              <defs>
                <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(224 40% 7%)', border: '1px solid hsl(224 40% 14%)',
                  borderRadius: '12px', color: '#e2e8f0'
                }}
              />
              <Area
                type="monotone" dataKey="tasks" stroke="#6366f1"
                strokeWidth={2} fill="url(#prodGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Complete tasks to see your productivity trend
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'New Task', icon: CheckSquare, href: '/tasks', color: 'text-indigo-400' },
            { label: 'New Workspace', icon: Folder, href: '/settings/workspaces', color: 'text-violet-400' },
            { label: 'Calendar', icon: Calendar, href: '/calendar', color: 'text-blue-400' },
            { label: 'Notifications', icon: Bell, href: '/notifications', color: 'text-amber-400' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => navigate(action.href)}
              className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-muted/40 hover:bg-muted/80 border border-border/40 hover:border-primary/20 transition-all group"
            >
              <action.icon className={cn('w-5 h-5', action.color)} />
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
