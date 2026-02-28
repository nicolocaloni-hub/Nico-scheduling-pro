import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { ProductionElement, ElementCategory } from '../types';
import { Button } from '../components/Button';

export const PropsPage: React.FC = () => {
  const navigate = useNavigate();
  const [propsList, setPropsList] = useState<ProductionElement[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPropName, setNewPropName] = useState('');

  // AI Suggestions State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [reasoning, setReasoning] = useState<string>('');

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) return navigate('/projects');
    setProjectId(pid);
    loadProps(pid);
  }, [navigate]);

  const loadProps = async (pid: string) => {
    const elements = await db.getElements(pid);
    const props = elements.filter(e => {
      const cat = (e.category || '').toLowerCase();
      return (
        cat === ElementCategory.Props.toLowerCase() || 
        cat.includes('prop') || 
        cat.includes('oggett') || 
        cat.includes('attrezz')
      );
    });
    props.sort((a, b) => a.name.localeCompare(b.name));
    setPropsList(props);

    if (props.length === 0) {
      checkSuggestions(pid);
    }
  };

  const checkSuggestions = async (pid: string) => {
    const saved = await db.getSuggestions(pid);
    if (saved && saved.props && saved.props.length > 0) {
      setSuggestions(saved.props);
      setReasoning(saved.reasoning || '');
      return;
    }
    fetchSuggestions(pid);
  };

  const fetchSuggestions = async (pid: string) => {
    setLoadingSuggestions(true);
    try {
      const scenes = await db.getProjectScenes(pid);
      const context = scenes.slice(0, 10).map(s => `SCENA ${s.sceneNumber}: ${s.slugline} - ${s.synopsis}`).join('\n');
      
      if (!context) return;

      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.suggestions) {
          setSuggestions(data.suggestions.props || []);
          setReasoning(data.suggestions.reasoning || '');
          
          const current = await db.getSuggestions(pid) || {};
          const updated = { ...current, props: data.suggestions.props, reasoning: data.suggestions.reasoning };
          if (data.suggestions.locations) updated.locations = data.suggestions.locations;
          
          await db.saveSuggestions(pid, updated);
        }
      }
    } catch (e) {
      console.error("Failed to fetch suggestions", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAdd = async () => {
    if (!newPropName.trim() || !projectId) return;
    
    const newEl: ProductionElement = {
      id: crypto.randomUUID(),
      projectId,
      name: newPropName,
      category: ElementCategory.Props
    };
    
    const currentElements = await db.getElements(projectId);
    await db.saveElements(projectId, [...currentElements, newEl]);
    
    setNewPropName('');
    setShowAddModal(false);
    loadProps(projectId);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-80px)] flex flex-col">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
            <i className="fa-solid fa-arrow-left text-xl"></i>
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Props ({propsList.length})</h1>
            <p className="text-gray-400 text-sm">Oggetti di scena e attrezzeria.</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-10 h-10 rounded-full p-0 flex items-center justify-center">
          <i className="fa-solid fa-plus"></i>
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto pb-20 no-scrollbar space-y-6">
        {propsList.length === 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 text-center">
             <p className="text-gray-400 italic mb-4">Nessun prop trovato.</p>
             
             {(loadingSuggestions || suggestions.length > 0) && (
               <div className="bg-blue-900/20 border border-blue-800/50 rounded-xl p-4 text-left animate-in fade-in slide-in-from-bottom-2">
                 <h3 className="text-blue-300 font-bold text-sm mb-2 flex items-center gap-2">
                   <i className="fa-solid fa-sparkles"></i> Suggerimenti dell'AI:
                 </h3>
                 {loadingSuggestions ? (
                   <div className="text-xs text-blue-400 animate-pulse">Analisi contesto in corso...</div>
                 ) : (
                   <>
                     <p className="text-xs text-blue-200/80 mb-3 italic">
                       {reasoning || "Basato sulla sinossi, potresti aver bisogno di:"}
                     </p>
                     <ul className="space-y-1">
                       {suggestions.map((s, i) => (
                         <li key={i} className="text-sm text-blue-100 flex items-start gap-2">
                           <span className="text-blue-500 mt-1">•</span> {s}
                         </li>
                       ))}
                     </ul>
                   </>
                 )}
               </div>
             )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {propsList.map(prop => (
            <div key={prop.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center text-green-400 border border-green-500/20">
                <i className="fa-solid fa-box-open"></i>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{prop.name}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Prop</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Aggiungi Prop</h3>
            <input 
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white mb-4 focus:border-primary-500 outline-none"
              placeholder="Nome Prop (es. Pistola)"
              value={newPropName}
              onChange={e => setNewPropName(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowAddModal(false)} className="flex-1">Annulla</Button>
              <Button onClick={handleAdd} disabled={!newPropName.trim()} className="flex-1">Salva</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
