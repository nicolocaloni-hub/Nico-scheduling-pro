
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeScriptPdf, checkAiEnv, runSimpleTest, parseEighthsToFloat } from '../services/geminiService';
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
  const [debugLoading, setDebugLoading] = useState(false);
  
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
    serverHealth: 'sconosciuto',
    keyEnv: 'checking...',
    vercelEnv: 'unknown'
  });

  const addLog = (msg: string) => {
    console.log(`[ImportLog] ${msg}`);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
  };

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) {
        navigate('/');
    } else {
        setProjectId(pid);
    }
    runFullDiagnostics();
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [navigate]);

  const runFullDiagnostics = async () => {
    setDebugLoading(true);
    addLog("Avvio diagnostica completa...");
    
    try {
      // 1. Controllo ENV
      const envRes = await checkAiEnv();
      if (envRes.ok) {
        setDebug(d => ({ 
          ...d, 
          keyEnv: envRes.data.keyPresent ? 'PRESENT' : 'MISSING',
          vercelEnv: envRes.data.vercelEnv 
        }));
        addLog(`Server Env: ${envRes.data.vercelEnv}, Key: ${envRes.data.keyPresent ? 'Presente' : 'Assente'}`);
      } else {
        setDebug(d => ({ ...d, keyEnv: 'ERROR' }));
        addLog(`Errore Env: ${envRes.error}`);
      }

      // 2. Simple Test (Gemini 2.0)
      const testRes = await runSimpleTest();
      if (testRes.ok) {
        setDebug(d => ({ ...d, serverHealth: 'OK', activeModelId: testRes.data.modelId }));
        addLog(`Test Gemini 2.0: Successo (${testRes.data.modelId})`);
      } else {
        setDebug(d => ({ ...d, serverHealth: 'ERROR', lastError: testRes.error || testRes.data?.error }));
        addLog(`Test Gemini 2.0: Fallito - ${testRes.error || testRes.data?.error}`);
      }

    } catch (e: any) {
      addLog(`Diagnostica fallita: ${e.message}`);
    } finally {
      setDebugLoading(false);
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
    setDebug(d => ({ ...d, inputFired: true }));
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    setDebug(d => ({ ...d, fileName: file.name, fileSize: file.size, state: 'picking', lastError: '', httpStatus: 0 }));
    
    if (!isPdf) {
      addLog("Errore: Il file non è un PDF");
      setDebug(d => ({ ...d, lastError: "Seleziona un file PDF valido.", state: 'error' }));
      return;
    }
    startUpload(file);
  };

  const startUpload = async (file: File) => {
    if (!projectId) return;
    setDebug(d => ({ ...d, state: 'uploading', progress: 0 }));
    setStatus('Caricamento...');
    
    if (getApps().length === 0) {
       addLog("Firebase Storage non configurato. Salto upload.");
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
          processWithGemini(file);
        }, 
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            processWithGemini(file, downloadURL);
          });
        }
      );
    } catch (e: any) {
      processWithGemini(file);
    }
  };

  const processWithGemini = async (file: File, remoteUrl?: string) => {
    setIsAnalyzing(true);
    setStatus('Analisi con AI in corso...');
    addLog("Avvio breakdown PDF...");
    startTimer();
    
    try {
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = (reader.result as string).split(',')[1];
            
            try {
              const result = await analyzeScriptPdf(base64, (info) => {
                  setDebug(d => ({ 
                    ...d, 
                    activeModelId: info.modelUsed || d.activeModelId,
                    httpStatus: info.status
                  }));
                  if (info.error) {
                    addLog(`Server Error: ${info.error}`);
                  }
              });
              
              const elementsMap: Record<string, ProductionElement> = {};
              const elements: ProductionElement[] = (result.elements || []).map(el => {
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

              const scenes: Scene[] = (result.scenes || []).map(s => {
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
                      setName: s.setName || 'SET',
                      locationName: s.locationName || 'LOCATION',
                      pageCountInEighths: s.pageCountInEighths || '0 1/8',
                      pages: parseEighthsToFloat(s.pageCountInEighths || '0 1/8'),
                      synopsis: s.synopsis || '',
                      elementIds
                  };
              });

              setAnalysisResult(scenes);
              addLog(`Completato: ${scenes.length} scene trovate.`);
              
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
              addLog(`Fallimento AI: ${err.message}`);
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
          <div className="space-y-6 max-w-4xl mx-auto px-4 py-8">
             <div className="flex justify-between items-center mb-6">
                 <h1 className="text-2xl font-bold">Analisi Completata</h1>
                 <Button onClick={() => navigate('/stripboard')}>Vai al Piano Lav.</Button>
             </div>
             <div className="grid gap-3">
                 {analysisResult.slice(0, 5).map((scene) => (
                     <div key={scene.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4">
                         <div className="w-10 h-10 bg-gray-900 rounded flex items-center justify-center font-bold text-primary-400">{scene.sceneNumber}</div>
                         <div className="flex-1">
                             <h3 className="font-bold text-sm truncate">{scene.slugline}</h3>
                             <p className="text-xs text-gray-500 line-clamp-1 italic">"{scene.synopsis}"</p>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
      );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 py-12 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black">Importa Sceneggiatura</h1>
        <p className="text-gray-400">Analisi automatica basata su Gemini 2.0</p>
      </div>

      <div className="space-y-6">
        <input type="file" id="pdf-upload" className="sr-only" accept="application/pdf" onChange={handleFileChange} ref={inputRef} />

        <label 
            htmlFor="pdf-upload"
            onClick={() => setDebug(d => ({ ...d, tapReceived: true }))}
            className={`
                relative h-64 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all cursor-pointer
                ${isAnalyzing ? 'pointer-events-none bg-gray-950 border-primary-500' : 'border-gray-800 bg-gray-900/30 hover:border-primary-500/50 hover:bg-gray-800'}
            `}
        >
            {isAnalyzing ? (
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mx-auto"></div>
                    <p className="font-bold text-white">{status} ({analysisSeconds}s)</p>
                </div>
            ) : (
                <div className="text-center p-8">
                    <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <i className="fa-solid fa-file-pdf text-2xl text-gray-400"></i>
                    </div>
                    <p className="text-lg font-bold text-white">Carica PDF</p>
                    <p className="text-gray-500 text-sm mt-1">Sfoglia i file del dispositivo</p>
                </div>
            )}
        </label>

        {/* Debug Panel */}
        <div className="bg-gray-950/90 border border-gray-800 rounded-3xl p-6 font-mono text-[11px] space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <h3 className="text-primary-500 font-bold uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                    Debug Console
                </h3>
                <Button 
                    variant="secondary" 
                    className="text-[9px] h-7 px-3 py-0" 
                    onClick={runFullDiagnostics}
                    disabled={debugLoading}
                >
                    {debugLoading ? 'Testing...' : 'RE-CHECK'}
                </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-gray-500">
                <div className="flex justify-between"><span>KEY_ENV:</span> <span className={debug.keyEnv === 'PRESENT' ? 'text-green-500' : 'text-red-500'}>{debug.keyEnv}</span></div>
                <div className="flex justify-between"><span>VERCEL:</span> <span className="text-gray-300">{debug.vercelEnv}</span></div>
                <div className="flex justify-between"><span>HEALTH:</span> <span className={debug.serverHealth === 'OK' ? 'text-green-500' : 'text-red-500'}>{debug.serverHealth}</span></div>
                <div className="flex justify-between"><span>MODEL:</span> <span className="text-primary-400 truncate ml-2">{debug.activeModelId}</span></div>
                <div className="flex justify-between"><span>TAP:</span> <span className={debug.tapReceived ? 'text-green-500' : 'text-gray-700'}>{debug.tapReceived ? 'YES' : 'NO'}</span></div>
                <div className="flex justify-between"><span>HTTP:</span> <span className={debug.httpStatus === 200 ? 'text-green-500' : 'text-gray-300'}>{debug.httpStatus || '--'}</span></div>
            </div>

            {debug.lastError && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400/90 leading-relaxed text-[10px] overflow-hidden">
                <strong className="block text-red-500 uppercase mb-1">Last Error:</strong>
                {debug.lastError}
              </div>
            )}

            <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar border-t border-gray-800 pt-3 text-gray-600">
                {logs.map((log, i) => <div key={i} className="whitespace-nowrap overflow-hidden text-ellipsis border-l border-gray-800 pl-2 mb-1">{log}</div>)}
            </div>
        </div>
      </div>
    </div>
  );
};
