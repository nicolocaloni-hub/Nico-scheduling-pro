import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { ProductionElement, ElementCategory } from '../types';

export const CharactersPage: React.FC = () => {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<ProductionElement[]>([]);

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) return navigate('/');
    
    db.getElements(pid).then(elements => {
      const chars = elements.filter(e => e.category === ElementCategory.Cast || e.category === 'character'); // Handle both enum and string case from AI
      // Sort alphabetically
      chars.sort((a, b) => a.name.localeCompare(b.name));
      setCharacters(chars);
    });
  }, [navigate]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-80px)] flex flex-col">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">Personaggi ({characters.length})</h1>
          <p className="text-gray-400 text-sm">Cast e personaggi identificati.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map(char => (
            <div key={char.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-400 border border-purple-500/20">
                <i className="fa-solid fa-user"></i>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{char.name}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Cast Principale</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
