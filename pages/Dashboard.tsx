
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Project, ProductionType } from '../types';
import { Button } from '../components/Button';
import { SettingsModal } from '../components/SettingsModal';
import { useTranslation } from '../services/i18n';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const data = await db.getProjects();
    setProjects(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    await db.createProject(newProjectName, ProductionType.Feature);
    setNewProjectName('');
    setShowNewModal(false);
    loadProjects();
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t('delete_project_confirm'))) {
      await db.deleteProject(id);
      loadProjects();
    }
  };

  const isLongPress = React.useRef(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (id: string) => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      if (window.confirm(t('delete_project_confirm'))) {
        db.deleteProject(id).then(() => loadProjects());
      }
    }, 1500); // 1.5s threshold
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const openProject = (id: string) => {
    if (!isLongPress.current) {
      localStorage.setItem('currentProjectId', id);
      navigate('/stripboard');
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Centrato con Settings a Sinistra e Nuovo a Destra */}
      <header className="relative flex items-center justify-center py-4">
        <button 
            onClick={() => setShowSettings(!showSettings)}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-full text-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
            ⚙️
        </button>
        <div className="text-center">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center justify-center gap-2">
              Smart Set
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('welcome_back')}</p>
        </div>
        <button 
            onClick={() => setShowNewModal(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-sm"
        >
            <span className="text-2xl font-bold leading-none pb-1">+</span>
        </button>
      </header>

      {loading ? (
        <div className="animate-pulse space-y-4">
            <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
            <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
        </div>
      ) : (
        <div className="space-y-4">
            {projects.map((p) => (
                <div 
                    key={p.id} 
                    onClick={() => openProject(p.id)}
                    onPointerDown={() => handlePointerDown(p.id)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onContextMenu={(e) => e.preventDefault()}
                    className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-lg shadow-gray-200/50 dark:shadow-black/20 cursor-pointer transition-all active:scale-[0.98] group select-none relative overflow-hidden"
                >
                    {/* Background Gradient Effect */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                        {/* Icona Progetto */}
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center text-2xl font-bold text-gray-600 dark:text-gray-400 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            <i className="fa-solid fa-clapperboard"></i>
                            <span className="absolute text-[10px] font-black mt-1">{p.code}</span>
                        </div>
                        
                        {/* Badge Tipo */}
                        <span className="text-xs font-bold bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 py-1.5 px-3 rounded-lg uppercase tracking-wide">
                          {p.type === ProductionType.Feature ? 'Lungometraggio' : p.type}
                        </span>
                    </div>

                    <div className="relative z-10">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{p.name}</h3>
                        <div className="flex justify-between items-end">
                            <div className="flex gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                                <span>{p.totalScenes} {t('scenes')}</span>
                                <span>{p.totalPages.toFixed(1)} {t('pages')}</span>
                            </div>
                            <button 
                                onClick={(e) => handleDeleteProject(e, p.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <i className="fa-solid fa-trash text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            
            {projects.length === 0 && (
                <div className="py-20 text-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-3xl">
                    <p>{t('no_projects')}</p>
                </div>
            )}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-md p-6 rounded-2xl shadow-2xl">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{t('new_project_modal_title')}</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">{t('project_name_label')}</label>
                        <input 
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500"
                            placeholder="es. Il Padrino IV"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowNewModal(false)} className="flex-1">{t('cancel')}</Button>
                        <Button onClick={handleCreate} disabled={!newProjectName} className="flex-1">{t('create_project')}</Button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};
