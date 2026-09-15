import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { ImportState } from '../components/AiStatusBar';
import { db } from '../services/store';

interface AnalysisContextType {
  importState: ImportState;
  selectedFile: File | null;
  pdfPreviewUrl: string | null;
  error: string | null;
  logs: string[];
  summary: any;
  modelUsed: string | undefined;
  previewData: any;
  projectId: string | null;
  analysisStartTime: number | null;
  
  setImportState: (state: ImportState) => void;
  setSelectedFile: (file: File | null) => void;
  setPdfPreviewUrl: (url: string | null) => void;
  setError: (error: string | null) => void;
  setLogs: (logs: string[] | ((prev: string[]) => string[])) => void;
  setSummary: (summary: any) => void;
  setModelUsed: (model: string | undefined) => void;
  setPreviewData: (data: any) => void;
  setProjectId: (id: string | null) => void;
  setAnalysisStartTime: (time: number | null) => void;
  
  addLog: (msg: string) => void;
  startAnalysis: (projectId: string) => Promise<void>;
  resetAnalysisState: () => void;
  saveResultsToDb: (data: any, targetProjectId: string, fileName: string, analysisInfo?: { summary: any; modelUsed?: string }) => Promise<void>;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export const AnalysisProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [importState, setImportState] = useState<ImportState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [modelUsed, setModelUsed] = useState<string | undefined>(undefined);
  const [previewData, setPreviewData] = useState<any>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [analysisStartTime, setAnalysisStartTime] = useState<number | null>(null);
  const analysisRun = useRef(0);
  const analysisBusy = useRef(false);

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  const resetAnalysisState = () => {
    analysisRun.current++;
    analysisBusy.current = false;
    setSummary(null);
    setPreviewData(null);
    setModelUsed(undefined);
    setImportState('idle');
    setSelectedFile(null);
    setPdfPreviewUrl(null);
    setError(null);
    setLogs([]);
    setAnalysisStartTime(null);
  };

  const saveResultsToDb = async (data: any, targetProjectId: string, fileName: string, analysisInfo?: { summary: any; modelUsed?: string }) => {
    if (!targetProjectId) return;
    
    addLog("Sincronizzazione database locale...");
    
    const elementsMap: Record<string, any> = {};
    const elements: any[] = (data.elements || []).map((el: any) => {
      const newEl = {
        id: crypto.randomUUID(),
        projectId: targetProjectId,
        name: el.name,
        category: el.category
      };
      elementsMap[el.name.toLowerCase()] = newEl;
      return newEl;
    });

    // Check for elements in sceneElements that are not in elementsMap
    const additionalElements: any[] = [];
    (data.scenes || []).forEach((s: any) => {
      const elementNames = data.sceneElements?.[s.sceneNumber] || [];
      elementNames.forEach((name: string) => {
        if (name && !elementsMap[name.toLowerCase()]) {
          const newEl = {
            id: crypto.randomUUID(),
            projectId: targetProjectId,
            name: name,
            category: 'Cast' // Default to Cast if unknown
          };
          elementsMap[name.toLowerCase()] = newEl;
          additionalElements.push(newEl);
        }
      });
    });

    const allElementsToSave = [...elements, ...additionalElements];

    // Get project to check for shootDays
    const projects = await db.getProjects();
    const project = projects.find(p => p.id === targetProjectId);
    const shootDays = project?.shootDays || [];
    const scenesPerDay = shootDays.length > 0 ? Math.ceil((data.scenes || []).length / shootDays.length) : 0;

    const scenes: any[] = (data.scenes || []).map((s: any, index: number) => {
      const elementNames = data.sceneElements?.[s.sceneNumber] || [];
      const elementIds = elementNames.map((name: string) => elementsMap[name.toLowerCase()]?.id).filter((id: any) => !!id) as string[];

      // Distribute scenes to days if shootDays exist
      let assignedDay = undefined;
      if (shootDays.length > 0) {
          const dayIndex = Math.floor(index / scenesPerDay);
          if (dayIndex < shootDays.length) {
              assignedDay = shootDays[dayIndex];
          }
      }

      // Helper function to parse eighths
      const parseEighthsToFloat = (eighthsStr: string): number => {
        if (!eighthsStr) return 0;
        const parts = eighthsStr.trim().split(' ');
        let total = 0;
        for (const part of parts) {
          if (part.includes('/')) {
            const [num, den] = part.split('/');
            total += parseInt(num, 10) / parseInt(den, 10);
          } else {
            total += parseInt(part, 10);
          }
        }
        return total;
      };

      return {
        id: crypto.randomUUID(),
        projectId: targetProjectId,
        sceneNumber: s.sceneNumber,
        slugline: s.slugline,
        intExt: s.intExt,
        dayNight: s.dayNight,
        setName: s.setName || 'SET',
        locationName: s.locationName || 'LOCATION',
        pageCountInEighths: s.pageCountInEighths || '0 1/8',
        pages: parseEighthsToFloat(s.pageCountInEighths || '0 1/8'),
        synopsis: s.synopsis || '',
        scriptText: s.scriptText || '',
        elementIds,
        shootDay: assignedDay
      };
    });

    await db.saveImportedScript(targetProjectId, scenes, allElementsToSave, fileName,
      analysisInfo ? { ...analysisInfo, data, fileName } : undefined);
  };

  const startAnalysis = async (projectId: string) => {
    if (!selectedFile || analysisBusy.current) return;
    analysisBusy.current = true;
    const run = ++analysisRun.current;
    const isCurrent = () => run === analysisRun.current && (localStorage.getItem('currentProjectId') || '') === projectId;
    
    addLog('Lettura del PDF sul dispositivo: nessun invio a servizi AI.');
    setImportState('uploading');
    setError(null);

    try {
      setImportState('analyzing');
      setAnalysisStartTime(Date.now());
      const { analyzeScriptLocally } = await import('../services/localScriptAnalysis');
      const result = await analyzeScriptLocally(selectedFile, message => {
        if (isCurrent()) addLog(message);
      });
      if (!isCurrent()) return;

      if (projectId) {
        await saveResultsToDb(result.data, projectId, selectedFile.name, result);
      }

      // Only update UI if the user hasn't switched to a different project
      const currentPid = localStorage.getItem('currentProjectId') || '';
      if (currentPid === projectId) {
        addLog('Analisi locale completata. Controlla l’anteprima dello spoglio.');
        setModelUsed(result.modelUsed);
        setSummary(result.summary);
        setPreviewData(result.data);
        setImportState('done');
        addLog("Analisi completata.");
      }

    } catch (err: any) {
      console.error("Analysis failed:", err);
      const currentPid = localStorage.getItem('currentProjectId') || '';
      if (currentPid === projectId && run === analysisRun.current) {
        setError(err.message || "Errore sconosciuto durante l'analisi.");
        setImportState('error');
        addLog(`[CRITICAL] ${err.message}`);
      }
    } finally {
      if (run === analysisRun.current) analysisBusy.current = false;
    }
  };

  return (
    <AnalysisContext.Provider value={{
      importState, setImportState,
      selectedFile, setSelectedFile,
      pdfPreviewUrl, setPdfPreviewUrl,
      error, setError,
      logs, setLogs,
      summary, setSummary,
      modelUsed, setModelUsed,
      previewData, setPreviewData,
      projectId, setProjectId,
      analysisStartTime, setAnalysisStartTime,
      addLog, startAnalysis, resetAnalysisState, saveResultsToDb
    }}>
      {children}
    </AnalysisContext.Provider>
  );
};

export const useAnalysis = () => {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
};
