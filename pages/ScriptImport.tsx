
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeScriptPdf, parseEighthsToFloat } from '../services/geminiService';
import { db } from '../services/store';
import { Scene, ProductionElement, ElementCategory, IntExt, DayNight } from '../types';
import { Button } from '../components/Button';

export const ScriptImport: React.FC = () => {
  const navigate = useNavigate();
  
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<Scene[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) {
        navigate('/');
    } else {
        setProjectId(pid);
    }
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("Evento onChange attivato");
    setShowHint(false); // Rimuovi il suggerimento se il file picker risponde
    const file = e.target.files?.[0];
    if (file) {
        // Validazione manuale (Android Chrome può essere incoerente con 'accept')
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
            console.error("File rifiutato: non è un PDF", file.type);
            alert("Errore: Il file selezionato non sembra un PDF valido.");
            return;
        }
        console.log("File accettato:", file.name, file.size);
        processFile(file);
    }
  };

  const onLabelClick = () => {
    console.log("Label cliccata - avvio timer per suggerimento fallback");
    // Se dopo 1.5 secondi non è successo nulla, mostra il suggerimento
    setTimeout(() => {
        if (!isAnalyzing && !analysisResult) {
            setShowHint(true);
        }
    }, 1500);
  };

  const processFile = async (file: File) => {
    if (!projectId) return;
    
    setIsAnalyzing(true);
    setStatus('Preparazione caricamento...');
    
    try {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            console.log("Avvio analisi Gemini...");
            setStatus('Gemini sta analizzando la tua sceneggiatura...');
            
            const result = await analyzeScriptPdf(base64);
            
            const elementsMap: Record<string, ProductionElement> = {};
            const elements: ProductionElement[] = result.elements.map(el => {
                const newEl: ProductionElement = {
                    id: crypto.randomUUID(),
                    projectId,
                    name: el.name,
                    category: el.category as ElementCategory
                };
                elementsMap[el.name] = newEl;
                return newEl;
            });
            await db.saveElements(projectId, elements);

            const scenes: Scene[] = result.scenes.map(s => {
                const elementNames = result.sceneElements[s.sceneNumber] || [];
                const elementIds = elementNames
                    .map(name => elementsMap[name]?.id)
                    .filter(id => !!id) as string[];

                return {
                    id: crypto.randomUUID(),
                    projectId,
                    sceneNumber: s.sceneNumber,
                    slugline: s.slugline,
                    intExt: s.intExt as IntExt,
                    dayNight: s.dayNight as DayNight,
                    setName: s.setName,
                    locationName: s.locationName,
                    pageCountInEighths: s.pageCountInEighths,
                    pages: parseEighthsToFloat(s.pageCountInEighths),
                    synopsis: s.synopsis,
                    elementIds
                };
            });

            setAnalysisResult(scenes);
            setStatus('Completato!');
            
            await db.saveScenes(projectId, scenes);
            await db.createDefaultStripboard(projectId, scenes);
            
            await db.saveScriptVersion({
                id: crypto.randomUUID(),
                projectId,
                fileName: file.name,
                fileUrl: '#local', 
                version: 1,
                createdAt: new Date().toISOString()
            });
        };
        reader.onerror = () => alert("Errore durante la lettura del file locale.");
        reader.readAsDataURL(file);

    } catch (error: any) {
        console.error("Errore nel processo di analisi:", error);
        alert(error.message || "Analisi fallita.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      processFile(file);
    } else {
      alert("Carica una sceneggiatura PDF valida.");
    }
  };

  if (analysisResult && analysisResult.length > 0) {
      return (
          <div className="space-y-6 max-w-4xl mx-auto">
             <div className="flex justify-between items-center bg-gray-900 sticky top-0 py-4 z-10 border-b border-gray-800">
                 <div>
                    <h1 className="text-2xl font-bold">Revisione Spoglio</h1>
                    <p className="text-gray-400 text-sm">Gemini ha identificato {analysisResult.length} scene</p>
                 </div>
                 <Button onClick={() => navigate('/stripboard')}>Vai al Piano Lav. &rarr;</Button>
             </div>
             
             <div className="grid gap-3">
                 {analysisResult.map((scene) => (
                     <div key={scene.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4 hover:border-primary-500/50 transition-colors">
                         <div className="flex-shrink-0 flex items-center justify-center bg-gray-900 w-12 h-12 rounded-lg font-bold text-lg text-primary-400 border border-gray-700">
                             {scene.sceneNumber}
                         </div>
                         <div className="flex-1 min-w-0">
                             <div className="flex flex-wrap gap-2 mb-2">
                                 <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${scene.intExt.includes('INT') ? 'bg-white text-black' : 'bg-yellow-100 text-black'}`}>
                                     {scene.intExt}
                                 </span>
                                 <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${scene.dayNight.includes('GIORNO') || scene.dayNight.includes('DAY') ? 'bg-primary-600 text-white' : 'bg-indigo-900 text-indigo-100'}`}>
                                     {scene.dayNight}
                                 </span>
                                 <span className="text-gray-400 text-xs font-bold bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                                     {scene.pageCountInEighths} PAG
                                 </span>
                             </div>
                             <h3 className="font-bold text-base truncate mb-1">{scene.slugline}</h3>
                             <p className="text-gray-400 text-sm line-clamp-2 italic">"{scene.synopsis}"</p>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-primary-600/20 text-primary-500 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-xl shadow-primary-900/20">
            <i className="fa-solid fa-file-pdf"></i>
        </div>
        <div>
            <h1 className="text-3xl font-black tracking-tight">Importa Sceneggiatura</h1>
            <p className="text-gray-400 mt-2">Carica il tuo PDF. Gemini AI estrarrà automaticamente scene, personaggi e oggetti di scena.</p>
        </div>
      </div>

      <div className="space-y-6 relative">
        <input 
            type="file" 
            id="pdf-upload"
            className="sr-only" 
            accept="application/pdf"
            onChange={handleFileChange}
            onFocus={() => console.log("Input file ha ricevuto focus")}
        />

        <label 
            htmlFor="pdf-upload"
            onClick={onLabelClick}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
                relative h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer z-20
                ${isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-gray-700 bg-gray-800 hover:bg-gray-800/80 hover:border-gray-600'}
                ${isAnalyzing ? 'pointer-events-none opacity-50' : 'pointer-events-auto'}
            `}
        >
            {!isAnalyzing ? (
                <>
                    <svg className={`w-12 h-12 mb-4 transition-transform ${isDragging ? 'scale-110 text-primary-500' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-lg font-bold text-gray-200">Tocca per caricare il PDF</p>
                    <p className="text-gray-500 text-sm mt-1">o trascinalo qui</p>
                </>
            ) : (
                <div className="text-center space-y-4 px-8 pointer-events-none">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-primary-500">
                             <i className="fa-solid fa-brain"></i>
                        </div>
                    </div>
                    <p className="font-bold text-primary-400 animate-pulse">{status}</p>
                </div>
            )}
        </label>

        {showHint && !isAnalyzing && (
            <div className="bg-yellow-900/30 border border-yellow-700/50 p-4 rounded-xl animate-in fade-in slide-in-from-top-2">
                <p className="text-xs text-yellow-200 text-center">
                    <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                    Se il selettore non si è aperto: controlla i permessi del browser o prova ad aprire questa pagina direttamente in Chrome o Firefox.
                </p>
            </div>
        )}
        
        <div className="flex items-center gap-4 text-gray-600">
            <div className="h-px bg-gray-800 flex-1"></div>
            <span className="text-xs font-bold uppercase tracking-widest">Opzione Secondaria</span>
            <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
            <h4 className="text-sm font-bold text-gray-300 mb-2">Incolla il Testo</h4>
            <textarea 
                className="w-full h-24 bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs font-mono text-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="INT. STUDIO - GIORNO..."
            />
            <Button variant="ghost" className="mt-2 text-xs h-8">Analizza Testo</Button>
        </div>

        <div className="flex items-start gap-3 p-4 bg-primary-950/20 border border-primary-900/30 rounded-2xl">
            <div className="text-primary-500 mt-0.5">
                <i className="fa-solid fa-circle-info"></i>
            </div>
            <p className="text-[11px] leading-relaxed text-primary-300/70">
                <span className="font-bold text-primary-400 block mb-0.5 uppercase tracking-tighter">Nota sulla Sicurezza</span>
                I tuoi file vengono analizzati in modo sicuro. Il modello Gemini 3 Pro analizza la struttura, ma i tuoi dati creativi rimangono privati.
            </p>
        </div>
      </div>
    </div>
  );
};
