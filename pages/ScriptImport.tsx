
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeScriptPdf, parseEighthsToFloat } from '../services/geminiService';
import { db } from '../services/store';
import { Scene, ProductionElement, ElementCategory, IntExt, DayNight } from '../types';
import { Button } from '../components/Button';

// Mock/Example Firebase config - ideally this would be in a separate service file
// For this implementation, we handle the UI/Logic parts requested
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { initializeApp, getApps } from "firebase/app";

// Temporary Firebase Init (fallback to alert if env not set)
const firebaseConfig = {
  apiKey: "AIza...", // Dummy for example, users must provide their own via env if needed
  authDomain: "nico-pro.firebaseapp.com",
  projectId: "nico-pro",
  storageBucket: "nico-pro.appspot.com",
};

export const ScriptImport: React.FC = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<Scene[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Debug State
  const [logs, setLogs] = useState<string[]>([]);
  const [debug, setDebug] = useState({
    tapReceived: false,
    inputFired: false,
    fileName: '',
    fileSize: 0,
    progress: 0,
    state: 'idle',
    lastError: ''
  });

  const addLog = (msg: string) => {
    console.log(`[ImportLog] ${msg}`);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) {
        navigate('/');
    } else {
        setProjectId(pid);
    }
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addLog("Evento input 'change' rilevato");
    setDebug(d => ({ ...d, inputFired: true }));
    
    const file = e.target.files?.[0];
    if (!file) {
      addLog("Nessun file selezionato");
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setDebug(d => ({ ...d, fileName: file.name, fileSize: file.size, state: 'picking' }));
    
    if (!isPdf) {
      const err = "File non valido: deve essere un PDF";
      addLog(err);
      setDebug(d => ({ ...d, lastError: err, state: 'error' }));
      alert(err);
      return;
    }

    addLog(`File pronto per upload: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    startUpload(file);
  };

  const startUpload = async (file: File) => {
    if (!projectId) return;
    setDebug(d => ({ ...d, state: 'uploading', progress: 0 }));
    setStatus('Caricamento su Storage...');
    addLog("Inizio caricamento su Firebase Storage...");

    // Se Firebase non è configurato, proseguiamo direttamente con Gemini per non bloccare
    if (getApps().length === 0) {
       addLog("Firebase non inizializzato. Salto upload e procedo con analisi Gemini...");
       processWithGemini(file);
       return;
    }

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `scripts/${projectId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setDebug(d => ({ ...d, progress }));
          addLog(`Progresso upload: ${progress.toFixed(0)}%`);
        }, 
        (error) => {
          addLog(`Errore Firebase Storage: ${error.code} - ${error.message}`);
          setDebug(d => ({ ...d, lastError: error.message, state: 'error' }));
          if (error.code === 'storage/unauthorized') {
            alert("Errore permessi Firebase: Assicurati che le Storage Rules siano impostate su 'allow read, write: if true;' per i test o verifica di essere loggato.");
          }
        }, 
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            addLog("Upload completato con successo!");
            setDebug(d => ({ ...d, state: 'done', progress: 100 }));
            processWithGemini(file, downloadURL);
          });
        }
      );
    } catch (e: any) {
      addLog(`Errore critico: ${e.message}`);
      setDebug(d => ({ ...d, lastError: e.message, state: 'error' }));
    }
  };

  const processWithGemini = async (file: File, remoteUrl?: string) => {
    setIsAnalyzing(true);
    setStatus('Gemini sta analizzando la sceneggiatura...');
    addLog("Inizio analisi AI con Gemini Pro...");
    
    try {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            const result = await analyzeScriptPdf(base64);
            
            const elementsMap: Record<string, ProductionElement> = {};
            const elements: ProductionElement[] = result.elements.map(el => {
                const newEl: ProductionElement = {
                    id: crypto.randomUUID(),
                    projectId: projectId!,
                    name: el.name,
                    category: el.category as ElementCategory
                };
                elementsMap[el.name] = newEl;
                return newEl;
            });
            await db.saveElements(projectId!, elements);

            const scenes: Scene[] = result.scenes.map(s => {
                const elementNames = result.sceneElements[s.sceneNumber] || [];
                const elementIds = elementNames
                    .map(name => elementsMap[name]?.id)
                    .filter(id => !!id) as string[];

                return {
                    id: crypto.randomUUID(),
                    projectId: projectId!,
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
            setStatus('Analisi completata!');
            addLog("Risultati ricevuti da Gemini");
            
            await db.saveScenes(projectId!, scenes);
            await db.createDefaultStripboard(projectId!, scenes);
            await db.saveScriptVersion({
                id: crypto.randomUUID(),
                projectId: projectId!,
                fileName: file.name,
                fileUrl: remoteUrl || '#local', 
                version: 1,
                createdAt: new Date().toISOString()
            });
        };
        reader.readAsDataURL(file);
    } catch (error: any) {
        addLog(`Errore Gemini: ${error.message}`);
        alert("Gemini non è riuscito ad analizzare il file. Controlla la console.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleLabelTouch = () => {
    addLog("Tap/Touch sulla label ricevuto");
    setDebug(d => ({ ...d, tapReceived: true }));
  };

  if (analysisResult && analysisResult.length > 0) {
      return (
          <div className="space-y-6 max-w-4xl mx-auto">
             <div className="flex justify-between items-center bg-gray-900 sticky top-0 py-4 z-10 border-b border-gray-800 px-4">
                 <div>
                    <h1 className="text-2xl font-bold">Revisione Spoglio</h1>
                    <p className="text-gray-400 text-sm">Identificate {analysisResult.length} scene</p>
                 </div>
                 <Button onClick={() => navigate('/stripboard')}>Piano Lav. &rarr;</Button>
             </div>
             <div className="grid gap-3 px-4">
                 {analysisResult.map((scene) => (
                     <div key={scene.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4">
                         <div className="flex-shrink-0 flex items-center justify-center bg-gray-900 w-12 h-12 rounded-lg font-bold text-primary-400">{scene.sceneNumber}</div>
                         <div className="flex-1 min-w-0">
                             <h3 className="font-bold truncate">{scene.slugline}</h3>
                             <p className="text-gray-400 text-sm italic">"{scene.synopsis}"</p>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4 pb-40">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-primary-600/20 text-primary-500 rounded-3xl flex items-center justify-center mx-auto text-4xl shadow-xl shadow-primary-900/20">
            <i className="fa-solid fa-file-pdf"></i>
        </div>
        <h1 className="text-3xl font-black tracking-tight">Importa Sceneggiatura</h1>
        <p className="text-gray-400">Carica il PDF per estrarre scene e personaggi con l'AI.</p>
      </div>

      <div className="space-y-6 relative">
        {/* Input Reale Nascosto */}
        <input 
            type="file" 
            id="pdf-upload-input"
            className="sr-only" 
            accept="application/pdf"
            onChange={handleFileChange}
            ref={inputRef}
        />

        {/* Label cliccabile (Bottone Principale) */}
        <label 
            htmlFor="pdf-upload-input"
            onClick={handleLabelTouch}
            onPointerDown={handleLabelTouch}
            className={`
                relative h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer z-30 select-none
                ${isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-gray-700 bg-gray-800 hover:bg-gray-800/80'}
                ${isAnalyzing ? 'pointer-events-none opacity-50' : 'pointer-events-auto'}
            `}
        >
            {!isAnalyzing && debug.state !== 'uploading' ? (
                <div className="text-center pointer-events-none">
                    <svg className="w-12 h-12 mb-4 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-lg font-bold text-gray-200">Tocca per caricare il PDF</p>
                    <p className="text-gray-500 text-sm mt-1">Garantito per Chrome Android</p>
                </div>
            ) : (
                <div className="text-center space-y-4 px-8 pointer-events-none w-full">
                    <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 transition-all duration-300" 
                          style={{ width: `${debug.progress}%` }}
                        ></div>
                    </div>
                    <p className="font-bold text-primary-400">{status}</p>
                    <p className="text-xs text-gray-500">{debug.progress.toFixed(0)}% caricato</p>
                </div>
            )}
        </label>

        {/* Fallback Sync Click */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            className="text-xs text-gray-500 underline"
            onClick={() => {
              addLog("Fallback button clicked (sync click)");
              inputRef.current?.click();
            }}
          >
            Se il tap sopra non funziona, clicca qui
          </Button>
        </div>

        {/* Debug Panel */}
        <div className="mt-10 bg-black/50 border border-gray-800 rounded-2xl p-4 font-mono text-[10px] space-y-2">
            <h3 className="text-primary-500 font-bold uppercase tracking-widest border-b border-gray-800 pb-2 mb-2">Debug Console (Android/Mobile)</h3>
            <div className="grid grid-cols-2 gap-2">
                <div>Tap Rilevato: <span className={debug.tapReceived ? 'text-green-500' : 'text-red-500'}>{debug.tapReceived ? 'SI' : 'NO'}</span></div>
                <div>Input Fired: <span className={debug.inputFired ? 'text-green-500' : 'text-red-500'}>{debug.inputFired ? 'SI' : 'NO'}</span></div>
                <div className="col-span-2 truncate">File: <span className="text-gray-300">{debug.fileName || 'Nessuno'}</span></div>
                <div>Size: <span className="text-gray-300">{(debug.fileSize/1024).toFixed(1)} KB</span></div>
                <div>Stato: <span className="text-yellow-500 uppercase">{debug.state}</span></div>
            </div>
            {debug.lastError && (
              <div className="p-2 bg-red-950/30 border border-red-900 rounded text-red-400 break-words mt-2">
                <strong>Errore:</strong> {debug.lastError}
              </div>
            )}
            <div className="mt-4 space-y-1 max-h-32 overflow-y-auto no-scrollbar border-t border-gray-800 pt-2">
                {logs.map((log, i) => <div key={i} className="text-gray-500">{log}</div>)}
            </div>
        </div>

        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-800 text-[10px] text-gray-500">
           <p className="font-bold text-gray-400 mb-1">PRO TIP PER FIREBASE STORAGE:</p>
           <p>Se vedi errori di autorizzazione, imposta le regole di storage su: <code className="text-primary-400">allow read, write: if true;</code> (solo per debug!) nella console Firebase.</p>
        </div>
      </div>
    </div>
  );
};
