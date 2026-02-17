
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { Project, ProductionType } from '../types';
import { Button } from '../components/Button';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

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

  const openProject = (id: string) => {
    localStorage.setItem('currentProjectId', id);
    navigate('/script');
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-white">Progetti</h1>
            <p className="text-gray-400 text-sm">Bentornato, Producer</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
            <span className="text-xl mr-1">+</span> Nuovo
        </Button>
      </header>

      {loading ? (
        <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-800 rounded-xl"></div>
            <div className="h-24 bg-gray-800 rounded-xl"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
                <div 
                    key={p.id} 
                    onClick={() => openProject(p.id)}
                    className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-primary-500 cursor-pointer transition-all hover:shadow-lg hover:shadow-primary-900/10 group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-300 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                            {p.code}
                        </div>
                        <span className="text-xs bg-gray-900 text-gray-400 py-1 px-2 rounded">{p.type}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{p.name}</h3>
                    <div className="flex gap-4 text-xs text-gray-400 mt-4">
                        <span>{p.totalScenes} Scene</span>
                        <span>{p.totalPages.toFixed(1)} Pagine</span>
                    </div>
                </div>
            ))}
            
            {projects.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                    <p>Nessun progetto trovato. Crea il tuo primo progetto!</p>
                </div>
            )}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 w-full max-w-md p-6 rounded-2xl shadow-2xl">
                <h2 className="text-xl font-bold mb-4">Nuovo Progetto</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Nome del Progetto</label>
                        <input 
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
                            placeholder="es. Il Padrino IV"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowNewModal(false)} className="flex-1">Annulla</Button>
                        <Button onClick={handleCreate} disabled={!newProjectName} className="flex-1">Crea Progetto</Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
