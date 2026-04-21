import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Project, Scene, ODGData, ODGSceneEntry, ODGCallEntry, ElementCategory, ProductionElement } from '../types';
import { 
  Plus, Trash2, ChevronUp, ChevronDown, Save, Share, FileText, 
  Calendar as CalendarIcon, Clock, MapPin, Users, Info, ChevronLeft,
  CheckCircle2, Circle, Clapperboard, RefreshCw, Download, Printer
} from 'lucide-react';
import { Button } from '../components/Button';
import { ODGPrintTemplate } from '../components/ODGPrintTemplate';
import { extractCrewFromDocument } from '../services/geminiService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const CREW_DEPARTMENTS: Record<string, string[]> = {
  'REGIA': ['Regista', 'Aiuto Regista', 'Assistente alla Regia', "Segretaria d'edizione"],
  'PRODUZIONE': ['Produttore Esecutivo', 'Organizzatrice di Produzione', 'Direttrice di Produzione', 'Runner'],
  'FOTOGRAFIA': ['DOP', 'Operatore (Steady)', 'Assistente Operatore', 'Aiuto Operatore', 'Video assist', 'Fotografo di Scena'],
  'ELETTRICISTI': ['Gaffer', 'Elettricista', 'Grip'],
  'COSTUMI': ['Costumista'],
  'TRUCCO': ['Truccatrice'],
  'SCENOGRAFIA': ['Scenografa', 'Aiuto Scenografia'],
  'SUONO': ['Fonico', 'Microfonista'],
  'VFX': ['Supervisore effetti visivi']
};

