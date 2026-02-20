import React, { useState } from 'react';
import { Stripboard, Scene, Strip } from '../types';
import { DayCard } from './DayCard';
import { Button } from './Button';
import { optimizeSchedule } from '../services/geminiService';
import { db } from '../services/store';

interface PlanAccordionItemProps {
  board: Stripboard;
  scenes: Record<string, Scene>;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updatedBoard: Stripboard) => void;
  onDelete: () => void;
  projectName?: string;
}

export const PlanAccordionItem: React.FC<PlanAccordionItemProps> = ({ 
  board, 
  scenes, 
  isOpen, 
  onToggle,
  onUpdate,
  onDelete,
  projectName
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    setLongPressTriggered(false);
    timerRef.current = setTimeout(() => {
      setLongPressTriggered(true);
      if (window.confirm("Elimina definitivamente questo piano?")) {
        onDelete();
      }
    }, 800);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = () => {
    if (!longPressTriggered) {
      onToggle();
    }
  };

  const displayName = board.name === 'Main Board' && projectName ? projectName : board.name;

  const totalPages = board.strips.reduce((acc, strip) => {
    const scene = scenes[strip.sceneId];
    return acc + (scene ? scene.pages : 0);
  }, 0);

  // Group strips by day
  // Since we don't have explicit day breaks in the default data yet, 
  // we'll treat the whole list as Day 1 for now, or respect isDayBreak if present.
  const days: { dayNumber: number; strips: Strip[] }[] = [];
  let currentDayStrips: Strip[] = [];
  let dayCount = 1;

  board.strips.forEach((strip) => {
    if (strip.isDayBreak) {
      if (currentDayStrips.length > 0) {
        days.push({ dayNumber: dayCount, strips: currentDayStrips });
        currentDayStrips = [];
        dayCount++;
      }
    }
    currentDayStrips.push(strip);
  });
  if (currentDayStrips.length > 0) {
    days.push({ dayNumber: dayCount, strips: currentDayStrips });
  }

  const handleAiOptimize = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling accordion
    if (isOptimizing) return;
    
    setIsOptimizing(true);
    try {
      const allScenes = Object.values(scenes) as Scene[];
      // Only optimize scenes that are in this board? 
      // Or optimize all project scenes? 
      // The original code optimized "allScenes". 
      // Let's stick to optimizing scenes present in the board to be safe, 
      // but usually a stripboard contains all scenes initially.
      
      const orderedIds = await optimizeSchedule(allScenes);
      
      const newStrips: Strip[] = orderedIds.map((id, index) => ({
        id: crypto.randomUUID(),
        sceneId: id,
        order: index
      }));

      const updatedBoard = { ...board, strips: newStrips };
      await db.saveStripboard(updatedBoard);
      onUpdate(updatedBoard);
    } catch (error: any) {
      alert("Errore durante l'ottimizzazione AI: " + error.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden transition-all duration-300 shadow-lg">
      {/* Header Row */}
      <div 
        onClick={handleClick}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-700/50 transition-colors select-none ${isOpen ? 'bg-gray-700/30 border-b border-gray-700' : ''}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
            <i className={`fa-solid ${isOpen ? 'fa-folder-open' : 'fa-folder'}`}></i>
          </div>
          <div>
            <h3 className="font-bold text-white text-base">{displayName}</h3>
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <span><i className="fa-regular fa-calendar mr-1"></i>{dayCount} Giorni</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>{board.strips.length} Scene</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>{totalPages.toFixed(1)} Pag</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Optimize Button (Visible only when open or always? User said "Tap su riga: Espandi". Maybe keep actions inside?) */}
           {/* Let's keep it simple in the header or move to detail */}
           <i className={`fa-solid fa-chevron-down text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
        </div>
      </div>

      {/* Expanded Detail */}
      {isOpen && (
        <div className="p-4 bg-black/20 animate-in slide-in-from-top-2 duration-200">
          {/* Actions Toolbar */}
          <div className="flex justify-end mb-6 gap-2">
            <Button 
              variant="primary" 
              className={`text-xs px-3 py-1.5 h-8 ${isOptimizing ? 'opacity-80' : ''}`}
              onClick={handleAiOptimize}
              disabled={isOptimizing}
            >
              {isOptimizing ? (
                <><i className="fa-solid fa-circle-notch animate-spin mr-2"></i>Ottimizzazione AI...</>
              ) : (
                <><i className="fa-solid fa-wand-magic-sparkles mr-2"></i>Ordina con AI</>
              )}
            </Button>
          </div>

          {/* Days Grid */}
          <div className="space-y-6">
            {days.map((day) => (
              <DayCard 
                key={day.dayNumber}
                dayNumber={day.dayNumber}
                strips={day.strips}
                scenes={scenes}
                // onMoveStrip logic would need to be adapted for grouped strips
                // For now, we omit manual reordering inside the card to keep it simple as requested
                // or we can implement it later if needed.
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
