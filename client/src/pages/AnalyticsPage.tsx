import React from 'react';
import { BarChart3, TrendingUp, Trophy, CheckSquare, Users } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsPage() {
  const taskDistribution = [
    { name: 'To Do', value: 5, color: '#3b82f6' },
    { name: 'In Progress', value: 8, color: '#f59e0b' },
    { name: 'In Review', value: 3, color: '#8b5cf6' },
    { name: 'Done', value: 12, color: '#10b981' },
  ];

  const monthlyTrend = [
    { month: 'Jan', revenue: 1200, expenses: 400 },
    { month: 'Feb', revenue: 2100, expenses: 800 },
    { month: 'Mar', revenue: 1800, expenses: 500 },
    { month: 'Apr', revenue: 3200, expenses: 1100 },
    { month: 'May', revenue: 4500, expenses: 1400 },
    { month: 'Jun', revenue: 3900, expenses: 900 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Analytics & Performance</h1>
        <p className="text-sm text-muted-foreground">Comprehensive insights into competition success rate, ROI, and productivity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <span className="text-xs text-muted-foreground">Competition Success Rate</span>
          <p className="text-3xl font-bold text-emerald-400 mt-1">75.0%</p>
        </div>
        <div className="glass-card p-5">
          <span className="text-xs text-muted-foreground">Task Completion Rate</span>
          <p className="text-3xl font-bold text-indigo-400 mt-1">82.4%</p>
        </div>
        <div className="glass-card p-5">
          <span className="text-xs text-muted-foreground">Most Active Member</span>
          <p className="text-xl font-bold text-violet-400 mt-1">Primary Founder</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="font-semibold text-base mb-4">Monthly Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(224 40% 7%)', border: '1px solid hsl(224 40% 14%)', borderRadius: '12px' }}
              />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold text-base mb-4">Task Status Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={taskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {taskDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
