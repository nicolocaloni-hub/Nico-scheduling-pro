
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Project, ProductionType } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { Button } from '../components/Button';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { SettingsModal } from '../components/SettingsModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useTranslation } from '../services/i18n';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const data = await db.getProjects();
    setProjects(data);
    setLoading(false);
  };

  const handleCreate = async (name: string, type: ProductionType, startDate: string, endDate: string) => {
    await db.createProject(name, type, startDate, endDate);
    setShowNewModal(false);
    loadProjects();
  };

  const handleDeleteRequest = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setProjectToDelete(project);
    }
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      console.log(`delete confirmed for project ${projectToDelete.id}`);
      await db.deleteProject(projectToDelete.id);
      setProjectToDelete(null);
      loadProjects();
    }
  };

  const openProject = (id: string) => {
    localStorage.setItem('currentProjectId', id);
    navigate('/stripboard');
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
                <ProjectCard 
                    key={p.id} 
                    project={p} 
                    onOpen={openProject} 
                    onDelete={handleDeleteRequest} 
                />
            ))}
            
            {projects.length === 0 && (
                <div className="py-20 text-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-800 rounded-3xl">
                    <p>{t('no_projects')}</p>
                </div>
            )}
        </div>
      )}

      {showNewModal && (
        <CreateProjectModal 
            onClose={() => setShowNewModal(false)}
            onCreate={handleCreate}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <ConfirmationModal
        isOpen={!!projectToDelete}
        title="Attenzione"
        message={`Stai per cancellare definitivamente il progetto "${projectToDelete?.name}". Vuoi continuare?`}
        onConfirm={confirmDelete}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
};
