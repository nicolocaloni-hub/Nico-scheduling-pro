
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startScriptAnalysis, getAnalysisStatus, getAnalysisResult, parseEighthsToFloat } from '../services/geminiService';
import { db } from '../services/store';
import { Scene, ProductionElement, ElementCategory, IntExt, DayNight, AnalysisJob, JobStatus } from '../types';
import { Button } from '../components/Button';

export const ScriptImport: React.FC = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const pollIntervalRef = useRef<number | null>(null);

  const steps = [
    { key: 'queued', label: 'File selezionato' },
    { key: 'uploading', label: 'PDF inviato al server' },
    { key: 'running', label: 'Gemini sta analizzando il documento' },
    { key: 'extracting', label: 'Sto estraendo scene' },
    { key: 'elements', label: 'Sto estraendo elementi (cast/location/props)' },
    { key: 'parsing', label: 'Validazione JSON' },
    { key: 'done', label: 'Completato' }
  ];

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) navigate('/'); else setProjectId(pid);
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
    };
  }, [navigate, pdfPreviewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    setSelectedFile(file);
    setPdfPreviewUrl(URL.createObjectURL(file));
  };

  const startAnalysis = async () => {
    if (!selectedFile || !projectId) return;
    setIsAnalyzing(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const jid = await startScriptAnalysis(base64);
        setJobId(jid);
        startPolling(jid);
      };
      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      alert("Errore: " + err.message);
      setIsAnalyzing(false);
    }
  };

  const startPolling = (jid: string) => {
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const currentJob = await getAnalysisStatus(jid);
        setJob(currentJob);

        if (currentJob.status === 'done') {
          stopPolling();
          await finalizeAnalysis(jid);
        } else if (currentJob.status === 'error') {
          stopPolling();
          setIsAnalyzing(false);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 2000);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const finalizeAnalysis = async (jid: string) => {
    const result = await getAnalysisResult(jid);
    if (!projectId) return;

    const elementsMap: Record<string, ProductionElement> = {};
    const elements: ProductionElement[] = (result.elements || []).map(el => {
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

    const scenes: Scene[] = (result.scenes || []).map(s => {
      const elementNames = result.sceneElements?.[s.sceneNumber] || [];
      const elementIds = elementNames.map(name => elementsMap[name]?.id).filter(id => !!id) as string[];

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
    
    setIsAnalyzing(false);
  };

  const getStepStatus = (index: number) => {
    if (!job) return index === 0 && selectedFile ? 'done' : 'pending';
    const currentStatusIndex = steps.findIndex(s => s.key === job.status);
    
    // Mappatura grossolana per la UI
    let activeIdx = 0;
    if (job.status === 'running') activeIdx = 2;
    if (job.status === 'parsing') activeIdx = 5;
    if (job.status === 'done') activeIdx = 6;
    if (job.status === 'error') return 'error';

    if (index < activeIdx) return 'done';
    if (index === activeIdx) return 'loading';
    return 'pending';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white">Importa Sceneggiatura</h1>
          <p className="text-gray-400">Analisi avanzata multi-step con Gemini 3 Flash</p>
        </div>
        {selectedFile && !isAnalyzing && job?.status !== 'done' && (
          <Button onClick={startAnalysis}>Avvia Analisi IA</Button>
        )}
        {job?.status === 'done' && (
          <Button onClick={() => navigate('/stripboard')}>Vai al Piano Lav.</Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sinistra: Preview & File Info */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-gray-800 rounded-3xl overflow-hidden border border-gray-700 shadow-2xl">
            <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-file-pdf text-red-500 text-xl"></i>
                <div>
                  <h3 className="text-sm font-bold truncate max-w-[200px]">{selectedFile?.name || 'Seleziona un file'}</h3>
                  <p className="text-[10px] text-gray-500">{selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB' : '--'}</p>
                </div>
              </div>
              {!selectedFile && (
                <label className="bg-primary-600 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-primary-500 transition-all">
                  Sfoglia
                  <input type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                </label>
              )}
              {pdfPreviewUrl && (
                <a href={pdfPreviewUrl} target="_blank" rel="noreferrer" className="text-xs text-primary-400 hover:underline">Apri a tutto schermo</a>
              )}
            </div>
            
            <div className="h-[60vh] bg-gray-950 flex items-center justify-center relative">
              {pdfPreviewUrl ? (
                <iframe src={pdfPreviewUrl} className="w-full h-full border-none" title="PDF Preview" />
              ) : (
                <div className="text-center space-y-3 opacity-30">
                  <i className="fa-solid fa-cloud-arrow-up text-6xl"></i>
                  <p className="text-sm">Carica un PDF per iniziare</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Destra: Progress & Proof */}
        <div className="lg:col-span-5 space-y-6">
          {/* Stepper */}
          <div className="bg-gray-850 p-6 rounded-3xl border border-gray-700 shadow-xl space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">Avanzamento</h2>
            <div className="space-y-4">
              {steps.map((step, i) => {
                const status = getStepStatus(i);
                return (
                  <div key={step.key} className="flex items-center gap-4 group">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 transition-all
                      ${status === 'done' ? 'bg-green-500 border-green-500 text-white' : 
                        status === 'loading' ? 'border-primary-500 text-primary-500 animate-pulse' : 
                        status === 'error' ? 'bg-red-500 border-red-500 text-white' : 'border-gray-700 text-gray-700'}
                    `}>
                      {status === 'done' ? '✓' : status === 'loading' ? '●' : i + 1}
                    </div>
                    <span className={`text-sm font-medium ${status === 'pending' ? 'text-gray-600' : 'text-gray-200'}`}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Proof Panel */}
          {(isAnalyzing || job) && (
            <div className="bg-black/40 border border-gray-800 rounded-3xl p-6 font-mono text-[10px] space-y-4 shadow-inner">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <span className="text-primary-500 font-bold">PROOF_PANEL.EXE</span>
                <span className="text-gray-600">ID: {jobId?.split('-')[0] || '---'}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-gray-500">MODEL_ID:</p>
                  <p className="text-white">{job?.modelId || '---'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-gray-500">INPUT_BYTES:</p>
                  <p className="text-white">{job?.inputBytes?.toLocaleString() || '0'}</p>
                </div>
              </div>

              {job?.resultSummary && (
                <div className="grid grid-cols-4 gap-2 bg-gray-900/50 p-3 rounded-xl border border-gray-800 text-center">
                  <div><p className="text-primary-400 font-bold text-xs">{job.resultSummary.sceneCount}</p><p className="text-[8px] text-gray-600">SCENE</p></div>
                  <div><p className="text-primary-400 font-bold text-xs">{job.resultSummary.locationCount}</p><p className="text-[8px] text-gray-600">LOCS</p></div>
                  <div><p className="text-primary-400 font-bold text-xs">{job.resultSummary.castCount}</p><p className="text-[8px] text-gray-600">CAST</p></div>
                  <div><p className="text-primary-400 font-bold text-xs">{job.resultSummary.propsCount}</p><p className="text-[8px] text-gray-600">PROPS</p></div>
                </div>
              )}

              {job?.rawPreview && (
                <div className="space-y-2">
                  <p className="text-gray-500 border-b border-gray-800 pb-1">RAW_PREVIEW (FIRST 1.5K CHARS):</p>
                  <div className="h-32 overflow-y-auto no-scrollbar text-gray-400 leading-relaxed bg-black/20 p-2 rounded italic">
                    {job.rawPreview}...
                  </div>
                </div>
              )}
              
              {job?.error && (
                <div className="p-3 bg-red-900/20 border border-red-900/30 rounded-xl text-red-400">
                  <strong className="block text-[8px] mb-1">CRITICAL_ERROR:</strong>
                  {job.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
