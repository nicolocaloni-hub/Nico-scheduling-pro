
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Scene, ProductionElement, ElementCategory, IntExt, DayNight } from '../types';
import { Button } from '../components/Button';
import { parseEighthsToFloat } from '../services/geminiService';

type ImportState = 'idle' | 'selected' | 'uploading' | 'analyzing' | 'done' | 'error';

export const ScriptImport: React.FC = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 30));
  };

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) navigate('/'); else setProjectId(pid);
    
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [navigate, pdfPreviewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Il file deve essere un PDF.");
      setImportState('error');
      return;
    }

    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    
    setSelectedFile(file);
    setPdfPreviewUrl(URL.createObjectURL(file));
    setImportState('selected');
    setError(null);
    setSummary(null);
    addLog(`File selezionato: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  };

  const checkServerEnv = async () => {
    addLog("[UI] Controllo ambiente server...");
    try {
      const res = await fetch('/api/ai/env');
      const data = await res.json();
      addLog(`[SERVER] Env: ${data.vercelEnv}, Key Present: ${data.keyPresent}`);
      if (data.details) {
        Object.entries(data.details).forEach(([key, val]) => {
          addLog(`[SERVER] ${key}: ${val ? 'Sì' : 'No'}`);
        });
      }
    } catch (err: any) {
      addLog(`[ERROR] Errore controllo env: ${err.message}`);
    }
  };

  const startAnalysis = async () => {
    if (!selectedFile || !projectId) return;
    
    addLog("[UI] startAnalysis triggered");
    setImportState('uploading');
    setError(null);

    try {
      addLog("Conversione file in corso...");
      
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      addLog("Invio al server in corso...");
      setImportState('analyzing');
      
      const response = await fetch('/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64 })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        addLog(`[ERROR] Risposta non JSON: ${text.substring(0, 200)}...`);
        throw new Error("Il server non ha restituito JSON. Controlla i log.");
      }

      const result = await response.json();
      
      if (!response.ok || !result.ok) {
        throw new Error(result.error || `Errore server: ${response.status}`);
      }

      addLog(`Analisi completata! Modello: ${result.modelUsed}`);
      setSummary(result.summary);
      
      await saveResultsToDb(result.data);
      
      setImportState('done');
      addLog("Dati salvati con successo.");

    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Errore sconosciuto durante l'analisi.");
      setImportState('error');
      addLog(`[CRITICAL] ${err.message}`);
    }
  };

  const saveResultsToDb = async (data: any) => {
    if (!projectId) return;
    
    addLog("Sincronizzazione database locale...");
    
    const elementsMap: Record<string, ProductionElement> = {};
    const elements: ProductionElement[] = (data.elements || []).map((el: any) => {
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

    const scenes: Scene[] = (data.scenes || []).map((s: any) => {
      const elementNames = data.sceneElements?.[s.sceneNumber] || [];
      const elementIds = elementNames.map((name: string) => elementsMap[name]?.id).filter((id: any) => !!id) as string[];

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

    await db.saveScenes(projectId, scenes);
    await db.createDefaultStripboard(projectId, scenes);
    await db.saveScriptVersion({
      id: crypto.randomUUID(),
      projectId,
      fileName: selectedFile!.name,
      fileUrl: '#local',
      version: 1,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white">Importa Sceneggiatura</h1>
          <p className="text-gray-400">Analisi immediata con Gemini AI</p>
        </div>
        
        <div className="flex gap-3">
          {importState === 'selected' && (
            <Button onClick={startAnalysis} type="button">Inizia Analisi</Button>
          )}
          {importState === 'done' && (
            <Button onClick={() => navigate('/stripboard')}>Vai al Piano Lav.</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-gray-800 rounded-3xl overflow-hidden border border-gray-700 shadow-2xl relative">
            <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-3 overflow-hidden">
                <i className="fa-solid fa-file-pdf text-red-500 text-xl flex-shrink-0"></i>
                <div className="truncate">
                  <h3 className="text-sm font-bold truncate">{selectedFile?.name || 'Nessun file selezionato'}</h3>
                  <p className="text-[10px] text-gray-500">
                    {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB • ${selectedFile.type}` : 'Seleziona un PDF per iniziare'}
                  </p>
                </div>
              </div>
              
              <label className="bg-primary-600 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-primary-500 transition-all flex-shrink-0">
                SFOGLIA
                <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} disabled={importState === 'analyzing' || importState === 'uploading'} />
              </label>
            </div>

            <div className="h-[60vh] bg-gray-950 flex items-center justify-center">
              {pdfPreviewUrl ? (
                <iframe src={pdfPreviewUrl} className="w-full h-full border-none" title="PDF Preview" />
              ) : (
                <div className="text-center space-y-4 opacity-20">
                  <i className="fa-solid fa-file-pdf text-8xl"></i>
                  <p className="text-lg">Carica il tuo copione PDF</p>
                </div>
              )}
            </div>

            {(importState === 'uploading' || importState === 'analyzing') && (
              <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {importState === 'uploading' ? 'Caricamento file...' : 'Gemini sta analizzando...'}
                  </h2>
                  <p className="text-gray-400 text-sm max-w-xs mx-auto">
                    Questa operazione potrebbe richiedere fino a 60 secondi per sceneggiature lunghe.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {summary && (
            <div className="bg-gray-800 border border-primary-500/30 rounded-3xl p-6 shadow-xl">
              <h2 className="text-sm font-black text-primary-500 uppercase tracking-widest mb-4">Risultati Estratti</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700">
                  <p className="text-2xl font-black text-white">{summary.sceneCount}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Scene</p>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700">
                  <p className="text-2xl font-black text-white">{summary.locationCount}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Location</p>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700">
                  <p className="text-2xl font-black text-white">{summary.castCount}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Personaggi</p>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700">
                  <p className="text-2xl font-black text-white">{summary.propsCount}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Props/Props</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-black border border-gray-800 rounded-3xl p-6 font-mono text-[10px] space-y-4 shadow-xl flex flex-col h-[400px]">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <span className="text-green-500 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                DEBUG_SYSTEM
              </span>
              <span className="text-gray-600">STATE: {importState.toUpperCase()}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar text-gray-400">
              {logs.length === 0 && <p className="opacity-30 italic">In attesa di eventi...</p>}
              {logs.map((log, i) => (
                <div key={i} className={`py-0.5 border-l-2 pl-2 mb-1 ${
                  log.includes('[ERROR]') || log.includes('[CRITICAL]') ? 'border-red-500 text-red-400 bg-red-500/5' : 
                  log.includes('[UI]') ? 'border-primary-500 text-primary-400' : 'border-gray-800'
                }`}>
                  {log}
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-[11px] leading-tight">
                <strong className="block text-[9px] uppercase font-black text-red-500 mb-1">Error Details:</strong>
                {error}
              </div>
            )}
            
            <div className="flex gap-2 mt-2">
              <Button variant="ghost" className="text-[9px] h-7 py-0 opacity-50 hover:opacity-100 flex-1" onClick={() => setLogs([])}>
                Clear Logs
              </Button>
              <Button variant="secondary" className="text-[9px] h-7 py-0 flex-1" onClick={checkServerEnv}>
                Check Server Env
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
