import React from 'react';
import { Project, ProductionType } from '../types';
import { useTranslation } from '../services/i18n';
import { useLongPress } from '../hooks/useLongPress';

interface ProjectCardProps {
  project: Project;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onOpen, onDelete }) => {
  const { t } = useTranslation();

  const handleDelete = () => {
    console.log(`longPress/delete triggered for project ${project.id}`);
    onDelete(project.id);
  };

  const handlers = useLongPress({
    onLongPress: handleDelete,
    onClick: () => onOpen(project.id),
    threshold: 1500
  });

  return (
    <div 
        {...handlers}
        className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 shadow-lg shadow-gray-200/50 dark:shadow-black/20 cursor-pointer transition-all active:scale-[0.98] group select-none relative overflow-hidden"
    >
        {/* Background Gradient Effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="flex justify-between items-start mb-6 relative z-10">
            {/* Icona Progetto */}
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center text-2xl font-bold text-gray-600 dark:text-gray-400 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                <i className="fa-solid fa-clapperboard"></i>
                <span className="absolute text-[10px] font-black mt-1">{project.code}</span>
            </div>
            
            {/* Badge Tipo */}
            <span className="text-xs font-bold bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 py-1.5 px-3 rounded-lg uppercase tracking-wide">
              {project.type === ProductionType.Feature ? 'Lungometraggio' : project.type}
            </span>
        </div>

        <div className="relative z-10">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{project.name}</h3>
            <div className="flex justify-between items-end">
                <div className="flex gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <span>{project.totalScenes} {t('scenes')}</span>
                    <span>{project.totalPages.toFixed(1)} {t('pages')}</span>
                </div>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors relative z-20"
                >
                    <i className="fa-solid fa-trash text-sm"></i>
                </button>
            </div>
        </div>
    </div>
  );
};
