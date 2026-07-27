import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Track competition deadlines, meetings, and task schedules</p>
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

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/50 text-center py-3 bg-muted/30 text-xs font-bold uppercase text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-border/40 min-h-[500px]">
          {days.map((day, idx) => (
            <div
              key={idx}
              className={`p-2 min-h-[90px] flex flex-col justify-between transition-colors ${
                !isSameMonth(day, monthStart) ? 'bg-muted/20 text-muted-foreground/40' : 'hover:bg-muted/30'
              } ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                  isSameDay(day, new Date()) ? 'bg-primary text-white' : ''
                }`}>
                  {format(day, 'd')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
