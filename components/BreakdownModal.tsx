import React, { useState } from 'react';
import { Button } from './Button';
import { db } from '../services/store';
import { useTranslation } from '../services/i18n';
import { Stripboard, Scene, ProductionElement, ElementCategory, IntExt, DayNight } from '../types';
import { SceneEditorModal } from './SceneEditorModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Calendar, CheckCircle2, Info } from 'lucide-react';

interface BreakdownModalProps {
  board: Stripboard;
  scenes: Record<string, Scene>;
  elements: ProductionElement[];
  projectName?: string;
  onClose: () => void;
  onSceneUpdate?: (updatedScene: Scene) => void;
  onElementDeleted?: (elementId: string) => void;
}

export const BreakdownModal: React.FC<BreakdownModalProps> = ({ board, scenes, elements, projectName, onClose, onSceneUpdate, onElementDeleted }) => {
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [view, setView] = useState<'days' | 'scenes'>('days');
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { t } = useTranslation();

  const days = React.useMemo(() => {
    return Array.from(new Set((Object.values(scenes) as Scene[]).map(s => s.shootDay).filter(Boolean))).sort() as string[];
  }, [scenes]);

  const generateBreakdown = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const setup = await db.getPrintSetup(board.projectId);
      
      const targetScenes = (Object.values(scenes) as Scene[]).filter(s => {
        if (selectedDay === 'all') return s.shootDay;
        return s.shootDay === selectedDay;
      }).sort((a, b) => {
        // Sort by shooting day first (chronological)
        if (a.shootDay !== b.shootDay) {
          return (a.shootDay || '').localeCompare(b.shootDay || '');
        }
        // Then by stripboard order
        const stripA = board.strips.find(st => st.sceneId === a.id);
        const stripB = board.strips.find(st => st.sceneId === b.id);
        return (stripA?.order || 0) - (stripB?.order || 0);
      });

      if (targetScenes.length === 0) {
        alert("Nessuna scena trovata per il giorno selezionato.");
        setIsGenerating(false);
        return;
      }

      let lastProcessedDay: string | null = null;

      targetScenes.forEach((scene, index) => {
        if (index > 0) doc.addPage();

        const showBanner = scene.shootDay !== lastProcessedDay;
        lastProcessedDay = scene.shootDay || null;

        const daySetting = scene.shootDay ? setup?.daySettings?.[scene.shootDay] : null;
        const startTime = daySetting?.startTime || '08:00';
        const endTime = daySetting?.endTime || '18:00';
        const pauseStart = daySetting?.pauseStart || '13:00';
        const pauseEnd = daySetting?.pauseEnd || '14:00';

        const yOffset = showBanner ? -7 : -40;

        if (showBanner) {
          // Header
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(projectName?.toUpperCase() || "PROGETTO SENZA TITOLO", 105, 10, { align: 'center' });
          doc.line(10, 12, 200, 12);
          
          const shootDayIndex = days.indexOf(scene.shootDay || '') + 1;
          doc.text(`DAY ${shootDayIndex}`, 105, 17, { align: 'center' });
          doc.line(10, 19, 200, 19);
          
          // Location info (if available)
          doc.text(scene.locationName?.toUpperCase() || "LOCATION NON DEFINITA", 105, 24, { align: 'center' });
          doc.line(10, 26, 200, 26);
          
          const dateStr = scene.shootDay ? new Date(scene.shootDay).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : "";
          doc.text(`Shoot Day # ${shootDayIndex} ${dateStr}`, 105, 31, { align: 'center' });
          doc.line(10, 33, 200, 33);
          doc.setFont("helvetica", "normal");
        }

        // Breakdown Sheet Title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Breakdown Sheet", 105, 55 + yOffset, { align: 'center' });
        doc.setFont("helvetica", "normal");

        // Basic Info Grid
        doc.setFontSize(10);
        doc.text(`Scene #:`, 15, 50 + yOffset);
        doc.text(scene.sceneNumber, 35, 50 + yOffset);
        
        doc.text(`Sheet #:`, 140, 50 + yOffset);
        doc.text(`${index + 1}`, 160, 50 + yOffset);

        doc.text(`Script Page:`, 15, 60 + yOffset);
        // doc.text(scene.pageNumber || "", 40, 60 + yOffset);

        doc.text(`Int/Ext:`, 140, 60 + yOffset);
        doc.text(scene.intExt, 160, 60 + yOffset);

        doc.text(`Page Count:`, 15, 70 + yOffset);
        doc.text(scene.pageCountInEighths, 40, 70 + yOffset);

        doc.text(`Day/Night:`, 140, 70 + yOffset);
        doc.text(scene.dayNight, 160, 70 + yOffset);

        doc.text(`Est.Time:`, 140, 80 + yOffset);

        doc.line(10, 85 + yOffset, 200, 85 + yOffset);

        // Scene Description & Settings
        doc.setFontSize(10);
        doc.text(`Scene Description:`, 15, 95 + yOffset);
        doc.setFontSize(8);
        doc.text(scene.synopsis || "", 50, 95 + yOffset, { maxWidth: 140 });

        doc.setFontSize(10);
        doc.text(`Settings:`, 15, 105 + yOffset);
        doc.text(scene.setName?.toUpperCase() || "", 50, 105 + yOffset);

        doc.text(`Location:`, 15, 115 + yOffset);
        doc.text(scene.locationName || "", 50, 115 + yOffset);

        doc.text(`Sequence:`, 15, 125 + yOffset);
        doc.text(`Script Day:`, 110, 125 + yOffset);

        doc.line(10, 130 + yOffset, 200, 130 + yOffset);

        // Categories Grid
        const categories = [
          // Column 1
          { title: "Cast Members", key: ElementCategory.Cast, col: 0, row: 0, h: 80 },
          { title: "Special Effects", key: ElementCategory.SFX, col: 0, row: 2, h: 35 },
          { title: "Set Dressing", key: "SetDressing", col: 0, row: 3, h: 35 },
          { title: "Notes", key: "Notes", col: 0, row: 4, h: 35 },
          
          // Column 2
          { title: "Background Actors", key: ElementCategory.Background, col: 1, row: 0, h: 40 },
          { title: "Stunts", key: ElementCategory.Stunt, col: 1, row: 1, h: 40 },
          { title: "Wardrobe", key: ElementCategory.Wardrobe, col: 1, row: 2, h: 35 },
          { title: "Greenery", key: ElementCategory.Greenery, col: 1, row: 3, h: 35 },
          { title: "Music", key: ElementCategory.Music, col: 1, row: 4, h: 35 },
          
          // Column 3
          { title: "Props", key: ElementCategory.Props, col: 2, row: 0, h: 40 },
          { title: "Vehicles", key: ElementCategory.Vehicles, col: 2, row: 1, h: 40 },
          { title: "Makeup/Hair", key: ElementCategory.MakeupHair, col: 2, row: 2, h: 35 },
          { title: "Special Equipment", key: ElementCategory.SpecialEquipment, col: 2, row: 3, h: 35 },
          { title: "Sound", key: ElementCategory.Sound, col: 2, row: 4, h: 35 },
        ];

        const startY = 135 + yOffset;
        const colWidth = 62;
        const margin = 2;

        // Draw boxes
        categories.forEach((cat) => {
          const x = 10 + cat.col * (colWidth + margin);
          // Calculate Y based on previous boxes in the same column
          let y = startY;
          if (cat.row > 0) {
            const prevInCol = categories.filter(c => c.col === cat.col && c.row < cat.row);
            y += prevInCol.reduce((acc, curr) => acc + curr.h + margin, 0);
          }

          doc.rect(x, y, colWidth, cat.h);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(cat.title, x + 2, y + 4);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);

          if (cat.key !== "Notes") {
            const sceneElements = elements.filter(e => {
              if (!scene.elementIds?.includes(e.id)) return false;
              
              if (cat.key === ElementCategory.Cast) {
                return e.category === ElementCategory.Cast || (e.category || '').toLowerCase() === 'character';
              }
              if (cat.key === ElementCategory.Props) {
                const c = (e.category || '').toLowerCase();
                return c === 'props' || c === 'prop' || c.includes('oggetti') || c.includes('attrezzeria') || e.category === ElementCategory.Props;
              }
              return e.category === cat.key;
            });
            sceneElements.forEach((el, j) => {
              if (y + 8 + j * 4 < y + cat.h) {
                doc.text(`• ${el.name}`, x + 2, y + 8 + j * 4);
              }
            });
          }
        });

        doc.setFontSize(8);
        doc.text(`Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 15, 285);
        doc.text(`Page ${index + 1}`, 180, 285);
      });

      doc.save(`Spoglio_${projectName || 'Progetto'}.pdf`);
    } catch (error) {
      console.error("Error generating breakdown:", error);
      alert("Errore durante la generazione dello spoglio.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Genera Spoglio</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Script Breakdown Sheet</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {view === 'days' ? (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> Seleziona Giornata
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedDay('all')}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    selectedDay === 'all'
                      ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800'
                      : 'bg-white border-gray-100 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700'
                  }`}
                >
                  <div>
                    <span className={`block font-bold text-sm ${selectedDay === 'all' ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      Tutti i Giorni
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Genera lo spoglio completo</span>
                  </div>
                  {selectedDay === 'all' && <CheckCircle2 size={18} className="text-primary-600" />}
                </button>

                {days.map((day, idx) => (
                  <button
                    key={day}
                    onClick={() => {
                      setSelectedDay(day);
                      setView('scenes');
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedDay === day
                        ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800'
                        : 'bg-white border-gray-100 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div>
                      <span className={`block font-bold text-sm ${selectedDay === day ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        Giorno {idx + 1}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {day ? new Date(day).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) : 'Data non definita'}
                      </span>
                    </div>
                    {selectedDay === day && <CheckCircle2 size={18} className="text-primary-600" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} /> Scene del Giorno {days.indexOf(selectedDay) + 1}
                </h4>
                <button 
                  onClick={() => setView('days')}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider"
                >
                  Torna ai Giorni
                </button>
              </div>
              
              <div className="space-y-2">
                {(Object.values(scenes) as Scene[])
                  .filter(s => s.shootDay === selectedDay)
                  .sort((a, b) => {
                    const stripA = board.strips.find(st => st.sceneId === a.id);
                    const stripB = board.strips.find(st => st.sceneId === b.id);
                    return (stripA?.order || 0) - (stripB?.order || 0);
                  })
                  .map(scene => (
                    <div 
                      key={scene.id}
                      className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-between hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 dark:text-white w-6">{scene.sceneNumber}</span>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            {scene.intExt} {scene.setName} - {scene.dayNight}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 ml-8">
                          {scene.synopsis}
                        </p>
                      </div>
                      <Button 
                        variant="secondary" 
                        onClick={() => setEditingScene(scene)}
                        className="text-xs px-3 py-1.5 h-auto"
                      >
                        Modifica Elementi
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {view === 'days' && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3 bg-gray-50/50 dark:bg-gray-900/50">
            <Button variant="secondary" onClick={onClose} className="flex-1 rounded-xl h-12 font-bold uppercase tracking-wider text-xs">
              Annulla
            </Button>
            <Button 
              onClick={generateBreakdown} 
              disabled={isGenerating}
              className="flex-1 rounded-xl h-12 font-bold uppercase tracking-wider text-xs shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? 'Generazione...' : 'Genera PDF'}
            </Button>
          </div>
        )}
        
        {view === 'scenes' && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex gap-3 bg-gray-50/50 dark:bg-gray-900/50">
            <Button 
              onClick={() => setView('days')} 
              className="w-full rounded-xl h-12 font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary-500/20"
            >
              Conferma e Torna ai Giorni
            </Button>
          </div>
        )}
      </div>

      {editingScene && (
        <SceneEditorModal 
          scene={editingScene} 
          elements={elements}
          onClose={() => setEditingScene(null)} 
          onSave={async (updatedScene) => {
            if (onSceneUpdate) {
              onSceneUpdate(updatedScene);
            }
            setEditingScene(null);
          }} 
          onDeleteElement={onElementDeleted}
        />
      )}
    </div>
  );
};
