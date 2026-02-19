import React from 'react';
import { Strip, Scene, DayNight, IntExt } from '../types';

interface DayCardProps {
  dayNumber: number;
  strips: Strip[];
  scenes: Record<string, Scene>;
  onMoveStrip?: (stripIndex: number, direction: 'up' | 'down') => void;
}

const getStripColor = (scene: Scene) => {
  const isDay = scene.dayNight === DayNight.DAY;
  if (isDay) {
      if (scene.intExt === IntExt.INT) return 'bg-white text-gray-900 border-l-4 border-l-gray-300';
      return 'bg-yellow-100 text-gray-900 border-l-4 border-l-yellow-400';
  } else { // Notte
      if (scene.intExt === IntExt.INT) return 'bg-blue-900 text-white border-l-4 border-l-blue-700';
      return 'bg-blue-950 text-white border-l-4 border-l-blue-800';
  }
};

export const DayCard: React.FC<DayCardProps> = ({ dayNumber, strips, scenes, onMoveStrip }) => {
  const totalPages = strips.reduce((acc, strip) => {
    const scene = scenes[strip.sceneId];
    return acc + (scene ? scene.pages : 0);
  }, 0);

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden mb-4">
      {/* Day Header */}
      <div className="bg-gray-900/80 px-4 py-2 flex justify-between items-center border-b border-gray-700">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
          Giorno {dayNumber}
        </h3>
        <span className="text-xs font-mono text-gray-500">
          {strips.length} Scene • {totalPages.toFixed(1)} Pag
        </span>
      </div>

      {/* Strips List */}
      <div className="p-2 space-y-1">
        {strips.map((strip, idx) => {
          const scene = scenes[strip.sceneId];
          if (!scene) return null;
          
          const colorClass = getStripColor(scene);

          return (
            <div 
              key={strip.id} 
              className={`relative group flex items-center h-10 rounded shadow-sm overflow-hidden select-none transition-all ${colorClass}`}
            >
              {/* Move Controls (Optional) */}
              {onMoveStrip && (
                <div className="w-6 h-full bg-black/10 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onMoveStrip(idx, 'up')} className="hover:text-primary-600 text-[8px] leading-none py-0.5">▲</button>
                  <button onClick={() => onMoveStrip(idx, 'down')} className="hover:text-primary-600 text-[8px] leading-none py-0.5">▼</button>
                </div>
              )}

              {/* Scene Number */}
              <div className="w-10 text-center font-bold text-sm border-r border-black/10 flex items-center justify-center h-full">
                {scene.sceneNumber}
              </div>

              {/* Scene Details */}
              <div className="flex-1 px-3 flex items-baseline gap-2 overflow-hidden whitespace-nowrap min-w-0">
                <span className="font-bold text-[9px] opacity-70 w-6 flex-shrink-0">{scene.intExt}</span>
                <span className="font-bold truncate text-xs uppercase tracking-tight flex-1">
                  {scene.slugline.replace(/^(INT\.|EST\.|EXT\.|INT\/EST\.)\s*/, '')}
                </span>
                <span className="text-[9px] font-bold opacity-70 ml-auto whitespace-nowrap flex-shrink-0">{scene.dayNight}</span>
              </div>

              {/* Pages */}
              <div className="w-12 text-center text-[10px] font-bold border-l border-black/10 flex items-center justify-center h-full bg-black/5">
                {scene.pages.toFixed(1)}
              </div>
            </div>
          );
        })}
        
        {strips.length === 0 && (
          <div className="text-center py-4 text-xs text-gray-600 italic">
            Nessuna scena assegnata
          </div>
        )}
      </div>
    </div>
  );
};
