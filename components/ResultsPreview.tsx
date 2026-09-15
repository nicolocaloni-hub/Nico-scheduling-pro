import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SummaryData {
  sceneCount: number;
  locationCount: number;
  castCount: number;
  propsCount: number;
}

interface PreviewData {
  scenes: any[];
  elements: any[];
  sceneElements?: Record<string, string[]>;
  warnings?: string[];
}

interface ResultsPreviewProps {
  summary: SummaryData;
  previewData: PreviewData | null;
}

export const ResultsPreview: React.FC<ResultsPreviewProps> = ({ summary, previewData }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {previewData?.warnings && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-2">
          <p className="font-bold">Spoglio da revisionare</p>
          <p>Il parser non interpreta il significato del testo: può omettere elementi impliciti o includere parole ambigue. Personaggi senza battute, quantità, dettagli di costumi ed effetti vanno controllati. La sinossi è un estratto; location e set derivano dall’intestazione, non da luoghi di ripresa verificati. Gli ottavi sono stime dell’impaginazione.</p>
          {previewData.warnings.length > 0 && <ul className="list-disc pl-5 space-y-1">{previewData.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
        </div>
      )}
      {/* Counts Grid - Clickable Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Scene" 
          value={summary.sceneCount} 
          emoji="🎬" 
          color="text-blue-400" 
          onClick={() => navigate('/scenes')}
        />
        <StatCard 
          label="Location" 
          value={summary.locationCount} 
          emoji="📍" 
          color="text-yellow-400" 
          onClick={() => navigate('/locations')}
        />
        <StatCard 
          label="Personaggi" 
          value={summary.castCount} 
          emoji="🎭" 
          color="text-purple-400" 
          onClick={() => navigate('/characters')}
        />
        <StatCard 
          label="Props" 
          value={summary.propsCount} 
          emoji="🧳" 
          color="text-green-400" 
          onClick={() => navigate('/props')}
        />
      </div>
      {previewData && (
        <details className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <summary className="cursor-pointer font-bold">Anteprima scene ed elementi ({previewData.scenes.length})</summary>
          <p className="text-sm text-gray-500 mt-2">Crea un progetto per salvare lo spoglio, oppure modifica le scene nel progetto corrente.</p>
          <div className="mt-4 space-y-4 max-h-[32rem] overflow-auto">
            {previewData.scenes.map((scene, index) => (
              <div key={`${scene.sceneNumber}-${index}`} className="border-t border-gray-200 dark:border-gray-700 pt-3 text-sm space-y-2">
                <p className="font-bold">{scene.sceneNumber} · {scene.slugline}</p>
                <p className="text-gray-500">{scene.intExt} · {scene.dayNight} · {scene.pageCountInEighths} pagine (stima)</p>
                <p>{scene.synopsis || 'Nessuna descrizione d’azione riconosciuta.'}</p>
                <p><strong>Elementi: </strong>{previewData.sceneElements?.[scene.sceneNumber]?.join(', ') || 'Nessuno riconosciuto'}</p>
                {scene.scriptText && <details><summary className="cursor-pointer text-blue-600">Testo originale estratto</summary><pre className="whitespace-pre-wrap mt-2 text-xs font-mono">{scene.scriptText}</pre></details>}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {Array.from(new Set(previewData.elements.map(e => e.category))).map(category => <span key={category} className="text-xs rounded bg-gray-100 dark:bg-gray-700 px-2 py-1">{category}: {previewData.elements.filter(e => e.category === category).length}</span>)}
          </div>
        </details>
      )}
    </div>
  );
};

const StatCard = ({ label, value, emoji, color, onClick }: { label: string, value: number, emoji: string, color: string, onClick: () => void }) => (
  <button type="button"
    onClick={onClick}
    className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between shadow-lg cursor-pointer hover:bg-gray-700 transition-all text-left"
  >
    <div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
    </div>
    <div className={`text-2xl ${color} opacity-80`}>
      {emoji}
    </div>
  </button>
);