export const ODGPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [isImportingCrew, setIsImportingCrew] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const crewFileInputRef = useRef<HTMLInputElement>(null);

  // ODG State
  const [odgData, setOdgData] = useState<ODGData | null>(null);
  const [projectScenes, setProjectScenes] = useState<Scene[]>([]);
  const [elements, setElements] = useState<ProductionElement[]>([]);
  const [touchedTimeFields, setTouchedTimeFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId && selectedDate) {
      setTouchedTimeFields({});
      loadODGData();
    }
  }, [selectedProjectId, selectedDate]);

  const handleTimeFieldTouch = (fieldName: string) => {
    if (!touchedTimeFields[fieldName]) {
      setTouchedTimeFields(prev => ({ ...prev, [fieldName]: true }));
    }
  };

  const loadProjects = async () => {
    const data = await db.getProjects();
    setProjects(data);
    
    const currentId = localStorage.getItem('currentProjectId');
    if (currentId && (data.find(p => p.id === currentId) || currentId === 'generic')) {
      setSelectedProjectId(currentId);
    } else if (data.length > 0) {
      setSelectedProjectId(data[0].id);
    } else {
      // Default to generic if no projects exist
      setSelectedProjectId('generic');
    }
    setLoading(false);
  };

  const loadODGData = async () => {
    setLoading(true);
    const existingOdg = await db.getODG(selectedProjectId, selectedDate);
    
    let scenes: Scene[] = [];
    let elementsData: ProductionElement[] = [];
    
    if (selectedProjectId !== 'generic') {
      scenes = await db.getProjectScenes(selectedProjectId);
      elementsData = await db.getElements(selectedProjectId);
    }
    
    setProjectScenes(scenes);
    setElements(elementsData);

    if (existingOdg) {
      // If ODG exists but has no cast calls, try to auto-sync from PDL to help the user
      if (existingOdg.castCalls.length === 0) {
        const dayScenesFromPdl = scenes.filter(s => s.shootDay === selectedDate);
        const castMap = new Map<string, ProductionElement>();
        dayScenesFromPdl.forEach(s => {
          (s.elementIds || []).forEach(eid => {
            const el = elementsData.find(e => e.id === eid);
            const isCast = el && (
              el.category === ElementCategory.Cast || 
              el.category?.toLowerCase() === 'cast' || 
              el.category?.toLowerCase() === 'character' ||
              el.category?.toLowerCase() === 'attore' ||
              el.category?.toLowerCase() === 'personaggio'
            );
            if (el && isCast) {
              castMap.set(el.id, el);
            }
          });
        });

        if (castMap.size > 0) {
          const syncedCast: ODGCallEntry[] = Array.from(castMap.values()).map(el => ({
            id: crypto.randomUUID(),
            role: el.name,
            name: '',
            callTime: '',
            readyTime: '',
            notes: ''
          }));
          setOdgData({ ...existingOdg, castCalls: syncedCast });
        } else {
          setOdgData(existingOdg);
        }
      } else {
        setOdgData(existingOdg);
      }
    } else {
      const project = projects.find(p => p.id === selectedProjectId);
      
      // Identify scenes for this day in PDL
      const dayScenesFromPdl = scenes.filter(s => s.shootDay === selectedDate);
      
      // Create new default ODG scenes
      const odgScenes = dayScenesFromPdl.map((s, i) => ({
        sceneId: s.id,
        selected: true,
        order: i,
        notes: ''
      }));

      // Extract unique cast members from these scenes
      const castMap = new Map<string, ProductionElement>();
      dayScenesFromPdl.forEach(s => {
        (s.elementIds || []).forEach(eid => {
          const el = elements.find(e => e.id === eid);
          const isCast = el && (
            el.category === ElementCategory.Cast || 
            el.category?.toLowerCase() === 'cast' || 
            el.category?.toLowerCase() === 'character' ||
            el.category?.toLowerCase() === 'attore' ||
            el.category?.toLowerCase() === 'personaggio'
          );
          if (el && isCast) {
            castMap.set(el.id, el);
          }
        });
      });

      const initialCastCalls: ODGCallEntry[] = Array.from(castMap.values()).map(el => ({
        id: crypto.randomUUID(),
        role: el.name, // Character name from breakdown
        name: '', // Actor name to be filled by user
        callTime: '08:00',
        readyTime: '',
        notes: ''
      }));

      setOdgData({
        id: crypto.randomUUID(),
        projectId: selectedProjectId,
        date: selectedDate,
        shootDayNumber: 1, 
        projectName: project?.name || '',
        director: '',
        odgNumber: 1,
        baseCamp: '',
        locationCity: '',
        mainSet: '',
        setAddress: '',
        startTime: '08:00',
        readyToShootTime: '10:30',
        lunchTime: '13:00',
        wrapTime: '18:30',
        endTime: '19:00',
        metroStation: '',
        parkingInfo: '',
        hospitalInfo: '',
        executiveProducer: '',
        productionOrganizer: '',
        assistantDirector: '',
        dop: '',
        soundMixer: '',
        productionDesigner: '',
        costumeDesigner: '',
        weatherMaxTemp: '',
        weatherMinTemp: '',
        weather: '',
        sunriseTime: '',
        sunsetTime: '',
        mottoOfTheDay: '',
        scenes: odgScenes,
        castCalls: Array.from(castMap.values()).map(el => ({
          id: crypto.randomUUID(),
          role: el.name, // Character name from breakdown
          name: '', // Actor name to be filled by user
          callTime: '',
          readyTime: '',
          notes: ''
        })),
        crewCalls: [],
        transportNotes: '',
        weatherNotes: '',
        backgroundNotes: '',
        productionNotes: '',
        propsNotes: '',
        soundNotes: '',
        costumeNotes: '',
        makeupNotes: '',
        photographyNotes: '',
        regiaNotes: '',
        animaliNotes: ''
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!odgData) return;
    setSaving(true);
    await db.saveODG(odgData);
    setSaving(false);
    // Show a small toast or feedback if possible, but for now just stop loading
  };

  const updateField = (field: keyof ODGData, value: any) => {
    if (!odgData) return;
    setOdgData({ ...odgData, [field]: value });
  };

  const addManualScene = () => {
    if (!odgData) return;
    const newSceneId = 'manual-' + crypto.randomUUID();
    const newManualScene: ODGSceneEntry = {
      sceneId: newSceneId,
      selected: true,
      order: odgData.scenes.length,
      isManual: true,
      manualData: {
        sceneNumber: '1',
        slugline: 'NUOVA SCENA',
        intExt: 'INT',
        dayNight: 'GIORNO',
        locationName: '',
        castIds: '',
        pages: '1',
      }
    };
    setOdgData({
      ...odgData,
      scenes: [...odgData.scenes, newManualScene]
    });
  };

  const updateManualSceneData = (sceneId: string, field: string, value: string) => {
    if (!odgData) return;
    setOdgData({
      ...odgData,
      scenes: odgData.scenes.map(s => {
        if (s.sceneId === sceneId && s.isManual && s.manualData) {
          return {
            ...s,
            manualData: {
              ...s.manualData,
              [field]: value
            }
          };
        }
        return s;
      })
    });
  };

  const removeManualScene = (sceneId: string) => {
    if (!odgData) return;
    setOdgData({
      ...odgData,
      scenes: odgData.scenes.filter(s => s.sceneId !== sceneId)
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && odgData) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateField('productionLogo', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addCallEntry = (type: 'cast' | 'crew') => {
    if (!odgData) return;
    const newEntry: ODGCallEntry = {
      id: crypto.randomUUID(),
      role: '',
      name: '',
      callTime: '08:00',
      readyTime: '',
      notes: ''
    };
    if (type === 'cast') {
      setOdgData({ ...odgData, castCalls: [...odgData.castCalls, newEntry] });
    } else {
      setOdgData({ ...odgData, crewCalls: [...odgData.crewCalls, newEntry] });
    }
  };

  const removeCallEntry = (type: 'cast' | 'crew', id: string) => {
    if (!odgData) return;
    if (type === 'cast') {
      setOdgData({ ...odgData, castCalls: odgData.castCalls.filter(c => c.id !== id) });
    } else {
      setOdgData({ ...odgData, crewCalls: odgData.crewCalls.filter(c => c.id !== id) });
    }
  };

  const updateCallEntry = (type: 'cast' | 'crew', id: string, field: keyof ODGCallEntry, value: string) => {
    if (!odgData) return;
    const list = type === 'cast' ? [...odgData.castCalls] : [...odgData.crewCalls];
    const idx = list.findIndex(c => c.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], [field]: value };
      if (type === 'cast') {
        setOdgData({ ...odgData, castCalls: list });
      } else {
        setOdgData({ ...odgData, crewCalls: list });
      }
    }
  };

  const handleCrewImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !odgData) return;

    setIsImportingCrew(true);
    try {
      const extractedCrew = await extractCrewFromDocument(file);
      
      if (extractedCrew.length === 0) {
        alert("Non è stato possibile trovare membri della troupe nel documento. Assicurati che il formato sia corretto.");
        return;
      }

      const newEntries: ODGCallEntry[] = extractedCrew.map(crew => ({
        id: crypto.randomUUID(),
        role: crew.role || '',
        name: crew.name || '',
        department: crew.department || '',
        callTime: odgData.startTime || '08:00',
        readyTime: odgData.startTime || '08:00',
        notes: ''
      }));

      setOdgData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          crewCalls: [...prev.crewCalls, ...newEntries]
        };
      });

    } catch (error) {
      console.error("Error importing crew:", error);
      alert("Errore durante l'importazione della troupe. Assicurati che il file sia valido e riprova.");
    } finally {
      setIsImportingCrew(false);
      if (crewFileInputRef.current) {
        crewFileInputRef.current.value = '';
      }
    }
  };

  const toggleSceneSelection = (sceneId: string) => {
    if (!odgData) return;
    const newScenes = odgData.scenes.map(s => 
      s.sceneId === sceneId ? { ...s, selected: !s.selected } : s
    );
    setOdgData({ ...odgData, scenes: newScenes });
  };

  const moveScene = (idx: number, direction: 'up' | 'down') => {
    if (!odgData) return;
    const newScenes = [...odgData.scenes];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx >= 0 && targetIdx < newScenes.length) {
      [newScenes[idx], newScenes[targetIdx]] = [newScenes[targetIdx], newScenes[idx]];
      // Update orders
      const updated = newScenes.map((s, i) => ({ ...s, order: i }));
      setOdgData({ ...odgData, scenes: updated });
    }
  };

  const updateSceneNote = (sceneId: string, note: string) => {
    if (!odgData) return;
    const newScenes = odgData.scenes.map(s => 
      s.sceneId === sceneId ? { ...s, notes: note } : s
    );
    setOdgData({ ...odgData, scenes: newScenes });
  };

  const syncFromPdl = async () => {
    if (!odgData) return;
    const scenes = await db.getProjectScenes(selectedProjectId);
    const elements = await db.getElements(selectedProjectId);
    
    const dayScenesFromPdl = scenes.filter(s => s.shootDay === selectedDate);
    
    // Update scenes (keep existing notes if scene still exists)
    const newOdgScenes = dayScenesFromPdl.map((s, i) => {
      const existing = odgData.scenes.find(os => os.sceneId === s.id);
      return {
        sceneId: s.id,
        selected: existing ? existing.selected : true,
        order: i,
        notes: existing ? existing.notes : ''
      };
    });

    // Update cast (don't duplicate, keep existing if role matches)
    const castMap = new Map<string, ProductionElement>();
    dayScenesFromPdl.forEach(s => {
      (s.elementIds || []).forEach(eid => {
        const el = elements.find(e => e.id === eid);
        const isCast = el && (
          el.category === ElementCategory.Cast || 
          el.category?.toLowerCase() === 'cast' || 
          el.category?.toLowerCase() === 'character' ||
          el.category?.toLowerCase() === 'attore' ||
          el.category?.toLowerCase() === 'personaggio'
        );
        if (el && isCast) {
          castMap.set(el.id, el);
        }
      });
    });

    const currentCastCalls = [...odgData.castCalls];
    const newCastCalls: ODGCallEntry[] = [];

    // Process elements from PDL
    Array.from(castMap.values()).forEach(el => {
      // Find if this character is already in the list
      const existing = currentCastCalls.find(c => c.role.toLowerCase() === el.name.toLowerCase());
      if (existing) {
        newCastCalls.push(existing);
      } else {
        newCastCalls.push({
          id: crypto.randomUUID(),
          role: el.name,
          name: '',
          callTime: '',
          readyTime: '',
          notes: ''
        });
      }
    });

    // Keep manually added ones that have content and are not duplicates
    currentCastCalls.forEach(c => {
      const isFromPdl = Array.from(castMap.values()).some(el => el.name.toLowerCase() === c.role.toLowerCase());
      const hasContent = c.role.trim() !== '' || c.name.trim() !== '';
      if (!isFromPdl && hasContent) {
        newCastCalls.push(c);
      }
    });

    setOdgData({
      ...odgData,
      scenes: newOdgScenes,
      castCalls: newCastCalls
    });
  };

  const handleExportPDF = async () => {
    if (!odgData) return;
    
    // First save the data
    await handleSave();
    
    const element = document.getElementById('odg-print-template');
    if (!element) return;

    try {
      // Small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      if (canvasWidth === 0 || canvasHeight === 0) {
        throw new Error('Canvas dimensions are zero');
      }
      
      const ratio = pdfWidth / canvasWidth;
      let finalHeight = canvasHeight * ratio;

      if (!isFinite(finalHeight) || isNaN(finalHeight) || finalHeight <= 0) {
        console.warn('Invalid final height calculated, using default page height');
        finalHeight = pdfHeight;
      }

      let heightLeft = finalHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, finalHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - finalHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, finalHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`ODG_${odgData.projectName}_${odgData.date}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Errore durante la generazione del PDF. Riprova.');
    }
  };

  if (loading && projects.length === 0) {
    return <div className="p-8 text-center">Caricamento...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 pb-32">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700">
          <ChevronLeft size={18} />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest">Torna alla Suite</span>
      </button>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">
            <FileText size={14} />
            <span>Ordine del Giorno</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">ODG DAILY</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Compila il programma di lavoro per questa giornata di riprese.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Progetto</label>
            <select 
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm font-bold p-2 focus:ring-2 focus:ring-blue-500"
            >
              {projects.length === 0 && <option value="generic">Nuovo ODG</option>}
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              {projects.length > 0 && <option value="generic">+ Nuovo ODG (Libero)</option>}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Data</label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm font-bold p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button variant="secondary" onClick={syncFromPdl} disabled={selectedProjectId === 'generic'} className="h-10" title={selectedProjectId === 'generic' ? "Crea scene manualmente per ODG liberi" : "Sincronizza scene e cast dal PDL"}>
            <RefreshCw size={18} />
            <span className="hidden md:inline">Sincronizza</span>
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={saving} className="h-10">
            <Save size={18} className={saving ? 'animate-spin' : ''} />
            <span className="hidden md:inline">{saving ? 'Salvataggio...' : 'Salva'}</span>
          </Button>
          <Button onClick={handleExportPDF} className="h-10 bg-blue-600 hover:bg-blue-700">
            <Download size={18} />
            <span>Esporta PDF</span>
          </Button>
        </div>
      </div>

      {odgData && (
        <div className="space-y-10">
          {/* Sezione 1: Info Generali */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black uppercase tracking-tight">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                  <Info size={18} />
                </div>
                <h2>Info Generali Set</h2>
              </div>
              
              <div className="flex items-center gap-4">
                {odgData.productionLogo && (
                  <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white shadow-sm">
                    <img src={odgData.productionLogo} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                )}
                
                <div className="flex items-end gap-2">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-gray-400 uppercase whitespace-nowrap">carica logo produzione</span>
                    <input 
                      type="file" 
                      ref={logoInputRef} 
                      onChange={handleLogoUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <Button 
                      variant="secondary" 
                      onClick={() => logoInputRef.current?.click()}
                      className="h-10 w-10 p-0 rounded-xl border-orange-500/20 hover:border-orange-500/50"
                    >
                      <Plus size={20} />
                    </Button>
                  </div>
                  
                  {odgData.productionLogo && (
                    <Button 
                      variant="ghost" 
                      onClick={() => updateField('productionLogo', undefined)}
                      className="h-10 w-10 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Progetto / Film</label>
                <input 
                  type="text" 
                  value={odgData.projectName}
                  onChange={(e) => updateField('projectName', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">ODG #</label>
                <input 
                  type="number" 
                  value={odgData.odgNumber || odgData.shootDayNumber}
                  onChange={(e) => updateField('odgNumber', parseInt(e.target.value))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">N° Giorno di Lav.</label>
                <input 
                  type="number" 
                  value={odgData.shootDayNumber}
                  onChange={(e) => updateField('shootDayNumber', parseInt(e.target.value))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Campo Base / Punto di Ritrovo</label>
                <input 
                  type="text" 
                  value={odgData.baseCamp}
                  onChange={(e) => updateField('baseCamp', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Località</label>
                <input 
                  type="text" 
                  value={odgData.locationCity}
                  onChange={(e) => updateField('locationCity', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Location / Set Principale</label>
                <input 
                  type="text" 
                  value={odgData.mainSet}
                  onChange={(e) => updateField('mainSet', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Indirizzo Set</label>
                <input 
                  type="text" 
                  value={odgData.setAddress}
                  onChange={(e) => updateField('setAddress', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Metro più vicina</label>
                <input 
                  type="text" 
                  value={odgData.metroStation || ''}
                  onChange={(e) => updateField('metroStation', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Parcheggio più vicino</label>
                <input 
                  type="text" 
                  value={odgData.parkingInfo || ''}
                  onChange={(e) => updateField('parkingInfo', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Ospedale più vicino</label>
                <input 
                  type="text" 
                  value={odgData.hospitalInfo || ''}
                  onChange={(e) => updateField('hospitalInfo', e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Pasti Troupe</label>
                <input 
                  type="number" 
                  value={odgData.crewMeals || ''}
                  onChange={(e) => updateField('crewMeals', e.target.value)}
                  placeholder="Es. 36"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-5 gap-x-2 gap-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase leading-tight">Inizio Lav.</label>
                <label className="text-[10px] font-bold text-gray-400 uppercase leading-tight">Pronti Girare</label>
                <label className="text-[10px] font-bold text-gray-400 uppercase leading-tight">Pausa Pranzo</label>
                <label className="text-[10px] font-bold text-gray-400 uppercase leading-tight">Fine Riprese</label>
                <label className="text-[10px] font-bold text-gray-400 uppercase leading-tight">Fine Lav.</label>

                <input 
                  type="time" 
                  value={odgData.startTime}
                  onChange={(e) => { updateField('startTime', e.target.value); handleTimeFieldTouch('startTime'); }}
                  onClick={() => handleTimeFieldTouch('startTime')}
                  className={`w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all ${touchedTimeFields['startTime'] ? 'ring-2 ring-blue-500 border-none' : 'border-none'}`}
                />
                <input 
                  type="time" 
                  value={odgData.readyToShootTime || ''}
                  onChange={(e) => { updateField('readyToShootTime', e.target.value); handleTimeFieldTouch('readyToShootTime'); }}
                  onClick={() => handleTimeFieldTouch('readyToShootTime')}
                  className={`w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all ${touchedTimeFields['readyToShootTime'] ? 'ring-2 ring-blue-500 border-none' : 'border-none'}`}
                />
                <input 
                  type="time" 
                  value={odgData.lunchTime}
                  onChange={(e) => { updateField('lunchTime', e.target.value); handleTimeFieldTouch('lunchTime'); }}
                  onClick={() => handleTimeFieldTouch('lunchTime')}
                  className={`w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all ${touchedTimeFields['lunchTime'] ? 'ring-2 ring-blue-500 border-none' : 'border-none'}`}
                />
                <input 
                  type="time" 
                  value={odgData.wrapTime || ''}
                  onChange={(e) => { updateField('wrapTime', e.target.value); handleTimeFieldTouch('wrapTime'); }}
                  onClick={() => handleTimeFieldTouch('wrapTime')}
                  className={`w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all ${touchedTimeFields['wrapTime'] ? 'ring-2 ring-blue-500 border-none' : 'border-none'}`}
                />
                <input 
                  type="time" 
                  value={odgData.endTime}
                  onChange={(e) => { updateField('endTime', e.target.value); handleTimeFieldTouch('endTime'); }}
                  onClick={() => handleTimeFieldTouch('endTime')}
                  className={`w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all ${touchedTimeFields['endTime'] ? 'ring-2 ring-blue-500 border-none' : 'border-none'}`}
                />
              </div>
            </div>
          </section>

          {/* Sezione Nuova: Responsabili e Meteo */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black uppercase tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600">
                <Users size={18} />
              </div>
              <h2>Responsabili</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Produttore Esecutivo</label>
                <input 
                  type="text" 
                  value={odgData.executiveProducer || ''} 
                  onChange={(e) => updateField('executiveProducer', e.target.value)} 
                  placeholder="es. Nome e cognome, Numero di Telefono"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Organizzatrice Prod.</label>
                <input 
                  type="text" 
                  value={odgData.productionOrganizer || ''} 
                  onChange={(e) => updateField('productionOrganizer', e.target.value)} 
                  placeholder="es. Nome e cognome, Numero di Telefono"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Regista</label>
                <input 
                  type="text" 
                  value={odgData.director || ''} 
                  onChange={(e) => updateField('director', e.target.value)} 
                  placeholder="es. Nome e cognome, Numero di Telefono"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Aiuto Regia</label>
                <input 
                  type="text" 
                  value={odgData.assistantDirector || ''} 
                  onChange={(e) => updateField('assistantDirector', e.target.value)} 
                  placeholder="es. Nome e cognome, Numero di Telefono"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">DoP</label>
                <input 
                  type="text" 
                  value={odgData.dop || ''} 
                  onChange={(e) => updateField('dop', e.target.value)} 
                  placeholder="es. Nome e cognome"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Fonico</label>
                <input 
                  type="text" 
                  value={odgData.soundMixer || ''} 
                  onChange={(e) => updateField('soundMixer', e.target.value)} 
                  placeholder="es. Nome e cognome"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Scenografia</label>
                <input 
                  type="text" 
                  value={odgData.productionDesigner || ''} 
                  onChange={(e) => updateField('productionDesigner', e.target.value)} 
                  placeholder="es. Nome e cognome"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Costumista</label>
                <input 
                  type="text" 
                  value={odgData.costumeDesigner || ''} 
                  onChange={(e) => updateField('costumeDesigner', e.target.value)} 
                  placeholder="es. Nome e cognome"
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Meteo</label>
                <input 
                  type="text" 
                  value={odgData.weather || ''} 
                  onChange={(e) => updateField('weather', e.target.value)} 
                  placeholder="pioggia, nuvoloso, soleggiato ecc."
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Temperatura (Max / Min)</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Max" value={odgData.weatherMaxTemp || ''} onChange={(e) => updateField('weatherMaxTemp', e.target.value)} className="w-1/2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" />
                  <input type="text" placeholder="Min" value={odgData.weatherMinTemp || ''} onChange={(e) => updateField('weatherMinTemp', e.target.value)} className="w-1/2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Alba / Tramonto</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Alba" value={odgData.sunriseTime || ''} onChange={(e) => updateField('sunriseTime', e.target.value)} className="w-1/2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" />
                  <input type="text" placeholder="Tramonto" value={odgData.sunsetTime || ''} onChange={(e) => updateField('sunsetTime', e.target.value)} className="w-1/2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs" />
                </div>
              </div>
              <div className="space-y-1 md:col-span-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Motto del Giorno</label>
                <input type="text" value={odgData.mottoOfTheDay || ''} onChange={(e) => updateField('mottoOfTheDay', e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-2 text-xs italic" placeholder="es. Il tempo vola quando ci si diverte!" />
              </div>
            </div>
          </section>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black uppercase tracking-tight">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                  <Clapperboard size={18} />
                </div>
                <h2>Scene da Girare</h2>
              </div>
              <button 
                onClick={addManualScene}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Aggiungi Scena</span>
              </button>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              {odgData.scenes.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  Nessuna scena prevista per questa data nel piano di lavorazione.
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {odgData.scenes.map((s, idx) => {
                    const original = projectScenes.find(ps => ps.id === s.sceneId);
                    
                    if (s.isManual) {
                      return (
                        <div key={s.sceneId} className={`p-4 flex items-start gap-4 transition-colors ${s.selected ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'bg-gray-50/50 dark:bg-gray-800/20 opacity-60'}`}>
                          <button 
                            onClick={() => toggleSceneSelection(s.sceneId)}
                            className={`mt-1 flex-shrink-0 ${s.selected ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}
                          >
                            {s.selected ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                          </button>
                          
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Scena Manuale</span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => moveScene(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                                >
                                  <ChevronUp size={16} />
                                </button>
                                <button 
                                  onClick={() => moveScene(idx, 'down')}
                                  disabled={idx === odgData.scenes.length - 1}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                                >
                                  <ChevronDown size={16} />
                                </button>
                                <button 
                                  onClick={() => removeManualScene(s.sceneId)}
                                  className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Sc.</label>
                                <input 
                                  type="text" 
                                  value={s.manualData?.sceneNumber || ''} 
                                  onChange={(e) => updateManualSceneData(s.sceneId, 'sceneNumber', e.target.value)}
                                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-emerald-500" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Int/Est</label>
                                <input 
                                  type="text" 
                                  placeholder="INT o EST"
                                  value={s.manualData?.intExt || ''} 
                                  onChange={(e) => updateManualSceneData(s.sceneId, 'intExt', e.target.value)}
                                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-emerald-500 uppercase" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Giorno/Notte</label>
                                <input 
                                  type="text" 
                                  placeholder="GIORNO o NOTTE"
                                  value={s.manualData?.dayNight || ''} 
                                  onChange={(e) => updateManualSceneData(s.sceneId, 'dayNight', e.target.value)}
                                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-emerald-500 uppercase" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Pagine (es. 1 1/8)</label>
                                <input 
                                  type="text" 
                                  placeholder="es. 1 1/8"
                                  value={s.manualData?.pages || ''} 
                                  onChange={(e) => updateManualSceneData(s.sceneId, 'pages', e.target.value)}
                                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-emerald-500" 
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div className="md:col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Ambiente / Descrizione</label>
                                <input 
                                  type="text" 
                                  value={s.manualData?.slugline || ''} 
                                  onChange={(e) => updateManualSceneData(s.sceneId, 'slugline', e.target.value)}
                                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-emerald-500" 
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Location Reale</label>
                                <input 
                                  type="text" 
                                  value={s.manualData?.locationName || ''} 
                                  onChange={(e) => updateManualSceneData(s.sceneId, 'locationName', e.target.value)}
                                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-emerald-500" 
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Cast (ID Separati da virgola)</label>
                              <input 
                                type="text" 
                                placeholder="es. 1, 2, 4"
                                value={s.manualData?.castIds || ''} 
                                onChange={(e) => updateManualSceneData(s.sceneId, 'castIds', e.target.value)}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-emerald-500" 
                              />
                            </div>

                            {s.selected && (
                              <input 
                                type="text"
                                placeholder="Aggiungi note per questa scena nell'OdG..."
                                value={s.notes}
                                onChange={(e) => updateSceneNote(s.sceneId, e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-[0.5px] border-emerald-500/30 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-2"
                              />
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={s.sceneId} className={`p-4 flex items-start gap-4 transition-colors ${s.selected ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/20 opacity-60'}`}>
                        <button 
                          onClick={() => toggleSceneSelection(s.sceneId)}
                          className={`mt-1 flex-shrink-0 ${s.selected ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}
                        >
                          {s.selected ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                        </button>
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px] font-black text-gray-900 dark:text-white uppercase">Sc. {original?.sceneNumber}</span>
                              <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate uppercase tracking-tight">{original?.slugline}</h3>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => moveScene(idx, 'up')}
                                disabled={idx === 0}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button 
                                onClick={() => moveScene(idx, 'down')}
                                disabled={idx === odgData.scenes.length - 1}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <span>{original?.intExt}</span>
                            <span>•</span>
                            <span>{original?.dayNight}</span>
                            <span>•</span>
                            <span>{original?.locationName}</span>
                          </div>
                          {s.selected && (
                            <input 
                              type="text"
                              placeholder="Aggiungi note per questa scena nell'OdG..."
                              value={s.notes}
                              onChange={(e) => updateSceneNote(s.sceneId, e.target.value)}
                              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Sezione 3: Convocazioni Cast */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black uppercase tracking-tight">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                    <Users size={18} />
                  </div>
                  <h2>Convocazioni Cast</h2>
                </div>
                <button 
                  onClick={syncFromPdl}
                  className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-blue-500 transition-colors"
                  title="Sincronizza dal PDL"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <button 
                onClick={() => addCallEntry('cast')}
                className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Aggiungi Attore</span>
              </button>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Personaggio / Attore</th>
                    <th className="px-2 py-3">Scene</th>
                    <th className="px-2 py-3">Pick-Up</th>
                    <th className="px-2 py-3">Trucco</th>
                    <th className="px-2 py-3">Cost.</th>
                    <th className="px-2 py-3">Pronto</th>
                    <th className="px-2 py-3">Set</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {odgData.castCalls.map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 min-w-[200px]">
                        <div className="flex flex-col gap-1">
                          <input 
                            type="text" 
                            value={c.role}
                            onChange={(e) => updateCallEntry('cast', c.id, 'role', e.target.value)}
                            className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white"
                            placeholder="PERSONAGGIO"
                          />
                          <input 
                            type="text" 
                            value={c.name}
                            onChange={(e) => updateCallEntry('cast', c.id, 'name', e.target.value)}
                            className="w-full bg-blue-50/50 dark:bg-blue-900/10 border-none px-2 py-0.5 focus:ring-0 text-[11px] text-blue-700 dark:text-blue-400 font-bold placeholder:text-blue-300 dark:placeholder:text-blue-700/50 rounded"
                            placeholder="Attore..."
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" value={c.scenes || ''} onChange={(e) => updateCallEntry('cast', c.id, 'scenes', e.target.value)} className="w-12 bg-transparent border-none p-0 focus:ring-0 text-xs text-center" placeholder="1,2" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="time" value={c.pickupTime || ''} onChange={(e) => updateCallEntry('cast', c.id, 'pickupTime', e.target.value)} className="w-16 bg-transparent border-none p-0 focus:ring-0 text-xs" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="time" value={c.makeupTime || ''} onChange={(e) => updateCallEntry('cast', c.id, 'makeupTime', e.target.value)} className="w-16 bg-transparent border-none p-0 focus:ring-0 text-xs" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="time" value={c.costumeTime || ''} onChange={(e) => updateCallEntry('cast', c.id, 'costumeTime', e.target.value)} className="w-16 bg-transparent border-none p-0 focus:ring-0 text-xs" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="time" value={c.readyTime || ''} onChange={(e) => updateCallEntry('cast', c.id, 'readyTime', e.target.value)} className="w-16 bg-transparent border-none p-0 focus:ring-0 text-xs font-bold text-blue-600" />
                      </td>
                      <td className="px-2 py-2">
                        <input type="time" value={c.setTime || ''} onChange={(e) => updateCallEntry('cast', c.id, 'setTime', e.target.value)} className="w-16 bg-transparent border-none p-0 focus:ring-0 text-xs" />
                      </td>
                      <td className="px-2 py-2">
                        <button onClick={() => removeCallEntry('cast', c.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {odgData.castCalls.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-xs italic">
                        Nessun attore inserito. Clicca "+" per aggiungere.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sezione 4: Convocazioni Troupe */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black uppercase tracking-tight">
                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                  <Users size={18} />
                </div>
                <h2>Convocazioni Troupe</h2>
              </div>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer">
                  {isImportingCrew ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  <span>{isImportingCrew ? 'Importazione...' : 'Importa'}</span>
                  <input
                    type="file"
                    ref={crewFileInputRef}
                    onChange={handleCrewImport}
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    disabled={isImportingCrew}
                  />
                </label>
                <button 
                  onClick={() => {
                    setSelectedDepartment(null);
                    setShowCrewModal(true);
                  }}
                  className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
                >
                  <Plus size={14} />
                  <span>Aggiungi Reparto</span>
                </button>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Qualifica / Reparto</th>
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Conv.</th>
                    <th className="px-4 py-3">Note / Logistica</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {odgData.crewCalls.map(c => (
                    <tr key={c.id}>
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          {c.department && <span className="text-[9px] text-gray-400 font-bold uppercase">{c.department}</span>}
                          <input 
                            type="text" 
                            value={c.role}
                            onChange={(e) => updateCallEntry('crew', c.id, 'role', e.target.value)}
                            className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm font-medium"
                            placeholder="es. Regista"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          value={c.name}
                          onChange={(e) => updateCallEntry('crew', c.id, 'name', e.target.value)}
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm"
                          placeholder="Nome Cognome"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="time" 
                          value={c.callTime}
                          onChange={(e) => updateCallEntry('crew', c.id, 'callTime', e.target.value)}
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          value={c.notes || ''}
                          onChange={(e) => updateCallEntry('crew', c.id, 'notes', e.target.value)}
                          className="w-full bg-transparent border-none p-0 focus:ring-0 text-xs text-gray-500"
                          placeholder="es. Arrivo diretto"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <button onClick={() => removeCallEntry('crew', c.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {odgData.crewCalls.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-xs italic">
                        Nessun reparto inserito. Clicca "+" per aggiungere.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sezione 5: Note per Reparti */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black uppercase tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600">
                <FileText size={18} />
              </div>
              <h2>Note per Reparti & Fabbisogni</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Scenografia / Arredamento</label>
                <textarea value={odgData.propsNotes || ''} onChange={(e) => updateField('propsNotes', e.target.value)} rows={3} className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Fabbisogni di scena..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Suono</label>
                <textarea value={odgData.soundNotes || ''} onChange={(e) => updateField('soundNotes', e.target.value)} rows={3} className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Note per il reparto audio..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Costumi</label>
                <textarea value={odgData.costumeNotes || ''} onChange={(e) => updateField('costumeNotes', e.target.value)} rows={3} className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Note costumi..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Trucco / Parrucco</label>
                <textarea value={odgData.makeupNotes || ''} onChange={(e) => updateField('makeupNotes', e.target.value)} rows={3} className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Note trucco..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Fotografia</label>
                <textarea value={odgData.photographyNotes || ''} onChange={(e) => updateField('photographyNotes', e.target.value)} rows={3} className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Note fotografia..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Regia</label>
                <textarea value={odgData.regiaNotes || ''} onChange={(e) => updateField('regiaNotes', e.target.value)} rows={3} className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Note regia..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Animali / Veicoli / Comparse</label>
                <textarea value={odgData.animaliNotes || ''} onChange={(e) => updateField('animaliNotes', e.target.value)} rows={3} className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" placeholder="Note animali, veicoli, comparse..." />
              </div>
            </div>
          </section>

          {/* Sezione 6: Note Logistiche */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-black uppercase tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-600">
                <MapPin size={18} />
              </div>
              <h2>Note Logistiche & Varie</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Trasporti e Parcheggi</label>
                <textarea 
                  value={odgData.transportNotes}
                  onChange={(e) => updateField('transportNotes', e.target.value)}
                  rows={3}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm"
                  placeholder="Info su parcheggi, navette, permessi ZTL..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Meteo e Note Tecniche</label>
                <textarea 
                  value={odgData.weatherNotes}
                  onChange={(e) => updateField('weatherNotes', e.target.value)}
                  rows={3}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm"
                  placeholder="Previsioni meteo, necessità gruppi elettrogeni, acqua..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Comparse / Figurazioni / Animali / Veicoli</label>
                <textarea 
                  value={odgData.backgroundNotes}
                  onChange={(e) => updateField('backgroundNotes', e.target.value)}
                  rows={3}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm"
                  placeholder="Dettagli su figurazioni speciali, animali sul set, veicoli di scena..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Note Produzione / Numeri Utili</label>
                <textarea 
                  value={odgData.productionNotes}
                  onChange={(e) => updateField('productionNotes', e.target.value)}
                  rows={3}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm"
                  placeholder="Numeri di telefono produzione, aiuto regia, emergenza..."
                />
              </div>
            </div>
          </section>

          {/* Riepilogo e Export */}
          <div className="pt-10 border-t border-gray-200 dark:border-gray-800 flex flex-col items-center gap-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Pronto per il set?</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Verifica i dati e genera il PDF professionale da condividere con la troupe.</p>
            </div>
            <div className="flex gap-4">
              <Button onClick={handleSave} variant="secondary" disabled={saving} className="h-12 px-8">
                <Save size={18} />
                <span>{saving ? 'Salvataggio...' : 'Salva'}</span>
              </Button>
              <Button onClick={handleExportPDF} className="h-12 px-8 bg-blue-600 hover:bg-blue-700">
                <Download size={18} />
                <span>Esporta PDF</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Template */}
      <div id="odg-print-container" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {odgData && <ODGPrintTemplate data={odgData} projectScenes={projectScenes} elements={elements} />}
      </div>

      {/* Crew Modal */}
      {showCrewModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowCrewModal(false);
            setSelectedDepartment(null);
          }}
        >
          <div 
            className="bg-white dark:bg-gray-900 border-2 border-orange-500/20 dark:border-orange-500/30 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] w-full max-w-[320px] overflow-hidden flex flex-col max-h-[60vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-sm font-black uppercase tracking-widest text-orange-600 dark:text-orange-500">
                {selectedDepartment ? selectedDepartment : 'Aggiungi Reparto'}
              </h3>
              <button 
                onClick={() => {
                  if (selectedDepartment) {
                    setSelectedDepartment(null);
                  } else {
                    setShowCrewModal(false);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                {selectedDepartment ? <ChevronLeft size={20} /> : <span className="text-lg">✕</span>}
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {!selectedDepartment ? (
                <div className="grid grid-cols-1 gap-2">
                  {Object.keys(CREW_DEPARTMENTS).map(dept => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDepartment(dept)}
                      className="p-3 text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all border border-transparent hover:border-orange-200 dark:hover:border-orange-800 flex justify-between items-center group"
                    >
                      <span className="group-hover:text-orange-600 transition-colors">{dept}</span>
                      <ChevronDown size={14} className="-rotate-90 text-gray-300 group-hover:text-orange-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {CREW_DEPARTMENTS[selectedDepartment].map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        if (!odgData) return;
                        const newEntry: ODGCallEntry = {
                          id: Date.now().toString() + Math.random().toString(36).substring(7),
                          role: role,
                          name: '',
                          department: selectedDepartment,
                          callTime: odgData.startTime || '08:00',
                          readyTime: odgData.startTime || '08:00',
                          notes: ''
                        };
                        setOdgData({
                          ...odgData,
                          crewCalls: [...odgData.crewCalls, newEntry]
                        });
                        setShowCrewModal(false);
                        setSelectedDepartment(null);
                      }}
                      className="p-3 text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl text-xs font-medium transition-all border border-transparent hover:border-orange-200 dark:hover:border-orange-800"
                    >
                      {role}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      if (!odgData) return;
                      const newEntry: ODGCallEntry = {
                        id: Date.now().toString() + Math.random().toString(36).substring(7),
                        role: '',
                        name: '',
                        department: selectedDepartment,
                        callTime: odgData.startTime || '08:00',
                        readyTime: odgData.startTime || '08:00',
                        notes: ''
                      };
                      setOdgData({
                        ...odgData,
                        crewCalls: [...odgData.crewCalls, newEntry]
                      });
                      setShowCrewModal(false);
                      setSelectedDepartment(null);
                    }}
                    className="p-3 text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-xl text-xs font-medium transition-all italic text-gray-400 border border-transparent hover:border-orange-200 dark:hover:border-orange-800"
                  >
                    + Altro (inserisci manualmente)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
