
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeScriptPdf, checkAiHealth, parseEighthsToFloat } from '../services/geminiService';
import { db } from '../services/store';
import { Scene, ProductionElement, ElementCategory, IntExt, DayNight } from '../types';
import { Button } from '../components/Button';

import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getApps } from "firebase/app";

export const ScriptImport: React.FC = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<Scene[] | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  
  const [analysisSeconds, setAnalysisSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [debug, setDebug] = useState({
    tapReceived: false,
    inputFired: false,
    fileName: '',
    fileSize: 0,
    progress: 0,
    state: 'idle',
    lastError: '',
    activeModelId: 'attesa...',
    httpStatus: 0,
    healthStatus: '' 
  });

  const addLog = (msg: string) => {
    console.log(`[ImportLog] ${msg}`);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
  };

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) {
        navigate('/');
    } else {
        setProjectId(pid);
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [navigate]);

  const runHealthCheck = async () => {
    setHealthLoading(true);
    addLog("Avvio Health Check...");
    setDebug(d => ({ ...d, healthStatus: 'Checking...' }));
    
    try {
      const data = await checkAiHealth();
      
      if (data.ok) {
        addLog(`Health Check OK! Model: ${data.modelId}`);
        addLog(`Risposta: "${data.text}"`);
        setDebug(d => ({ 
            ...d, 
            lastError: '', 
            state: 'healthy',
            healthStatus: `OK`,
            activeModelId: data.modelId || 'unknown'
        }));
      } else {
        const errorMsg = data.error || "Errore sconosciuto";
        addLog(`Health Check FALLITO: ${errorMsg}`);
        setDebug(d => ({ 
            ...d, 
            lastError: errorMsg, 
            state: 'error',
            healthStatus: 'ERROR',
            activeModelId: data.modelId || 'unknown',
            httpStatus: errorMsg.includes("Missing GEMINI_API_KEY") ? 400 : 500
        }));
      }

    } catch (e: any) {
      addLog(`Errore di rete/client: ${e.message}`);
      setDebug(d => ({ ...d, lastError: e.message, state: 'error', healthStatus: 'NET_ERR' }));
    } finally {
      setHealthLoading(false);
    }
  };

  const startTimer = () => {
    setAnalysisSeconds(0);
    timerRef.current = window.setInterval(() => {
      setAnalysisSeconds(s => s + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addLog("Selettore file chiuso");
    setDebug(d => ({ ...d, inputFired: true }));
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setDebug(d => ({ ...d, fileName: file.name, fileSize: file.size, state: 'picking', lastError: '', httpStatus: 0 }));
    
    if (!isPdf) {
      addLog("Errore: Il file non è un PDF");
      setDebug(d => ({ ...d, lastError: "Il file selezionato non è un PDF valido.", state: 'error' }));
      return;
    }
    startUpload(file);
  };

  const startUpload = async (file: File) => {
    if (!projectId) return;
    setDebug(d => ({ ...d, state: 'uploading', progress: 0 }));
    setStatus('Preparazione file...');
    
    if (getApps().length === 0) {
       addLog("Firebase saltato (locale/non configurato). Procedo con analisi.");
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
        }, 
        (error) => {
          addLog(`Errore Firebase: ${error.message}`);
          setDebug(d => ({ ...d, lastError: error.message, state: 'error' }));
        }, 
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            addLog("File caricato correttamente.");
            processWithGemini(file, downloadURL);
          });
        }
      );
    } catch (e: any) {
      addLog(`Errore inizializzazione upload: ${e.message}`);
      processWithGemini(file);
    }
  };

  const processWithGemini = async (file: File, remoteUrl?: string) => {
    setIsAnalyzing(true);
    setStatus('Analisi con Gemini in corso...');
    addLog("Inizio chiamata API /api/ai/breakdown...");
    startTimer();
    
    try {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            addLog(`Bytes base64 preparati: ${base64.length}`);
            
            try {
              const result = await analyzeScriptPdf(base64, (info) => {
                  setDebug(d => ({ 
                    ...d, 
                    activeModelId: info.modelUsed || 'error',
                    httpStatus: info.status
                  }));
                  addLog(`Risposta API: Status ${info.status}, Model ${info.modelUsed}`);
              });
              
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
                  const elementNames = result.sceneElements?.[s.sceneNumber] || [];
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
              addLog("Analisi completata con successo!");
              
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
            } catch (err: any) {
              setDebug(d => ({ ...d, lastError: err.message, state: 'error' }));
              addLog(`Errore Analisi: ${err.message}`);
            }
        };
        reader.readAsDataURL(file);
    } catch (error: any) {
        addLog(`Errore FileReader: ${error.message}`);
        setDebug(d => ({ ...d, lastError: error.message, state: 'error' }));
    } finally {
        setIsAnalyzing(false);
        stopTimer();
    }
  };

  if (analysisResult && analysisResult.length > 0) {
      return (
          <div className="space-y-6 max-w-4xl mx-auto px-4">
             <div className="flex justify-between items-center py-6 border-b border-gray-800">
                 <div>
                    <h1 className="text-2xl font-bold">Revisione Spoglio</h1>
                    <p className="text-gray-400 text-sm">Fine analisi in {analysisSeconds}s</p>
                 </div>
                 <Button onClick={() => navigate('/stripboard')}>Vai al Piano Lav.</Button>
             </div>
             <div className="grid gap-3">
                 {analysisResult.map((scene) => (
                     <div key={scene.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4">
                         <div className="flex-shrink-0 flex items-center justify-center bg-gray-900 w-12 h-12 rounded-lg font-bold text-primary-400">{scene.sceneNumber}</div>
                         <div className="flex-1 min-w-0">
                             <h3 className="font-bold truncate text-sm">{scene.slugline}</h3>
                             <p className="text-gray-400 text-xs italic line-clamp-1">"{scene.synopsis}"</p>
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
        <h1 className="text-3xl font-black">Importa Sceneggiatura</h1>
        <p className="text-gray-400 text-sm italic">Usa Gemini 3 per generare il piano di lavorazione in pochi secondi.</p>
      </div>

      <div className="space-y-6">
        <input type="file" id="pdf-upload" className="sr-only" accept="application/pdf" onChange={handleFileChange} ref={inputRef} />

        <label 
            htmlFor="pdf-upload"
            onClick={() => setDebug(d => ({ ...d, tapReceived: true }))}
            className={`
                relative h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer
                ${isAnalyzing ? 'pointer-events-none bg-gray-950 border-primary-500' : 'border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-800'}
            `}
        >
            {isAnalyzing ? (
                <div className="text-center space-y-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-primary-500 text-xs font-mono">{analysisSeconds}s</div>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-primary-400 animate-pulse">{status}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Server Analysing...</p>
                    </div>
                </div>
            ) : (
                <div className="text-center group">
                    <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-file-pdf text-2xl text-gray-500"></i>
                    </div>
                    <p className="text-lg font-bold">Seleziona PDF Sceneggiatura</p>
                    <p className="text-gray-500 text-xs mt-1">Trascina o tocca per sfogliare</p>
                </div>
            )}
        </label>

        {/* Health Check Tool */}
        <div className="flex gap-4 items-center justify-center">
            <Button 
              variant="secondary" 
              className="text-xs py-2 h-10 px-6 border-gray-700 bg-gray-900 hover:bg-gray-800" 
              onClick={runHealthCheck}
              disabled={healthLoading || isAnalyzing}
            >
              {healthLoading ? (
                  <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-ping"></div>
                      Checking...
                  </span>
              ) : 'Test AI Health (Ping)'}
            </Button>
        </div>

        {/* Debug & Error Console */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 font-mono text-[10px] space-y-4 shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full transition-colors duration-300 ${debug.state === 'error' ? 'bg-red-500' : 'bg-primary-600'}`}></div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <h3 className="text-primary-500 font-bold uppercase tracking-tighter flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${debug.state === 'error' ? 'bg-red-500' : 'bg-primary-500 animate-pulse'}`}></span>
                    Debug Console
                </h3>
                <div className="flex gap-2">
                    {debug.healthStatus && (
                        <span className={`px-2 py-0.5 rounded ${debug.healthStatus.includes('ERROR') || debug.healthStatus.includes('NET_ERR') ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'}`}>
                            HEALTH: {debug.healthStatus}
                        </span>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-gray-500">
                <div className="space-y-1">
                    <p>TAP_RECV: <span className={debug.tapReceived ? 'text-green-500' : 'text-gray-700'}>{debug.tapReceived ? 'OK' : '--'}</span></p>
                    <p>FILE_SEL: <span className={debug.inputFired ? 'text-green-500' : 'text-gray-700'}>{debug.inputFired ? 'OK' : '--'}</span></p>
                </div>
                <div className="space-y-1">
                    <p>MODEL: <span className="text-primary-400">{debug.activeModelId}</span></p>
                    <p>SIZE: <span>{(debug.fileSize/1024).toFixed(1)} KB</span></p>
                </div>
            </div>

            {debug.lastError && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-red-400/90 leading-relaxed">
                <strong className="block text-[9px] uppercase mb-1 text-red-500 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Ultimo Errore:
                </strong>
                {debug.lastError}
              </div>
            )}

            <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar border-t border-gray-800 pt-2 text-gray-600">
                {logs.length === 0 && <div className="italic">Nessun log disponibile...</div>}
                {logs.map((log, i) => <div key={i} className="whitespace-nowrap overflow-hidden text-ellipsis">{log}</div>)}
            </div>
        </div>
      </div>
    </div>
  );
};
