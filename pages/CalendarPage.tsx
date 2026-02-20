import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { CalendarEvent } from '../types';
import { Button } from '../components/Button';
import { DayEventsSheet } from '../components/DayEventsSheet';
import { GenerateScheduleModal } from '../components/GenerateScheduleModal';

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) navigate('/'); else {
      setProjectId(pid);
      loadEvents(pid);
    }
  }, [navigate]);

  const loadEvents = async (pid: string) => {
    const evts = await db.getEvents(pid);
    setEvents(evts);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    // 0 = Sunday, 1 = Monday... we want 0 = Monday, 6 = Sunday
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day + 1).toISOString().split('T')[0];
    setSelectedDate(dateStr);
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const todayStr = new Date().toISOString().split('T')[0];

    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="grid grid-cols-7 gap-2">
        {['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-500 py-2">
            {d}
          </div>
        ))}
        
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square"></div>
        ))}

        {days.map(day => {
          const dateStr = new Date(year, month, day + 1).toISOString().split('T')[0]; // +1 because Date constructor is 0-indexed for month but day is 1-indexed? Wait. new Date(y, m, d) -> d is 1-31.
          // Actually ISO string conversion might be tricky with timezones. 
          // Let's use a simpler string construction to match the storage format YYYY-MM-DD
          const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const dayEvents = events.filter(e => e.date === dStr);
          const hasShooting = dayEvents.some(e => e.type === 'shooting');
          const isToday = dStr === todayStr;

          return (
            <div 
              key={day} 
              onClick={() => handleDayClick(day)}
              className={`aspect-square rounded-xl border flex flex-col items-center justify-start pt-2 cursor-pointer relative transition-all active:scale-95 ${
                isToday 
                  ? 'bg-primary-900/30 border-primary-500 text-white' 
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className={`text-sm font-bold ${isToday ? 'text-primary-400' : ''}`}>{day}</span>
              
              {/* Event Dots */}
              <div className="flex gap-1 mt-1 flex-wrap justify-center px-1">
                {dayEvents.slice(0, 4).map((ev, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full ${ev.type === 'shooting' ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.5)]' : 'bg-gray-400'}`} 
                  />
                ))}
                {dayEvents.length > 4 && <span className="text-[8px] text-gray-500 leading-none">+</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <button onClick={handlePrevMonth} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors bg-gray-800 border border-gray-700">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <h1 className="text-xl font-black text-white capitalize min-w-[140px] text-center">
              {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            </h1>
            <button onClick={handleNextMonth} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors bg-gray-800 border border-gray-700">
              <i className="fa-solid fa-chevron-right"></i>
            </button>
        </div>
        
        <Button variant="secondary" onClick={() => setShowGenerateModal(true)} className="text-xs h-9 px-3">
            <i className="fa-solid fa-wand-magic-sparkles mr-2"></i> Auto-Genera
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {renderCalendarGrid()}
      </div>

      {/* Modals */}
      {selectedDate && projectId && (
        <DayEventsSheet 
          date={selectedDate}
          events={events.filter(e => e.date === selectedDate)}
          projectId={projectId}
          onClose={() => setSelectedDate(null)}
          onUpdate={() => projectId && loadEvents(projectId)}
        />
      )}

      {showGenerateModal && projectId && (
        <GenerateScheduleModal 
          projectId={projectId}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={() => loadEvents(projectId)}
        />
      )}
    </div>
  );
};
