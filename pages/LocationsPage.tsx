import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/store';
import { ProductionElement, ElementCategory } from '../types';

export const LocationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [locations, setLocations] = useState<ProductionElement[]>([]);

  useEffect(() => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) return navigate('/projects');
    
    db.getElements(pid).then(elements => {
      // Filter by category 'location' (lowercase) or similar.
      const filtered = elements.filter(e => (e.category || '').toLowerCase() === 'location' || (e.category || '').toLowerCase() === 'set');
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      setLocations(filtered);
    });
  }, [navigate]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 h-[calc(100vh-80px)] flex flex-col">
      <header className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">Location ({locations.length})</h1>
          <p className="text-gray-400 text-sm">Luoghi e set identificati.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-900/30 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
                <i className="fa-solid fa-location-dot"></i>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{loc.name}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
