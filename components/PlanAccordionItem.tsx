import React, { useState, useMemo } from 'react';
import { Stripboard, Scene, Strip, ElementCategory, ProductionElement } from '../types';
import { db } from '../services/store';
import { SceneEditorModal } from './SceneEditorModal';
import { PrintSetupModal } from './PrintSetupModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTranslation } from '../services/i18n';
import { useLongPress } from '../hooks/useLongPress';
import { AddDayModal } from './AddDayModal';

interface PlanAccordionItemProps {
  board: Stripboard;
  scenes: Record<string, Scene>;
  elements?: ProductionElement[];
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updatedBoard: Stripboard) => void;
  onSceneUpdate?: (updatedScene: Scene) => void;
  onDelete: () => void;
  projectName?: string;
  project?: any;
}

export const PlanAccordionItem: React.FC<PlanAccordionItemProps> = ({ 
  board, 
  scenes,
  elements = [],
  isOpen, 
  onToggle,
  onUpdate,
  onSceneUpdate,
  onDelete,
  projectName,
  project
}) => {
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [showPrintSetup, setShowPrintSetup] = useState(false);
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const { t } = useTranslation();

  const handleDelete = () => {
    console.log(`longPress/delete triggered for plan ${board.id}`);
    onDelete();
  };

  const handlers = useLongPress({
    onLongPress: handleDelete,
    onClick: onToggle,
    threshold: 1500
  });

  const handleSceneSave = async (updatedScene: Scene) => {
    await db.updateScene(updatedScene);
    setEditingScene(null);
    if (onSceneUpdate) {
        onSceneUpdate(updatedScene);
    } else {
        console.error("onSceneUpdate not provided");
    }
  };

  // Compute derived state
  const { groupedStrips, allDays, sortedStrips, unscheduledStrips } = useMemo(() => {
    const daysSet = new Set<string>(board.shootingDays || []);
    if (project && project.shootDays) {
        project.shootDays.forEach((d: string) => daysSet.add(d));
    }
    Object.values(scenes).forEach((s: Scene) => {
      if (s.shootDay) daysSet.add(s.shootDay);
    });
    const sortedDays = Array.from(daysSet).sort();

    const realStrips = board.strips.filter(s => !s.isDayBreak && scenes[s.sceneId]);

    const groups: Record<string, Strip[]> = {};
    const unscheduled: Strip[] = [];

    realStrips.forEach(strip => {
      const scene = scenes[strip.sceneId];
      if (scene?.shootDay) {
        if (!groups[scene.shootDay]) groups[scene.shootDay] = [];
        groups[scene.shootDay].push(strip);
      } else {
        unscheduled.push(strip);
      }
    });

    Object.keys(groups).forEach(day => {
        groups[day].sort((a, b) => a.order - b.order);
    });
    unscheduled.sort((a, b) => a.order - b.order);

    const flatList: Strip[] = [...unscheduled];
    sortedDays.forEach(day => {
      if (groups[day]) {
        flatList.push(...groups[day]);
      }
    });

    return { 
      groupedStrips: groups, 
      unscheduledStrips: unscheduled, 
      allDays: sortedDays,
      sortedStrips: flatList
    };
  }, [board, scenes, project]);

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
    const cast = elements.filter(e => e.category === ElementCategory.Cast);
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
    
    const rows: any[] = [];
    
    // Use sortedStrips to generate PDF in order
    let currentDayLabel = '';
    
    sortedStrips.forEach(strip => {
      const s = scenes[strip.sceneId];
      if (!s) return;

      const dayLabel = s.shootDay ? new Date(s.shootDay).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : (projectName || 'NON PROGRAMMATO');
      
      if (dayLabel !== currentDayLabel) {
        rows.push([{ content: dayLabel.toUpperCase(), colSpan: 6, styles: { fillColor: [200, 200, 200], fontStyle: 'bold', halign: 'center' } }]);
        currentDayLabel = dayLabel;
      }

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
        `${s.slugline}${s.synopsis ? '\n' + s.synopsis : ''}`,
        s.dayNight,
        s.pageCountInEighths,
        castIds
      ]);
    });

    autoTable(doc, {
      startY: 30,
      head: [['Scena', 'I/E', 'Set/Desc', 'D/N', 'Pgs', 'Cast']],
      body: rows,
      styles: { cellPadding: 3, valign: 'middle' },
      columnStyles: {
        2: { cellWidth: 'auto' } // Ensure description column takes available space
      }
    });

    doc.save(`${title}_PDL.pdf`);
  };

  const displayName = board.name === 'Main Board' && projectName ? projectName : board.name;

  const totalPages = board.strips.reduce((acc, strip) => {
    const scene = scenes[strip.sceneId];
    return acc + (scene?.pages || 0);
  }, 0);

  const moveStrip = async (stripId: string, direction: 'up' | 'down') => {
    const strip = board.strips.find(s => s.id === stripId);
    if (!strip) return;
    const scene = scenes[strip.sceneId];
    if (!scene) return;

    const currentDay = scene.shootDay;
    const currentList = currentDay ? groupedStrips[currentDay] || [] : unscheduledStrips;
    const indexInDay = currentList.findIndex(s => s.id === stripId);

    if (indexInDay === -1) return;

    // Moving UP
    if (direction === 'up') {
        if (indexInDay > 0) {
            // Swap with previous in same list
            const prevStrip = currentList[indexInDay - 1];
            // Swap orders
            const newStrips = board.strips.map(s => {
                if (s.id === strip.id) return { ...s, order: prevStrip.order };
                if (s.id === prevStrip.id) return { ...s, order: strip.order };
                return s;
            });
            const updatedBoard = { ...board, strips: newStrips };
            onUpdate(updatedBoard);
            await db.saveStripboard(updatedBoard);
        } else {
            // Move to bottom of previous day
            let prevDay: string | undefined;
            if (!currentDay) {
                // Already at top of Unscheduled (first group)
                return;
            } else {
                const dayIndex = allDays.indexOf(currentDay);
                if (dayIndex === 0) prevDay = undefined; // Move to Unscheduled
                else if (dayIndex > 0) prevDay = allDays[dayIndex - 1];
                else return; // Should not happen
            }

            const prevList = prevDay ? groupedStrips[prevDay] || [] : unscheduledStrips;
            const newOrder = prevList.length > 0 ? prevList[prevList.length - 1].order + 1 : 0;

            // Update Scene Day
            const updatedScene = { ...scene, shootDay: prevDay };
            await db.updateScene(updatedScene);
            if (onSceneUpdate) onSceneUpdate(updatedScene);

            // Update Strip Order
            const newStrips = board.strips.map(s => {
                if (s.id === strip.id) return { ...s, order: newOrder };
                return s;
            });
            const updatedBoard = { ...board, strips: newStrips };
            onUpdate(updatedBoard);
            await db.saveStripboard(updatedBoard);
        }
    } 
    // Moving DOWN
    else {
        if (indexInDay < currentList.length - 1) {
            // Swap with next in same list
            const nextStrip = currentList[indexInDay + 1];
            // Swap orders
            const newStrips = board.strips.map(s => {
                if (s.id === strip.id) return { ...s, order: nextStrip.order };
                if (s.id === nextStrip.id) return { ...s, order: strip.order };
                return s;
            });
            const updatedBoard = { ...board, strips: newStrips };
            onUpdate(updatedBoard);
            await db.saveStripboard(updatedBoard);
        } else {
            // Move to top of next day
            let nextDay: string | undefined;
            if (!currentDay) {
                if (allDays.length > 0) nextDay = allDays[0];
                else return;
            } else {
                const dayIndex = allDays.indexOf(currentDay);
                if (dayIndex < allDays.length - 1) nextDay = allDays[dayIndex + 1];
                else return; // Already at bottom of last day
            }

            const nextList = nextDay ? groupedStrips[nextDay] || [] : unscheduledStrips;
            const newOrder = nextList.length > 0 ? nextList[0].order - 1 : 0;

            // Update Scene Day
            const updatedScene = { ...scene, shootDay: nextDay };
            await db.updateScene(updatedScene);
            if (onSceneUpdate) onSceneUpdate(updatedScene);

            // Update Strip Order
            const newStrips = board.strips.map(s => {
                if (s.id === strip.id) return { ...s, order: newOrder };
                return s;
            });
            const updatedBoard = { ...board, strips: newStrips };
            onUpdate(updatedBoard);
            await db.saveStripboard(updatedBoard);
        }
    }
  };

  const handleSaveDays = async (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // 1. Generate new days list
    const newDays: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        newDays.push(dateStr);
    }
    newDays.sort();
    
    // 2. Get old days sorted
    const currentDays = [...(board.shootingDays || [])].sort();
    
    // 3. Build mapping (Old Day -> New Day by index)
    const dayMapping: Record<string, string> = {};
    const daysToUnschedule: string[] = [];
    
    currentDays.forEach((oldDay, index) => {
        if (index < newDays.length) {
            dayMapping[oldDay] = newDays[index];
        } else {
            daysToUnschedule.push(oldDay);
        }
    });
    
    // 4. Find scenes to update
    const scenesToUpdate: Scene[] = [];
    (Object.values(scenes) as Scene[]).forEach(scene => {
        if (!scene.shootDay) return;
        
        if (dayMapping[scene.shootDay]) {
            // Only update if the day actually changed
            if (dayMapping[scene.shootDay] !== scene.shootDay) {
                scenesToUpdate.push({ ...scene, shootDay: dayMapping[scene.shootDay] });
            }
        } else if (daysToUnschedule.includes(scene.shootDay)) {
            scenesToUpdate.push({ ...scene, shootDay: undefined });
        }
    });

    // 5. Update scenes in DB and UI
    await Promise.all(scenesToUpdate.map(s => db.updateScene(s)));
    
    if (onSceneUpdate) {
        scenesToUpdate.forEach(s => onSceneUpdate(s));
    }
    
    // 6. Update Board
    const updatedBoard = { ...board, shootingDays: newDays };
    onUpdate(updatedBoard);
    await db.saveStripboard(updatedBoard);
    setShowAddDayModal(false);
  };

  // ... (renderStrip remains mostly same, just check logic)
  const renderStrip = (strip: Strip) => {
    const scene = scenes[strip.sceneId];
    if (!scene) return null;

    const currentDay = scene.shootDay;
    const currentList = currentDay ? groupedStrips[currentDay] || [] : unscheduledStrips;
    const indexInList = currentList.findIndex(s => s.id === strip.id);
    
    // Determine if can move UP
    let canMoveUp = false;
    if (indexInList > 0) {
        canMoveUp = true;
    } else {
        // At top of current list
        if (!currentDay) {
            // Top of Unscheduled -> Cannot move up further
            canMoveUp = false;
        } else {
            // Top of a Day -> Can move to previous day (or Unscheduled)
            // Always true if we are in a day, because Unscheduled is always "above" Day 1
            canMoveUp = true;
        }
    }

    // Determine if can move DOWN
    let canMoveDown = false;
    if (indexInList < currentList.length - 1) {
        canMoveDown = true;
    } else {
        // At bottom of current list
        if (!currentDay) {
            // Bottom of Unscheduled -> Can move to Day 1 if it exists
            if (allDays.length > 0) canMoveDown = true;
        } else {
            // Bottom of a Day -> Can move to next day if it exists
            const dayIndex = allDays.indexOf(currentDay);
            if (dayIndex < allDays.length - 1) canMoveDown = true;
        }
    }

    // Get Cast Names
    const castNames = scene.elementIds
        .map(id => elements.find(e => e.id === id))
        .filter(e => e && e.category === ElementCategory.Cast)
        .map(e => e!.name)
        .join(', ');

    return (
        <div 
        key={strip.id} 
        onClick={() => setEditingScene(scene)}
        className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 flex justify-between items-center hover:border-primary-500 dark:hover:border-primary-500 cursor-pointer shadow-sm overflow-hidden mb-2"
        >
        <div className="flex items-center gap-1 w-full">
            <div className="flex flex-col gap-0 shrink-0">
            <button 
                onClick={(e) => { e.stopPropagation(); moveStrip(strip.id, 'up'); }}
                className="text-lg hover:scale-110 transition-transform disabled:opacity-30 p-0.5 leading-none"
                disabled={!canMoveUp}
                aria-label="Sposta su"
            >
                ⬆️
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); moveStrip(strip.id, 'down'); }}
                className="text-lg hover:scale-110 transition-transform disabled:opacity-30 p-0.5 leading-none"
                disabled={!canMoveDown}
                aria-label="Sposta giù"
            >
                ⬇️
            </button>
            </div>
            {/* ... rest of render ... */}
            <span className="font-bold text-gray-900 dark:text-white w-6 text-center shrink-0">{scene.sceneNumber}</span>
            <div className="flex-1 min-w-0 ml-1">
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                {scene.intExt} {scene.setName} - {scene.dayNight}
            </div>
            <div className="text-[10px] text-gray-500 truncate">
                {scene.synopsis}
            </div>
            {castNames && (
                <div className="text-[10px] text-primary-600 dark:text-primary-400 truncate mt-0.5 font-medium">
                    <i className="fa-solid fa-user-group mr-1"></i>{castNames}
                </div>
            )}
            </div>
        </div>
        </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 shadow-lg mb-4">
      {/* ... Header ... */}
      <div 
        {...handlers}
        className={`w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors select-none ${isOpen ? 'bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700' : ''}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            <i className={`fa-solid ${isOpen ? 'fa-folder-open' : 'fa-folder'}`}></i>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">{displayName}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <span><i className="fa-regular fa-calendar mr-1"></i>{allDays.length} {t('days')}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
              <span><i className="fa-solid fa-file-lines mr-1"></i>{totalPages.toFixed(1)} {t('pages')}</span>
            </p>
          </div>
        </div>
        <div className="text-gray-400 dark:text-gray-500">
          <i className={`fa-solid fa-chevron-down transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50">
           <div className="flex gap-2 mb-4 justify-end">
             <button onClick={() => setShowAddDayModal(true)} className="text-primary-600 hover:text-primary-700 text-xs font-bold uppercase tracking-wider px-3 py-2 border border-primary-200 rounded hover:bg-primary-50">
                + Aggiungi Giorni
             </button>
             <button onClick={() => setShowPrintSetup(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">
               <i className="fa-solid fa-gear"></i>
             </button>
             <button onClick={generatePDF} className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-2 rounded flex items-center gap-2">
               <i className="fa-solid fa-file-pdf"></i> {t('download_pdf')}
             </button>
           </div>

           <div className="space-y-6">
             {/* Unscheduled */}
             {unscheduledStrips && unscheduledStrips.length > 0 && (
                <div>
                    <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest mb-2">
                        {projectName || 'NON PROGRAMMATO'}
                    </div>
                    {unscheduledStrips.map(strip => renderStrip(strip))}
                </div>
             )}

             {/* Scheduled Days */}
             {allDays.map(day => (
                 <div key={day}>
                     <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded text-center text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-widest mb-2 border border-primary-200 dark:border-primary-800">
                        {new Date(day).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                     </div>
                     {groupedStrips[day]?.map(strip => renderStrip(strip))}
                     {(!groupedStrips[day] || groupedStrips[day].length === 0) && (
                         <div className="text-center text-xs text-gray-400 italic py-2">Nessuna scena assegnata</div>
                     )}
                 </div>
             ))}
           </div>
        </div>
      )}

      {editingScene && (
        <SceneEditorModal 
          scene={editingScene} 
          elements={elements}
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

      {showAddDayModal && (
        <AddDayModal 
            onClose={() => setShowAddDayModal(false)}
            onSave={handleSaveDays}
        />
      )}
    </div>
  );
};
