import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { db } from '../services/store';
import { Button } from './Button';

interface DayEventsSheetProps {
  date: string;
  events: CalendarEvent[];
  projectId: string;
  projectType?: string;
  projectName?: string;
  projectStartDate?: string;
  projectEndDate?: string;
  onClose: () => void;
  onUpdate: () => void;
}

export const DayEventsSheet: React.FC<DayEventsSheetProps> = ({ 
  date, 
  events, 
  projectId, 
  projectType, 
  projectName, 
  projectStartDate,
  projectEndDate,
  onClose, 
  onUpdate 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventNotes, setNewEventNotes] = useState('');

  // Check if current date is within project range
  const isProjectDay = React.useMemo(() => {
    if (!projectStartDate || !projectEndDate) return false;
    const current = date;
    const start = projectStartDate.split('T')[0];
    const end = projectEndDate.split('T')[0];
    return current >= start && current <= end;
  }, [date, projectStartDate, projectEndDate]);

  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) return;

    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      projectId,
      date,
      title: newEventTitle,
      time: newEventTime,
      notes: newEventNotes,
      type: 'general'
    };

    await db.saveEvent(newEvent);
    setIsAdding(false);
    setNewEventTitle('');
    setNewEventTime('');
    setNewEventNotes('');
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Eliminare questo evento?')) {
      await db.deleteEvent(projectId, id);
      onUpdate();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-gray-900 border-t border-gray-700 rounded-t-3xl shadow-2xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Drag Handle */}
        <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-white">
              {new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}
            </h2>
            <p className="text-gray-400 text-sm uppercase font-bold tracking-wider">
              {new Date(date).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Project Info Banner - Show if it's a project day */}
          {isProjectDay && projectName && projectType && (
             <div className="mb-2 p-4 bg-indigo-900/20 rounded-xl border border-indigo-500/30 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{projectName}</h3>
                  <span className="inline-block px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                      {projectType === 'feature' ? 'Lungometraggio' : projectType === 'medium' ? 'Mediometraggio' : 'Cortometraggio'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <i className="fa-solid fa-film text-indigo-400"></i>
                </div>
             </div>
          )}

          {events.length === 0 && !isAdding && (
            <div className="text-center py-10 text-gray-500">
              <i className="fa-regular fa-calendar-xmark text-4xl mb-3 opacity-50"></i>
              <p>Nessun evento per questo giorno.</p>
            </div>
          )}

          {events.map(event => (
            <div key={event.id} className={`p-4 rounded-xl border ${event.type === 'shooting' ? 'bg-blue-900/20 border-blue-800/50' : 'bg-gray-800 border-gray-700'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-bold text-lg ${event.type === 'shooting' ? 'text-blue-300' : 'text-white'}`}>
                    {event.title}
                  </h3>
                  {event.time && (
                    <p className="text-xs font-mono text-gray-400 mt-1">
                      <i className="fa-regular fa-clock mr-1"></i>{event.time}
                    </p>
                  )}
                  {event.scenes && event.scenes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.scenes.map((s, i) => (
                        <span key={i} className="text-[10px] bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded border border-blue-500/30">
                          SC {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {event.notes && <p className="text-sm text-gray-400 mt-2 italic">{event.notes}</p>}
                </div>
                <button onClick={() => handleDelete(event.id)} className="text-gray-600 hover:text-red-400 p-1">
                  <i className="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          ))}

          {isAdding && (
            <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <input 
                autoFocus
                type="text" 
                placeholder="Titolo evento" 
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-primary-500 outline-none"
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
              />
              <div className="flex gap-2">
                <input 
                  type="time" 
                  className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm outline-none"
                  value={newEventTime}
                  onChange={e => setNewEventTime(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Note (opzionale)" 
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm outline-none"
                  value={newEventNotes}
                  onChange={e => setNewEventNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => setIsAdding(false)} className="flex-1">Annulla</Button>
                <Button onClick={handleAddEvent} disabled={!newEventTitle.trim()} className="flex-1">Salva</Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isAdding && (
          <div className="p-4 border-t border-gray-800 bg-gray-900">
            <Button onClick={() => setIsAdding(true)} className="w-full py-3 text-base">
              <i className="fa-solid fa-plus mr-2"></i> Aggiungi Evento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
