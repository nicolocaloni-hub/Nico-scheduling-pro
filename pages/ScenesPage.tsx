import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Scene } from '../types';

export const ScenesPage: React.FC = () => {
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<Scene[]>([]);

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) return navigate('/projects');
    db.getProjectScenes(pid).then(setScenes);
  }, [navigate]);

  const moveScene = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === scenes.length - 1) return;

    const newScenes = [...scenes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newScenes[index], newScenes[targetIndex]] = [newScenes[targetIndex], newScenes[index]];
    
    setScenes(newScenes);
    
    // Persist
    const pid = localStorage.getItem('currentProjectId');
    if (pid) {
        await db.saveScenes(pid, newScenes);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-80px)] flex flex-col">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Scene ({scenes.length})</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Elenco completo delle scene estratte.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 pb-20 no-scrollbar">
        {scenes.map((scene, idx) => (
          <div key={scene.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
            <div className="flex items-start gap-2">
              {/* Reorder Controls */}
              <div className="flex flex-col gap-1 pt-1 shrink-0">
                <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      moveScene(idx, 'up');
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-primary-600 rounded-lg text-lg hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-700"
                    disabled={idx === 0}
                    aria-label="Sposta scena su"
                >
                    ⬆️
                </button>
                <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      moveScene(idx, 'down');
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 hover:bg-primary-600 rounded-lg text-lg hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-100 dark:disabled:hover:bg-gray-700"
                    disabled={idx === scenes.length - 1}
                    aria-label="Sposta scena giù"
                >
                    ⬇️
                </button>
              </div>

              {/* Card Content */}
              <div className="flex-1 min-w-0 ml-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-gray-900 dark:text-white text-lg truncate">SCENA {scene.sceneNumber}</span>
                  <span className="text-[10px] px-2 py-1 rounded bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-mono border border-gray-200 dark:border-gray-700 whitespace-nowrap ml-2">
                    {scene.intExt} • {scene.dayNight} • {scene.pages} PAG
                  </span>
                </div>
                <div className="font-mono text-xs text-primary-600 dark:text-primary-400 mb-1 uppercase tracking-wide truncate">
                  {scene.slugline}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                  {scene.synopsis || <span className="italic opacity-50">— Nessuna sinossi disponibile —</span>}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
