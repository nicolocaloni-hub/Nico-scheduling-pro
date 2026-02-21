
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Scene, ProductionElement, ElementCategory, IntExt, DayNight } from '../types';
import { Button } from '../components/Button';
import { parseEighthsToFloat } from '../services/geminiService';
import { AiStatusBar, ImportState } from '../components/AiStatusBar';
import { DebugDetailsAccordion } from '../components/DebugDetailsAccordion';
import { ResultsPreview } from '../components/ResultsPreview';
import { useTranslation } from '../services/i18n';

export const ScriptImport: React.FC = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>(null);
  
  // New state for UI components
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [previewData, setPreviewData] = useState<any>(null);
  const { t } = useTranslation();

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) {
      // Clean state if no project selected
      setProjectId(null);
      setSummary(null);
      setPreviewData(null);
      setModelUsed(undefined);
      setImportState('idle');
      setSelectedFile(null);
      setPdfPreviewUrl(null);
      return;
    } 
    
    // Only load if projectId changed
    if (pid !== projectId) {
      setProjectId(pid);
      // Reset state first
      setSummary(null);
      setPreviewData(null);
      setModelUsed(undefined);
      setImportState('idle');
      setSelectedFile(null);
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);

      // Check for saved analysis
      db.getAnalysisResult(pid).then(saved => {
        if (saved) {
          setSummary(saved.summary);
          setPreviewData(saved.data);
          setModelUsed(saved.modelUsed);
          setImportState('done');
          setSelectedFile({ name: saved.fileName || 'Sceneggiatura Salvata' } as File);
          addLog("Risultati analisi ripristinati dalla memoria locale.");
        }
      });
    }
    
    return () => {
      // Cleanup preview url only on unmount or change
    };
  }, [navigate, projectId]); // Added projectId dependency to detect changes

  const handleReset = async () => {
    if (!projectId) return;
    if (window.confirm("Resettare il copione per questo progetto? I dati non salvati andranno persi.")) {
      await db.clearAnalysisResult(projectId);
      setSummary(null);
      setPreviewData(null);
      setModelUsed(undefined);
      setImportState('idle');
      setSelectedFile(null);
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
      addLog("Stato copione resettato.");
    }
  };

  // Banner Long Press Logic - REMOVED as per request.
  // The manual creation banner must be fixed and never deletable.

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Il file deve essere un PDF.");
      setImportState('error');
      return;
    }

    if (projectId) {
      db.clearAnalysisResult(projectId);
    }

    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    
    setSelectedFile(file);
    setPdfPreviewUrl(URL.createObjectURL(file));
    setImportState('selected');
    setError(null);
    setSummary(null);
    setPreviewData(null);
    setModelUsed(undefined);
    addLog(`File selezionato: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  };

  const checkServerEnv = async () => {
    addLog("[UI] Controllo ambiente server...");
    try {
      const res = await fetch('/api/ai/env');
      if (!res.ok) {
        addLog(`[ERROR] Server returned ${res.status}. Route likely not found.`);
        return;
      }
      const data = await res.json();
      addLog(`[SERVER] Env: ${data.env}, Key Present: ${data.keyPresent}`);
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
    setIsDetailsOpen(false);

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
        throw new Error("Il server non ha restituito JSON. Verifica il deploy di Cloud Run.");
      }

      const result = await response.json();
      
      if (!response.ok || !result.ok) {
        throw new Error(result.error || `Errore server: ${response.status}`);
      }

      addLog(`Analisi completata! Modello: ${result.modelUsed}`);
      setModelUsed(result.modelUsed);
      setSummary(result.summary);
      setPreviewData(result.data);
      
      await saveResultsToDb(result.data);
      
      // Save for persistence
      if (projectId) {
        await db.saveAnalysisResult(projectId, {
          summary: result.summary,
          data: result.data,
          modelUsed: result.modelUsed,
          fileName: selectedFile?.name
        });
      }
      
      setImportState('done');
      addLog("Dati salvati con successo.");

    } catch (err: any) {
      console.error("Analysis failed:", err);
      setError(err.message || "Errore sconosciuto durante l'analisi.");
      setImportState('error');
      setIsDetailsOpen(true); // Auto-open on error
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
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">{t('import_title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('import_subtitle')}</p>
        </div>
        
        <div className="flex gap-3">
          {importState === 'selected' && (
            <Button onClick={startAnalysis} type="button">{t('start_analysis')}</Button>
          )}
          {importState === 'done' && (
            <div className="flex flex-col items-end gap-1">
              <button 
                onClick={handleReset}
                className="text-[10px] text-gray-500 hover:text-red-500 uppercase font-bold tracking-wider"
              >
                {t('reset')}
              </button>
              <Button onClick={() => navigate('/stripboard')}>
                <span className="text-xs">{t('go_to_pdl')}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          {/* Picker Compatto */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3 overflow-hidden mr-4">
              <i className="fa-solid fa-file-pdf text-red-500 text-xl flex-shrink-0"></i>
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {selectedFile ? selectedFile.name : t('no_file_selected')}
              </span>
            </div>
            
            <label className="bg-primary-600 px-6 py-2 rounded-xl text-xs font-black cursor-pointer hover:bg-primary-500 transition-all flex-shrink-0 active:scale-95 shadow-lg shadow-primary-900/20 text-white">
              {t('browse')}
              <input 
                type="file" 
                className="hidden" 
                accept="application/pdf" 
                onChange={handleFileChange} 
                disabled={importState === 'analyzing' || importState === 'uploading'} 
              />
            </label>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          {/* AI Status Bar */}
          <AiStatusBar 
            status={importState} 
            fileName={selectedFile?.name || null} 
            model={modelUsed} 
          />

          {/* Results Preview */}
          {summary && importState === 'done' && (
            <ResultsPreview summary={summary} previewData={previewData} />
          )}

          {/* Debug Details */}
          <DebugDetailsAccordion 
            logs={logs} 
            isOpen={isDetailsOpen} 
            onToggle={() => setIsDetailsOpen(!isDetailsOpen)} 
            error={error}
            onClearLogs={() => setLogs([])}
            onCheckEnv={checkServerEnv}
          />

          {/* Manual Mode Separator */}
          <div className="pt-8 pb-4">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative bg-gray-50 dark:bg-gray-950 px-4 text-xs text-gray-500 uppercase tracking-widest font-bold">
                {t('or_divider')}
              </div>
            </div>
          </div>

          {/* Manual CTA */}
          <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-center space-y-4">
            <div>
              <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-1">{t('manual_creation_title')}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('manual_creation_desc')}</p>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/stripboard/manual/create')}
              className="w-full py-3"
            >
              <i className="fa-solid fa-pen-to-square mr-2"></i> {t('create_new_pdl')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
