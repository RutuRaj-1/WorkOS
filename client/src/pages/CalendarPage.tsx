import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { COLLECTIONS } from '@/lib/collections';
import { Project } from '@/types';
import { useNavigate } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  projectId: string;
  workspaceId: string;
  title: string;
  date: Date;
  type: 'round' | 'final' | 'general';
  color: string;
}

export default function CalendarPage() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  useEffect(() => {
    if (!userProfile?.orgId) return;
    const q = query(collection(db, COLLECTIONS.PROJECTS), where('orgId', '==', userProfile.orgId));
    
    return onSnapshot(q, snap => {
      const projs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      const normalized: CalendarEvent[] = [];
      
      projs.forEach(p => {
        if (p.finalEventDate) {
          normalized.push({
            id: `${p.id}-final`,
            projectId: p.id,
            workspaceId: p.workspaceId,
            title: `${p.name} (Final)`,
            date: new Date(p.finalEventDate),
            type: 'final',
            color: 'bg-emerald-500/80',
          });
        }
        
        if (p.rounds && p.rounds.length > 0) {
          p.rounds.forEach((r, idx) => {
            if (r.deadline) {
               normalized.push({
                 id: `${p.id}-round-${idx}`,
                 projectId: p.id,
                 workspaceId: p.workspaceId,
                 title: `${p.name} - ${r.name}`,
                 date: new Date(r.deadline),
                 type: 'round',
                 color: 'bg-indigo-500/80',
               });
            }
          });
        }
      });
      setEvents(normalized);
    });
  }, [userProfile?.orgId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Track competition deadlines, meetings, and task schedules across all workspaces</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 bg-muted hover:bg-muted/80 rounded-xl"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-bold min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 bg-muted hover:bg-muted/80 rounded-xl"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-border/50 text-center py-3 bg-muted/30 text-xs font-bold uppercase text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-border/40 min-h-[600px]">
          {days.map((day, idx) => {
            const dayEvents = events.filter(e => isSameDay(e.date, day));
            
            return (
              <div
                key={idx}
                className={`p-2 min-h-[100px] flex flex-col transition-colors ${
                  !isSameMonth(day, monthStart) ? 'bg-muted/20 text-muted-foreground/40' : 'hover:bg-muted/10'
                } ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                    isSameDay(day, new Date()) ? 'bg-primary text-white' : ''
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] no-scrollbar mt-1">
                  {dayEvents.map(e => (
                    <button 
                      key={e.id}
                      onClick={() => navigate(`/workspace/${e.workspaceId}`)}
                      className={`text-[9px] px-1.5 py-1 rounded truncate text-white font-medium ${e.color} hover:brightness-110 transition-all text-left shadow-sm`}
                      title={e.title}
                    >
                      {e.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
