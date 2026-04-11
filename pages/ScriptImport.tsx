
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Scene, ProductionElement, ElementCategory, IntExt, DayNight, ProductionType } from '../types';
import { Button } from '../components/Button';
import { AiStatusBar, ImportState } from '../components/AiStatusBar';
import { ResultsPreview } from '../components/ResultsPreview';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useTranslation } from '../services/i18n';
import { useAnalysis } from '../contexts/AnalysisContext';

export const ScriptImport: React.FC = () => {
  const navigate = useNavigate();
  
  const {
    importState, setImportState,
    selectedFile, setSelectedFile,
    pdfPreviewUrl, setPdfPreviewUrl,
    error, setError,
    logs, setLogs,
    summary, setSummary,
    modelUsed, setModelUsed,
    previewData, setPreviewData,
    projectId, setProjectId,
    analysisStartTime,
    addLog, startAnalysis, resetAnalysisState, saveResultsToDb
  } = useAnalysis();
  
  // New state for UI components
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) {
      // Clean state if no project selected
      setProjectId(null);
      resetAnalysisState();
      return;
    } 
    
    // Only load if projectId changed
    if (pid !== projectId) {
      setProjectId(pid);
      // Reset state first
      resetAnalysisState();

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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    setShowResetModal(false);
    if (projectId) {
      // Only clear the analysis cache/preview data, NOT the actual project data (scenes, stripboards, etc.)
      await db.clearAnalysisResult(projectId);
    }
    
    // Clear local state
    resetAnalysisState();
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    addLog("Reset visuale completato. I dati del progetto sono stati mantenuti.");
    
    // Force a reload to ensure a clean state
    window.location.reload();
  };

  const handleCreateProject = async (name: string, type: ProductionType) => {
    // 1. Create the project
    const newProject = await db.createProject(name, type);
    
    // 2. Set as current project
    localStorage.setItem('currentProjectId', newProject.id);
    setProjectId(newProject.id);

    // 3. Save the analysis results to this new project if available
    if (previewData) {
        await saveResultsToDb(previewData, newProject.id, selectedFile?.name || 'Sceneggiatura Salvata');
        await db.saveAnalysisResult(newProject.id, {
            summary,
            data: previewData,
            modelUsed,
            fileName: selectedFile?.name
        });
    }

    setShowCreateModal(false);
    addLog(`Progetto "${name}" creato con successo.`);
    
    // Feedback to user
    alert(`Progetto "${name}" creato con successo!`);
  };

  // Banner Long Press Logic - REMOVED as per request.
  // The manual creation banner must be fixed and never deletable.

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent default behavior just in case
    e.preventDefault();
    
    // Use a local variable to capture the file immediately
    const file = e.target.files?.[0];
    if (!file) return;

    // Wrap in setTimeout to allow the browser to finish its native file picker handling
    // and prevent UI blocking or race conditions on mobile devices
    setTimeout(() => {
      try {
        if (file.type !== 'application/pdf') {
          setError("Il file deve essere un PDF.");
          setImportState('error');
          return;
        }

        // Defer clearing analysis result to startAnalysis to avoid heavy ops during file selection
        // if (projectId) {
        //   db.clearAnalysisResult(projectId).catch(err => console.error("Failed to clear analysis result", err));
        // }

        // Removed URL.revokeObjectURL to prevent potential issues with React rendering cycles
        
        setSelectedFile(file);
        // setPdfPreviewUrl(URL.createObjectURL(file)); // Disabled to prevent potential crashes on mobile
        setImportState('selected');
        setError(null);
        setSummary(null);
        setPreviewData(null);
        setModelUsed(undefined);
        addLog(`File selezionato: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      } catch (err: any) {
        console.error("Error handling file selection:", err);
        setError("Errore durante la selezione del file. Riprova.");
        setImportState('error');
      }
    }, 100);
  };

  const checkServerEnv = async () => {
    addLog("[UI] Controllo ambiente...");
    const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
    addLog(`[CLIENT] API Key di sistema presente: ${key ? 'Sì' : 'No'}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight">{t('import_title')}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('import_subtitle')}</p>
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto justify-end">
          {(importState === 'selected' || importState === 'uploading' || importState === 'analyzing') && (
            <Button 
              onClick={() => startAnalysis(projectId || '')} 
              type="button"
              disabled={importState === 'uploading' || importState === 'analyzing'}
              className="w-full md:w-auto"
            >
              {importState === 'selected' ? t('start_analysis') : 'Attendere...'}
            </Button>
          )}
          {importState === 'done' && (
            <div className="flex flex-col items-end gap-1 w-full md:w-auto">
              <button 
                onClick={handleReset}
                className="text-[10px] text-gray-500 hover:text-red-500 uppercase font-bold tracking-wider"
              >
                {t('reset')}
              </button>
              {projectId && (
                <Button onClick={() => navigate('/stripboard')} className="w-full md:w-auto">
                  <span className="text-xs">{t('go_to_pdl')}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
          {/* Picker Compatto */}
          <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3 overflow-hidden mr-4">
              <i className="fa-solid fa-file-pdf text-red-500 text-2xl flex-shrink-0"></i>
              <span className="text-base font-bold text-gray-900 dark:text-white truncate">
                {selectedFile ? selectedFile.name : t('no_file_selected')}
              </span>
            </div>
            
            <label className="bg-blue-600 px-8 py-3 rounded-xl text-sm font-black cursor-pointer hover:bg-blue-500 transition-all flex-shrink-0 shadow-lg shadow-blue-900/20 text-white uppercase">
              {t('browse')}
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                accept="application/pdf" 
                onChange={handleFileChange} 
                disabled={importState === 'analyzing' || importState === 'uploading'} 
              />
            </label>
          </div>

          {/* AI Status Bar */}
          <AiStatusBar 
            status={importState} 
            fileName={selectedFile?.name || null} 
            model={modelUsed} 
            startTime={analysisStartTime}
          />

          {/* Results Preview */}
          {summary && importState === 'done' && (
            <ResultsPreview summary={summary} previewData={previewData} />
          )}

          {/* Manual Mode Separator */}
          <div className="pt-8 pb-4">
            {/* Create Project Button (Only if analysis is done and no project selected) */}
            {importState === 'done' && !projectId && (
                <div className="flex justify-center mb-8">
                    <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 text-lg px-8 py-4 shadow-xl shadow-primary-500/20">
                        <i className="fa-solid fa-plus"></i>
                        {t('create_project')}
                    </Button>
                </div>
            )}

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
          <div className="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center space-y-4 shadow-sm">
            <div>
              <h3 className="text-gray-900 dark:text-white font-bold text-2xl mb-2">{t('manual_creation_title')}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('manual_creation_desc')}</p>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => navigate('/stripboard/manual/create')}
              className="w-full py-4 text-base font-bold"
            >
              <i className="fa-solid fa-pen-to-square mr-2"></i> {t('create_new_pdl')}
            </Button>
          </div>
      </div>

      {showCreateModal && (
        <CreateProjectModal 
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateProject}
        />
      )}

      <ConfirmationModal
        isOpen={showResetModal}
        title="Resettare la pagina?"
        message="Verranno rimossi solo i dati visualizzati in questa pagina. Il Piano di Lavorazione salvato NON verrà cancellato."
        onConfirm={confirmReset}
        onCancel={() => setShowResetModal(false)}
        confirmText="Reset"
        cancelText="Annulla"
      />
    </div>
  );
};
