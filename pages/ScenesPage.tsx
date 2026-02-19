import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Scene } from '../types';

export const ScenesPage: React.FC = () => {
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<Scene[]>([]);

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) return navigate('/');
    db.getProjectScenes(pid).then(setScenes);
  }, [navigate]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-80px)] flex flex-col">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">Scene ({scenes.length})</h1>
          <p className="text-gray-400 text-sm">Elenco completo delle scene estratte.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3 pb-20 no-scrollbar">
        {scenes.map(scene => (
          <div key={scene.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-white text-lg">SCENA {scene.sceneNumber}</span>
              <span className="text-[10px] px-2 py-1 rounded bg-gray-900 text-gray-400 font-mono border border-gray-700">
                {scene.intExt} • {scene.dayNight} • {scene.pages} PAG
              </span>
            </div>
            <div className="font-mono text-xs text-primary-400 mb-2 uppercase tracking-wide">
              {scene.slugline}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {scene.synopsis || <span className="italic opacity-50">— Nessuna sinossi disponibile —</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
