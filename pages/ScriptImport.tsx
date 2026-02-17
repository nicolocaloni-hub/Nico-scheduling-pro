
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeScriptPdf, parseEighthsToFloat } from '../services/geminiService';
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
  
  // Timer State
  const [analysisSeconds, setAnalysisSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Debug State
  const [logs, setLogs] = useState<string[]>([]);
  const [debug, setDebug] = useState({
    tapReceived: false,
    inputFired: false,
    fileName: '',
    fileSize: 0,
    progress: 0,
    state: 'idle',
    lastError: '',
    activeModelId: 'non avviato'
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
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [navigate]);

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
    addLog("Evento input 'change' rilevato");
    setDebug(d => ({ ...d, inputFired: true }));
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setDebug(d => ({ ...d, fileName: file.name, fileSize: file.size, state: 'picking', lastError: '' }));
    
    if (!isPdf) {
      setDebug(d => ({ ...d, lastError: "File non PDF", state: 'error' }));
      return;
    }
    startUpload(file);
  };

  const startUpload = async (file: File) => {
    if (!projectId) return;
    setDebug(d => ({ ...d, state: 'uploading', progress: 0 }));
    setStatus('Caricamento su Storage...');
    
    // Check Firebase integration
    if (getApps().length === 0) {
       addLog("Bypass Firebase Storage (non inizializzato)");
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
          addLog(`Errore Storage: ${error.message}`);
          setDebug(d => ({ ...d, lastError: error.message, state: 'error' }));
        }, 
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            setDebug(d => ({ ...d, state: 'done', progress: 100 }));
            processWithGemini(file, downloadURL);
          });
        }
      );
    } catch (e: any) {
      setDebug(d => ({ ...d, lastError: e.message, state: 'error' }));
      processWithGemini(file);
    }
  };

  const processWithGemini = async (file: File, remoteUrl?: string) => {
    setIsAnalyzing(true);
    setStatus('Analisi Gemini Pro in corso...');
    startTimer();
    
    try {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            
            const result = await analyzeScriptPdf(base64, (modelId) => {
                setDebug(d => ({ ...d, activeModelId: modelId }));
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
        addLog(`Errore Critico AI: ${error.message}`);
        setDebug(d => ({ ...d, lastError: error.message, state: 'error' }));
        alert(`L'analisi è fallita dopo ${analysisSeconds}s. Errore: ${error.message}`);
    } finally {
        setIsAnalyzing(false);
        stopTimer();
    }
  };

  const handleLabelTouch = () => {
    setDebug(d => ({ ...d, tapReceived: true }));
  };

  if (analysisResult && analysisResult.length > 0) {
      return (
          <div className="space-y-6 max-w-4xl mx-auto px-4">
             <div className="flex justify-between items-center py-4 border-b border-gray-800">
                 <div>
                    <h1 className="text-2xl font-bold">Revisione Spoglio</h1>
                    <p className="text-gray-400 text-sm">Fine analisi ({analysisSeconds}s)</p>
                 </div>
                 <Button onClick={() => navigate('/stripboard')}>Vai al Piano Lav.</Button>
             </div>
             <div className="grid gap-3">
                 {analysisResult.map((scene) => (
                     <div key={scene.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4">
                         <div className="flex-shrink-0 flex items-center justify-center bg-gray-900 w-12 h-12 rounded-lg font-bold text-primary-400">{scene.sceneNumber}</div>
                         <div className="flex-1 min-w-0">
                             <h3 className="font-bold truncate">{scene.slugline}</h3>
                             <p className="text-gray-400 text-sm line-clamp-2 italic">"{scene.synopsis}"</p>
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
        <p className="text-gray-400 text-sm">Il PDF verrà analizzato dai modelli Gemini Pro/Flash.</p>
      </div>

      <div className="space-y-6">
        <input type="file" id="pdf-upload" className="sr-only" accept="application/pdf" onChange={handleFileChange} ref={inputRef} />

        <label 
            htmlFor="pdf-upload"
            onClick={handleLabelTouch}
            className={`
                relative h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer
                ${isAnalyzing ? 'pointer-events-none bg-gray-900 border-primary-500' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}
            `}
        >
            {isAnalyzing ? (
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div className="space-y-1">
                        <p className="font-bold text-primary-400">{status}</p>
                        <p className="text-2xl font-mono text-white">{analysisSeconds}s</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Modello: {debug.activeModelId}</p>
                    </div>
                </div>
            ) : (
                <div className="text-center">
                    <i className="fa-solid fa-cloud-arrow-up text-4xl mb-4 text-gray-600"></i>
                    <p className="text-lg font-bold">Tocca per caricare il PDF</p>
                    <p className="text-gray-500 text-xs">Il selettore si aprirà istantaneamente</p>
                </div>
            )}
        </label>

        {/* Debug & Error Console */}
        <div className="bg-black/50 border border-gray-800 rounded-2xl p-5 font-mono text-[11px] space-y-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <h3 className="text-primary-500 font-bold uppercase tracking-tighter">Gemini Debug Panel</h3>
                <span className={`px-2 py-0.5 rounded text-[9px] ${debug.state === 'error' ? 'bg-red-900 text-red-200' : 'bg-gray-800 text-gray-400'}`}>
                    STATE: {debug.state.toUpperCase()}
                </span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-2 text-gray-400">
                <div className="flex flex-col">
                    <span className="text-[9px] text-gray-600 uppercase">Active Model</span>
                    <span className="text-primary-300 truncate">{debug.activeModelId}</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[9px] text-gray-600 uppercase">Input Fired</span>
                    <span className={debug.inputFired ? 'text-green-500' : 'text-red-500'}>{debug.inputFired ? 'YES' : 'NO'}</span>
                </div>
                <div className="flex flex-col col-span-2">
                    <span className="text-[9px] text-gray-600 uppercase">File Info</span>
                    <span className="truncate">{debug.fileName || 'Nessuno'} ({(debug.fileSize/1024).toFixed(1)} KB)</span>
                </div>
            </div>

            {debug.lastError && (
              <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 break-words">
                <strong className="block text-[9px] uppercase mb-1">Error Response:</strong>
                {debug.lastError}
              </div>
            )}

            <div className="space-y-1 max-h-24 overflow-y-auto no-scrollbar border-t border-gray-800 pt-2 text-[10px] text-gray-500">
                {logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
        </div>
      </div>
    </div>
  );
};
