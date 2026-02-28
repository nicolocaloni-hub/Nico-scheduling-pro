import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, FileText, ChevronRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans text-gray-900">
      <div className="w-full max-w-md space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase">SUITE</h1>
          <p className="text-gray-500 text-sm px-4 leading-relaxed">
            Strumenti professionali per la gestione della produzione cinematografica.
          </p>
        </div>

        {/* Cards Container */}
        <div className="space-y-4">
          
          {/* Nico Scheduling Pro Card */}
          <div 
            onClick={() => navigate('/projects')}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] duration-200"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-blue-600">
              <Clapperboard size={32} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-gray-900 leading-tight mb-1">NICO SCHEDULING PRO</h2>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">PIANIFICAZIONE & STRIPBOARD</p>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                Gestione professionale di scene, cast, location e piano di lavorazione dinamico.
              </p>
            </div>
            <ChevronRight className="text-gray-300" size={24} />
          </div>

          {/* ODG Card */}
          <div 
            onClick={() => navigate('/odg')}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] duration-200"
          >
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-emerald-600">
              <FileText size={32} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-gray-900 leading-tight mb-1">ODG DAILY</h2>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">ORDINE DEL GIORNO</p>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                Creazione e gestione degli ordini del giorno, convocazioni e note di produzione.
              </p>
            </div>
            <ChevronRight className="text-gray-300" size={24} />
          </div>

        </div>

        {/* Footer */}
        <div className="pt-12 text-center space-y-1">
          <p className="text-[10px] font-bold text-gray-300 tracking-[0.2em] uppercase">SMARTSET</p>
          <p className="text-[10px] font-bold text-gray-300 tracking-[0.1em] uppercase">
            POWERED BY NICOLÒ CALONI @NICOLO.CC
          </p>
        </div>

      </div>
    </div>
  );
};
