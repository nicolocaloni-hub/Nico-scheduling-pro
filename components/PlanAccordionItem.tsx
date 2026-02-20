import React, { useState } from 'react';
import { Stripboard, Scene, Strip } from '../types';
import { DayCard } from './DayCard';
import { Button } from './Button';
import { optimizeSchedule } from '../services/geminiService';
import { db } from '../services/store';
import { SceneEditorModal } from './SceneEditorModal';
import { PrintSetupModal } from './PrintSetupModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [showPrintSetup, setShowPrintSetup] = useState(false);
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

  const handleSceneSave = async (updatedScene: Scene) => {
    await db.updateScene(updatedScene);
    setEditingScene(null);
    window.location.reload(); 
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const setup = await db.getPrintSetup(board.projectId);
    const title = setup?.projectTitle || projectName || "Piano di Lavorazione";
    
    // 1. Cast Page
    doc.setFontSize(18);
    doc.text("CAST MEMBERS", 14, 20);
    doc.setFontSize(12);
    doc.text(title, 14, 30);
    
    const elements = await db.getElements(board.projectId);
    const cast = elements.filter(e => e.category === 'Cast' || e.category === 'character');
    // Assign IDs if not present (simple index + 1)
    const castData = cast.map((c, i) => [i + 1, c.name]);
    
    autoTable(doc, {
      startY: 40,
      head: [['ID', 'Name']],
      body: castData,
    });

    // 2. Schedule Pages
    doc.addPage();
    doc.setFontSize(16);
    doc.text("SHOOTING SCHEDULE", 14, 20);
    
    let currentDay = 1;
    const rows: any[] = [];
    
    board.strips.forEach(strip => {
      if (strip.isDayBreak) {
        rows.push([{ content: `END OF DAY ${currentDay}`, colSpan: 6, styles: { fillColor: [255, 255, 0], fontStyle: 'bold', halign: 'center' } }]);
        currentDay++;
      } else {
        const s = scenes[strip.sceneId];
        if (s) {
           // Find cast IDs
           const castIds = s.elementIds
             .map(eid => {
               const idx = cast.findIndex(c => c.id === eid);
               return idx >= 0 ? idx + 1 : null;
             })
             .filter(id => id !== null)
             .join(', ');

           rows.push([
             s.sceneNumber,
             s.intExt,
             s.slugline, // Using slugline as set/loc combo
             s.dayNight,
             s.pageCountInEighths,
             castIds
           ]);
        }
      }
    });

    autoTable(doc, {
      startY: 30,
      head: [['Scena', 'I/E', 'Set/Desc', 'D/N', 'Pgs', 'Cast']],
      body: rows,
    });

    doc.save(`${title}_PDL.pdf`);
  };

  const displayName = board.name === 'Main Board' && projectName ? projectName : board.name;

  const totalPages = board.strips.reduce((acc, strip) => {
    const scene = scenes[strip.sceneId];
    return acc + (scene?.pages || 0);
  }, 0);

  const dayCount = board.strips.filter(s => s.isDayBreak).length + 1;

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
              <span><i className="fa-solid fa-file-lines mr-1"></i>{totalPages.toFixed(1)} Pag</span>
            </p>
          </div>
        </div>
        <div className="text-gray-500">
          <i className={`fa-solid fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4 bg-gray-900/50">
           <div className="flex gap-2 mb-4 justify-end">
             <button onClick={() => setShowPrintSetup(true)} className="text-gray-400 hover:text-white p-2">
               <i className="fa-solid fa-gear"></i>
             </button>
             <button onClick={generatePDF} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded flex items-center gap-2">
               <i className="fa-solid fa-file-pdf"></i> Scarica PDF
             </button>
           </div>

           <div className="space-y-2">
             {board.strips.map((strip, idx) => {
               if (strip.isDayBreak) {
                 return (
                   <div key={strip.id} className="bg-gray-800 p-2 rounded text-center text-xs font-bold text-yellow-500 uppercase tracking-widest border border-gray-700 my-4">
                     FINE GIORNO {strip.dayNumber || '?'}
                   </div>
                 );
               }
               const scene = scenes[strip.sceneId];
               if (!scene) return null;
               
               return (
                 <div 
                   key={strip.id} 
                   onClick={() => setEditingScene(scene)}
                   className="bg-gray-800 p-3 rounded border border-gray-700 flex justify-between items-center hover:border-primary-500 cursor-pointer"
                 >
                   <div className="flex items-center gap-3">
                     <span className="font-bold text-white w-8 text-center">{scene.sceneNumber}</span>
                     <div>
                       <div className="text-xs font-bold text-gray-300">
                         {scene.intExt} {scene.setName} - {scene.dayNight}
                       </div>
                       <div className="text-[10px] text-gray-500 truncate max-w-[200px]">
                         {scene.synopsis}
                       </div>
                     </div>
                   </div>
                   <div className="text-xs font-mono text-gray-400">
                     {scene.pageCountInEighths}
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      )}

      {editingScene && (
        <SceneEditorModal 
          scene={editingScene} 
          onClose={() => setEditingScene(null)} 
          onSave={handleSceneSave} 
        />
      )}

      {showPrintSetup && (
        <PrintSetupModal 
          projectId={board.projectId}
          onClose={() => setShowPrintSetup(false)}
        />
      )}
    </div>
  );
};
