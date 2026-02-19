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
}

interface ResultsPreviewProps {
  summary: SummaryData;
  previewData: PreviewData | null;
}

export const ResultsPreview: React.FC<ResultsPreviewProps> = ({ summary, previewData }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
    </div>
  );
};

const StatCard = ({ label, value, emoji, color, onClick }: { label: string, value: number, emoji: string, color: string, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between shadow-lg cursor-pointer hover:bg-gray-700 transition-all active:scale-95"
  >
    <div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
    </div>
    <div className={`text-2xl ${color} opacity-80`}>
      {emoji}
    </div>
  </div>
);

